#!/bin/sh
# Installs the tools this site needs into your home folder (macOS). No admin password,
# no system-wide changes. Only installs what's missing; safe to run again.
# Usage: sh scripts/setup-tools.sh
#
# Downloads only the exact versions pinned below, from nodejs.org and github.com,
# and refuses any file whose SHA-256 checksum doesn't match.
# Operator: to update, see "Updating the pinned tools" in OPERATOR.md.

NODE_VERSION=24.22.2
NODE_SHA_ARM64=aa9549349e47dffaa42dcf95d6e06ade8c4bdafc980979883b88767670df385a
NODE_SHA_X64=d5e336d588c45be0c37dbd52cc29895593009ca4997a77a1fd02815131ed0e52
GH_VERSION=2.103.3
GH_SHA_ARM64=d700207eae9ae98fe2b89535c2c087c07823d4628c56364695a5a07ef311c062
GH_SHA_AMD64=a2f86418f4350ae6e9ec60d5000bdf7665728436946a97fc27fe50e6ae752682

TOOLS="$HOME/.site-tools"
MARKER="# site-tools: Node and GitHub CLI for your website"
PATH_LINE='export PATH="$HOME/.site-tools/node/bin:$HOME/.site-tools/gh/bin:$PATH"'
CONTACT="Please contact your site operator."

cd "$(dirname "$0")/.." || exit 1
need_node=$(sed 's/^v//; s/[^0-9].*//' .nvmrc)

say() { printf '%s\n' "$1"; }
stop() { printf '\n%s\n' "$1"; exit 1; }

if [ "$(uname -s)" != "Darwin" ]; then
  stop "This setup script is for Mac. On Windows, use scripts\\setup-tools.ps1. On Linux, install Node $need_node and the GitHub CLI yourself."
fi
case "$(uname -m)" in
  arm64) node_arch=arm64; node_sha=$NODE_SHA_ARM64; gh_arch=arm64; gh_sha=$GH_SHA_ARM64 ;;
  x86_64) node_arch=x64; node_sha=$NODE_SHA_X64; gh_arch=amd64; gh_sha=$GH_SHA_AMD64 ;;
  *) stop "This Mac's processor type ($(uname -m)) isn't supported. $CONTACT" ;;
esac
if [ "${NODE_VERSION%%.*}" != "$need_node" ]; then
  stop "The pinned Node version ($NODE_VERSION) doesn't match .nvmrc ($need_node). $CONTACT"
fi

work=$(mktemp -d) || stop "Couldn't make a temporary folder. $CONTACT"
trap 'rm -rf "$work"' EXIT
mkdir -p "$TOOLS" || stop "Couldn't create $TOOLS. $CONTACT"
installed=0

# fetch NAME URL SHA256 FILE: download over HTTPS and check the checksum.
fetch() {
  say "Downloading $1..."
  if ! curl -fsSL --proto '=https' --tlsv1.2 --retry 2 -o "$4" "$2"; then
    stop "Couldn't download $1 (check your internet connection), so nothing was installed. Try again in a moment."
  fi
  got=$(shasum -a 256 "$4" | cut -d' ' -f1)
  if [ "$got" != "$3" ]; then
    stop "The $1 download didn't match its expected checksum, so it was thrown away and nothing was installed. $CONTACT"
  fi
}

# place NAME FROM_DIR TO_DIR: replace TO_DIR with the freshly unpacked FROM_DIR.
place() {
  rm -rf "$3.old"
  [ -d "$3" ] && mv "$3" "$3.old"
  if ! mv "$2" "$3"; then
    [ -d "$3.old" ] && mv "$3.old" "$3"
    stop "Couldn't install $1. $CONTACT"
  fi
  rm -rf "$3.old"
}

say "Setting up this computer..."
say ""

# Git: macOS ships it as part of Apple's command line developer tools.
if ! xcode-select -p >/dev/null 2>&1; then
  xcode-select --install >/dev/null 2>&1
  stop "Git isn't installed yet. A window from Apple has opened: click Install and wait for it to finish (a few minutes). Then ask your agent to set you up again."
fi
say "  OK   Git"

# Node: install unless a matching version is already on this computer.
have_node=""
command -v node >/dev/null 2>&1 && have_node=$(node --version 2>/dev/null | sed 's/^v//')
if [ "${have_node%%.*}" = "$need_node" ]; then
  say "  OK   Node $have_node"
elif [ -x "$TOOLS/node/bin/node" ] && [ "$("$TOOLS/node/bin/node" --version)" = "v$NODE_VERSION" ]; then
  say "  OK   Node $NODE_VERSION (already installed, not yet visible to your agent app)"
  installed=1
else
  name="node-v$NODE_VERSION-darwin-$node_arch"
  fetch "Node $NODE_VERSION" "https://nodejs.org/dist/v$NODE_VERSION/$name.tar.gz" "$node_sha" "$work/node.tar.gz"
  tar -xzf "$work/node.tar.gz" -C "$work" || stop "Couldn't unpack Node. $CONTACT"
  place "Node" "$work/$name" "$TOOLS/node"
  say "  NEW  Node $NODE_VERSION"
  installed=1
fi

# GitHub CLI: install unless one is already on this computer.
if command -v gh >/dev/null 2>&1; then
  say "  OK   GitHub CLI $(gh --version | head -n 1 | sed 's/^gh version //; s/ .*//')"
elif [ -x "$TOOLS/gh/bin/gh" ] && "$TOOLS/gh/bin/gh" --version | grep -q "$GH_VERSION"; then
  say "  OK   GitHub CLI $GH_VERSION (already installed, not yet visible to your agent app)"
  installed=1
else
  name="gh_${GH_VERSION}_macOS_$gh_arch"
  fetch "GitHub CLI $GH_VERSION" "https://github.com/cli/cli/releases/download/v$GH_VERSION/$name.zip" "$gh_sha" "$work/gh.zip"
  unzip -q "$work/gh.zip" -d "$work" || stop "Couldn't unpack the GitHub CLI. $CONTACT"
  place "GitHub CLI" "$work/$name" "$TOOLS/gh"
  say "  NEW  GitHub CLI $GH_VERSION"
  installed=1
fi

if [ "$installed" -eq 0 ]; then
  say ""
  say "Everything is already installed."
  exit 0
fi

# Make the new tools findable by every shell: zsh (the Mac default) and bash.
# .zprofile too, because macOS reorders PATH for login shells after .zshenv runs.
for profile in "$HOME/.zshenv" "$HOME/.zprofile" "$HOME/.profile" "$HOME/.bash_profile"; do
  case "$profile" in
    */.bash_profile) [ -f "$profile" ] || continue ;;
  esac
  if ! grep -qF "$MARKER" "$profile" 2>/dev/null; then
    printf '\n%s\n%s\n' "$MARKER" "$PATH_LINE" >>"$profile" || stop "Couldn't update $profile. $CONTACT"
  fi
done

say ""
say "RESTART NEEDED: quit your agent app completely and open it again, then ask it to set you up again."
exit 0
