const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  auditRedirects,
  collectRoutes,
  isExternalDestination,
  matchesRoutePattern,
  normalizeInternalPath,
} = require('./audit-redirects');

test('normalizes internal paths without query, hash, or trailing slash', () => {
  assert.equal(normalizeInternalPath('/apps/quickstart/?foo=1#bar'), '/apps/quickstart');
  assert.equal(normalizeInternalPath('/'), '/');
  assert.equal(normalizeInternalPath('https://example.com/docs'), null);
  assert.equal(normalizeInternalPath('//example.com/docs'), null);
});

test('recognizes only explicit external destination forms', () => {
  assert.equal(isExternalDestination('https://example.com/docs'), true);
  assert.equal(isExternalDestination('mailto:docs@example.com'), true);
  assert.equal(isExternalDestination('//example.com/docs'), true);
  assert.equal(isExternalDestination('apps/quickstart'), false);
});

test('matches trailing Mintlify wildcard destinations against the published route subtree', () => {
  const routes = new Set([
    '/base-chain/specs/reference/b20',
    '/base-chain/specs/reference/b20/changelog',
    '/base-chain/specs/reference/b20/errors-and-events',
  ]);

  assert.equal(matchesRoutePattern('/base-chain/specs/reference/b20/:slug*', routes), true);
  assert.equal(matchesRoutePattern('/base-chain/specs/reference/missing/:slug*', routes), false);
  assert.equal(matchesRoutePattern('/base-chain/specs/reference/b20/:slug', routes), false);
  assert.equal(matchesRoutePattern('/only-prefix/:slug*', new Set(['/only-prefix'])), false);
});

test('collects published md and mdx routes, including hidden pages, and collapses index files', (t) => {
  const docsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-redirects-'));
  t.after(() => fs.rmSync(docsDir, { recursive: true, force: true }));

  fs.writeFileSync(path.join(docsDir, '.mintignore'), 'ignored.mdx\n/apps/private.mdx\n/drafts/*\n');
  fs.writeFileSync(path.join(docsDir, 'index.mdx'), '# Home\n');
  fs.writeFileSync(path.join(docsDir, 'guide.md'), '# Guide\n');
  fs.writeFileSync(path.join(docsDir, 'README.md'), '# Repository docs\n');
  fs.writeFileSync(path.join(docsDir, 'AGENTS.md'), '# Agent instructions\n');
  fs.writeFileSync(path.join(docsDir, 'ignored.mdx'), '# Ignored\n');
  fs.mkdirSync(path.join(docsDir, 'apps'), { recursive: true });
  fs.writeFileSync(path.join(docsDir, 'apps', 'index.md'), '# Apps\n');
  fs.writeFileSync(path.join(docsDir, 'apps', 'quickstart.mdx'), '# Quickstart\n');
  fs.writeFileSync(path.join(docsDir, 'apps', 'hidden.mdx'), '---\nhidden: true\n---\n# Hidden\n');
  fs.writeFileSync(path.join(docsDir, 'apps', 'private.mdx'), '# Private\n');
  fs.mkdirSync(path.join(docsDir, 'drafts'), { recursive: true });
  fs.writeFileSync(path.join(docsDir, 'drafts', 'wip.mdx'), '# WIP\n');
  fs.mkdirSync(path.join(docsDir, 'snippets'), { recursive: true });
  fs.writeFileSync(path.join(docsDir, 'snippets', 'shared.mdx'), '# Shared snippet\n');
  fs.mkdirSync(path.join(docsDir, '.internal'), { recursive: true });
  fs.writeFileSync(path.join(docsDir, '.internal', 'notes.mdx'), '# Internal\n');
  fs.writeFileSync(path.join(docsDir, 'ignored.txt'), 'Ignored\n');

  assert.deepEqual(
    [...collectRoutes(docsDir)].sort(),
    ['/', '/apps', '/apps/hidden', '/apps/quickstart', '/guide'],
  );
});

test('accepts destinations that resolve directly to a docs page', () => {
  const config = {
    redirects: [{ source: '/old', destination: '/new' }],
  };

  assert.deepEqual(auditRedirects(config, new Set(['/new'])), []);
});

test('accepts wildcard redirect destinations that target an existing docs subtree', () => {
  const config = {
    redirects: [
      {
        source: '/legacy/:slug*',
        destination: '/base-chain/specs/reference/b20/:slug*',
      },
    ],
  };

  assert.deepEqual(
    auditRedirects(
      config,
      new Set([
        '/base-chain/specs/reference/b20',
        '/base-chain/specs/reference/b20/errors-and-events',
      ]),
    ),
    [],
  );
});

test('reports wildcard redirect destinations when only the target prefix page exists', () => {
  const config = {
    redirects: [
      {
        source: '/legacy/:slug*',
        destination: '/target/:slug*',
      },
    ],
  };

  assert.deepEqual(auditRedirects(config, new Set(['/target'])), [
    {
      destination: '/target/:slug*',
      terminal: '/target/:slug*',
      reason: 'missing',
      count: 1,
      sources: ['/legacy/:slug*'],
    },
  ]);
});

test('reports wildcard redirect destinations whose target subtree does not exist', () => {
  const config = {
    redirects: [
      {
        source: '/legacy/:slug*',
        destination: '/base-chain/specs/reference/missing/:slug*',
      },
    ],
  };

  assert.deepEqual(auditRedirects(config, new Set(['/base-chain/specs/reference/b20'])), [
    {
      destination: '/base-chain/specs/reference/missing/:slug*',
      terminal: '/base-chain/specs/reference/missing/:slug*',
      reason: 'missing',
      count: 1,
      sources: ['/legacy/:slug*'],
    },
  ]);
});

test('follows redirect chains that terminate at a docs page', () => {
  const config = {
    redirects: [
      { source: '/old', destination: '/middle' },
      { source: '/middle', destination: '/new' },
    ],
  };

  assert.deepEqual(auditRedirects(config, new Set(['/new'])), []);
});

test('reports a missing terminal destination with usage count', () => {
  const config = {
    redirects: [
      { source: '/a', destination: '/legacy' },
      { source: '/b', destination: '/legacy' },
      { source: '/legacy', destination: '/missing' },
    ],
  };

  assert.deepEqual(auditRedirects(config, new Set(['/existing'])), [
    {
      destination: '/legacy',
      terminal: '/missing',
      reason: 'missing',
      count: 2,
      sources: ['/a', '/b'],
    },
    {
      destination: '/missing',
      terminal: '/missing',
      reason: 'missing',
      count: 1,
      sources: ['/legacy'],
    },
  ]);
});

test('reports malformed relative destinations instead of treating them as external', () => {
  const config = {
    redirects: [{ source: '/old', destination: 'apps/quickstart' }],
  };

  assert.deepEqual(auditRedirects(config, new Set(['/apps/quickstart'])), [
    {
      destination: 'apps/quickstart',
      terminal: 'apps/quickstart',
      reason: 'invalid',
      count: 1,
      sources: ['/old'],
    },
  ]);
});

test('reports redirect cycles instead of looping forever', () => {
  const config = {
    redirects: [
      { source: '/a', destination: '/b' },
      { source: '/b', destination: '/a' },
    ],
  };

  const broken = auditRedirects(config, new Set(['/real-page']));

  assert.equal(broken.length, 2);
  assert.equal(broken[0].reason, 'cycle');
  assert.equal(broken[1].reason, 'cycle');
});

test('ignores redirects whose destination is external', () => {
  const config = {
    redirects: [
      { source: '/https-external', destination: 'https://example.com/new' },
      { source: '/protocol-relative', destination: '//example.com/new' },
    ],
  };

  assert.deepEqual(auditRedirects(config, new Set(['/existing'])), []);
});
