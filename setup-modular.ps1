# SONG-NEXUS v6.0 MODULAR FRONTEND SETUP

Write-Host "⚡ SONG-NEXUS Frontend Modularisierung..." -ForegroundColor Cyan

$frontendDir = "C:\Users\sebas\Desktop\SongSeite\frontend"

# Create directories
New-Item -ItemType Directory -Path "$frontendDir\css" -Force | Out-Null
New-Item -ItemType Directory -Path "$frontendDir\js" -Force | Out-Null
New-Item -ItemType Directory -Path "$frontendDir\assets" -Force | Out-Null

Write-Host "OK: Ordner erstellt" -ForegroundColor Green

# Backup old index.html
if (Test-Path "$frontendDir\index.html") {
    Copy-Item "$frontendDir\index.html" "$frontendDir\index.html.backup" -Force
    Write-Host "OK: Backup erstellt" -ForegroundColor Green
}

# Create empty JS files
$jsFiles = @(
    "js/api-client.js",
    "js/auth.js",
    "js/tracks.js",
    "js/player.js",
    "js/ui.js",
    "js/app.js"
)

foreach ($file in $jsFiles) {
    New-Item -ItemType File -Path "$frontendDir\$file" -Force | Out-Null
    Write-Host "OK: $file erstellt" -ForegroundColor Green
}

# Create CSS file
New-Item -ItemType File -Path "$frontendDir\css\styles.css" -Force | Out-Null
Write-Host "OK: css/styles.css erstellt" -ForegroundColor Green

# Create new minimal index.html
$html = '<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="SONG-NEXUS v6.0 - Secure Production Platform">
  <title>SONG-NEXUS v6.0</title>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Orbitron:wght@700;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <button class="theme-toggle" onclick="UI.toggleTheme()" title="Toggle Theme">🌙</button>

  <div class="container">
    <header>
      <h1>⚡ SONG-NEXUS v6.0 ⚡</h1>
      <p class="subtitle">>>> PRODUCTION-READY WITH TRACK BROWSER & PAYPAL INTEGRATION</p>
    </header>

    <div class="auth-section active" id="authSection"></div>
    <div class="user-section" id="userSection"></div>
    <div class="card" id="trackBrowserSection" style="display: none;"></div>
    <div id="trackModal" class="modal"></div>

    <footer>
      <p>⚡ SONG-NEXUS v6.0 | © 2025 | Production-Ready & Secure</p>
    </footer>
  </div>

  <script src="js/api-client.js"></script>
  <script src="js/ui.js"></script>
  <script src="js/auth.js"></script>
  <script src="js/tracks.js"></script>
  <script src="js/player.js"></script>
  <script src="js/app.js"></script>
</body>
</html>'

Set-Content -Path "$frontendDir\index.html" -Value $html -Force
Write-Host "OK: index.html erstellt" -ForegroundColor Green

Write-Host "`n✅ SETUP FERTIG!" -ForegroundColor Cyan
Write-Host "Dateien liegen in: C:\Users\sebas\Desktop\SongSeite\frontend" -ForegroundColor Yellow
