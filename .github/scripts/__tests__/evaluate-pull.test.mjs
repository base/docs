/**
 * End-to-end coverage for evaluatePull: activation -> counting -> published verdicts.
 *
 * The GitHub client is stubbed, so this exercises the orchestrator and the exact check-run
 * payloads without touching the network.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { evaluatePull, loadConfig } from "../check-ia-approvals.mjs";

const HEAD = "c".repeat(40);
const BASE = "d".repeat(40);
const config = loadConfig();

const NAV_BASE = {
  navigation: {
    tabs: [
      { tab: "Get Started", groups: [{ group: "Quickstart", pages: ["get-started/base"] }] },
      { tab: "Build on Base", groups: [{ group: "Integrate DeFi", pages: ["build-on-base/a"] }] },
    ],
  },
};

/**
 * @param {object} opts
 * @param {Array} opts.files    GET /pulls/{n}/files entries
 * @param {Array} opts.reviews  GET /pulls/{n}/reviews entries
 * @param {object} [opts.navHead] docs.json as it looks at the head SHA
 * @param {Set<string>} [opts.writers] logins with write access
 */
function stubGitHub({ files = [], reviews = [], navHead = null, writers = new Set(), authorId = 1 }) {
  const published = new Map();
  return {
    published,
    requestCount: 0,
    getPull: async () => ({
      number: 42,
      title: "test",
      head: { sha: HEAD },
      base: { sha: BASE, ref: "master" },
      user: { id: authorId, login: "author" },
    }),
    listPullFiles: async () => files,
    listReviews: async () => reviews,
    getFileAtRef: async (_path, ref) => ({
      missing: false,
      text: JSON.stringify(ref === BASE ? NAV_BASE : (navHead ?? NAV_BASE)),
    }),
    getCollaboratorPermission: async (login) => ({
      user: { permissions: { push: writers.has(login) } },
    }),
    createCheckRun: async (payload) => {
      published.set(payload.name, payload);
      return payload;
    },
  };
}

const approval = (login, id) => ({
  id: id * 100,
  user: { login, id, type: "User" },
  state: "APPROVED",
  commit_id: HEAD,
  submitted_at: `2026-01-0${id}T00:00:00Z`,
});

const nameOf = (gateId) => config.gates[gateId].checkName;

test("a pure content edit publishes neutral for every gate", async () => {
  const gh = stubGitHub({ files: [{ filename: "docs/get-started/base.mdx", status: "modified" }] });
  await evaluatePull(gh, config, 42, {});

  assert.equal(gh.published.size, 4);
  for (const [name, payload] of gh.published) {
    assert.equal(payload.conclusion, "neutral", name);
    assert.equal(payload.head_sha, HEAD);
    assert.equal(payload.status, "completed");
    assert.match(payload.output.summary, /does not touch the surface/);
  }
});

test("a new Get Started page fails until three Writers approve", async () => {
  const files = [{ filename: "docs/get-started/new.mdx", status: "added" }];

  const twoWriters = stubGitHub({
    files,
    reviews: [approval("alice", 2), approval("bob", 3)],
    writers: new Set(["alice", "bob"]),
  });
  await evaluatePull(twoWriters, config, 42, {});
  const failing = twoWriters.published.get(nameOf("get-started"));
  assert.equal(failing.conclusion, "failure");
  assert.match(failing.output.title, /Needs 1 more approval$/);
  assert.match(failing.output.summary, /adds page file docs\/get-started\/new\.mdx/);
  assert.match(failing.output.summary, /2\/3 Writer approvals/);

  const threeWriters = stubGitHub({
    files,
    reviews: [approval("alice", 2), approval("bob", 3), approval("carol", 4)],
    writers: new Set(["alice", "bob", "carol"]),
  });
  await evaluatePull(threeWriters, config, 42, {});
  assert.equal(threeWriters.published.get(nameOf("get-started")).conclusion, "success");

  // The other gates were not touched, so they stay neutral either way.
  assert.equal(threeWriters.published.get(nameOf("guideline-files")).conclusion, "neutral");
});

test("the author's own approval never counts toward the threshold", async () => {
  const gh = stubGitHub({
    files: [{ filename: "docs/get-started/new.mdx", status: "added" }],
    reviews: [approval("author", 1), approval("alice", 2), approval("bob", 3)],
    writers: new Set(["author", "alice", "bob"]),
    authorId: 1,
  });
  await evaluatePull(gh, config, 42, {});
  const check = gh.published.get(nameOf("get-started"));
  assert.equal(check.conclusion, "failure");
  assert.match(check.output.summary, /author cannot approve their own change/);
});

test("renaming a Build on Base group needs a Governance Owner, and a Writer will not do", async () => {
  const files = [{ filename: "docs/docs.json", status: "modified" }];
  const navHead = {
    navigation: {
      tabs: [
        NAV_BASE.navigation.tabs[0],
        { tab: "Build on Base", groups: [{ group: "Integrate Lending", pages: ["build-on-base/a"] }] },
      ],
    },
  };

  const writerOnly = stubGitHub({
    files,
    navHead,
    reviews: [approval("alice", 2)],
    writers: new Set(["alice"]),
  });
  await evaluatePull(writerOnly, config, 42, {});
  const check = writerOnly.published.get(nameOf("build-on-base-solutions"));
  assert.equal(check.conclusion, "failure");
  assert.match(check.output.summary, /removes solution group "Integrate DeFi"/);
  assert.match(check.output.summary, /adds solution group "Integrate Lending"/);

  const ownerApproved = stubGitHub({
    files,
    navHead,
    reviews: [approval("ericbrown99", 9)],
    writers: new Set(["ericbrown99"]),
  });
  await evaluatePull(ownerApproved, config, 42, {});
  assert.equal(ownerApproved.published.get(nameOf("build-on-base-solutions")).conclusion, "success");
});

test("reordering groups in docs.json trips no gate", async () => {
  const reordered = {
    navigation: {
      tabs: [
        NAV_BASE.navigation.tabs[0],
        {
          tab: "Build on Base",
          groups: [{ group: "Integrate DeFi", pages: ["build-on-base/a"] }].reverse(),
        },
      ],
    },
  };
  const gh = stubGitHub({ files: [{ filename: "docs/docs.json", status: "modified" }], navHead: reordered });
  await evaluatePull(gh, config, 42, {});
  assert.equal(gh.published.get(nameOf("build-on-base-solutions")).conclusion, "neutral");
});

test("editing a guideline file needs a Governance Owner", async () => {
  const gh = stubGitHub({
    files: [{ filename: "docs/content-guidelines.md", status: "modified" }],
    reviews: [approval("mindapivessa", 8)],
    writers: new Set(["mindapivessa"]),
  });
  await evaluatePull(gh, config, 42, {});
  assert.equal(gh.published.get(nameOf("guideline-files")).conclusion, "success");
  // Editing guidelines is not a CI-config change.
  assert.equal(gh.published.get(nameOf("ci-configuration")).conclusion, "neutral");
});

test("touching the gate's own config needs three Writers", async () => {
  const gh = stubGitHub({
    files: [{ filename: ".github/ia-governance.json", status: "modified" }],
    reviews: [approval("ericbrown99", 9)],
    writers: new Set(["ericbrown99"]),
  });
  await evaluatePull(gh, config, 42, {});
  const check = gh.published.get(nameOf("ci-configuration"));
  assert.equal(check.conclusion, "failure");
  // An owner counts as one Writer, not as three.
  assert.match(check.output.summary, /1\/3 Writer approvals/);
});

test("verdicts are always published against the re-read head SHA", async () => {
  const gh = stubGitHub({ files: [{ filename: "docs/get-started/new.mdx", status: "added" }] });
  await evaluatePull(gh, config, 42, {});
  for (const payload of gh.published.values()) assert.equal(payload.head_sha, HEAD);
});

test("no reviews are fetched when nothing is activated", async () => {
  let reviewCalls = 0;
  const gh = stubGitHub({ files: [{ filename: "README.md", status: "modified" }] });
  gh.listReviews = async () => {
    reviewCalls++;
    return [];
  };
  await evaluatePull(gh, config, 42, {});
  assert.equal(reviewCalls, 0, "an inactive pull request must not cost review or permission calls");
});

test("docs.json is not fetched when the pull request does not touch it", async () => {
  let fetches = 0;
  const gh = stubGitHub({ files: [{ filename: "docs/get-started/base.mdx", status: "modified" }] });
  gh.getFileAtRef = async () => {
    fetches++;
    return { missing: false, text: JSON.stringify(NAV_BASE) };
  };
  await evaluatePull(gh, config, 42, {});
  assert.equal(fetches, 0);
});

test("a missing head SHA aborts rather than publishing a verdict", async () => {
  const gh = stubGitHub({});
  gh.getPull = async () => ({ number: 42, title: "t", head: {}, base: { sha: BASE, ref: "master" }, user: { id: 1 } });
  await assert.rejects(evaluatePull(gh, config, 42, {}), /no usable head SHA/);
  assert.equal(gh.published.size, 0);
});
