# Contribution Guidelines

How to contribute to Base documentation. This guide covers setup, writing standards, page placement, and the review process.

---

## Getting Started

### Prerequisites

- Node.js 18+
- [Mintlify CLI](https://mintlify.com/docs/development)

### Local Development

```bash
cd docs
mintlify dev
```

The site runs at `http://localhost:3000`. Changes hot-reload automatically.

### Repository Structure

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

---

## Writing Standards

### Every Page Requires Frontmatter

```yaml
---
title: "Clear, Keyword-Rich Title"
description: "Concise description explaining the page's purpose and value."
---
```

- **Title**: Use title case. Capitalize all words except short conjunctions and articles (e.g., "Integrate an Earn Product").
- **Description**: Mintlify renders this as a visible subtitle below the page title. Write it for humans, not just SEO.

### Language and Style

- American English
- Second person ("you") for instructions
- Active voice over passive voice
- Present tense for current states, future tense for outcomes
- Define jargon when first used
- Parallel structure in lists and headings
- Action-oriented names when possible — "Integrate DeFi" not "DeFi Integration"
- Enterprise tone for financial use cases — "Integrate Borrowing" not "Get a Loan"

### Content Organization

- Lead with the most important information (inverted pyramid)
- Progressive disclosure: basic concepts before advanced ones
- Break complex procedures into numbered steps
- Use descriptive, keyword-rich headings
- Group related information with clear section breaks
- Focus on user goals rather than system features
- Include troubleshooting for likely failure points

### Code Examples

- Every code block must have a filename or title after the language tag
- Highlight key lines: ` ```typescript highlight={1-2,5} `
- Code blocks longer than 7 lines: add `lines` for line numbers and `expandable`
- Use `wrap` to prevent horizontal scrolling
- Always include complete, runnable examples
- Use realistic data — no `foo`, `bar`, or `example.com`
- Never include real API keys or secrets

### Images

- Wrap in `<Frame>` with a descriptive `alt` attribute
- Place image files in `docs/images/` organized by topic

### Accessibility

- Descriptive alt text for all images
- Specific link text — never "click here"
- Proper heading hierarchy starting with H2
- Sufficient color contrast in examples

---

## Where to Put New Pages

Pages are organized across six tabs. Use this decision tree:

1. **Is it a protocol specification?** → Specifications
2. **Is it a hardfork change or migration guide?** → Upgrades
3. **Is it SDK or API documentation?** → SDKs & APIs
4. **Does it teach how to build a specific product?** → Build on Base
5. **Is it about connecting infrastructure to Base?** → Specifications (Base Protocol landing)
6. **Is it an entry point for new developers?** → Get Started

### Tab Overview

| Tab | Audience | Contains |
|-----|----------|----------|
| **Get Started** | First-time visitors | Quickstarts, solution overviews, funding, coding agents |
| **Build on Base** | Developers building products | Step-by-step implementation guides by use case |
| **Specifications** | Protocol engineers, integrators | Core Primitives, Network Systems, node operations, reference |
| **SDKs & APIs** | Developers using SDKs/APIs | Base Account SDK, Base Chain API, quickstarts |
| **Upgrades** | Node operators, integrators | Hardfork overviews, changelog entries, migration guides |

### Rules

- A page appears in exactly one tab. If it fits two, prefer the more specific one.
- Hardfork-specific content always goes in Upgrades, even if it relates to a feature documented elsewhere.
- Get Started pages are entry ramps — they link to deeper sections, never duplicate content.
- Concept explainers that support integration go in Specifications > Reference, not in Build on Base.

For the full tab and section breakdown, see [ia-guidelines.md](ia-guidelines.md).

---

## Navigation

Edit `docs/docs.json` to add or remove pages from the sidebar.

- **Adding a page**: Add the path to the appropriate group in `docs.json`.
- **Removing a page**: Always add a redirect in `docs.json` before deleting. Never remove a URL without a redirect.
- **Reordering**: Items appear in the sidebar in the order listed in `docs.json`.
- **Grouping**: A feature gets its own nested nav group when it has 3+ pages. Features with 1–2 pages sit as flat entries.

---

## Specification Pages

Spec pages in Core Primitives and Network Systems follow a specific structure. See [content-guidelines.md](content-guidelines.md) for the full reference.

### Page Types

| Type | Purpose |
|------|---------|
| **Overview / index** | What the feature is, why it exists, how pieces fit together |
| **Reference page** | One page per contract or interface — every function, error, event |
| **Supporting page** | Constants, errors, events, invariants collected across a subsystem |
| **Changelog summary** | Per-hardfork summary linking to detail entries in Upgrades |

### Writing Rules

- **Be normative, not tutorial.** Spec pages define how something works, not how to use it.
- **Code over prose.** Show the Solidity signature, then explain.
- **Tables for enumerations.** Roles, policy types, error codes — always tables, never bullets.
- **Link, don't duplicate.** Reference pages link to the overview for context and vice versa.

---

## Changelog Entries

Upgrade pages follow a structure inspired by improvement proposals (TIPs, EIPs). See [content-guidelines.md](content-guidelines.md) for the full template.

### Required Sections

| Section | Purpose |
|---------|---------|
| **Abstract** | One-paragraph summary: what changed, what it affects, which hardfork |
| **Motivation** | Why this change exists |
| **What Changed** | The substance — show before/after diffs for contract changes |
| **Migration** | What developers or operators need to do |

### File Naming

```
{ordinal}-{hardfork}-{component}-{feature}.mdx
```

Examples: `02-cobalt-b20asset-multiplier.mdx`, `02-cobalt-policyregistry-composite-policy.mdx`

---

## Components

Use the right Mintlify component for the content type:

| Component | Use for |
|-----------|---------|
| **Steps** | Sequential procedures |
| **Tabs** | Platform-specific or alternative approaches |
| **CodeGroup** | Same concept in multiple languages |
| **Accordions** | Progressive disclosure |
| **Cards / CardGroup** | Navigation grids linking to related pages |
| **ParamField / ResponseField** | API parameter and response documentation |
| **Expandable** | Nested object properties |

See [mintlify-reference.md](mintlify-reference.md) for full syntax examples.

---

## Placeholder Pages

New pages without content use this format:

```yaml
---
title: "Page Title"
description: "Brief description"
---

Coming Soon
```

---

## Governance

### Adding Solutions or Use Cases

Before adding a new solution to Get Started or Build on Base, or renaming an existing section, you need approval from **Eric Brown** and **Mind Apivessa**. Mind Apivessa is responsible for getting approvals from BD and GTM.

Solutions are ordered by prominence. Current order:

1. Integrate DeFi
2. Tokenize Assets
3. Issue Stablecoins
4. Accept Payments

### IA Changes

Structural changes to the information architecture — adding tabs, renaming sections, moving pages between tabs — should be discussed before implementation. Reference [ia-guidelines.md](ia-guidelines.md) for the current structure and decision log.

---

## Before Submitting

1. **Run the linter** and fix all errors
   ```bash
   node scripts/lint-mdx.js
   ```
2. **Add redirects** for any removed or moved pages
3. **Verify links** work — broken links block deployment
4. **Preview locally** with `mintlify dev` to check rendering
5. **Check frontmatter** — every page needs `title` and `description`
6. **Title case** — all headings and page titles use title case

---

## Reference Files

| File | Purpose |
|------|---------|
| [content-guidelines.md](content-guidelines.md) | Writing rules, spec page structure, changelog format |
| [ia-guidelines.md](ia-guidelines.md) | What belongs in each tab and section |
| [mintlify-reference.md](mintlify-reference.md) | Mintlify component syntax |
| [scripts/README.md](https://github.com/base/docs/blob/master/scripts/README.md) | Linter usage |
