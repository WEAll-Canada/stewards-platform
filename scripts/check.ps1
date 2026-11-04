# Plain-PowerShell twin of `npm run doctor` for when Node itself is missing (Windows).
# Usage: powershell -ExecutionPolicy Bypass -File scripts\check.ps1
# Never installs anything: scripts\setup-tools.ps1 installs what this reports as missing.

$root = Split-Path -Parent $PSScriptRoot
$needNode = ((Get-Content (Join-Path $root ".nvmrc") -Raw).Trim() -replace '^v', '' -split '\.')[0]
$problems = 0

function Report($tag, $label, $detail) { Write-Output ("  {0}  {1}: {2}" -f $tag, $label, $detail) }

Write-Output "Checking this computer..."
Write-Output ""

if (Get-Command git -ErrorAction SilentlyContinue) {
  Report "OK   " "Git" ((git --version) -replace '^git version ', '')
} else {
  Report "FIX  " "Git" "MISSING. Install it from https://git-scm.com/downloads/win, then restart your agent app."
  $problems++
}

if (Get-Command node -ErrorAction SilentlyContinue) {
  $haveNode = (node --version) -replace '^v', ''
  if (($haveNode -split '\.')[0] -eq $needNode) {
    Report "OK   " "Node" $haveNode
  } else {
    Report "FIX  " "Node" "WRONG VERSION. You have $haveNode, this site needs version $needNode. Your agent will install it with the setup script."
    $problems++
  }
} else {
  Report "FIX  " "Node" "MISSING. Your agent will install it with the setup script."
  $problems++
}

if (Get-Command gh -ErrorAction SilentlyContinue) {
  Report "OK   " "GitHub CLI" (((gh --version) | Select-Object -First 1) -replace '^gh version ', '')
} else {
  Report "FIX  " "GitHub CLI" "MISSING. Your agent will install it with the setup script."
  $problems++
}

Write-Output ""
if ($problems -eq 0) {
  Write-Output "The basics are installed. Run ``npm run doctor`` for the full check."
  exit 0
}
if ($problems -eq 1) {
  Write-Output "1 thing to fix before working on the site."
} else {
  Write-Output "$problems things to fix before working on the site."
}
exit 1
