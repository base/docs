import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildIssueBody, findExistingIssue, upsertIssue, ISSUE_TITLE } from "../metrics/report.mjs";
import { buildMergeRateReport } from "../metrics/merge-rate.mjs";
import { tallyTaxonomy } from "../metrics/taxonomy.mjs";

const EMPTY_MERGE_REPORT = buildMergeRateReport([], new Map(), [], { nowMs: Date.now() });
const EMPTY_FEEDBACK = { counts: tallyTaxonomy([]) };

describe("buildIssueBody", () => {
  test("uses the exact fixed title so the issue is find-by-title idempotent", () => {
    const { title } = buildIssueBody(EMPTY_MERGE_REPORT, EMPTY_FEEDBACK);
    assert.equal(title, "Docs sync quality report");
    assert.equal(title, ISSUE_TITLE);
  });

  test("body includes both the merge-rate and taxonomy sections, and a non-blocking disclaimer", () => {
    const { body } = buildIssueBody(EMPTY_MERGE_REPORT, EMPTY_FEEDBACK, { owner: "base", repo: "docs" });
    assert.match(body, /Non-blocking pipeline metrics/);
    assert.match(body, /## Merge rate \(base\/docs\)/);
    assert.match(body, /## Reviewer feedback taxonomy \(base\/docs\)/);
  });
});

function fakeFetch(handlers) {
  return async (url, opts = {}) => {
    for (const h of handlers) {
      if (h.match(url, opts)) return h.respond(url, opts);
    }
    throw new Error(`No fake handler matched ${opts.method ?? "GET"} ${url}`);
  };
}

describe("findExistingIssue", () => {
  test("matches by exact title, ignoring pull requests and near-miss titles", async () => {
    const fetchImpl = fakeFetch([
      {
        match: (url) => url.includes("/issues?"),
        respond: () => ({
          status: 200,
          ok: true,
          text: async () =>
            JSON.stringify([
              { number: 1, title: "Docs sync quality report (draft)", pull_request: null },
              { number: 2, title: "Docs sync quality report", pull_request: { url: "x" } },
              { number: 3, title: "Docs sync quality report" },
            ]),
          headers: { get: () => null },
        }),
      },
    ]);
    const number = await findExistingIssue("base", "docs", "tok", { fetchImpl });
    assert.equal(number, 3);
  });

  test("returns null when no open issue matches", async () => {
    const fetchImpl = fakeFetch([
      {
        match: (url) => url.includes("/issues?"),
        respond: () => ({ status: 200, ok: true, text: async () => "[]", headers: { get: () => null } }),
      },
    ]);
    assert.equal(await findExistingIssue("base", "docs", "tok", { fetchImpl }), null);
  });
});

describe("upsertIssue", () => {
  test("creates a new issue (POST) when none exists yet", async () => {
    let createBody = null;
    const fetchImpl = fakeFetch([
      {
        match: (url) => url.includes("/issues?"),
        respond: () => ({ status: 200, ok: true, text: async () => "[]", headers: { get: () => null } }),
      },
      {
        match: (url, opts) => opts.method === "POST" && url.endsWith("/issues"),
        respond: (url, opts) => {
          createBody = JSON.parse(opts.body);
          return { status: 201, ok: true, json: async () => ({ number: 42, html_url: "https://x/42" }) };
        },
      },
    ]);
    const result = await upsertIssue("base", "docs", "tok", { title: "T", body: "B" }, { fetchImpl });
    assert.equal(result.updated, false);
    assert.equal(result.number, 42);
    assert.deepEqual(createBody, { title: "T", body: "B" });
  });

  test("updates the existing issue (PATCH) when the title already matches one", async () => {
    const fetchImpl = fakeFetch([
      {
        match: (url) => url.includes("/issues?"),
        respond: () => ({
          status: 200,
          ok: true,
          text: async () => JSON.stringify([{ number: 7, title: ISSUE_TITLE, pull_request: null }]),
          headers: { get: () => null },
        }),
      },
      {
        match: (url, opts) => opts.method === "PATCH" && url.endsWith("/issues/7"),
        respond: () => ({ status: 200, ok: true, json: async () => ({ number: 7, html_url: "https://x/7" }) }),
      },
    ]);
    const result = await upsertIssue("base", "docs", "tok", { title: ISSUE_TITLE, body: "B" }, { fetchImpl });
    assert.equal(result.updated, true);
    assert.equal(result.number, 7);
  });

  test("throws on a failed write instead of reporting a false success", async () => {
    const fetchImpl = fakeFetch([
      {
        match: (url) => url.includes("/issues?"),
        respond: () => ({ status: 200, ok: true, text: async () => "[]", headers: { get: () => null } }),
      },
      {
        match: (url, opts) => opts.method === "POST",
        respond: () => ({ status: 500, ok: false, text: async () => "boom" }),
      },
    ]);
    await assert.rejects(() => upsertIssue("base", "docs", "tok", { title: "T", body: "B" }, { fetchImpl }), /HTTP 500/);
  });
});
