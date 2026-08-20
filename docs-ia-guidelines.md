# Documentation IA guidelines

Where to place new pages across the Base documentation tabs and sections.

## Tabs

### Get Started

**Audience:** New developers exploring Base for the first time.

**What goes here:** Entry points, quickstarts, use-case overviews (not implementation guides), funding programs, and AI agent resources.

**Decision test:** Would someone who has never used Base need this page in their first session?

**What doesn't belong:** Implementation guides (→ Build on Base), protocol specs (→ Specifications), SDK reference docs (→ SDKs & APIs), hardfork details (→ Changelog). Don't put full tutorials here — link to them from Solutions instead.

| Section | Purpose |
|---------|---------|
| Start Here | First-touch pages: connect, get funds, make a transaction |
| Solutions | Use-case overviews: stablecoins, DeFi, stock tokens, payments, private transactions |
| References | Pointers to deeper sections (chain overview, SDKs) |
| Get Funded | Grants, ecosystem fund, batches |
| Coding Agents | AI agent setup, MCP, llms.txt |

### Build on Base

**Audience:** Developers actively building a product on Base.

**What goes here:** Step-by-step implementation guides organized by use case. Each section walks through building a specific product end to end.

**Decision test:** Does this page teach someone how to build or ship something specific?

**What doesn't belong:** Concept explainers without code (→ Integrate Base > Reference), chain configuration or RPC setup (→ Integrate Base), protocol-level specs (→ Specifications), SDK API reference pages (→ SDKs & APIs). If the page doesn't have a developer doing something by the end, it probably belongs elsewhere.

| Section | Purpose |
|---------|---------|
| Build on Base | Overview, testnet setup |
| Issue Stablecoins | Full guide: deploy, mint, burn, freeze, pause, memos |
| Integrate DeFi | Lending, borrowing, earn products |
| Tokenize Stocks | Create tokens, issue shares, dividends, splits |
| Accept Payments | Human and agent payments, verification, subscriptions |
| Private Transactions | Ledger deposits, transfers, withdrawals |

### Integrate Base

**Audience:** Teams connecting existing infrastructure to Base — wallets, bridges, exchanges, RPC providers, node operators.

**What goes here:** Chain configuration, endpoints, wallet setup, bridge guides, and operational reference. Not concept explainers — practical integration information.

**Decision test:** Is this page needed to connect an existing system to Base?

**What doesn't belong:** Step-by-step product tutorials (→ Build on Base), protocol specifications (→ Specifications), SDK usage guides (→ SDKs & APIs), hardfork migration notes (→ Changelog). General "how Base works" explainers go in the Reference subsection here, not at the top level.

| Section | Purpose |
|---------|---------|
| Integrate Base | Overview, connecting to Base, RPC providers, faucets, bridges |
| Reference | How Base works under the hood: transaction ordering, finality, throughput, fees, Flashblocks, troubleshooting |
| Node Operators | Running and maintaining Base nodes |
| Security | Security council, vulnerability reporting |

### Specifications

**Audience:** Protocol engineers, auditors, and deep technical readers.

**What goes here:** Formal protocol specifications, not guides or tutorials. If the page defines how something works at the protocol level, it belongs here.

**Decision test:** Is this a protocol-level specification or formal reference?

**What doesn't belong:** Integration how-tos (→ Integrate Base), product tutorials (→ Build on Base), hardfork upgrade summaries or migration guides (→ Changelog), SDK usage docs (→ SDKs & APIs). Concept explainers aimed at integrators go in Integrate Base > Reference, not here. If the page is primarily about what a developer should do rather than how the protocol works, it belongs elsewhere.

| Section | Purpose |
|---------|---------|
| Specifications | Protocol overview, batcher, bridging, consensus, execution, proofs |
| B20 | B20 token standard specification and changelog |
| Reference | Contract addresses, glossary, configurability |

### SDKs & APIs

**Audience:** Developers using Base SDKs and APIs in their code.

**What goes here:** SDK documentation, API references, quickstarts, and guides specific to a particular SDK or API.

**Decision test:** Is this page about using a specific SDK or API?

**What doesn't belong:** End-to-end product tutorials that happen to use an SDK (→ Build on Base), protocol specifications (→ Specifications), chain configuration or RPC setup (→ Integrate Base), hardfork notes (→ Changelog). A page that uses the SDK as a tool in a larger workflow belongs in Build on Base; only SDK-focused docs (quickstarts, API reference, SDK-specific guides) go here.

| Section | Purpose |
|---------|---------|
| Overview | SDK and API index |
| Base Account SDK | Wallet, auth, payments SDK docs |
| Base Chain API | Chain-level API reference |

### Changelog

**Audience:** Node operators, integrators, and anyone tracking Base network changes.

**What goes here:** Hardfork upgrade pages, configuration changelogs, and migration guides. Organized by hardfork, newest first.

**Decision test:** Does this page document a change to the Base network across a specific hardfork or configuration update?

**What doesn't belong:** Permanent protocol specifications (→ Specifications), integration guides (→ Integrate Base), product tutorials (→ Build on Base), SDK docs (→ SDKs & APIs). If the page will still be relevant after the upgrade window passes, it probably belongs in Specifications or Integrate Base instead. Changelog is for time-bound upgrade content: what changed, when, and how to migrate.

| Section | Purpose |
|---------|---------|
| General | Network configuration changelog |
| Cobalt | Upcoming hardfork: overview, B20 improvements, EIP-8130 |
| Beryl | Live hardfork: overview, Reth V2, faster withdrawals, B20 |
| Azul | Live hardfork: overview, node upgrade, execution, proofs |
| Optimism | Upstream OP Stack upgrades (Jovian through Canyon) |

## Decision tree

When adding a new page, ask in order:

1. **Is it a protocol specification?** → Specifications
2. **Is it a hardfork change or migration guide?** → Changelog
3. **Is it SDK or API documentation?** → SDKs & APIs
4. **Does it teach how to build a specific product?** → Build on Base
5. **Is it about connecting infrastructure to Base?** → Integrate Base
6. **Is it an entry point for new developers?** → Get Started

## Rules

- A page should appear in exactly one tab. If it fits two, prefer the more specific one.
- Use redirects when moving pages. Never delete a URL without a redirect.
- Hardfork-specific content always goes in Changelog, even if it relates to a feature documented elsewhere.
- Concept explainers that support integration go in Integrate Base > Reference, not in Specifications.
- Keep Get Started shallow — link to deeper sections rather than duplicating content.
