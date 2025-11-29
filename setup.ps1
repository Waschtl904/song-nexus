# ============================================================================
# SONG-NEXUS v6.0 - Automatisches Setup Script (PowerShell)
# Führe aus: .\setup.ps1 (als Admin!)
# ============================================================================

Write-Host "
███████████████████████████████████████████████████████████████████████████
     ⚡ SONG-NEXUS v6.0 - AUTOMATISCHES SETUP SCRIPT ⚡
███████████████████████████████████████████████████████████████████████████
" -ForegroundColor Cyan

# Überprüfe ob Admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ Bitte führe dieses Script als Administrator aus!" -ForegroundColor Red
    Write-Host "Klick Rechts auf setup.ps1 → Als Administrator ausführen" -ForegroundColor Yellow
    exit
}

Write-Host "[1/10] Erstelle Ordnerstruktur..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "frontend" -Force | Out-Null
New-Item -ItemType Directory -Path "backend" -Force | Out-Null
New-Item -ItemType Directory -Path "backend\routes" -Force | Out-Null
New-Item -ItemType Directory -Path "backend\db" -Force | Out-Null
New-Item -ItemType Directory -Path "backend\logs" -Force | Out-Null

Write-Host "[2/10] Erstelle Frontend Datei..." -ForegroundColor Yellow
New-Item -ItemType File -Path "frontend\index.html" -Force | Out-Null

Write-Host "[3/10] Erstelle Backend Hauptdatei..." -ForegroundColor Yellow
New-Item -ItemType File -Path "backend\server.js" -Force | Out-Null

Write-Host "[4/10] Erstelle Routes..." -ForegroundColor Yellow
New-Item -ItemType File -Path "backend\routes\auth.js" -Force | Out-Null
New-Item -ItemType File -Path "backend\routes\payments.js" -Force | Out-Null
New-Item -ItemType File -Path "backend\routes\users.js" -Force | Out-Null
New-Item -ItemType File -Path "backend\routes\tracks.js" -Force | Out-Null

Write-Host "[5/10] Erstelle Konfigurationsdateien..." -ForegroundColor Yellow
New-Item -ItemType File -Path "backend\package.json" -Force | Out-Null
New-Item -ItemType File -Path "backend\.env" -Force | Out-Null
New-Item -ItemType File -Path "backend\.env.example" -Force | Out-Null
New-Item -ItemType File -Path "backend\.gitignore" -Force | Out-Null
New-Item -ItemType File -Path "backend\Dockerfile" -Force | Out-Null
New-Item -ItemType File -Path "backend\docker-compose.yml" -Force | Out-Null

Write-Host "[6/10] Erstelle Datenbank Schema..." -ForegroundColor Yellow
New-Item -ItemType File -Path "backend\db\schema.sql" -Force | Out-Null

Write-Host "[7/10] Erstelle README..." -ForegroundColor Yellow
New-Item -ItemType File -Path "README.md" -Force | Out-Null

Write-Host "[8/10] Erstelle .gitignore..." -ForegroundColor Yellow
@"
node_modules/
.env
.env.local
logs/
*.log
dist/
build/
"@ | Out-File "backend\.gitignore" -Encoding UTF8

Write-Host "[9/10] Zeige Ordnerstruktur..." -ForegroundColor Yellow
Write-Host ""
tree /F 2>$null || dir /S /B
Write-Host ""

Write-Host "[10/10] Fertig!" -ForegroundColor Green

Write-Host "
============================================================================
" -ForegroundColor Cyan

Write-Host "✅ ORDNERSTRUKTUR ERFOLGREICH ERSTELLT!" -ForegroundColor Green
Write-Host ""

Write-Host "📋 NÄCHSTE SCHRITTE:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣  Kopiere deine heruntergeladenen Dateien in die Ordner:" -ForegroundColor White
Write-Host "    • song-nexus-v6.0-frontend.html → frontend\index.html" -ForegroundColor Gray
Write-Host "    • server.js → backend\server.js" -ForegroundColor Gray
Write-Host "    • auth.js → backend\routes\auth.js" -ForegroundColor Gray
Write-Host "    • payments.js → backend\routes\payments.js" -ForegroundColor Gray
Write-Host "    • users.js → backend\routes\users.js" -ForegroundColor Gray
Write-Host "    • tracks.js → backend\routes\tracks.js" -ForegroundColor Gray
Write-Host "    • package.json → backend\package.json" -ForegroundColor Gray
Write-Host "    • .env.example → backend\.env.example" -ForegroundColor Gray
Write-Host "    • schema.sql → backend\db\schema.sql" -ForegroundColor Gray
Write-Host ""

Write-Host "2️⃣  Öffne backend\.env und fülle es aus:" -ForegroundColor White
Write-Host "    • DB_PASSWORD (Dein Postgres Password)" -ForegroundColor Gray
Write-Host "    • JWT_SECRET (Irgendein langer Text)" -ForegroundColor Gray
Write-Host "    • PAYPAL_CLIENT_ID & PAYPAL_SECRET" -ForegroundColor Gray
Write-Host ""

Write-Host "3️⃣  Installiere Dependencies:" -ForegroundColor White
Write-Host "    cd backend" -ForegroundColor Gray
Write-Host "    npm install" -ForegroundColor Gray
Write-Host ""

Write-Host "4️⃣  Starte Backend:" -ForegroundColor White
Write-Host "    npm run dev" -ForegroundColor Gray
Write-Host ""

Write-Host "5️⃣  Öffne Frontend in Browser:" -ForegroundColor White
Write-Host "    http://localhost:3000" -ForegroundColor Gray
Write-Host ""

Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✨ Lese COMPLETE_SETUP_GUIDE.md für detaillierte Anleitung!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Drücke Enter zum Beenden..." -ForegroundColor Yellow
Read-Host