/**
 * Parsing helpers for the Mintlify navigation tree in docs/docs.json.
 *
 * Shape (verified against docs/docs.json):
 *   navigation.tabs[]            -> { tab, groups[], global? }
 *   groups[]                     -> { group, pages[] }
 *   pages[]                      -> page-path string | { group, pages[] }   (nests to depth 2+)
 *
 * Every input here originates from a pull request head and is therefore untrusted.
 * These functions never execute it, and they throw rather than guess when the shape
 * is wrong so the caller can fail the gate closed.
 */

export class NavParseError extends Error {}

/** Parse docs.json text into an object, rejecting anything that is not a JSON object. */
export function parseNavConfig(text) {
  if (typeof text !== "string" || text.trim() === "") {
    throw new NavParseError("docs.json content is empty");
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new NavParseError(`docs.json is not valid JSON: ${err.message}`);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new NavParseError("docs.json did not parse to an object");
  }
  return parsed;
}

function tabsOf(config) {
  const tabs = config?.navigation?.tabs;
  if (!Array.isArray(tabs)) {
    throw new NavParseError("docs.json has no navigation.tabs array");
  }
  return tabs;
}

/** Find a tab by its `tab` label. Returns undefined when the tab is absent. */
export function findTab(config, tabName) {
  return tabsOf(config).find((t) => t && t.tab === tabName);
}

/**
 * Names of the groups directly under a tab -- depth 1 only.
 *
 * For "Build on Base" these are the solution groups the gate protects. Returned as a
 * Set so callers compare membership, not order: reordering groups is not a structural
 * change, and the spec says the gate watches "the set of direct solution groups".
 */
export function topLevelGroupNames(config, tabName) {
  const tab = findTab(config, tabName);
  if (!tab) return new Set();
  const groups = Array.isArray(tab.groups) ? tab.groups : [];
  const names = new Set();
  for (const group of groups) {
    if (group && typeof group.group === "string") names.add(group.group);
  }
  return names;
}

/**
 * Every page reference anywhere under a tab, at any nesting depth.
 *
 * These are docs-relative paths without an extension, e.g. "get-started/base". A page
 * may live outside the tab's own directory -- the Get Started tab currently lists
 * "base-chain/network-information/ecosystem-bridges" -- which is exactly why the gate
 * compares nav references rather than file paths.
 */
export function pageRefsForTab(config, tabName) {
  const tab = findTab(config, tabName);
  const refs = new Set();
  if (!tab) return refs;

  const walk = (pages, depth) => {
    if (!Array.isArray(pages) || depth > 12) return;
    for (const page of pages) {
      if (typeof page === "string") {
        refs.add(page);
      } else if (page && typeof page === "object") {
        walk(page.pages, depth + 1);
      }
    }
  };

  for (const group of Array.isArray(tab.groups) ? tab.groups : []) {
    if (group && typeof group === "object") walk(group.pages, 1);
  }
  return refs;
}

/** Members of `next` that are absent from `prev`. */
export function added(prev, next) {
  return [...next].filter((v) => !prev.has(v));
}

/** Members of `prev` that are absent from `next`. */
export function removed(prev, next) {
  return [...prev].filter((v) => !next.has(v));
}

/** True when the two sets hold different members, ignoring order. */
export function setsDiffer(prev, next) {
  if (prev.size !== next.size) return true;
  for (const v of prev) if (!next.has(v)) return true;
  return false;
}
