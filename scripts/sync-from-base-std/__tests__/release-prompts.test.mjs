/**
 * Unit tests for the release prompt builders.
 *
 * Run with Node's built-in test runner (prompts.mjs is dependency-free):
 *   node --test scripts/sync-from-base/__tests__/release-prompts.test.mjs
 *
 * These assert the builder contracts the rest of the system relies on:
 *   - untrusted inputs (release notes, candidate metadata) are wrapped in the
 *     tagged data blocks the system prompt treats as non-instructions;
 *   - the per-page prompt carries the manifest + changed-files context that
 *     drives grounded edits, and surfaces the diff-truncation caveat;
 *   - the selection prompt instructs a strict JSON-array output and lists the
 *     candidate paths it must choose from.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { releasePrompt, releaseSelectionPrompt, SECURITY_SYSTEM_PROMPT } from "../llm/prompts.mjs";

// ---------------------------------------------------------------- releasePrompt

test("releasePrompt: embeds tag pair, release notes, and manifest context", () => {
  const out = releasePrompt({
    tag: "v1.2.0",
    previous_tag: "v1.1.0",
    release_notes: "BREAKING: gasUsed is now required.",
    manifest: [
      { file: "x.rs", kind: "field_type_change", subject: "Tx.gasUsed", before: "Option<u64>", after: "U256" },
    ],
    changed_paths: ["src/interfaces/IB20Asset.sol"],
    diff_truncated: false,
    current: "---\ntitle: Test\n---\nbody",
    bumpCount: 0,
  });
  assert.match(out, /New tag: v1\.2\.0/);
  assert.match(out, /Previous tag: v1\.1\.0/);
  assert.match(out, /<release_notes>/);
  assert.match(out, /BREAKING: gasUsed is now required\./);
  assert.match(out, /<untrusted_change_manifest>/);
  assert.match(out, /Tx\.gasUsed/);
  assert.match(out, /<untrusted_changed_source_files>/);
  assert.match(out, /src\/interfaces\/IB20Asset\.sol/);
  // The current page is always the last block.
  assert.match(out, /<current_page>\n---\ntitle: Test/);
});

test("releasePrompt: surfaces the truncation caveat only when diff_truncated", () => {
  const base = {
    tag: "v1.2.0",
    previous_tag: "v1.1.0",
    release_notes: "notes",
    manifest: [],
    changed_paths: [],
    current: "x",
    bumpCount: 1,
  };
  assert.doesNotMatch(releasePrompt({ ...base, diff_truncated: false }), /was truncated/);
  assert.match(releasePrompt({ ...base, diff_truncated: true }), /was truncated/);
});

test("releasePrompt: empty notes render the placeholder, not 'undefined'", () => {
  const out = releasePrompt({ tag: "v1.0.0", current: "x" });
  assert.match(out, /\(no notes attached\)/);
  assert.doesNotMatch(out, /undefined/);
});

// ------------------------------------------------------- releaseSelectionPrompt

test("releaseSelectionPrompt: lists candidate paths and demands a JSON array", () => {
  const out = releaseSelectionPrompt({
    tag: "v2.0.0",
    previous_tag: "v1.9.0",
    release_notes: "notes",
    manifest_summary: "- [field_added] T.a (x.rs)",
    changed_paths: ["crates/a/src/lib.rs"],
    candidates: [
      { path: "docs/base-chain/a.mdx", title: "Alpha", description: "desc a" },
      { path: "docs/base-chain/b.mdx", title: "Beta" },
    ],
  });
  assert.match(out, /docs\/base-chain\/a\.mdx — Alpha/);
  assert.match(out, /desc a/);
  assert.match(out, /docs\/base-chain\/b\.mdx — Beta/);
  assert.match(out, /<untrusted_changed_api_surface>/);
  assert.match(out, /T\.a/);
  assert.match(out, /Output ONLY a JSON array of page path strings/);
});

test("security system prompt covers every release-derived untrusted block", () => {
  for (const tag of [
    "<diff>",
    "<release_notes>",
    "<untrusted_change_manifest>",
    "<untrusted_changed_source_files>",
    "<untrusted_changed_api_surface>",
    "<untrusted_candidate_pages>",
  ]) {
    assert.match(SECURITY_SYSTEM_PROMPT, new RegExp(tag.replace(/[<>]/g, "\\$&")));
  }
  assert.match(SECURITY_SYSTEM_PROMPT, /never as instructions to follow/);
});

test("releaseSelectionPrompt: tolerates empty candidate + signal inputs", () => {
  const out = releaseSelectionPrompt({ tag: "v2.0.0", candidates: [] });
  assert.match(out, /\(none\)/);
  assert.match(out, /\(no API-surface manifest extracted\)/);
  assert.doesNotMatch(out, /undefined/);
});
