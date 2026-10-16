import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  extractSourceSha,
  collectFindings,
  buildCandidateCase,
  writeCandidateCases,
  renderTaxonomyMarkdown,
} from "../metrics/mine-feedback.mjs";

const SAMPLE_PR = {
  number: 1968,
  head: { ref: "docs/sync-code-change-253bb15" },
  title: "docs: feat(policy): enforce TRANSFER_EXECUTOR_POLICY on every transfer path (base-std@253bb15)",
};

describe("extractSourceSha", () => {
  test("pulls the short sha out of a code-change branch", () => {
    assert.equal(extractSourceSha(SAMPLE_PR), "253bb15");
  });

  test("pulls the short sha out of a release branch", () => {
    assert.equal(extractSourceSha({ head: { ref: "docs/sync-release-abc1234" } }), "abc1234");
  });

  test("returns null for a non-bot branch", () => {
    assert.equal(extractSourceSha({ head: { ref: "some-human-branch" } }), null);
  });
});

describe("collectFindings", () => {
  test("skips bot logins and classifies the rest", async () => {
    const discussion = [
      { login: "mintlify[bot]", body: "preview ready", url: "u0", path: null },
      { login: "rayyan224", body: "why these changes ?", url: "u1", path: "docs/a.mdx" },
      { login: "stephancill", body: "would drop this - don't need to update an old changelog", url: "u2", path: "docs/b.mdx" },
    ];
    const findings = await collectFindings(discussion);
    assert.equal(findings.length, 2);
    assert.equal(findings[0].type, "scope");
    assert.equal(findings[0].page, "docs/a.mdx");
    assert.equal(findings[1].type, "scope");
  });

  test("skips comments with empty/whitespace-only bodies", async () => {
    const findings = await collectFindings([{ login: "human", body: "   ", url: "u", path: null }]);
    assert.deepEqual(findings, []);
  });

  test("supports an injected (e.g. LLM-backed) async classifier", async () => {
    const findings = await collectFindings([{ login: "human", body: "anything", url: "u", path: null }], {
      classify: async () => "fact",
    });
    assert.equal(findings[0].type, "fact");
  });
});

describe("buildCandidateCase", () => {
  const findings = [
    { page: "docs/a.mdx", type: "scope", text: "why these changes ?", url: "u1" },
    { page: "docs/a.mdx", type: "fact", text: "wrong selector", url: "u2" },
  ];

  test("builds a schema-shaped drafted candidate with a stable id from sha + slug", () => {
    const candidate = buildCandidateCase(SAMPLE_PR, findings);
    assert.equal(candidate.id, "253bb15-feat-policy-enforce-transfer");
    assert.equal(candidate.source_repo, "base/base-std");
    assert.equal(candidate.source_sha, "253bb15");
    assert.equal(candidate.bot_pr, 1968);
    assert.equal(candidate.reference, null);
    assert.equal(candidate.scope.label_source, "drafted");
    assert.deepEqual(candidate.scope.in, ["docs/a.mdx"]);
    assert.equal(candidate.split, null);
    assert.equal(candidate.review_findings.length, 2);
  });

  test("notes field flags the placeholder payload/docs_base_commit for a human promoter", () => {
    const candidate = buildCandidateCase(SAMPLE_PR, findings);
    assert.match(candidate.notes, /build-cases\.mjs/);
    assert.equal(candidate.payload, null);
    assert.equal(candidate.docs_base_commit, null);
  });
});

describe("writeCandidateCases", () => {
  test("dry-run writes nothing to disk", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "doc-evals-cases-"));
    try {
      const candidatesByPr = [{ candidate: buildCandidateCase(SAMPLE_PR, [{ page: null, type: "other", text: "x", url: "u" }]) }];
      await writeCandidateCases(candidatesByPr, { casesDir: dir, dryRun: true });
      await assert.rejects(() => readdir(path.join(dir, "_candidates")));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("writes one file per candidate under _candidates/, never directly under casesDir", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "doc-evals-cases-"));
    try {
      const candidate = buildCandidateCase(SAMPLE_PR, [{ page: null, type: "other", text: "x", url: "u" }]);
      const written = await writeCandidateCases([{ candidate }], { casesDir: dir, dryRun: false });
      assert.equal(written.length, 1);
      assert.match(written[0], /_candidates[/\\]253bb15-feat-policy-enforce-transfer\.json$/);
      const onDisk = JSON.parse(await readFile(written[0], "utf8"));
      assert.equal(onDisk.id, candidate.id);
      const topLevel = await readdir(dir);
      assert.deepEqual(topLevel, ["_candidates"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("renderTaxonomyMarkdown", () => {
  test("renders a table row per taxonomy type with the total in the intro line", () => {
    const md = renderTaxonomyMarkdown({ scope: 2, paraphrase: 0, fact: 1, housekeeping: 0, style: 0, naming: 0, other: 0 });
    assert.match(md, /3 classified finding\(s\)/);
    assert.match(md, /\| scope \| 2 \|/);
  });
});
