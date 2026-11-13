#!/bin/sh
# Plain-shell twin of `npm run doctor` for when Node itself is missing (macOS / Linux).
# Usage: sh scripts/check.sh
# Never installs anything: scripts/setup-tools.sh installs what this reports as missing.

cd "$(dirname "$0")/.." || exit 1
need_node=$(sed 's/^v//; s/[^0-9].*//' .nvmrc)
problems=0

report() { printf '  %s  %s: %s\n' "$1" "$2" "$3"; }

echo "Checking this computer..."
echo

if git --version >/dev/null 2>&1; then
  report "OK   " "Git" "$(git --version | sed 's/^git version //')"
else
  report "FIX  " "Git" "MISSING. Your agent will run the setup script, which asks Apple to install it."
  problems=$((problems + 1))
fi

if command -v node >/dev/null 2>&1; then
  have_node=$(node --version | sed 's/^v//')
  if [ "${have_node%%.*}" -ge "$need_node" ]; then
    report "OK   " "Node" "$have_node"
  else
    report "FIX  " "Node" "WRONG VERSION. You have $have_node, this site needs version $need_node or newer. Your agent will install it with the setup script."
    problems=$((problems + 1))
  fi
else
  report "FIX  " "Node" "MISSING. Your agent will install it with the setup script."
  problems=$((problems + 1))
fi

if command -v gh >/dev/null 2>&1; then
  report "OK   " "GitHub CLI" "$(gh --version | head -n 1 | sed 's/^gh version //')"
else
  report "FIX  " "GitHub CLI" "MISSING. Your agent will install it with the setup script."
  problems=$((problems + 1))
fi

echo
if [ "$problems" -eq 0 ]; then
  echo "The basics are installed. Run \`npm run doctor\` for the full check."
  exit 0
fi
if [ "$problems" -eq 1 ]; then
  echo "1 thing to fix before working on the site."
else
  echo "$problems things to fix before working on the site."
fi
exit 1
