# Harvest Valley — Cloudflare Deploy Script
# Run this script after installing wrangler: npm install -g wrangler
# You need to be logged in: wrangler login

Write-Host "=== Harvest Valley — Cloudflare Setup ===" -ForegroundColor Cyan
Write-Host ""

# ─── Step 1: Create D1 Database ───
Write-Host "[1/5] Creating D1 database..." -ForegroundColor Yellow
$d1Output = wrangler d1 create harvest_valley_db 2>&1
Write-Host $d1Output

# Extract database ID
$d1Id = ($d1Output | Select-String "database_id = `"([^`"]+)`"" | ForEach-Object { $_.Matches.Groups[1].Value })
Write-Host "D1 Database ID: $d1Id" -ForegroundColor Green

# ─── Step 2: Create R2 Bucket ───
Write-Host "[2/5] Creating R2 bucket..." -ForegroundColor Yellow
wrangler r2 bucket create harvest-valley-assets 2>&1
Write-Host "R2 bucket created" -ForegroundColor Green

# ─── Step 3: Create KV Namespace ───
Write-Host "[3/5] Creating KV namespace..." -ForegroundColor Yellow
$kvOutput = wrangler kv namespace create CONFIG 2>&1
Write-Host $kvOutput

$kvId = ($kvOutput | Select-String "id = `"([^`"]+)`"" | ForEach-Object { $_.Matches.Groups[1].Value })
Write-Host "KV Namespace ID: $kvId" -ForegroundColor Green

# ─── Step 4: Update wrangler.toml ───
Write-Host "[4/5] Updating wrangler.toml..." -ForegroundColor Yellow
$wranglerContent = Get-Content "wrangler.toml" -Raw
$wranglerContent = $wranglerContent -replace 'YOUR_D1_DATABASE_ID', $d1Id
$wranglerContent = $wranglerContent -replace 'YOUR_KV_NAMESPACE_ID', $kvId
Set-Content "wrangler.toml" $wranglerContent
Write-Host "wrangler.toml updated" -ForegroundColor Green

# ─── Step 5: Run Migration ───
Write-Host "[5/5] Running D1 migration..." -ForegroundColor Yellow
wrangler d1 migrations apply harvest_valley_db 2>&1
Write-Host "Migration complete" -ForegroundColor Green

# ─── Step 6: Upload Assets to R2 ───
Write-Host "[Bonus] Uploading assets to R2..." -ForegroundColor Yellow
$assetFiles = Get-ChildItem -Path "public/assets" -Recurse -File
foreach ($file in $assetFiles) {
    $r2Key = $file.FullName.Replace("public\assets\", "").Replace("\", "/")
    Write-Host "  Uploading: $r2Key"
    wrangler r2 object put "harvest-valley-assets/$r2Key" --file="$($file.FullName)" 2>&1 | Out-Null
}

# Upload draco files
$dracoFiles = Get-ChildItem -Path "public/three/draco" -Recurse -File
foreach ($file in $dracoFiles) {
    $r2Key = "three/draco/" + $file.Name
    Write-Host "  Uploading: $r2Key"
    wrangler r2 object put "harvest-valley-assets/$r2Key" --file="$($file.FullName)" 2>&1 | Out-Null
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "D1 Database ID: $d1Id" -ForegroundColor White
Write-Host "KV Namespace ID: $kvId" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Get your R2 public URL from: https://dash.cloudflare.com → R2 → harvest-valley-assets → Settings → Public Access"
Write-Host "2. Set VITE_R2_PUBLIC_URL in your .env file"
Write-Host "3. Update WALLET_ADDRESS, WALLET_NETWORK, TELEGRAM in wrangler.toml"
Write-Host "4. Run: wrangler dev (local dev) or wrangler deploy (production)"
Write-Host "5. Deploy frontend to Cloudflare Pages"
