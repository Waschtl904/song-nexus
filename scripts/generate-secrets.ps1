<#
================================================================================
 SONG-NEXUS - Secret-Generator fuer Windows / PowerShell
================================================================================

 Hintergrund (Issue #2):
 In .env.production.example standen echte, funktionierende Werte - darunter
 JWT_SECRET, SESSION_SECRET, COOKIE_SECRET, das DB-Passwort und PayPal-
 Credentials. Die Datei liegt in einem oeffentlichen Repository.

 Dieses Skript erzeugt alle benoetigten Secrets kryptographisch sicher und
 jeweils mit EIGENEM Wert. Es ersetzt das haendische "openssl rand" unter
 Windows, wo openssl oft nicht installiert ist.

 Verwendung:
     cd C:\Users\sebas\Desktop\SongSeite
     .\scripts\generate-secrets.ps1

 Nur anzeigen, nichts schreiben:
     .\scripts\generate-secrets.ps1 -NurAnzeigen

 Falls die Ausfuehrung blockiert wird:
     Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

================================================================================
#>

[CmdletBinding()]
param(
    [string]$Ausgabedatei = "secrets-neu.txt",
    [switch]$NurAnzeigen
)

$ErrorActionPreference = 'Stop'

function New-Secret {
    <# 32 Byte aus dem Krypto-RNG, base64-kodiert -> 44 Zeichen. #>
    param([int]$Bytes = 32)
    $buffer = New-Object byte[] $Bytes
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try   { $rng.GetBytes($buffer) }
    finally { $rng.Dispose() }
    return [Convert]::ToBase64String($buffer)
}

function New-Passwort {
    <# DB-Passwort ohne Sonderzeichen, die in Connection-Strings Probleme machen. #>
    param([int]$Laenge = 28)
    $alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    $bytes = New-Object byte[] $Laenge
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try   { $rng.GetBytes($bytes) }
    finally { $rng.Dispose() }
    -join ($bytes | ForEach-Object { $alphabet[$_ % $alphabet.Length] })
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " SONG-NEXUS - Secrets generieren" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Jeder Eintrag bekommt einen eigenen Aufruf - bewusst keine Wiederverwendung.
$secrets = [ordered]@{
    'JWT_SECRET'         = New-Secret
    'JWT_REFRESH_SECRET' = New-Secret
    'SESSION_SECRET'     = New-Secret
    'COOKIE_SECRET'      = New-Secret
    'DB_PASSWORD'        = New-Passwort
}

foreach ($key in $secrets.Keys) {
    Write-Host ("{0,-20}" -f $key) -ForegroundColor Yellow -NoNewline
    Write-Host $secrets[$key]
}

# Sicherheitsnetz: server.js bricht in Produktion ab, wenn zwei Werte gleich
# sind. Hier zusaetzlich pruefen, damit es gar nicht erst dazu kommt.
$werte = $secrets.Values
if (($werte | Select-Object -Unique).Count -ne $werte.Count) {
    throw "Zwei Secrets sind identisch - Skript abgebrochen. Bitte erneut ausfuehren."
}

Write-Host ""
Write-Host "Alle Werte sind paarweise verschieden." -ForegroundColor Green

if ($NurAnzeigen) {
    Write-Host ""
    Write-Host "Nur-Anzeigen-Modus: keine Datei geschrieben." -ForegroundColor DarkGray
    Write-Host ""
    return
}

$zeilen = @(
    "# Generiert am $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    "# Diese Datei NICHT committen. Werte nach .env.production uebertragen,",
    "# dann diese Datei loeschen.",
    ""
)
foreach ($key in $secrets.Keys) { $zeilen += "$key=$($secrets[$key])" }

# UTF8 ohne BOM - eine BOM wuerde beim Kopieren in .env den ersten Key zerstoeren
$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines((Join-Path (Get-Location) $Ausgabedatei), $zeilen, $utf8)

Write-Host ""
Write-Host "Geschrieben nach: $Ausgabedatei" -ForegroundColor Green

# Sicherheitsnetz: pruefen, dass die Datei wirklich von .gitignore erfasst ist.
# Beim ersten Anlauf war sie es NICHT - das Muster *-secrets.txt greift bei
# "secrets-neu.txt" nicht, und die Datei mit den Live-Secrets lag ungeschuetzt
# im Arbeitsverzeichnis. Ein "git add ." haette sie mitgenommen.
try {
    $null = git check-ignore -- $Ausgabedatei 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "!!! WARNUNG !!!" -ForegroundColor Red
        Write-Host "$Ausgabedatei wird von .gitignore NICHT erfasst." -ForegroundColor Red
        Write-Host "Datei sofort loeschen oder .gitignore ergaenzen, bevor du committest." -ForegroundColor Red
    } else {
        Write-Host "Von .gitignore erfasst - kein Commit-Risiko." -ForegroundColor DarkGray
    }
} catch {
    Write-Host "Hinweis: git nicht verfuegbar, .gitignore-Pruefung uebersprungen." -ForegroundColor DarkGray
}
Write-Host ""
Write-Host "Naechste Schritte:" -ForegroundColor Cyan
Write-Host "  1. Werte nach .env.production uebertragen (bzw. auf dem VPS)"
Write-Host "  2. DB-Passwort in PostgreSQL setzen:"
Write-Host "       ALTER USER song_nexus_user WITH PASSWORD '<neues Passwort>';" -ForegroundColor DarkGray
Write-Host "  3. PayPal-Credentials im PayPal-Dashboard NEU ausstellen"
Write-Host "     (die alten stehen in der Git-Historie und gelten als verbrannt)"
Write-Host "  4. Diese Datei loeschen:  Remove-Item $Ausgabedatei"
Write-Host ""
Write-Host "Hinweis: Nach dem Rotieren von JWT_SECRET sind alle bestehenden" -ForegroundColor Yellow
Write-Host "Logins ungueltig - genau das ist beabsichtigt (Token-Widerruf)." -ForegroundColor Yellow
Write-Host ""
