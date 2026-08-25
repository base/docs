#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { CONSTANTS, loadMintIgnore } = require('./lib/docs-utils');

function isExternalDestination(value) {
  return (
    typeof value === 'string' &&
    (value.startsWith('//') || /^[A-Za-z][A-Za-z\d+.-]*:/.test(value))
  );
}

function normalizeInternalPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return null;

  const clean = value.split(/[?#]/, 1)[0].replace(/\/+$/, '');
  return clean || '/';
}

function matchesRoutePattern(value, routes) {
  const internal = normalizeInternalPath(value);
  if (!internal) return false;

  const match = internal.match(/^(.*)\/:([A-Za-z][A-Za-z\d_]*)\*$/);
  if (!match) return false;

  const prefix = match[1] || '/';
  return routes.has(prefix) || [...routes].some((route) => route.startsWith(`${prefix}/`));
}

function isMintIgnored(docsDir, fullPath, ignored) {
  const relative = path.relative(docsDir, fullPath).split(path.sep).join('/');
  const withoutExtension = relative.replace(/\.mdx?$/, '');
  const basenameWithoutExtension = path.posix.basename(withoutExtension);

  if (ignored.files.has(relative) || ignored.files.has(withoutExtension)) return true;
  if (ignored.bareFiles.has(withoutExtension) || ignored.bareFiles.has(basenameWithoutExtension)) {
    return true;
  }

  for (const ignoredDir of ignored.dirs) {
    if (relative === ignoredDir || relative.startsWith(`${ignoredDir}/`)) return true;
  }

  return false;
}

function collectRoutes(docsDir) {
  const routes = new Set(['/']);
  const ignored = loadMintIgnore(path.join(docsDir, '.mintignore'));

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      if (CONSTANTS.skipFiles.includes(entry.name)) continue;
      if (entry.isDirectory() && CONSTANTS.skipDirs.includes(entry.name)) continue;

      const fullPath = path.join(dir, entry.name);

      if (isMintIgnored(docsDir, fullPath, ignored)) continue;

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (!entry.isFile() || !CONSTANTS.extensions.includes(extension)) continue;

      let route = path
        .relative(docsDir, fullPath)
        .split(path.sep)
        .join('/')
        .replace(/\.mdx?$/, '');

      if (route === 'index') route = '';
      if (route.endsWith('/index')) route = route.slice(0, -'/index'.length);

      routes.add(`/${route}`.replace(/\/+$/, '') || '/');
    }
  }

  walk(docsDir);
  return routes;
}

function auditRedirects(config, routes) {
  const redirects = Array.isArray(config.redirects) ? config.redirects : [];
  const redirectMap = new Map();

  for (const redirect of redirects) {
    const source = normalizeInternalPath(redirect.source);
    if (source && typeof redirect.destination === 'string') {
      redirectMap.set(source, redirect.destination);
    }
  }

  function resolve(destination) {
    let current = destination;
    const visited = new Set();

    while (true) {
      if (isExternalDestination(current)) {
        return { ok: true, terminal: current, reason: 'external' };
      }

      const internal = normalizeInternalPath(current);
      if (!internal) return { ok: false, terminal: current, reason: 'invalid' };
      if (routes.has(internal)) return { ok: true, terminal: internal, reason: 'page' };
      if (matchesRoutePattern(internal, routes)) {
        return { ok: true, terminal: internal, reason: 'pattern' };
      }
      if (visited.has(internal)) return { ok: false, terminal: internal, reason: 'cycle' };

      visited.add(internal);
      const next = redirectMap.get(internal);
      if (!next) return { ok: false, terminal: internal, reason: 'missing' };
      current = next;
    }
  }

  const brokenByDestination = new Map();

  for (const redirect of redirects) {
    if (typeof redirect.destination !== 'string') continue;
    if (isExternalDestination(redirect.destination)) continue;

    const destination = normalizeInternalPath(redirect.destination) || redirect.destination;
    const result = resolve(redirect.destination);
    if (result.ok) continue;

    const existing = brokenByDestination.get(destination) || {
      destination,
      terminal: result.terminal,
      reason: result.reason,
      count: 0,
      sources: [],
    };

    existing.count += 1;
    if (typeof redirect.source === 'string') existing.sources.push(redirect.source);
    brokenByDestination.set(destination, existing);
  }

  return [...brokenByDestination.values()].sort(
    (a, b) => b.count - a.count || a.destination.localeCompare(b.destination),
  );
}

function printReport(broken) {
  if (broken.length === 0) {
    console.log('All internal redirect destinations resolve to an existing docs page.');
    return;
  }

  const totalEntries = broken.reduce((sum, item) => sum + item.count, 0);
  console.log(
    `Found ${broken.length} broken internal redirect destinations across ${totalEntries} redirect entries.`,
  );
  console.log('');
  console.log('Count\tDestination\tTerminal\tReason');

  for (const item of broken) {
    console.log(`${item.count}\t${item.destination}\t${item.terminal}\t${item.reason}`);
  }
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const docsDir = path.join(repoRoot, 'docs');
  const configPath = path.join(docsDir, 'docs.json');
  const strict = process.argv.includes('--strict');

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const routes = collectRoutes(docsDir);
  const broken = auditRedirects(config, routes);

  printReport(broken);

  if (strict && broken.length > 0) process.exitCode = 1;
}

if (require.main === module) main();

module.exports = {
  auditRedirects,
  collectRoutes,
  isExternalDestination,
  matchesRoutePattern,
  normalizeInternalPath,
};
