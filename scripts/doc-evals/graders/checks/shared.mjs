/**
 * Shared helpers for the code-check graders (`graders/checks/*.mjs`).
 *
 * Kept dependency-free and side-effect-free (no fs, no network) so every
 * check module — and their tests — can import from here without pulling in
 * anything but pure functions.
 */
import { isLintablePage } from "../../../lint-mdx.js";

/**
 * Build one entry of the `checks[]` array in the shared grade-result
 * contract (see PLAN.md, "Grader result").
 *
 * @param {string} id       e.g. "scope.precision", "grounding"
 * @param {"code"|"judge"|"pairwise"} layer
 * @param {string|null} page
 * @param {boolean|null} pass
 * @param {number} score    0..1
 * @param {string} detail   short human-readable reason
 */
export function mkCheck(id, layer, page, pass, score, detail) {
  return { id, layer, page: page ?? null, pass, score, detail };
}

/**
 * True when `page` is a real documentation page a code check should reason
 * about — reuses the lint script's own page filter (`.mdx` under `docs/`,
 * not a snippet, not `.mintignore`d) so "ignore generated index files"
 * (`docs/AGENTS.md`, `docs/llms*.txt`, which aren't `.mdx`) falls out of the
 * same filter without a second hand-rolled rule.
 *
 * @param {string} page
 * @returns {boolean}
 */
export function isDocPage(page) {
  return isLintablePage(page);
}

/**
 * Lowercase word tokens, punctuation stripped — used by 3-gram overlap.
 *
 * @param {string} text
 * @returns {string[]}
 */
export function tokenize(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[`*_#>|[\]()]/g, " ")
    .match(/[a-z0-9]+/g) || [];
}

/**
 * @param {string[]} tokens
 * @returns {Set<string>} space-joined 3-grams; empty when fewer than 3 tokens
 */
export function threeGrams(tokens) {
  const grams = new Set();
  for (let i = 0; i + 3 <= tokens.length; i++) {
    grams.add(tokens[i] + " " + tokens[i + 1] + " " + tokens[i + 2]);
  }
  return grams;
}

/**
 * Jaccard-style overlap of `a`'s 3-grams found in `b`'s 3-grams: what
 * fraction of `a`'s trigrams also appear in `b`. Directional on purpose —
 * `changelog.fidelity` asks "how much of the page's content traces back to
 * the source entry", not the reverse (the page is allowed to add framing
 * prose the source entry didn't have).
 *
 * @param {string} aText
 * @param {string} bText
 * @returns {number} 0..1; 1 when `a` has fewer than 3 tokens (nothing to check)
 */
export function trigramOverlap(aText, bText) {
  const aGrams = threeGrams(tokenize(aText));
  if (aGrams.size === 0) return 1;
  const bGrams = threeGrams(tokenize(bText));
  let hit = 0;
  for (const g of aGrams) if (bGrams.has(g)) hit++;
  return hit / aGrams.size;
}
