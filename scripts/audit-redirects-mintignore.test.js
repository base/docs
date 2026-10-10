const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { collectRoutes } = require('./audit-redirects');

test('excludes an entire nested .mintignore directory subtree from redirect routes', (t) => {
  const docsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-redirects-mintignore-'));
  t.after(() => fs.rmSync(docsDir, { recursive: true, force: true }));

  fs.writeFileSync(path.join(docsDir, '.mintignore'), '/drafts/private/*\n');
  fs.writeFileSync(path.join(docsDir, 'index.mdx'), '# Home\n');

  fs.mkdirSync(path.join(docsDir, 'drafts', 'private', 'nested'), { recursive: true });
  fs.writeFileSync(path.join(docsDir, 'drafts', 'private', 'page.mdx'), '# Private\n');
  fs.writeFileSync(path.join(docsDir, 'drafts', 'private', 'nested', 'page.mdx'), '# Nested private\n');

  fs.mkdirSync(path.join(docsDir, 'drafts', 'public'), { recursive: true });
  fs.writeFileSync(path.join(docsDir, 'drafts', 'public', 'page.mdx'), '# Public\n');

  assert.deepEqual(
    [...collectRoutes(docsDir)].sort(),
    ['/', '/drafts/public/page'],
  );
});
