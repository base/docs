---
title: Base Docs Index
description: Look up Base documentation with a compact directory-grouped index built for AI coding agents. Lists every markdown page by parent directory so agents find context before generating code.
---
# https://docs.base.org/llms.txt

## Base Documentation — LLM Entry Point

> High-signal index of section guides. Jump to a section's llms.txt for concise intros, curated links, and fast navigation.

- [Base Chain](./base-chain/llms.txt) — Connect your app, wallet, contract, bridge, or infrastructure service to Base.
- [Build On Base](./build-on-base/llms.txt) — Build financial products on Base by outcome — issue stablecoins, integrate DeFi, issue real-world assets, accept payments, or run private transactions.
- [Fonts](./fonts/llms.txt)
- [Get Started](./get-started/llms.txt)
- [Sdks](./sdks/llms.txt) — The command-line and API surfaces for building on Base: the base-anvil Foundry build and the Base Chain API for JSON-RPC, Flashblocks, and tracing.
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
|base-chain/network-information:b20-token-standard,base-contracts,base-solana-bridge,bridging-and-withdrawals,configuration-changelog,ecosystem-bridges,native-account-abstraction,network-faucets,network-fees,smart-contracts,throughput-and-limits,transaction-finality,transaction-ordering,troubleshooting-transactions
|base-chain/node-operators:node-providers,performance-tuning,run-a-base-node,snapshots,troubleshooting
|base-chain/quickstart:connecting-to-base
|base-chain/security:avoid-malicious-flags,report-vulnerability,security-council
|base-chain/specs:overview
|base-chain/specs/protocol:batcher,overview
|base-chain/specs/protocol/bridging:bridges,deposits,messengers,withdrawals
|base-chain/specs/protocol/consensus:derivation,index,p2p,rpc
|base-chain/specs/protocol/execution:index
|base-chain/specs/protocol/execution/evm:precompiles,predeploys,preinstalls
|base-chain/specs/protocol/proofs:challenger,contracts,index,proposer,registrar,tee-prover,zk-prover
|base-chain/specs/reference:configurability,glossary,native-account-abstraction
|base-chain/specs/reference/b20:changelog,constants-and-addresses,errors-and-events,index,invariants-and-tests
|base-chain/specs/reference/b20/changelog:02-cobalt-b20-seize,02-cobalt-b20asset-multiplier,02-cobalt-policyregistry-composite-policy
|base-chain/specs/reference/b20/interfaces:IActivationRegistry,IB20,IB20Asset,IB20Factory,IB20Stablecoin,IPolicyRegistry
|base-chain/specs/reference/b20/interfaces/IActivationRegistry:activate,admin,checkActivated,deactivate,isActivated
|base-chain/specs/reference/b20/interfaces/IB20:BURN_BLOCKED_ROLE,BURN_ROLE,DEFAULT_ADMIN_ROLE,DOMAIN_SEPARATOR,METADATA_ROLE,MINT_RECEIVER_POLICY,MINT_ROLE,PAUSE_ROLE,SEIZE_HOLDER_POLICY,SEIZE_RECEIVER_POLICY,SEIZE_ROLE,TRANSFER_EXECUTOR_POLICY,TRANSFER_RECEIVER_POLICY,TRANSFER_SENDER_POLICY,UNPAUSE_ROLE,allowance,approve,balanceOf,burn,burnBlocked,burnWithMemo,contractURI,decimals,eip712Domain,getRoleAdmin,grantRole,hasRole,isPaused,mint,mintWithMemo,name,nonces,pause,pausedFeatures,permit,policyId,renounceLastAdmin,renounceRole,revokeRole,seizeWithMemo,setRoleAdmin,supplyCap,symbol,totalSupply,transfer,transferFrom,transferFromWithMemo,transferWithMemo,unpause,updateContractURI,updateName,updatePolicy,updateSupplyCap,updateSymbol
|base-chain/specs/reference/b20/interfaces/IB20Asset:MAX_UI_MULTIPLIER,OPERATOR_ROLE,WAD_PRECISION,announce,balanceOfUI,batchMint,cancelUIMultiplierUpdate,effectiveAt,extraMetadata,fromUIAmount,isAnnouncementIdUsed,multiplier,newUIMultiplier,scaledBalanceOf,toRawBalance,toScaledBalance,toUIAmount,totalSupplyUI,uiMultiplier,updateExtraMetadata,updateMultiplier,updateUIMultiplier
|base-chain/specs/reference/b20/interfaces/IB20Factory:createB20,getB20Address,isB20,isB20Initialized
|base-chain/specs/reference/b20/interfaces/IB20Stablecoin:currency
|base-chain/specs/reference/b20/interfaces/IPolicyRegistry:MAX_COMPOSITE_CHILD_POLICIES,MIN_COMPOSITE_CHILD_POLICIES,compositePolicyChildIds,createCompositePolicy,createPolicy,createPolicyWithAccounts,finalizeUpdateAdmin,isAuthorized,pendingPolicyAdmin,policyAdmin,policyExists,renounceAdmin,stageUpdateAdmin,updateAllowlist,updateBlocklist,updateComposite
|base-chain/specs/upgrades/azul:exec-engine,node-upgrade,overview,proofs
|base-chain/specs/upgrades/beryl:overview,reducing-canonical-withdrawal-delay,reth-v2
|base-chain/specs/upgrades/canyon:overview
|base-chain/specs/upgrades/cobalt:b20-improvements,eip-8130,overview
|base-chain/specs/upgrades/delta:overview,span-batches
|base-chain/specs/upgrades/ecotone:derivation,l1-attributes,overview
|base-chain/specs/upgrades/fjord:derivation,exec-engine,overview,predeploys
|base-chain/specs/upgrades/granite:derivation,exec-engine,overview
|base-chain/specs/upgrades/holocene:derivation,exec-engine,overview,system-config
|base-chain/specs/upgrades/isthmus:derivation,exec-engine,l1-attributes,overview,predeploys,system-config
|base-chain/specs/upgrades/jovian:derivation,exec-engine,l1-attributes,overview,system-config
|build-on-base:overview,test-on-vibenet
|build-on-base/accept-payments:from-agents,from-humans,verify-a-payment
|build-on-base/integrate-defi:integrate-borrowing,integrate-earn-product,integrate-lending
|build-on-base/issue-rwa:announce-a-distribution,apply-a-multiplier,cancel-blocked-units,create-an-asset-token,issue-units,pause-transfers,restrict-eligible-holders
|build-on-base/issue-stablecoins:block-an-account,burn-supply,issue-your-stablecoin,mint-supply,pause-activity,reconcile-with-memos,recover-funds,restrict-who-can-hold
|build-on-base/ledgers:deposit,transfer,withdraw
|get-started:accept-payments,base-batches,base-chain,base-ecosystem-fund,base,block-explorers,connect-to-base,data-indexers,docs-llms,docs-mcp,get-funds,integrate-defi,issue-rwa,issue-stablecoins,make-a-transaction,private-transactions,resources-for-ai-agents,sdks-and-apis
|root:changes,contribution-guidelines,cookie-policy,privacy-policy,terms-of-service
|sdks:base-anvil,coinbase-wallet,overview
