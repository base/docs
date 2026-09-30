import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  parseNextLink,
  ghGet,
  paginateAll,
  listBotPullRequests,
  listMergedPullRequestsSince,
  fetchPRCommits,
  fetchCommitStats,
  fetchPRFiles,
  fetchPRDiscussion,
  resolveToken,
} from "../metrics/github.mjs";

/** Build a fake `fetch` from a list of {status, json, headers} responses, consumed in order. */
function fakeFetch(responses) {
  let i = 0;
  return async () => {
    const r = responses[Math.min(i, responses.length - 1)];
    i += 1;
    const headers = new Map(Object.entries(r.headers ?? {}));
    return {
      status: r.status ?? 200,
      ok: (r.status ?? 200) < 400,
      text: async () => JSON.stringify(r.json ?? null),
      json: async () => r.json ?? null,
      headers: { get: (name) => headers.get(name.toLowerCase()) ?? headers.get(name) ?? null },
    };
  };
}

describe("parseNextLink", () => {
  test("extracts the next URL from a multi-rel Link header", () => {
    const header = '<https://api.github.com/x?page=2>; rel="next", <https://api.github.com/x?page=5>; rel="last"';
    assert.equal(parseNextLink(header), "https://api.github.com/x?page=2");
  });

  test("returns null when there is no next rel", () => {
    assert.equal(parseNextLink('<https://api.github.com/x?page=1>; rel="prev"'), null);
  });

  test("returns null for an empty header", () => {
    assert.equal(parseNextLink(null), null);
    assert.equal(parseNextLink(undefined), null);
    assert.equal(parseNextLink(""), null);
  });
});

describe("ghGet", () => {
  test("returns parsed JSON + status on success", async () => {
    const fetchImpl = fakeFetch([{ status: 200, json: { hello: "world" } }]);
    const result = await ghGet("https://api.github.com/x", "tok", { fetchImpl });
    assert.equal(result.status, 200);
    assert.equal(result.ok, true);
    assert.deepEqual(result.json, { hello: "world" });
  });

  test("flags non-2xx as not ok without throwing", async () => {
    const fetchImpl = fakeFetch([{ status: 404, json: { message: "Not Found" } }]);
    const result = await ghGet("https://api.github.com/x", "tok", { fetchImpl });
    assert.equal(result.ok, false);
    assert.equal(result.status, 404);
  });
});

describe("paginateAll", () => {
  test("follows Link: rel=next across pages and concatenates arrays", async () => {
    const fetchImpl = fakeFetch([
      { status: 200, json: [{ id: 1 }, { id: 2 }], headers: { link: '<https://api.github.com/x?page=2>; rel="next"' } },
      { status: 200, json: [{ id: 3 }], headers: {} },
    ]);
    const items = await paginateAll("https://api.github.com/x", "tok", { fetchImpl });
    assert.deepEqual(items.map((i) => i.id), [1, 2, 3]);
  });

  test("throws on a non-2xx page instead of silently truncating", async () => {
    const fetchImpl = fakeFetch([{ status: 500, json: { message: "boom" } }]);
    await assert.rejects(() => paginateAll("https://api.github.com/x", "tok", { fetchImpl }), /HTTP 500/);
  });
});

describe("listBotPullRequests", () => {
  test("keeps only docs/sync-code-change-* and docs/sync-release-* heads", async () => {
    const fetchImpl = fakeFetch([
      {
        status: 200,
        json: [
          { number: 1, head: { ref: "docs/sync-code-change-abc123" } },
          { number: 2, head: { ref: "docs/sync-release-v1.2.3" } },
          { number: 3, head: { ref: "some-human-branch" } },
        ],
      },
    ]);
    const prs = await listBotPullRequests("base", "docs", "tok", { fetchImpl });
    assert.deepEqual(prs.map((p) => p.number), [1, 2]);
  });
});

describe("listMergedPullRequestsSince", () => {
  test("filters to merged PRs at or after the cutoff", async () => {
    const fetchImpl = fakeFetch([
      {
        status: 200,
        json: [
          { number: 10, merged_at: "2026-09-01T00:00:00Z" },
          { number: 11, merged_at: null },
          { number: 12, merged_at: "2026-09-20T00:00:00Z" },
        ],
      },
    ]);
    const prs = await listMergedPullRequestsSince("base", "docs", "tok", { fetchImpl, sinceIso: "2026-09-10T00:00:00Z" });
    assert.deepEqual(prs.map((p) => p.number), [12]);
  });
});

describe("fetchPRCommits / fetchCommitStats / fetchPRFiles", () => {
  test("fetchPRCommits maps to sha + author login", async () => {
    const fetchImpl = fakeFetch([{ status: 200, json: [{ sha: "abc", author: { login: "github-actions[bot]" } }] }]);
    const commits = await fetchPRCommits("base", "docs", 1939, "tok", { fetchImpl });
    assert.deepEqual(commits, [{ sha: "abc", login: "github-actions[bot]" }]);
  });

  test("fetchCommitStats reads additions/deletions from commit.stats", async () => {
    const fetchImpl = fakeFetch([{ status: 200, json: { stats: { additions: 5, deletions: 2 } } }]);
    const stats = await fetchCommitStats("base", "docs", "abc", "tok", { fetchImpl });
    assert.deepEqual(stats, { additions: 5, deletions: 2 });
  });

  test("fetchPRFiles maps to filenames", async () => {
    const fetchImpl = fakeFetch([{ status: 200, json: [{ filename: "docs/a.mdx" }, { filename: "docs/b.mdx" }] }]);
    const files = await fetchPRFiles("base", "docs", 1939, "tok", { fetchImpl });
    assert.deepEqual(files, ["docs/a.mdx", "docs/b.mdx"]);
  });
});

describe("fetchPRDiscussion", () => {
  test("normalizes reviews, review comments, and issue comments into one shape", async () => {
    let call = 0;
    const fetchImpl = async () => {
      call += 1;
      const bodies = [
        [{ user: { login: "rev1" }, body: "LGTM overall", html_url: "u1" }], // reviews
        [{ user: { login: "rev2" }, body: "why this change?", path: "docs/a.mdx", html_url: "u2" }], // review comments
        [{ user: { login: "mintlify[bot]" }, body: "preview ready", html_url: "u3" }], // issue comments
      ];
      const body = bodies[call - 1];
      return {
        status: 200,
        ok: true,
        text: async () => JSON.stringify(body),
        headers: { get: () => null },
      };
    };
    const discussion = await fetchPRDiscussion("base", "docs", 1968, "tok", { fetchImpl });
    assert.deepEqual(discussion, [
      { login: "rev1", body: "LGTM overall", url: "u1", path: null },
      { login: "rev2", body: "why this change?", url: "u2", path: "docs/a.mdx" },
      { login: "mintlify[bot]", body: "preview ready", url: "u3", path: null },
    ]);
  });
});

describe("resolveToken", () => {
  test("prefers GITHUB_TOKEN from env over gh auth token", () => {
    const token = resolveToken({ GITHUB_TOKEN: "  env-token  " }, () => {
      throw new Error("should not shell out when env var is set");
    });
    assert.equal(token, "env-token");
  });

  test("falls back to `gh auth token` when env var is absent", () => {
    const token = resolveToken({}, () => "gh-token\n");
    assert.equal(token, "gh-token");
  });

  test("throws a clear error when neither source works", () => {
    assert.throws(
      () =>
        resolveToken({}, () => {
          throw new Error("not logged in");
        }),
      /No GitHub token available/,
    );
  });
});
