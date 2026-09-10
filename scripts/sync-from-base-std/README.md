# Base Std documentation sync

This directory is installed in `base/docs` and is invoked by
`.github/workflows/base-std-docs-sync.yml`. It consumes a verified dispatch from
`base/base-std`, routes changed source files to existing B20 documentation
pages, asks Claude for grounded edits, validates the returned MDX, and reports
touched/rejected pages to the workflow.

## Supported inputs

- `code-change`: the normal `base-code-changed` event sent after a relevant
  push to `base-std/main`.
- `release`: retained for protocol compatibility with the receiver.
- `manual-update`: maintainer replay using an explicitly allowlisted page.

The route table supports both exact `pages` and `page_globs`. Globs are expanded
only against existing Markdown files beneath `docs/`; they cannot create new
paths. This version intentionally does not create, rename, or delete API pages.

## Routing outcomes

Every changed source path in a `code-change` dispatch ends up in exactly one
bucket, logged as `[routing]` and reported in the PR body (or an issue):

| Bucket | Meaning | What happens |
|---|---|---|
| routed | matched a rule with `kind` interface, product-doc, changelog-* | its pages are edited |
| ignored | matched only a `kind: "ignored"` rule | nothing; deliberately unsynced (upstream README, authoring templates) |
| unrouted | matched no rule | listed under **Unrouted source files** with a guideline-derived placement proposal |
| removed | deleted in the source commit (`removed_paths`) | never routed; listed under **Removed source files** |

`removed_paths` is derived by the workflow from the commit API for the verified
sha, never from the dispatcher's payload. A deleted documentation file carries
nothing to sync: its docs pages are generated from surviving sources, and a
deprecation shows up in the diff of the file that declares it. Routing a
deletion used to hand the model an all-minus diff and produced "the source file
has been removed" banners on reference pages (base/docs#1928); the validator now
rejects callouts that describe repository housekeeping (`validateCallouts` in
`safety.mjs`).

### Placement proposals from the IA guidelines

Unrouted Markdown sources go through one Haiku call (`proposePlacement`) that
reads the same `docs/ia-guidelines.md` and `docs/content-guidelines.md` every
page-editing prompt already carries, plus the title and description of every
existing page under `docs/specifications/` and `docs/build-on-base/`, and
returns the existing page each file's content belongs on with the guideline rule
that decides it. Proposals are filtered back against the candidate list, so a
hallucinated path is dropped; nothing here creates a page. The result lands in
the PR or issue body so a maintainer can turn it into a route-table rule.

`GUIDELINE_ROUTING` (repo variable, default `propose`) controls it: `apply`
also edits the proposed pages in the same run, tagged `guideline:<source>` in
the routing log; `off` skips the call. Prompt-size caps:
`PLACEMENT_MAX_CANDIDATES` (250), `PLACEMENT_EXCERPT_LINES` (60),
`PLACEMENT_MAX_SOURCES` (25).

When a dispatch opens no PR (nothing routed, or every page came back unchanged)
but has unrouted files, the workflow files the routing report as an issue titled
`Unrouted base-std docs: <source_repo>@<sha>`, one per source sha.

### base-std `docs/` tree

Since base-std#213 the upstream docs are audience-layered (`overview.md`,
`architecture.md`, `concepts/`, `guides/`, `reference/`). The route table maps
them where `docs/ia-guidelines.md` and `docs/content-guidelines.md` put that
kind of content: chain-generic precompile mechanics to Base Protocol →
Execution, the B20 component map and key concepts to the specification
overview, execution and versioning guarantees to the invariants page, how-to
guides to the existing Build on Base task pages, and reference tables to the
B20 supporting pages. Pages above the regeneration budget
(`MAX_REGENERABLE_CHARS`) are skipped with a logged reason and need a human
edit.

## Local checks

From the copied `docs-repo` root:

```bash
npm ci --prefix scripts --no-audit --no-fund
npm --prefix scripts run test:base-std-sync
```

A real transformation requires `LLM_GATEWAY_API_KEY`:

```bash
LLM_GATEWAY_API_KEY=... \
  node scripts/sync-from-base-std/index.mjs \
  --payload scripts/sync-from-base-std/fixtures/code-change-ib20.json
```

`fixtures/code-change-docs-restructure.json` is the real file list from
base-std@be6d045 with its `removed_paths`; run it the same way to exercise the
docs-tree routes and the placement pass (set `RUNNER_TEMP` to see the routing
report written as `sync-review.md`).

Configuration knobs are optional positive numbers:

- `CODE_CHANGE_PAGE_CONCURRENCY` (default `4`)
- `RELEASE_PAGE_CONCURRENCY` (default `4`)
- `CLAUDE_MAX_TOKENS` and `CLAUDE_MODEL`
- The bounded release manifest/selection settings documented in `index.mjs`

## Source PR attribution

For `code-change` dispatches the workflow @mentions the source PR author in
the docs PR body and requests them as a reviewer, so the person who wrote the
change sees the docs that describe it. The merger is named alongside, without
a mention.

Both logins are read from the GitHub API response for the source PR in the
"Verify payload provenance" step, after that PR is confirmed merged into `main`
of an allowlisted source repo. The dispatch payload carries no author field:
it would be spoofable by any `DOCS_REPO_TOKEN` holder, and `client_payload` is
already at GitHub's 10-property ceiling. Logins are shape-checked
(`[A-Za-z0-9-]`, 1-39 chars, no leading `-`) before use; bot identities and
anything malformed are dropped silently.

The review request is best-effort. It returns HTTP 422 when the author lacks
read access to this repo, and the workflow logs a warning instead of failing.
A review request grants no permission and cannot satisfy required approvals.
