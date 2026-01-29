$repoPath = "C:\Users\Dell\.gemini\antigravity\scratch\base-docs"
Set-Location $repoPath

function Create-Fix-Branch {
    param (
        [string]$BranchName,
        [string]$FilePath,
        [scriptblock]$EditAction,
        [string]$CommitMessage
    )
    
    Write-Host "Processing $BranchName..."
    git checkout main 2>&1 | Out-Null
    git pull origin main 2>&1 | Out-Null
    git checkout -b $BranchName 2>&1 | Out-Null
    
    # Execute the edit action provided as a scriptblock
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
    git checkout main 2>&1 | Out-Null
}

# 1. fix/danger-class-to-classname-1
Create-Fix-Branch `
    -BranchName "fix/danger-class-to-classname-1" `
    -FilePath "docs/snippets/danger.mdx" `
    -EditAction {
        $path = "docs/snippets/danger.mdx"
        $content = Get-Content $path
        # Replace first occurrence of class="
        $found = $false
        $newContent = $content | ForEach-Object {
            if (-not $found -and $_ -match 'class="') {
                $found = $true
                $_ -replace 'class="', 'className="'
            } else {
                $_
            }
        }
        $newContent | Set-Content $path -Encoding UTF8
    } `
    -CommitMessage "fix: replace class with className in danger.mdx (1/3)"

# 2. fix/danger-class-to-classname-2
Create-Fix-Branch `
    -BranchName "fix/danger-class-to-classname-2" `
    -FilePath "docs/snippets/danger.mdx" `
    -EditAction {
        $path = "docs/snippets/danger.mdx"
        $content = Get-Content $path
        # Replace second occurrence of class=" (skip first)
        $count = 0
        $newContent = $content | ForEach-Object {
            if ($_ -match 'class="') {
                $count++
                if ($count -eq 2) {
                    $_ -replace 'class="', 'className="'
                } else {
                    $_
                }
            } else {
                $_
            }
        }
        $newContent | Set-Content $path -Encoding UTF8
    } `
    -CommitMessage "fix: replace class with className in danger.mdx (2/3)"

# 3. fix/danger-class-to-classname-3
Create-Fix-Branch `
    -BranchName "fix/danger-class-to-classname-3" `
    -FilePath "docs/snippets/danger.mdx" `
    -EditAction {
        $path = "docs/snippets/danger.mdx"
        $content = Get-Content $path
        # Replace third occurrence of class="
        $count = 0
        $newContent = $content | ForEach-Object {
            if ($_ -match 'class="') {
                $count++
                if ($count -eq 3) {
                    $_ -replace 'class="', 'className="'
                } else {
                    $_
                }
            } else {
                $_
            }
        }
        $newContent | Set-Content $path -Encoding UTF8
    } `
    -CommitMessage "fix: replace class with className in danger.mdx (3/3)"

# 4. fix/complex-nft-content-type
Create-Fix-Branch `
    -BranchName "fix/complex-nft-content-type" `
    -FilePath "docs/learn/token-development/nft-guides/complex-onchain-nfts.mdx" `
    -EditAction {
        $path = "docs/learn/token-development/nft-guides/complex-onchain-nfts.mdx"
        (Get-Content $path) -replace 'image/SVG\+xml', 'image/svg+xml' | Set-Content $path -Encoding UTF8
    } `
    -CommitMessage "fix: correct image content type casing in complex-onchain-nfts.mdx"

# 5. fix/complex-nft-xmlns
Create-Fix-Branch `
    -BranchName "fix/complex-nft-xmlns" `
    -FilePath "docs/learn/token-development/nft-guides/complex-onchain-nfts.mdx" `
    -EditAction {
        $path = "docs/learn/token-development/nft-guides/complex-onchain-nfts.mdx"
        (Get-Content $path) -replace "xmlns='http://www.w3.org/2000/SVG'", "xmlns='http://www.w3.org/2000/svg'" | Set-Content $path -Encoding UTF8
    } `
    -CommitMessage "fix: correct xmlns casing in complex-onchain-nfts.mdx"

# 6. fix/complex-nft-base64-comment
Create-Fix-Branch `
    -BranchName "fix/complex-nft-base64-comment" `
    -FilePath "docs/learn/token-development/nft-guides/complex-onchain-nfts.mdx" `
    -EditAction {
        $path = "docs/learn/token-development/nft-guides/complex-onchain-nfts.mdx"
        (Get-Content $path) -replace 'TODO: Build', 'TODO: Build' -replace '// TODO,', '// TODO:' | Set-Content $path -Encoding UTF8
    } `
    -CommitMessage "chore: fix comment formatting in complex-onchain-nfts.mdx"
