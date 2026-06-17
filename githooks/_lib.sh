# shellcheck shell=sh
# Shared loader for the docs hooks. Sourced by post-commit and post-merge.
#
# Reads githooks/config.json (via jq) and exposes:
#   SKIP_TOKEN         literal string that, when present in a commit msg, skips the hook
#   GENERATORS_TSV     one line per generator: name<TAB>trigger<TAB>script<TAB>outputs
#                      where outputs is a space-separated list
#   EXCLUDE_REGEX      ERE matching any generator output (used to exclude generated
#                      files from structural-change detection)
#   ALL_OUTPUTS        space-separated list of every output across all generators
#
# Falls back to built-in defaults if jq is missing or config.json is absent /
# malformed, so the hook never breaks just because someone uninstalled jq.

_lib_log() { [ -n "$DEBUG_DOCS_HOOK" ] && echo "[hooks-lib] $*" >&2; }

_use_defaults() {
  SKIP_TOKEN='[skip-docs]'
  GENERATORS_TSV=$(printf '%s\n%s\n' \
    'agents	agents.md	scripts/agents.js	docs/agents.md' \
    'llms	llms.txt	scripts/llms.js	docs/llms.txt docs/llms-full.txt')
  EXCLUDE_REGEX='^docs/agents\.md$|^docs/llms(-full)?\.txt$'
  ALL_OUTPUTS='docs/agents.md docs/llms.txt docs/llms-full.txt'
}

load_hooks_config() {
  CONFIG_FILE="${REPO_ROOT:-$(git rev-parse --show-toplevel)}/githooks/config.json"

  if ! command -v jq >/dev/null 2>&1; then
    _lib_log "jq not installed; using built-in defaults"
    _use_defaults
    return
  fi
  if [ ! -f "$CONFIG_FILE" ]; then
    _lib_log "$CONFIG_FILE missing; using built-in defaults"
    _use_defaults
    return
  fi
  if ! jq empty "$CONFIG_FILE" >/dev/null 2>&1; then
    echo "[hooks-lib] WARN: $CONFIG_FILE is not valid JSON; falling back to defaults" >&2
    _use_defaults
    return
  fi

  SKIP_TOKEN=$(jq -r '.skipToken // "[skip-docs]"' "$CONFIG_FILE")

  # TSV: name \t trigger \t script \t (outputs joined by space)
  GENERATORS_TSV=$(jq -r '.generators[]
    | [(.name // "?"), (.trigger // ""), (.script // ""), (.outputs // [] | join(" "))]
    | @tsv' "$CONFIG_FILE")

  ALL_OUTPUTS=$(jq -r '[.generators[].outputs[]] | join(" ")' "$CONFIG_FILE")

  # Build an ERE that matches any output path exactly. Escapes . and / (the only
  # regex metachars likely to appear in real output paths).
  EXCLUDE_REGEX=$(jq -r '
    [.generators[].outputs[]
      | gsub("\\."; "\\.")
      | "^" + . + "$"
    ] | join("|")
  ' "$CONFIG_FILE")

  if [ -z "$GENERATORS_TSV" ]; then
    echo "[hooks-lib] WARN: $CONFIG_FILE has no generators; falling back to defaults" >&2
    _use_defaults
    return
  fi

  _lib_log "loaded $(echo "$GENERATORS_TSV" | wc -l | tr -d ' ') generator(s) from config"
}
