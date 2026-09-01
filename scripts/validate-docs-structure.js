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

if (errors.length) {
  console.error(`Documentation structure validation failed (${errors.length}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Navigation, orphans, redirects, and scoped internal links are valid.');
