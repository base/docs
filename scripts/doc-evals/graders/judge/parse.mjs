/**
 * Judge response parser. See PLAN.md, "Lane B: graders", item 2: "Parse
 * defensively; a malformed reply is `pass:null` + detail, never a crash."
 *
 * Deliberately liberal about the exact bytes the model returns (a stray
 * markdown fence, a wrapper object, leading/trailing prose) but strict
 * about what it produces per claim: `pass` must be a literal JSON boolean
 * or it's treated as unparsable for that claim, never coerced.
 */
import { CLAIMS } from "./prompt.mjs";

const CLAIM_IDS = CLAIMS.map((c) => c.id);

function unparsable(reason) {
  return {
    claims: CLAIM_IDS.map((id) => ({ id, pass: null, reason })),
    parseError: reason,
  };
}

/**
 * @param {string} text  raw model output (the `text` field of `complete()`'s return)
 * @returns {{claims: Array<{id: string, pass: boolean|null, reason: string}>, parseError: string|null}}
 */
export function parseJudgeResponse(text) {
  if (typeof text !== "string" || text.trim().length === 0) {
    return unparsable("empty judge response");
  }

  let raw = text.trim();
  const fenced = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenced) raw = fenced[1].trim();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Fall back to the outermost [...] slice, in case the model added
    // prose around a correctly-formed array despite instructions not to.
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1 || end === -1 || end < start) {
      return unparsable("unparsable judge response: no JSON array found");
    }
    try {
      parsed = JSON.parse(raw.slice(start, end + 1));
    } catch {
      return unparsable("unparsable judge response: invalid JSON");
    }
  }

  if (!Array.isArray(parsed)) {
    return unparsable("judge response was not a JSON array");
  }

  const byId = new Map();
  for (const entry of parsed) {
    if (entry && typeof entry === "object" && typeof entry.id === "string") {
      byId.set(entry.id, entry);
    }
  }

  const claims = CLAIM_IDS.map((id) => {
    const entry = byId.get(id);
    if (!entry) return { id, pass: null, reason: "missing from judge response" };
    const pass = typeof entry.pass === "boolean" ? entry.pass : null;
    const reason =
      typeof entry.reason === "string" && entry.reason.trim()
        ? entry.reason.trim()
        : pass === null
          ? "malformed verdict: pass was not a JSON boolean"
          : "";
    return { id, pass, reason };
  });

  return { claims, parseError: null };
}
