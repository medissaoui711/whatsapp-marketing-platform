Write-Host "🚀 Stopping old Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "🧹 Cleaning cache..." -ForegroundColor Yellow
Remove-Item -Recurse -Force ".\apps\web\.next" -ErrorAction SilentlyContinue

Write-Host "🎯 Starting development servers on ports 4000/4001..." -ForegroundColor Green
npm run dev
