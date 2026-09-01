/**
 * Zero-dependency helpers for the release-discovery path.
 *
 * These live outside index.mjs (which imports the internal Gateway client via
 * ./llm/client.mjs) so the unit-test suite can import and exercise them
 * directly — same reason safety.mjs is kept dependency-free. Every function
 * here is pure: no file IO, no network, no module-level state.
 */

/**
 * Run `fn` over `items` with at most `limit` in flight at once, preserving
 * input order in the returned results array. A tiny dependency-free worker
 * pool: keep `limit` promises running and feed the next index as each
 * finishes. Used for the per-page transform, the manifest-chunk pre-pass, and
 * release page selection so a large release can't serialize into a slow run
 * or fan out into an unbounded burst of gateway calls.
 *
 * Rejections propagate (Promise.all semantics) — callers that want
 * best-effort per item must catch inside `fn`.
 *
 * @template T, R
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T, index: number) => Promise<R>} fn
 * @returns {Promise<R[]>}
 */
export async function mapWithConcurrency(items, limit, fn) {
  const list = Array.isArray(items) ? items : [];
  const results = new Array(list.length);
  const effectiveLimit = Math.max(1, Math.min(limit | 0 || 1, list.length || 1));
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= list.length) return;
      results[i] = await fn(list[i], i);
    }
  }
  const workers = [];
  for (let w = 0; w < effectiveLimit; w++) workers.push(worker());
  await Promise.all(workers);
  return results;
}

/**
 * Split a unified diff into chunks of at most ~maxBytes, cutting only on
 * `diff --git ` file boundaries so each chunk holds whole files (and thus
 * whole hunks). A single file larger than maxBytes becomes its own oversized
 * chunk rather than being split mid-hunk — the manifest pre-pass tolerates a
 * large chunk better than a syntactically broken one. Returns [] for empty
 * input.
 *
 * @param {string} diff
 * @param {number} maxBytes
 * @returns {string[]}
 */
export function chunkDiffBySize(diff, maxBytes) {
  if (typeof diff !== "string" || diff.trim().length === 0) return [];
  const cap = Math.max(1, maxBytes | 0);
  // Split into per-file sections. The first element may be a preamble before
  // the first `diff --git`; it stays attached to the first file section.
  const parts = diff.split(/(?=^diff --git )/m).filter((s) => s.length > 0);
  const chunks = [];
  let buf = "";
  for (const part of parts) {
    if (buf.length > 0 && buf.length + part.length > cap) {
      chunks.push(buf);
      buf = "";
    }
    if (part.length > cap && buf.length === 0) {
      // Oversized single file: emit it alone.
      chunks.push(part);
      continue;
    }
    buf += part;
  }
  if (buf.length > 0) chunks.push(buf);
  return chunks;
}

/**
 * Merge per-chunk manifests into one, de-duplicating on file+kind+subject so
 * the same change reported by two overlapping chunks isn't counted twice.
 * Non-array inputs and non-object entries are skipped.
 *
 * @param {Array<Array<object>>} manifests
 * @returns {Array<object>}
 */
export function mergeManifests(manifests) {
  const seen = new Set();
  const merged = [];
  for (const m of manifests || []) {
    if (!Array.isArray(m)) continue;
    for (const entry of m) {
      if (!entry || typeof entry !== "object") continue;
      const key = `${entry.file || ""}|${entry.kind || ""}|${entry.subject || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(entry);
    }
  }
  return merged;
}

/**
 * Accept only the bounded manifest shape that may be forwarded from the
 * untrusted-diff extraction pass to later model calls. This is deliberately a
 * sanitizer rather than a parser: malformed/model-invented records are simply
 * dropped, and every accepted string is single-line and size-bounded.
 */
const MANIFEST_KINDS = new Set([
  "field_type_change", "field_added", "field_removed", "field_renamed",
  "signature_change", "return_type_change", "enum_variant_added",
  "enum_variant_removed", "default_change", "other",
]);
const cleanManifestString = (value, max) =>
  typeof value === "string" && value.length > 0 && value.length <= max && !/[\r\n\0]/.test(value)
    ? value
    : null;

export function sanitizeManifestRecords(records, cap = 500) {
  if (!Array.isArray(records)) return [];
  const out = [];
  for (const record of records) {
    if (out.length >= cap || !record || typeof record !== "object") continue;
    const file = cleanManifestString(record.file, 512);
    const kind = cleanManifestString(record.kind, 64);
    const subject = cleanManifestString(record.subject, 512);
    const summary = cleanManifestString(record.summary, 2048);
    if (!file || !kind || !subject || !summary || !MANIFEST_KINDS.has(kind)) continue;
    const next = { file, kind, subject, summary };
    const before = cleanManifestString(record.before, 512);
    const after = cleanManifestString(record.after, 512);
    if (before) next.before = before;
    if (after) next.after = after;
    out.push(next);
  }
  return out;
}

/**
 * Minimal glob -> RegExp for the discovery exclude list. Supports `**`, `*`,
 * and `?`; everything else is matched literally. Anchored to the full path.
 * Kept tiny on purpose — this matches config we author, not user input, so it
 * doesn't need a full globbing dependency.
 *
 * @param {string} glob
 * @returns {RegExp}
 */
export function globToRegExp(glob) {
  let re = "^";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        // Globstar. `**/` matches any number of path segments INCLUDING zero
        // (so `a/**/b` matches `a/b`); a trailing `**` matches the rest.
        if (glob[i + 2] === "/") {
          re += "(?:.*/)?";
          i += 2;
        } else {
          re += ".*";
          i += 1;
        }
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  re += "$";
  return new RegExp(re);
}

/**
 * Render a compact, one-line-per-entry manifest summary for the selection
 * prompt. Capped so the selection call stays cheap regardless of manifest
 * size; a final line notes how many entries were elided.
 *
 * @param {Array<object>} manifest
 * @param {number} cap
 * @returns {string}
 */
export function summarizeManifest(manifest, cap = 120) {
  if (!Array.isArray(manifest) || manifest.length === 0) return "";
  const shown = manifest.slice(0, cap);
  const lines = shown.map((e) => {
    const kind = e.kind || "other";
    const subject = e.subject || "(unspecified)";
    const file = e.file || "";
    return `- [${kind}] ${subject}${file ? ` (${file})` : ""}`;
  });
  if (manifest.length > shown.length) {
    lines.push(`- ... and ${manifest.length - shown.length} more change(s)`);
  }
  return lines.join("\n");
}
