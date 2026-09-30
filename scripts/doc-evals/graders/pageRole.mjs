/**
 * Page-role classification for the graders.
 *
 * `SHARED_RULES` rule 5 in `scripts/sync-from-base-std/llm/prompts.mjs` names
 * six page roles (function reference, interface index, spec / shared
 * reference, guide, changelog entry, changelog summary) that the generator
 * is told to respect. Rather than re-derive that classification from page
 * paths by hand, we reuse the sync's own `pageRoleFor` (a pure, zero-network
 * helper in `release-utils.mjs`) and feed it the same `{ entryDir,
 * summaryPage }` layout the sync computes from `route-table.json` via
 * `changelogLayout` in `index.mjs`. This keeps the graders' notion of "what
 * kind of page is this" identical to the generator's, so a judge claim like
 * J4 ("the page keeps the shape its role requires") is checked against the
 * same role the prompt builder used.
 *
 * Importing `index.mjs` here only pulls in `changelogLayout` (a pure
 * function over the route table); it does not construct the Gateway client
 * or run `main()` (guarded by the `argv[1]` check at the bottom of that
 * file), so this import is safe with no `LLM_GATEWAY_API_KEY` set.
 */
import { pageRoleFor } from "../../sync-from-base-std/release-utils.mjs";
import { changelogLayout } from "../../sync-from-base-std/index.mjs";
import routeTable from "../../sync-from-base-std/route-table.json" with { type: "json" };

const LAYOUT = changelogLayout(routeTable);

/**
 * @param {string} pagePath repo-relative docs path, e.g. "docs/.../foo.mdx"
 * @returns {"changelog-entry"|"changelog-index"|"function-reference"|"interface-index"|"shared-reference"|"guide"}
 */
export function roleForPage(pagePath) {
  return pageRoleFor(pagePath, LAYOUT);
}

/** Exposed for checks that need the raw layout (e.g. locating the entry dir). */
export const CHANGELOG_LAYOUT = LAYOUT;
