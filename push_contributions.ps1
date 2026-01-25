
$files = @(
    "docs/iframe-theme.js",
    "docs/learn/arrays/filtering-an-array-sbs.mdx",
    "docs/learn/onchain-app-development/account-abstraction/account-abstraction-on-base-using-privy-and-the-base-paymaster.mdx",
    "docs/learn/onchain-app-development/frontend-setup/introduction-to-providers.mdx",
    "docs/learn/onchain-app-development/reading-and-displaying-data/useReadContract.mdx",
    "docs/learn/onchain-app-development/writing-to-contracts/useSimulateContract.mdx",
    "docs/learn/token-development/erc-721-token/erc-721-sbs.mdx",
    "docs/learn/token-development/nft-guides/complex-onchain-nfts.mdx",
    "docs/learn/token-development/nft-guides/signature-mint.mdx",
    "docs/learn/token-development/nft-guides/simple-onchain-nfts.mdx",
    "docs/learn/token-development/nft-guides/thirdweb-unreal-nft-items.mdx",
    "docs/mini-apps/quality-and-publishing/overview.mdx",
    "docs/mini-apps/quality-and-publishing/quality-bar.mdx",
    "docs/mini-apps/quality-and-publishing/submission-guidelines.mdx",
    "docs/mini-apps/troubleshooting/error-handling.mdx"
)

foreach ($file in $files) {
    Write-Host "Committing $file..."
    git add $file
    git commit -m "Update $(Split-Path $file -Leaf) to improve documentation coverage"
}

Write-Host "All files committed. Pushing..."
git push origin HEAD
