/**
 * stats.mjs — pure math helpers for merge-rate.mjs. No network, no fs; safe
 * to unit test directly against recorded fixture shapes.
 */

/** @param {number[]} nums */
export function mean(nums) {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** @param {number[]} nums */
export function median(nums) {
  if (!nums.length) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Safe division for a rate: null (not 0 or NaN) when there is nothing to
 * take a rate of, so callers/renderers can print "n/a" instead of "0%"
 * for an empty population.
 * @param {number} numerator
 * @param {number} denominator
 * @returns {number|null}
 */
export function rate(numerator, denominator) {
  if (!denominator) return null;
  return numerator / denominator;
}

/** Hours between two ISO timestamps (b - a). */
export function hoursBetween(aIso, bIso) {
  return (new Date(bIso).getTime() - new Date(aIso).getTime()) / (1000 * 60 * 60);
}

/**
 * True when `updatedAtIso` is more than `staleDays` before `nowMs`. Used
 * to flag open bot PRs nobody has touched in a while.
 * @param {string} updatedAtIso
 * @param {number} [staleDays]
 * @param {number} [nowMs] Injectable for deterministic tests.
 */
export function isStale(updatedAtIso, staleDays = 7, nowMs = Date.now()) {
  const ageMs = nowMs - new Date(updatedAtIso).getTime();
  return ageMs > staleDays * 24 * 60 * 60 * 1000;
}

/**
 * Share of a merged PR's total changed lines that were added by a
 * non-bot commit landing after the bot's own first commit — i.e. how much
 * a human had to rewrite before it merged.
 *
 * `commits` must be in chronological order (as GitHub returns them) and
 * carry `{isBot, additions, deletions}` for every commit *after* the
 * first bot commit (earlier commits' stats are never read, so callers
 * only need to fetch stats for the tail).
 *
 * Returns null when there's nothing to divide by (no bot commit found —
 * this PR isn't actually a bot PR by commit history — or zero total
 * changed lines).
 * @param {{isBot: boolean, additions?: number, deletions?: number}[]} commits
 * @param {number} totalChangedLines Additions + deletions for the whole PR.
 * @returns {number|null}
 */
export function humanRewriteRatio(commits, totalChangedLines) {
  if (!totalChangedLines) return null;
  const firstBotIndex = commits.findIndex((c) => c.isBot);
  if (firstBotIndex === -1) return null;
  const humanLinesAfterBot = commits
    .slice(firstBotIndex + 1)
    .filter((c) => !c.isBot)
    .reduce((sum, c) => sum + (c.additions ?? 0) + (c.deletions ?? 0), 0);
  return humanLinesAfterBot / totalChangedLines;
}

/**
 * Flags open PRs whose changed files were later touched by a merged PR
 * (i.e. someone shipped a hand-written fix that overlaps this bot PR's
 * files, so the open one is probably obsolete).
 *
 * Pure set-overlap check: `mergedAfterOpen` must already be filtered to
 * PRs merged after `openPr.createdAt` — this function doesn't look at
 * dates itself so it stays trivially testable.
 * @param {{number: number, files: string[]}} openPr
 * @param {{number: number, files: string[]}[]} mergedCandidates
 * @returns {{number: number, files: string[]}[]} the merged PRs that overlap, if any
 */
export function findSupersedingPRs(openPr, mergedCandidates) {
  const openFiles = new Set(openPr.files);
  return mergedCandidates.filter(
    (merged) => merged.number !== openPr.number && merged.files.some((f) => openFiles.has(f)),
  );
}
