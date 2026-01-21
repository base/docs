# Base Documentation

Technical documentation for Base, an Ethereum L2 blockchain. Built with Mintlify.

## Quick Reference

| Command | Description |
|---------|-------------|
| `mintlify dev` | Local dev server (http://localhost:3000) |
| `mintlify install` | Reinstall dependencies |
| `node scripts/lint-mdx.js` | Lint MDX files (deterministic) |
| `/lint` | Run linter and get help fixing issues |
| `/doc-feedback` | Review docs for quality and style guide adherence |

## Repository Structure

```
docs/                    # All documentation content (MDX files)
├── get-started/         # Introduction, quickstarts, builder support
├── base-chain/          # Network info, node operations, tools
├── base-account/        # Smart Wallet, account abstraction
├── base-app/            # Agents, app development
├── mini-apps/           # Mini app development guides
├── onchainkit/          # React component library (versioned)
├── cookbook/            # Use-case tutorials
├── learn/               # Educational content (Solidity, Ethereum)
├── images/              # Assets organized by topic
├── snippets/            # Reusable MDX components
└── docs.json            # Navigation and site configuration
storybook/               # Component demos (Chromatic deployment)
```

## Documentation Sections

| Section | Path | Content Type |
|---------|------|--------------|
| Get Started | `get-started/` | Intro, quickstarts, AI prompting |
| Base Chain | `base-chain/` | Network, nodes, tools, security |
| Base Account | `base-account/` | Smart Wallet SDK, integrations |
| Base App | `base-app/` | Agent development |
| Mini Apps | `mini-apps/` | Mini app guides, MiniKit |
| OnchainKit | `onchainkit/` | React components (versioned) |
| Cookbook | `cookbook/` | Practical tutorials |
| Learn | `learn/` | Solidity, Ethereum fundamentals |

## Content Standards

### File Format

Every MDX file requires frontmatter:

```yaml
---
title: "Clear, keyword-rich title"
description: "Concise value description"
---
```

### Writing Rules

- American English spelling
- Sentence case for headings
- Second person ("you") for instructions
- Active voice, present tense
- No H1 in body (title comes from frontmatter)

### Code Blocks

- Always specify language: ` ```typescript ` not ` ``` `
- Add filename or title: ` ```typescript page.tsx ` or ` ```typescript title="Example" `
- Blocks >7 lines: add `lines` for line numbers
- Use `highlight={1-2,5}` for emphasis
- Use `wrap` to prevent horizontal scroll

### Components

Use sparingly and correctly:

**Callouts** (for important info only):
- `<Note>` - supplementary info
- `<Tip>` - best practices
- `<Warning>` - critical cautions
- `<Info>` - neutral context
- `<Check>` - success confirmation

**Structure**:
- `<Steps>` with `<Step title="...">` - procedures
- `<Tabs>` with `<Tab title="...">` - platform-specific content
- `<CodeGroup>` - same concept in multiple languages
- `<AccordionGroup>` with `<Accordion title="...">` - progressive disclosure

**Media**:
- All images wrapped in `<Frame>`
- `<img>` must have `alt` attribute

**API Docs**:
- `<ParamField path|body|query|header="..." type="...">` - parameters
- `<ResponseField name="..." type="...">` - responses

### Comments

Use MDX syntax, not HTML:
```mdx
{/* Correct */}
<!-- Wrong -->
```

## Navigation

All navigation is defined in `docs.json`:

- **Tabs**: Top-level sections (Get Started, Base Chain, etc.)
- **Groups**: Subsections within tabs
- **Pages**: Individual MDX files

When adding pages:
1. Create MDX file in appropriate directory
2. Add path to `docs.json` in correct group

When removing pages:
1. Delete MDX file
2. Remove from `docs.json`
3. Add redirect in `docs.json` redirects section

## Git

- **Primary branch**: `master`
- **Auto-deploy**: Mintlify GitHub App deploys on push to master

## Key Reference Files

| File | Purpose |
|------|---------|
| `docs.json` | Site navigation and config |
| `content-instructions.md` | Detailed writing guidelines |
| `mintlify-reference.md` | Component syntax reference |
| `scripts/lint-mdx.js` | Deterministic MDX linter |

## Before Committing

1. Run `/lint` and fix any errors
2. If removing docs, add redirects in `docs.json`
3. Verify internal links work
