#!/bin/sh
# Local install for this repo's git hooks.
# Scope: this clone only — never touches global git config or your $HOME.
#
# Usage: ./githooks/install.sh
set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

# --local is the default for `git config`, but pass it explicitly so it's
# obvious from a code-read that this does NOT modify --global or --system.
git config --local core.hooksPath githooks
chmod +x githooks/post-commit githooks/post-merge

if ! command -v jq >/dev/null 2>&1; then
  echo "Note: 'jq' not installed — hooks will use built-in defaults instead of githooks/config.json."
  echo "      Install with: brew install jq   (or: apt-get install jq)"
fi

echo "Installed hooks for this repo (scope: --local, this clone only):"
echo "  core.hooksPath = $(git config --local --get core.hooksPath)"
echo
echo "Hooks:"
echo "  post-commit  → regenerates docs indexes after a commit (auto on docs/ A/D/R, opt-in via 'agents.md' / 'llms.txt' keyword)"
echo "  post-merge   → warns when a pull/merge brought changes that drift docs indexes"
echo
echo "Bypass once: SKIP_DOCS_HOOK=1 git commit ...  (or include [skip-docs] in the message)"
echo "Verify scope: git config --global --get core.hooksPath  → should print nothing"
