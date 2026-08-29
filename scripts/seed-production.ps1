# Popula o banco de PRODUÇÃO com 10 perfis demo (seed).
# Uso:
#   1. No Railway: Postgres → Connect → copie a DATABASE_URL
#   2. No PowerShell, na raiz do projeto:
#        $env:DATABASE_URL = "postgresql://..."
#        .\scripts\seed-production.ps1
#
# Requer: Node 20+, dependências instaladas (npm install)

$ErrorActionPreference = "Stop"

if (-not $env:DATABASE_URL) {
  Write-Host "ERRO: defina DATABASE_URL com a connection string do Postgres no Railway." -ForegroundColor Red
  Write-Host 'Exemplo: $env:DATABASE_URL = "postgresql://user:pass@host:port/railway"'
  exit 1
}

if ($env:DATABASE_URL -match "localhost|127\.0\.0\.1") {
  Write-Host "AVISO: DATABASE_URL parece ser local. Confirme se é produção." -ForegroundColor Yellow
  $confirm = Read-Host "Continuar? (s/N)"
  if ($confirm -ne "s") { exit 0 }
}

Write-Host "Aplicando migrations..." -ForegroundColor Cyan
npm run db:migrate:deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Rodando seed (10 perfis)..." -ForegroundColor Cyan
npm run db:seed:prod
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Pronto. Perfis criados (senha Demo123!):" -ForegroundColor Green
Write-Host "  lucas@demo.local  -> /perfil/lucas-santos"
Write-Host "  ... e mais 9 perfis (veja saida do seed acima)"
Write-Host ""
Write-Host "Depois: confira GET https://SUA-API/api/v1/profiles e atualize NEXT_PUBLIC_API_URL na Vercel se a URL mudou."
