# ============================================================================
# SONG-NEXUS Documentation Archival Script (FIXED VERSION)
# ============================================================================
# Purpose: Move all old documentation files to archived/ folder structure
# Author: Claude AI
# Date: 5. Januar 2026
# System: Windows 11 Pro, PowerShell 7+
# ============================================================================

Write-Host "🚀 Starting documentation archival..." -ForegroundColor Cyan

# Create archive folder structure
Write-Host "📁 Creating archive folder structure..."
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
        Write-Host "  ✅ Created: $folder"
    }
}

# ============================================================================
# MASTER PROMPTS
# ============================================================================
Write-Host "`n📋 Moving Master Prompts..." -ForegroundColor Yellow

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
        Write-Host "  ✅ Moved: $file"
    }
}

# ============================================================================
# IMPLEMENTATION PLANS
# ============================================================================
Write-Host "`n📋 Moving Implementation Plans..." -ForegroundColor Yellow

$implPlans = @(
    'IMPLEMENTATION-CHECKLIST.md',
    'IMPLEMENTATION-CHECKLIST-v2.md',
    'DESIGN-SYSTEM-ROADMAP.md'
)

foreach ($file in $implPlans) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination 'archived/Implementation-Plans/' -Force
        Write-Host "  ✅ Moved: $file"
    }
}

# ============================================================================
# DESIGNER GUIDES
# ============================================================================
Write-Host "`n🎨 Moving Designer Guides..." -ForegroundColor Yellow

$designerGuides = @(
    'DESIGNER-QUICK-REF.md',
    'DESIGNER-QUICK-REF-v2.md',
    'DESIGNER-CONTROL-SYSTEM.md',
    'DESIGNER-ANLEITUNG-DE.md'
)

foreach ($file in $designerGuides) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination 'archived/Designer-Guides/' -Force
        Write-Host "  ✅ Moved: $file"
    }
}

# ============================================================================
# DEPLOYMENT GUIDES
# ============================================================================
Write-Host "`n🚀 Moving Deployment Guides..." -ForegroundColor Yellow

$deploymentGuides = @(
    'DEPLOYMENT-SCHRITT-FUR-SCHRITT.md',
    'ONLINE-DEPLOYMENT-GUIDE.md',
    'SICHERHEIT-PRIVATER-ZUGRIFF.md'
)

foreach ($file in $deploymentGuides) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination 'archived/Deployment-Guides/' -Force
        Write-Host "  ✅ Moved: $file"
    }
}

# ============================================================================
# ANALYSIS DOCS
# ============================================================================
Write-Host "`n📊 Moving Analysis Docs..." -ForegroundColor Yellow

$analysisDocs = @(
    'ANALYSIS-PART2-JS-MODULES.md',
    'API-Documentation-v1.md',
    'PROJEKTUEBERGABE-GUIDE.md',
    'README-START-HERE.md'
)

foreach ($file in $analysisDocs) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination 'archived/Analysis-Docs/' -Force
        Write-Host "  ✅ Moved: $file"
    }
}

# ============================================================================
# SNAPSHOTS
# ============================================================================
Write-Host "`n📸 Moving Snapshots..." -ForegroundColor Yellow

$snapshots = @(
    'FINAL-FILE-INVENTORY.md',
    'FINAL-COMPREHENSIVE-AUDIT.md',
    'DELIVERABLES-SUMMARY.md',
    'DELIVERABLES-SUMMARY-v2.md'
)

foreach ($file in $snapshots) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination 'archived/Snapshots/' -Force
        Write-Host "  ✅ Moved: $file"
    }
}

# ============================================================================
# VERIFICATION & SUMMARY
# ============================================================================
Write-Host "`n✅ ARCHIVAL COMPLETE!" -ForegroundColor Green

Write-Host "`n📊 Summary:" -ForegroundColor Cyan
Write-Host "  - Master Prompts: $(@(Get-ChildItem 'archived/Master-Prompts' -ErrorAction SilentlyContinue | Measure-Object).Count) files"
Write-Host "  - Implementation Plans: $(@(Get-ChildItem 'archived/Implementation-Plans' -ErrorAction SilentlyContinue | Measure-Object).Count) files"
Write-Host "  - Designer Guides: $(@(Get-ChildItem 'archived/Designer-Guides' -ErrorAction SilentlyContinue | Measure-Object).Count) files"
Write-Host "  - Deployment Guides: $(@(Get-ChildItem 'archived/Deployment-Guides' -ErrorAction SilentlyContinue | Measure-Object).Count) files"
Write-Host "  - Analysis Docs: $(@(Get-ChildItem 'archived/Analysis-Docs' -ErrorAction SilentlyContinue | Measure-Object).Count) files"
Write-Host "  - Snapshots: $(@(Get-ChildItem 'archived/Snapshots' -ErrorAction SilentlyContinue | Measure-Object).Count) files"

Write-Host "`n🔍 Verify structure:" -ForegroundColor Cyan
Get-ChildItem 'archived' -Directory | ForEach-Object {
    $count = @(Get-ChildItem $_.FullName -ErrorAction SilentlyContinue | Measure-Object).Count
    Write-Host "  ✅ $($_.Name): $count files"
}

Write-Host "`n🚀 Next steps:" -ForegroundColor Green
Write-Host "  1. git add archived/"
Write-Host "  2. git commit -m 'chore: archive old documentation (FIXED)'"
Write-Host "  3. git push origin main"

Write-Host "`n🎯 Remember: Use MASTER-PROMPT-2026-DEFINITIVE.md for all chats!" -ForegroundColor Yellow
Write-Host ""
