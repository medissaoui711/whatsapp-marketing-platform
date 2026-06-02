param(
  [switch]$SkipMigrations,
  [switch]$SkipSeed,
  [string]$EnvFile = "packages/db/.env"
)

Write-Host "=== SaaS Platform - Setup Database ===" -ForegroundColor Cyan

$rootDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $rootDir

# 1. Load environment
Write-Host "`n[1/4] Loading environment..." -ForegroundColor Yellow
if (Test-Path $EnvFile) {
  Get-Content $EnvFile | ForEach-Object {
    if ($_ -match "^\s*([^#=]+)=(.*)$") {
      $key = $matches[1].Trim()
      $val = $matches[2].Trim().Trim('"', "'")
      Set-Item -Path "Env:$key" -Value $val
    }
  }
  Write-Host "  Loaded $EnvFile" -ForegroundColor Green
} else {
  Write-Warning "  $EnvFile not found, using existing env vars"
}

# 2. Generate Prisma Client
Write-Host "`n[2/4] Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
  Write-Error "Prisma generate failed"
  exit 1
}
Write-Host "  Prisma Client generated" -ForegroundColor Green

# 3. Run migrations
if (-not $SkipMigrations) {
  Write-Host "`n[3/4] Running migrations..." -ForegroundColor Yellow
  npx prisma migrate dev --name init --skip-generate
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Migration failed"
    exit 1
  }
  Write-Host "  Migrations applied" -ForegroundColor Green
} else {
  Write-Host "`n[3/4] Skipping migrations" -ForegroundColor Yellow
}

# 4. Run seed
if (-not $SkipSeed) {
  Write-Host "`n[4/4] Seeding database..." -ForegroundColor Yellow
  $env:SEED_DEMO_DATA = "true"
  $env:DEFAULT_ADMIN_EMAIL = "admin@demo.com"
  $env:DEFAULT_ADMIN_PASSWORD = "admin123"
  $env:DEFAULT_ADMIN_NAME = "System Administrator"

  npx prisma db seed
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Seed failed"
    exit 1
  }
  Write-Host "  Database seeded" -ForegroundColor Green
} else {
  Write-Host "`n[4/4] Skipping seed" -ForegroundColor Yellow
}

Write-Host "`n=== Setup Complete ===" -ForegroundColor Cyan
Write-Host "  Admin: admin@demo.com / admin123" -ForegroundColor Green
