/**
 * `changelog.shape` and `changelog.fidelity` code checks.
 *
 * `changelog.shape`: a changelog *entry* page must carry the four required
 * sections from docs/content-guidelines.md's "Changelog Entries" table —
 * Abstract, Motivation, What changed, Migration — in that relative order.
 * Extra sections the guidelines call out as optional ("Alternatives
 * considered", "Test cases") or page-specific subsections are allowed
 * between them; the guidelines say "use the sections that fit", so this
 * checks presence-and-order of the four required headings, not an exact
 * heading list. A changelog *summary* page must add no new heading or
 * callout on top of its one-row-per-feature table (SHARED_RULES rule 5:
 * "Never add sections, callouts, or code to a summary page").
 *
 * `changelog.fidelity`: PLAN.md's evidence table cites a reviewer telling
 * the bot to follow the upstream changelog entry rather than paraphrase it
 * (#1968 inline comment). The "upstream source entry" isn't a separate case
 * field — it's the `+` lines of the changelog markdown file inside
 * `payload.diff` itself (a new/modified `changelog/NN_Hardfork_Product_
 * feature.md`), so this locates that file via the same `source_pattern`
 * the sync's route table uses and diffs the page's word-3-grams against it.
 * A heavily paraphrased page shares few 3-grams with its source even when
 * every fact is technically correct, which is exactly the failure mode to
 * catch. When no such file is present in the diff (release payloads,
 * truncated diffs, or a case that predates this field), the check is
 * skipped rather than failed — "for changelog entry pages with an upstream
 * source entry in the payload" (PLAN.md) is a precondition, not a pass/fail.
 */
import { splitDiffByFile } from "../../../sync-from-base-std/release-utils.mjs";
import { roleForPage, CHANGELOG_LAYOUT } from "../pageRole.mjs";
import { addedLines } from "../line-diff.mjs";
import { mkCheck, isDocPage, trigramOverlap } from "./shared.mjs";

const REQUIRED_SECTIONS = [
  { id: "Abstract", pattern: /^abstract\b/i },
  { id: "Motivation", pattern: /^motivation\b/i },
  { id: "What changed", pattern: /^what changed\b/i },
  { id: "Migration", pattern: /^migration\b/i },
];

// Start conservative (per PLAN.md "start at 0.5, tune during calibration").
const FIDELITY_THRESHOLD = 0.5;

/** @returns {string[]} H2-H6 heading text, in document order */
function headings(content) {
  return String(content ?? "")
    .split("\n")
    .map((line) => line.match(/^#{2,6}\s+(.*)$/))
    .filter(Boolean)
    .map((m) => m[1].trim());
}

/**
 * @param {object} caseDef  unused; kept for a consistent check signature
 * @param {{after: Map<string,string>, before: Map<string,string>}} run
 * @returns {Array} checks[]
 */
export function checkChangelogShape(caseDef, run) {
  const checks = [];
  for (const [page, afterText] of run?.after ?? new Map()) {
    if (!isDocPage(page)) continue;
    const role = roleForPage(page);

    if (role === "changelog-entry") {
      const heads = headings(afterText);
      const missing = [];
      let outOfOrder = false;
      let lastIndex = -1;
      for (const section of REQUIRED_SECTIONS) {
        const idx = heads.findIndex((h) => section.pattern.test(h));
        if (idx === -1) {
          missing.push(section.id);
          continue;
        }
        if (idx < lastIndex) outOfOrder = true;
        lastIndex = Math.max(lastIndex, idx);
      }
      const pass = missing.length === 0 && !outOfOrder;
      const score = pass ? 1 : Math.max(0, 1 - 0.25 * (missing.length + (outOfOrder ? 1 : 0)));
      const detail = pass
        ? "Abstract, Motivation, What changed, Migration present in order"
        : [missing.length ? `missing: ${missing.join(", ")}` : "", outOfOrder ? "sections out of order" : ""]
            .filter(Boolean)
            .join("; ");
      checks.push(mkCheck("changelog.shape", "code", page, pass, score, detail));
    } else if (role === "changelog-index") {
      const beforeText = run.before?.get(page) ?? "";
      const added = addedLines(beforeText, afterText);
      const disallowed = added.filter(
        (line) => /^#{1,6}\s/.test(line.trim()) || /^<(Warning|Note|Info|Tip|Check)\b/.test(line.trim()),
      );
      const pass = disallowed.length === 0;
      checks.push(
        mkCheck(
          "changelog.shape",
          "code",
          page,
          pass,
          pass ? 1 : 0,
          pass ? "no added sections or callouts" : `added disallowed content: ${disallowed.slice(0, 3).join(" | ")}`,
        ),
      );
    }
  }
  return checks;
}

/**
 * @param {string} diffText  `payload.diff`
 * @returns {string|null} the added-line text of the matching changelog
 *          source file, or null when the diff has none
 */
function findSourceEntry(diffText) {
  const sourcePattern = CHANGELOG_LAYOUT.entryRule?.source_pattern;
  if (!sourcePattern) return null;
  const re = new RegExp(sourcePattern);
  const byFile = splitDiffByFile(diffText);
  for (const [file, section] of byFile) {
    if (!re.test(file)) continue;
    return section
      .split("\n")
      .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
      .map((line) => line.slice(1))
      .join("\n");
  }
  return null;
}

/**
 * @param {object} caseDef
 * @param {{after: Map<string,string>}} run
 * @returns {Array} checks[]
 */
export function checkChangelogFidelity(caseDef, run) {
  const sourceEntry = findSourceEntry(String(caseDef?.payload?.diff || ""));
  if (!sourceEntry || sourceEntry.trim().length === 0) return [];

  const checks = [];
  for (const [page, afterText] of run?.after ?? new Map()) {
    if (!isDocPage(page)) continue;
    if (roleForPage(page) !== "changelog-entry") continue;
    // Directional: what fraction of the *page's* 3-grams trace back to the
    // source entry — heavy paraphrasing shows up as a low score even when
    // the page is factually accurate.
    const overlap = trigramOverlap(afterText, sourceEntry);
    const pass = overlap >= FIDELITY_THRESHOLD;
    checks.push(
      mkCheck(
        "changelog.fidelity",
        "code",
        page,
        pass,
        overlap,
        `${(overlap * 100).toFixed(0)}% of the page's 3-grams found in the source entry (threshold ${FIDELITY_THRESHOLD * 100}%)`,
      ),
    );
  }
  return checks;
}
