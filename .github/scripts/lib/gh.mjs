/**
 * Thin GitHub REST client for the IA gates. No dependencies -- Node 22's global fetch.
 *
 * Fail-closed contract: every method either returns trustworthy data or throws. Callers
 * must never interpret a thrown error as "nothing to see here". In particular a 5xx on a
 * permission lookup means "could not verify", which is not the same as "not a writer".
 */

const API = process.env.GITHUB_API_URL || "https://api.github.com";

export class HttpError extends Error {
  constructor(status, message, { path } = {}) {
    super(`${status} ${message}${path ? ` (${path})` : ""}`);
    this.status = status;
    this.path = path;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class GitHub {
  constructor({ token, repo, log = () => {} }) {
    if (!token) throw new Error("GitHub client requires a token");
    if (!repo || !repo.includes("/")) throw new Error("GitHub client requires owner/repo");
    this.token = token;
    this.repo = repo;
    this.log = log;
    this.requestCount = 0;
  }

  async request(path, { method = "GET", body, acceptMissing = false } = {}) {
    const url = path.startsWith("http") ? path : `${API}${path}`;
    const maxAttempts = 4;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      this.requestCount++;
      let res;
      try {
        res = await fetch(url, {
          method,
          headers: {
            authorization: `Bearer ${this.token}`,
            accept: "application/vnd.github+json",
            "x-github-api-version": "2022-11-28",
            "user-agent": "base-docs-ia-gates",
            ...(body ? { "content-type": "application/json" } : {}),
          },
          body: body ? JSON.stringify(body) : undefined,
        });
      } catch (err) {
        // Network-level failure. Retry, then fail closed.
        if (attempt === maxAttempts) throw new HttpError(0, `network error: ${err.message}`, { path });
        await sleep(500 * 2 ** (attempt - 1));
        continue;
      }

      if (res.status === 404 && acceptMissing) return { missing: true, headers: res.headers };

      // Retry transient server errors and secondary rate limits, but never 4xx.
      const retryable = res.status >= 500 || res.status === 429;
      if (retryable && attempt < maxAttempts) {
        const retryAfter = Number(res.headers.get("retry-after")) || 0;
        await sleep(retryAfter ? retryAfter * 1000 : 500 * 2 ** (attempt - 1));
        continue;
      }

      if (!res.ok) {
        let detail = res.statusText;
        try {
          const parsed = await res.json();
          if (parsed?.message) detail = parsed.message;
        } catch {
          /* keep statusText */
        }
        throw new HttpError(res.status, detail, { path });
      }

      const data = res.status === 204 ? null : await res.json();
      return { data, headers: res.headers, missing: false };
    }
    throw new HttpError(0, "exhausted retries", { path });
  }

  /** Follow Link rel="next" and concatenate every page. */
  async paginate(path) {
    const out = [];
    const joiner = path.includes("?") ? "&" : "?";
    let next = `${path}${joiner}per_page=100`;
    let pages = 0;

    while (next) {
      const { data, headers } = await this.request(next);
      if (!Array.isArray(data)) {
        throw new HttpError(0, "expected an array response while paginating", { path: next });
      }
      out.push(...data);
      next = parseNextLink(headers.get("link"));
      if (++pages > 50) throw new HttpError(0, "pagination exceeded 50 pages", { path });
    }
    return out;
  }

  getPull(number) {
    return this.request(`/repos/${this.repo}/pulls/${number}`).then((r) => r.data);
  }

  listOpenPulls() {
    return this.paginate(`/repos/${this.repo}/pulls?state=open&sort=updated&direction=desc`);
  }

  listPullFiles(number) {
    return this.paginate(`/repos/${this.repo}/pulls/${number}/files`);
  }

  listReviews(number) {
    return this.paginate(`/repos/${this.repo}/pulls/${number}/reviews`);
  }

  listCheckRunsForRef(sha) {
    return this.request(
      `/repos/${this.repo}/commits/${sha}/check-runs?per_page=100&filter=latest`
    ).then((r) => r.data?.check_runs ?? []);
  }

  /**
   * Read a file at an arbitrary ref as *data*.
   *
   * Always queries the base repository: fork pull request commits are reachable there via
   * refs/pull/N/head, which keeps working even after the fork is deleted or renamed. Using
   * head.repo.full_name would break in both cases (head.repo is null for deleted forks).
   *
   * Returns { missing: true } when the path does not exist at that ref -- a real signal,
   * since deleting docs.json should activate a gate rather than pass it.
   */
  async getFileAtRef(filePath, ref) {
    const { data, missing } = await this.request(
      `/repos/${this.repo}/contents/${encodeURI(filePath)}?ref=${encodeURIComponent(ref)}`,
      { acceptMissing: true }
    );
    if (missing) return { missing: true, text: null };

    // Above 1 MB the contents API returns an empty body with encoding "none". Treating
    // that as an empty file would let a padded docs.json slip past the nav gates.
    if (data?.encoding !== "base64" || typeof data.content !== "string") {
      throw new HttpError(
        0,
        `unexpected encoding "${data?.encoding}" for ${filePath} at ${ref} (size ${data?.size}); refusing to guess`,
        { path: filePath }
      );
    }
    return { missing: false, text: Buffer.from(data.content, "base64").toString("utf8") };
  }

  /**
   * Calculated permission for a user, considering repo, team, org and enterprise grants.
   * Returns null only for a definitive "not a collaborator" (404); anything else throws.
   */
  async getCollaboratorPermission(login) {
    const { data, missing } = await this.request(
      `/repos/${this.repo}/collaborators/${encodeURIComponent(login)}/permission`,
      { acceptMissing: true }
    );
    return missing ? null : data;
  }

  createCheckRun(payload) {
    return this.request(`/repos/${this.repo}/check-runs`, { method: "POST", body: payload }).then(
      (r) => r.data
    );
  }
}

export function parseNextLink(linkHeader) {
  if (!linkHeader) return null;
  for (const part of linkHeader.split(",")) {
    const m = part.match(/<([^>]+)>\s*;\s*rel="next"/);
    if (m) return m[1];
  }
  return null;
}
