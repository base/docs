#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('./lib/docs-utils');

const root = path.resolve(__dirname, '..');
const docs = path.join(root, 'docs');
const config = JSON.parse(fs.readFileSync(path.join(docs, 'docs.json'), 'utf8'));
const errors = [];

// A page reference resolves if <page>.mdx, <page>.md, or <page>/index.mdx exists.
// Mintlify serves an index.mdx at its parent directory URL, so links to the
// directory path (e.g. /base-chain/specs/reference/b20) are valid.
function pageExists(page) {
  return (
    fs.existsSync(path.join(docs, `${page}.mdx`)) ||
    fs.existsSync(path.join(docs, `${page}.md`)) ||
    fs.existsSync(path.join(docs, page, 'index.mdx'))
  );
}

// Collect every page string in the nav so we can check duplicates and orphans.
const navPages = [];

function walkNavigation(value, trail = 'navigation') {
  if (typeof value === 'string') {
    navPages.push(value);
    if (!pageExists(value)) errors.push(`${trail}: missing page ${value}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkNavigation(item, `${trail}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (key === 'pages' || key === 'groups' || key === 'tabs') walkNavigation(child, `${trail}.${key}`);
  }
}

walkNavigation(config.navigation);

// --- Duplicate nav entries ---
const seenNav = new Set();
for (const page of navPages) {
  if (seenNav.has(page)) errors.push(`duplicate nav entry ${page}`);
  seenNav.add(page);
}

// --- Redundant sidebar labels ---
// A page must not carry the same sidebar label as the group that contains it,
// and a group must not be nested inside a group of the same name. Mintlify
// renders those as a collapsible whose only visible child repeats the parent
// ("Flashblocks > Flashblocks"), which reads like a bug. Fix by flattening a
// single-page group into a bare page entry, or by giving the page a distinct
// `sidebarTitle` (usually "Overview").
function pageFile(page) {
  const candidates = [`${page}.mdx`, `${page}.md`, path.join(page, 'index.mdx')];
  for (const candidate of candidates) {
    const full = path.join(docs, candidate);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

function sidebarLabel(page) {
  const file = pageFile(page);
  if (!file) return null;
  const { frontmatter } = parseFrontmatter(fs.readFileSync(file, 'utf8'));
  return frontmatter.sidebarTitle || frontmatter.title || null;
}

const labelKey = (value) => String(value).toLowerCase().replace(/[^a-z0-9]/g, '');

function walkGroupLabels(node, parentGroup) {
  if (Array.isArray(node)) {
    node.forEach((item) => walkGroupLabels(item, parentGroup));
    return;
  }
  if (typeof node === 'string') {
    if (!parentGroup) return;
    const label = sidebarLabel(node);
    if (label && labelKey(label) === labelKey(parentGroup)) {
      errors.push(
        `redundant sidebar label: page ${node} ("${label}") repeats its parent group "${parentGroup}" - flatten the group into a bare page entry or set a distinct sidebarTitle`,
      );
    }
    return;
  }
  if (!node || typeof node !== 'object') return;
  // Tabs and anchors start a fresh sidebar; only groups nest labels.
  const scope = node.tab !== undefined || node.anchor !== undefined ? null : parentGroup;
  if (node.group !== undefined) {
    if (scope && labelKey(node.group) === labelKey(scope)) {
      errors.push(`redundant sidebar label: group "${node.group}" is nested inside a group with the same name`);
    }
    walkGroupLabels(node.pages || [], node.group);
    walkGroupLabels(node.groups || [], node.group);
    return;
  }
  walkGroupLabels(node.tabs || [], null);
  walkGroupLabels(node.anchors || [], null);
  walkGroupLabels(node.groups || [], scope);
  walkGroupLabels(node.pages || [], scope);
}

walkGroupLabels(config.navigation, null);

// --- Orphan detection: every publishable .mdx must be reachable from nav ---
// Exemptions:
//   - snippets are includes, never pages
//   - files listed in docs/.mintignore are not published
//   - footer-linked legal pages (privacy/terms/cookie) live outside the nav tree
//   - generated B20 interface *method* pages are deliberately interface-first
//     (reached from their interface index page), matching upstream convention
const INTERFACE_PREFIXES = [
  'base-chain/specs/reference/b20/interfaces/',
  'specifications/b20/reference/interfaces/',
];
// Landing pages that are intentionally linked from content but omitted from
// the sidebar to avoid a redundant nested "Overview" entry.
const LINKED_HUB_PAGES = new Set([
  'agents/guides/index',
]);
const mintignore = fs.existsSync(path.join(docs, '.mintignore'))
  ? new Set(
      fs
        .readFileSync(path.join(docs, '.mintignore'), 'utf8')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'))
        .map((l) => l.replace(/\.mdx?$/, '')),
    )
  : new Set();

const footerLinks = new Set();
(function collectFooter(node) {
  if (!node) return;
  if (typeof node === 'string') {
    // Accept relative (/privacy-policy) and absolute docs URLs
    // (https://docs.base.org/privacy-policy) alike.
    const m = node.match(/^(?:https?:\/\/docs\.base\.org)?\/([a-zA-Z0-9_./-]+)$/);
    if (m) footerLinks.add(m[1]);
    return;
  }
  if (Array.isArray(node)) return node.forEach(collectFooter);
  if (typeof node === 'object') Object.values(node).forEach(collectFooter);
})(config.footer);

function isExemptFromOrphan(page) {
  if (page.startsWith('snippets/')) return true;
  if (mintignore.has(page)) return true;
  if (footerLinks.has(page)) return true;
  if (LINKED_HUB_PAGES.has(page)) return true;
  // interface method page = under interfaces/<IFace>/<method>, i.e. one level
  // deeper than the interface index pages themselves
  // Generated B20 interface member pages are intentionally linked from their
  // interface landing page rather than repeated in the sidebar.
  for (const prefix of INTERFACE_PREFIXES) {
    if (page.startsWith(prefix) && page.slice(prefix.length).includes('/')) return true;
  }
  return false;
}

function allMdx(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return allMdx(full, base);
    if (!entry.name.endsWith('.mdx')) return [];
    return [path.relative(base, full).replace(/\.mdx$/, '')];
  });
}

const navSet = new Set(navPages);
for (const page of allMdx(docs)) {
  if (navSet.has(page) || isExemptFromOrphan(page)) continue;
  errors.push(`orphan page (not in nav, no redirect exemption): ${page}`);
}

// --- Redirects: duplicate sources, resolvable targets, and avoidable chains ---
const redirects = new Map();
for (const redirect of config.redirects) {
  if (redirects.has(redirect.source)) errors.push(`duplicate redirect source ${redirect.source}`);
  if (redirect.source.includes('#')) errors.push(`redirect source cannot include a URL fragment ${redirect.source}`);
  redirects.set(redirect.source, redirect.destination);
}

for (const [source, destination] of redirects) {
  const target = destination.split('#')[0];
  const dynamicTarget = target.includes(':') || target.includes('*');
  if (!dynamicTarget && redirects.has(target)) errors.push(`redirect chain ${source} -> ${target}`);
  if (target.startsWith('/') && !dynamicTarget && !pageExists(target.replace(/^\//, '').replace(/\/$/, ''))) {
    errors.push(`redirect ${source} has missing target ${target}`);
  }
}

// --- Scoped internal-link check for high-traffic use-case sections ---
const checkedRoots = [
  'build-on-base/accept-payments',
  'build-on-base/issue-stablecoins',
  'build-on-base/issue-rwa',
  'build-on-base/integrate-defi',
  'get-started/accept-payments.mdx',
  'get-started/issue-rwa.mdx',
  'get-started/base.mdx',
];

function filesUnder(relative) {
  const full = path.join(docs, relative);
  if (!fs.existsSync(full)) return [];
  if (fs.statSync(full).isFile()) return [full];
  return fs.readdirSync(full, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(full, entry.name);
    return entry.isDirectory() ? [] : entry.name.endsWith('.mdx') ? [child] : [];
  });
}

for (const file of checkedRoots.flatMap(filesUnder)) {
  const content = fs.readFileSync(file, 'utf8');
  for (const match of content.matchAll(/\]\((\/[a-zA-Z0-9_./:-]+)(?:#[^)]+)?\)|href="(\/[a-zA-Z0-9_./:-]+)(?:#[^"]+)?"/g)) {
    const target = match[1] || match[2];
    if (target.includes(':') || target.startsWith('/snippets/')) continue;
    if (!pageExists(target.slice(1))) errors.push(`${path.relative(root, file)}: broken link ${target}`);
  }
}

// --- Base Std sync route table ---
// Every page the sync can route to must exist on disk AND be listed in the
// docs.json navigation, otherwise a docs move silently turns the sync into a
// no-op (stale paths) or lets it edit pages readers can't reach (orphans).
// A page_glob that expands to nothing is the same bug in disguise.
const routeTablePath = path.join(root, 'scripts/sync-from-base-std/route-table.json');
if (fs.existsSync(routeTablePath)) {
  const routeTable = JSON.parse(fs.readFileSync(routeTablePath, 'utf8'));
  const navSet = new Set(navPages);
  const allDocs = allMdx(docs).map((rel) => `docs/${rel.split(path.sep).join('/')}.mdx`);

  function globToRegExp(glob) {
    const escaped = glob
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*\//g, '(?:.*/)?')
      .replace(/\*/g, '[^/]*');
    return new RegExp(`^${escaped}$`);
  }
  function routeOf(page) {
    return page.replace(/^docs\//, '').replace(/\.mdx?$/, '').replace(/\/index$/, '');
  }
  function checkRoutedPage(page, where) {
    if (!fs.existsSync(path.join(root, page))) {
      errors.push(`route-table ${where}: page does not exist: ${page}`);
      return;
    }
    // Interface member pages are deliberately absent from the sidebar (see
    // isExemptFromOrphan); they count as reachable when their interface
    // landing page is in the nav.
    const route = routeOf(page);
    const parent = route.split('/').slice(0, -1).join('/');
    const reachable = navSet.has(route) || (isExemptFromOrphan(route) && navSet.has(parent));
    if (!reachable) {
      errors.push(`route-table ${where}: page is not reachable from docs.json navigation: ${page}`);
    }
  }

  const ROUTE_KINDS = new Set(['interface', 'product-doc', 'changelog-entry', 'changelog-index']);
  for (const rule of routeTable.code_changes || []) {
    const where = `code_changes[${rule.source_prefix}]`;
    if (!ROUTE_KINDS.has(rule.kind)) {
      errors.push(`route-table ${where}: kind '${rule.kind}' is not one of ${[...ROUTE_KINDS].join(' | ')}`);
    }
    if (rule.source_pattern) {
      try {
        new RegExp(rule.source_pattern);
      } catch (err) {
        errors.push(`route-table ${where}: source_pattern is not a valid regex (${err.message})`);
      }
    }
    if (rule.page_template) {
      if (!rule.source_pattern) {
        errors.push(`route-table ${where}: page_template requires a source_pattern with named groups`);
      } else {
        const groups = new Set([...rule.source_pattern.matchAll(/\(\?<(\w+)>/g)].map((m) => m[1]));
        for (const [, name] of rule.page_template.matchAll(/\{(\w+)\}/g)) {
          if (!groups.has(name)) errors.push(`route-table ${where}: page_template placeholder {${name}} is not a named group of source_pattern`);
        }
        const dir = path.dirname(rule.page_template.replace(/\{(\w+)\}/g, 'x'));
        if (!fs.existsSync(path.join(root, dir.replace(/\/x$/, '')))) {
          errors.push(`route-table ${where}: page_template directory does not exist: ${dir}`);
        }
      }
    }
    for (const page of rule.pages || []) checkRoutedPage(page, where);
    for (const glob of rule.page_globs || []) {
      const matcher = globToRegExp(glob);
      const matches = allDocs.filter((file) => matcher.test(file));
      if (matches.length === 0) errors.push(`route-table ${where}: page_glob matches no files: ${glob}`);
      for (const page of matches) checkRoutedPage(page, `${where} via ${glob}`);
    }
  }
  for (const page of routeTable.manual_update?.allowed_pages || []) {
    checkRoutedPage(page, 'manual_update.allowed_pages');
  }
}

if (errors.length) {
  console.error(`Documentation structure validation failed (${errors.length}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Navigation, orphans, redirects, scoped internal links, and the Base Std route table are valid.');
