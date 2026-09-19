# Restaura fotos faltando no volume de PRODUÇÃO (Railway).
# Uso (na raiz do projeto):
#   .\scripts\restore-prod-media.ps1
#
# 1) Define MEDIA_RESTORE_KEY na API
# 2) Redeploya a API
# 3) Chama POST /api/v1/internal/restore-missing-media
# 4) Remove a chave

$ErrorActionPreference = "Stop"
$ApiService = "@acompannhante/api"
$ApiBase = "https://acompannhanteapi-production.up.railway.app"
$RestoreKey = -join ((48..57 + 65..90 + 97..122) | Get-Random -Count 40 | ForEach-Object { [char]$_ })

Write-Host "Definindo MEDIA_RESTORE_KEY na API..." -ForegroundColor Cyan
npx railway variables set "MEDIA_RESTORE_KEY=$RestoreKey" -s $ApiService -e production --skip-deploys
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Redeploy da API (from source)..." -ForegroundColor Cyan
npx railway redeploy --from-source -y -s $ApiService -e production
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Aguardando API ficar healthy..." -ForegroundColor Cyan
$deadline = (Get-Date).AddMinutes(6)
do {
  Start-Sleep -Seconds 12
  try {
    $h = Invoke-RestMethod "$ApiBase/api/health" -TimeoutSec 10
    if ($h.status) {
      Write-Host "  health=$($h.status)"
      if ($h.status -eq "ok" -or $h.status -eq "degraded") { break }
    }
  } catch {
    Write-Host "  ainda subindo..."
  }
} while ((Get-Date) -lt $deadline)

Write-Host "Chamando restore..." -ForegroundColor Cyan
try {
  $result = Invoke-RestMethod `
    -Method Post `
    -Uri "$ApiBase/api/v1/internal/restore-missing-media" `
    -Headers @{ "x-restore-key" = $RestoreKey } `
    -TimeoutSec 300
  $result | ConvertTo-Json -Depth 5
} catch {
  Write-Host "ERRO no restore: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Removendo MEDIA_RESTORE_KEY mesmo assim..."
  npx railway variables delete MEDIA_RESTORE_KEY -s $ApiService -e production --skip-deploys 2>$null
  exit 1
}

Write-Host "Removendo MEDIA_RESTORE_KEY..." -ForegroundColor Cyan
npx railway variables delete MEDIA_RESTORE_KEY -s $ApiService -e production 2>$null
# delete may redeploy; that's fine after restore
$profiles = Invoke-RestMethod "$ApiBase/api/v1/profiles"
$ok = 0; $fail = 0
foreach ($p in $profiles.data) {
  $u = if ($p.coverPhotoThumbUrl) { $p.coverPhotoThumbUrl } elseif ($p.coverPhotoUrl) { $p.coverPhotoUrl } else { $null }
  if (-not $u) { Write-Host "  $($p.slug): sem URL"; $fail++; continue }
  try {
    $r = Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 10
    Write-Host "  $($p.slug): $($r.StatusCode) $($r.RawContentLength)b"
    $ok++
  } catch {
    Write-Host "  $($p.slug): FAIL"
    $fail++
  }
}
Write-Host "OK=$ok FAIL=$fail"
