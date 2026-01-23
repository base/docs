# Base Documentation

Technical documentation for Base (Ethereum L2). Built with Mintlify.

## Commands

| Command | Description |
|---------|-------------|
| `mintlify dev` | Local dev server |
| `/lint` | Lint MDX files and fix issues |
| `/doc-feedback` | Review content quality |

## Structure

```
docs/
├── get-started/      # Intro, quickstarts
├── base-chain/       # Network, nodes, tools
├── base-account/     # Smart Wallet SDK
├── base-app/         # Agent development
├── mini-apps/        # MiniKit guides
├── onchainkit/       # React components (versioned)
├── cookbook/         # Tutorials
├── learn/            # Solidity, Ethereum basics
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

**Writing**: American English, sentence case headings, second person ("you"), active voice.

**Code blocks**: Always specify language. Add filename or title. Use `highlight={}` for emphasis.

**Components**: See [mintlify-reference.md](mintlify-reference.md) for syntax.

**Images**: Wrap in `<Frame>`, include `alt` attribute.

## Navigation

Edit `docs.json` to add/remove pages. Add redirects when removing pages.

## References

| File | Purpose |
|------|---------|
| [content-instructions.md](content-instructions.md) | Writing guidelines |
| [mintlify-reference.md](mintlify-reference.md) | Component syntax |
| [scripts/README.md](scripts/README.md) | Linter usage |

## Before Committing

1. Run `/lint` and fix errors
2. Add redirects for removed pages
3. Verify links work
