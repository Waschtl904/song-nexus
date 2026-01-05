# SONG-NEXUS Documentation Archival Script
# Purpose: Move all old documentation files to archived/ folder
# Author: Claude AI
# Date: 5. Januar 2026

Write-Host "Starting documentation archival..." -ForegroundColor Cyan

# Create archive folder structure
Write-Host "Creating archive folder structure..."
$archiveFolders = @(
    'archived/Master-Prompts',
    'archived/Implementation-Plans',
    'archived/Designer-Guides',
    'archived/Deployment-Guides',
    'archived/Analysis-Docs',
    'archived/Snapshots'
)

foreach ($folder in $archiveFolders) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
        Write-Host "  Created: $folder"
    }
}

# Master Prompts
Write-Host "`nMoving Master Prompts..." -ForegroundColor Yellow
$masterPrompts = @(
    'SONG-NEXUS-Master-v10.md',
    'SONG-NEXUS-Master-v11.md',
    'MASTER-ENTRY-PROMPT.md',
    'MASTER-PROMPT-2026-AKTUELL.md',
    'MASTER-PROMPT-2026-REAL.md'
)
foreach ($file in $masterPrompts) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination 'archived/Master-Prompts/' -Force
        Write-Host "  Moved: $file"
    }
}

# Implementation Plans
Write-Host "`nMoving Implementation Plans..." -ForegroundColor Yellow
$implPlans = @(
    'IMPLEMENTATION-CHECKLIST.md',
    'IMPLEMENTATION-CHECKLIST-v2.md',
    'DESIGN-SYSTEM-ROADMAP.md'
)
foreach ($file in $implPlans) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination 'archived/Implementation-Plans/' -Force
        Write-Host "  Moved: $file"
    }
}

# Designer Guides
Write-Host "`nMoving Designer Guides..." -ForegroundColor Yellow
$designerGuides = @(
    'DESIGNER-QUICK-REF.md',
    'DESIGNER-QUICK-REF-v2.md',
    'DESIGNER-CONTROL-SYSTEM.md',
    'DESIGNER-ANLEITUNG-DE.md'
)
foreach ($file in $designerGuides) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination 'archived/Designer-Guides/' -Force
        Write-Host "  Moved: $file"
    }
}

# Deployment Guides
Write-Host "`nMoving Deployment Guides..." -ForegroundColor Yellow
$deploymentGuides = @(
    'DEPLOYMENT-SCHRITT-FUR-SCHRITT.md',
    'ONLINE-DEPLOYMENT-GUIDE.md',
    'SICHERHEIT-PRIVATER-ZUGRIFF.md'
)
foreach ($file in $deploymentGuides) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination 'archived/Deployment-Guides/' -Force
        Write-Host "  Moved: $file"
    }
}

# Analysis Docs
Write-Host "`nMoving Analysis Docs..." -ForegroundColor Yellow
$analysisDocs = @(
    'ANALYSIS-PART2-JS-MODULES.md',
    'API-Documentation-v1.md',
    'PROJEKTUEBERGABE-GUIDE.md',
    'README-START-HERE.md'
)
foreach ($file in $analysisDocs) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination 'archived/Analysis-Docs/' -Force
        Write-Host "  Moved: $file"
    }
}

# Snapshots
Write-Host "`nMoving Snapshots..." -ForegroundColor Yellow
$snapshots = @(
    'FINAL-FILE-INVENTORY.md',
    'FINAL-COMPREHENSIVE-AUDIT.md',
    'DELIVERABLES-SUMMARY.md',
    'DELIVERABLES-SUMMARY-v2.md'
)
foreach ($file in $snapshots) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination 'archived/Snapshots/' -Force
        Write-Host "  Moved: $file"
    }
}

# Summary
Write-Host "`nARCHIVAL COMPLETE!" -ForegroundColor Green
Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "  - Master Prompts: $(@(Get-ChildItem 'archived/Master-Prompts' -ErrorAction SilentlyContinue | Measure-Object).Count) files"
Write-Host "  - Implementation Plans: $(@(Get-ChildItem 'archived/Implementation-Plans' -ErrorAction SilentlyContinue | Measure-Object).Count) files"
Write-Host "  - Designer Guides: $(@(Get-ChildItem 'archived/Designer-Guides' -ErrorAction SilentlyContinue | Measure-Object).Count) files"
Write-Host "  - Deployment Guides: $(@(Get-ChildItem 'archived/Deployment-Guides' -ErrorAction SilentlyContinue | Measure-Object).Count) files"
Write-Host "  - Analysis Docs: $(@(Get-ChildItem 'archived/Analysis-Docs' -ErrorAction SilentlyContinue | Measure-Object).Count) files"
Write-Host "  - Snapshots: $(@(Get-ChildItem 'archived/Snapshots' -ErrorAction SilentlyContinue | Measure-Object).Count) files"

Write-Host "`nDone!" -ForegroundColor Green
