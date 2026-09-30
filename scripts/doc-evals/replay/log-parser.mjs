/**
 * Parse `touched` / `rejected` / `unchanged` pages out of
 * `scripts/sync-from-base-std/index.mjs`'s stdout+stderr log, instead of
 * relying on `GITHUB_OUTPUT` (which the replay harness deliberately leaves
 * unset — see replay/run.mjs). Every pattern below is a comment-documented
 * mirror of a `console.log`/`console.warn`/`console.error` call in
 * index.mjs; if that file's log lines ever change, update these together.
 *
 * Patterns relied on (see scripts/sync-from-base-std/index.mjs):
 *   - `[write] <page>`            processPage() successful write, and
 *                                  syncSummaryRows() deterministic write
 *                                  (that one has a trailing " (N row(s))"
 *                                  which the regex below stops before).
 *   - `[create] <page>`           processPage() write of a newly created
 *                                  changelog entry page — matched only when
 *                                  nothing follows the page path, because
 *                                  the *other* `[create]` line
 *                                  ("... — derived page does not exist...")
 *                                  logged earlier for the same page has
 *                                  trailing text and must NOT count as a
 *                                  write.
 *   - `[reject] <page>: <reason>` processPage() validator/max_tokens reject.
 *   - `[noop] <page>`             processPage()/syncSummaryRows() no-op —
 *                                  content was already correct.
 *   - `[skip] <page>`           processPage() skip — either `item.skip`
 *                                  (decideCall() decided the page needs no
 *                                  model call) or "file not found".
 *   - `[nav] added <route> to "<group>" in <path>`
 *                                  addPageToNav()'s write when a newly
 *                                  created page is added to its hardfork's
 *                                  nav group — always `docs/docs.json` for
 *                                  the default `DOCS_CONTENT_ROOT`. This is
 *                                  a genuine second write inside one
 *                                  `[create]`-logged item, so <path> counts
 *                                  as touched on its own, independent of the
 *                                  page path `[create]` already added.
 *
 * `[cleanup] <page>` is not a terminal state — it always precedes a
 * `[write]`/`[create]` line for the same page (stale sync-source comment
 * rewrite with no semantic change), so it is intentionally not parsed here.
 */

const WRITE_RE = /^\[write\]\s+(\S+)/;
const CREATE_WRITE_RE = /^\[create\]\s+(\S+)$/;
const REJECT_RE = /^\[reject\]\s+(\S+):\s*(.+)$/;
const NOOP_RE = /^\[noop\]\s+(\S+)/;
const SKIP_RE = /^\[skip\]\s+(\S+)/;
const NAV_RE = /^\[nav\]\s+added\s+\S+\s+to\s+"[^"]*"\s+in\s+(\S+)$/;

/**
 * @param {string} log combined stdout+stderr of one sync run
 * @returns {{touched: string[], rejected: {page: string, reason: string}[], unchanged: string[]}}
 */
export function parseSyncLog(log) {
  const touched = [];
  const rejected = [];
  const unchanged = [];
  const addUnique = (arr, value) => {
    if (!arr.includes(value)) arr.push(value);
  };

  for (const rawLine of String(log || "").split("\n")) {
    // Lines can be wrapped in ::group::/::endgroup:: markers or GitHub
    // Actions annotations elsewhere in the log; strip only leading/trailing
    // whitespace so the anchored patterns above still match exactly.
    const line = rawLine.trim();
    let m;
    if ((m = WRITE_RE.exec(line))) {
      addUnique(touched, m[1]);
    } else if ((m = CREATE_WRITE_RE.exec(line))) {
      addUnique(touched, m[1]);
    } else if ((m = REJECT_RE.exec(line))) {
      rejected.push({ page: m[1], reason: m[2] });
    } else if ((m = NOOP_RE.exec(line))) {
      addUnique(unchanged, m[1]);
    } else if ((m = SKIP_RE.exec(line))) {
      addUnique(unchanged, m[1]);
    } else if ((m = NAV_RE.exec(line))) {
      addUnique(touched, m[1]);
    }
  }

  // A page can only end in one terminal state; if a later line contradicts
  // an earlier one for the same page (shouldn't happen — each page is
  // processed once — but a rerun-in-place or a log-format surprise could
  // produce it), touched/rejected take precedence over unchanged so the
  // contract's `touched`/`rejected` stay authoritative for grading.
  const rejectedPages = new Set(rejected.map((r) => r.page));
  const filteredUnchanged = unchanged.filter((p) => !touched.includes(p) && !rejectedPages.has(p));

  return { touched, rejected, unchanged: filteredUnchanged };
}
