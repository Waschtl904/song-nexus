# 📦 ARCHIVE OLD DOCUMENTATION SCRIPT
# Purpose: Move old documentation files to /archived/ folder
# Date: 5. Januar 2026
# This script organizes 20 old .md files into logical folders

# ⚠️ IMPORTANT: Run from repo root!
# PS C:\Users\sebas\Desktop\SongSeite> .\archive-old-docs.ps1

Write-Host "📦 Starting documentation archival..." -ForegroundColor Cyan

# Create archive folder structure
Write-Host "📋 Creating archive folder structure..." -ForegroundColor Yellow

@(
    "archived/Master-Prompts",
    "archived/Implementation-Plans",
    "archived/Designer-Guides",
    "archived/Deployment-Guides",
    "archived/Analysis-Docs",
    "archived/Snapshots"
) | ForEach-Object {
    if (-not (Test-Path $_)) {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
        Write-Host "  ✅ Created: $_" -ForegroundColor Green
    } else {
        Write-Host "  ✅ Exists: $_" -ForegroundColor Green
    }
}

# Move Master Prompts
Write-Host "`n📦 Moving Master Prompts..." -ForegroundColor Yellow
@(
    "SONG-NEXUS-Master-v10.md",
    "SONG-NEXUS-Master-v11.md",
    "MASTER-ENTRY-PROMPT.md",
    "MASTER-PROMPT-2026-AKTUELL.md",
    "MASTER-PROMPT-2026-REAL.md"
) | ForEach-Object {
    if (Test-Path $_) {
        Move-Item -Path $_ -Destination "archived/Master-Prompts/" -Force
        Write-Host "  ✅ Moved: $_" -ForegroundColor Green
    }
}

# Move Implementation Plans
Write-Host "`n📦 Moving Implementation Plans..." -ForegroundColor Yellow
@(
    "IMPLEMENTATION-CHECKLIST.md",
    "IMPLEMENTATION-CHECKLIST-v2.md",
    "DESIGN-SYSTEM-ROADMAP.md"
) | ForEach-Object {
    if (Test-Path $_) {
        Move-Item -Path $_ -Destination "archived/Implementation-Plans/" -Force
        Write-Host "  ✅ Moved: $_" -ForegroundColor Green
    }
}

# Move Designer Guides
Write-Host "`n📦 Moving Designer Guides..." -ForegroundColor Yellow
@(
    "DESIGNER-QUICK-REF.md",
    "DESIGNER-QUICK-REF-v2.md",
    "DESIGNER-CONTROL-SYSTEM.md",
    "DESIGNER-ANLEITUNG-DE.md"
) | ForEach-Object {
    if (Test-Path $_) {
        Move-Item -Path $_ -Destination "archived/Designer-Guides/" -Force
        Write-Host "  ✅ Moved: $_" -ForegroundColor Green
    }
}

# Move Deployment Guides
Write-Host "`n📦 Moving Deployment Guides..." -ForegroundColor Yellow
@(
    "DEPLOYMENT-SCHRITT-FUR-SCHRITT.md",
    "ONLINE-DEPLOYMENT-GUIDE.md",
    "SICHERHEIT-PRIVATER-ZUGRIFF.md"
) | ForEach-Object {
    if (Test-Path $_) {
        Move-Item -Path $_ -Destination "archived/Deployment-Guides/" -Force
        Write-Host "  ✅ Moved: $_" -ForegroundColor Green
    }
}

# Move Analysis Docs
Write-Host "`n📦 Moving Analysis Docs..." -ForegroundColor Yellow
@(
    "ANALYSIS-PART2-JS-MODULES.md",
    "API-Documentation-v1.md",
    "PROJEKTUEBERGABE-GUIDE.md",
    "README-START-HERE.md"
) | ForEach-Object {
    if (Test-Path $_) {
        Move-Item -Path $_ -Destination "archived/Analysis-Docs/" -Force
        Write-Host "  ✅ Moved: $_" -ForegroundColor Green
    }
}

# Move Snapshots
Write-Host "`n📦 Moving Snapshots..." -ForegroundColor Yellow
@(
    "FINAL-FILE-INVENTORY.md",
    "FINAL-COMPREHENSIVE-AUDIT.md",
    "DELIVERABLES-SUMMARY.md",
    "DELIVERABLES-SUMMARY-v2.md"
) | ForEach-Object {
    if (Test-Path $_) {
        Move-Item -Path $_ -Destination "archived/Snapshots/" -Force
        Write-Host "  ✅ Moved: $_" -ForegroundColor Green
    }
}

# Summary
Write-Host "`n✅ ARCHIVAL COMPLETE!" -ForegroundColor Green
Write-Host "`n📋 Summary:" -ForegroundColor Cyan
Write-Host "  - Master Prompts: 5 files" -ForegroundColor White
Write-Host "  - Implementation Plans: 3 files" -ForegroundColor White
Write-Host "  - Designer Guides: 4 files" -ForegroundColor White
Write-Host "  - Deployment Guides: 3 files" -ForegroundColor White
Write-Host "  - Analysis Docs: 4 files" -ForegroundColor White
Write-Host "  - Snapshots: 4 files" -ForegroundColor White
Write-Host "  - TOTAL: 23 files archived" -ForegroundColor Green

Write-Host "`n📦 Verify structure:" -ForegroundColor Yellow
Get-ChildItem "archived" -Recurse | Where-Object { $_.PSIsContainer } | ForEach-Object {
    $count = (Get-ChildItem $_.FullName -Filter "*.md").Count
    Write-Host "  ✅ $($_.Name): $count files" -ForegroundColor Cyan
}

Write-Host "`n🚀 Next steps:" -ForegroundColor Green
Write-Host "  1. git add ." -ForegroundColor White
Write-Host "  2. git commit -m 'chore: archive old documentation'" -ForegroundColor White
Write-Host "  3. git push origin main" -ForegroundColor White
Write-Host "`n🎯 Remember: Use MASTER-PROMPT-2026-DEFINITIVE.md for all chats!" -ForegroundColor Yellow
