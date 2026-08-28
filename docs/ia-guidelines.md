# Information Architecture Guidelines

What belongs in each navigation tab and section — and what doesn't. Use this when adding new pages or reorganizing existing content.

---

## Get Started

**Audience**: First-time visitors who need to orient, pick a use case, and reach their first working interaction with Base.

### Quickstart

- **Belongs**: Minimal-step onboarding (connect wallet, get testnet funds, send a transaction). Each page should be completable in under 5 minutes.
- **Iterate**: Surface high-traffic reference pages (e.g., contract addresses, network details, faucets) that are currently buried deep in the IA. If analytics show developers frequently need a page but it takes too many clicks to reach, add a shortcut or landing link here.
- **Does not belong**: Detailed implementation guides (those go in Build on Base), SDK installation walkthroughs (those go in SDKs & APIs).

### Solutions

- **Belongs**: One-page overviews that explain each use case and link out to the full Build on Base guides: Integrate DeFi, Accept Payments, Tokenize Assets, Issue Stablecoins.
- **Does not belong**: The step-by-step guides themselves. Solutions pages are entry ramps, not the destination.
- **Governance**: Before adding a new solution or renaming a section, you need approval from Eric Brown and Mind Apivessa. Mind Apivessa will be responsible for getting approvals from BD and GTM.

### Coding Agents

- **Belongs**: Resources for AI coding agents — MCP server setup, llms.txt pointers, agent-oriented entry points.
- **Does not belong**: Human-facing quickstarts or tutorials. This section serves agents, not developers directly.

### Get Funding

- **Belongs**: Grant programs, accelerator info, ecosystem fund applications, and the Base Services Hub for builder discounts and service credits.
- **Does not belong**: Technical content of any kind. Full detail on the programs.

### References

- **Belongs**: Short landing pages that point to the Base Protocol tab and the SDKs & APIs tab. Orientation only.
- **Does not belong**: Actual reference content (contract addresses, glossaries, API docs). Those live in their respective tabs.

---

## Build on Base

**Audience**: Developers who have picked a use case and need step-by-step implementation guides to build on Base.

**Governance**: Before adding a new solution or renaming a section, you need approval from Eric Brown and Mind Apivessa. Mind Apivessa will be responsible for getting approvals from BD and GTM.

### Overview

- **Belongs**: Build on Base landing page and Vibenet testing guide.
- **Does not belong**: Chain-level concepts (fees, finality, throughput) — those go in Specifications → Transactions.

### Integrate DeFi

- **Belongs**: Guides for integrating trading, lending, borrowing, and earn products on Base.
- **Does not belong**: Protocol-level specs for how DeFi contracts work under the hood.

### Tokenize Assets

- **Belongs**: Step-by-step guides for asset tokenization: create an asset token, issue units, restrict holders, cancel blocked units, announce distributions, apply multipliers, and pause transfers.
- **Does not belong**: B20 Asset variant specification details (those live in Specifications → B20).

### Issue Stablecoins

- **Belongs**: End-to-end guides for stablecoin issuers: deploy, mint, burn, restrict holders, block accounts, recover funds, pause, reconcile with memos. Each page is a task the issuer completes.
- **Does not belong**: The B20 specification itself (that's Specifications → B20). These guides *use* B20 but don't *define* it.

### Accept Payments

- **Belongs**: Guides for requesting, authorizing, capturing, verifying, and reconciling payments, plus refunds, payouts, splits, scheduled charges, and agentic payments.
- **Does not belong**: B20 memo specification (Specifications → B20). x402 protocol spec.

---

## Specifications

**Audience**: Developers and technical users who need to understand how Base works at the chain level — primitives, protocol internals, network configuration, and node operations.

Content is organized by topic, not by abstraction level. Each topic group flows from user-facing overview to deep protocol spec, so developers find everything about a subject in one place.

**Changelog pattern**: Each topic group should include a changelog summary page that lists what changed per hardfork and links out to the detail entries in the Upgrades tab. The summary page lives here; the detail pages live in Upgrades under the hardfork that introduced them.

**Content structure**: See the [Specification Pages](../content-guidelines.md#specification-pages) section of the content guidelines for page types, page structure, and writing rules.

### Specifications (Landing)

- **Belongs**: Chain overview, connecting to Base quickstart, faucets. Entry points into the Specifications tab.
- **Does not belong**: Integration guides or solutions-first style writing. This tab is meant for technical-first style writing. SDK setup (that's SDKs & APIs).

### B20

- **Belongs**: The normative B20 specification: index page, constants and addresses, errors and events, invariants and tests, interface reference pages (IActivationRegistry, IB20, IB20Asset, IB20Factory, IB20Stablecoin, IPolicyRegistry), and a changelog summary page that links to the per-hardfork detail entries in the Upgrades tab.
- **Does not belong**: Tutorials on deploying B20 tokens (Build on Base → Issue Stablecoins). Per-hardfork changelog detail pages (Upgrades → Cobalt, Beryl, etc.). The "B20 token standard" overview for general audiences (that's a network-information page, not the spec).

### Account Abstraction

- **Belongs**: Native account abstraction specification for Base. Listed as a top-level page, not a dropdown group (single-page groups should be promoted to top-level pages).
- **Does not belong**: SDK integration guides for smart wallets (SDKs & APIs → Base Account SDK).

### Bridging

- **Belongs**: Standard bridges contract spec, deposits spec, withdrawals spec, cross-domain messengers spec, Base-Solana bridge. Include a changelog summary page linking to hardfork entries that changed bridging.
- **Does not belong**: User-facing bridge route picker (that's Get Started → Quickstart). How-to guides for building bridge integrations (Build on Base). Per-hardfork changelog detail pages (Upgrades).
- **Ordering**: Standard bridges → deposits → withdrawals → cross-domain messengers → Base-Solana bridge. Protocol specs first (general to specific), then the first-party ecosystem bridge.

### Transactions

- **Belongs**: Transaction ordering, transaction finality, network fees, throughput and limits, troubleshooting transactions. Everything about how transactions work on Base, from user experience to network parameters.
- **Does not belong**: Derivation pipeline or consensus specs (Consensus). Per-hardfork changelog detail pages (Upgrades).

### Flashblocks

- **Belongs**: Flashblocks reference — key concepts, architecture, and FAQ about block building, WebSocket data, RPC usage, and node setup.
- **Does not belong**: Flashblocks API methods (SDKs & APIs → Base Chain API). Transaction ordering details (Transactions).

### Base Protocol

- **Belongs**: Design goals, lineage, network participants, system architecture diagrams, protocol component summaries, and core user flows (deposits, transactions, withdrawals). Listed as a top-level page, not a dropdown group.
- **Does not belong**: Per-component specs (those go in their respective topic groups: Consensus, Execution, Proofs, etc.).

### Batcher

- **Belongs**: Batcher specification — how transaction batches are compressed and posted to Ethereum for data availability.
- **Does not belong**: Derivation details (Consensus). Hardfork-specific batcher changes (Upgrades).

### Consensus

- **Belongs**: Consensus specifications: derivation pipeline, P2P networking, RPC methods for consensus.
- **Does not belong**: Batcher (separate group). Execution engine details (Execution). Hardfork-specific changes (Upgrades).

### Execution

- **Belongs**: Execution specifications: EVM precompiles, predeploys, preinstalls.
- **Does not belong**: Consensus or derivation details (Consensus). Hardfork-specific changes (Upgrades).

### Proofs

- **Belongs**: Proof system specifications: challenger, proposer, registrar, TEE prover, ZK prover, proof contracts.
- **Does not belong**: Consensus or derivation details (Consensus). Hardfork-specific changes (Upgrades).

### Reference

- **Belongs**: Builder codes, base contracts, smart contracts, configurability reference, glossary. Lookup-oriented content.
- **Does not belong**: The B20 spec (that's in B20). API endpoints (SDKs & APIs). Step-by-step guides of any kind.

### Node Operators

- **Belongs**: Running a Base node, performance tuning, snapshots, troubleshooting. Content for people operating infrastructure.
- **Does not belong**: RPC API reference (SDKs & APIs → Base Chain API). Node provider listings (those are in Reference).

### Security

- **Belongs**: Security council info, avoiding malicious flags, vulnerability reporting.
- **Does not belong**: Smart contract security guides or audit reports.

---

## SDKs & APIs

**Audience**: Developers integrating Base via SDKs or calling Base APIs directly.

### Overview

- **Belongs**: SDK/API landing page with links to available SDKs and APIs.
- **Does not belong**: Chain-level protocol content (Base Protocol).

### Base Chain API

- **Belongs**: RPC overview, Ethereum JSON-RPC API methods, Flashblocks API methods, Debug API methods. Each page documents one RPC endpoint.
- **Does not belong**: SDK wrapper methods (Base Account SDK). Flashblocks conceptual explainer (Specifications → Flashblocks). Node setup (Base Protocol → Node Operators).

### Base Account SDK

- **Belongs**: Everything about the Base Account SDK — quickstarts (web, React, mobile, AI tools), guides (auth, signing, social verification, batching, spend permissions, sub-accounts, gas sponsorship, migration), framework integrations (Wagmi, Privy, CDP, RainbowKit, Reown, Thirdweb), full API reference (Base Pay, Core, Spend Permissions, Prolink, UI Elements, Onchain Contracts), Basenames, troubleshooting.
- **Does not belong**: Chain RPC methods (Base Chain API). Protocol specs (Base Protocol). Use-case guides that happen to use the SDK (Build on Base).

---

## Upgrades

**Audience**: Developers and node operators tracking what changed across Base hardforks and releases.

**Entry structure**: Every changelog entry follows a standardized section format modeled after TIPs (Token Improvement Proposals). See the [Changelog Entries](../content-guidelines.md#changelog-entries) section of the content guidelines for the full template, numbering scheme, and naming convention.

### Overview

- **Belongs**: Upgrades landing page with hardfork timeline, status table, and links to each hardfork overview.
- **Does not belong**: Per-hardfork detail content (that goes in the hardfork groups below).

### General

- **Belongs**: Configuration changelog — network parameter changes that don't belong to a specific hardfork.
- **Does not belong**: Feature announcements or blog-style content.

### Cobalt / Beryl / Azul (Upgrade Groups)

- **Belongs**: Per-hardfork overview and the specific changes introduced in that hardfork — including feature-specific entries (e.g., B20 improvements, EIP-8130, reth-v2, node upgrades, proof system changes). All per-feature changelog entries go under the hardfork that introduced them, not in a separate per-feature group.
- **Does not belong**: The current/canonical specification for features modified in the hardfork. After a hardfork ships, the canonical spec lives in Base Protocol; the Upgrades entry records *what changed and how to migrate*. No standalone per-feature sections — B20 changes go under Cobalt/Beryl, not a separate "B20" group.

### Optimism (Hardfork Groups)

- **Belongs**: Upstream OP Stack hardfork specs that Base inherits (Jovian, Isthmus, Holocene, Granite, Fjord, Ecotone, Delta, Canyon). Each gets an overview plus per-component pages (exec-engine, derivation, predeploys, etc.).
- **Does not belong**: Base-specific hardfork content (use the Base-named groups above). Current protocol specs (Specifications → topic groups).

---

## Decision Log

Key IA decisions from past reorganizations, for context:

| Decision | Rationale |
|----------|-----------|
| Topic-based groups replace Core Primitives / Network Systems | Developers navigate by topic (bridging, transactions), not by abstraction level (user-facing vs protocol internals). The old split created duplicate sidebar groups (two "Bridging" sections) and arbitrary placement decisions. Topic-based groups flow from overview → deep spec within each subject. |
| B20 spec moved from Reference to its own group | B20 is a first-class primitive developers interact with, not a lookup reference |
| How-to guides separated from specs | Build on Base is task-oriented (issue, accept, tokenize); Specifications is concept/spec-oriented |
| API reference lives in SDKs & APIs, not Specifications | Developers looking for RPC methods think "API docs", not "protocol" |
| Hardfork specs live in Upgrades, not topic groups | Topic groups are the *current* canonical state; Upgrades tracks *deltas* |
| No per-feature upgrade groups | Feature changes (e.g., B20) go under the hardfork that introduced them (Cobalt, Beryl), not a standalone section |
| Changelog summary pages in Specifications | Each topic group gets a changelog summary page that links out to detail entries in the Upgrades tab — Specifications owns the spec and the summary, Upgrades owns the migration details |
| Node operators stay in Specifications | Node ops are protocol-adjacent, not SDK/API work |
| Get Started → Solutions are entry ramps only | They link to Build on Base guides, they don't duplicate them |
| Mini Apps renamed to Apps | Broader scope, `/mini-apps/` paths redirect to `/apps/` |
| Tokenize Stocks renamed to Tokenize Assets | Broader scope for asset tokenization beyond equities |

---

## Navigation Structure

- **No single-page dropdown groups**: If a group contains only one page, remove the group wrapper and list the page as a top-level nav item instead. A dropdown that expands to reveal a single link adds a click without adding value.

---

## Naming Conventions

- **Page titles**: Title case — capitalize all words except short conjunctions and articles (e.g., "Integrate an Earn Product")
- **Tab names**: Short — "Chain" not "Base Chain", "SDKs & APIs" not "SDKs and APIs"
- **Action-oriented names** when possible — "Integrate DeFi" not "DeFi Integration"
- **Enterprise tone** for financial use cases — "Integrate Borrowing" not "Get a Loan"
- **No parenthetical labels** in nav — category tags like (Trading), (Payments) are internal only

## Placeholder Pages

New pages without content use this format:

```yaml
---
title: "Page Title"
description: "Brief description"
---

Coming Soon
```
