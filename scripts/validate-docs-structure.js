#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const docs = path.join(root, 'docs');
const config = JSON.parse(fs.readFileSync(path.join(docs, 'docs.json'), 'utf8'));
const errors = [];

function pageExists(page) {
  return fs.existsSync(path.join(docs, `${page}.mdx`)) || fs.existsSync(path.join(docs, `${page}.md`));
}

function walkNavigation(value, trail = 'navigation') {
  if (typeof value === 'string') {
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

const redirects = new Map();
for (const redirect of config.redirects) {
  if (redirects.has(redirect.source)) errors.push(`duplicate redirect source ${redirect.source}`);
  redirects.set(redirect.source, redirect.destination);
}

for (const [source, destination] of redirects) {
  const paymentMigration = source.includes('accept-payments') || source.includes('agentic-payments') ||
    source.includes('accept-b20') || destination.includes('/accept-payments/');
  if (!paymentMigration) continue;
  const target = destination.split('#')[0];
  if (redirects.has(target)) errors.push(`payment redirect chain ${source} -> ${target}`);
  if (target.startsWith('/') && !target.includes(':') && !pageExists(target.slice(1))) {
    errors.push(`payment redirect ${source} has missing target ${target}`);
  }
}

const checkedRoots = [
  'build-on-base/accept-payments',
  'build-on-base/issue-stablecoins',
  'build-on-base/tokenize-stocks',
  'build-on-base/integrate-defi',
  'get-started/accept-payments.mdx',
  'get-started/launch-b20-token.mdx',
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

console.log('Navigation, payment redirects, and scoped internal links are valid.');
