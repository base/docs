# Upgrades content audit

Compared source content (`ui/app/upgrades/data/`) against docs pages. Checked every feature has a detail page and follows the changelog structure (Abstract, Motivation, What changed, Migration).

## Status

### Azul (11 features)

| Feature | Page | Status |
|---------|------|--------|
| EIP-7823: Upper-Bound MODEXP | `azul/exec-engine` | Covered inline |
| EIP-7825: Transaction Gas Limit Cap | `azul/exec-engine` | Covered inline |
| EIP-7883: MODEXP Gas Cost Increase | `azul/exec-engine` | Covered inline |
| EIP-7939: CLZ Opcode | `azul/exec-engine` | Covered inline |
| EIP-7951: secp256r1 Precompile | `azul/exec-engine` | Covered inline |
| EIP-7642: eth/69 | `azul/exec-engine` | Covered inline |
| EIP-7910: eth_config RPC Method | `azul/exec-engine` | Covered inline |
| Multiproofs | `azul/proofs` | Full spec page |
| Remove Account Balances & Receipts | `azul/exec-engine` | Covered inline |
| basev0 protocol ID for discv5 | `azul/exec-engine` | Covered inline |
| Engine API Usage | `azul/exec-engine` | Covered inline |

Note: Azul features are spec-style pages (exec-engine, proofs, node-upgrade) rather than changelog entries. They predate the changelog structure convention but are comprehensive.

### Beryl (3 features)

| Feature | Page | Status |
|---------|------|--------|
| B20 | `beryl/b20` | Full spec page |
| Faster Withdrawals | `beryl/reducing-canonical-withdrawal-delay` | Updated — has Motivation, What changed, Migration |
| Reth V2 | `beryl/reth-v2` | Updated — has Motivation, What changed, Migration |

### Cobalt (3 features)

| Feature | Page | Status |
|---------|------|--------|
| EIP-8130: Native AA | `cobalt/eip-8130` | Full detail page |
| Dynamic Upgrades | `cobalt/dynamic-upgrades` | Created — has Motivation, What changed, Migration |
| B20 Improvements | 3 changelog entries | Full changelog entries |

B20 changelog entries:
- `02-cobalt-b20asset-multiplier` — Schedule Multiplier Updates
- `02-cobalt-b20-seize` — Transfer blocked / burnBlocked deprecation
- `02-cobalt-policyregistry-composite-policy` — Union / Intersect policies

Note: "Pay transaction fees in B20s" is part of EIP-8130 rollout, not a standalone B20 changelog entry.

### Denim (1 feature)

| Feature | Page | Status |
|---------|------|--------|
| 200ms Blocks | `denim/200ms-blocks` | Updated — has Motivation, What changed, Migration |

## Changes made

| File | Change |
|------|--------|
| `cobalt/dynamic-upgrades.mdx` | Created — new detail page |
| `cobalt/overview.mdx` | Enriched B20 Improvements accordion (added Transfer blocked, Union/Intersect policies) |
| `beryl/reth-v2.mdx` | Added Motivation section |
| `beryl/reducing-canonical-withdrawal-delay.mdx` | Filled from "Coming soon" stub |
| `denim/overview.mdx` | Enriched accordion with Flashblocks deprecation notice (later updated by user to Card) |
| `denim/200ms-blocks.mdx` | Filled from stub, added Motivation and What changed sections |
| `docs.json` | Added `cobalt/dynamic-upgrades` to nav |

## Remaining gaps

None — all source features have corresponding doc pages with changelog-compliant structure.
