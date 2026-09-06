import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadMintIgnore } = require("../lib/docs-utils.js");

function writeMintignore(contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mintignore-"));
  const file = path.join(dir, ".mintignore");
  fs.writeFileSync(file, contents);
  return file;
}

test("loadMintIgnore keeps directory names for leading-slash globs", () => {
  const file = writeMintignore("/draft-notes/*\n");
  const ignored = loadMintIgnore(file);
  assert.deepEqual([...ignored.dirs], ["draft-notes"]);
});

test("loadMintIgnore keeps directory names for slashless globs", () => {
  const file = writeMintignore("draft-notes/*\n");
  const ignored = loadMintIgnore(file);
  assert.deepEqual([...ignored.dirs], ["draft-notes"]);
});

test("loadMintIgnore still supports nested directory globs with or without slash", () => {
  const file = writeMintignore("/apps/legacy/*\napps/draft/*\n");
  const ignored = loadMintIgnore(file);
  assert.deepEqual([...ignored.dirs].sort(), ["apps/draft", "apps/legacy"]);
});

test("loadMintIgnore ignores empty /* patterns", () => {
  const file = writeMintignore("/*\n");
  const ignored = loadMintIgnore(file);
  assert.deepEqual([...ignored.dirs], []);
});
