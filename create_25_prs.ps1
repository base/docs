$baseCommit = "9d353f7"
$repoPath = "C:\Users\Dell\.gemini\antigravity\scratch\base-docs"
Set-Location $repoPath

function Create-PR-Branch {
    param (
        [string]$BranchName,
        [scriptblock]$Action,
        [string]$Message
    )
    
    Write-Host "Processing $BranchName..."
    git checkout $baseCommit 2>&1 | Out-Null
    git checkout -b $BranchName 2>&1 | Out-Null
    
    & $Action
    
    git add .
    git commit -m $Message
    git push origin $BranchName
}

# 1. Terms of Service HTTPS
Create-PR-Branch -BranchName "fix/tos-https-privacy" -Message "fix: upgrade privacy policy link to https in terms-of-service" -Action {
    (Get-Content -Path "docs/terms-of-service.mdx") -replace "http://docs.base.org/privacy-policy", "https://docs.base.org/privacy-policy" | Set-Content -Path "docs/terms-of-service.mdx"
}

# 2. Base Services Hub - Link 1
Create-PR-Branch -BranchName "fix/hub-https-flowonbase" -Message "fix: upgrade flowonbase link to https in base-services-hub" -Action {
    (Get-Content -Path "docs/get-started/base-services-hub.mdx") -replace "http://flowonbase.com", "https://flowonbase.com" | Set-Content -Path "docs/get-started/base-services-hub.mdx"
}

# 3. Base Services Hub - Link 2
Create-PR-Branch -BranchName "fix/hub-https-meow" -Message "fix: upgrade meow domain link to https in base-services-hub" -Action {
    (Get-Content -Path "docs/get-started/base-services-hub.mdx") -replace "http://meow.com", "https://meow.com" | Set-Content -Path "docs/get-started/base-services-hub.mdx"
}

# 4. Base Services Hub - Link 3
Create-PR-Branch -BranchName "fix/hub-https-gmgm" -Message "fix: upgrade gmgm.media link to https in base-services-hub" -Action {
    (Get-Content -Path "docs/get-started/base-services-hub.mdx") -replace "http://gmgm.media", "https://gmgm.media" | Set-Content -Path "docs/get-started/base-services-hub.mdx"
}

# 5. Base Services Hub - Link 4
Create-PR-Branch -BranchName "fix/hub-https-paperclip" -Message "fix: upgrade paperclip.xyz link to https in base-services-hub" -Action {
    (Get-Content -Path "docs/get-started/base-services-hub.mdx") -replace "http://paperclip.xyz", "https://paperclip.xyz" | Set-Content -Path "docs/get-started/base-services-hub.mdx"
}

# 6. Base Services Hub - Link 5
Create-PR-Branch -BranchName "fix/hub-https-plus1000aura" -Message "fix: upgrade plus1000aura link to https in base-services-hub" -Action {
    (Get-Content -Path "docs/get-started/base-services-hub.mdx") -replace "http://plus1000aura.com", "https://plus1000aura.com" | Set-Content -Path "docs/get-started/base-services-hub.mdx"
}

# 7. Base Services Hub - Link 6
Create-PR-Branch -BranchName "fix/hub-https-sealaunch" -Message "fix: upgrade sealaunch.xyz link to https in base-services-hub" -Action {
    (Get-Content -Path "docs/get-started/base-services-hub.mdx") -replace "http://sealaunch.xyz", "https://sealaunch.xyz" | Set-Content -Path "docs/get-started/base-services-hub.mdx"
}

# 8. Base Services Hub - Link 7
Create-PR-Branch -BranchName "fix/hub-https-vacuumlabs" -Message "fix: upgrade vacuumlabs.com link to https in base-services-hub" -Action {
    (Get-Content -Path "docs/get-started/base-services-hub.mdx") -replace "http://vacuumlabs.com", "https://vacuumlabs.com" | Set-Content -Path "docs/get-started/base-services-hub.mdx"
}

# 9. Base Mentorship Program
Create-PR-Branch -BranchName "fix/mentorship-https-marketing" -Message "fix: upgrade x.com link to https in mentorship program" -Action {
    (Get-Content -Path "docs/get-started/base-mentorship-program.mdx") -replace "http://x.com/KallawayIO", "https://x.com/KallawayIO" | Set-Content -Path "docs/get-started/base-mentorship-program.mdx"
}

# 10. Cookie Policy - Link 1
Create-PR-Branch -BranchName "fix/cookie-https-aboutads" -Message "fix: upgrade aboutads.info link to https in cookie-policy" -Action {
    (Get-Content -Path "docs/cookie-policy.mdx") -replace "http://optout.aboutads.info/", "https://optout.aboutads.info/" | Set-Content -Path "docs/cookie-policy.mdx"
}

# 11. Cookie Policy - Link 2
Create-PR-Branch -BranchName "fix/cookie-https-networkadvertising" -Message "fix: upgrade networkadvertising.org link to https in cookie-policy" -Action {
    (Get-Content -Path "docs/cookie-policy.mdx") -replace "http://optout.networkadvertising.org/", "https://optout.networkadvertising.org/" | Set-Content -Path "docs/cookie-policy.mdx"
}

# 12. Wallet Library Support
Create-PR-Branch -BranchName "fix/wallet-https-thirdweb" -Message "fix: upgrade thirdweb link to https in wallet-library-support" -Action {
    (Get-Content -Path "docs/base-account/more/troubleshooting/usage-details/wallet-library-support.mdx") -replace "http://portal.thirdweb.com", "https://portal.thirdweb.com" | Set-Content -Path "docs/base-account/more/troubleshooting/usage-details/wallet-library-support.mdx"
}

# 13. Basenames FAQ - Link 1
Create-PR-Branch -BranchName "fix/basenames-https-coinbase" -Message "fix: upgrade coinbase.com link to https in basenames-faq" -Action {
    (Get-Content -Path "docs/base-account/basenames/basenames-faq.mdx") -replace "http://www.coinbase.com/verification-guide", "https://www.coinbase.com/verification-guide" | Set-Content -Path "docs/base-account/basenames/basenames-faq.mdx"
}

# 14. Basenames FAQ - Link 2
Create-PR-Branch -BranchName "fix/basenames-https-basename-app" -Message "fix: upgrade basename.app link to https in basenames-faq" -Action {
    (Get-Content -Path "docs/base-account/basenames/basenames-faq.mdx") -replace "http://www.basename.app/names", "https://www.basename.app/names" | Set-Content -Path "docs/base-account/basenames/basenames-faq.mdx"
}

# 15. Basenames FAQ - Link 3
Create-PR-Branch -BranchName "fix/basenames-https-base-names" -Message "fix: upgrade base.org/names link to https in basenames-faq" -Action {
    (Get-Content -Path "docs/base-account/basenames/basenames-faq.mdx") -replace "http://base.org/names", "https://base.org/names" | Set-Content -Path "docs/base-account/basenames/basenames-faq.mdx"
}

# 16. Builder Codes - Link 1
Create-PR-Branch -BranchName "fix/builder-https-base-dev" -Message "fix: upgrade base.dev link to https in builder-codes" -Action {
    (Get-Content -Path "docs/base-chain/quickstart/builder-codes.mdx") -replace "http://base.dev", "https://base.dev" | Set-Content -Path "docs/base-chain/quickstart/builder-codes.mdx"
}

# 17. Beta FAQ
Create-PR-Branch -BranchName "fix/beta-https-base-app" -Message "fix: upgrade base.app link to https in beta-faq" -Action {
    (Get-Content -Path "docs/base-app/introduction/beta-faq.mdx") -replace "http://www.base.app", "https://www.base.app" | Set-Content -Path "docs/base-app/introduction/beta-faq.mdx"
}

# 18. Simple Onchain NFTs - Typo 1
Create-PR-Branch -BranchName "fix/tutorial-typo-nfts-owned" -Message "fix: typo in getNftsOwned function name in simple-onchain-nfts" -Action {
    (Get-Content -Path "docs/learn/token-development/nft-guides/simple-onchain-nfts.mdx") -replace "getNFftsOwned", "getNftsOwned" | Set-Content -Path "docs/learn/token-development/nft-guides/simple-onchain-nfts.mdx"
}

# 19. Simple Onchain NFTs - Typo 2
Create-PR-Branch -BranchName "fix/tutorial-typo-metadata-struct" -Message "fix: typo in TokenAndMetadata struct name in simple-onchain-nfts" -Action {
    (Get-Content -Path "docs/learn/token-development/nft-guides/simple-onchain-nfts.mdx") -replace "TokenAndMetatdata", "TokenAndMetadata" | Set-Content -Path "docs/learn/token-development/nft-guides/simple-onchain-nfts.mdx"
}

# 20. Simple Onchain NFTs - TODO 1
Create-PR-Branch -BranchName "fix/tutorial-todo-rect-comment" -Message "fix: clarify rect comment in simple-onchain-nfts tutorial" -Action {
    (Get-Content -Path "docs/learn/token-development/nft-guides/simple-onchain-nfts.mdx") -replace "// TODO: add a rectangle", "// Add a rectangle" | Set-Content -Path "docs/learn/token-development/nft-guides/simple-onchain-nfts.mdx"
}

# 21. Complex Onchain NFTs - TODO 1
Create-PR-Branch -BranchName "fix/complex-todo-svg-seed" -Message "fix: improve SVG seed instruction in complex-onchain-nfts" -Action {
    (Get-Content -Path "docs/learn/token-development/nft-guides/complex-onchain-nfts.mdx") -replace "TODO: Build the SVG", "Build the SVG" | Set-Content -Path "docs/learn/token-development/nft-guides/complex-onchain-nfts.mdx"
}

# 22. Complex Onchain NFTs - TODO 2
Create-PR-Branch -BranchName "fix/complex-todo-render-sea" -Message "fix: improve sea render instruction in complex-onchain-nfts" -Action {
    (Get-Content -Path "docs/learn/token-development/nft-guides/complex-onchain-nfts.mdx") -replace "TODO: Render the sea", "Render the sea" | Set-Content -Path "docs/learn/token-development/nft-guides/complex-onchain-nfts.mdx"
}

# 23. Complex Onchain NFTs - TODO 3
Create-PR-Branch -BranchName "fix/complex-todo-pending" -Message "fix: clarify pending implementation in complex-onchain-nfts" -Action {
    (Get-Content -Path "docs/learn/token-development/nft-guides/complex-onchain-nfts.mdx") -replace "return //TODO;", "return // Implementation pending;" | Set-Content -Path "docs/learn/token-development/nft-guides/complex-onchain-nfts.mdx"
}

# 24. Overview - TODO Removal
Create-PR-Branch -BranchName "docs/overview-stale-todos" -Message "docs: remove stale TODOs from onchainkit overview" -Action {
    (Get-Content -Path "docs/onchainkit/latest/getting-started/overview.mdx") | Where-Object { $_ -notmatch "TODO: Create" } | Set-Content -Path "docs/onchainkit/latest/getting-started/overview.mdx"
}

# 25. UseReadContract - TODO Clarification
Create-PR-Branch -BranchName "fix/tutorial-useReadContract-todo" -Message "fix: clarify IssueItem render instruction in useReadContract" -Action {
    (Get-Content -Path "docs/learn/onchain-app-development/reading-and-displaying-data/useReadContract.mdx") -replace "TODO: Map over issues", "Render the IssueItem components" | Set-Content -Path "docs/learn/onchain-app-development/reading-and-displaying-data/useReadContract.mdx"
}
