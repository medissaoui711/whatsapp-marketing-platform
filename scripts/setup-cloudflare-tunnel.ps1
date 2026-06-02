param(
    [string]$Domain = "api.yourdomain.com",
    [string]$TunnelName = "saas-platform"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🛡️ Cloudflare Tunnel Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

Write-Host "`n📋 Step 1: Checking cloudflared..." -ForegroundColor Yellow
if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Host "⚠️ cloudflared not found. Installing..." -ForegroundColor Yellow
    $url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    $output = "$env:USERPROFILE\cloudflared.exe"
    Invoke-WebRequest -Uri $url -OutFile $output
    Write-Host "✅ cloudflared installed to: $output" -ForegroundColor Green
    Write-Host "Please add to PATH or use full path." -ForegroundColor Yellow
} else {
    Write-Host "✅ cloudflared is installed" -ForegroundColor Green
}

Write-Host "`n🔐 Step 2: Login to Cloudflare..." -ForegroundColor Yellow
Write-Host "This will open a browser window for authentication."
Start-Process "cloudflared tunnel login"

Read-Host "Press Enter after completing login"

Write-Host "`n🕳️ Step 3: Creating tunnel..." -ForegroundColor Yellow
$tunnel = cloudflared tunnel create $TunnelName
Write-Host "✅ Tunnel created: $tunnel" -ForegroundColor Green

Write-Host "`n⚙️ Step 4: Creating config file..." -ForegroundColor Yellow
$configPath = "$env:USERPROFILE\.cloudflared\config.yml"
$config = @"
tunnel: $TunnelName
credentials-file: $env:USERPROFILE\.cloudflared\$TunnelName.json

ingress:
  - hostname: $Domain
    service: http://localhost:3000
  - service: http_status:404
"@
$config | Out-File -FilePath $configPath -Encoding utf8
Write-Host "✅ Config saved to: $configPath" -ForegroundColor Green

Write-Host "`n🌐 Step 5: Configuring DNS..." -ForegroundColor Yellow
cloudflared tunnel route dns $TunnelName $Domain
Write-Host "✅ DNS configured for: $Domain" -ForegroundColor Green

Write-Host "`n🔑 Step 6: Getting tunnel token..." -ForegroundColor Yellow
$token = cloudflared tunnel token $TunnelName
Write-Host "`n=========================================" -ForegroundColor Cyan
Write-Host "📝 CLOUDFLARE_TUNNEL_TOKEN:" -ForegroundColor Green
Write-Host $token -ForegroundColor White
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "`n⚠️ Save this token to your .env.production file!" -ForegroundColor Yellow
Write-Host "CLOUDFLARE_TUNNEL_TOKEN=$token" -ForegroundColor White

Write-Host "`n🧪 Step 7: Testing tunnel..." -ForegroundColor Yellow
Write-Host "Run this command to start the tunnel:"
Write-Host "cloudflared tunnel run $TunnelName" -ForegroundColor White
