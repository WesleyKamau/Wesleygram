# Organize LoRA Photos Script
# 1. Delete odd-numbered photos from Cropped folder
# 2. Move non-cropped photos from converted folder
# 3. Rename everything sequentially

$croppedFolder = "C:\GitHub\Wesleygram\LoRA Photos\Cropped"
$convertedFolder = "C:\GitHub\Wesleygram\LoRA Photos\converted_20251219_020037"

Write-Host "Step 1: Getting list of cropped photos before deletion..." -ForegroundColor Cyan
$croppedFiles = Get-ChildItem -Path $croppedFolder -File | Sort-Object Name
$croppedBasenames = @{}
foreach ($file in $croppedFiles) {
    $basename = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    $croppedBasenames[$basename] = $true
}
Write-Host "Found $($croppedFiles.Count) files in Cropped folder"

Write-Host "`nStep 2: Deleting odd-numbered photos from Cropped folder..." -ForegroundColor Cyan
$deletedCount = 0
foreach ($file in $croppedFiles) {
    $basename = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    if ($basename -match '^\d+$') {
        $number = [int]$basename
        if ($number % 2 -eq 1) {
            Remove-Item -Path $file.FullName -Force
            Write-Host "  Deleted: $($file.Name)"
            $deletedCount++
        }
    }
}
Write-Host "Deleted $deletedCount odd-numbered photos"

Write-Host "`nStep 3: Moving non-cropped photos from converted folder..." -ForegroundColor Cyan
$convertedFiles = Get-ChildItem -Path $convertedFolder -File -Filter "*.jpg" | Sort-Object Name
$movedCount = 0
foreach ($file in $convertedFiles) {
    $basename = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    if (-not $croppedBasenames.ContainsKey($basename)) {
        Move-Item -Path $file.FullName -Destination $croppedFolder -Force
        Write-Host "  Moved: $($file.Name)"
        $movedCount++
    }
}
Write-Host "Moved $movedCount non-cropped photos"

Write-Host "`nStep 4: Renaming all photos sequentially..." -ForegroundColor Cyan
$allFiles = Get-ChildItem -Path $croppedFolder -File -Filter "*.jpg" | Sort-Object Name
$counter = 1
foreach ($file in $allFiles) {
    $newName = "{0:D4}.jpg" -f $counter
    if ($file.Name -ne $newName) {
        Rename-Item -Path $file.FullName -NewName $newName -Force
        Write-Host "  Renamed: $($file.Name) -> $newName"
    }
    $counter++
}

Write-Host "`nComplete!" -ForegroundColor Green
Write-Host "Final count: $($allFiles.Count) photos in Cropped folder"
