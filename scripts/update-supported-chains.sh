#!/usr/bin/env bash
# Fetches the SCW getSupportedChains API and regenerates the
# docs/snippets/supported-chains.mdx file, inserting any chains
# tagged "simple-chain" into the dynamic section.
#
# Usage:
#   bash scripts/update-supported-chains.sh
#
# The snippet has two parts:
#   1. Hardcoded core chains (manually maintained above the markers)
#   2. Dynamic "basic chains" pulled from the API (between the markers)
#
# Only chains with the "simple-chain" tag are inserted dynamically.
# If none are found, the dynamic section is left empty.

set -euo pipefail

API_URL="${API_URL:-https://api.wallet.coinbase.com/rpc/v3/scw/getSupportedChains}"
SNIPPET="docs/snippets/supported-chains.mdx"

# Resolve paths relative to repo root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SNIPPET_PATH="$REPO_ROOT/$SNIPPET"

if [ ! -f "$SNIPPET_PATH" ]; then
  echo "Error: $SNIPPET not found at $SNIPPET_PATH" >&2
  exit 1
fi

# Fetch the API
RESPONSE=$(curl -sf "$API_URL") || {
  echo "Error: failed to fetch $API_URL" >&2
  exit 1
}

# Extract simple-chain entries grouped by mainnet/testnet
DYNAMIC_BLOCK=$(echo "$RESPONSE" | python3 -c "
import sys, json

data = json.load(sys.stdin)
chains = data.get('chains', [])

simple = [c for c in chains if 'simple-chain' in c.get('tags', [])]

if not simple:
    sys.exit(0)  # nothing to output

mainnets = sorted([c['name'] for c in simple if 'testnet' not in c['networkId']])
testnets = sorted([c['name'] for c in simple if 'testnet' in c['networkId']])

all_simple = sorted(mainnets + testnets)

lines = []
lines.append('**Basic support:** ' + ' • '.join(all_simple))
lines.append('')
lines.append('Basic support only includes transfers through the [Base Account Web](https://account.base.app) surface for select tokens.')

print('\n'.join(lines))
")

# Replace content between the markers in the snippet
python3 -c "
import sys

snippet_path = sys.argv[1]
dynamic_block = sys.argv[2]

with open(snippet_path, 'r') as f:
    content = f.read()

start_marker = '{/* DYNAMIC_CHAINS_START */}'
end_marker = '{/* DYNAMIC_CHAINS_END */}'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx == -1 or end_idx == -1:
    print('Error: markers not found in snippet', file=sys.stderr)
    sys.exit(1)

# Build the replacement: markers + dynamic content between them
if dynamic_block.strip():
    replacement = start_marker + '\n' + dynamic_block + '\n' + end_marker
else:
    replacement = start_marker + '\n' + end_marker

new_content = content[:start_idx] + replacement + content[end_idx + len(end_marker):]

with open(snippet_path, 'w') as f:
    f.write(new_content)
" "$SNIPPET_PATH" "$DYNAMIC_BLOCK"

echo "Updated $SNIPPET"
