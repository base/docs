/**
 * taxonomy.mjs — heuristic classifier for reviewer feedback on bot PRs.
 * Keyword rules only (no LLM) by default, per PLAN.md Lane C §2: cheapest
 * grader that works. `mine-feedback.mjs`'s optional `--llm` flag can swap
 * in a Haiku call later without touching this file's default path.
 *
 * Categories match the case-file schema's `review_findings[].type`:
 * scope | paraphrase | fact | housekeeping | style | naming | other.
 *
 * Rules are checked in order and the first match wins, because the same
 * comment can plausibly trip more than one regex (e.g. a housekeeping
 * banner comment also uses the word "removed" in a fact-adjacent way).
 * Order reflects how load-bearing each signal is in the real review
 * comments this taxonomy was built from (see PLAN.md's failure table):
 * housekeeping and scope calls tend to use unambiguous phrasing, while
 * "style" words like "heading" are common enough in unrelated comments
 * that they're checked last.
 */

/** Bot logins whose comments are never review feedback (CI/preview bots). */
export const SKIP_LOGINS = new Set(["mintlify[bot]", "cb-heimdall"]);

/**
 * True for any login that should be excluded from feedback mining:
 * the two named CI bots above, or any GitHub App identity (`...[bot]`).
 * @param {string|null|undefined} login
 */
export function isBotLogin(login) {
  if (!login) return false;
  if (SKIP_LOGINS.has(login)) return true;
  return /\[bot\]$/.test(login);
}

export const TAXONOMY_TYPES = ["scope", "paraphrase", "fact", "housekeeping", "style", "naming", "other"];

// Order matters — see module docstring.
const RULES = [
  {
    type: "housekeeping",
    re: /(source file removed|repository housekeeping|internal process|closing unmerged|route table (mapped|missed)|housekeeping (banner|callout))/i,
  },
  {
    // Checked before "scope" — "do we need to add X's last name" would
    // otherwise match scope's broader "do we need" pattern first.
    type: "naming",
    re: /(last name|full name|author'?s? name|need (to add|.*'s) (last name|full name)|attribution)/i,
  },
  {
    type: "scope",
    re: /(don'?t need|do we need|why (do|did|these) (you|we)?\s*(need|change)|why these changes|unrelated (guide|change|page)|out of scope|shouldn'?t (be here|have been (made|touched))|drop this|scope creep|not (part of|related to) (this|the) change|i don'?t think this needs to be here)/i,
  },
  {
    type: "paraphrase",
    re: /(verbatim|paraphrase|instead of copying|follow what (we|'ve)? ?written|copy(ing)? .*exactly|summariz(ed|ing) instead of|updated this instead of copying)/i,
  },
  {
    type: "fact",
    re: /(selector|keccak|hashed the enum|invented (a )?constant|ungrounded|hallucinat|does not (reset|behave|do)|invalid solidity|fact-check|wrong (value|behavior|constant|selector)|incorrect (value|behavior|selector))/i,
  },
  {
    type: "style",
    re: /(title case|em dash|fence title|bare fence|heading (style|order)|not title.?cased?|capitali[sz]e)/i,
  },
];

/**
 * Classify one comment body into a taxonomy type. Pure string match; a
 * malformed/empty body classifies as "other" rather than throwing.
 * @param {string|null|undefined} text
 * @returns {string}
 */
export function classifyComment(text) {
  if (!text) return "other";
  for (const rule of RULES) {
    if (rule.re.test(text)) return rule.type;
  }
  return "other";
}

/**
 * Classify a batch of `{text}`-bearing objects, attaching `type`.
 * Leaves an already-present `type` alone so hand-labeled or LLM-classified
 * findings pass through unchanged.
 * @param {{text: string, type?: string}[]} findings
 */
export function classifyFindings(findings) {
  return findings.map((f) => ({ ...f, type: f.type || classifyComment(f.text) }));
}

/**
 * Count findings per taxonomy type. Always returns every type key (zero
 * for types with no hits) so a markdown table has stable columns.
 * @param {{type: string}[]} findings
 */
export function tallyTaxonomy(findings) {
  const counts = Object.fromEntries(TAXONOMY_TYPES.map((t) => [t, 0]));
  for (const f of findings) {
    counts[f.type] = (counts[f.type] ?? 0) + 1;
  }
  return counts;
}
