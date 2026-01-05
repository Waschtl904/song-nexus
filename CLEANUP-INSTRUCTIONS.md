# 📄 DOCUMENTATION CLEANUP INSTRUCTIONS
**Datum:** 5. Januar 2026  
**Purpose:** Move 20 old docs to /archived/ folder  
**Time:** ~5 minutes  
**System:** Windows 11 PowerShell  

---

## 🚀 QUICK START

```powershell
# 1. Make sure you're in repo root
cd C:\Users\sebas\Desktop\SongSeite

# 2. Run the archival script
.\archive-old-docs.ps1

# 3. Verify the changes
Get-ChildItem archived -Recurse | Where-Object { $_.PSIsContainer } | ForEach-Object { Write-Host "$($_.Name): $(Get-ChildItem $_.FullName -Filter '*.md').Count files" }

# 4. Commit to GitHub
git add .
git commit -m "chore: archive old documentation (20 files)"
git push origin main
```

---

## 📋 WHAT HAPPENS

### BEFORE (Current State)
```
Root Level:
├── SONG-NEXUS-Master-v10.md
├── SONG-NEXUS-Master-v11.md
├── MASTER-ENTRY-PROMPT.md
├── IMPLEMENTATION-CHECKLIST.md
├── IMPLEMENTATION-CHECKLIST-v2.md
├── DESIGNER-QUICK-REF.md
├── DESIGNER-QUICK-REF-v2.md
├── DESIGNER-CONTROL-SYSTEM.md
├── DESIGNER-ANLEITUNG-DE.md
├── DESIGN-SYSTEM-ROADMAP.md
├── DEPLOYMENT-SCHRITT-FUR-SCHRITT.md
├── ONLINE-DEPLOYMENT-GUIDE.md
├── SICHERHEIT-PRIVATER-ZUGRIFF.md
├── ANALYSIS-PART2-JS-MODULES.md
├── API-Documentation-v1.md
├── PROJEKTUEBERGABE-GUIDE.md
├── README-START-HERE.md
├── FINAL-FILE-INVENTORY.md
├── FINAL-COMPREHENSIVE-AUDIT.md
├── DELIVERABLES-SUMMARY.md
└── DELIVERABLES-SUMMARY-v2.md

🛑 CHAOS: 20+ files at root level
```

### AFTER (Clean State)
```
Root Level:
✅ MASTER-PROMPT-2026-DEFINITIVE.md        ← USE THIS!
✅ REPOSITORY-STRUCTURE.md
✅ ARCHIVED-DOCS-INDEX.md
✅ README.md
✅ DATABASE.md
✅ PRODUCTION-DEPLOYMENT.md
✅ archive-old-docs.ps1
✅ CLEANUP-INSTRUCTIONS.md                 ← This file

archived/ folder:
├── Master-Prompts/ (5 files)
├── Implementation-Plans/ (3 files)
├── Designer-Guides/ (4 files)
├── Deployment-Guides/ (3 files)
├── Analysis-Docs/ (4 files)
└── Snapshots/ (4 files)

✅ CLEAN: 23 archived files in organized folders
```

---

## 🛠️ STEP-BY-STEP MANUAL PROCESS

If the script doesn't work, do it manually:

### 1. Create Archive Folders

```powershell
# Create main archive folder
New-Item -ItemType Directory -Path "archived" -Force

# Create subfolders
@(
    "archived/Master-Prompts",
    "archived/Implementation-Plans",
    "archived/Designer-Guides",
    "archived/Deployment-Guides",
    "archived/Analysis-Docs",
    "archived/Snapshots"
) | ForEach-Object { New-Item -ItemType Directory -Path $_ -Force }

# Verify
Get-ChildItem archived -Recurse
```

### 2. Move Master Prompts

```powershell
$masterPrompts = @(
    "SONG-NEXUS-Master-v10.md",
    "SONG-NEXUS-Master-v11.md",
    "MASTER-ENTRY-PROMPT.md",
    "MASTER-PROMPT-2026-AKTUELL.md",
    "MASTER-PROMPT-2026-REAL.md"
)

$masterPrompts | ForEach-Object {
    if (Test-Path $_) {
        Move-Item -Path $_ -Destination "archived/Master-Prompts/" -Force
        Write-Host "Moved: $_"
    }
}
```

### 3. Move Implementation Plans

```powershell
$implPlans = @(
    "IMPLEMENTATION-CHECKLIST.md",
    "IMPLEMENTATION-CHECKLIST-v2.md",
    "DESIGN-SYSTEM-ROADMAP.md"
)

$implPlans | ForEach-Object {
    if (Test-Path $_) {
        Move-Item -Path $_ -Destination "archived/Implementation-Plans/" -Force
        Write-Host "Moved: $_"
    }
}
```

### 4. Move Designer Guides

```powershell
$designGuides = @(
    "DESIGNER-QUICK-REF.md",
    "DESIGNER-QUICK-REF-v2.md",
    "DESIGNER-CONTROL-SYSTEM.md",
    "DESIGNER-ANLEITUNG-DE.md"
)

$designGuides | ForEach-Object {
    if (Test-Path $_) {
        Move-Item -Path $_ -Destination "archived/Designer-Guides/" -Force
        Write-Host "Moved: $_"
    }
}
```

### 5. Move Deployment Guides

```powershell
$deployGuides = @(
    "DEPLOYMENT-SCHRITT-FUR-SCHRITT.md",
    "ONLINE-DEPLOYMENT-GUIDE.md",
    "SICHERHEIT-PRIVATER-ZUGRIFF.md"
)

$deployGuides | ForEach-Object {
    if (Test-Path $_) {
        Move-Item -Path $_ -Destination "archived/Deployment-Guides/" -Force
        Write-Host "Moved: $_"
    }
}
```

### 6. Move Analysis Docs

```powershell
$analysisDocs = @(
    "ANALYSIS-PART2-JS-MODULES.md",
    "API-Documentation-v1.md",
    "PROJEKTUEBERGABE-GUIDE.md",
    "README-START-HERE.md"
)

$analysisDocs | ForEach-Object {
    if (Test-Path $_) {
        Move-Item -Path $_ -Destination "archived/Analysis-Docs/" -Force
        Write-Host "Moved: $_"
    }
}
```

### 7. Move Snapshots

```powershell
$snapshots = @(
    "FINAL-FILE-INVENTORY.md",
    "FINAL-COMPREHENSIVE-AUDIT.md",
    "DELIVERABLES-SUMMARY.md",
    "DELIVERABLES-SUMMARY-v2.md"
)

$snapshots | ForEach-Object {
    if (Test-Path $_) {
        Move-Item -Path $_ -Destination "archived/Snapshots/" -Force
        Write-Host "Moved: $_"
    }
}
```

---

## ✅ VERIFICATION

### Check Archive Structure

```powershell
# Show folder structure
Get-ChildItem archived -Recurse | Format-Table -Property Name, PSIsContainer

# Count files per folder
Get-ChildItem archived -Directory | ForEach-Object {
    $count = (Get-ChildItem $_.FullName -Filter "*.md").Count
    Write-Host "$($_.Name): $count files"
}

# Expected output:
# Master-Prompts: 5 files
# Implementation-Plans: 3 files
# Designer-Guides: 4 files
# Deployment-Guides: 3 files
# Analysis-Docs: 4 files
# Snapshots: 4 files
```

### Check Root Level is Clean

```powershell
# List all .md files in root (should be only ~7)
Get-ChildItem . -Filter "*.md" | Select-Object Name

# Expected:
# README.md
# DATABASE.md
# PRODUCTION-DEPLOYMENT.md
# MASTER-PROMPT-2026-DEFINITIVE.md
# REPOSITORY-STRUCTURE.md
# ARCHIVED-DOCS-INDEX.md
# CLEANUP-INSTRUCTIONS.md
```

---

## 🗓️ GIT COMMIT

```powershell
# Check what changed
git status

# Expected: 23 files moved to archived/ folder

# Add changes
git add .

# Commit with descriptive message
git commit -m "chore: archive old documentation\n\n- Move 20 old docs to /archived/ folder\n- Keep for historical reference\n- Use MASTER-PROMPT-2026-DEFINITIVE as source of truth\n- Organized into 6 categories"

# Push to GitHub
git push origin main

# Verify on GitHub
# https://github.com/Waschtl904/song-nexus
```

---

## ⚠️ TROUBLESHOOTING

### Script Won't Run

```powershell
# PowerShell execution policy might be blocking it
# Temporarily allow scripts:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then run the script:
.\archive-old-docs.ps1

# Restore original policy:
Set-ExecutionPolicy -ExecutionPolicy Restricted -Scope CurrentUser
```

### File Already in Archive

```powershell
# If you get "file already exists" error
# Just delete the old version from root
Remove-Item "SONG-NEXUS-Master-v10.md" -Force

# Or use Move-Item with -Force flag (script does this)
```

### Wrong Files Moved

```powershell
# Git makes it easy to undo
git reset --hard HEAD~1

# This reverts to before the commit
# Then try again
```

---

## 🚀 AFTER CLEANUP

### What Changes

```
✅ Root level is CLEAN (fewer files)
✅ Old docs are PRESERVED (in /archived/)
✅ No confusion (DEFINITIVE is the only master)
✅ No regressions (single source of truth)
```

### How to Use Archived Docs

```powershell
# Find WebAuthn analysis
Get-ChildItem archived/Analysis-Docs -Filter "*.md" | Where-Object { $_ -match "webauthn" }

# View archived file
Get-Content "archived/Analysis-Docs/ANALYSIS-PART2-JS-MODULES.md" -TotalCount 50

# Search for keyword in archived
Select-String -Path "archived/**/*.md" -Pattern "design-tokens"
```

### Update Workflow

```
1. Always use MASTER-PROMPT-2026-DEFINITIVE.md
2. Copy it into new chat sessions
3. If something changes, update DEFINITIVE
4. Push updated DEFINITIVE to GitHub
5. Never create new master prompts
```

---

## 🎯 REMEMBER

```
✅ Root Level Clean:    MASTER-PROMPT-2026-DEFINITIVE.md ONLY
✅ Archived Safe:       All old docs in /archived/ for reference
✅ No Regressions:      Single source of truth
✅ Easy to Find:        ARCHIVED-DOCS-INDEX.md tells you what's where
```

---

**Created:** 5. Januar 2026, 20:47 CET  
**Time to Execute:** ~5 minutes  
**Reversible:** Yes (git reset --hard)  
**Impact:** Cleaner repo, no functionality change  
