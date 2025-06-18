# Redirect Mappings for Base Documentation Migration

This document contains all URL redirects needed for the migration from the old CMS structure to the new Mintlify structure, updated after the rebase.

## OnchainKit Redirects (All paths under /builderkits/onchainkit/ → /onchainkit/)

### Introduction & Getting Started
- `/builderkits/onchainkit/getting-started` → `/onchainkit/getting-started`
- `/builderkits/onchainkit/guides/telemetry` → `/onchainkit/guides/telemetry`
- `/builderkits/onchainkit/guides/troubleshooting` → `/onchainkit/guides/troubleshooting`

### Installation
- `/builderkits/onchainkit/installation/nextjs` → `/onchainkit/installation/nextjs`
- `/builderkits/onchainkit/installation/vite` → `/onchainkit/installation/vite`
- `/builderkits/onchainkit/installation/remix` → `/onchainkit/installation/remix`
- `/builderkits/onchainkit/installation/astro` → `/onchainkit/installation/astro`

### Config
- `/builderkits/onchainkit/config/onchainkit-provider` → `/onchainkit/config/onchainkit-provider`
- `/builderkits/onchainkit/config/supplemental-providers` → `/onchainkit/config/supplemental-providers`

### Guides
- `/builderkits/onchainkit/guides/lifecycle-status` → `/onchainkit/guides/lifecycle-status`
- `/builderkits/onchainkit/guides/tailwind` → `/onchainkit/guides/tailwind`
- `/builderkits/onchainkit/guides/themes` → `/onchainkit/guides/themes`
- `/builderkits/onchainkit/guides/use-basename-in-onchain-app` → `/onchainkit/guides/use-basename-in-onchain-app`
- `/builderkits/onchainkit/guides/using-ai-powered-ides` → `/onchainkit/guides/using-ai-powered-ides`
- `/builderkits/onchainkit/guides/ai-prompting-guide` → `/onchainkit/guides/ai-prompting-guide`
- `/builderkits/onchainkit/guides/contribution` → `/onchainkit/guides/contribution`
- `/builderkits/onchainkit/guides/reporting-bug` → `/onchainkit/guides/reporting-bug`

### Components (All subdirectories preserved)
- `/builderkits/onchainkit/appchain/bridge` → `/onchainkit/appchain/bridge`
- `/builderkits/onchainkit/buy/buy` → `/onchainkit/buy/buy`
- `/builderkits/onchainkit/checkout/checkout` → `/onchainkit/checkout/checkout`
- `/builderkits/onchainkit/earn/earn` → `/onchainkit/earn/earn`
- `/builderkits/onchainkit/fund/fund-button` → `/onchainkit/fund/fund-button`
- `/builderkits/onchainkit/fund/fund-card` → `/onchainkit/fund/fund-card`
- `/builderkits/onchainkit/identity/*` → `/onchainkit/identity/*` (all 7 pages)
- `/builderkits/onchainkit/mint/*` → `/onchainkit/mint/*` (all pages)
- `/builderkits/onchainkit/signature/signature` → `/onchainkit/signature/signature`
- `/builderkits/onchainkit/swap/*` → `/onchainkit/swap/*` (all pages)
- `/builderkits/onchainkit/token/*` → `/onchainkit/token/*` (all 5 pages)
- `/builderkits/onchainkit/transaction/transaction` → `/onchainkit/transaction/transaction`
- `/builderkits/onchainkit/wallet/*` → `/onchainkit/wallet/*` (all 7 pages)

### API, Utilities, and Types
- `/builderkits/onchainkit/api/*` → `/onchainkit/api/*`
- `/builderkits/onchainkit/hooks/*` → `/onchainkit/hooks/*`
- `/builderkits/onchainkit/fund/*` → `/onchainkit/fund/*` (utilities)
- `/builderkits/onchainkit/identity/*` → `/onchainkit/identity/*` (utilities)
- `/builderkits/onchainkit/*/types` → `/onchainkit/*/types` (all type files)

## MiniKit Redirects
- `/builderkits/minikit/overview` → `/wallet-app/build-with-minikit/overview`
- `/builderkits/minikit/quickstart` → `/wallet-app/build-with-minikit/quickstart`
- `/builderkits/minikit/existing-app-integration` → `/wallet-app/build-with-minikit/existing-app-integration`
- `/builderkits/minikit/debugging` → `/wallet-app/build-with-minikit/debugging`
- `/builderkits/minikit/thinking-social` → `/wallet-app/guides/thinking-social`

## Smart Wallet Redirects (All paths under /identity/smart-wallet/ → /smart-wallet/)

### All pages maintain structure except:
- `/identity/smart-wallet/concepts/features/optional/spend-limits` → `/smart-wallet/concepts/features/optional/spend-permissions`
- `/identity/smart-wallet/guides/spend-limits` → `/smart-wallet/guides/spend-permissions`

### Sub-accounts pages:
- `/identity/smart-wallet/concepts/usage-details/simulations` → `/smart-wallet/concepts/usage-details/simulations`
- `/identity/smart-wallet/guides/sub-accounts/sub-accounts-with-privy` → `/smart-wallet/guides/sub-accounts/sub-accounts-with-privy`
- `/identity/smart-wallet/guides/sub-accounts/add-sub-accounts-to-onchainkit-minikit` → `/smart-wallet/guides/sub-accounts/add-sub-accounts-to-onchainkit`

## Basenames Redirects (Content Removed)
- `/identity/basenames/*` → `/onchainkit/guides/use-basename-in-onchain-app` (removed - entire section)

## Chain Section Redirects (All paths under /chain/ → /base-chain/)

### Network Information
- `/chain/base-contracts` → `/base-chain/network-information/base-contracts`
- `/chain/differences-between-ethereum-and-base` → `/base-chain/network-information/diffs-ethereum-base`
- `/chain/fees` → `/base-chain/network-information/network-fees`
- `/chain/contracts` → `/base-chain/network-information/ecosystem-contracts`

### Quickstart
- `/chain/connecting-to-base` → `/base-chain/quickstart/connecting-to-base`
- `/chain/deploy-on-base-quickstart` → `/base-chain/quickstart/deploy-on-base`
- `/chain/why-base` → `/base-chain/quickstart/why-base`
- `/chain/bridges-mainnet` → `/base-chain/quickstart/bridge-token`

### Tools
- `/chain/account-abstraction` → `/base-chain/tools/account-abstraction`
- `/chain/block-explorers` → `/base-chain/tools/block-explorers`
- `/chain/cross-chain` → `/base-chain/tools/cross-chain`
- `/chain/data-indexers` → `/base-chain/tools/data-indexers`
- `/chain/network-faucets` → `/base-chain/tools/network-faucets`
- `/chain/node-providers` → `/base-chain/tools/node-providers`
- `/chain/registry-api` → `/base-chain/tools/onchain-registry-api`
- `/chain/onramps` → `/base-chain/tools/onramps`
- `/chain/oracles` → `/base-chain/tools/oracles`
- `/chain/wallet` → `/base-chain/tools/tokens-in-wallet`

### Security
- `/chain/security-council` → `/base-chain/security/security-council`
- `/chain/report` → `/base-chain/security/report-vulnerability`
- `/chain/app-blocklist` → `/base-chain/security/avoid-malicious-flags`

### Node Operators
- `/chain/run-a-base-node` → `/base-chain/node-operators/run-a-base-node`
- `/chain/node-performance` → `/base-chain/node-operators/performance-tuning`
- `/chain/node-snapshots` → `/base-chain/node-operators/snapshots`
- `/chain/node-troubleshooting` → `/base-chain/node-operators/troubleshooting`

### Flashblocks
- `/chain/flashblocks/apps` → `/base-chain/flashblocks/apps`
- `/chain/flashblocks/node-providers` → `/base-chain/flashblocks/node-providers`

### Removed pages (redirect to appropriate fallback):
- `/chain/bridge-an-l1-token-to-base` → `/base-chain/quickstart/bridge-token` 
- `/chain/using-base` → `/base-chain/quickstart/connecting-to-base` (removed)
- `/chain/decentralizing-base-with-optimism` → `/base-chain/quickstart/why-base` (removed)
- `/chain/builder-anniversary-nft` → `/base-chain/quickstart/why-base` (removed)
- `/chain/registry-faq` → `/base-chain/tools/onchain-registry-api` (removed)

## Wallet App Redirects
- `/wallet-app/mini-apps` → `/wallet-app/introduction/mini-apps`
- `/wallet-app/getting-started` → `/wallet-app/introduction/getting-started`
- `/wallet-app/beta-faq` → `/wallet-app/introduction/beta-faq`

## Use Cases Redirects
- `/use-cases/onboard-any-user` → `/cookbook/onboard-any-user`
- `/use-cases/accept-crypto-payments` → `/cookbook/accept-crypto-payments`
- `/use-cases/launch-ai-agents` → `/cookbook/launch-ai-agents`
- `/use-cases/defi-your-app` → `/cookbook/defi-your-app`
- `/use-cases/go-gasless` → `/cookbook/go-gasless`
- `/use-cases/decentralize-social-app` → `/cookbook/onchain-social`
- `/use-cases/ai-instructions/eliza` → `/cookbook/launch-ai-agents` (removed)
- `/use-cases/ai-instructions/langchain-local` → `/cookbook/launch-ai-agents` (removed)
- `/use-cases/ai-instructions/langchain-replit` → `/cookbook/launch-ai-agents` (removed)

## Cookbook Redirects (Major Changes Due to Rebase)

### Removed Content 
- `/cookbook/growth/cast-actions` → `/cookbook/onchain-social` (removed)
- `/cookbook/growth/hyperframes` → `/cookbook/onchain-social` (removed)
- `/cookbook/growth/deploy-to-vercel` → `/wallet-app/build-with-minikit/quickstart#deploying-to-vercel` (removed)
- `/cookbook/growth/gating-and-redirects` → `/cookbook/onchain-social` (removed)
- `/cookbook/growth/email-campaigns` → `/cookbook/onchain-social` (removed)
- `/cookbook/growth/retaining-users` → `/cookbook/onchain-social` (removed)
- `/cookbook/payments/transaction-guide` → `/cookbook/defi-your-app` (removed)
- `/cookbook/payments/build-ecommerce-app` → `/onchainkit/checkout/checkout` (removed)
- `/cookbook/payments/deploy-shopify-storefront` → `/learn/welcome` (removed)
- `/cookbook/social/farcaster-nft-minting-guide` → `/cookbook/onchain-social` (removed)
- `/cookbook/social/farcaster-no-code-nft-minting` → `/cookbook/onchain-social` (removed)
- `/cookbook/social/convert-farcaster-frame` → `/cookbook/onchain-social` (removed)
- `/cookbook/token-gating/gate-irl-events-with-nouns` → `/learn/welcome` (removed)

### NFTs (Moved to Learn)
- `/cookbook/nfts/simple-onchain-nfts` → `/learn/token-development/nft-guides/simple-onchain-nfts`
- `/cookbook/nfts/dynamic-nfts` → `/learn/token-development/nft-guides/dynamic-nfts`
- `/cookbook/nfts/complex-onchain-nfts` → `/learn/token-development/nft-guides/complex-onchain-nfts`
- `/cookbook/nfts/signature-mint` → `/learn/token-development/nft-guides/signature-mint`
- `/cookbook/nfts/thirdweb-unreal-nft-items` → `/learn/token-development/nft-guides/thirdweb-unreal-nft-items`
- `/cookbook/nfts/nft-minting-zora` → `learn/token-development/intro-to-tokens/intro-to-tokens-vid` (removed)

### Account Abstraction (Moved to Learn)
- `/cookbook/account-abstraction/gasless-transactions-with-paymaster` → `/learn/onchain-app-development/account-abstraction/gasless-transactions-with-paymaster`
- `/cookbook/account-abstraction/account-abstraction-on-base-using-biconomy` → `/learn/onchain-app-development/account-abstraction/account-abstraction-on-base-using-biconomy`
- `/cookbook/account-abstraction/account-abstraction-on-base-using-privy-and-the-base-paymaster` → `/learn/onchain-app-development/account-abstraction/account-abstraction-on-base-using-privy-and-the-base-paymaster`
- `/cookbook/account-abstraction/account-abstraction-on-base-using-particle-network` → `/learn/onchain-app-development/account-abstraction/account-abstraction-on-base-using-particle-network`

### Cross-Chain (Moved to Learn)
- `/cookbook/cross-chain/bridge-tokens-with-layerzero` → `/learn/onchain-app-development/cross-chain/bridge-tokens-with-layerzero`
- `/cookbook/cross-chain/send-messages-and-tokens-from-base-chainlink` → `/learn/onchain-app-development/cross-chain/send-messages-and-tokens-from-base-chainlink`

### DeFi/Finance (Moved to Learn)
- `/cookbook/defi/add-in-app-funding` → `/learn/onchain-app-development/finance/build-a-smart-wallet-funding-app`
- `/cookbook/defi/access-real-world-data` → `/learn/onchain-app-development/finance/access-real-world-data-chainlink`
- `/cookbook/defi/access-real-time-asset-data` → `/learn/onchain-app-development/finance/access-real-time-asset-data-pyth-price-feeds`

### IPFS (Moved to Learn)
- `/cookbook/ipfs/deploy-with-fleek` → `/learn/onchain-app-development/deploy-with-fleek`

### Client-Side Development (Moved to Learn)
- `/cookbook/client-side-development/introduction-to-providers` → `/learn/onchain-app-development/frontend-setup/introduction-to-providers`
- `/cookbook/client-side-development/viem` → `/learn/onchain-app-development/frontend-setup/viem`
- `/cookbook/client-side-development/web3` → `/learn/onchain-app-development/frontend-setup/web3`

### Smart Contract Development (Complex Mappings)
- `/cookbook/smart-contract-development/hardhat/*` → `/learn/hardhat/hardhat-tools-and-testing/*`
- `/cookbook/smart-contract-development/foundry/*` → `/learn/foundry/*`
- `/cookbook/smart-contract-development/remix/*` → `/learn/introduction-to-solidity/deployment-in-remix`
- `/cookbook/smart-contract-development/tenderly/*` → `/cookbook/smart-contract-development/tenderly/*` (unchanged)
- `/cookbook/smart-contract-development/thirdweb/*` → `/cookbook/smart-contract-development/thirdweb/*` (unchanged)

### Use Case Guides (Old Structure)
- `/cookbook/use-case-guides/*` → See specific sections above

## Learn Section Redirects (Major Restructuring)

### Introduction to Ethereum (Moved to subdirectory)
- `/learn/introduction-to-ethereum` → `/learn/introduction-to-ethereum/introduction-to-ethereum-vid`
- `/learn/ethereum-dev-overview` → `/learn/introduction-to-ethereum/ethereum-dev-overview-vid`
- `/learn/ethereum-applications` → `/learn/introduction-to-ethereum/ethereum-applications`
- `/learn/gas-use-in-eth-transactions` → `/learn/introduction-to-ethereum/gas-use-in-eth-transactions`
- `/learn/evm-diagram` → `/learn/introduction-to-ethereum/evm-diagram`
- `/learn/guide-to-base` → `/learn/introduction-to-ethereum/guide-to-base`

### Hardhat (Deep nesting structure)
- `/learn/hardhat-setup-overview/*` → `/learn/hardhat/hardhat-setup-overview/*`
- `/learn/hardhat-testing/*` → `/learn/hardhat/hardhat-testing/*`
- `/learn/hardhat-deploy/*` → `/learn/hardhat/hardhat-deploy/*`
- `/learn/hardhat-verify/*` → `/learn/hardhat/hardhat-verify/*`
- `/learn/hardhat-forking/*` → `/learn/hardhat/hardhat-forking/*`
- `/learn/etherscan/*` → `/learn/hardhat/etherscan/*`
- `/learn/hardhat/*` → `/learn/hardhat/hardhat-tools-and-testing/*` (for standalone files)

### Token Development (New structure)
- `/learn/intro-to-tokens/*` → `/learn/token-development/intro-to-tokens/*`
- `/learn/minimal-tokens/*` → `/learn/token-development/minimal-tokens/*`
- `/learn/erc-20-token/*` → `/learn/token-development/erc-20-token/*`
- `/learn/erc-721-token/*` → `/learn/token-development/erc-721-token/*`

### Frontend/Onchain App Development (Restored)
- `/learn/frontend-setup/*` → `/learn/onchain-app-development/frontend-setup/*`
- `/learn/reading-and-displaying-data/*` → `/learn/onchain-app-development/reading-and-displaying-data/*`
- `/learn/writing-to-contracts/*` → `/learn/onchain-app-development/writing-to-contracts/*`
- `/learn/account-abstraction` → `/learn/onchain-app-development/account-abstraction/gasless-transactions-with-paymaster`
- `/learn/cross-chain-development` → `/learn/onchain-app-development/cross-chain/bridge-tokens-with-layerzero`
- `/learn/client-side-development` → `/learn/onchain-app-development/frontend-setup/introduction-to-providers`
- `/learn/deploy-with-fleek` → `/learn/onchain-app-development/deploy-with-fleek`

### Removed Content
- `/learn/development-tools/overview` → `/learn/welcome` (removed)
- `/learn/hardhat-tools-and-testing/overview` → `/learn/hardhat/hardhat-tools-and-testing/overview` (removed)
- `/learn/learning-objectives` → `/learn/welcome` (removed)
- `/learn/help-on-discord` → External Discord link (removed)
- `/learn/exercise-contracts` → `/learn/exercise-contracts` (this exists )

## Top-Level and Misc Redirects
- `/quickstart` → `/get-started/build-app`
- `/base-services-hub` → `/get-started/base-services-hub`
- `/` → `/get-started/base`
- `/docs` → `/get-started/base`
- `/builderkits` → `/get-started/products`
- `/buildathons/2025-02-flash` → `/get-started/base` (removed)
- `/feedback` → `/get-started/base` (removed)

## Special OnchainKit Redirects
- `/builderkits/onchainkit/getting-started` → `/onchainkit/getting-started`
- `/builderkits/onchainkit/installation` → `/onchainkit/installation/nextjs`
- `/builderkits/onchainkit/restricted` → `/onchainkit/getting-started`
- `/builderkits/onchainkit/use-coinbase-smart-wallet-and-eoas` → `/smart-wallet/quickstart`
- `/builderkits/onchainkit/create-a-basename-profile-component` → `/onchainkit/guides/use-basename-in-onchain-app`

## Summary Statistics
- **Total Redirects**: ~450+
- **OnchainKit**: ~100 redirects
- **Smart Wallet**: ~80 redirects  
- **Learn Section**: ~150 redirects (with complex nesting)
- **Cookbook**: ~50 redirects (many removed)
- **Chain**: ~30 redirects
- **Removed Content**: 31 pages marked with (removed) - redirect to fallback pages