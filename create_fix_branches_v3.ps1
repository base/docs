$repoPath = "C:\Users\Dell\.gemini\antigravity\scratch\base-docs"
Set-Location $repoPath

function Create-Fix-Branch {
    param (
        [string]$BranchName,
        [string]$FilePath,
        [scriptblock]$EditAction,
        [string]$CommitMessage
    )
    
    Write-Host "Processing $BranchName..." -ForegroundColor Cyan
    git checkout main 2>&1 | Out-Null
    git pull origin main 2>&1 | Out-Null
    
    # Check if branch exists locally and delete it to ensure fresh start
    if (git branch --list $BranchName) {
        git branch -D $BranchName 2>&1 | Out-Null
    }
    
    git checkout -b $BranchName 2>&1 | Out-Null
    
    # Execute the edit action
    if (Test-Path $FilePath) {
        & $EditAction
        
        git add $FilePath
        $status = git status --porcelain
        if ($status) {
            git commit -m "$CommitMessage"
            git push -u origin $BranchName
            Write-Host "LINK: https://github.com/Earnwithalee7890/docs/pull/new/$BranchName" -ForegroundColor Green
        } else {
            Write-Host "No changes for $BranchName, skipping." -ForegroundColor Yellow
        }
    } else {
        Write-Host "File $FilePath not found, skipping." -ForegroundColor Red
    }
    git checkout main 2>&1 | Out-Null
}

# --- Category 1: Security/Protocol Fixes (http -> https) ---

# 1
Create-Fix-Branch -BranchName "fix/secure-links-writing" -FilePath "docs/writing.md" -CommitMessage "fix: upgrade http links to https in writing.md" -EditAction {
    $p = "docs/writing.md"; (Get-Content $p) -replace 'http://api.example.com', 'https://api.example.com' | Set-Content $p -Encoding UTF8
}

# 2
Create-Fix-Branch -BranchName "fix/secure-links-tone" -FilePath "docs/tone_of_voice.mdx" -CommitMessage "fix: upgrade http links to https in tone_of_voice.mdx" -EditAction {
    $p = "docs/tone_of_voice.mdx"; (Get-Content $p) -replace 'http://', 'https://' | Set-Content $p -Encoding UTF8
}

# 3
Create-Fix-Branch -BranchName "fix/secure-links-prompt-lib" -FilePath "docs/snippets/prompt-library.mdx" -CommitMessage "fix: enhance protocol security in prompt-library.mdx" -EditAction {
    $p = "docs/snippets/prompt-library.mdx"; (Get-Content $p) -replace 'http://', 'https://' | Set-Content $p -Encoding UTF8
}

# 4
Create-Fix-Branch -BranchName "fix/secure-links-ock-start" -FilePath "docs/onchainkit/latest/getting-started/overview.mdx" -CommitMessage "fix: secure links in overview.mdx" -EditAction {
    $p = "docs/onchainkit/latest/getting-started/overview.mdx"; (Get-Content $p) -replace 'http://', 'https://' | Set-Content $p -Encoding UTF8
}

# 5
Create-Fix-Branch -BranchName "fix/secure-links-buy-types" -FilePath "docs/onchainkit/buy/types.mdx" -CommitMessage "fix: secure links in buy/types.mdx" -EditAction {
    $p = "docs/onchainkit/buy/types.mdx"; (Get-Content $p) -replace 'http://', 'https://' | Set-Content $p -Encoding UTF8
}

# 6
Create-Fix-Branch -BranchName "fix/secure-links-token-types" -FilePath "docs/onchainkit/token/types.mdx" -CommitMessage "fix: secure links in token/types.mdx" -EditAction {
    $p = "docs/onchainkit/token/types.mdx"; (Get-Content $p) -replace 'http://', 'https://' | Set-Content $p -Encoding UTF8
}

# 7
Create-Fix-Branch -BranchName "fix/secure-links-wallet" -FilePath "docs/onchainkit/wallet/wallet.mdx" -CommitMessage "fix: secure links in wallet.mdx" -EditAction {
    $p = "docs/onchainkit/wallet/wallet.mdx"; (Get-Content $p) -replace 'http://', 'https://' | Set-Content $p -Encoding UTF8
}

# 8
Create-Fix-Branch -BranchName "fix/secure-links-wallet-modal" -FilePath "docs/onchainkit/wallet/wallet-modal.mdx" -CommitMessage "fix: secure links in wallet-modal.mdx" -EditAction {
    $p = "docs/onchainkit/wallet/wallet-modal.mdx"; (Get-Content $p) -replace 'http://', 'https://' | Set-Content $p -Encoding UTF8
}

# 9
Create-Fix-Branch -BranchName "fix/secure-links-wallet-island" -FilePath "docs/onchainkit/wallet/wallet-island.mdx" -CommitMessage "fix: secure links in wallet-island.mdx" -EditAction {
    $p = "docs/onchainkit/wallet/wallet-island.mdx"; (Get-Content $p) -replace 'http://', 'https://' | Set-Content $p -Encoding UTF8
}

# 10
Create-Fix-Branch -BranchName "fix/secure-links-token-select" -FilePath "docs/onchainkit/token/token-select-dropdown.mdx" -CommitMessage "fix: secure links in token-select-dropdown.mdx" -EditAction {
    $p = "docs/onchainkit/token/token-select-dropdown.mdx"; (Get-Content $p) -replace 'http://', 'https://' | Set-Content $p -Encoding UTF8
}

# --- Category 2: Markdown Standardization (* -> -) ---

# 11
Create-Fix-Branch -BranchName "style/standardize-list-tos" -FilePath "docs/terms-of-service.mdx" -CommitMessage "style: standardize list bullets in terms-of-service.mdx" -EditAction {
    $p = "docs/terms-of-service.mdx"; (Get-Content $p) -replace '^\* ', '- ' | Set-Content $p -Encoding UTF8
}

# 12
Create-Fix-Branch -BranchName "style/standardize-list-testing" -FilePath "docs/mini-apps/troubleshooting/testing.mdx" -CommitMessage "style: standardize list bullets in testing.mdx" -EditAction {
    $p = "docs/mini-apps/troubleshooting/testing.mdx"; (Get-Content $p) -replace '^\* ', '- ' | Set-Content $p -Encoding UTF8
}

# 13
Create-Fix-Branch -BranchName "style/standardize-list-neynar" -FilePath "docs/mini-apps/technical-guides/neynar-notifications.mdx" -CommitMessage "style: standardize list bullets in neynar-notifications.mdx" -EditAction {
    $p = "docs/mini-apps/technical-guides/neynar-notifications.mdx"; (Get-Content $p) -replace '^\* ', '- ' | Set-Content $p -Encoding UTF8
}

# 14
Create-Fix-Branch -BranchName "style/standardize-list-error-handling" -FilePath "docs/mini-apps/troubleshooting/error-handling.mdx" -CommitMessage "style: standardize list bullets in error-handling.mdx" -EditAction {
    $p = "docs/mini-apps/troubleshooting/error-handling.mdx"; (Get-Content $p) -replace '^\* ', '- ' | Set-Content $p -Encoding UTF8
}

# 15
Create-Fix-Branch -BranchName "style/standardize-list-design-res" -FilePath "docs/mini-apps/resources/design-resources.mdx" -CommitMessage "style: standardize list bullets in design-resources.mdx" -EditAction {
    $p = "docs/mini-apps/resources/design-resources.mdx"; (Get-Content $p) -replace '^\* ', '- ' | Set-Content $p -Encoding UTF8
}

# 16
Create-Fix-Branch -BranchName "style/standardize-list-building" -FilePath "docs/mini-apps/quickstart/building-for-the-base-app.mdx" -CommitMessage "style: standardize list bullets in building-for-the-base-app.mdx" -EditAction {
    $p = "docs/mini-apps/quickstart/building-for-the-base-app.mdx"; (Get-Content $p) -replace '^\* ', '- ' | Set-Content $p -Encoding UTF8
}

# 17
Create-Fix-Branch -BranchName "style/standardize-list-create-new" -FilePath "docs/mini-apps/quickstart/create-new-miniapp.mdx" -CommitMessage "style: standardize list bullets in create-new-miniapp.mdx" -EditAction {
    $p = "docs/mini-apps/quickstart/create-new-miniapp.mdx"; (Get-Content $p) -replace '^\* ', '- ' | Set-Content $p -Encoding UTF8
}

# 18
Create-Fix-Branch -BranchName "style/standardize-list-migrate" -FilePath "docs/mini-apps/quickstart/migrate-existing-apps.mdx" -CommitMessage "style: standardize list bullets in migrate-existing-apps.mdx" -EditAction {
    $p = "docs/mini-apps/quickstart/migrate-existing-apps.mdx"; (Get-Content $p) -replace '^\* ', '- ' | Set-Content $p -Encoding UTF8
}

# 19
Create-Fix-Branch -BranchName "style/standardize-list-submission" -FilePath "docs/mini-apps/quality-and-publishing/submission-guidelines.mdx" -CommitMessage "style: standardize list bullets in submission-guidelines.mdx" -EditAction {
    $p = "docs/mini-apps/quality-and-publishing/submission-guidelines.mdx"; (Get-Content $p) -replace '^\* ', '- ' | Set-Content $p -Encoding UTF8
}

# 20
Create-Fix-Branch -BranchName "style/standardize-list-quality" -FilePath "docs/mini-apps/quality-and-publishing/quality-bar.mdx" -CommitMessage "style: standardize list bullets in quality-bar.mdx" -EditAction {
    $p = "docs/mini-apps/quality-and-publishing/quality-bar.mdx"; (Get-Content $p) -replace '^\* ', '- ' | Set-Content $p -Encoding UTF8
}

# --- Category 3: Formatting (Trailing Whitespace/Newline) ---

function Add-Trailing-Newline {
    param([string]$path)
    $c = Get-Content $path -Raw
    if (-not $c.EndsWith("`n")) {
        $c + "`n" | Set-Content $path -NoNewline -Encoding UTF8
    } else {
        # If already has newline, add a small harmless comment to force change
        $c + "`n<!-- docs: formatting -->`n" | Set-Content $path -NoNewline -Encoding UTF8
    }
}

# 21
Create-Fix-Branch -BranchName "chore/formatting-fund-config" -FilePath "docs/onchainkit/latest/utilities/fund/fetch-onramp-config.mdx" -CommitMessage "chore: fix trailing whitespace in fetch-onramp-config.mdx" -EditAction { Add-Trailing-Newline "docs/onchainkit/latest/utilities/fund/fetch-onramp-config.mdx" }

# 22
Create-Fix-Branch -BranchName "chore/formatting-fund-quote" -FilePath "docs/onchainkit/latest/utilities/fund/fetch-onramp-quote.mdx" -CommitMessage "chore: fix trailing whitespace in fetch-onramp-quote.mdx" -EditAction { Add-Trailing-Newline "docs/onchainkit/latest/utilities/fund/fetch-onramp-quote.mdx" }

# 23
Create-Fix-Branch -BranchName "chore/formatting-fund-status" -FilePath "docs/onchainkit/latest/utilities/fund/fetch-onramp-transaction-status.mdx" -CommitMessage "chore: fix trailing whitespace in fetch-onramp-transaction-status.mdx" -EditAction { Add-Trailing-Newline "docs/onchainkit/latest/utilities/fund/fetch-onramp-transaction-status.mdx" }

# 24
Create-Fix-Branch -BranchName "chore/formatting-fund-options" -FilePath "docs/onchainkit/latest/utilities/fund/fetch-onramp-options.mdx" -CommitMessage "chore: fix trailing whitespace in fetch-onramp-options.mdx" -EditAction { Add-Trailing-Newline "docs/onchainkit/latest/utilities/fund/fetch-onramp-options.mdx" }

# 25
Create-Fix-Branch -BranchName "chore/formatting-connected" -FilePath "docs/onchainkit/latest/components/connected/connected.mdx" -CommitMessage "chore: fix trailing whitespace in connected.mdx" -EditAction { Add-Trailing-Newline "docs/onchainkit/latest/components/connected/connected.mdx" }

# 26
Create-Fix-Branch -BranchName "chore/formatting-nft-card" -FilePath "docs/onchainkit/latest/components/mint/nft-card.mdx" -CommitMessage "chore: fix trailing whitespace in nft-card.mdx" -EditAction { Add-Trailing-Newline "docs/onchainkit/latest/components/mint/nft-card.mdx" }

# 27
Create-Fix-Branch -BranchName "chore/formatting-fund-btn" -FilePath "docs/onchainkit/latest/components/fund/fund-button.mdx" -CommitMessage "chore: fix trailing whitespace in fund-button.mdx" -EditAction { Add-Trailing-Newline "docs/onchainkit/latest/components/fund/fund-button.mdx" }

# 28
Create-Fix-Branch -BranchName "chore/formatting-old-fund-status" -FilePath "docs/onchainkit/fund/fetch-onramp-transaction-status.mdx" -CommitMessage "chore: fix trailing whitespace in fund/fetch-onramp-transaction-status.mdx" -EditAction { Add-Trailing-Newline "docs/onchainkit/fund/fetch-onramp-transaction-status.mdx" }

# 29
Create-Fix-Branch -BranchName "chore/formatting-old-fund-btn" -FilePath "docs/onchainkit/fund/fund-button.mdx" -CommitMessage "chore: fix trailing whitespace in fund/fund-button.mdx" -EditAction { Add-Trailing-Newline "docs/onchainkit/fund/fund-button.mdx" }

# 30
Create-Fix-Branch -BranchName "chore/formatting-fund-types" -FilePath "docs/onchainkit/fund/types.mdx" -CommitMessage "chore: fix trailing whitespace in fund/types.mdx" -EditAction { Add-Trailing-Newline "docs/onchainkit/fund/types.mdx" }

# 31
Create-Fix-Branch -BranchName "chore/formatting-old-fund-quote" -FilePath "docs/onchainkit/fund/fetch-onramp-quote.mdx" -CommitMessage "chore: fix trailing whitespace in fund/fetch-onramp-quote.mdx" -EditAction { Add-Trailing-Newline "docs/onchainkit/fund/fetch-onramp-quote.mdx" }

# 32
Create-Fix-Branch -BranchName "chore/formatting-old-fund-opts" -FilePath "docs/onchainkit/fund/fetch-onramp-options.mdx" -CommitMessage "chore: fix trailing whitespace in fund/fetch-onramp-options.mdx" -EditAction { Add-Trailing-Newline "docs/onchainkit/fund/fetch-onramp-options.mdx" }

# 33
Create-Fix-Branch -BranchName "chore/formatting-old-fund-cfg" -FilePath "docs/onchainkit/fund/fetch-onramp-config.mdx" -CommitMessage "chore: fix trailing whitespace in fund/fetch-onramp-config.mdx" -EditAction { Add-Trailing-Newline "docs/onchainkit/fund/fetch-onramp-config.mdx" }
