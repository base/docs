---
title: Base Docs Index
description: Look up Base documentation with a compact directory-grouped index built for AI coding agents. Lists every markdown page by parent directory so agents find context before generating code.
---
# https://docs.base.org/llms.txt

## Base Documentation — LLM Entry Point

> High-signal index of section guides. Jump to a section's llms.txt for concise intros, curated links, and fast navigation.

- [Agents](./agents/llms.txt) — Give your AI assistant a wallet. Base MCP connects any AI to your Base Account. Check balances, send funds, swap tokens, sign messages, and pay with x402.
- [Base Chain](./base-chain/llms.txt) — Base protocol specifications, core primitives, and network systems.
- [Build On Base](./build-on-base/llms.txt) — Build financial products on Base by outcome: integrate DeFi, tokenize assets, issue stablecoins, or accept payments.
- [Fonts](./fonts/llms.txt)
- [Get Started](./get-started/llms.txt)
- [Sdks](./sdks/llms.txt) — Every SDK and API for building on Base in one place — the Base Account SDK for wallet, auth, and payments, Base MCP for AI assistants, and the Base Chain API for JSON-RPC, Flashblocks, and tracing.
- [Static](./static/llms.txt)

## Tools Available for AI Assistants

These resources give AI assistants direct access to Base documentation and reusable workflows.

### Base MCP Server

`https://docs.base.org/mcp`

### Base Skills

AI agents can use Base skills to perform onchain actions directly from their tool loop — no custom integration required. Available skills include:

[https://github.com/base/skills](https://github.com/base/skills)

Install Base skills for your AI assistant:

```
npx skills add base/base-skills
```

## Compact Docs Index

[Docs]|root:./docs
|agents:overview,quickstart
|agents/guides:batch-calls,check-balance,index,send-tokens,sign-messages,swap-tokens,view-history,x402-payments
|agents/plugins:custom-plugins,index
|agents/plugins/native:aerodrome,avantis,balancer,bankr,bitrefill,brickken,clawnch,flaunch,gmgn,hydrex,index,kyberswap,moonwell,morpho,o1-exchange,opensea,printr,uniswap,venice,virtuals,yo
|agents/skills:SKILL
|agents/skills/plugins:aerodrome,avantis,balancer,bankr,bitrefill,brickken,clawnch,flaunch,gmgn,hydrex,kyberswap,moonwell,morpho,o1-exchange,opensea,printr,uniswap,venice,virtuals,yo
|agents/skills/references:approval-mode,batch-calls,custom-plugins,install,plugin-spec,tone
|base-chain:overview
|base-chain/api-reference:rpc-overview
|base-chain/api-reference/debug-api:debug_traceBlockByHash,debug_traceBlockByNumber,debug_traceTransaction
|base-chain/api-reference/ethereum-json-rpc-api:eth_blockNumber,eth_call,eth_chainId,eth_estimateGas,eth_feeHistory,eth_gasPrice,eth_getBalance,eth_getBlockByHash,eth_getBlockByNumber,eth_getBlockReceipts,eth_getBlockTransactionCountByHash,eth_getBlockTransactionCountByNumber,eth_getCode,eth_getLogs,eth_getStorageAt,eth_getTransactionByBlockHashAndIndex,eth_getTransactionByBlockNumberAndIndex,eth_getTransactionByHash,eth_getTransactionCount,eth_getTransactionReceipt,eth_maxPriorityFeePerGas,eth_sendRawTransaction,eth_subscribe,eth_syncing,eth_unsubscribe,net_version,web3_clientVersion
|base-chain/api-reference/flashblocks-api:base_transactionStatus,eth_simulateV1,flashblocks-api-overview,newFlashblockTransactions,newFlashblocks,pendingLogs
|base-chain/flashblocks:faq
|base-chain/network-information:b20-token-standard,base-contracts,base-solana-bridge,bridging-and-withdrawals,configuration-changelog,ecosystem-bridges,network-faucets,network-fees,smart-contracts,throughput-and-limits,transaction-finality,transaction-ordering,troubleshooting-transactions
|base-chain/node-operators:performance-tuning,run-a-base-node,snapshots,troubleshooting
|base-chain/quickstart:connecting-to-base
|base-chain/security:avoid-malicious-flags,report-vulnerability,security-council
|base-chain/specs:native-account-abstraction,overview
|base-chain/specs/protocol:batcher,overview
|base-chain/specs/protocol/bridging:bridges,deposits,messengers,withdrawals
|base-chain/specs/protocol/consensus:derivation,index,p2p,rpc
|base-chain/specs/protocol/execution:index
|base-chain/specs/protocol/execution/evm:precompiles,predeploys,preinstalls
|base-chain/specs/protocol/proofs:challenger,contracts,index,proposer,registrar,tee-prover,zk-prover
|base-chain/specs/reference:configurability,glossary,native-account-abstraction
|base-chain/specs/reference/b20:build-with-b20,changelog,constants-and-addresses,errors-and-events,index,precompiles,try-b20
|base-chain/specs/reference/b20/changelog:02-cobalt-b20-seize,02-cobalt-b20asset-multiplier,02-cobalt-policyregistry-composite-policy
|base-chain/specs/reference/b20/interfaces:IActivationRegistry,IB20,IB20Asset,IB20Factory,IB20Stablecoin,IPolicyRegistry
|base-chain/specs/reference/b20/interfaces/IActivationRegistry:activate,admin,checkActivated,deactivate,isActivated
|base-chain/specs/reference/b20/interfaces/IB20:BURN_BLOCKED_ROLE,BURN_ROLE,DEFAULT_ADMIN_ROLE,DOMAIN_SEPARATOR,METADATA_ROLE,MINT_RECEIVER_POLICY,MINT_ROLE,PAUSE_ROLE,SEIZE_HOLDER_POLICY,SEIZE_RECEIVER_POLICY,SEIZE_ROLE,TRANSFER_EXECUTOR_POLICY,TRANSFER_RECEIVER_POLICY,TRANSFER_SENDER_POLICY,UNPAUSE_ROLE,allowance,approve,balanceOf,burn,burnBlocked,burnWithMemo,contractURI,decimals,eip712Domain,getRoleAdmin,grantRole,hasRole,isPaused,mint,mintWithMemo,name,nonces,pause,pausedFeatures,permit,policyId,renounceLastAdmin,renounceRole,revokeRole,seizeWithMemo,setRoleAdmin,supplyCap,symbol,totalSupply,transfer,transferFrom,transferFromWithMemo,transferWithMemo,unpause,updateContractURI,updateName,updatePolicy,updateSupplyCap,updateSymbol
|base-chain/specs/reference/b20/interfaces/IB20Asset:MAX_UI_MULTIPLIER,OPERATOR_ROLE,WAD_PRECISION,announce,balanceOfUI,batchMint,cancelUIMultiplierUpdate,effectiveAt,extraMetadata,fromUIAmount,isAnnouncementIdUsed,multiplier,newUIMultiplier,scaledBalanceOf,toRawBalance,toScaledBalance,toUIAmount,totalSupplyUI,uiMultiplier,updateExtraMetadata,updateMultiplier,updateUIMultiplier
|base-chain/specs/reference/b20/interfaces/IB20Factory:createB20,getB20Address,isB20,isB20Initialized
|base-chain/specs/reference/b20/interfaces/IB20Stablecoin:currency
|base-chain/specs/reference/b20/interfaces/IPolicyRegistry:MAX_COMPOSITE_CHILD_POLICIES,MIN_COMPOSITE_CHILD_POLICIES,compositePolicyChildIds,createCompositePolicy,createPolicy,createPolicyWithAccounts,finalizeUpdateAdmin,isAuthorized,pendingPolicyAdmin,policyAdmin,policyExists,renounceAdmin,stageUpdateAdmin,updateAllowlist,updateBlocklist,updateComposite
|base-chain/specs/upgrades:overview
|base-chain/specs/upgrades/azul:exec-engine,node-upgrade,overview,proofs
|base-chain/specs/upgrades/beryl:b20,overview,reducing-canonical-withdrawal-delay,reth-v2
|base-chain/specs/upgrades/canyon:overview
|base-chain/specs/upgrades/cobalt:dynamic-upgrades,eip-8130,overview
|base-chain/specs/upgrades/delta:overview,span-batches
|base-chain/specs/upgrades/denim:200ms-blocks,overview
|base-chain/specs/upgrades/ecotone:derivation,l1-attributes,overview
|base-chain/specs/upgrades/fjord:derivation,exec-engine,overview,predeploys
|base-chain/specs/upgrades/granite:derivation,exec-engine,overview
|base-chain/specs/upgrades/holocene:derivation,exec-engine,overview,system-config
|base-chain/specs/upgrades/isthmus:derivation,exec-engine,l1-attributes,overview,predeploys,system-config
|base-chain/specs/upgrades/jovian:derivation,exec-engine,l1-attributes,overview,system-config
|build-on-base:overview,test-on-vibenet
|build-on-base/accept-payments:authorize-a-payment,batch-high-frequency-payments,call-a-paid-service,capture-a-partial-amount,capture-an-authorization,charge-for-an-api,charge-on-a-schedule,reconcile-payments,refund-a-payment,request-a-payment,send-a-payout,settle-usage-based-payments,split-a-payment,verify-a-payment,void-an-authorization,watch-for-payments
|build-on-base/integrate-defi:integrate-borrowing,integrate-earn-product,integrate-lending,integrate-trading
|build-on-base/issue-rwa:announce-a-distribution,apply-a-multiplier,cancel-blocked-units,create-an-asset-token,issue-units,pause-transfers,restrict-eligible-holders
|build-on-base/issue-stablecoins:block-an-account,burn-supply,issue-your-stablecoin,mint-supply,pause-activity,reconcile-with-memos,recover-funds,restrict-who-can-hold
|get-started:accept-payments,base-batches,base-chain,base-ecosystem-fund,base-services-hub,base,connect-to-base,docs-llms,docs-mcp,get-funds,integrate-defi,issue-rwa,issue-stablecoins,make-a-transaction,resources-for-ai-agents,sdks-and-apis
|root:changes,cookie-policy,ia-guidelines,privacy-policy,terms-of-service
|sdks:base-anvil,overview
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
|sdks/base-account/more:telemetry
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
