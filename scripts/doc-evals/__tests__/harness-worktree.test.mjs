/**
 * Offline tests for replay/worktree.mjs's lifecycle guarantees, against a
 * throwaway temp git repo created for this test file only (no network, and
 * never the main checkout or another lane's worktree — see worktree.mjs's
 * own doc comment on why cleanup is routed only through `git worktree`
 * commands against a `repoRoot` the test controls).
 *
 * The thing worth testing here isn't "does `git worktree add/remove` work"
 * (that's git's job) — it's the *lifecycle contract* replay/run.mjs relies
 * on: `removeWorktree()` must run and leave no trace even when the caller's
 * own work between create and remove throws (a validator crash, a JSON
 * parse error, a timeout folded into a resolved value that then fails to
 * write files, etc.) — because replayCase() puts it in a `finally`.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { createWorktree, overlayCandidate, removeWorktree } from "../replay/worktree.mjs";

const execFileAsync = promisify(execFile);

async function git(args, cwd) {
  return execFileAsync("git", args, { cwd });
}

/** A fresh, tiny local git repo with one commit — isolated from the real repo. */
async function makeTempRepo() {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "doc-evals-worktree-test-repo-"));
  await git(["init", "-q", "-b", "main"], repoRoot);
  await git(["config", "user.email", "test@example.com"], repoRoot);
  await git(["config", "user.name", "Test"], repoRoot);
  await fs.writeFile(path.join(repoRoot, "docs-content.txt"), "historical content\n", "utf8");
  await git(["add", "."], repoRoot);
  await git(["commit", "-q", "-m", "initial"], repoRoot);
  const { stdout } = await git(["rev-parse", "HEAD"], repoRoot);
  return { repoRoot, commit: stdout.trim() };
}

async function listWorktrees(repoRoot) {
  const { stdout } = await git(["worktree", "list", "--porcelain"], repoRoot);
  return stdout
    .split("\n\n")
    .filter((block) => block.trim())
    .map((block) => block.match(/^worktree (.+)$/m)?.[1]);
}

async function exists(p) {
  return fs
    .stat(p)
    .then(() => true)
    .catch(() => false);
}

/**
 * `git worktree add` records the *resolved* path (e.g. macOS's /tmp is a
 * symlink to /private/tmp), while `fs.mkdtemp(os.tmpdir())` returns the
 * unresolved one — realpath both sides before comparing so this isn't a
 * false negative on a system where the two differ.
 */
async function worktreeIsListed(repoRoot, worktreeDir) {
  const resolved = await fs.realpath(worktreeDir).catch(() => worktreeDir);
  const listed = await Promise.all((await listWorktrees(repoRoot)).map((p) => fs.realpath(p).catch(() => p)));
  return listed.includes(resolved);
}

test("createWorktree checks out the base commit detached into a fresh tmpdir, and removeWorktree cleans it up", async () => {
  const { repoRoot, commit } = await makeTempRepo();
  try {
    const worktreeDir = await createWorktree(repoRoot, commit);
    assert.ok(worktreeDir.startsWith(os.tmpdir()) || worktreeDir.includes(os.tmpdir()), "worktree must live under os.tmpdir()");
    assert.equal(await fs.readFile(path.join(worktreeDir, "docs-content.txt"), "utf8"), "historical content\n");
    assert.ok(await worktreeIsListed(repoRoot, worktreeDir), "git worktree list must show the new worktree");

    await removeWorktree(repoRoot, worktreeDir);

    assert.equal(await exists(worktreeDir), false, "worktree directory must be gone after removeWorktree");
    assert.ok(!(await worktreeIsListed(repoRoot, worktreeDir)), "git worktree list must not show it after removal");
  } finally {
    await fs.rm(repoRoot, { recursive: true, force: true });
  }
});

test("removeWorktree still runs and leaves no trace when the caller's own work throws between create and remove (mirrors replayCase's try/finally)", async () => {
  const { repoRoot, commit } = await makeTempRepo();
  try {
    const worktreeDir = await createWorktree(repoRoot, commit);
    let caught = null;
    try {
      try {
        // Stand-in for anything that can go wrong inside replayCase() after
        // the worktree exists — a rejected sync, a write failure, a timeout
        // path — none of which should ever skip cleanup.
        throw new Error("simulated failure/timeout between create and remove");
      } finally {
        await removeWorktree(repoRoot, worktreeDir);
      }
    } catch (err) {
      caught = err;
    }

    assert.ok(caught, "the original error must still propagate — cleanup must not swallow it");
    assert.match(caught.message, /simulated failure\/timeout/);
    assert.equal(await exists(worktreeDir), false, "worktree directory must still be removed on the failure path");
    assert.ok(!(await worktreeIsListed(repoRoot, worktreeDir)), "git worktree list must be clean after a failure");
  } finally {
    await fs.rm(repoRoot, { recursive: true, force: true });
  }
});

test("removeWorktree tolerates the worktree directory already being gone (falls back to prune)", async () => {
  const { repoRoot, commit } = await makeTempRepo();
  try {
    const worktreeDir = await createWorktree(repoRoot, commit);
    // Simulate something outside our control having already deleted the
    // directory on disk (e.g. a killed sandbox) — git's own metadata under
    // .git/worktrees/ is now stale, which is exactly the case removeWorktree's
    // catch branch + `git worktree prune` exists to handle.
    await fs.rm(worktreeDir, { recursive: true, force: true });

    await assert.doesNotReject(removeWorktree(repoRoot, worktreeDir));
    assert.ok(!(await worktreeIsListed(repoRoot, worktreeDir)), "prune must drop the stale metadata");
  } finally {
    await fs.rm(repoRoot, { recursive: true, force: true });
  }
});

test("overlayCandidate copies the candidate sync dir in and symlinks its node_modules", async () => {
  const { repoRoot, commit } = await makeTempRepo();
  const candidateRoot = await fs.mkdtemp(path.join(os.tmpdir(), "doc-evals-worktree-test-candidate-"));
  try {
    const candidateSyncDir = path.join(candidateRoot, "scripts", "sync-from-base-std");
    await fs.mkdir(candidateSyncDir, { recursive: true });
    await fs.writeFile(path.join(candidateSyncDir, "index.mjs"), "// candidate marker\n", "utf8");
    const candidateNodeModules = path.join(candidateRoot, "scripts", "node_modules");
    await fs.mkdir(path.join(candidateNodeModules, "some-pkg"), { recursive: true });

    const worktreeDir = await createWorktree(repoRoot, commit);
    try {
      await overlayCandidate(worktreeDir, candidateSyncDir);

      const copied = path.join(worktreeDir, "scripts", "sync-from-base-std", "index.mjs");
      assert.equal(await fs.readFile(copied, "utf8"), "// candidate marker\n");

      const linkedNodeModules = path.join(worktreeDir, "scripts", "node_modules");
      const stat = await fs.lstat(linkedNodeModules);
      assert.ok(stat.isSymbolicLink(), "scripts/node_modules must be a symlink, not a copy");
      assert.equal(await fs.realpath(linkedNodeModules), await fs.realpath(candidateNodeModules));
    } finally {
      await removeWorktree(repoRoot, worktreeDir);
    }
  } finally {
    await fs.rm(repoRoot, { recursive: true, force: true });
    await fs.rm(candidateRoot, { recursive: true, force: true });
  }
});
