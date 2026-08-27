# shellcheck shell=bash
#
# workflow-fail.sh — shared fail helper for the docs-sync receiver workflow.
#
# Every rejection point in the apply job sources this file and calls
#   workflow_fail "<step name>" "<reason>"
# to produce a uniform record across error annotations and the run summary.
# Operators get one shape to read; security reviewers get one place to look.
#
# Reads dispatch context from these env vars (each is optional — empty
# values render as "(unknown)" in the summary so the helper is safe to
# call before all of them are populated):
#
#   SENDER_LOGIN            github.event.sender.login (only authoritative id)
#   PAYLOAD_SOURCE_REPO     claimed source repo from client_payload
#   PAYLOAD_SHA             claimed SHA from client_payload
#   PAYLOAD_PR_NUMBER       claimed PR number from client_payload
#   GITHUB_RUN_ID           injected by Actions
#   GITHUB_STEP_SUMMARY     injected by Actions; if unset, summary write is skipped
#
# Usage:
#   source "${GITHUB_WORKSPACE}/scripts/lib/workflow-fail.sh"
#   if [[ ! "$thing" =~ $pattern ]]; then
#     workflow_fail "Validate payload schema" "thing '${thing}' does not match ${pattern}"
#   fi
#
# Exits the calling step with status 1. Never returns. Assumes jq is on PATH
# (every step that sources this helper already invokes jq elsewhere).
#
# This file does not set shell options — the caller owns set -euo pipefail
# state and we must not mutate it on source.

# Idempotent guard — if a step sources the helper twice we keep the first
# definitions. The function-existence test avoids redefining workflow_fail.
if declare -F workflow_fail > /dev/null 2>&1; then
  return 0 2>/dev/null || true
fi

# GitHub workflow command annotation. The spec requires \n and \r in the
# message to be percent-encoded; otherwise multi-line reasons truncate at
# the first newline and the operator sees a half-message.
_wf_emit_annotation() {
  local step="$1" reason="$2"
  local safe="${reason//$'\r'/%0D}"
  safe="${safe//$'\n'/%0A}"
  printf '::error title=%s::%s\n' "$step" "$safe" >&2
}

# Markdown table row in $GITHUB_STEP_SUMMARY. Pipes inside cells must be
# escaped as \| in GitHub-flavored markdown; newlines collapse to spaces.
_wf_emit_step_summary() {
  local step="$1" reason="$2"
  local summary_file="${GITHUB_STEP_SUMMARY:-}"
  [[ -z "$summary_file" ]] && return 0
  local safe="${reason//|/\\|}"
  safe="${safe//$'\n'/ }"
  local ts
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  {
    printf '\n### Dispatch rejected: %s\n\n' "$step"
    printf '| Field | Value |\n'
    printf '|---|---|\n'
    printf '| Reason | %s |\n' "$safe"
    printf '| Sender (github.event.sender.login) | `%s` |\n' "${SENDER_LOGIN:-(unknown)}"
    printf '| Source repo (claimed) | `%s` |\n' "${PAYLOAD_SOURCE_REPO:-(unknown)}"
    printf '| SHA (claimed) | `%s` |\n' "${PAYLOAD_SHA:-(unknown)}"
    printf '| PR number (claimed) | `%s` |\n' "${PAYLOAD_PR_NUMBER:-(none)}"
    printf '| Run ID | `%s` |\n' "${GITHUB_RUN_ID:-(unknown)}"
    printf '| Timestamp | `%s` |\n' "$ts"
  } >> "$summary_file"
}

# Structured JSON log line on stderr — for alerting pipelines that scrape
# workflow logs. Per workspace rule: structured JSON, timestamp, no PII.
# Sender login is a public GitHub handle that already appears in GitHub's
# own audit-log surface.
_wf_emit_json_log() {
  local step="$1" reason="$2"
  local ts
  ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  jq -nc \
    --arg ts "$ts" \
    --arg step "$step" \
    --arg reason "$reason" \
    --arg sender "${SENDER_LOGIN:-}" \
    --arg source_repo "${PAYLOAD_SOURCE_REPO:-}" \
    --arg sha "${PAYLOAD_SHA:-}" \
    --arg pr_number "${PAYLOAD_PR_NUMBER:-}" \
    --arg run_id "${GITHUB_RUN_ID:-}" \
    '{
      timestamp: $ts,
      level: "error",
      component: "docs-sync-receiver",
      event: "dispatch_rejected",
      step: $step,
      reason: $reason,
      sender_login: $sender,
      source_repo_claimed: $source_repo,
      sha_claimed: $sha,
      pr_number_claimed: $pr_number,
      github_run_id: $run_id
    }' >&2
}

# Public entrypoint. Always exits non-zero — the caller never returns from
# this. Order: annotation first (operator's eye), summary second (post-
# mortem), JSON log third (alerting pipeline).
workflow_fail() {
  local step="${1:-unknown step}"
  local reason="${2:-no reason provided}"
  _wf_emit_annotation "$step" "$reason"
  _wf_emit_step_summary "$step" "$reason"
  _wf_emit_json_log "$step" "$reason"
  exit 1
}
