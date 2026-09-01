---
title: Base Docs Index
description: Look up Base documentation with a compact directory-grouped index built for AI coding agents. Lists every markdown page by parent directory so agents find context before generating code.
---
# https://docs.base.org/llms.txt

## Base Documentation — LLM Entry Point

> High-signal index of section guides. Jump to a section's llms.txt for concise intros, curated links, and fast navigation.

- [Agents](./agents/llms.txt) — Give your AI assistant a wallet. Base MCP connects any AI to your Base Account. Check balances, send funds, swap tokens, sign messages, and pay with x402.
- [Base Chain](./base-chain/llms.txt) — Network details and wallet setup for Base Mainnet, Base Testnet (Sepolia), and Base Vibenet.
- [Build On Base](./build-on-base/llms.txt) — Build financial products on Base by outcome: integrate DeFi, tokenize assets, issue stablecoins, or accept payments.
- [Fonts](./fonts/llms.txt)
- [Get Started](./get-started/llms.txt)
- [Sdks](./sdks/llms.txt) — SDKs and APIs for accounts, identity verification, attribution, AI assistants, and direct Base chain access.
- [Specifications](./specifications/llms.txt) — Base protocol specifications — tokens, bridging, transactions, consensus, execution, and proofs.
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
|base-chain/api-reference:rpc-overview
|base-chain/api-reference/debug-api:debug_traceBlockByHash,debug_traceBlockByNumber,debug_traceTransaction
|base-chain/api-reference/ethereum-json-rpc-api:eth_blockNumber,eth_call,eth_chainId,eth_estimateGas,eth_feeHistory,eth_gasPrice,eth_getBalance,eth_getBlockByHash,eth_getBlockByNumber,eth_getBlockReceipts,eth_getBlockTransactionCountByHash,eth_getBlockTransactionCountByNumber,eth_getCode,eth_getLogs,eth_getStorageAt,eth_getTransactionByBlockHashAndIndex,eth_getTransactionByBlockNumberAndIndex,eth_getTransactionByHash,eth_getTransactionCount,eth_getTransactionReceipt,eth_maxPriorityFeePerGas,eth_sendRawTransaction,eth_subscribe,eth_syncing,eth_unsubscribe,net_version,web3_clientVersion
|base-chain/api-reference/flashblocks-api:base_transactionStatus,eth_simulateV1,flashblocks-api-overview,newFlashblockTransactions,newFlashblocks,pendingLogs
|base-chain/network-information:bridging-and-withdrawals,configuration-changelog,ecosystem-bridges,network-faucets
|base-chain/quickstart:connecting-to-base
|base-chain/specs/protocol:overview
|base-chain/specs/reference/b20/changelog:02-cobalt-b20-seize,02-cobalt-b20asset-multiplier,02-cobalt-policyregistry-composite-policy
|base-chain/specs/upgrades:overview
|base-chain/specs/upgrades/azul:exec-engine,node-upgrade,overview,proofs
|base-chain/specs/upgrades/beryl:b20,overview,reducing-canonical-withdrawal-delay,reth-v2
|base-chain/specs/upgrades/canyon:overview
|base-chain/specs/upgrades/cobalt:dynamic-upgrades,eip-8130,overview
|base-chain/specs/upgrades/delta:overview,span-batches
|base-chain/specs/upgrades/denim:200ms-blocks
|base-chain/specs/upgrades/ecotone:derivation,l1-attributes,overview
|base-chain/specs/upgrades/fjord:derivation,exec-engine,overview,predeploys
|base-chain/specs/upgrades/granite:derivation,exec-engine,overview
|base-chain/specs/upgrades/holocene:derivation,exec-engine,overview,system-config
|base-chain/specs/upgrades/isthmus:derivation,exec-engine,l1-attributes,overview,predeploys,system-config
|base-chain/specs/upgrades/jovian:derivation,exec-engine,l1-attributes,overview,system-config
|build-on-base:assign-user-attributes,overview,test-on-vibenet
|build-on-base/accept-payments:authorize-a-payment,batch-high-frequency-payments,call-a-paid-service,capture-a-partial-amount,capture-an-authorization,charge-for-an-api,charge-on-a-schedule,reconcile-payments,refund-a-payment,request-a-payment,send-a-payout,settle-usage-based-payments,split-a-payment,verify-a-payment,void-an-authorization,watch-for-payments
|build-on-base/integrate-defi:integrate-borrowing,integrate-earn-product,integrate-lending,integrate-trading
|build-on-base/issue-rwa:announce-a-distribution,apply-a-multiplier,cancel-blocked-units,create-an-asset-token,issue-units,pause-transfers,restrict-eligible-holders
|build-on-base/issue-stablecoins:block-an-account,burn-supply,issue-your-stablecoin,mint-supply,pause-activity,reconcile-with-memos,recover-funds,restrict-who-can-hold
|get-started:accept-payments,base-batches,base-chain,base-ecosystem-fund,base-services-hub,base,connect-to-base,docs-llms,docs-mcp,get-funds,integrate-defi,issue-rwa,issue-stablecoins,make-a-transaction,resources-for-ai-agents,sdks-and-apis
|root:changes,content-guidelines,contribution-guidelines,cookie-policy,ia-guidelines,mintlify-reference,privacy-policy,terms-of-service
|sdks:base-anvil,overview
|sdks/base-account:overview
|sdks/base-account/basenames:basename-transfer,basenames-faq
|sdks/base-account/contribute:contribute-to-base-account-docs,security-and-bug-bounty
|sdks/base-account/framework-integrations:cdp,rainbowkit,reown,thirdweb
|sdks/base-account/framework-integrations/privy:authentication,setup,spend-permissions,sub-accounts,wallet-actions
|sdks/base-account/framework-integrations/wagmi:base-pay,basenames,batch-transactions,other-use-cases,setup,sign-in-with-base,sub-accounts
|sdks/base-account/guides:accept-payments,accept-recurring-payments,authenticate-users,migration-guide,sign-and-verify-typed-data
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
|sdks/base-verify:overview,verify-social-accounts,verify-users-onchain
|specifications:flashblocks,native-account-abstraction,overview
|specifications/b20:changelog,launch-a-b20-token,specification-overview,tokenized-stocks-on-base
|specifications/b20/reference:constants-addresses,errors-events,invariants-tests
|specifications/b20/reference/interfaces/i-activation-registry:activate,admin,check-activated,deactivate,index,is-activated
|specifications/b20/reference/interfaces/i-policy-registry:composite-policy-child-ids,create-composite-policy,create-policy-with-accounts,create-policy,finalize-update-admin,index,is-authorized,max-composite-child-policies,min-composite-child-policies,pending-policy-admin,policy-admin,policy-exists,renounce-admin,stage-update-admin,update-allowlist,update-blocklist,update-composite
|specifications/b20/reference/interfaces/ib20:allowance,approve,balance-of,burn-blocked-role,burn-blocked,burn-role,burn-with-memo,burn,contract-uri,decimals,default-admin-role,domain-separator,eip712-domain,get-role-admin,grant-role,has-role,index,is-paused,metadata-role,mint-receiver-policy,mint-role,mint-with-memo,mint,name,nonces,pause-role,pause,paused-features,permit,policy-id,renounce-last-admin,renounce-role,revoke-role,seize-holder-policy,seize-receiver-policy,seize-role,seize-with-memo,set-role-admin,supply-cap,symbol,total-supply,transfer-executor-policy,transfer-from-with-memo,transfer-from,transfer-receiver-policy,transfer-sender-policy,transfer-with-memo,transfer,unpause-role,unpause,update-contract-uri,update-name,update-policy,update-supply-cap,update-symbol
|specifications/b20/reference/interfaces/ib20-asset:announce,balance-of-ui,batch-mint,cancel-ui-multiplier-update,effective-at,extra-metadata,from-ui-amount,index,is-announcement-id-used,max-ui-multiplier,multiplier,new-ui-multiplier,operator-role,scaled-balance-of,to-raw-balance,to-scaled-balance,to-ui-amount,total-supply-ui,ui-multiplier,update-extra-metadata,update-multiplier,update-ui-multiplier,wad-precision
|specifications/b20/reference/interfaces/ib20-factory:create-b20,get-b20-address,index,is-b20-initialized,is-b20
|specifications/b20/reference/interfaces/ib20-stablecoin:currency,index
|specifications/base-protocol:batcher,design-goals,overview
|specifications/base-protocol/bridging:base-solana-bridge,cross-domain-messengers,deposits,standard-bridges,withdrawals
|specifications/base-protocol/consensus:derivation,p2p,rpc,specification
|specifications/base-protocol/execution:l2-execution-engine,precompiles,predeploys,preinstalls
|specifications/base-protocol/proofs:challenger,overview,proof-contracts,proposer,registrar,tee-prover,zk-prover
|specifications/builder-codes:for-agent-developers,for-app-developers,for-wallet-developers,overview
|specifications/node-operators:performance-tuning,run-a-node,snapshots,troubleshooting
|specifications/reference:base-contracts,configuration,glossary,smart-contracts
|specifications/security:avoid-malicious-flags,report-a-vulnerability,security-council-for-base
|specifications/transactions:network-fees,throughput-and-limits,transaction-finality,transaction-ordering,troubleshooting-transactions
