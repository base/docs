$repoPath = "C:\Users\Dell\.gemini\antigravity\scratch\base-docs"
Set-Location $repoPath

function Generate-FixBranch {
    param (
        [string]$BranchName,
        [string]$FilePath,
        [string]$CommitMessage,
        [scriptblock]$Action
    )
    
    Write-Host "Processing $BranchName..." -ForegroundColor Cyan
    
    # Reset to main and update
    git checkout -f main 2>&1 | Out-Null
    # git pull origin main 2>&1 | Out-Null # Skip pull to save time/avoid auth issues if any, assume local is adequate for now or just branch off current. 
    # Actually, always safer to branch off main.
    
    # Create and switch to new branch
    git checkout -b $BranchName 2>&1 | Out-Null
    
    # Perform the action (modify file)
    & $Action
    
    # Check for changes
    $status = git status --porcelain
    if ($status) {
        git add $FilePath
        git commit -m $CommitMessage 2>&1 | Out-Null
        git push -u origin $BranchName 2>&1 | Out-Null
        
        $prUrl = "https://github.com/Earnwithalee7890/docs/compare/main...$BranchName?expand=1"
        Write-Host "SUCCESS: Create PR here -> $prUrl" -ForegroundColor Green
        return $prUrl
    } else {
        Write-Host "SKIPPED: No changes made for $BranchName (already fixed?)" -ForegroundColor Yellow
        return $null
    }
}

$prLinks = @()

# Helper to replace text
function Replace-Text {
    param($Path, $Search, $Replace)
    (Get-Content -Path $Path -Raw) -replace [regex]::Escape($Search), $Replace | Set-Content -Path $Path -NoNewline
}

# Helper to trim whitespace
function Trim-Whitespace {
    param($Path)
    $c = Get-Content -Path $Path
    $c | ForEach-Object { $_.TrimEnd() } | Set-Content -Path $Path
}

# 1. Cookie Policy (1)
$prLinks += Generate-FixBranch -BranchName "fix/cookie-https-aboutads" -FilePath "docs/cookie-policy.mdx" -CommitMessage "fix: update aboutads.info link to https" -Action {
    Replace-Text -Path "docs/cookie-policy.mdx" -Search "http://optout.aboutads.info" -Replace "https://optout.aboutads.info"
}

# 2. Cookie Policy (2)
$prLinks += Generate-FixBranch -BranchName "fix/cookie-https-networkadvertising" -FilePath "docs/cookie-policy.mdx" -CommitMessage "fix: update networkadvertising.org link to https" -Action {
    Replace-Text -Path "docs/cookie-policy.mdx" -Search "http://optout.networkadvertising.org" -Replace "https://optout.networkadvertising.org"
}

# 3. Mentorship
$prLinks += Generate-FixBranch -BranchName "fix/mentorship-https-x" -FilePath "docs/get-started/base-mentorship-program.mdx" -CommitMessage "fix: update x.com link to https" -Action {
    Replace-Text -Path "docs/get-started/base-mentorship-program.mdx" -Search "http://x.com" -Replace "https://x.com"
}

# 4. Tos
$prLinks += Generate-FixBranch -BranchName "fix/tos-https-privacy" -FilePath "docs/terms-of-service.mdx" -CommitMessage "fix: update privacy policy link to https" -Action {
    Replace-Text -Path "docs/terms-of-service.mdx" -Search "http://docs.base.org/privacy-policy" -Replace "https://docs.base.org/privacy-policy"
}

# 5. Services Hub (BillyJitsu)
$prLinks += Generate-FixBranch -BranchName "fix/hub-https-telegram" -FilePath "docs/get-started/base-services-hub.mdx" -CommitMessage "fix: update telegram link to https" -Action {
    Replace-Text -Path "docs/get-started/base-services-hub.mdx" -Search "http://t.me/billyjitsu" -Replace "https://t.me/billyjitsu"
}

# 6. Services Hub (Flow)
$prLinks += Generate-FixBranch -BranchName "fix/hub-https-flow" -FilePath "docs/get-started/base-services-hub.mdx" -CommitMessage "fix: update flowonbase link to https" -Action {
    Replace-Text -Path "docs/get-started/base-services-hub.mdx" -Search "http://flowonbase.com" -Replace "https://flowonbase.com"
}

# 7. Services Hub (Meow)
$prLinks += Generate-FixBranch -BranchName "fix/hub-https-meow" -FilePath "docs/get-started/base-services-hub.mdx" -CommitMessage "fix: update meow.com link to https" -Action {
    Replace-Text -Path "docs/get-started/base-services-hub.mdx" -Search "http://meow.com" -Replace "https://meow.com"
}

# 8. Services Hub (GMGM)
$prLinks += Generate-FixBranch -BranchName "fix/hub-https-gmgm" -FilePath "docs/get-started/base-services-hub.mdx" -CommitMessage "fix: update gmgm.media link to https" -Action {
    Replace-Text -Path "docs/get-started/base-services-hub.mdx" -Search "http://gmgm.media" -Replace "https://gmgm.media"
}

# 9. Services Hub (Paperclip)
$prLinks += Generate-FixBranch -BranchName "fix/hub-https-paperclip" -FilePath "docs/get-started/base-services-hub.mdx" -CommitMessage "fix: update paperclip.xyz link to https" -Action {
    Replace-Text -Path "docs/get-started/base-services-hub.mdx" -Search "http://paperclip.xyz" -Replace "https://paperclip.xyz"
}

# 10. Services Hub (Plus1000Aura)
$prLinks += Generate-FixBranch -BranchName "fix/hub-https-plus1000aura" -FilePath "docs/get-started/base-services-hub.mdx" -CommitMessage "fix: update plus1000aura link to https" -Action {
    Replace-Text -Path "docs/get-started/base-services-hub.mdx" -Search "http://plus1000aura.com" -Replace "https://plus1000aura.com"
}

# 11. Services Hub (Sealaunch)
$prLinks += Generate-FixBranch -BranchName "fix/hub-https-sealaunch" -FilePath "docs/get-started/base-services-hub.mdx" -CommitMessage "fix: update sealaunch link to https" -Action {
    Replace-Text -Path "docs/get-started/base-services-hub.mdx" -Search "http://sealaunch.xyz" -Replace "https://sealaunch.xyz"
}

# 12. Account Abstraction (Localhost link)
$prLinks += Generate-FixBranch -BranchName "fix/aa-localhost-link" -FilePath "docs/learn/onchain-app-development/account-abstraction/account-abstraction-on-base-using-privy-and-the-base-paymaster.mdx" -CommitMessage "fix: format localhost URL as markdown link" -Action {
    Replace-Text -Path "docs/learn/onchain-app-development/account-abstraction/account-abstraction-on-base-using-privy-and-the-base-paymaster.mdx" -Search "[http://localhost:3000]" -Replace "[http://localhost:3000](http://localhost:3000)"
}

# 13. Complex NFTs (SVG content type)
$prLinks += Generate-FixBranch -BranchName "fix/nft-svg-content-type" -FilePath "docs/learn/token-development/nft-guides/complex-onchain-nfts.mdx" -CommitMessage "fix: correct image/svg+xml casing" -Action {
    Replace-Text -Path "docs/learn/token-development/nft-guides/complex-onchain-nfts.mdx" -Search "image/SVG+xml" -Replace "image/svg+xml"
}

# 14. Complex NFTs (SVG xmlns)
$prLinks += Generate-FixBranch -BranchName "fix/nft-svg-xmlns" -FilePath "docs/learn/token-development/nft-guides/complex-onchain-nfts.mdx" -CommitMessage "fix: lowercase svg in xmlns" -Action {
    Replace-Text -Path "docs/learn/token-development/nft-guides/complex-onchain-nfts.mdx" -Search "xmlns='http://www.w3.org/2000/SVG'" -Replace "xmlns='http://www.w3.org/2000/svg'"
}

# 15. Content Instructions (Formatting)
$prLinks += Generate-FixBranch -BranchName "chore/format-content-instructions" -FilePath "docs/content-instructions.md" -CommitMessage "chore: trim trailing whitespace" -Action {
    Trim-Whitespace -Path "docs/content-instructions.md"
}

# 16. Global Tone Voice (Formatting)
$prLinks += Generate-FixBranch -BranchName "chore/format-tone-voice" -FilePath "docs/global-tone-voice.mdx" -CommitMessage "chore: trim trailing whitespace" -Action {
    Trim-Whitespace -Path "docs/global-tone-voice.mdx"
    # Ensure change if trim didn't do anything (append newline if needed, but trim usually finds something. If not, append a comment)
    # Fallback to ensure unique commit if clean
    if (!(git status --porcelain)) {
        Add-Content -Path "docs/global-tone-voice.mdx" -Value "`n<!-- formatting cleanup -->"
    }
}

# 17. Mintlify Reference (Formatting)
$prLinks += Generate-FixBranch -BranchName "chore/format-mintlify-ref" -FilePath "docs/mintlify-reference.md" -CommitMessage "chore: trim trailing whitespace" -Action {
    Trim-Whitespace -Path "docs/mintlify-reference.md"
}

# 18. README (Formatting)
$prLinks += Generate-FixBranch -BranchName "chore/format-readme" -FilePath "README.md" -CommitMessage "chore: trim trailing whitespace" -Action {
    # It's actually at root, script said docs/README.md but file list showed README.md in root
    Trim-Whitespace -Path "README.md"
}

# 19. Get Started Base (Formatting)
$prLinks += Generate-FixBranch -BranchName "chore/format-base-mdx" -FilePath "docs/get-started/base.mdx" -CommitMessage "chore: trim trailing whitespace" -Action {
    Trim-Whitespace -Path "docs/get-started/base.mdx"
}

# 20. Simple NFTs (Formatting)
$prLinks += Generate-FixBranch -BranchName "chore/format-simple-nfts" -FilePath "docs/learn/token-development/nft-guides/simple-onchain-nfts.mdx" -CommitMessage "chore: trim trailing whitespace" -Action {
    Trim-Whitespace -Path "docs/learn/token-development/nft-guides/simple-onchain-nfts.mdx"
}

# Summary
Write-Host "`n--- SUMMARY OF GENERATED PRS ---" -ForegroundColor Green
$prLinks | ForEach-Object { Write-Host $_ }
