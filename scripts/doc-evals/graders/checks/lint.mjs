/**
 * `lint` code check.
 *
 * Runs the same style rules `scripts/lint-mdx.js` enforces in CI
 * (frontmatter, title case, heading structure, code blocks, MDX components,
 * accessibility, internal links — PLAN.md's "Style / naming" evidence
 * category) against the page content a replay run produced.
 *
 * `lintFile` itself reads the page from disk at a repo-relative path, which
 * would lint whatever's currently checked out rather than the run's
 * `after/<path>` content this grader is scoring — and grading must never
 * touch `docs/**`. So this composes the same individually-exported rule
 * functions `lintFile` uses (each already takes `(content, filePath)`
 * rather than a path to read) directly over the in-memory after-content,
 * mirroring `lintFile`'s own rule list and line-sort so a drift in either
 * copy is easy to spot in review.
 */
import {
  checkFrontmatter,
  checkTitleCase,
  checkHeadingStructure,
  checkRedundantPageTitle,
  checkCodeBlocks,
  checkMintlifyComponents,
  checkAccessibility,
  checkInternalLinks,
} from "../../../lint-mdx.js";
import { mkCheck, isDocPage } from "./shared.mjs";

/**
 * @param {string} content
 * @param {string} filePath
 * @returns {Array<{line: number, rule: string, severity: "error"|"warning", message: string}>}
 */
function lintContent(content, filePath) {
  const issues = [
    ...checkFrontmatter(content, filePath),
    ...checkTitleCase(content, filePath),
    ...checkHeadingStructure(content, filePath),
    ...checkRedundantPageTitle(content, filePath),
    ...checkCodeBlocks(content, filePath),
    ...checkMintlifyComponents(content, filePath),
    ...checkAccessibility(content, filePath),
    ...checkInternalLinks(content, filePath),
  ];
  return issues.sort((a, b) => a.line - b.line);
}

/**
 * @param {object} caseDef  unused; kept for a consistent check signature
 * @param {{after: Map<string,string>}} run
 * @returns {Array} checks[]
 */
export function checkLint(caseDef, run) {
  const checks = [];
  for (const [page, afterText] of run?.after ?? new Map()) {
    if (!isDocPage(page)) continue;
    const issues = lintContent(afterText, page);
    const errors = issues.filter((i) => i.severity === "error");
    // Every error costs a flat 0.25 off a perfect score, floored at 0 — a
    // page riddled with style errors bottoms out rather than going negative.
    // Warnings are advisory in CI (see RULES in lint-mdx.js) and don't move
    // the score here either.
    const score = Math.max(0, 1 - errors.length * 0.25);
    const detail =
      errors.length === 0
        ? issues.length === 0
          ? "no lint issues"
          : `no errors (${issues.length} advisory warning(s))`
        : errors
            .slice(0, 5)
            .map((i) => `${i.rule}: ${i.message} (line ${i.line})`)
            .join("; ");
    checks.push(mkCheck("lint", "code", page, errors.length === 0, score, detail));
  }
  return checks;
}
