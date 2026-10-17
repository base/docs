/**
 * Minimal GitHub REST helper (global fetch, no extra dependencies).
 * Uses the workflow's GITHUB_TOKEN: contents:read + pull-requests:write.
 * pull-requests:write covers PR comments, reviews, and labels on PRs.
 */

const API = process.env.GITHUB_API_URL || "https://api.github.com";

export function createGitHub({ token, repo }) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo || "")) {
    throw new Error(`invalid repository slug: ${repo}`);
  }

  async function request(method, path, { body, accept } = {}) {
    const headers = {
      Accept: accept || "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "base-docs-pr-review",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body) headers["Content-Type"] = "application/json";
    const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const err = new Error(`${method} ${path} → HTTP ${res.status}: ${text.slice(0, 300)}`);
      err.status = res.status;
      throw err;
    }
    if (accept === "application/vnd.github.raw") return res.text();
    return res.status === 204 ? null : res.json();
  }

  async function paginate(path, maxPages = 5) {
    const all = [];
    for (let page = 1; page <= maxPages; page++) {
      const sep = path.includes("?") ? "&" : "?";
      const batch = await request("GET", `${path}${sep}per_page=100&page=${page}`);
      all.push(...batch);
      if (batch.length < 100) break;
    }
    return all;
  }

  const encodePath = (p) => p.split("/").map(encodeURIComponent).join("/");

  return {
    getPull: (n) => request("GET", `/repos/${repo}/pulls/${n}`),
    listPullFiles: (n) => paginate(`/repos/${repo}/pulls/${n}/files`, 3),
    getFileAtRef: (path, ref) =>
      request("GET", `/repos/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`, {
        accept: "application/vnd.github.raw",
      }),
    /** File text at a ref, or null when the file does not exist there. */
    getFileAtRefOrNull: async (path, ref) => {
      try {
        return await request("GET", `/repos/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`, {
          accept: "application/vnd.github.raw",
        });
      } catch (err) {
        if (err.status === 404) return null;
        throw err;
      }
    },
    /** Number of merged PRs by `login` in this repository (search API). */
    countMergedPulls: async (login) => {
      if (!/^[A-Za-z0-9-]+(\[bot\])?$/.test(login || "")) throw new Error("invalid login");
      const q = encodeURIComponent(`repo:${repo} is:pr is:merged author:${login}`);
      const res = await request("GET", `/search/issues?q=${q}&per_page=1`);
      return res.total_count;
    },
    /** True when the repository already has this label. Never creates one. */
    labelExists: async (name) => {
      try {
        await request("GET", `/repos/${repo}/labels/${encodeURIComponent(name)}`);
        return true;
      } catch (err) {
        if (err.status === 404) return false;
        throw err;
      }
    },
    addLabel: (n, name) => request("POST", `/repos/${repo}/issues/${n}/labels`, { body: { labels: [name] } }),
    removeLabel: async (n, name) => {
      try {
        await request("DELETE", `/repos/${repo}/issues/${n}/labels/${encodeURIComponent(name)}`);
      } catch (err) {
        if (err.status !== 404) throw err; // already gone
      }
    },
    listIssueComments: (n) => paginate(`/repos/${repo}/issues/${n}/comments`, 5),
    createIssueComment: (n, body) => request("POST", `/repos/${repo}/issues/${n}/comments`, { body: { body } }),
    updateIssueComment: (id, body) => request("PATCH", `/repos/${repo}/issues/comments/${id}`, { body: { body } }),
    listReviews: (n) => paginate(`/repos/${repo}/pulls/${n}/reviews`, 3),
    createReview: (n, payload) => request("POST", `/repos/${repo}/pulls/${n}/reviews`, { body: payload }),
  };
}

/** Comments and reviews written by this workflow's token. */
export function isWorkflowBot(user) {
  return user && user.type === "Bot" && user.login === "github-actions[bot]";
}
