import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  assertSafeBranch,
  assertSafePath,
  buildCommitInput,
  buildFileChanges,
  createSignedCommit,
  parseRawDiff,
  resetBranch,
  SignedCommitError,
} from "../lib/signed-commit.mjs";

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);
const rec = (oldMode, newMode, status, p) =>
  `:${oldMode} ${newMode} ${SHA_A} ${SHA_B} ${status}\0${p}\0`;

test("assertSafePath accepts docs pages and docs.json", () => {
  for (const p of [
    "docs/specifications/b20/introduction.mdx",
    "docs/llms.txt",
    "docs/a/b.md",
    "docs/docs.json",
  ]) {
    assert.equal(assertSafePath(p), p);
  }
});

test("assertSafePath rejects anything outside the allowlist", () => {
  for (const p of [
    ".github/workflows/base-std-docs-sync.yml",
    "scripts/lib/signed-commit.mjs",
    "/docs/a.mdx",
    "docs/../scripts/x.md",
    "docs/a.mdx\nscripts/x.md",
    "docs/snippets/AssetDemo.jsx",
    "docs/other.json",
    "docs/a b.mdx",
  ]) {
    assert.throws(() => assertSafePath(p), SignedCommitError, p);
  }
});

test("assertSafeBranch only accepts docs/sync-* branches", () => {
  assert.equal(assertSafeBranch("docs/sync-code-change-3820cf0"), "docs/sync-code-change-3820cf0");
  for (const b of ["master", "docs/sync-../master", "refs/heads/docs/sync-x", "docs/sync-a b", undefined]) {
    assert.throws(() => assertSafeBranch(b), SignedCommitError, String(b));
  }
});

test("parseRawDiff splits additions, modifications, and deletions", () => {
  const raw =
    rec("000000", "100644", "A", "docs/new.mdx") +
    rec("100644", "100644", "M", "docs/docs.json") +
    rec("100644", "000000", "D", "docs/old.md");
  assert.deepEqual(parseRawDiff(raw), {
    additions: ["docs/new.mdx", "docs/docs.json"],
    deletions: ["docs/old.md"],
  });
  assert.deepEqual(parseRawDiff(""), { additions: [], deletions: [] });
});

test("parseRawDiff rejects non-regular modes and unsupported statuses", () => {
  const bad = [
    rec("000000", "120000", "A", "docs/link.mdx"), // symlink
    rec("000000", "100755", "A", "docs/exec.mdx"), // executable
    rec("100755", "100644", "M", "docs/mode.mdx"), // mode change
    rec("100644", "100644", "T", "docs/type.mdx"), // type change
    rec("000000", "160000", "A", "docs/sub.mdx"), // submodule
    rec("000000", "100644", "A", "scripts/evil.md"), // outside allowlist
    "garbage\0docs/a.mdx\0",
  ];
  for (const raw of bad) {
    assert.throws(() => parseRawDiff(raw), SignedCommitError, JSON.stringify(raw));
  }
});

test("buildFileChanges base64-encodes staged content and enforces the size cap", () => {
  const contents = { "docs/a.mdx": Buffer.from("hello"), "docs/b.mdx": Buffer.from("world!") };
  const changes = { additions: ["docs/a.mdx", "docs/b.mdx"], deletions: ["docs/c.md"] };
  assert.deepEqual(buildFileChanges(changes, (p) => contents[p]), {
    additions: [
      { path: "docs/a.mdx", contents: Buffer.from("hello").toString("base64") },
      { path: "docs/b.mdx", contents: Buffer.from("world!").toString("base64") },
    ],
    deletions: [{ path: "docs/c.md" }],
  });
  assert.throws(() => buildFileChanges(changes, (p) => contents[p], 10), SignedCommitError);
});

test("buildCommitInput pins expectedHeadOid to the base sha", () => {
  const input = buildCommitInput({
    repo: "base/docs",
    branch: "docs/sync-x",
    baseSha: SHA_A,
    message: "docs: sync",
    fileChanges: { additions: [], deletions: [] },
  });
  assert.deepEqual(input, {
    branch: { repositoryNameWithOwner: "base/docs", branchName: "docs/sync-x" },
    expectedHeadOid: SHA_A,
    message: { headline: "docs: sync" },
    fileChanges: { additions: [], deletions: [] },
  });
});

test("resetBranch force-updates an existing ref", async () => {
  const calls = [];
  const request = async (method, url, _t, body) => {
    calls.push({ method, url, body });
    return { status: 200, json: {} };
  };
  const out = await resetBranch({ apiUrl: "https://api", repo: "base/docs", branch: "docs/sync-x", baseSha: SHA_A, token: "t", request });
  assert.equal(out, "reset");
  assert.deepEqual(calls, [
    { method: "PATCH", url: "https://api/repos/base/docs/git/refs/heads/docs/sync-x", body: { sha: SHA_A, force: true } },
  ]);
});

test("resetBranch creates the ref when it does not exist", async () => {
  const calls = [];
  const request = async (method, url, _t, body) => {
    calls.push({ method, url, body });
    return method === "PATCH" ? { status: 422, json: { message: "Reference does not exist" } } : { status: 201, json: {} };
  };
  const out = await resetBranch({ apiUrl: "https://api", repo: "base/docs", branch: "docs/sync-x", baseSha: SHA_A, token: "t", request });
  assert.equal(out, "created");
  assert.deepEqual(calls[1], {
    method: "POST",
    url: "https://api/repos/base/docs/git/refs",
    body: { ref: "refs/heads/docs/sync-x", sha: SHA_A },
  });
});

test("resetBranch fails closed on other errors", async () => {
  const request = async () => ({ status: 403, json: { message: "forbidden" } });
  await assert.rejects(
    resetBranch({ apiUrl: "https://api", repo: "base/docs", branch: "docs/sync-x", baseSha: SHA_A, token: "t", request }),
    SignedCommitError,
  );
});

test("createSignedCommit returns the commit and surfaces GraphQL errors", async () => {
  const ok = async (_m, _u, _t, body) => {
    assert.match(body.query, /createCommitOnBranch/);
    return { status: 200, json: { data: { createCommitOnBranch: { commit: { oid: SHA_B, url: "u" } } } } };
  };
  assert.deepEqual(await createSignedCommit({ graphqlUrl: "g", token: "t", input: {}, request: ok }), { oid: SHA_B, url: "u" });

  const err = async () => ({ status: 200, json: { errors: [{ message: "Expected branch to point to x" }] } });
  await assert.rejects(createSignedCommit({ graphqlUrl: "g", token: "t", input: {}, request: err }), /Expected branch/);
});

test("parseRawDiff reads a real staged index", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "signed-commit-"));
  const git = (...args) => execFileSync("git", args, { cwd: dir, encoding: "utf8" });
  git("init", "-q");
  git("config", "user.email", "t@example.com");
  git("config", "user.name", "t");
  git("config", "commit.gpgsign", "false");
  fs.mkdirSync(path.join(dir, "docs"));
  fs.writeFileSync(path.join(dir, "docs/keep.mdx"), "v1");
  fs.writeFileSync(path.join(dir, "docs/gone.md"), "bye");
  git("add", ".");
  git("commit", "-qm", "init");

  fs.writeFileSync(path.join(dir, "docs/keep.mdx"), "v2");
  fs.writeFileSync(path.join(dir, "docs/new.mdx"), "new");
  fs.rmSync(path.join(dir, "docs/gone.md"));
  git("add", "--", "docs/keep.mdx", "docs/new.mdx", "docs/gone.md");

  const raw = git("diff", "--cached", "--raw", "--no-renames", "--no-abbrev", "-z");
  const changes = parseRawDiff(raw);
  assert.deepEqual(changes.additions.sort(), ["docs/keep.mdx", "docs/new.mdx"]);
  assert.deepEqual(changes.deletions, ["docs/gone.md"]);

  const fc = buildFileChanges(changes, (p) => execFileSync("git", ["show", `:${p}`], { cwd: dir }));
  const keep = fc.additions.find((a) => a.path === "docs/keep.mdx");
  assert.equal(Buffer.from(keep.contents, "base64").toString(), "v2");
  fs.rmSync(dir, { recursive: true, force: true });
});

