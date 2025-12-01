#!/usr/bin/env pwsh
# ========================================================================
# 🧪 SONG-NEXUS v6.0 – FULL BACKEND TEST SUITE
# ========================================================================

Write-Host "⚡ SONG-NEXUS BACKEND TEST SUITE" -ForegroundColor Cyan -BackgroundColor Black
Write-Host "=================================" -ForegroundColor Cyan

# Token vom Register (aus deiner Ausgabe)
$token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Miwicm9sZSI6InVzZXIiLCJpYXQiOjE3NjQ1Njk1OTEsImV4cCI6MTc2NTE3NDM5MX0.ztZ0HCJNZkqoIdExNM5nVHFbmXpfzimtDAVt20h2S6o"
$baseUrl = "http://localhost:3000/api"

Write-Host "`n1️⃣  GET /api/users/profile" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/users/profile" `
        -Method GET `
        -Headers @{ "Authorization" = "Bearer $token" } `
        -ErrorAction Stop
    Write-Host "✅ Status 200" -ForegroundColor Green
    $response | ConvertTo-Json | Write-Host
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2️⃣  GET /api/users/stats" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/users/stats" `
        -Method GET `
        -Headers @{ "Authorization" = "Bearer $token" } `
        -ErrorAction Stop
    Write-Host "✅ Status 200" -ForegroundColor Green
    $response | ConvertTo-Json | Write-Host
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3️⃣  GET /api/users/purchases" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/users/purchases" `
        -Method GET `
        -Headers @{ "Authorization" = "Bearer $token" } `
        -ErrorAction Stop
    Write-Host "✅ Status 200" -ForegroundColor Green
    $response | ConvertTo-Json | Write-Host
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n4️⃣  GET /api/users/play-history" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/users/play-history" `
        -Method GET `
        -Headers @{ "Authorization" = "Bearer $token" } `
        -ErrorAction Stop
    Write-Host "✅ Status 200" -ForegroundColor Green
    $response | ConvertTo-Json | Write-Host
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n5️⃣  POST /api/users/track-play (test)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/users/track-play" `
        -Method POST `
        -Headers @{ "Authorization" = "Bearer $token" } `
        -ContentType "application/json" `
        -Body '{\"track_id\": 1}' `
        -ErrorAction Stop
    Write-Host "✅ Status 200" -ForegroundColor Green
    $response | ConvertTo-Json | Write-Host
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n6️⃣  GET /api/payments/config" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/payments/config" `
        -Method GET `
        -ErrorAction Stop
    Write-Host "✅ Status 200" -ForegroundColor Green
    $response | ConvertTo-Json | Write-Host
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n7️⃣  GET /public/audio/THE_SPELL.mp3 (exists?)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/public/audio/THE_SPELL.mp3" `
        -Method GET `
        -ErrorAction Stop
    Write-Host "✅ Status 200 - Audio file exists" -ForegroundColor Green
    Write-Host "File size: $($response.RawContentLength) bytes" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Audio file not found or unreachable" -ForegroundColor Red
    Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========== SUMMARY ==========" -ForegroundColor Cyan
Write-Host "✅ = Endpoint works" -ForegroundColor Green
Write-Host "❌ = Endpoint needs fixing or data missing" -ForegroundColor Red
Write-Host "=============================`n" -ForegroundColor Cyan
