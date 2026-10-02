/**
 * Source-diff cap shared by the judge and pairwise prompts.
 *
 * Frozen case diffs run from ~2 KB to ~180 KB (the heavy b20 restructure).
 * Both LLM graders need the diff as ground truth for what the source
 * changed, but a full 180 KB diff is ~45k tokens per call. We keep the head
 * of the diff up to `MAX_DIFF_CHARS` (about 15k tokens) and append an
 * explicit marker so the grader knows it is not seeing everything and does
 * not treat a missing change as proof it never happened. Head-truncation
 * (not head+tail) keeps whole file sections intact, and `git diff` output
 * lists source files before tests in these repos' commits.
 */

/** Documented cap on diff characters sent to a grader call. */
export const MAX_DIFF_CHARS = 60000;

/**
 * @param {string|null|undefined} diff
 * @param {number=} max
 * @returns {string} the diff, cut at a line boundary with a marker when over `max`
 */
export function capDiff(diff, max = MAX_DIFF_CHARS) {
  if (typeof diff !== "string") return "";
  if (diff.length <= max) return diff;
  const cut = diff.lastIndexOf("\n", max);
  const head = diff.slice(0, cut > 0 ? cut : max);
  return `${head}\n[... diff truncated by the grader: ${diff.length - head.length} of ${diff.length} characters omitted ...]`;
}
