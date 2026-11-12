# Installs the tools this site needs into your user folder (Windows). No admin rights,
# no system-wide changes. Only installs what's missing; safe to run again.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\setup-tools.ps1
#
# Downloads only the exact versions pinned below, from nodejs.org and github.com,
# and refuses any file whose SHA-256 checksum doesn't match.
# Operator: to update, see "Updating the pinned tools" in OPERATOR.md.

$NodeVersion = "24.22.2"
$NodeSha = @{ x64 = "ca1bff5d8ead13c9f2ea404a176db46bd430704d5b5113734049fa365e7799e2"; arm64 = "f47968c213105077f64c6510f007632c0ca2574802a0b5067c327c49abe1c468" }
$GhVersion = "2.103.3"
$GhSha = @{ amd64 = "98d0cfa794721665d7973dd728c78aff7bd836d58f10f6d7a03568eccb0a22e0"; arm64 = "197211c98687d7770ac331fe8a3b6c198c389108c1536cdbedf659fe4703e484" }

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"  # the progress bar makes downloads much slower
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Contact = "Please contact your site operator."
$Tools = Join-Path $env:LOCALAPPDATA "site-tools"
$NodeDir = Join-Path $Tools "node"
$GhBin = Join-Path $Tools "gh\bin"
$root = Split-Path -Parent $PSScriptRoot
$needNode = ((Get-Content (Join-Path $root ".nvmrc") -Raw).Trim() -replace '^v', '' -split '\.')[0]

function Say($message) { Write-Output $message }
function Stop-Setup($message) { Write-Output ""; Write-Output $message; exit 1 }

$arch = $env:PROCESSOR_ARCHITEW6432
if (-not $arch) { $arch = $env:PROCESSOR_ARCHITECTURE }
switch ($arch) {
  "AMD64" { $nodeArch = "x64"; $ghArch = "amd64" }
  "ARM64" { $nodeArch = "arm64"; $ghArch = "arm64" }
  default { Stop-Setup "This computer's processor type ($arch) isn't supported. $Contact" }
}
if (($NodeVersion -split '\.')[0] -ne $needNode) {
  Stop-Setup "The pinned Node version ($NodeVersion) doesn't match .nvmrc ($needNode). $Contact"
}

$work = Join-Path ([IO.Path]::GetTempPath()) ("site-tools-" + [guid]::NewGuid())
New-Item -ItemType Directory -Force -Path $work, $Tools | Out-Null
$installed = $false

# Download over HTTPS and check the checksum.
function Get-Checked($name, $url, $sha, $file) {
  Say "Downloading $name..."
  try { Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $file }
  catch { Stop-Setup "Couldn't download $name (check your internet connection), so nothing was installed. Try again in a moment." }
  if ((Get-FileHash -Algorithm SHA256 $file).Hash.ToLower() -ne $sha) {
    Stop-Setup "The $name download didn't match its expected checksum, so it was thrown away and nothing was installed. $Contact"
  }
}

# Replace $to with the freshly unpacked $from.
function Set-Folder($name, $from, $to) {
  $old = "$to.old"
  if (Test-Path $old) { Remove-Item -Recurse -Force $old }
  if (Test-Path $to) { Move-Item $to $old }
  try { Move-Item $from $to }
  catch {
    if (Test-Path $old) { Move-Item $old $to }
    Stop-Setup "Couldn't install $name. $Contact"
  }
  if (Test-Path $old) { Remove-Item -Recurse -Force $old }
}

try {
  Say "Setting up this computer..."
  Say ""

  # Git: needed by the agent apps themselves, so it can't be installed from here.
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Stop-Setup "Git isn't installed. Install it from https://git-scm.com/downloads/win (accept the default options), restart your agent app, then ask it to set you up again."
  }
  Say "  OK   Git"

  # Node: install unless a matching version is already on this computer.
  $haveNode = ""
  $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
  if ($nodeCmd) { $haveNode = (& node --version) -replace '^v', '' }
  $ourNode = Join-Path $NodeDir "node.exe"
  if ($haveNode -and ($haveNode -split '\.')[0] -eq $needNode) {
    Say "  OK   Node $haveNode"
  } else {
    if ((Test-Path $ourNode) -and ((& $ourNode --version) -eq "v$NodeVersion")) {
      Say "  OK   Node $NodeVersion (already installed, not yet visible to your agent app)"
    } else {
      $name = "node-v$NodeVersion-win-$nodeArch"
      Get-Checked "Node $NodeVersion" "https://nodejs.org/dist/v$NodeVersion/$name.zip" $NodeSha[$nodeArch] (Join-Path $work "node.zip")
      Expand-Archive -Path (Join-Path $work "node.zip") -DestinationPath $work
      Set-Folder "Node" (Join-Path $work $name) $NodeDir
      Say "  NEW  Node $NodeVersion"
    }
    $installed = $true
    # A Node installed for all users comes before ours on the PATH, and removing it needs an admin.
    if ($nodeCmd -and -not $nodeCmd.Source.StartsWith($Tools, [StringComparison]::OrdinalIgnoreCase)) {
      $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
      if ($machinePath -and ($machinePath -split ';' | Where-Object { $_ -and $nodeCmd.Source.StartsWith($_.TrimEnd('\'), [StringComparison]::OrdinalIgnoreCase) })) {
        Stop-Setup "An older Node ($haveNode) is installed for everyone on this computer and gets in the way. Uninstall ""Node.js"" from Settings > Apps (this may need an administrator), then ask your agent to set you up again."
      }
    }
  }

  # GitHub CLI: install unless one is already on this computer.
  $ourGh = Join-Path $GhBin "gh.exe"
  if (Get-Command gh -ErrorAction SilentlyContinue) {
    Say ("  OK   GitHub CLI " + (((& gh --version) | Select-Object -First 1) -replace '^gh version ', '' -replace ' .*', ''))
  } elseif ((Test-Path $ourGh) -and ((& $ourGh --version) -match [regex]::Escape($GhVersion))) {
    Say "  OK   GitHub CLI $GhVersion (already installed, not yet visible to your agent app)"
    $installed = $true
  } else {
    $name = "gh_${GhVersion}_windows_$ghArch"
    Get-Checked "GitHub CLI $GhVersion" "https://github.com/cli/cli/releases/download/v$GhVersion/$name.zip" $GhSha[$ghArch] (Join-Path $work "gh.zip")
    Expand-Archive -Path (Join-Path $work "gh.zip") -DestinationPath (Join-Path $work "gh")
    Set-Folder "GitHub CLI" (Join-Path $work "gh") (Join-Path $Tools "gh")
    Say "  NEW  GitHub CLI $GhVersion"
    $installed = $true
  }

  if (-not $installed) {
    Say ""
    Say "Everything is already installed."
    exit 0
  }

  # Put the tools first on this user's PATH. Read and write the raw registry value so
  # entries like %USERPROFILE%\... keep working.
  $key = Get-Item "HKCU:\Environment"
  $userPath = $key.GetValue("Path", "", "DoNotExpandEnvironmentNames")
  $entries = @($userPath -split ';' | Where-Object { $_ -and $_ -ne $NodeDir -and $_ -ne $GhBin })
  $newPath = (@($NodeDir, $GhBin) + $entries) -join ';'
  if ($newPath -ne $userPath) {
    Set-ItemProperty -Path "HKCU:\Environment" -Name "Path" -Value $newPath -Type ExpandString
  }
  # Setting a variable through .NET tells running apps (like the Start menu) that the environment changed.
  [Environment]::SetEnvironmentVariable("SITE_TOOLS", $Tools, "User")

  Say ""
  Say "RESTART NEEDED: quit your agent app completely and open it again, then ask it to set you up again."
  exit 0
} finally {
  Remove-Item -Recurse -Force $work -ErrorAction SilentlyContinue
}
