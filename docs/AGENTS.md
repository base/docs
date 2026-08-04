---
title: Base Docs Index
description: Look up Base documentation with a compact directory-grouped index built for AI coding agents. Lists every markdown page by parent directory so agents find context before generating code.
---
# https://docs.base.org/llms.txt

## Base Documentation — LLM Entry Point

> High-signal index of section guides. Jump to a section's llms.txt for concise intros, curated links, and fast navigation.

- [Base Chain](./base-chain/llms.txt) — Start here for Base Chain docs, including concepts, network reference, node operation, APIs, and protocol specifications.
- [Build On Base](./build-on-base/llms.txt) — Build on Base by outcome — issue stablecoins, facilitate payments, and run private transactions, with primitives built into the chain.
- [Fonts](./fonts/llms.txt)
- [Get Started](./get-started/llms.txt)
- [Sdks](./sdks/llms.txt) — Every SDK and API for building on Base in one place — the Base Account SDK for wallet, auth, and payments, and the Base Chain API for JSON-RPC, Flashblocks, and tracing.
- [Static](./static/llms.txt)

## Tools available for AI assistants

These resources give AI assistants direct access to Base documentation and reusable workflows.

### Base MCP server

`https://docs.base.org/mcp`

### Base skills

AI agents can use Base skills to perform onchain actions directly from their tool loop — no custom integration required. Available skills include:

[https://github.com/base/skills](https://github.com/base/skills)

Install Base skills for your AI assistant:

```
npx skills add base/base-skills
```

## Compact docs index

[Docs]|root:./docs
|base-chain:overview
|base-chain/api-reference:rpc-overview
|base-chain/api-reference/debug-api:debug_traceBlockByHash,debug_traceBlockByNumber,debug_traceTransaction
|base-chain/api-reference/ethereum-json-rpc-api:eth_blockNumber,eth_call,eth_chainId,eth_estimateGas,eth_feeHistory,eth_gasPrice,eth_getBalance,eth_getBlockByHash,eth_getBlockByNumber,eth_getBlockReceipts,eth_getBlockTransactionCountByHash,eth_getBlockTransactionCountByNumber,eth_getCode,eth_getLogs,eth_getStorageAt,eth_getTransactionByBlockHashAndIndex,eth_getTransactionByBlockNumberAndIndex,eth_getTransactionByHash,eth_getTransactionCount,eth_getTransactionReceipt,eth_maxPriorityFeePerGas,eth_sendRawTransaction,eth_subscribe,eth_syncing,eth_unsubscribe,net_version,web3_clientVersion
|base-chain/api-reference/flashblocks-api:base_transactionStatus,eth_simulateV1,flashblocks-api-overview,newFlashblockTransactions,newFlashblocks,pendingLogs
|base-chain/flashblocks:faq
|base-chain/network-information:base-contracts,base-solana-bridge,bridging-and-withdrawals,configuration-changelog,ecosystem-bridges,network-faucets,network-fees,throughput-and-limits,transaction-finality,transaction-ordering,troubleshooting-transactions
|base-chain/node-operators:node-providers,performance-tuning,run-a-base-node,snapshots,troubleshooting
|base-chain/quickstart:connecting-to-base
|base-chain/security:avoid-malicious-flags,bug-bounty,report-vulnerability,security-council
|base-chain/specs:overview
|base-chain/specs/protocol:batcher,overview
|base-chain/specs/protocol/bridging:bridges,deposits,messengers,withdrawals
|base-chain/specs/protocol/consensus:derivation,index,p2p,rpc
|base-chain/specs/protocol/execution:index
|base-chain/specs/protocol/execution/evm:precompiles,predeploys,preinstalls
|base-chain/specs/protocol/proofs:challenger,contracts,index,proposer,registrar,tee-prover,zk-prover
|base-chain/specs/reference:configurability,glossary
|base-chain/specs/upgrades/azul:exec-engine,node-upgrade,overview,proofs
|base-chain/specs/upgrades/beryl:b20-playground,b20,overview
|base-chain/specs/upgrades/canyon:overview
|base-chain/specs/upgrades/cobalt:eip-8130
|base-chain/specs/upgrades/delta:overview,span-batches
|base-chain/specs/upgrades/ecotone:derivation,l1-attributes,overview
|base-chain/specs/upgrades/fjord:derivation,exec-engine,overview,predeploys
|base-chain/specs/upgrades/granite:derivation,exec-engine,overview
|base-chain/specs/upgrades/holocene:derivation,exec-engine,overview,system-config
|base-chain/specs/upgrades/isthmus:derivation,exec-engine,l1-attributes,overview,predeploys,system-config
|base-chain/specs/upgrades/jovian:derivation,exec-engine,l1-attributes,overview,system-config
|build-on-base:lending-and-borrowing,overview,test-on-vibenet,tokenize-stocks
|build-on-base/agentic-payments:accept-a-payment,accept-subscriptions,collect-payer-info,pay-for-apis-with-x402,verify-a-payment
|build-on-base/issue-stablecoins:block-an-account,burn-supply,issue-your-stablecoin,mint-supply,pause-activity,reconcile-with-memos,recover-funds,restrict-who-can-hold
|build-on-base/ledgers:deposit,transfer,withdraw
|get-started:agentic-payments,apis,apply-for-funding,base-batches,base-chain,base-ecosystem-fund,base-mentorship-program,base-services-hub,base,block-explorers,concepts,connect-to-base,country-leads-and-ambassadors,data-indexers,deploy-smart-contracts,docs-llms,docs-mcp,financing,get-funded,get-funds,issue-stablecoins,launch-b20-token,launch-token,learning-resources,lending-and-borrowing,make-a-transaction,private-transactions,prompt-library,resources-for-ai-agents,run-a-base-node,sdks-and-apis,sdks,tokenize-stocks
|root:changes,contribution-guidelines,cookie-policy,privacy-policy,terms-of-service,tone_of_voice
|sdks:overview
|sdks/base-account:overview
|sdks/base-account/basenames:basename-transfer,basenames-faq
|sdks/base-account/contribute:contribute-to-base-account-docs,security-and-bug-bounty
|sdks/base-account/framework-integrations:cdp,rainbowkit,reown,thirdweb
|sdks/base-account/framework-integrations/privy:authentication,setup,spend-permissions,sub-accounts,wallet-actions
|sdks/base-account/framework-integrations/wagmi:base-pay,basenames,batch-transactions,other-use-cases,setup,sign-in-with-base,sub-accounts
|sdks/base-account/guides:authenticate-users,migration-guide,sign-and-verify-typed-data,verify-social-accounts
|sdks/base-account/guides/tips:inspect-txn-simulation,popup-tips
|sdks/base-account/improve-ux:batch-transactions,spend-permissions,sub-accounts
|sdks/base-account/improve-ux/sponsor-gas:erc20-paymasters,paymasters
|sdks/base-account/more:base-gasless-campaign,telemetry
|sdks/base-account/more/troubleshooting/usage-details:gas-usage,popups,simulations,unsupported-calls,wallet-library-support
|sdks/base-account/quickstart:ai-tools-available-for-devs,mobile-integration,web-react,web
|sdks/base-account/reference/base-pay:charge,getOrCreateSubscriptionOwnerWallet,getPaymentStatus,getStatus,pay,prepareCharge,prepareRevoke,revoke,subscribe,subscriptions-overview
|sdks/base-account/reference/core:createBaseAccount,generateKeyPair,getCryptoKeyAccount,getKeypair,getProvider,sdk-utilities
|sdks/base-account/reference/core/capabilities:atomic,auxiliaryFunds,dataSuffix,datacallback,flowControl,gasLimitOverride,overview,paymasterService,signInWithEthereum
|sdks/base-account/reference/core/provider-rpc-methods:coinbase_fetchPermission,coinbase_fetchPermissions,eth_accounts,eth_blockNumber,eth_chainId,eth_coinbase,eth_estimateGas,eth_feeHistory,eth_gasPrice,eth_getBalance,eth_getBlockByHash,eth_getBlockByNumber,eth_getBlockTransactionCountByHash,eth_getBlockTransactionCountByNumber,eth_getCode,eth_getLogs,eth_getProof,eth_getStorageAt,eth_getTransactionByBlockHashAndIndex,eth_getTransactionByBlockNumberAndIndex,eth_getTransactionByHash,eth_getTransactionCount,eth_getTransactionReceipt,eth_getUncleCountByBlockHash,eth_getUncleCountByBlockNumber,eth_requestAccounts,eth_sendRawTransaction,eth_sendTransaction,eth_signTypedData_v4,personal_sign,request-overview,sdk-overview,standard-rpc-methods,wallet_addEthereumChain,wallet_addSubAccount,wallet_connect,wallet_getCallsStatus,wallet_getCapabilities,wallet_getSubAccounts,wallet_sendCalls,wallet_switchEthereumChain,wallet_watchAsset,web3_clientVersion
|sdks/base-account/reference/onchain-contracts:basenames,smart-wallet,spend-permissions
|sdks/base-account/reference/prolink-utilities:createProlinkUrl,decodeProlink,encodeProlink
|sdks/base-account/reference/spend-permission-utilities:fetchPermission,fetchPermissions,getPermissionStatus,prepareRevokeCallData,prepareSpendCallData,requestRevoke,requestSpendPermission
|sdks/base-account/reference/ui-elements:base-pay-button,brand-guidelines,sign-in-with-base-button
