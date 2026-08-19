# Contribution Guidelines

Guidelines for contributing to Base documentation.

## Navigation Architecture

**4 top-level tabs:**

- **Get Started** — Onboarding, use case discovery, references to other tabs, funding, agents
- **Build on Base** — Use case solutions and guides for building products on Base
- **Chain** — Everything about how the network works and how you connect to it
- **SDKs & APIs** — Developer reference (SDKs, JSON-RPC, Flashblocks, Debug APIs)

**Guiding principle:** "Build" is about what you _make_. "Chain" is about how the network _works_ and how you _connect_ to it. If it's about plugging into Base infrastructure (connecting, bridges, faucets, nodes), it goes in Chain. If it's about creating a product (DeFi, stablecoins, payments), it goes in Build.

## Get Started Tab Structure

The Get Started tab serves as an entry point that funnels users into deeper tabs:

- **Start Here** — Connect to Base, Get Funds, Make a Transaction
- **Use Cases** — Ordered by prominence: Integrate DeFi, Issue Stablecoins, Lending and Borrowing, then the rest
- **References** — Links that mirror top-level tabs (Chain, SDKs & APIs)
- **Get Funded** — Base Batches, Base Ecosystem Fund
- **Agents** — Use Base with AI

## Chain Tab Structure

Consolidated from the old Integrate Base, Run a Base Node, and Base Chain tabs:

- **Introduction** — Overview
- **Connect** — Connecting, providers, faucets, bridges
- **Core Concepts** — Transaction ordering, finality, throughput, fees, contracts, changelog
- **Node Operators** — Run a node, performance, snapshots, troubleshooting
- **Upgrades** — Own top-level section (Cobalt, Beryl, Azul, Optimism sub-upgrades)
- **Protocol Specifications** — Protocol, bridging, consensus, execution, proofs
- **Security** — Council, malicious flags, vulnerability reporting

**Anchors** (pinned icon links): Status, Faucet, Explorer, Bridge

## Upgrades

Upgrades are a top-level section within the Chain tab, not nested inside Protocol Specifications. This gives them visibility since they are time-sensitive and high-impact.

**Structure:**

- Each Base-native upgrade (Cobalt, Beryl, Azul) gets its own subgroup
- Optimism-inherited upgrades (Jovian, Isthmus, Holocene, Granite, Fjord, Ecotone, Delta, Canyon) are nested under an "Optimism" subgroup
- Each upgrade subgroup contains an overview page plus relevant spec pages (exec-engine, derivation, proofs, etc.)

**When adding a new upgrade:**

1. Create a new subgroup under Upgrades in `docs.json`
2. Place it at the top of the list (newest first)
3. Add an overview page and any spec-specific pages under `base-chain/specs/upgrades/<upgrade-name>/`
4. Base-native upgrades go at the top level; Optimism-inherited upgrades go inside the Optimism subgroup

## Naming Conventions

- **Tab names:** Short — "Chain" not "Base Chain", "SDKs & APIs" not "SDKs and APIs"
- **Page titles:** Title Case, but keep "and" lowercase (e.g., "Lending and Borrowing")
- **No parenthetical labels** in nav — category tags like (Trading), (Payments) are internal only
- **Action-oriented names** when possible — "Integrate DeFi" not "DeFi Integration"
- **Enterprise tone** for financial use cases — "Lending and Borrowing" not "Get a Loan"

## Placeholder Pages

New pages without content use this format:

```yaml
---
title: "Page Title"
description: "Brief description"
---

Coming Soon
```

## When Adding Use Cases

Order by prominence/demand. Current order:

1. Integrate DeFi
2. Issue Stablecoins
3. Lending and Borrowing
4. Tokenize Stocks
5. Facilitate Payments
6. Private Transactions
