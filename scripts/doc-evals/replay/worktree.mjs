/**
 * Throwaway git worktree lifecycle for one replay rep. Every function here
 * is careful to only ever touch a path under `os.tmpdir()`; nothing writes
 * into the main checkout or another lane's worktree, and the caller is
 * responsible for always reaching `removeWorktree()` (a `finally` block —
 * see replay/run.mjs), including on a thrown error or a timeout.
 */

import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * @param {string} repoRoot any checkout that shares the target repo's git
 *        object store (a linked worktree works — `git worktree` commands
 *        operate on the whole repository, not just the invoking checkout).
 * @param {string} baseCommit commit-ish to check out, detached.
 * @returns {Promise<string>} absolute path to the new worktree.
 */
export async function createWorktree(repoRoot, baseCommit) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "doc-evals-replay-"));
  // mkdtemp already created `dir`; `git worktree add` refuses to reuse an
  // existing non-empty directory but is fine with an existing *empty* one.
  await execFileAsync("git", ["worktree", "add", "--detach", dir, baseCommit], { cwd: repoRoot });
  return dir;
}

/**
 * Copy the candidate `scripts/sync-from-base-std/` directory over the
 * worktree's historical copy (so the *docs content* stays at
 * `docs_base_commit` but the *sync code + prompts* are the candidate under
 * test), and symlink the candidate's installed `scripts/node_modules` in
 * rather than reinstalling per rep.
 *
 * @param {string} worktreeDir
 * @param {string} candidateSyncDir absolute path to a `scripts/sync-from-base-std` directory
 */
export async function overlayCandidate(worktreeDir, candidateSyncDir) {
  const destSyncDir = path.join(worktreeDir, "scripts", "sync-from-base-std");
  await fs.mkdir(path.dirname(destSyncDir), { recursive: true });
  await fs.rm(destSyncDir, { recursive: true, force: true });
  await fs.cp(candidateSyncDir, destSyncDir, { recursive: true });

  const candidateNodeModules = path.resolve(candidateSyncDir, "..", "node_modules");
  const destNodeModules = path.join(worktreeDir, "scripts", "node_modules");
  if (
    await fs
      .stat(candidateNodeModules)
      .then(() => true)
      .catch(() => false)
  ) {
    await fs.symlink(candidateNodeModules, destNodeModules, "dir");
  }
}

/**
 * Remove a worktree created by createWorktree(). Always safe to call —
 * swallows errors so a cleanup failure never masks the run's real result,
 * but still surfaces a warning. Intentionally takes no fallback `rm -rf`
 * path outside of `git worktree remove`'s own target: the whole point of
 * routing every cleanup through git is that it can never be pointed at the
 * main checkout or another worktree by a bug elsewhere in the caller.
 *
 * @param {string} repoRoot same repo root passed to createWorktree().
 * @param {string} worktreeDir
 */
export async function removeWorktree(repoRoot, worktreeDir) {
  try {
    await execFileAsync("git", ["worktree", "remove", "--force", worktreeDir], { cwd: repoRoot });
  } catch (err) {
    console.warn(`[worktree] git worktree remove --force ${worktreeDir} failed: ${err.message}`);
    // Directory may already be gone (e.g. removed manually) or `git worktree
    // remove` may refuse a dir it no longer recognizes; either way, prune
    // stale metadata below and best-effort delete what's left on disk.
    await fs.rm(worktreeDir, { recursive: true, force: true }).catch(() => {});
  }
  try {
    await execFileAsync("git", ["worktree", "prune"], { cwd: repoRoot });
  } catch (err) {
    console.warn(`[worktree] git worktree prune failed: ${err.message}`);
  }
}
