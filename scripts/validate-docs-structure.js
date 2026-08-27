#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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

// --- Orphan detection: every publishable .mdx must be reachable from nav ---
// Exemptions:
//   - snippets are includes, never pages
//   - files listed in docs/.mintignore are not published
//   - footer-linked legal pages (privacy/terms/cookie) live outside the nav tree
//   - generated B20 interface *method* pages are deliberately interface-first
//     (reached from their interface index page), matching upstream convention
const INTERFACE_PREFIX = 'base-chain/specs/reference/b20/interfaces/';
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
  if (page.startsWith(INTERFACE_PREFIX) && page.slice(INTERFACE_PREFIX.length).includes('/')) return true;
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
