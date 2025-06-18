# Redirect Analysis - Base Documentation Migration

## Overview
This analysis covers the URL structure changes from the old CMS to the new Mintlify documentation system, including the recent rebase changes from master.

## Recent Changes from Rebase (Git History Analysis)

### 1. **Cookbook Content Removal** (Commit: d0d92a2)
The following cookbook sections were completely removed from the docs directory:
- `/cookbook/defi/` - All 3 files deleted
- `/cookbook/growth/` - All 6 files deleted  
- `/cookbook/nfts/` - All 6 files deleted
- `/cookbook/payments/` - All 3 files deleted
- `/cookbook/social/` - All 3 files deleted

**Total: 21 cookbook files removed**

### 2. **Learn Section Major Restructuring** (Commit: d50a5fc)

#### New Organizational Structure:
- **Introduction to Ethereum** - Moved from root `/learn/` to `/learn/introduction-to-ethereum/`
- **Token Development** - Created new section `/learn/token-development/` with subsections:
  - `/intro-to-tokens/`
  - `/minimal-tokens/`
  - `/erc-20-token/`
  - `/erc-721-token/`
  - `/nft-guides/` (moved from cookbook)
- **Hardhat Development** - Reorganized into nested structure:
  - `/learn/hardhat/hardhat-setup-overview/`
  - `/learn/hardhat/hardhat-testing/`
  - `/learn/hardhat/hardhat-deploy/`
  - `/learn/hardhat/hardhat-verify/`
  - `/learn/hardhat/hardhat-forking/`
  - `/learn/hardhat/hardhat-tools-and-testing/`
  - `/learn/hardhat/etherscan/`
- **Onchain App Development** - Enhanced with new sections:
  - `/frontend-setup/` (restored from _pages)
  - `/reading-and-displaying-data/` (new)
  - `/writing-to-contracts/` (new)
  - `/account-abstraction/`
  - `/cross-chain/`
  - `/finance/`

## Major Folder Structure Changes Identified

### 1. **Builder Kits → Promoted to Top Level**
- **OnchainKit**: `/builderkits/onchainkit/*` → `/onchainkit/*`
  - All ~100+ pages moved from subdirectory to root level
  - Complete preservation of internal structure
  
- **MiniKit**: `/builderkits/minikit/*` → `/wallet-app/build-with-minikit/*`
  - Moved under Wallet App section
  - Small section (5 pages)

- **AgentKit**: External link, no changes needed

### 2. **Identity → Split into Multiple Sections**
- **Smart Wallet**: `/identity/smart-wallet/*` → `/smart-wallet/*`
  - Promoted to top-level tab
  - All ~80+ pages preserved
  - Notable change: `spend-limits` → `spend-permissions`
  - New page added: `request-overview` in technical reference

- **Basenames**: `/identity/basenames/*` → REMOVED
  - Content integrated into OnchainKit documentation
  - All 3 pages redirect to `/onchainkit/guides/use-basename-in-onchain-app`

- **Verifications**: External CDP link, no changes

### 3. **Chain → Base Chain**
- All `/chain/*` pages → `/base-chain/*`
- Internal restructuring:
  - Some pages moved to `/base-chain/quickstart/`
  - Some moved to `/base-chain/network-information/`
  - Some moved to `/base-chain/tools/`
  - Some moved to `/base-chain/security/`
  - Some moved to `/base-chain/node-operators/`

### 4. **Cookbook → Mixed Destinations**
- **Completely Removed** (as of rebase):
  - `/cookbook/defi/*` → Content may exist in Learn section
  - `/cookbook/growth/*` → No replacement found
  - `/cookbook/nfts/*` → Moved to `/learn/token-development/nft-guides/`
  - `/cookbook/payments/*` → No replacement found
  - `/cookbook/social/*` → No replacement found
  
- **Still in Cookbook**:
  - Account Abstraction → Moved to `/learn/onchain-app-development/account-abstraction/`
  - Cross-chain → Moved to `/learn/onchain-app-development/cross-chain/`
  - IPFS → Moved to `/learn/onchain-app-development/deploy-with-fleek`
  - Token gating → Removed completely

### 5. **Use Cases → Cookbook**
- All `/use-cases/*` → `/cookbook/*`
- AI instructions subsection removed entirely

### 6. **Learn → Major Restructuring**
- **Flattened then Re-nested**:
  - Introduction to Ethereum: `/learn/*` → `/learn/introduction-to-ethereum/*`
  - Token content: `/learn/[token-type]/*` → `/learn/token-development/[token-type]/*`
  - Hardhat: `/learn/hardhat/*` → `/learn/hardhat/[subsection]/*`
  
- **New Sections Added**:
  - `/learn/onchain-concepts/` (new)
  - `/learn/onchain-app-development/` (expanded)
  - Frontend development content restored

### 7. **Wallet App → Added Introduction Layer**
- `/wallet-app/*` → `/wallet-app/introduction/*`
- MiniKit content moved here from Builder Kits

## Files Not Found in New Structure (Removed/Missing)

### Chain Section (Missing - Need Redirects)
1. `/chain/bridge-an-l1-token-to-base`
2. `/chain/block-building`
3. `/chain/using-base`
4. `/chain/onboarding`
5. `/chain/decentralizing-base-with-optimism`
6. `/chain/builder-anniversary-nft`
7. `/chain/registry-faq`

### Smart Wallet Section (Missing)
1. `/identity/smart-wallet/concepts/usage-details/simulations`
2. `/identity/smart-wallet/guides/sub-accounts/sub-accounts-with-privy`
3. `/identity/smart-wallet/guides/sub-accounts/add-sub-accounts-to-onchainkit-minikit`

### Cookbook Section (Removed in Rebase)
All content under:
1. `/cookbook/growth/*` - 6 files
2. `/cookbook/payments/*` - 3 files  
3. `/cookbook/social/*` - 3 files
4. `/cookbook/token-gating/*`

### Use Cases (Removed)
1. `/use-cases/ai-instructions/eliza`
2. `/use-cases/ai-instructions/langchain-local`
3. `/use-cases/ai-instructions/langchain-replit`

## Content Migration Patterns

### 1. **Cookbook → Learn Migration**
- NFT guides: `/cookbook/nfts/*` → `/learn/token-development/nft-guides/*`
- Account Abstraction: `/cookbook/account-abstraction/*` → `/learn/onchain-app-development/account-abstraction/*`
- Cross-chain: `/cookbook/cross-chain/*` → `/learn/onchain-app-development/cross-chain/*`
- Finance/DeFi: `/cookbook/defi/*` → `/learn/onchain-app-development/finance/*`
- IPFS: `/cookbook/ipfs/*` → `/learn/onchain-app-development/deploy-with-fleek`

### 2. **Learn Internal Reorganization**
- Hardhat content deeply nested into functional groups
- Token development consolidated under single section
- Frontend/app development expanded with new content

## Key Observations

### 1. **Content Consolidation Strategy**
- Cookbook being phased out in favor of Learn section
- Technical tutorials moved to appropriate Learn subsections
- Use case guides removed or consolidated

### 2. **Improved Organization**
- Learn section now has clearer hierarchy
- Related content grouped together (all token content, all Hardhat content)
- Frontend development restored and expanded

### 3. **Content Gaps**
- Many cookbook "growth" and "payments" guides have no clear replacement
- Some chain documentation removed without replacement
- AI-related content completely removed

## Redirect Statistics
- **Total redirects needed**: ~450+
- **New from rebase**: ~50+ additional redirects
- **Complete removals**: ~50+ pages (need fallback redirects)
- **Complex migrations**: Cookbook → Learn with path changes

## Special Attention Required

### 1. **Deleted Cookbook Content**
Need to determine redirect strategy for:
- Growth guides (cast-actions, hyperframes, etc.) - Still exist in _pages but not in docs
- Payment guides - No clear replacement
- Social guides - No clear replacement

### 2. **Missing Chain Documentation**
Several chain pages have no replacement - need fallback strategy

### 3. **Path Complexity**
Some redirects require careful mapping due to deep nesting changes in Learn section

## Recommendations
1. For removed cookbook content with no replacement → Redirect to `/learn/welcome`
2. For removed chain content → Redirect to `/base-chain/quickstart/why-base` or `/get-started/base`
3. Create a "migration guide" page explaining where content has moved
4. Verify all NFT guide redirects map correctly to new token-development section