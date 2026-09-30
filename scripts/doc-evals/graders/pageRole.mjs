/**
 * Page-role classification for the graders.
 *
 * `SHARED_RULES` rule 5 in `scripts/sync-from-base-std/llm/prompts.mjs` names
 * six page roles (function reference, interface index, spec / shared
 * reference, guide, changelog entry, changelog summary) that the generator
 * is told to respect. We reuse the sync's own `pageRoleFor` (pure, in the
 * dependency-free `release-utils.mjs`) so the graders' notion of "what kind
 * of page is this" is identical to the generator's.
 *
 * `pageRoleFor` needs the `{ entryDir, summaryPage }` layout that
 * `changelogLayout` in `index.mjs` derives from `route-table.json`. We must
 * NOT import `index.mjs` here: it statically pulls in `@anthropic-ai/sdk`,
 * and the root `npm test` in CI runs without `scripts/node_modules`
 * (PLAN.md, ground rules). `changelogLayout` is a ten-line pure function, so
 * we keep a local copy below; `graders-pagerole.test.mjs` asserts it matches
 * `index.mjs` (lazily imported, skipped when the sdk isn't installed) so the
 * copy cannot silently drift.
 */
import path from "node:path";
import { pageRoleFor } from "../../sync-from-base-std/release-utils.mjs";
import routeTable from "../../sync-from-base-std/route-table.json" with { type: "json" };

/**
 * Local copy of `changelogLayout` from `sync-from-base-std/index.mjs`.
 *
 * @param {object} rt parsed route-table.json
 * @returns {{entryRule: object|null, entryDir: string, summaryPage: string}}
 */
export function changelogLayoutCopy(rt) {
  const rules = rt?.code_changes || [];
  const entryRule = rules.find((r) => r.kind === "changelog-entry" && r.page_template) || null;
  const indexRule = rules.find((r) => r.kind === "changelog-index" && r.pages?.length) || null;
  return {
    entryRule,
    entryDir: entryRule ? path.posix.dirname(entryRule.page_template) : "",
    summaryPage: indexRule ? indexRule.pages[0] : "",
  };
}

const LAYOUT = changelogLayoutCopy(routeTable);

/**
 * @param {string} pagePath repo-relative docs path, e.g. "docs/.../foo.mdx"
 * @returns {"changelog-entry"|"changelog-index"|"function-reference"|"interface-index"|"shared-reference"|"guide"}
 */
export function roleForPage(pagePath) {
  return pageRoleFor(pagePath, LAYOUT);
}

/** Exposed for checks that need the raw layout (e.g. locating the entry dir). */
export const CHANGELOG_LAYOUT = LAYOUT;
