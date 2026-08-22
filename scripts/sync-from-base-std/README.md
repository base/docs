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

Configuration knobs are optional positive numbers:

- `CODE_CHANGE_PAGE_CONCURRENCY` (default `4`)
- `RELEASE_PAGE_CONCURRENCY` (default `4`)
- `CLAUDE_MAX_TOKENS` and `CLAUDE_MODEL`
- The bounded release manifest/selection settings documented in `index.mjs`
