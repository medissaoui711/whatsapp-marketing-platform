Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🚀 Starting Load & Stress Testing Suite" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$resultsDir = ".\test-results\$timestamp"
New-Item -ItemType Directory -Path $resultsDir -Force | Out-Null

Write-Host "`n📋 Checking server..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ Server is running" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Server not responding, but continuing..." -ForegroundColor Yellow
}

Write-Host "`n📊 Test results will be saved to: $resultsDir" -ForegroundColor Green
Write-Host "`n✅ Setup completed!" -ForegroundColor Green
