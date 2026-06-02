param(
    [switch]$Build = $true,
    [switch]$Down = $false
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🚀 Deploying to Production" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

if ($Down) {
    Write-Host "`n🛑 Stopping production services..." -ForegroundColor Yellow
    docker-compose -f docker-compose.production.yml down
    Write-Host "✅ Services stopped" -ForegroundColor Green
    exit 0
}

if ($Build) {
    Write-Host "`n🏗️ Building Docker images..." -ForegroundColor Yellow
    docker-compose -f docker-compose.production.yml build --no-cache
}

Write-Host "`n🐳 Starting production services..." -ForegroundColor Yellow
docker-compose -f docker-compose.production.yml up -d

Write-Host "`n📊 Checking service status..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
docker-compose -f docker-compose.production.yml ps

Write-Host "`n🩺 Health check..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Web server is healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Health check failed - check logs" -ForegroundColor Yellow
}

Write-Host "`n📋 View logs with:" -ForegroundColor Cyan
Write-Host "docker-compose -f docker-compose.production.yml logs -f" -ForegroundColor White
