
$files = @(
    "docs/learn/advanced-functions/function-modifiers.mdx",
    "docs/learn/arrays/arrays-exercise.mdx",
    "docs/learn/contracts-and-basic-functions/basic-types.mdx",
    "docs/learn/control-structures/control-structures.mdx",
    "docs/learn/onchain-app-development/writing-to-contracts/useWriteContract.mdx"
)

foreach ($file in $files) {
    Write-Host "Committing $file..."
    git add $file
    git commit -m "Update $(Split-Path $file -Leaf) to improve documentation coverage"
}

Write-Host "All files committed. Pushing..."
git push origin docs/additional-improvements
