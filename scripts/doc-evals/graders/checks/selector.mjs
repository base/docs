/**
 * `selector` code check.
 *
 * Finds `signature ↔ 4-byte selector` pairs written on lines a run *added*
 * (tables such as `| \`transfer(address,uint256)\` | \`0xa9059cbb\` |`, or
 * inline code/comments), recomputes the selector with Keccak-256
 * (`graders/keccak.mjs` — Node's `sha3-256` is NOT Keccak and would silently
 * pass everything), and flags any pair whose written selector doesn't match
 * the signature. This is the exact failure PLAN.md's evidence table cites:
 * "enum selectors hashed wrong" from bot PR #1939's follow-up review.
 *
 * Enums ABI-encode as their underlying integer type (`uint8` for up to 256
 * members, the only size Solidity emits), so a parameter type that isn't a
 * known ABI primitive is tried both literally and with `uint8` substituted
 * in its place; the pair passes if either canonical form's selector matches
 * what's written.
 */
import { selectorFromSignature } from "../keccak.mjs";
import { addedLines } from "../line-diff.mjs";
import { mkCheck, isDocPage } from "./shared.mjs";

// A selector is exactly 4 bytes (8 hex chars); lookaround excludes it from
// matching as a substring of a longer hex value (an address, a tx hash).
const SELECTOR_RE = /(?<![0-9a-fA-F])0x[0-9a-fA-F]{8}(?![0-9a-fA-F])/g;
// `name(params)` with no nested parens — sufficient for Solidity function /
// error / event signatures, which never nest parens in their parameter list.
const SIGNATURE_RE = /\b([A-Za-z_][A-Za-z0-9_]*)\(([^()]*)\)/g;

const ABI_BASE_TYPES = new Set([
  "address", "bool", "string", "bytes",
  ...Array.from({ length: 32 }, (_, i) => `bytes${i + 1}`),
  ...Array.from({ length: 32 }, (_, i) => `uint${(i + 1) * 8}`),
  ...Array.from({ length: 32 }, (_, i) => `int${(i + 1) * 8}`),
]);

/**
 * Normalize one parameter chunk ("address to", "uint256[] calldata amounts",
 * "Status") down to its ABI type: the first whitespace-separated token,
 * with the bare `uint`/`int` aliases expanded to their 256-bit default.
 *
 * @param {string} raw
 * @returns {{type: string, isKnown: boolean}}
 */
function canonicalParamType(raw) {
  const first = raw.trim().split(/\s+/)[0] || "";
  const arrayMatch = first.match(/^([A-Za-z0-9]+)((?:\[\d*\])*)$/);
  const base = arrayMatch ? arrayMatch[1] : first;
  const suffix = arrayMatch ? arrayMatch[2] : "";
  const normalizedBase = base === "uint" ? "uint256" : base === "int" ? "int256" : base;
  return { type: normalizedBase + suffix, isKnown: ABI_BASE_TYPES.has(normalizedBase) };
}

/**
 * @param {string} name
 * @param {string} paramsStr  raw text between the outer parens
 * @returns {{literal: string, enumSubstituted: string|null}}
 *          `enumSubstituted` is null when every param type is already known
 *          (nothing to substitute).
 */
function canonicalSignatures(name, paramsStr) {
  const parts = paramsStr.trim().length === 0 ? [] : paramsStr.split(",");
  const canon = parts.map(canonicalParamType);
  const literal = `${name}(${canon.map((c) => c.type).join(",")})`;
  const hasUnknown = canon.some((c) => !c.isKnown);
  const enumSubstituted = hasUnknown
    ? `${name}(${canon.map((c) => (c.isKnown ? c.type : "uint8")).join(",")})`
    : null;
  return { literal, enumSubstituted };
}

/**
 * @param {string} line
 * @returns {{selectors: string[], sigs: Array<{name: string, paramsStr: string}>}}
 */
function candidatesForLine(line) {
  const selectors = [];
  SELECTOR_RE.lastIndex = 0;
  let m;
  while ((m = SELECTOR_RE.exec(line)) !== null) selectors.push(m[0].toLowerCase());

  const sigs = [];
  SIGNATURE_RE.lastIndex = 0;
  while ((m = SIGNATURE_RE.exec(line)) !== null) {
    sigs.push({ name: m[1], paramsStr: m[2] });
  }
  return { selectors, sigs };
}

/**
 * @param {string[]} addedLines
 * @returns {{total: number, mismatches: string[]}}
 */
function evaluateLines(addedLines) {
  let total = 0;
  const mismatches = [];

  for (const line of addedLines) {
    const { selectors, sigs } = candidatesForLine(line);
    const pairCount = Math.min(selectors.length, sigs.length);
    for (let i = 0; i < pairCount; i++) {
      const written = selectors[i];
      const { name, paramsStr } = sigs[i];
      const { literal, enumSubstituted } = canonicalSignatures(name, paramsStr);
      const literalSelector = selectorFromSignature(literal);
      const enumSelector = enumSubstituted ? selectorFromSignature(enumSubstituted) : null;
      total++;
      if (written !== literalSelector && written !== enumSelector) {
        mismatches.push(`${literal} written as ${written}, expected ${literalSelector}`);
      }
    }
  }
  return { total, mismatches };
}

/**
 * @param {object} caseDef  unused (mismatches are self-contained: signature
 *        text + written selector, both taken from the page itself), kept
 *        for a consistent `check*(caseDef, run)` signature across modules.
 * @param {{after: Map<string,string>, before: Map<string,string>}} run
 * @returns {Array} checks[]
 */
export function checkSelector(caseDef, run) {
  const checks = [];
  for (const [page, afterText] of run?.after ?? new Map()) {
    if (!isDocPage(page)) continue;
    const beforeText = run.before?.get(page) ?? "";
    const added = addedLines(beforeText, afterText);
    const { total, mismatches } = evaluateLines(added);
    const score = total === 0 ? 1 : (total - mismatches.length) / total;
    checks.push(
      mkCheck(
        "selector",
        "code",
        page,
        mismatches.length === 0,
        score,
        total === 0
          ? "no signature/selector pairs on added lines"
          : mismatches.length === 0
            ? `all ${total} selector(s) match their signature`
            : mismatches.slice(0, 5).join("; "),
      ),
    );
  }
  return checks;
}

