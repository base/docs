/**
 * Minimal line-level diff used only by the code graders (`graders/code.mjs`)
 * to find the lines a replay run *added* to a page, so checks like
 * `grounding` and `selector` only look at new content rather than
 * pre-existing prose the run happened to leave alone.
 *
 * This is deliberately not a general-purpose diff library: it's an LCS
 * (longest common subsequence) over whole lines, which is exactly what a
 * unified diff of two text blobs needs and is easy to verify. For inputs
 * too large for the O(n*m) DP table to be cheap, we fall back to a
 * set-difference approximation (a line counts as "added" if it does not
 * appear anywhere in `before`) — coarser, but still safe and non-crashing.
 */

// Above this many DP cells we skip the exact LCS and fall back to the
// coarser set-difference. 4M cells (~2000x2000 lines) is already an
// unusually long doc page; this is a safety valve, not a normal path.
const MAX_DP_CELLS = 4_000_000;

/**
 * @param {string} beforeText
 * @param {string} afterText
 * @returns {string[]} lines present in `afterText` that an LCS diff against
 *          `beforeText` classifies as added (inserted, not just moved).
 */
export function addedLines(beforeText, afterText) {
  const before = String(beforeText ?? "").split("\n");
  const after = String(afterText ?? "").split("\n");

  if (before.length * after.length > MAX_DP_CELLS) {
    const beforeSet = new Set(before);
    return after.filter((line) => !beforeSet.has(line));
  }

  const n = before.length;
  const m = after.length;
  // dp[i][j] = length of LCS of before[i..] and after[j..]
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        before[i] === after[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const added = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (before[i] === after[j]) {
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++; // before[i] was deleted
    } else {
      added.push(after[j]); // after[j] was added
      j++;
    }
  }
  while (j < m) {
    added.push(after[j]);
    j++;
  }
  return added;
}
