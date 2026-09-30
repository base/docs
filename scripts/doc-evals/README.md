# Doc-sync quality evals — replay harness (Lane A)

This is the "replay" half of the doc-sync quality eval project described in
[`PLAN.md`](./PLAN.md). It answers one question offline, without touching
GitHub: *if we run the base-std docs sync's current code and prompts against
a real historical source change, what does it produce?*

It does **not** score anything — that's Lane B's graders
(`scripts/doc-evals/graders/**`, not yet built in this worktree). This lane
only builds frozen test cases and reruns the sync against them.

## What's here

| Path | What |
|---|---|
| `cases/<id>.json` | Frozen replay cases — see the "Case file" contract in `PLAN.md`. |
| `build-cases.mjs` | Builds `cases/*.json` from the hand-curated seed list inside it. |
| `replay/run.mjs` | CLI: replays one or more cases through a candidate sync checkout. |
| `replay/worktree.mjs` | Throwaway git worktree lifecycle (create, overlay, remove). |
| `replay/log-parser.mjs` | Parses touched/rejected/unchanged pages out of the sync's log. |
| `runs/` | Replay output (gitignored — see the "Replay output" contract in `PLAN.md`). |
| `__tests__/harness-*.test.mjs` | Offline unit tests (`node --test`). |

## Building cases

```sh
node scripts/doc-evals/build-cases.mjs            # rebuild all 9 seed cases
node scripts/doc-evals/build-cases.mjs --only 253bb15-transfer-executor,64bd955-inverted-seize-holder
```

This is idempotent and network-only (GitHub REST API against the public
`base/docs` and `base/base-std` repos — no LLM calls). It authenticates with
`gh auth token` when available and falls back to unauthenticated (rate-limited)
requests otherwise. Never edit a file under `cases/` by hand; fix the seed
list or the reconstruction logic in `build-cases.mjs` and regenerate.

To add a case: add an entry to the `SEED` array in `build-cases.mjs` (bot PR
number, source sha, split, heavy flag, and — when a human-merged answer
exists — the reference commit/PR/pages), then run with `--only <id>`.

## Running a replay

```sh
node scripts/doc-evals/replay/run.mjs --cases 868d513-seize-integrator-guidance --reps 1
node scripts/doc-evals/replay/run.mjs --split train --reps 2 --concurrency 3
node scripts/doc-evals/replay/run.mjs --split all --include-heavy
```

Flags: `--cases id,id` | `--split train|test|all`, `--include-heavy` (heavy
cases are excluded by default), `--reps N` (default 1), `--candidate <dir>`
(defaults to this checkout's `scripts/sync-from-base-std/`; point it at a
scratch copy to replay a candidate patch), `--run-id X` (defaults to a
timestamp), `--concurrency N` (default 1).

Per case/rep, this:

1. Checks out `docs_base_commit` detached into a fresh `git worktree` under
   `os.tmpdir()` — historical docs content.
2. Overlays the candidate's `scripts/sync-from-base-std/` directory (and
   symlinks its `scripts/node_modules`) — candidate sync code + prompts.
3. Runs `node scripts/sync-from-base-std/index.mjs --payload <file>` inside
   the worktree with `RUNNER_TEMP` set, `GITHUB_OUTPUT` unset, and
   `SOURCE_REPO_TOKEN` from `gh auth token` when available, under a
   30-minute timeout (mirrors the real workflow's job timeout).
4. Parses `touched`/`rejected`/`unchanged` from the captured log (see
   `replay/log-parser.mjs`'s doc comment for the exact patterns), snapshots
   before/after content of every touched page, `git diff`s the worktree, and
   copies `.sync-bench/*.jsonl`.
5. Always removes the worktree (`finally`, so a thrown error or a timeout
   still cleans up) and runs `git worktree prune`.

Output lands at `runs/<run-id>/<case-id>/rep-<n>/` with the six files in the
"Replay output" contract (`meta.json`, `diff.patch`, `before/`, `after/`,
`bench.jsonl`, `sync.log`) — see `PLAN.md`. `replayCase(caseDef, opts)` is
also exported from `replay/run.mjs` for the Phase 2 hillclimb loop to call
programmatically.

Every worktree lives under `os.tmpdir()`, created and removed only through
`git worktree` subcommands run with `cwd: REPO_ROOT` — this checkout, not any
other lane's worktree — so a bug elsewhere can't point cleanup at the wrong
directory. `scripts/doc-evals/__tests__/harness-worktree.test.mjs` covers the
create/remove lifecycle, including that cleanup still runs when the work
between create and remove throws.

## Cost notes

The sync makes one LLM call per touched page. `bench.jsonl` (copied from the
candidate's `.sync-bench/`) has the per-call token counts; sum
`inputTokens`/`outputTokens` across a run's `bench.jsonl` files for its total.
A single small case (1–2 touched pages) costs a few cents; a heavy case
(`be6d045-b20-restructure`, 63 pages in scope) is the one case worth budgeting
for — run it deliberately with `--include-heavy`, not by default. `run.mjs`
excludes `heavy: true` cases unless asked, for exactly this reason.

## Decisions on ambiguities

The plan (`PLAN.md`, "Lane A") leaves a few things to judgment. Recorded here
so a reviewer can push back on any of them:

- **Reference PR attribution.** `#1939` and `#2025` are human-written PRs
  that each squash several base-std source commits into one docs PR. There
  is no mechanical way to attribute which page in a squashed PR answers which
  single upstream commit, so `reference.pages` for `be6d045-b20-restructure`,
  `253bb15-transfer-executor`, `91427ab-policy-not-invert`, and
  `1505323-reject-self-recipient` is hand-curated in the `SEED` list, cross-checked
  against each reference PR's own commit message (`#1939`'s names `be6d045`
  directly; `#2025`'s describes the three Denim changelog entries it adds —
  token receiver, transfer executor enforcement, NOT/invert policies — which
  map 1:1 to `1505323`/`253bb15`/`91427ab`'s own topics) and against the
  actual page list of the reference commit,
  verified by diffing `git show --name-only <reference commit>` against the
  claimed `reference.pages` for every one of the four cases. Three pages
  (`docs/AGENTS.md`, `docs/llms.txt`, `docs/llms-full.txt`) are excluded
  everywhere as generated indices, per the schema note in `PLAN.md`.
- **`review_findings` includes general PR conversation comments, not just
  review bodies and inline diff comments.** The plan's contract text says
  "pull reviews, review comments, and inline comments"; GitHub's own API
  separates those from a PR's general conversation thread
  (`issues/{pr}/comments`), which is where a *closing* comment lands — e.g.
  `#1928`'s "Closing unmerged... 13 'source file removed' banners" comment,
  which is the plan's own motivating example for the housekeeping failure
  mode (see `PLAN.md`'s "Why" table). Excluding it would leave that case's
  `review_findings` empty despite being the flagship failure example, so
  `fetchReviewFindings()` pulls all three (reviews, review comments, issue
  comments), still skipping bot accounts (`mintlify[bot]`, `cb-heimdall`).
- **`payload.diff`'s cap is the 12 MiB artifact cap, not the 65536-byte inline
  cap.** The real workflow enforces two different diff caps depending on
  delivery path: `MAX_INLINE_DIFF_BYTES` (65536) for a diff embedded directly
  in the dispatch payload, and the much larger `MAX_DIFF_BYTES` (12 MiB, in
  the "Fetch diff artifact from source repo" step) for a diff too big to
  inline, uploaded as a workflow artifact and spliced in server-side. Four of
  the nine seed diffs (`be6d045` 178 KB, `04d645a` 114 KB, `db537f3` 71 KB,
  `253bb15` 70 KB) exceed the inline cap — since these bot PRs did run, their
  real dispatches must have used artifact delivery, so the artifact cap is
  the correct one to mirror when reconstructing what `index.mjs` actually
  saw. `build-cases.mjs` applies only `MAX_DIFF_BYTES`, per the plan's own
  citation of the "Fetch diff artifact" step (not "Validate payload schema",
  where the inline cap lives).
- **`changed_paths`/`removed_paths` are reconstructed from the GitHub commit
  API, not from the original dispatcher payload.** The plan says to derive
  both this way; the real workflow only ever *re-derives* `removed_paths`
  this way (`removed_paths` is always overwritten from the trusted commit
  API — see the "Derive trusted removed paths" step) and takes `changed_paths`
  from the dispatcher's own client_payload for a code-change dispatch, whose
  original content isn't recoverable after the fact. Recomputing both from
  the commit API is the best available faithful substitute, and both caps the
  workflow enforces (200 entries, 512 bytes/entry) are applied — as a hard
  failure (matching the workflow's `workflow_fail`, not a silent truncation),
  since a source commit that violates them would never have reached
  `index.mjs` for real. None of the nine seed cases are anywhere near either
  cap.
- **`pr_title`/`pr_body`/`pr_number` are approximated, not recovered.** The
  original *dispatcher* run (in base-std's own Actions) knew these; after the
  fact they're derived from the base-std commit's own message (`pr_title`
  from the commit headline, `pr_number` parsed from its trailing `(#N)`) and
  that PR's body fetched from base-std. Close enough for the sync's prompts
  (which only reference them for context), but not byte-identical to what the
  original dispatch actually sent.
- **A nav-file write counts as a touched page.** When the sync creates a new
  changelog entry page, it also writes an `[nav] added ...` line adding that
  page to `docs/docs.json`'s sidebar — a second, real file write that the
  original log-parsing missed (it only matched `[write]`/`[create]` lines for
  the *page itself*). `replay/log-parser.mjs` now also matches `[nav]` lines,
  so `docs/docs.json` correctly shows up in `meta.json`'s `touched` array and
  gets a `before/`/`after/` snapshot — which matters because every reference
  case's `scope.in` includes `docs/docs.json`.

## Live smoke test

Acceptance requires one live replay of a small (`heavy: false`) case,
producing every contract file, with reported token usage. Use the smallest
seed diff:

```sh
npm ci --prefix scripts --no-audit --no-fund   # once, if not already installed
node scripts/doc-evals/replay/run.mjs --cases 868d513-seize-integrator-guidance --reps 1
```

Requires `LLM_GATEWAY_API_KEY` in the environment. See the top-level report
for this lane's actual smoke output and token counts.
