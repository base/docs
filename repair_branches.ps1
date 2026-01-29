$repoPath = "C:\Users\Dell\.gemini\antigravity\scratch\base-docs"
Set-Location $repoPath

function Repair-Branch {
    param (
        [string]$BranchName,
        [string]$FilePath,
        [string]$Search,
        [string]$Replace
    )
    
    Write-Host "Repairing $BranchName..."
    git checkout $BranchName 2>&1 | Out-Null
    
    (Get-Content -Path $FilePath) -replace $Search, $Replace | Set-Content -Path $FilePath
    
    git add $FilePath
    $status = git status --porcelain
    if ($status) {
        git commit -m "fix: repair https link upgrade"
        git push origin $BranchName
    } else {
        Write-Host "No changes for $BranchName (already fixed?)"
    }
}

# 1. Basenames App
Repair-Branch -BranchName "fix/basenames-https-basename-app" -FilePath "docs/base-account/basenames/basenames-faq.mdx" -Search "http://basename.app" -Replace "https://basename.app"

# 2. Coinbase Verification
Repair-Branch -BranchName "fix/basenames-https-coinbase" -FilePath "docs/base-account/basenames/basenames-faq.mdx" -Search "http://coinbase.com/onchain-verify" -Replace "https://coinbase.com/onchain-verify"

# 3. Mentorship Marketing (actually ilikesymmetry)
Repair-Branch -BranchName "fix/mentorship-https-marketing" -FilePath "docs/get-started/base-mentorship-program.mdx" -Search "http://x.com/ilikesymmetry" -Replace "https://x.com/ilikesymmetry"

# 4. Vacuumlabs
Repair-Branch -BranchName "fix/hub-https-vacuumlabs" -FilePath "docs/get-started/base-services-hub.mdx" -Search "http://www.vacuumlabs.com" -Replace "https://www.vacuumlabs.com"
