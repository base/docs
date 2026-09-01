import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import nodePath from "node:path";

import {
  summarizeApprovals,
  hasWriteAccess,
  evaluateRequirement,
} from "../lib/approvals.mjs";
import { matchesGlob, matchesAnyGlob } from "../lib/glob.mjs";
import {
  parseNavConfig,
  pageRefsForTab,
  topLevelGroupNames,
  setsDiffer,
  added,
} from "../lib/docs-nav.mjs";
import {
  loadConfig,
  activateGetStarted,
  activateSolutionGroups,
  activateByPaths,
  classifyApprovers,
  sweepNeedsEvaluation,
} from "../check-ia-approvals.mjs";

const HEAD = "a".repeat(40);
const OLD = "b".repeat(40);

let nextId = 1;
function user(login, overrides = {}) {
  return { login, id: nextId++, type: "User", ...overrides };
}
function review(u, state, commit_id = HEAD, extra = {}) {
  return { id: nextId++, user: u, state, commit_id, submitted_at: "2026-01-01T00:00:00Z", ...extra };
}

// ---------------------------------------------------------------------------
// Approval counting
// ---------------------------------------------------------------------------

test("counts distinct approvals on the current head SHA", () => {
  const [a, b, c] = [user("alice"), user("bob"), user("carol")];
  const { approvers } = summarizeApprovals(
    [review(a, "APPROVED"), review(b, "APPROVED"), review(c, "APPROVED")],
    { headSha: HEAD }
  );
  assert.equal(approvers.length, 3);
});

test("ignores an approval left on a superseded commit", () => {
  const a = user("alice");
  const { approvers, discarded } = summarizeApprovals([review(a, "APPROVED", OLD)], { headSha: HEAD });
  assert.equal(approvers.length, 0);
  assert.match(discarded[0].reason, /not current head/);
});

test("a later CHANGES_REQUESTED on the same SHA voids an earlier approval", () => {
  const a = user("alice");
  const { approvers } = summarizeApprovals(
    [
      review(a, "APPROVED", HEAD, { submitted_at: "2026-01-01T00:00:00Z" }),
      review(a, "CHANGES_REQUESTED", HEAD, { submitted_at: "2026-01-02T00:00:00Z" }),
    ],
    { headSha: HEAD }
  );
  assert.equal(approvers.length, 0);
});

test("a dismissed approval does not count", () => {
  // GitHub mutates the record's state to DISMISSED in place rather than appending.
  const a = user("alice");
  const { approvers } = summarizeApprovals([review(a, "DISMISSED")], { headSha: HEAD });
  assert.equal(approvers.length, 0);
});

test("re-approval after a dismissal counts again", () => {
  const a = user("alice");
  const { approvers } = summarizeApprovals(
    [
      review(a, "DISMISSED", HEAD, { submitted_at: "2026-01-01T00:00:00Z" }),
      review(a, "APPROVED", HEAD, { submitted_at: "2026-01-03T00:00:00Z" }),
    ],
    { headSha: HEAD }
  );
  assert.deepEqual(approvers.map((x) => x.login), ["alice"]);
});

test("the same user approving twice counts once", () => {
  const a = user("alice");
  const { approvers } = summarizeApprovals(
    [
      review(a, "APPROVED", HEAD, { submitted_at: "2026-01-01T00:00:00Z" }),
      review(a, "APPROVED", HEAD, { submitted_at: "2026-01-02T00:00:00Z" }),
    ],
    { headSha: HEAD }
  );
  assert.equal(approvers.length, 1);
});

test("the pull request author cannot approve their own change", () => {
  const author = user("alice");
  const { approvers, discarded } = summarizeApprovals([review(author, "APPROVED")], {
    headSha: HEAD,
    authorId: author.id,
  });
  assert.equal(approvers.length, 0);
  assert.match(discarded[0].reason, /author cannot approve/);
});

test("bot and non-User reviewers are excluded", () => {
  const bot = user("dependabot[bot]", { type: "Bot" });
  const org = user("some-org", { type: "Organization" });
  const mannequin = user("ghost-import", { type: "Mannequin" });
  const { approvers } = summarizeApprovals(
    [review(bot, "APPROVED"), review(org, "APPROVED"), review(mannequin, "APPROVED")],
    { headSha: HEAD }
  );
  assert.equal(approvers.length, 0);
});

test("a review from a deleted account does not crash the run", () => {
  const a = user("alice");
  const { approvers, discarded } = summarizeApprovals(
    [{ id: 1, user: null, state: "APPROVED", commit_id: HEAD }, review(a, "APPROVED")],
    { headSha: HEAD }
  );
  assert.deepEqual(approvers.map((x) => x.login), ["alice"]);
  assert.ok(discarded.some((d) => /no associated user/.test(d.reason)));
});

test("a null commit_id is discarded rather than compared loosely", () => {
  const a = user("alice");
  const { approvers, discarded } = summarizeApprovals([review(a, "APPROVED", null)], { headSha: HEAD });
  assert.equal(approvers.length, 0);
  assert.match(discarded[0].reason, /not attached to a commit/);
});

test("COMMENTED and PENDING reviews carry no standing", () => {
  const a = user("alice");
  const { approvers } = summarizeApprovals(
    [review(a, "COMMENTED"), review(user("bob"), "PENDING")],
    { headSha: HEAD }
  );
  assert.equal(approvers.length, 0);
});

test("an unrecognized state is never treated as an approval", () => {
  const { approvers } = summarizeApprovals([review(user("alice"), "SOMETHING_NEW")], { headSha: HEAD });
  assert.equal(approvers.length, 0);
});

test("chronology is derived defensively when submitted_at is absent", () => {
  const a = user("alice");
  const approve = { id: 10, user: a, state: "APPROVED", commit_id: HEAD };
  const reject = { id: 11, user: a, state: "CHANGES_REQUESTED", commit_id: HEAD };
  // Supplied out of order; the higher id must win.
  const { approvers } = summarizeApprovals([reject, approve].reverse(), { headSha: HEAD });
  assert.equal(approvers.length, 0);
});

test("summarizeApprovals refuses to run without a head SHA", () => {
  assert.throws(() => summarizeApprovals([], {}), /non-empty headSha/);
});

// ---------------------------------------------------------------------------
// Write access
// ---------------------------------------------------------------------------

test("write access reads the push boolean, not the legacy permission string", () => {
  // The API maps the maintain role onto permission "write", and returns custom role names
  // in role_name -- so only the boolean is reliable.
  assert.equal(hasWriteAccess({ user: { permissions: { push: true } }, permission: "write" }), true);
  assert.equal(
    hasWriteAccess({ user: { permissions: { push: true } }, role_name: "maintain" }),
    true,
    "a maintain-role approver must count as a Writer"
  );
  assert.equal(
    hasWriteAccess({ user: { permissions: { push: true } }, role_name: "docs-publisher" }),
    true,
    "a custom write role must count as a Writer"
  );
  assert.equal(hasWriteAccess({ user: { permissions: { push: false } }, role_name: "triage" }), false);
  assert.equal(hasWriteAccess(null), false);
  assert.equal(hasWriteAccess({}), false);
});

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

test("two Writers fail a three-Writer gate and three pass it", () => {
  const approvers = [
    { id: 1, login: "a" },
    { id: 2, login: "b" },
    { id: 3, login: "c" },
  ];
  const ownerIds = new Set();

  const two = evaluateRequirement({
    approvers,
    requires: "writers",
    count: 3,
    writerIds: new Set([1, 2]),
    ownerIds,
  });
  assert.equal(two.satisfied, false);
  assert.match(two.summary, /2\/3 Writer approvals.*1 more needed/);

  const three = evaluateRequirement({
    approvers,
    requires: "writers",
    count: 3,
    writerIds: new Set([1, 2, 3]),
    ownerIds,
  });
  assert.equal(three.satisfied, true);
});

test("a Writer approval does not satisfy a Governance Owner gate", () => {
  const approvers = [{ id: 1, login: "writer" }];
  const result = evaluateRequirement({
    approvers,
    requires: "governanceOwners",
    count: 1,
    writerIds: new Set([1]),
    ownerIds: new Set(),
  });
  assert.equal(result.satisfied, false);
});

// ---------------------------------------------------------------------------
// Approver classification (network stubbed)
// ---------------------------------------------------------------------------

test("owner matching is case-insensitive on login", async () => {
  const gh = {
    getCollaboratorPermission: async () => ({ user: { permissions: { push: true } } }),
  };
  const { ownerIds } = await classifyApprovers(
    gh,
    [{ id: 7, login: "EricBrown99" }],
    ["ericbrown99"],
    new Map()
  );
  assert.ok(ownerIds.has(7));
});

test("a non-collaborator approver is reported, not counted", async () => {
  const gh = { getCollaboratorPermission: async () => null };
  const { writerIds, notes } = await classifyApprovers(
    gh,
    [{ id: 7, login: "outsider" }],
    [],
    new Map()
  );
  assert.equal(writerIds.size, 0);
  assert.match(notes[0].reason, /not a collaborator/);
});

test("a permission lookup failure fails the gate closed instead of counting as read-only", async () => {
  const gh = {
    getCollaboratorPermission: async () => {
      throw new Error("500 Internal Server Error");
    },
  };
  await assert.rejects(
    classifyApprovers(gh, [{ id: 7, login: "alice" }], [], new Map()),
    /500/
  );
});

test("permission lookups are cached across gates", async () => {
  let calls = 0;
  const gh = {
    getCollaboratorPermission: async () => {
      calls++;
      return { user: { permissions: { push: true } } };
    },
  };
  const cache = new Map();
  const approvers = [{ id: 1, login: "alice" }];
  await classifyApprovers(gh, approvers, [], cache);
  await classifyApprovers(gh, approvers, [], cache);
  assert.equal(calls, 1);
});

// ---------------------------------------------------------------------------
// Glob matching
// ---------------------------------------------------------------------------

test("added-page globs match nested and flat Get Started pages only", () => {
  const globs = ["docs/get-started/**/*.md", "docs/get-started/**/*.mdx"];
  assert.ok(matchesAnyGlob("docs/get-started/base.mdx", globs));
  assert.ok(matchesAnyGlob("docs/get-started/deep/nested/page.mdx", globs));
  assert.ok(matchesAnyGlob("docs/get-started/base.md", globs));
  assert.ok(!matchesAnyGlob("docs/build-on-base/overview.mdx", globs));
  assert.ok(!matchesAnyGlob("docs/get-started/image.png", globs));
});

test("a directory glob covers everything beneath it", () => {
  assert.ok(matchesGlob(".github/scripts/check-ia-approvals.mjs", ".github/scripts/**"));
  assert.ok(matchesGlob(".github/scripts/lib/a/b/c.mjs", ".github/scripts/**"));
  assert.ok(!matchesGlob(".github/workflows/chromatic.yml", ".github/scripts/**"));
});

test("exact path globs do not match by prefix", () => {
  assert.ok(matchesGlob("docs/ia-guidelines.md", "docs/ia-guidelines.md"));
  assert.ok(!matchesGlob("docs/ia-guidelines.md.bak", "docs/ia-guidelines.md"));
  assert.ok(!matchesGlob("other/docs/ia-guidelines.md", "docs/ia-guidelines.md"));
});

// ---------------------------------------------------------------------------
// Navigation parsing
// ---------------------------------------------------------------------------

function nav(tabs) {
  return { navigation: { tabs } };
}

test("depth-1 group names ignore nested subgroups", () => {
  const config = nav([
    {
      tab: "Build on Base",
      groups: [
        { group: "Overview", pages: ["a"] },
        { group: "Accept Payments", pages: [{ group: "Take a Payment", pages: ["b"] }] },
      ],
    },
  ]);
  assert.deepEqual([...topLevelGroupNames(config, "Build on Base")], ["Overview", "Accept Payments"]);
});

test("page refs are collected at every depth", () => {
  const config = nav([
    {
      tab: "Build on Base",
      groups: [{ group: "Accept Payments", pages: [{ group: "Deep", pages: ["x/y", "x/z"] }] }],
    },
  ]);
  assert.deepEqual([...pageRefsForTab(config, "Build on Base")].sort(), ["x/y", "x/z"]);
});

test("reordering solution groups is not a structural change, but renaming one is", () => {
  const gate = { navTab: "Build on Base" };
  const before = nav([
    { tab: "Build on Base", groups: [{ group: "Integrate DeFi", pages: [] }, { group: "Tokenize Assets", pages: [] }] },
  ]);
  const reordered = nav([
    { tab: "Build on Base", groups: [{ group: "Tokenize Assets", pages: [] }, { group: "Integrate DeFi", pages: [] }] },
  ]);
  const renamed = nav([
    { tab: "Build on Base", groups: [{ group: "Integrate DeFi", pages: [] }, { group: "Tokenise Assets", pages: [] }] },
  ]);

  assert.equal(activateSolutionGroups(gate, { base: before, head: reordered }).length, 0);

  const reasons = activateSolutionGroups(gate, { base: before, head: renamed });
  assert.equal(reasons.length, 2, "a rename reads as one addition plus one removal");
  assert.ok(reasons.some((r) => /adds solution group "Tokenise Assets"/.test(r)));
  assert.ok(reasons.some((r) => /removes solution group "Tokenize Assets"/.test(r)));
});

test("editing a guide inside an existing solution group does not activate the solutions gate", () => {
  const gate = { navTab: "Build on Base" };
  const before = nav([
    { tab: "Build on Base", groups: [{ group: "Integrate DeFi", pages: ["a", "b"] }] },
  ]);
  const afterPageAdded = nav([
    { tab: "Build on Base", groups: [{ group: "Integrate DeFi", pages: ["a", "b", "c"] }] },
  ]);
  assert.equal(activateSolutionGroups(gate, { base: before, head: afterPageAdded }).length, 0);
});

test("deleting docs.json activates the nav gates instead of passing them", () => {
  const gate = { navTab: "Build on Base" };
  const reasons = activateSolutionGroups(gate, { base: nav([]), head: null, headDeleted: true });
  assert.deepEqual(reasons, ["deletes docs/docs.json"]);
});

test("docs.json that is not valid JSON throws rather than reading as no change", () => {
  assert.throws(() => parseNavConfig("{ not json"), /not valid JSON/);
  assert.throws(() => parseNavConfig(""), /empty/);
  assert.throws(() => parseNavConfig("[]"), /did not parse to an object/);
});

// ---------------------------------------------------------------------------
// Gate activation
// ---------------------------------------------------------------------------

const GET_STARTED_GATE = {
  navTab: "Get Started",
  addedPathGlobs: ["docs/get-started/**/*.md", "docs/get-started/**/*.mdx"],
};

test("adding a Get Started page file activates gate 1", () => {
  const reasons = activateGetStarted(
    GET_STARTED_GATE,
    [{ filename: "docs/get-started/new-page.mdx", status: "added" }],
    null
  );
  assert.deepEqual(reasons, ["adds page file docs/get-started/new-page.mdx"]);
});

test("editing an existing Get Started page does not activate gate 1", () => {
  const reasons = activateGetStarted(
    GET_STARTED_GATE,
    [{ filename: "docs/get-started/base.mdx", status: "modified" }],
    null
  );
  assert.deepEqual(reasons, []);
});

test("adding a nav reference alone activates gate 1, with no new file", () => {
  // Catches the filesystem-bypass route: pulling an existing page from another
  // directory into the Get Started tab.
  const before = nav([{ tab: "Get Started", groups: [{ group: "Quickstart", pages: ["get-started/base"] }] }]);
  const after = nav([
    {
      tab: "Get Started",
      groups: [
        { group: "Quickstart", pages: ["get-started/base", "base-chain/network-information/ecosystem-bridges"] },
      ],
    },
  ]);
  const reasons = activateGetStarted(GET_STARTED_GATE, [{ filename: "docs/docs.json", status: "modified" }], {
    base: before,
    head: after,
  });
  assert.deepEqual(reasons, ['adds "base-chain/network-information/ecosystem-bridges" to the Get Started tab']);
});

test("removing a Get Started nav reference does not activate gate 1", () => {
  const before = nav([{ tab: "Get Started", groups: [{ group: "Q", pages: ["a", "b"] }] }]);
  const after = nav([{ tab: "Get Started", groups: [{ group: "Q", pages: ["a"] }] }]);
  assert.deepEqual(
    activateGetStarted(GET_STARTED_GATE, [{ filename: "docs/docs.json", status: "modified" }], {
      base: before,
      head: after,
    }),
    []
  );
});

test("the guideline gate fires on deletes and renames, not just edits", () => {
  const gate = { touchedPathGlobs: ["docs/ia-guidelines.md", "docs/content-guidelines.md"] };
  assert.equal(activateByPaths(gate, [{ filename: "docs/ia-guidelines.md", status: "removed" }]).length, 1);
  assert.equal(
    activateByPaths(gate, [
      { filename: "docs/renamed-guidelines.md", status: "renamed", previous_filename: "docs/ia-guidelines.md" },
    ]).length,
    1,
    "a rename away from the protected path must still activate the gate"
  );
  assert.equal(activateByPaths(gate, [{ filename: "docs/get-started/base.mdx", status: "modified" }]).length, 0);
});

test("the CI gate protects the gate's own config and scripts", () => {
  const gate = loadConfig().gates["ci-configuration"];
  for (const p of [
    ".github/ia-governance.json",
    ".github/scripts/check-ia-approvals.mjs",
    ".github/scripts/lib/approvals.mjs",
    ".github/workflows/ia-approval-gates.yml",
    ".github/workflows/docs-style-conformance.yml",
    ".github/CODEOWNERS",
  ]) {
    assert.equal(
      activateByPaths(gate, [{ filename: p, status: "modified" }]).length,
      1,
      `${p} must be protected`
    );
  }
  assert.equal(activateByPaths(gate, [{ filename: ".github/workflows/chromatic.yml", status: "modified" }]).length, 0);
});

// ---------------------------------------------------------------------------
// Shipped config sanity
// ---------------------------------------------------------------------------

test("the shipped config matches the spec's thresholds", () => {
  const { gates, governanceOwners } = loadConfig();
  assert.deepEqual(governanceOwners, ["ericbrown99", "mindapivessa"]);
  assert.equal(gates["get-started"].count, 3);
  assert.equal(gates["get-started"].requires, "writers");
  assert.equal(gates["build-on-base-solutions"].count, 1);
  assert.equal(gates["build-on-base-solutions"].requires, "governanceOwners");
  assert.equal(gates["guideline-files"].count, 1);
  assert.equal(gates["guideline-files"].requires, "governanceOwners");
  assert.equal(gates["ci-configuration"].count, 3);
  assert.equal(gates["ci-configuration"].requires, "writers");
});

test("check names are unique so branch protection cannot conflate two gates", () => {
  const names = Object.values(loadConfig().gates).map((g) => g.checkName);
  assert.equal(new Set(names).size, names.length);
});

test("gate config is rejected when a threshold or role is malformed", () => {
  const dir = mkdtempSync(nodePath.join(os.tmpdir(), "ia-gate-"));
  let seq = 0;

  const write = (obj) => {
    const p = nodePath.join(dir, `cfg-${seq++}.json`);
    writeFileSync(p, JSON.stringify(obj));
    return p;
  };

  assert.throws(() => loadConfig(write({ gates: {}, navConfigPath: "x" })), /governanceOwners/);
  assert.throws(
    () => loadConfig(write({ governanceOwners: ["a"], gates: { g: { checkName: "n", requires: "nobody", count: 1 } }, navConfigPath: "x" })),
    /invalid requires/
  );
  assert.throws(
    () => loadConfig(write({ governanceOwners: ["a"], gates: { g: { checkName: "n", requires: "writers", count: 0 } }, navConfigPath: "x" })),
    /invalid count/
  );
});

// ---------------------------------------------------------------------------
// Sweep selection
// ---------------------------------------------------------------------------

test("the sweep re-evaluates missing, failing and ageing verdicts, and skips current ones", () => {
  const names = ["Gate A", "Gate B"];
  const now = Date.parse("2026-01-10T00:00:00Z");
  const fresh = (name, conclusion) => ({ name, conclusion, completed_at: "2026-01-09T00:00:00Z" });

  assert.equal(sweepNeedsEvaluation([fresh("Gate A", "success"), fresh("Gate B", "neutral")], names, now), null);
  assert.match(sweepNeedsEvaluation([fresh("Gate A", "success")], names, now), /missing/);
  assert.match(
    sweepNeedsEvaluation([fresh("Gate A", "failure"), fresh("Gate B", "neutral")], names, now),
    /failing/
  );
  assert.match(
    sweepNeedsEvaluation(
      [
        { name: "Gate A", conclusion: "success", completed_at: "2026-01-01T00:00:00Z" },
        fresh("Gate B", "neutral"),
      ],
      names,
      now
    ),
    /expiry/
  );
  assert.match(
    sweepNeedsEvaluation([{ name: "Gate A", conclusion: "success" }, fresh("Gate B", "neutral")], names, now),
    /timestamp/
  );
});
