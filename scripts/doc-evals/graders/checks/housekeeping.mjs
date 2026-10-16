/**
 * `housekeeping` code check.
 *
 * Reuses `validateCallouts` from `scripts/sync-from-base-std/safety.mjs` —
 * the same rejector the live sync runs — against the page content a replay
 * run produced, catching the "source file removed" banner pattern PLAN.md's
 * evidence table cites (bot PR #1928: 13 housekeeping callouts). This is a
 * grading-time re-run of a production validator, not a copy of its rules:
 * `safety.mjs` is imported, never duplicated.
 */
import { validateCallouts } from "../../../sync-from-base-std/safety.mjs";
import { mkCheck, isDocPage } from "./shared.mjs";

/**
 * @param {object} caseDef  unused; kept for a consistent check signature
 * @param {{after: Map<string,string>}} run
 * @returns {Array} checks[]
 */
export function checkHousekeeping(caseDef, run) {
  const checks = [];
  for (const [page, afterText] of run?.after ?? new Map()) {
    if (!isDocPage(page)) continue;
    const reason = validateCallouts(afterText);
    checks.push(
      mkCheck(
        "housekeeping",
        "code",
        page,
        reason == null,
        reason == null ? 1 : 0,
        reason ?? "no housekeeping callouts",
      ),
    );
  }
  return checks;
}
