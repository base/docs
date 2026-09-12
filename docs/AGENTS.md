---
title: Base Docs Index
description: Look up Base documentation with a compact sidebar-aligned index built for AI coding agents. Lists every navigation page in its public documentation hierarchy.
---
# https://docs.base.org/llms.txt

## Base Documentation — LLM Entry Point

> High-signal index of the public documentation tabs. Jump to each tab's primary page for concise intros, curated links, and fast navigation.

- [Get Started](https://docs.base.org/get-started/base) — The blockchain for global finance.
- [Build on Base](https://docs.base.org/build-on-base/overview) — Build financial products on Base by outcome: integrate DeFi, tokenize assets, issue stablecoins, or accept payments.
- [Specifications](https://docs.base.org/specifications/overview) — Base protocol specifications — tokens, bridging, transactions, consensus, execution, and proofs.
- [SDKs & APIs](https://docs.base.org/sdks/overview) — SDKs, APIs, and command-line tools for identity verification, local development, and direct Base chain access.
- [Upgrades](https://docs.base.org/upgrades/overview) — Track Base network upgrades, activation dates, and the protocol changes included in each release.

## Tools Available for AI Assistants

These resources give AI assistants direct access to Base documentation and reusable workflows.

### Base MCP Server

`https://docs.base.org/mcp`

### Base Skills

AI agents can use Base skills to perform onchain actions directly from their tool loop — no custom integration required. Available skills include:

[https://github.com/base/skills](https://github.com/base/skills)

Install Base skills for your AI assistant:

```
npx skills add base/skills --skill base-mcp
```

## Compact Docs Index

[Docs Navigation]
|Get Started/Quickstart:get-started/base,get-started/connect-to-base,get-started/get-funds,get-started/make-a-transaction,base-chain/network-information/ecosystem-bridges
|Get Started/Solutions:get-started/integrate-defi,get-started/issue-rwa,get-started/issue-stablecoins,get-started/accept-payments
|Get Started/Coding Agents:get-started/resources-for-ai-agents,get-started/docs-mcp,get-started/docs-llms
|Get Started/Get Funding:get-started/base-batches,get-started/base-ecosystem-fund,get-started/base-services-hub
|Get Started/References:get-started/base-chain,get-started/sdks-and-apis
|Build on Base/Overview:build-on-base/overview,build-on-base/test-on-vibenet,build-on-base/assign-user-attributes
|Build on Base/Integrate DeFi:build-on-base/integrate-defi/integrate-trading,build-on-base/integrate-defi/integrate-lending,build-on-base/integrate-defi/integrate-borrowing,build-on-base/integrate-defi/integrate-earn-product,build-on-base/integrate-defi/list-tokenized-stocks
|Build on Base/Tokenize Assets:build-on-base/issue-rwa/create-an-asset-token,build-on-base/issue-rwa/issue-units,build-on-base/issue-rwa/restrict-eligible-holders,build-on-base/issue-rwa/cancel-blocked-units,build-on-base/issue-rwa/announce-a-distribution,build-on-base/issue-rwa/apply-a-multiplier,build-on-base/issue-rwa/pause-transfers
|Build on Base/Issue Stablecoins:build-on-base/issue-stablecoins/issue-your-stablecoin,build-on-base/issue-stablecoins/mint-supply,build-on-base/issue-stablecoins/burn-supply,build-on-base/issue-stablecoins/restrict-who-can-hold,build-on-base/issue-stablecoins/block-an-account,build-on-base/issue-stablecoins/recover-funds,build-on-base/issue-stablecoins/pause-activity,build-on-base/issue-stablecoins/reconcile-with-memos
|Build on Base/Accept Payments/Take a Payment:build-on-base/accept-payments/request-a-payment,build-on-base/accept-payments/authorize-a-payment,build-on-base/accept-payments/capture-an-authorization,build-on-base/accept-payments/capture-a-partial-amount,build-on-base/accept-payments/void-an-authorization,build-on-base/accept-payments/charge-on-a-schedule
|Build on Base/Accept Payments/Confirm and Reconcile:build-on-base/accept-payments/verify-a-payment,build-on-base/accept-payments/watch-for-payments,build-on-base/accept-payments/reconcile-payments
|Build on Base/Accept Payments/Return and Pay Out:build-on-base/accept-payments/refund-a-payment,build-on-base/accept-payments/send-a-payout,build-on-base/accept-payments/split-a-payment
|Build on Base/Accept Payments/Accept Agentic Payments:build-on-base/accept-payments/charge-for-an-api,build-on-base/accept-payments/settle-usage-based-payments,build-on-base/accept-payments/batch-high-frequency-payments,build-on-base/accept-payments/call-a-paid-service
|Specifications/Specifications:specifications/overview,specifications/native-account-abstraction,specifications/flashblocks
|Specifications/Specifications/Base Protocol:specifications/base-protocol/overview,specifications/base-protocol/batcher,specifications/base-protocol/design-goals
|Specifications/Specifications/Base Protocol/Consensus:specifications/base-protocol/consensus/specification,specifications/base-protocol/consensus/derivation,specifications/base-protocol/consensus/p2p,specifications/base-protocol/consensus/rpc
|Specifications/Specifications/Base Protocol/Execution:specifications/base-protocol/execution/l2-execution-engine,specifications/base-protocol/execution/precompiles,specifications/base-protocol/execution/predeploys,specifications/base-protocol/execution/preinstalls
|Specifications/Specifications/Base Protocol/Bridging:specifications/base-protocol/bridging/standard-bridges,specifications/base-protocol/bridging/deposits,specifications/base-protocol/bridging/withdrawals,specifications/base-protocol/bridging/cross-domain-messengers,specifications/base-protocol/bridging/base-solana-bridge
|Specifications/Specifications/Base Protocol/Proofs:specifications/base-protocol/proofs/overview,specifications/base-protocol/proofs/challenger,specifications/base-protocol/proofs/proposer,specifications/base-protocol/proofs/registrar,specifications/base-protocol/proofs/tee-prover,specifications/base-protocol/proofs/zk-prover,specifications/base-protocol/proofs/proof-contracts
|Specifications/Specifications/B20:specifications/b20/specification-overview,specifications/b20/reference/constants-addresses,specifications/b20/reference/errors-events,specifications/b20/reference/invariants-tests,specifications/b20/changelog
|Specifications/Specifications/B20/Interfaces:specifications/b20/reference/interfaces/i-activation-registry/index,specifications/b20/reference/interfaces/ib20/index,specifications/b20/reference/interfaces/ib20-asset/index,specifications/b20/reference/interfaces/ib20-factory/index,specifications/b20/reference/interfaces/ib20-stablecoin/index,specifications/b20/reference/interfaces/i-policy-registry/index
|Specifications/Specifications/Transactions:specifications/transactions/transaction-ordering,specifications/transactions/transaction-finality,specifications/transactions/network-fees,specifications/transactions/throughput-and-limits,specifications/transactions/troubleshooting-transactions
|Specifications/Specifications/Builder Codes:specifications/builder-codes/overview,specifications/builder-codes/for-app-developers,specifications/builder-codes/for-wallet-developers,specifications/builder-codes/for-agent-developers
|Specifications/Specifications/Validity Transactions:specifications/build-transaction/validity-transactions,specifications/build-transaction/build-a-validity-transaction,specifications/build-transaction/base_sendRawTransactionValidity,specifications/build-transaction/fees-ordering-and-lifecycle,specifications/build-transaction/predicates-and-safety,specifications/build-transaction/troubleshooting
|Specifications/Reference:specifications/reference/base-contracts,specifications/reference/smart-contracts,specifications/reference/configuration,specifications/reference/glossary
|Specifications/Node Operators:specifications/node-operators/run-a-node,specifications/node-operators/performance-tuning,specifications/node-operators/snapshots,specifications/node-operators/troubleshooting
|Specifications/Security:specifications/security/security-council-for-base,specifications/security/avoid-malicious-flags,specifications/security/report-a-vulnerability
|SDKs & APIs/Overview:sdks/overview
|SDKs & APIs/CLIs:sdks/base-anvil
|SDKs & APIs/Base Chain API:base-chain/api-reference/rpc-overview
|SDKs & APIs/Base Chain API/Ethereum JSON-RPC API:base-chain/api-reference/ethereum-json-rpc-api/eth_blockNumber,base-chain/api-reference/ethereum-json-rpc-api/eth_call,base-chain/api-reference/ethereum-json-rpc-api/eth_chainId,base-chain/api-reference/ethereum-json-rpc-api/eth_estimateGas,base-chain/api-reference/ethereum-json-rpc-api/eth_feeHistory,base-chain/api-reference/ethereum-json-rpc-api/eth_gasPrice,base-chain/api-reference/ethereum-json-rpc-api/eth_getBalance,base-chain/api-reference/ethereum-json-rpc-api/eth_getBlockByHash,base-chain/api-reference/ethereum-json-rpc-api/eth_getBlockByNumber,base-chain/api-reference/ethereum-json-rpc-api/eth_getBlockReceipts,base-chain/api-reference/ethereum-json-rpc-api/eth_getBlockTransactionCountByHash,base-chain/api-reference/ethereum-json-rpc-api/eth_getBlockTransactionCountByNumber,base-chain/api-reference/ethereum-json-rpc-api/eth_getCode,base-chain/api-reference/ethereum-json-rpc-api/eth_getLogs,base-chain/api-reference/ethereum-json-rpc-api/eth_getStorageAt,base-chain/api-reference/ethereum-json-rpc-api/eth_getTransactionByBlockHashAndIndex,base-chain/api-reference/ethereum-json-rpc-api/eth_getTransactionByBlockNumberAndIndex,base-chain/api-reference/ethereum-json-rpc-api/eth_getTransactionByHash,base-chain/api-reference/ethereum-json-rpc-api/eth_getTransactionCount,base-chain/api-reference/ethereum-json-rpc-api/eth_getTransactionReceipt,base-chain/api-reference/ethereum-json-rpc-api/eth_maxPriorityFeePerGas,base-chain/api-reference/ethereum-json-rpc-api/eth_sendRawTransaction,base-chain/api-reference/ethereum-json-rpc-api/eth_subscribe,base-chain/api-reference/ethereum-json-rpc-api/eth_syncing,base-chain/api-reference/ethereum-json-rpc-api/eth_unsubscribe,base-chain/api-reference/ethereum-json-rpc-api/net_version,base-chain/api-reference/ethereum-json-rpc-api/web3_clientVersion
|SDKs & APIs/Base Chain API/Flashblocks API:base-chain/api-reference/flashblocks-api/flashblocks-api-overview,base-chain/api-reference/flashblocks-api/base_transactionStatus,base-chain/api-reference/flashblocks-api/eth_simulateV1,base-chain/api-reference/flashblocks-api/newFlashblockTransactions,base-chain/api-reference/flashblocks-api/newFlashblocks,base-chain/api-reference/flashblocks-api/pendingLogs
|SDKs & APIs/Base Chain API/Debug API:base-chain/api-reference/debug-api/debug_traceTransaction,base-chain/api-reference/debug-api/debug_traceBlockByHash,base-chain/api-reference/debug-api/debug_traceBlockByNumber
|SDKs & APIs/Base Verify API:sdks/base-verify/overview,sdks/base-verify/verify-social-accounts,sdks/base-verify/verify-users-onchain
|SDKs & APIs/Migrated Documentation:sdks/migrated-products
|Upgrades/Overview:upgrades/overview,base-chain/network-information/configuration-changelog
|Upgrades/Denim:upgrades/denim/overview,upgrades/denim/200ms-blocks,upgrades/denim/migrate-from-flashblocks
|Upgrades/Cobalt:upgrades/cobalt/overview,upgrades/cobalt/dynamic-upgrades,base-chain/specs/reference/b20/changelog/02-cobalt-b20asset-multiplier,base-chain/specs/reference/b20/changelog/02-cobalt-b20-seize,base-chain/specs/reference/b20/changelog/02-cobalt-policyregistry-composite-policy
|Upgrades/Beryl:upgrades/beryl/overview,upgrades/beryl/reth-v2,upgrades/beryl/reducing-canonical-withdrawal-delay,upgrades/beryl/b20
|Upgrades/Azul:upgrades/azul/overview,upgrades/azul/node-upgrade,upgrades/azul/exec-engine,upgrades/azul/proofs
|Upgrades/Optimism:upgrades/canyon/overview
|Upgrades/Optimism/Jovian:upgrades/jovian/overview,upgrades/jovian/exec-engine,upgrades/jovian/derivation,upgrades/jovian/l1-attributes,upgrades/jovian/system-config
|Upgrades/Optimism/Isthmus:upgrades/isthmus/overview,upgrades/isthmus/exec-engine,upgrades/isthmus/derivation,upgrades/isthmus/l1-attributes,upgrades/isthmus/predeploys,upgrades/isthmus/system-config
|Upgrades/Optimism/Holocene:upgrades/holocene/overview,upgrades/holocene/exec-engine,upgrades/holocene/derivation,upgrades/holocene/system-config
|Upgrades/Optimism/Granite:upgrades/granite/overview,upgrades/granite/exec-engine,upgrades/granite/derivation
|Upgrades/Optimism/Fjord:upgrades/fjord/overview,upgrades/fjord/exec-engine,upgrades/fjord/derivation,upgrades/fjord/predeploys
|Upgrades/Optimism/Ecotone:upgrades/ecotone/overview,upgrades/ecotone/derivation,upgrades/ecotone/l1-attributes
|Upgrades/Optimism/Delta:upgrades/delta/overview,upgrades/delta/span-batches
