#!/usr/bin/env bash
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
TMP_BASE=${TMPDIR:-/tmp}/base-docs-verified-samples
mkdir -p "$TMP_BASE"

node "$ROOT/scripts/verify-doc-samples.js"
node "$ROOT/scripts/validate-docs-structure.js"
node "$ROOT/scripts/check-terminology.js"
bash -n "$ROOT/examples/verified-doc-samples/cli/b20-operations.sh"

(
  cd "$ROOT/examples/verified-doc-samples/typescript"
  npm ci --cache "$TMP_BASE/npm"
  npm run typecheck
)

(
  cd "$ROOT/examples/verified-doc-samples/go/x402"
  TMPDIR="$TMP_BASE" CGO_ENABLED=0 \
    GOMODCACHE="$TMP_BASE/go-mod" GOCACHE="$TMP_BASE/go-cache" GOPATH="$TMP_BASE/go" \
    go build ./...
)

(
  cd "$ROOT/examples/verified-doc-samples/python/x402"
  python3 -m venv "$TMP_BASE/python"
  "$TMP_BASE/python/bin/pip" install --cache-dir "$TMP_BASE/pip" -r requirements.lock
  RECEIVER_AUTHORIZER_PRIVATE_KEY="0x$(openssl rand -hex 32)"
  PAY_TO=0x0000000000000000000000000000000000000001 \
    RECEIVER_AUTHORIZER_PRIVATE_KEY="$RECEIVER_AUTHORIZER_PRIVATE_KEY" \
    "$TMP_BASE/python/bin/python" -c 'import server'
)

(
  cd "$ROOT/examples/verified-doc-samples/solidity"
  if command -v base-forge >/dev/null 2>&1; then
    forge_cmd=base-forge
  elif command -v forge >/dev/null 2>&1; then
    forge_cmd=forge
  else
    echo "Neither base-forge nor forge is available on PATH." >&2
    exit 127
  fi

  if [[ ! -d lib/base-std ]]; then "$forge_cmd" install base/base-std@v1.0.0 --no-git; fi
  if [[ ! -d lib/forge-std ]]; then "$forge_cmd" install foundry-rs/forge-std@v1.9.7 --no-git; fi
  "$forge_cmd" build
)

echo "All verified documentation samples passed."
