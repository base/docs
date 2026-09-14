const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { loadMintIgnore } = require('./docs-utils');

test('loadMintIgnore parses directory patterns with and without leading slash', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mintignore-'));
  const mintignore = path.join(dir, '.mintignore');

  try {
    fs.writeFileSync(mintignore, ['/foo/*', 'bar/*', 'draft-notes/*'].join('\n'));

    const ignored = loadMintIgnore(mintignore);

    assert.deepEqual([...ignored.dirs].sort(), ['bar', 'draft-notes', 'foo']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
