# Redirect Analysis - Base Documentation Migration

## Overview
This analysis covers the URL structure changes from the old CMS to the new Mintlify documentation system.

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
- **Preserved in Cookbook**:
  - NFTs, Account Abstraction, Cross-chain sections
  - Use case guides reorganized into: growth/, payments/, social/, defi/
  
- **Moved to Learn**:
  - Smart contract development (Hardhat, Foundry, Remix)
  - Client-side development
  - IPFS content
  
- **Removed**: Token gating → redirect to `/learn/welcome`

### 5. **Use Cases → Cookbook**
- All `/use-cases/*` → `/cookbook/*`
- AI instructions subsection removed entirely

### 6. **Learn → Consolidated Structure**
- Flattened hierarchy in several areas:
  - `/learn/introduction-to-ethereum/*` → `/learn/*` (direct pages)
  - Hardhat sections consolidated under `/learn/hardhat/`
  - Frontend/onchain app development sections removed

### 7. **Wallet App → Added Introduction Layer**
- `/wallet-app/*` → `/wallet-app/introduction/*`
- Added grouping for better organization

## Files Not Found in New Structure (Removed/Missing)

### Chain Section (Missing)
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

### Learn Section (Removed)
1. `/learn/development-tools/overview`
2. `/learn/frontend-setup/*` (entire section)
3. `/learn/reading-and-displaying-data/*` (entire section)
4. `/learn/writing-to-contracts/*` (entire section)
5. `/learn/hardhat-tools-and-testing/overview`
6. `/learn/learning-objectives`
7. `/learn/help-on-discord`

### Use Cases (Removed)
1. `/use-cases/ai-instructions/eliza`
2. `/use-cases/ai-instructions/langchain-local`
3. `/use-cases/ai-instructions/langchain-replit`

## Key Observations

### 1. **Promotion Strategy**
Major products (OnchainKit, Smart Wallet) were promoted from subdirectories to top-level tabs, indicating increased importance.

### 2. **Content Consolidation**
- Basenames merged into OnchainKit
- Use Cases merged into Cookbook
- Some Learn content consolidated or removed

### 3. **Naming Conventions**
- More descriptive URLs: `diffs-ethereum-base` instead of `differences-between-ethereum-and-base`
- Terminology updates: `spend-limits` → `spend-permissions`

### 4. **External Dependencies**
Several sections now point to external CDP documentation:
- AgentKit
- Paymaster
- Appchains
- Verifications

### 5. **Content Removal**
Significant amount of frontend/client-side development content was removed from Learn section, possibly indicating a shift in documentation focus.

## Redirect Statistics
- **Total redirects needed**: ~400+
- **Largest sections**: OnchainKit (~100), Smart Wallet (~80)
- **Complete removals**: ~30 pages
- **External redirects**: 4 (to CDP docs)

## Recommendations for Review
1. Verify all removed Chain section pages - determine if content should be preserved
2. Check if removed Learn frontend content should redirect somewhere specific
3. Confirm Basenames consolidation into OnchainKit is intentional
4. Review removed AI instructions content - was this intentionally deprecated?