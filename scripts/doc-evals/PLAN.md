# Doc-sync quality evals: build plan

Status: approved for build. Owner/reviewer: senior agent (parent session). Builders: Sonnet 5 workers.

## Why

The base-std docs sync (`.github/workflows/base-std-docs-sync.yml` →
`scripts/sync-from-base-std/index.mjs`) asks Claude to edit docs pages and opens a PR.
It blocks unsafe output, but nothing measures whether a reviewer would merge the result.
Of 10 bot PRs, 1 merged, 1 closed, 8 still open; several were replaced by hand-written
pages. Reviewer comments show recurring failures:

| Failure | Evidence |
|---|---|
| Scope creep (edits unrelated guides, old changelogs) | #1968 review: "diff should just be the new changelog + update statically generated references"; inline comments on `request-a-payment.mdx`, `announce-a-distribution.mdx`, `02-cobalt-b20asset-multiplier.mdx` |
| Paraphrasing the upstream changelog instead of following it | #1968 inline on `03-denim-b20-transfer-executor-enforcement.mdx` |
| Ungrounded / wrong facts (selectors, behavior, invalid Solidity) | #1939 follow-up comment (enum selectors hashed wrong, `effectiveAt()` behavior, invented constants) |
| Housekeeping callouts ("source file removed") | #1928 closing comment (13 banners) |
| Style / naming (title case, em dashes, fence titles, author last names) | #1939 follow-up, #1919 inline comments |

Method follows "Automating eval design and hillclimbing" (Claude blog): real cases first,
cheapest grader that works, claim-based LLM rubric, judge calibrated against a human,
train/held-out split, keep a change only when both improve beyond noise.

## Scope

Base-std sync bot only. Scores are informational: nothing blocks a merge.

Deliverables:

1. **Replay harness**: frozen cases from past bot runs, rerun the sync locally in a
   throwaway worktree, capture output. (Lane A)
2. **Graders**: code checks, claim-based LLM judge, blinded pairwise vs human reference,
   judge variance check, human calibration tool. (Lane B)
3. **Merge-rate + feedback mining**: pipeline-level metrics from GitHub, review comments
   turned into candidate eval cases, weekly non-blocking report issue. (Lane C)
4. **Hillclimb loop**: proposes patches to the prompt/route table, keeps them only if
   train and held-out both improve beyond noise. (Phase 2, after A+B merge)

Everything lives under `scripts/doc-evals/` except the report workflow
(`.github/workflows/doc-quality-report.yml`).

## Ground rules for every lane

- Work only in your assigned worktree and branch. Commit locally. Never push, never open
  PRs, never run the real GitHub workflow, never write to GitHub (issues, comments, labels).
- Touch only the paths your lane owns (below). If you believe another path must change,
  stop and report instead.
- Do not change the behavior of `scripts/sync-from-base-std/**`, `docs/**`, or
  `.github/workflows/base-std-docs-sync.yml`. Import from them; don't edit them.
- No new npm dependencies. Node 22 built-ins only, plus the existing
  `@anthropic-ai/sdk` via `scripts/sync-from-base-std/llm/client.mjs` (`complete()`).
  Run `npm ci --prefix scripts --no-audit --no-fund` once in your worktree.
- ESM `.mjs`, same style as `scripts/sync-from-base-std/` (JSDoc on exports, small pure
  functions, comments that explain *why*).
- Unit tests in `scripts/doc-evals/__tests__/<lane>-*.test.mjs`, run with `node --test`.
  Tests must be offline: no network, no LLM, no `gh`. Put tiny fixtures in
  `scripts/doc-evals/__tests__/fixtures/`.
- Live LLM calls use `LLM_GATEWAY_API_KEY` (already set locally). Keep live smoke runs
  small (1–2 small cases, 1 replicate). Log token usage.
- Never print secrets. `gh auth token` may be passed to child processes via env, never logged.
- Test files run in CI through the root `npm test`, where `scripts/node_modules` is NOT
  installed. Anything a test imports must not statically import
  `scripts/sync-from-base-std/index.mjs` or `llm/client.mjs` (they pull in
  `@anthropic-ai/sdk`). Import those lazily (`await import(...)`) inside the function
  that needs them. `safety.mjs` and `scripts/lint-mdx.js` are dependency-free and fine.
- `scope.label_source: "drafted"` labels come from the current route table and inherit
  its scope creep. Treat them as unconfirmed: scope checks report them but must not count
  toward scores until a human confirms (label_source becomes "review").
- Commit messages: conventional (`feat(evals): ...`). Do not add a Co-authored-by trailer.

## Shared contracts (all lanes code against these)

### Case file: `scripts/doc-evals/cases/<id>.json`

`<id>` = `<short-sha>-<slug>`, e.g. `253bb15-transfer-executor`.

```jsonc
{
  "id": "253bb15-transfer-executor",
  "source_repo": "base/base-std",
  "source_sha": "<40-char sha>",
  "bot_pr": 1968,                      // docs PR the bot opened (null for hand-written cases)
  "docs_base_commit": "<sha>",          // docs repo state the bot started from (parent of the bot's first commit)
  "payload": { /* full client_payload as index.mjs reads it; diff frozen inline */ },
  "reference": {                        // null when no human-merged answer exists
    "commit": "<sha>",                  // docs commit whose tree holds the human answer
    "pr": 2025,
    "pages": ["docs/.../03-denim-b20-transfer-executor-enforcement.mdx"]
  },
  "scope": {
    "in": ["docs/..."],                 // pages a good run should touch
    "out": ["docs/..."],                // pages a good run must NOT touch (from review comments)
    "label_source": "reference|review|drafted"   // drafted = needs human confirmation
  },
  "review_findings": [                  // from real review comments; used by graders and hillclimb
    { "page": "docs/...", "type": "scope|paraphrase|fact|housekeeping|style|naming|other",
      "text": "verbatim reviewer comment", "url": "https://github.com/..." }
  ],
  "split": "train|test",
  "heavy": false,                       // true = many pages / expensive; excluded by default
  "legacy_layout": false,               // true = docs base predates the IA overhaul; current route table can't resolve it; excluded by default
  "notes": ""
}
```

### Replay output: `scripts/doc-evals/runs/<run-id>/<case-id>/rep-<n>/` (gitignored)

| File | Content |
|---|---|
| `meta.json` | `{ caseId, rep, runId, candidateRef, model, startedAt, durationMs, exitCode, touched: [paths], rejected: [{page, reason}], unchanged: [paths] }` |
| `diff.patch` | `git diff` of the replay worktree after the sync ran |
| `after/<path>` | full content of every touched page after the run |
| `before/<path>` | the same pages at `docs_base_commit` |
| `bench.jsonl` | copied from the sync's `.sync-bench/` |
| `sync.log` | stdout+stderr of the sync |

### Grader result: `grade(...)` returns, and the CLI writes `grade.json` next to `meta.json`

```jsonc
{
  "caseId": "...", "rep": 1,
  "checks": [
    { "id": "scope.precision", "layer": "code|judge|pairwise", "page": "docs/...|null",
      "pass": true, "score": 1.0, "detail": "short human-readable reason" }
  ],
  "summary": {
    "code": 0.0,          // mean of code-check scores (0..1)
    "judge": 0.0,         // mean of judge claim pass rate (0..1), null if judge skipped
    "pairwise": 0.0,      // win=1, tie=0.5, loss=0 vs reference; null if no reference
    "overall": 0.0,       // see "Overall score" below
    "cost": { "inputTokens": 0, "outputTokens": 0 }
  }
}
```

**Overall score** (keep this simple and documented in code):
`overall = 0.4 * scope + 0.25 * code + 0.2 * judge + 0.15 * pairwise`, dropping missing
terms and renormalizing weights. `scope` = F1 of scope.precision and scope.recall (null
for unconfirmed drafted labels); `code` = mean of the other code checks. (Changed in
senior review 2026-09-30: with scope folded into `code`, a run touching 9 pages when 3
were right still scored 0.98, leaving no headroom on the main reviewer complaint.) A case with a validator crash or zero touched pages when
`scope.in` is non-empty scores 0.

## Lane A: replay harness

Branch `evals/harness`. Owns: `scripts/doc-evals/cases/**`, `scripts/doc-evals/replay/**`,
`scripts/doc-evals/build-cases.mjs`, `scripts/doc-evals/.gitignore`,
`scripts/doc-evals/README.md`, `scripts/doc-evals/__tests__/harness-*`.

1. `build-cases.mjs`: builds case files from a small seed list (below). For each:
   - `docs_base_commit` = parent of the bot PR's first commit (`gh pr view --json commits`,
     then `git rev-parse <first>^`). Verify it exists locally (`git fetch` if needed).
   - Reconstruct the payload the way the workflow does (read "Materialize dispatch
     payload", "Fetch diff artifact", and "Derive trusted removed paths" in the workflow):
     changed paths and removed paths from the GitHub commit API for `source_sha`, the
     diff from `repos/base/base-std/commits/<sha>` with the diff media type, applying the
     same caps/truncation the workflow applies. Freeze it inline. base-std is public.
   - `reference`: set for the cases listed with a reference below. `reference.pages` =
     docs pages the reference PR changed that correspond to this source change.
   - `scope.in`: reference pages when a reference exists (`label_source: "reference"`);
     otherwise draft from the route table + diff (`"drafted"`). `scope.out`: pages
     reviewers said should not change (`"review"`).
   - `review_findings`: pull reviews, review comments, and inline comments of the bot PR
     (skip bots: mintlify, cb-heimdall). Classify `type` by hand-written keyword rules;
     keep verbatim text and URL.
   - Idempotent; `--only <id>` rebuilds one.
2. Seed list (bot PR → source sha, split, reference):

   | Bot PR | Source sha | Split | Reference | Notes |
   |---|---|---|---|---|
   | #1853 | 04d645a | train | – | legacy layout, excluded by default |
   | #1854 | 6bb10a4 | train | – | legacy layout, excluded by default |
   | #1916 | 868d513 | test | – | |
   | #1919 | db537f3 | test | – | review: author last name |
   | #1926 | 64bd955 | train | – | |
   | #1928 | be6d045 | train | #1939 merge `1a0460986a` | heavy; #1928 is the closed bad run, #1939 the human-fixed answer |
   | #1968 | 253bb15 | train | #2025 merge `9c827d61c4` | review: scope creep, paraphrase |
   | #1973 | 91427ab | test | #2025 merge `9c827d61c4` | |
   | #1991 | 1505323 | train | #2025 merge `9c827d61c4` | |

   Confirm each source sha by the bot PR title `(base-std@<sha>)` and resolve to full sha.
3. `replay/run.mjs` CLI:
   `node scripts/doc-evals/replay/run.mjs [--cases id,id|--split train|test|all] [--include-heavy] [--reps N] [--candidate <path-to-scripts/sync-from-base-std dir, default: current checkout>] [--run-id X] [--concurrency N]`
   - For each case/rep: `git worktree add --detach <tmp> <docs_base_commit>`, then overlay
     the candidate `scripts/sync-from-base-std/` directory (and `scripts/node_modules`
     via symlink) onto it, so the *docs content* is historical but the *sync code/prompts*
     are the candidate. Write the payload to a temp file and run
     `node scripts/sync-from-base-std/index.mjs --payload <file>` inside the worktree with
     `RUNNER_TEMP=<tmp>/.runner`, `GITHUB_OUTPUT` unset, `SOURCE_REPO_TOKEN` from
     `gh auth token` when available, and a timeout.
   - Collect the output files listed in the contract, then remove the worktree (always,
     including on failure; `git worktree prune`).
   - Parse touched/rejected/unchanged from the sync's stdout log lines; document the
     patterns you rely on in a comment.
   - Also export `replayCase(caseDef, opts)` for programmatic use by the hillclimb.
4. `scripts/doc-evals/README.md`: what this is, how to build cases, run a replay, cost notes.
5. Tests: case schema validation, payload reconstruction helpers (from a tiny recorded
   API response fixture), log parsing.
6. Acceptance: all 9 case files built and schema-valid; one live replay of one small case
   (not heavy) completes and produces every contract file. Report its token usage.

## Lane B: graders

Branch `evals/graders`. Owns: `scripts/doc-evals/graders/**`, `scripts/doc-evals/grade.mjs`,
`scripts/doc-evals/calibrate.mjs`, `scripts/doc-evals/__tests__/graders-*`.
Code against the contracts; build your own tiny fake run directories for tests.

1. Code checks (`graders/code.mjs`), each returns contract `checks[]` entries:
   - `scope.precision` / `scope.recall` vs `scope.in`; `scope.forbidden`: fail per touched
     page in `scope.out`. Ignore generated index files (`docs/AGENTS.md`, `docs/llms*.txt`).
   - `grounding`: every backticked identifier or `0x…` value on *added* lines must appear in
     the payload diff, the before-page, or source files the payload lists. Report the
     ungrounded tokens. Keep a small documented stoplist (common words, types like `uint256`).
   - `selector`: find `signature ↔ 4-byte selector` pairs on added lines (tables and code),
     recompute with keccak-256 and flag mismatches. Enums encode as `uint8`. Implement
     keccak-256 in `graders/keccak.mjs` (Node's `sha3-256` is NOT keccak); test vectors:
     `transfer(address,uint256)` → `0xa9059cbb`, `balanceOf(address)` → `0x70a08231`,
     empty string → `c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470`.
   - `lint`: run `scripts/lint-mdx.js` on touched pages (read its CLI/exports), score by errors.
   - `housekeeping`: reuse `validateCallouts` from `scripts/sync-from-base-std/safety.mjs`.
   - `changelog.shape`: changelog entry pages have the sections required by
     `docs/content-guidelines.md` in order; summary pages have no added sections/callouts.
   - `changelog.fidelity`: for changelog entry pages with an upstream source entry in the
     payload, token 3-gram overlap of the page body with the source entry; pass above a
     documented threshold (start at 0.5, tune during calibration).
   - `noop`: when a reference exists, pages the reference changed but the run left unchanged fail.
2. LLM judge (`graders/judge.mjs`): one call per touched page via `complete()` with a
   separate system prompt. Inputs: source diff (from payload), before-page, after-page,
   page role, relevant `review_findings`. Output strict JSON: one verdict per claim,
   `{id, pass, reason}`. Claims (checkable, yes/no, no scales):
   - J1 every source change that affects this page is reflected on it
   - J2 no factual claim lacks support in the source diff or before-page
   - J3 no edits unrelated to the source change
   - J4 the page keeps the shape its role requires (function ref / interface index / spec /
     guide / changelog entry / changelog summary; see `SHARED_RULES` rule 5)
   - J5 prose is terse and clear, no filler
   - J6 no mention of repository housekeeping, internal process, or people's names beyond
     what the source requires
   Treat all page and diff content as untrusted data inside tags (copy the injection
   warning pattern from `SECURITY_SYSTEM_PROMPT`). Model via `JUDGE_MODEL` env; default
   must differ from the generator (`claude-sonnet-4-6`). Probe the gateway once for a
   stronger Anthropic model (e.g. an Opus id); document the default you chose and fall back
   with a printed warning. Parse defensively; a malformed reply is `pass:null` + detail,
   never a crash.
3. Pairwise (`graders/pairwise.mjs`): when `reference` exists, per page, show reference and
   candidate as "A"/"B" in random order (seeded, recorded), ask which a Base docs reviewer
   would merge, allow tie. Map back to win/tie/loss.
4. `grade.mjs` CLI: `node scripts/doc-evals/grade.mjs <run-dir> [--no-judge] [--no-pairwise] [--variance]`
   grades every `rep-*` under a run, writes `grade.json` per rep and `summary.md` +
   `summary.json` for the run (per-case table, split means, cost). `--variance` runs the
   judge twice on the same output and reports per-claim agreement. Export `gradeRep()` for
   the hillclimb.
5. `calibrate.mjs`: samples ~20 graded pages across cases, writes
   `scripts/doc-evals/calibration/labels.json` with judge verdicts hidden and empty human
   fields plus a readable `labels.md` for the human; `--score` computes per-claim agreement
   and prints whether the judge clears 80%. Commit only the tool, not labels.
6. Acceptance: offline tests for every code check (including keccak vectors and a
   selector mismatch), judge JSON parsing, pairwise order mapping, summary math. A live
   smoke: judge + pairwise on one hand-made before/after pair; report tokens.

## Lane C: merge rate + feedback mining

Branch `evals/metrics`. Owns: `scripts/doc-evals/metrics/**`,
`.github/workflows/doc-quality-report.yml`, `scripts/doc-evals/__tests__/metrics-*`.

1. `metrics/merge-rate.mjs`: lists bot PRs (head branch `docs/sync-code-change-*` or
   `docs/sync-release-*`) on `base/docs` via GitHub REST (token from `GITHUB_TOKEN` or
   `gh auth token`; plain `fetch`, paginate; avoid GraphQL). Reports: opened, merged,
   closed-unmerged, open, open-and-stale (>7 days no activity), merge rate, median time
   to merge, and for merged PRs the share of lines changed by non-bot commits after the
   first bot commit (human rewrite ratio). Also flag "superseded" open PRs: another merged
   PR later changed the same pages. Output `metrics.json` + a markdown section. `--since`.
2. `metrics/mine-feedback.mjs`: pulls reviews, review comments, and issue comments of bot
   PRs (skip mintlify, cb-heimdall, other bots), classifies each into the failure taxonomy
   (`scope|paraphrase|fact|housekeeping|style|naming|other`) with documented keyword rules
   (optional `--llm` flag uses `complete()` with Haiku; off by default), and writes
   candidate cases to `scripts/doc-evals/cases/_candidates/<sha>-<pr>.json` using the case
   schema with `split: null` and `scope.label_source: "drafted"`. Never writes to
   `cases/` directly; a human promotes candidates. Also prints taxonomy counts.
3. `.github/workflows/doc-quality-report.yml`: weekly schedule + `workflow_dispatch`.
   Runs both scripts (heuristic mode only), then creates or updates a single issue titled
   `Docs sync quality report` with the markdown (find by exact title; update body). Follow
   this repo's hardening pattern exactly as in `docs-style-conformance.yml` and
   `base-std-docs-sync.yml`: `step-security/harden-runner` pinned by SHA, pinned action
   SHAs, top-level `permissions: {}` and job-level `contents: read`, `issues: write`,
   `pull-requests: read`; no `${{ github.event.* }}` inside `run:`; REST via `curl`/`node`,
   no third-party actions beyond checkout/setup-node. Non-blocking by design: no PR trigger.
4. Tests: taxonomy classification, stats math (median, rate, rewrite ratio) from recorded
   API fixtures, pagination helper, issue body rendering.
5. Acceptance: offline tests pass; a live read-only run of both scripts against base/docs
   prints current numbers (expect ~10 bot PRs, ~1 merged). Do not create the issue; add a
   `--dry-run` that prints the issue body and use it.

## Phase 2: hillclimb (after A and B are reviewed and merged)

Branch `evals/hillclimb` from the integrated branch. Owns: `scripts/doc-evals/hillclimb/**`,
`scripts/doc-evals/__tests__/hillclimb-*`.

- `hillclimb/run.mjs --rounds 5 --reps 2 --max-usd 25 [--surface prompts|route-table|both] [--no-judge]`
- Loop: baseline train+test (reps R) → noise = max per-split stdev across reps →
  proposer (strong model via `complete()`) sees ONLY train failures (check details, judge
  reasons, review findings, diffs), the current `llm/prompts.mjs` and `route-table.json`,
  and the failure taxonomy; returns one root-cause patch as a unified diff with a
  rationale → apply to a scratch copy of `scripts/sync-from-base-std/` → reject unless
  it touches only allowed files and `npm --prefix scripts run test:base-std-sync` passes →
  replay + grade train and test → keep iff `trainΔ > noise && testΔ > 0`; if train up
  but test flat/down, revert and log "possible overfit" → after 2 consecutive non-keeps,
  run a reflection call that groups remaining train failures by root cause, write it to
  the report, and stop.
- Allowed edit surface: `scripts/sync-from-base-std/llm/prompts.mjs`,
  `scripts/sync-from-base-std/route-table.json`. Never graders, cases, validators,
  `safety.mjs`, `index.mjs`, or `docs/*-guidelines.md` (governance-protected).
- Test cases' content, findings, and diffs never enter the proposer prompt.
- Judge scores count in decisions only if `calibration/labels.json` exists and clears
  80%; otherwise decide on code + pairwise and say so in the report.
- Output: `runs/hillclimb-<ts>/report.md` (round table: patch summary, train/test before
  and after, noise, cost, decision) and each kept patch as a local commit on
  `evals/hillclimb-results`. Never push.
- Default excludes heavy cases; enforce `--max-usd` from bench token counts using a
  documented price table.

## Review and integration (parent)

1. Lanes A, B, C in parallel, separate worktrees. Each returns: changed files, test output,
   live smoke output + tokens, open questions, anything skipped.
2. Parent reviews each diff, sends fixes back to the same lane, merges into
   `docs/improve-agent-doc-writing-skills`, and adds `scripts/doc-evals/__tests__/*.test.mjs`
   to the root `npm test` glob.
3. Parent runs a baseline replay + grade on the non-heavy cases.
4. Human: confirm `drafted` scope labels; fill `calibration/labels.json`.
5. Phase 2 hillclimb lane, parent review, first hillclimb run with a low budget.

## Decisions (docs owner, 2026-09-30)

These override anything above that conflicts.

1. **Changelog entry pages follow the upstream entry closely.** Keep the upstream
   content and structure (including its diagrams), adapted only to the docs page shape
   and style rules. The human-merged Denim entries (#2025) are condensed rewrites, so
   pairwise is skipped for `changelog-entry` pages; `changelog.fidelity` and the judge
   cover them. Proposing the same rule for `docs/content-guidelines.md` is a follow-up
   (governance-protected, needs a Governance Owner).
2. **Confirmed scope (`label_source: "review"`)** for 64bd955, 868d513, db537f3 (see
   `build-cases.mjs` seeds). All three forbid `docs/build-on-base/` entirely.
   `scope.out` entries ending in `/` are directory rules.
3. **Changelog-only source changes** may touch the matching entry pages plus the B20
   changelog summary table.
4. **Grading errors** (judge/pairwise `pass: null`) are excluded from means and counted
   in `summary.gradingErrors`. The hillclimb must not keep or revert a patch in a round
   with `gradingErrors > 0`; it re-grades once, then skips the round and logs it.
5. Active eval set: 6 non-heavy, non-legacy cases. Train: 1505323, 253bb15, 64bd955.
   Test: 868d513, 91427ab, db537f3. `be6d045` is heavy; 04d645a and 6bb10a4 are legacy.
6. **Build on Base is off-limits to the bot everywhere** (2026-09-30, second round):
   `docs/build-on-base/` is in every case's `scope.out` and removed from `scope.in`.
   The hillclimb may drop those pages from route-table rules.
7. **Evals run with `CLAUDE_MAX_TOKENS=16000`.** At 4096 the sync truncates and rejects
   long pages (868d513 always produced nothing). Proposed production change: set the
   `CLAUDE_MAX_TOKENS` repo variable to 16000 (no code change). Baselines taken at 4096
   are not comparable with 16k runs.
8. **First improvement runs use `--no-judge`.** Judge scores count only after the
   calibration labels clear 80%.
