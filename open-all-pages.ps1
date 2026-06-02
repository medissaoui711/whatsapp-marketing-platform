Write-Host "🚀 Opening all dashboard pages..." -ForegroundColor Cyan

$pages = @(
    "http://localhost:3000/login",
    "http://localhost:3000/dashboard",
    "http://localhost:3000/contacts",
    "http://localhost:3000/campaigns",
    "http://localhost:3000/scraping",
    "http://localhost:3000/settings/features",
    "http://localhost:3000/settings/whatsapp",
    "http://localhost:3000/settings/webhooks",
    "http://localhost:3000/audit-log",
    "http://localhost:3000/users",
    "http://localhost:3000/dev/twitter",
    "http://localhost:3000/dev/monitoring"
)

foreach ($page in $pages) {
    Start-Process "chrome.exe" $page
    Start-Sleep -Milliseconds 500
}

Write-Host "✅ All pages opened!" -ForegroundColor Green
