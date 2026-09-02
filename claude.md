# Base Documentation

Technical documentation for Base (Ethereum L2). Built with Mintlify.

## Commands

| Command | Description |
|---------|-------------|
| `mintlify dev` | Local dev server |
| `/lint` | Lint MDX files and fix issues |
| `/doc-feedback` | Review content quality |
| `/screenshot` | Capture affected docs pages for the PR body |
| `/agents` | Generate AGENTS.md index for AI agents (also runs via `githooks/post-commit` when commit message contains `agents.md`) |
| `/llms` | Regenerate `docs/llms.txt` and `docs/llms-full.txt` (also runs via `githooks/post-commit` when commit message contains `llms.txt`) |

## Structure

```
docs/
├── get-started/      # Intro, quickstarts
├── base-chain/       # Network, nodes, tools
├── base-account/     # Smart Wallet SDK
├── ai-agents/        # Agent development
├── apps/             # Apps on Base (MiniKit, guides)
├── onchainkit/       # React components (versioned)
├── images/           # Assets by topic
├── snippets/         # Reusable MDX components
└── docs.json         # Navigation config
```

## Content Rules

**Frontmatter** (required):
```yaml
---
title: "Keyword-rich title"
description: "Value description"
---
```

**Writing**: American English, title case headings, second person ("you"), active voice.

**Code blocks**: Always specify language. Add filename or title. Use `highlight={}` for emphasis.

**Components**: See [mintlify-reference.md](docs/mintlify-reference.md) for syntax.

**Images**: Wrap in `<Frame>`, include `alt` attribute.

## Navigation

Edit `docs.json` to add/remove pages. Add redirects when removing pages.

**Sidebar labels must not repeat their parent group.** A group whose child page
carries the same label renders as a collapsible that expands to reveal one
identical entry ("Flashblocks > Flashblocks"), which reads like a bug. The
sidebar label is `sidebarTitle` if present, otherwise `title`.

- **Single-page group**: drop the group wrapper and list the page as a bare
  string in the parent's `pages` array.
- **Multi-page group**: keep the group and give the duplicate child a distinct
  `sidebarTitle` — usually `"Overview"` (or a qualified name when a sibling
  already uses "Overview").

`node scripts/validate-docs-structure.js` fails on violations; it runs in CI via
`scripts/verify-doc-samples.sh` on any `docs/**` change.

## References

| File | Purpose |
|------|---------|
| [content-guidelines.md](docs/content-guidelines.md) | Writing rules, spec page structure, changelog format |
| [docs/ia-guidelines.md](docs/ia-guidelines.md) | What belongs in each tab and section |
| [mintlify-reference.md](docs/mintlify-reference.md) | Component syntax |
| [scripts/README.md](scripts/README.md) | Linter usage |

## Before Committing

1. Run `/lint` and fix errors
2. Run `/agents` if docs structure changed
   - Or include `agents.md` / `llms.txt` in your commit message — the `githooks/post-commit` hook will regenerate the matching index files and create a follow-up commit. Enable hooks once per clone with `git config --local core.hooksPath githooks` (repo-scoped, never global).
3. Run `node scripts/validate-docs-structure.js` if `docs.json` or page frontmatter changed (nav, orphans, redirects, redundant sidebar labels)
4. Add redirects for removed pages
5. Verify links work

## Opening PRs

Every PR that changes rendered pages must include screenshots:

1. Run `/screenshot` to capture the affected pages and upload them as draft
   release assets (`gh release create screenshots-pr-<N> --draft`).
2. Fill in the **Screenshots** section of the PR template with the embedded
   images. For backend-only changes (`scripts/`, `.github/`, repo-root
   markdown), write "N/A (no user-facing changes)".
3. Screenshots live in `screenshots/` locally (gitignored) — never commit them.
4. After the PR merges, delete its draft release:
   `gh release delete screenshots-pr-<N> --yes`.

## CI Approval Gates

Structural changes to the documentation are gated by required status checks. Ordinary content
edits are unaffected — the gates only activate when a pull request touches a protected surface.

| Check | Activates when | Requires |
|-------|----------------|----------|
| `IA Gate / Get Started Pages` | Adds a page under `docs/get-started/`, or adds a page reference to the Get Started tab in `docs.json` | 3 Writer approvals |
| `IA Gate / Build on Base Solutions` | Adds, renames or removes a top-level group in the Build on Base tab | 1 Governance Owner |
| `IA Gate / Guideline Files` | Touches `docs/ia-guidelines.md` or `docs/content-guidelines.md` | 1 Governance Owner |
| `IA Gate / CI Configuration` | Touches the gate workflows, `.github/ia-governance.json`, `.github/CODEOWNERS` or `.github/scripts/` | 3 Writer approvals |
| `Docs Style / Conformance` | Always; lints the pages the PR changes | Zero lint errors |

Notes for anyone working on these:

- Config lives in [`.github/ia-governance.json`](.github/ia-governance.json) — owner handles,
  thresholds and protected path globs. Changing it needs 3 Writer approvals.
- Only approvals on the **current head SHA** count, and the author's own approval never counts.
  Pushing a new commit resets the tally.
- Reordering groups in `docs.json` does not trip a gate; renaming one does.
- Approvals are picked up by a scheduled sweep, so a check can take up to ~10 minutes to turn
  green after a review lands. `IA approval gates` also accepts a manual `workflow_dispatch`
  with a PR number if you need it sooner.
- `.github/workflows/ia-approval-gates.yml` is privileged and must stay on
  `pull_request_target` with a default-branch checkout. Read the trust-model comment at the
  top of that file before changing its triggers.
- `npm test` runs the gate engine and linter unit tests; the style workflow runs it on every
  pull request.
