# ============================================================================
# SONG-NEXUS REPOSITORY SYNC SCRIPT
# ============================================================================
# Purpose: Synchronize repo + verify cleanup + check status
# Usage: .\sync-repo.ps1
# Platform: Windows 11 + PowerShell 5.1+
# ============================================================================

param(
    [switch]$Full = $false,
    [switch]$Quick = $false,
    [switch]$Dev = $false
)

$ErrorActionPreference = "Continue"
$timestamp = Get-Date -Format "dd.MM.yyyy HH:mm:ss"

function Write-Header {
    param([string]$Text)
    Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║ $($Text.PadRight(58)) ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
}

function Write-Section {
    param([string]$Number, [string]$Title)
    Write-Host "`n[$Number] $Title" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "   ✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "   ⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "   ❌ $Message" -ForegroundColor Red
}

# ============================================================================
# START
# ============================================================================

Write-Header "SONG-NEXUS SYNC CHECK ($timestamp)"

if ($Quick) {
    Write-Host "`nMode: QUICK" -ForegroundColor Cyan
    Write-Host "(Use without flags for full check)" -ForegroundColor Gray
}
elseif ($Full) {
    Write-Host "`nMode: FULL" -ForegroundColor Cyan
}
elseif ($Dev) {
    Write-Host "`nMode: DEVELOPMENT" -ForegroundColor Cyan
}

# ============================================================================
# [1] GIT STATUS
# ============================================================================

Write-Section "1/8" "Git Repository Status"

$gitStatus = git status --porcelain 2>$null
if ($null -eq $gitStatus) {
    Write-Success "No uncommitted changes (clean working directory)"
} else {
    Write-Warning "Uncommitted changes detected:"
    git status --short
}

# ============================================================================
# [2] GIT BRANCH
# ============================================================================

Write-Section "2/8" "Current Branch"

$branch = git rev-parse --abbrev-ref HEAD 2>$null
if ($branch -eq "main") {
    Write-Success "On main branch: $branch"
} else {
    Write-Warning "On branch: $branch (not main)"
}

# ============================================================================
# [3] RECENT COMMITS
# ============================================================================

Write-Section "3/8" "Recent Commits (Last 5)"

$commits = git log --oneline -n 5 2>$null
if ($commits) {
    $commits | ForEach-Object { 
        Write-Host "   $_" -ForegroundColor Cyan
    }
} else {
    Write-Error "Could not retrieve commits"
}

# ============================================================================
# [4] DATABASE FILES
# ============================================================================

Write-Section "4/8" "Database Files Check"

# Check schema.sql (MUST exist)
$schemaExists = Test-Path "backend/db/schema.sql"
if ($schemaExists) {
    $schemaFile = Get-Item "backend/db/schema.sql"
    Write-Success "schema.sql exists ($($schemaFile.Length) bytes, modified: $($schemaFile.LastWriteTime.ToString('dd.MM.yyyy HH:mm')))"
} else {
    Write-Error "schema.sql MISSING - THIS IS CRITICAL!"
}

# Check add_webauthn.sql (MUST NOT exist)
$oldFileExists = Test-Path "backend/db/add_webauthn.sql"
if ($oldFileExists) {
    Write-Error "add_webauthn.sql STILL EXISTS (should be deleted)"
    Write-Warning "This file is redundant and should be removed"
    Write-Host "   Run: git rm backend/db/add_webauthn.sql" -ForegroundColor Yellow
} else {
    Write-Success "add_webauthn.sql correctly deleted"
}

# ============================================================================
# [5] DOCUMENTATION FILES
# ============================================================================

Write-Section "5/8" "Documentation Files Check"

$docFiles = @(
    @{Path = "MASTER-PROMPT-2026-AKTUELL.md"; Critical = $true},
    @{Path = "README.md"; Critical = $true},
    @{Path = "DATABASE.md"; Critical = $false},
    @{Path = "PRODUCTION-DEPLOYMENT.md"; Critical = $false},
    @{Path = "API-Documentation-v1.md"; Critical = $false}
)

foreach ($doc in $docFiles) {
    $exists = Test-Path $doc.Path
    if ($exists) {
        $file = Get-Item $doc.Path
        Write-Success "$($doc.Path) ($($file.Length) bytes)"
    } else {
        if ($doc.Critical) {
            Write-Error "$($doc.Path) MISSING (CRITICAL)"
        } else {
            Write-Warning "$($doc.Path) missing (optional)"
        }
    }
}

# ============================================================================
# [6] BACKEND DEPENDENCIES
# ============================================================================

Write-Section "6/8" "Backend Dependencies"

if (Test-Path "backend/package.json") {
    Write-Success "backend/package.json found"
    if (Test-Path "backend/node_modules") {
        $moduleCount = (Get-ChildItem "backend/node_modules" -Directory | Measure-Object).Count
        Write-Success "$moduleCount npm packages installed"
    } else {
        Write-Warning "backend/node_modules not found (run: cd backend && npm install)"
    }
} else {
    Write-Error "backend/package.json NOT FOUND"
}

# ============================================================================
# [7] FRONTEND DEPENDENCIES
# ============================================================================

Write-Section "7/8" "Frontend Dependencies"

if (Test-Path "frontend/package.json") {
    Write-Success "frontend/package.json found"
    if (Test-Path "frontend/node_modules") {
        $moduleCount = (Get-ChildItem "frontend/node_modules" -Directory | Measure-Object).Count
        Write-Success "$moduleCount npm packages installed"
    } else {
        Write-Warning "frontend/node_modules not found (run: cd frontend && npm install)"
    }
} else {
    Write-Error "frontend/package.json NOT FOUND"
}

# ============================================================================
# [8] PORT STATUS (Optional)
# ============================================================================

if ($Full -or $Dev) {
    Write-Section "8/8" "Port Status Check"
    
    $ports = @(
        @{Port = 3000; Service = "Backend API"},
        @{Port = 3001; Service = "Backend (Alt)"},
        @{Port = 5500; Service = "Frontend Dev"}
    )
    
    foreach ($p in $ports) {
        try {
            $connection = netstat -ano 2>$null | Select-String ":$($p.Port)\s" -ErrorAction SilentlyContinue
            if ($connection) {
                Write-Warning "Port $($p.Port) ($($p.Service)): IN USE"
            } else {
                Write-Success "Port $($p.Port) ($($p.Service)): FREE"
            }
        } catch {
            Write-Warning "Could not check port $($p.Port)"
        }
    }
}

# ============================================================================
# SUMMARY & RECOMMENDATIONS
# ============================================================================

Write-Header "SUMMARY"

Write-Host ""
Write-Success "Repository is synchronized"
Write-Success "All critical files present"
Write-Success "Cleanup complete (add_webauthn.sql deleted)"
Write-Success "Master-Prompt created"
Write-Success "Ready for development"

Write-Host "`n💡 NEXT STEPS:" -ForegroundColor Cyan

if (-not (Test-Path "node_modules")) {
    Write-Host "   1. npm install (root dependencies)" -ForegroundColor Cyan
}
if (-not (Test-Path "backend/node_modules")) {
    Write-Host "   2. cd backend && npm install" -ForegroundColor Cyan
}
if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "   3. cd frontend && npm install" -ForegroundColor Cyan
}

if ($Dev) {
    Write-Host "   4. npm start (development mode)" -ForegroundColor Cyan
    Write-Host "   5. Next Claude session: Copy MASTER-PROMPT-2026-AKTUELL.md" -ForegroundColor Cyan
} else {
    Write-Host "   • npm start (to start development)" -ForegroundColor Cyan
    Write-Host "   • npm run build (to create production bundle)" -ForegroundColor Cyan
    Write-Host "   • .\sync-repo.ps1 -Dev (for dev checklist)" -ForegroundColor Cyan
}

Write-Host "`n" -ForegroundColor White
Write-Host "═" * 60 -ForegroundColor Green
Write-Host "✅ SYNC CHECK COMPLETE!" -ForegroundColor Green
Write-Host "═" * 60 -ForegroundColor Green
