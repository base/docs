/**
 * `grounding` code check.
 *
 * Every backticked identifier or `0x…` value that appears on a line the run
 * *added* (per `addedLines`, see `graders/line-diff.mjs`) must be traceable
 * to something the run was actually given: the source diff, the changed
 * file paths the payload lists, or the page's own prior content. A token
 * that appears nowhere in those is either invented or copied from the
 * model's training data rather than the verified input — the recurring
 * "ungrounded / wrong facts" failure mode from PLAN.md's evidence table.
 *
 * Deliberately conservative: this flags tokens absent from *all* grounding
 * sources, not tokens that merely look suspicious. False negatives (an
 * ungrounded claim that happens to reuse a word already in the diff) are
 * expected and acceptable; the judge's J2 claim covers subtler cases.
 */
import { addedLines } from "../line-diff.mjs";
import { mkCheck, isDocPage } from "./shared.mjs";

// Backticked spans that are common Solidity/prose vocabulary rather than
// project-specific identifiers, so they never need grounding. Intentionally
// small and easy to extend — see PLAN.md Lane B item 1 ("Keep a small
// documented stoplist").
const STOPLIST = new Set([
  // ABI primitive types (including sized aliases up to 256 bits).
  "address", "addresses", "bool", "string", "bytes",
  ...Array.from({ length: 32 }, (_, i) => `bytes${i + 1}`),
  ...Array.from({ length: 32 }, (_, i) => `uint${(i + 1) * 8}`),
  ...Array.from({ length: 32 }, (_, i) => `int${(i + 1) * 8}`),
  "uint", "int",
  // Solidity keywords that show up in backticked code snippets constantly.
  "mapping", "struct", "enum", "event", "error", "function", "external",
  "internal", "public", "private", "view", "pure", "payable", "override",
  "virtual", "returns", "memory", "storage", "calldata", "true", "false",
  "null", "undefined", "this", "msg.sender", "msg.value", "require",
  "revert", "emit", "constructor", "indexed", "immutable", "constant",
  "abstract", "interface", "contract", "import", "pragma", "solidity",
  "if", "else", "for", "while",
]);

const BACKTICK_SPAN = /`([^`]+)`/g;
const IDENTIFIER_LIKE = /^[A-Za-z_][\w.]*(\([^)]*\))?(\[\])?$/;
const HEX_VALUE = /\b0x[0-9a-fA-F]{4,64}\b/g;

/**
 * @param {string} line one added line
 * @returns {string[]} candidate tokens to ground (deduplicated, stoplist-filtered)
 */
function candidateTokens(line) {
  const found = new Set();

  BACKTICK_SPAN.lastIndex = 0;
  let m;
  while ((m = BACKTICK_SPAN.exec(line)) !== null) {
    const inner = m[1].trim();
    // Only bare identifiers / call-like spans count — a backticked full
    // sentence ("`the migration is optional`") isn't a grounding claim.
    if (IDENTIFIER_LIKE.test(inner) && !STOPLIST.has(inner.toLowerCase())) {
      found.add(inner);
    }
  }

  HEX_VALUE.lastIndex = 0;
  while ((m = HEX_VALUE.exec(line)) !== null) {
    found.add(m[0]);
  }

  return [...found];
}

/**
 * @param {string} token
 * @param {string} haystack
 * @returns {boolean}
 */
function isGrounded(token, haystack) {
  return haystack.toLowerCase().includes(token.toLowerCase());
}

/**
 * @param {object} caseDef
 * @param {{after: Map<string,string>, before: Map<string,string>}} run
 * @returns {Array} checks[]
 */
export function checkGrounding(caseDef, run) {
  const diffText = String(caseDef?.payload?.diff || "");
  const changedPaths = (caseDef?.payload?.changed_paths || []).join("\n");
  const checks = [];

  for (const [page, afterText] of run?.after ?? new Map()) {
    if (!isDocPage(page)) continue;
    const beforeText = run.before?.get(page) ?? "";
    const haystack = `${diffText}\n${beforeText}\n${changedPaths}`;
    const added = addedLines(beforeText, afterText);

    const tokens = new Set();
    for (const line of added) for (const t of candidateTokens(line)) tokens.add(t);

    const ungrounded = [...tokens].filter((t) => !isGrounded(t, haystack));
    const total = tokens.size;
    const score = total === 0 ? 1 : (total - ungrounded.length) / total;
    checks.push(
      mkCheck(
        "grounding",
        "code",
        page,
        ungrounded.length === 0,
        score,
        total === 0
          ? "no backticked identifiers or 0x values on added lines"
          : ungrounded.length === 0
            ? `all ${total} candidate token(s) grounded`
            : `ungrounded: ${ungrounded.slice(0, 10).join(", ")}${ungrounded.length > 10 ? ", ..." : ""}`,
      ),
    );
  }

  return checks;
}
