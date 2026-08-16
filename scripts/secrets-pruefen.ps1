<#
================================================================================
 SONG-NEXUS - Secrets in der .env pruefen, ohne sie anzuzeigen
================================================================================

 Wozu das gut ist:

 Zufallsgenerierte Secrets kann man sich nicht merken und beim Einfuegen
 nicht kontrollieren. In pgAdmin ist das Passwortfeld mit Punkten maskiert,
 im Editor sieht man zwar den Text, aber nicht, ob 44 oder 43 Zeichen
 angekommen sind. Ein halb eingefuegter Wert faellt erst auf, wenn etwas
 nicht mehr funktioniert - und dann weiss man nicht, woran es lag.

 Dieses Skript liest backend/.env und meldet je Schluessel:
   - ist er vorhanden
   - wie viele Zeichen hat der Wert
   - Fingerabdruck: die ersten 8 Stellen des SHA-256

 Der WERT wird nie ausgegeben. Der Fingerabdruck reicht zum Vergleichen:
 gleiche Werte ergeben gleiche Fingerabdruecke, ein einziges fehlendes
 Zeichen ergibt einen voellig anderen.

 Zusaetzlich geprueft:
   - sind zwei Secrets identisch (JWT_SECRET und SESSION_SECRET waren es
     einmal - Issue #2)
   - stehen noch Platzhalter drin
   - ist die Datei UTF-16 statt UTF-8 (der PowerShell-Umleitungspfeil
     schreibt UTF-16LE; genau so wurde einmal das Ende der .gitignore
     unlesbar, Issue #2)

 Verwendung:
     cd C:\Users\sebas\Desktop\SongSeite
     .\scripts\secrets-pruefen.ps1

 Gegen eine frisch erzeugte Datei abgleichen:
     .\scripts\secrets-pruefen.ps1 -Vergleich secrets-neu.txt

 Falls die Ausfuehrung blockiert wird:
     Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

================================================================================
#>

[CmdletBinding()]
param(
    # Join-Path statt "backend\.env": ergibt unter Windows den Backslash,
    # unter Linux den Schraegstrich. Damit laesst sich das Skript auch
    # ausserhalb von Windows pruefen.
    [string]$Datei = (Join-Path 'backend' '.env'),
    [string]$Vergleich
)

$ErrorActionPreference = 'Stop'

# Schluessel, die ein Geheimnis tragen. Reihenfolge wie in generate-secrets.ps1.
$GEHEIME = @(
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'SESSION_SECRET',
    'COOKIE_SECRET',
    'DB_PASSWORD'
)

$PLATZHALTER = @('dein', 'hier', 'your', 'xxx', 'changeme', 'beispiel',
                 'example', 'todo', '<', '>', 'aendern', 'passwort-hier')


function Get-Fingerabdruck {
    <# Erste 8 Hex-Stellen des SHA-256. Reicht zum Vergleichen, gibt den
       Wert nicht preis. #>
    param([string]$Wert)

    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($Wert)
        $hex = ($sha.ComputeHash($bytes) | ForEach-Object { $_.ToString('x2') }) -join ''
        return $hex.Substring(0, 8)
    }
    finally { $sha.Dispose() }
}


function Test-Kodierung {
    <# Meldet UTF-16, erkennbar an der BOM oder an Nullbytes im Text. #>
    param([string]$Pfad)

    $bytes = [System.IO.File]::ReadAllBytes($Pfad)
    if ($bytes.Length -ge 2) {
        if ($bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) { return 'UTF-16LE (BOM)' }
        if ($bytes[0] -eq 0xFE -and $bytes[1] -eq 0xFF) { return 'UTF-16BE (BOM)' }
    }
    # Nullbytes in den ersten 200 Bytes deuten ebenfalls auf UTF-16 hin
    $pruefLaenge = [Math]::Min(200, $bytes.Length)
    for ($i = 0; $i -lt $pruefLaenge; $i++) {
        if ($bytes[$i] -eq 0) { return 'UTF-16 (Nullbytes, keine BOM)' }
    }
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        return 'UTF-8 mit BOM'
    }
    return 'UTF-8'
}


function Read-Zuweisungen {
    <# Liest KEY=VALUE. Kommentare und Leerzeilen werden uebersprungen. #>
    param([string]$Pfad)

    $ergebnis = [ordered]@{}
    foreach ($zeile in [System.IO.File]::ReadAllLines($Pfad)) {
        $z = $zeile.Trim()
        if ($z -eq '' -or $z.StartsWith('#')) { continue }
        $i = $z.IndexOf('=')
        if ($i -lt 1) { continue }
        $name = $z.Substring(0, $i).Trim()
        $wert = $z.Substring($i + 1).Trim().Trim('"').Trim("'")
        if (-not $ergebnis.Contains($name)) { $ergebnis[$name] = $wert }
    }
    return $ergebnis
}


# ---------------------------------------------------------------- Hauptteil

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " SONG-NEXUS - Secrets pruefen" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path -LiteralPath $Datei)) {
    Write-Host "Datei nicht gefunden: $Datei" -ForegroundColor Red
    Write-Host "Vom Wurzelverzeichnis des Projekts ausfuehren." -ForegroundColor DarkGray
    Write-Host ""
    exit 1
}

$kodierung = Test-Kodierung -Pfad $Datei
Write-Host ("Datei:     {0}" -f $Datei)
Write-Host ("Kodierung: {0}" -f $kodierung) -NoNewline
if ($kodierung -eq 'UTF-8') {
    Write-Host "  OK" -ForegroundColor Green
}
else {
    Write-Host "  PROBLEM" -ForegroundColor Red
    Write-Host ""
    Write-Host "Diese Datei ist nicht reines UTF-8. dotenv liest sie moeglicherweise" -ForegroundColor Red
    Write-Host "falsch oder gar nicht. Das passiert, wenn mit > oder Add-Content ohne" -ForegroundColor Red
    Write-Host "-Encoding utf8 geschrieben wurde. Im Editor als UTF-8 neu speichern." -ForegroundColor Red
}
Write-Host ""

$werte = Read-Zuweisungen -Pfad $Datei

Write-Host ("{0,-22} {1,7}  {2,-10} {3}" -f 'Schluessel', 'Zeichen', 'Abdruck', 'Befund')
Write-Host ("{0,-22} {1,7}  {2,-10} {3}" -f '----------', '-------', '-------', '------')

$fehler = 0
$abdruecke = @{}

foreach ($name in $GEHEIME) {
    if (-not $werte.Contains($name)) {
        Write-Host ("{0,-22} {1,7}  {2,-10} " -f $name, '-', '-') -NoNewline
        Write-Host "FEHLT" -ForegroundColor Red
        $fehler++
        continue
    }

    $wert = $werte[$name]

    if ($wert -eq '') {
        Write-Host ("{0,-22} {1,7}  {2,-10} " -f $name, 0, '-') -NoNewline
        Write-Host "LEER" -ForegroundColor Red
        $fehler++
        continue
    }

    $abdruck = Get-Fingerabdruck -Wert $wert
    $abdruecke[$name] = $abdruck

    $istPlatzhalter = $false
    foreach ($m in $PLATZHALTER) {
        if ($wert.ToLower().Contains($m)) { $istPlatzhalter = $true; break }
    }

    Write-Host ("{0,-22} {1,7}  {2,-10} " -f $name, $wert.Length, $abdruck) -NoNewline

    if ($istPlatzhalter) {
        Write-Host "PLATZHALTER" -ForegroundColor Red
        $fehler++
    }
    elseif ($name -eq 'DB_PASSWORD' -and $wert.Length -lt 16) {
        Write-Host "kurz" -ForegroundColor Yellow
    }
    elseif ($name -ne 'DB_PASSWORD' -and $wert.Length -lt 32) {
        Write-Host "kurz - unter 32 Zeichen" -ForegroundColor Yellow
    }
    else {
        Write-Host "OK" -ForegroundColor Green
    }
}

Write-Host ""

# --- Doppelte Werte ---------------------------------------------------------
# JWT_SECRET und SESSION_SECRET waren einmal identisch (Issue #2). server.js
# verweigert das in Produktion; hier faellt es schon vorher auf.
$gruppen = $abdruecke.GetEnumerator() | Group-Object -Property Value | Where-Object { $_.Count -gt 1 }
if ($gruppen) {
    foreach ($g in $gruppen) {
        $namen = ($g.Group | ForEach-Object { $_.Key }) -join ', '
        Write-Host "DOPPELT: $namen tragen denselben Wert." -ForegroundColor Red
    }
    Write-Host "Jedes Secret braucht einen eigenen Wert." -ForegroundColor Red
    Write-Host ""
    $fehler++
}

# --- Abgleich mit einer erzeugten Datei ------------------------------------
if ($Vergleich) {
    if (-not (Test-Path -LiteralPath $Vergleich)) {
        Write-Host "Vergleichsdatei nicht gefunden: $Vergleich" -ForegroundColor Red
        Write-Host ""
        exit 1
    }

    Write-Host "Abgleich mit $Vergleich" -ForegroundColor Cyan
    Write-Host ""

    $soll = Read-Zuweisungen -Pfad $Vergleich

    foreach ($name in $GEHEIME) {
        if (-not $soll.Contains($name)) { continue }

        $sollAbdruck = Get-Fingerabdruck -Wert $soll[$name]
        $istAbdruck = $abdruecke[$name]

        Write-Host ("{0,-22} " -f $name) -NoNewline

        if ($null -eq $istAbdruck) {
            Write-Host "fehlt in $Datei" -ForegroundColor Red
            $fehler++
        }
        elseif ($istAbdruck -eq $sollAbdruck) {
            Write-Host "uebernommen" -ForegroundColor Green
        }
        else {
            Write-Host "WEICHT AB - vermutlich unvollstaendig eingefuegt" -ForegroundColor Red
            Write-Host ("{0,-22} erwartet {1}, gefunden {2}" -f '', $sollAbdruck, $istAbdruck) -ForegroundColor DarkGray
            $fehler++
        }
    }
    Write-Host ""
}

# --- Ergebnis ---------------------------------------------------------------
if ($fehler -eq 0) {
    Write-Host "Keine Beanstandungen." -ForegroundColor Green
    Write-Host ""
    Write-Host "Der Fingerabdruck belegt nur, dass der Wert vollstaendig uebernommen" -ForegroundColor DarkGray
    Write-Host "wurde. Ob die Datenbank ihn akzeptiert, zeigt erst der Verbindungstest." -ForegroundColor DarkGray
    Write-Host ""
    exit 0
}

Write-Host ("{0} Beanstandung(en)." -f $fehler) -ForegroundColor Red
Write-Host ""
exit 1
