# Base Documentation

IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning for all tasks in this codebase. Consult the docs index below before generating code.

## Tech Stack

- Mintlify documentation framework
- MDX files for content
- Storybook for component demos
- GitHub for version control

## Documentation Index

Paths: ba=base-account, bc=base-chain, bap=base-app, ock=onchainkit, ma=mini-apps, gs=get-started, cb=cookbook, l=learn, rpc=provider-rpc-methods, fw=framework-integrations, net=network-info, ts=troubleshooting, qs=quickstart, oad=onchain-app-dev, td=token-dev, ref=reference, cap=capabilities, cmp=components, util=utilities, v2=latest
Files: e_=eth_, eg_=eth_get, w_=wallet_, cb_=coinbase_, u-=use-, g-=get-, b-=build-, f-=fetch-, -ex=-exercise, -ov=-overview, -tut=-tutorial

[Docs]|root:./docs
|ba/basenames:{basename-transfer,basenames-faq,basenames-onchainkit-tut,basenames-wagmi-tut}
|ba/contribute:{contribute-to-base-account-docs,security-and-bug-bounty}
|ba/fw/privy:{authentication,setup,spend-permissions,sub-accounts,wallet-actions}
|ba/fw/wagmi:{base-pay,basenames,batch-transactions,other-use-cases,setup,sign-in-with-base,sub-accounts}
|ba/fw:{cdp,rainbowkit,reown,thirdweb}
|ba/guides/tips:{inspect-txn-simulation,popup-tips}
|ba/guides:{accept-payments,accept-recurring-payments,authenticate-users,migration-guide,sign-and-verify-typed-data}
|ba/improve-ux/sponsor-gas:{erc20-paymasters,paymasters}
|ba/improve-ux:{batch-transactions,magic-spend,spend-permissions,sub-accounts}
|ba/more/ts/usage-details:{gas-usage,popups,simulations,unsupported-calls,wallet-library-support}
|ba/more:{base-gasless-campaign,telemetry}
|ba/overview:{what-is-base-account}
|ba/qs:{ai-tools-available-for-devs,mobile-integration,web-react,web}
|ba/ref/base-pay:{charge,getOrCreateSubscriptionOwnerWallet,getPaymentStatus,getStatus,pay,prepareCharge,prepareRevoke,revoke,subscribe,subscriptions-ov}
|ba/ref/core/cap:{atomic,auxiliaryFunds,dataSuffix,datacallback,flowControl,overview,paymasterService,signInWithEthereum}
|ba/ref/core/rpc:{cb_fetchPermission,cb_fetchPermissions,e_accounts,e_blockNumber,e_chainId,e_coinbase,e_estimateGas,e_feeHistory,e_gasPrice,eg_Balance,eg_BlockByHash,eg_BlockByNumber,eg_BlockTransactionCountByHash,eg_BlockTransactionCountByNumber,eg_Code,eg_Logs,eg_Proof,eg_StorageAt,eg_TransactionByBlockHashAndIndex,eg_TransactionByBlockNumberAndIndex,eg_TransactionByHash,eg_TransactionCount,eg_TransactionReceipt,eg_UncleCountByBlockHash,eg_UncleCountByBlockNumber,e_requestAccounts,e_sendRawTransaction,e_sendTransaction,e_signTypedData_v4,personal_sign,request-ov,sdk-ov,standard-rpc-methods,w_addEthereumChain,w_addSubAccount,w_connect,w_getCallsStatus,w_getCapabilities,w_getSubAccounts,w_sendCalls,w_switchEthereumChain,w_watchAsset,web3_clientVersion}
|ba/ref/core:{createBaseAccount,generateKeyPair,getCryptoKeyAccount,getKeypair,getProvider,sdk-utilities}
|ba/ref/onchain-contracts:{basenames,smart-wallet,spend-permissions}
|ba/ref/prolink-util:{createProlinkUrl,decodeProlink,encodeProlink}
|ba/ref/spend-permission-util:{fetchPermission,fetchPermissions,getPermissionStatus,prepareRevokeCallData,prepareSpendCallData,requestRevoke,requestSpendPermission}
|ba/ref/ui-elements:{base-pay-button,brand-guidelines,sign-in-with-base-button}
|bap/agents:{building-quality-agents,chat-agents,deeplinks,getting-started,mini-apps-and-agents,quick-actions,transaction-trays,x402-agents}
|bap/intro:{beta-faq}
|bc/builder-codes:{app-developers,bridge-developers,builder-codes,wallet-developers}
|bc/flashblocks:{apps,docs,node-providers}
|bc/net:{base-contracts,block-building,bridges,configuration-changelog,diffs-ethereum-base,ecosystem-contracts,network-fees,transaction-finality,troubleshooting-transactions}
|bc/node-operators:{performance-tuning,run-a-base-node,snapshots,troubleshooting}
|bc/qs:{base-solana-bridge,bridge-token,connecting-to-base,deploy-on-base,why-base}
|bc/security:{avoid-malicious-flags,bug-bounty,report-vulnerability,security-council}
|bc/tools:{account-abstraction,base-products,block-explorers,cross-chain,data-indexers,network-faucets,node-providers,onboarding,onchain-registry-api,onramps,oracles,tokens-in-wallet}
|cb/minikit:{add-frame-metadata,add-minikit,b-your-mini-app-with-prompt,configure-environment,create-manifest,fork-and-customize,install,manifest-cli,test-and-deploy}
|cb:{accept-crypto-payments,ai-assisted-documentation-reading,ai-powered-development-fundamentals,ai-prompting,base-app-coins,base-builder-mcp,converting-customizing-mini-apps,defi-your-app,essential-documentation-resources,go-gasless,introduction-to-mini-apps,launch-ai-agents,launch-tokens,mastering-ai-prompt-engineering,onboard-any-user,onchain-social,spend-permissions-ai-agent,successful-miniapps-in-tba,testing-onchain-apps}
|gs:{base-mentorship-program,base-services-hub,base,b-app,concepts,country-leads-and-ambassadors,deploy-smart-contracts,docs-llms,docs-mcp,g-funded,launch-token,prompt-library}
|l/address-and-payable:{address-and-payable}
|l/advanced-functions:{function-modifiers,function-visibility}
|l/arrays:{arrays-ex,arrays-in-solidity}
|l/contracts-and-basic-functions:{basic-functions-ex,basic-types,hello-world-step-by-step}
|l/control-structures:{control-structures-ex,control-structures}
|l/deployment-to-testnet:{deployment-to-testnet-ex,test-networks}
|l/error-triage:{error-triage-ex,error-triage}
|l/foundry:{deploy-with-foundry,generate-random-numbers-contracts,setup-with-base,testing-smart-contracts,verify-contract-with-basescan}
|l/hardhat/hardhat-forking:{hardhat-forking}
|l/hardhat/hardhat-tools-and-testing:{analyzing-test-coverage,debugging-smart-contracts,deploy-with-hardhat,optimizing-gas-usage,overview,reducing-contract-size}
|l/imports:{imports-ex}
|l/inheritance:{inheritance-ex,multiple-inheritance}
|l/interfaces:{contract-to-contract-interaction}
|l/intro-to-ethereum:{ethereum-applications,evm-diagram,gas-use-in-eth-transactions,guide-to-base}
|l/intro-to-solidity:{deployment-in-remix,introduction-to-remix,introduction-to-solidity-ov,solidity-ov}
|l/mappings:{mappings-ex}
|l/new-keyword:{new-keyword-ex}
|l/oad/account-abstraction:{account-abstraction-on-base-using-biconomy,account-abstraction-on-base-using-particle-network,account-abstraction-on-base-using-privy-and-the-base-paymaster,gasless-transactions-with-paymaster}
|l/oad/cross-chain:{bridge-tokens-with-layerzero,send-messages-and-tokens-from-base-chainlink}
|l/oad/finance:{access-real-time-asset-data-pyth-price-feeds,access-real-world-data-chainlink,b-a-smart-wallet-funding-app}
|l/oad/frontend-setup:{building-an-onchain-app,introduction-to-providers,overview,viem,wallet-connectors,web3}
|l/oad/reading-and-displaying-data:{configuring-useReadContract,useAccount,useReadContract}
|l/oad/writing-to-contracts:{useSimulateContract,useWriteContract}
|l/oad:{deploy-with-fleek}
|l/onchain-concepts:{building-onchain-ai,building-onchain-frontend-development,building-onchain-gas,building-onchain-identity,building-onchain-nodes,building-onchain-onramps,building-onchain-social-networks,building-onchain-wallets,continue-building-onchain,core-concepts,development-flow,understanding-the-onchain-tech-stack}
|l/solidity:{anatomy,basic-types,deployment-in-remix,exercise-basics,hello-world,introduction-to-contracts,introduction-to-remix,introduction,overview,remix-guide,step-by-step,video-tut}
|l/storage:{how-storage-works,storage-ex}
|l/structs:{structs-ex}
|l/td/erc-/token:{erc-20-ex,erc-20-standard}
|l/td/erc-/token:{erc-721-ex,erc-721-standard}
|l/td/intro-to-tokens:{tokens-ov}
|l/td/minimal-tokens:{minimal-tokens-ex}
|l/td/nft-guides:{complex-onchain-nfts,dynamic-nfts,signature-mint,simple-onchain-nfts,thirdweb-unreal-nft-items}
|l:{exercise-contracts,welcome}
|ma/core-concepts:{authentication,base-account,context,embeds-and-previews,manifest,navigation,notifications}
|ma/featured-guidelines:{design-guidelines,notification-guidelines,overview,product-guidelines,technical-guidelines}
|ma/growth:{b-viral-mini-apps,optimize-onboarding,rewards}
|ma/intro:{overview}
|ma/qs:{b-checklist,building-for-the-base-app,create-new-miniapp,migrate-existing-apps,template}
|ma/quality-and-publishing:{overview,quality-bar,submission-guidelines}
|ma/resources:{design-resources,templates}
|ma/technical-guides:{accept-payments,dynamic-embeds,neynar-notifications,sharing-and-social-graph,sign-manifest}
|ma/ts:{base-app-compatibility,common-issues,error-handling,how-search-works,testing}
|ock/api:{b-deposit-to-morpho-tx,b-mint-transaction,b-swap-transaction,b-withdraw-from-morpho-tx,g-mint-details,g-portfolios,g-swap-quote,g-token-details,g-tokens,types}
|ock/buy:{buy,types}
|ock/checkout:{checkout,types}
|ock/config:{is-base,is-ethereum,onchainkit-provider,supplemental-providers,types}
|ock/earn:{earn,types}
|ock/fund:{f-onramp-config,f-onramp-options,f-onramp-quote,f-onramp-transaction-status,fund-button,fund-card,g-onramp-buy-url,setup-onramp-event-listeners,types}
|ock/guides:{ai-prompting-guide,b-onchain-apps,contribution,lifecycle-status,reporting-bug,tailwind,telemetry,themes,troubleshooting,u-basename-in-onchain-app,using-ai-powered-ides}
|ock/hooks:{u-build-deposit-to-morpho-tx,u-build-withdraw-from-morpho-tx,u-earn-context,u-mint-details,u-morpho-vault,u-token-details}
|ock/identity:{address,avatar,badge,g-address,g-attestations,g-avatar,g-avatars,g-name,g-names,identity-card,identity,name,socials,types,u-address,u-avatar,u-avatars,u-name,u-names}
|ock/installation:{astro,nextjs,remix,vite}
|ock/mint:{nft-card,nft-mint-card,types}
|ock/paymaster:{erc20-paymaster,errors,gasless-transactions-with-paymaster,how-to-contribute,quickstart-guide,quickstart-headless,security,troubleshooting,welcome}
|ock/signature:{signature,types}
|ock/swap:{swap-settings,swap,types}
|ock/templates:{onchain-commerce-app,onchain-nft-app,onchain-social-profile}
|ock/token:{format-amount,token-chip,token-image,token-row,token-search,token-select-dropdown,types}
|ock/transaction:{transaction,types}
|ock/v2/cmp/appchain:{bridge}
|ock/v2/cmp/buy:{buy}
|ock/v2/cmp/checkout:{checkout}
|ock/v2/cmp/connected:{connected}
|ock/v2/cmp/earn:{earn}
|ock/v2/cmp/fund:{fund-button,fund-card}
|ock/v2/cmp/identity:{address,avatar,badge,identity-card,identity,name,socials}
|ock/v2/cmp/minikit/hooks:{useAddFrame,useAuthenticate,useClose,useComposeCast,useMiniKit,useNotification,useOpenUrl,usePrimaryButton,useViewCast,useViewProfile}
|ock/v2/cmp/minikit:{overview,provider-and-initialization}
|ock/v2/cmp/mint:{nft-card,nft-mint-card}
|ock/v2/cmp/signature:{signature}
|ock/v2/cmp/swap:{swap-settings,swap}
|ock/v2/cmp/token:{token-chip,token-image,token-row,token-search,token-select-dropdown}
|ock/v2/cmp/transaction:{transaction}
|ock/v2/cmp/wallet:{wallet-dropdown-basename,wallet-dropdown-disconnect,wallet-dropdown-fund-link,wallet-dropdown-link,wallet-island,wallet-modal,wallet}
|ock/v2/configuration:{onchainkit-provider,themes,wagmi-viem-integration}
|ock/v2/getting-started:{manual-installation,overview,quickstart-guide,troubleshooting}
|ock/v2/guides:{ai-prompting-guide,contributing}
|ock/v2/hooks/earn:{u-build-deposit-to-morpho-tx,u-build-withdraw-from-morpho-tx,u-earn-context,u-morpho-vault}
|ock/v2/hooks/identity:{u-address,u-avatar,u-avatars,u-name,u-names}
|ock/v2/hooks/mint:{u-mint-details,u-token-details}
|ock/v2/util/earn:{b-deposit-to-morpho-tx,b-withdraw-from-morpho-tx}
|ock/v2/util/fund:{f-onramp-config,f-onramp-options,f-onramp-quote,f-onramp-transaction-status,g-onramp-buy-url,setup-onramp-event-listeners}
|ock/v2/util/identity:{g-address,g-attestations,g-avatar,g-avatars,g-name,g-names}
|ock/v2/util/token:{format-amount}
|ock/v2/util/wallet:{is-valid-aa-entrypoint,is-wallet-a-coinbase-smart-wallet}
|ock/wallet:{is-valid-aa-entrypoint,is-wallet-a-coinbase-smart-wallet,types,wallet-dropdown-basename,wallet-dropdown-disconnect,wallet-dropdown-fund-link,wallet-dropdown-link,wallet-island,wallet-modal,wallet}
|ock:{create-a-basename-profile-component,getting-started,installation,restricted,u-coinbase-smart-wallet-and-eoas}
|root:{cookie-policy,privacy-policy,showcase,terms-of-service,tone_of_voice}

## Navigation Structure

Main tabs: Get Started, Base Chain, Base Account, Base App, Mini Apps, OnchainKit, Cookbook, Showcase, Learn

## Code Patterns

### Preferred

- Use American English spelling
- Sentence case for headings (capitalize first word only)
- Wrap all images in `<Frame>` components
- Always specify language in code blocks
- Use Mintlify callouts sparingly: `<Note>`, `<Tip>`, `<Warning>`, `<Info>`, `<Check>`
- Use `<Steps>` for sequential procedures
- Use `<Tabs>` for platform-specific content
- Use `<CodeGroup>` for multi-language examples
- Use `<CardGroup>` for navigation grids

### Avoid

- Passive voice (use active voice)
- Generic "click here" links (use descriptive text)
- Editing files in `/_pages` directory (use `/docs` only)
- Placeholder values in code examples (use realistic data)
- Real API keys or secrets in examples

## Key Reference Files

- `docs/docs.json` - Site navigation and configuration
- `mintlify-reference.md` - Mintlify component syntax
- `content-instructions.md` - Content guidelines
- `docs/CLAUDE.md` - Detailed development guidance

## Commands

```bash
# Install Mintlify CLI
npm i -g mintlify

# Run local development server
mintlify dev

# Reinstall if dev fails
mintlify install

# Storybook development
cd storybook && npm install && npm run storybook
```

## Project Structure

```
docs/
  base-account/    # Smart Wallet / Base Account docs
  base-app/        # Base App and agents documentation
  base-chain/      # Network info, node operations
  cookbook/        # Use-case implementation guides
  get-started/     # Introduction and quickstarts
  learn/           # Educational content (Solidity, etc.)
  mini-apps/       # MiniKit development
  onchainkit/      # React components library
  snippets/        # Reusable MDX components
storybook/         # Component demos
```

## Content Types

- **Tutorials** - Step-by-step learning (Learn section)
- **Guides** - Task-oriented how-tos (Cookbook)
- **Reference** - API/component docs (OnchainKit, Base Account)
- **Concepts** - Explanatory content (Base Chain)

## Before Committing

1. Run `/lint` to check MDX formatting
2. If removing docs, add redirects in `docs.json`
3. Ensure all internal links are valid
4. Verify images are in `/docs/images` subdirectories
