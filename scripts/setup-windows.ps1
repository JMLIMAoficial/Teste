# Setup local dev without Docker (Windows + PostgreSQL)
$ErrorActionPreference = "Stop"

$psql = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
$pgService = "postgresql-x64-17"

Write-Host "==> Checking PostgreSQL service..."
$svc = Get-Service -Name $pgService -ErrorAction SilentlyContinue
if (-not $svc) {
  Write-Host "PostgreSQL 17 not found. Install with:"
  Write-Host "  winget install PostgreSQL.PostgreSQL.17 --accept-package-agreements --accept-source-agreements"
  exit 1
}
if ($svc.Status -ne "Running") {
  Start-Service $pgService
  Start-Sleep -Seconds 3
}

if (-not (Test-Path $psql)) {
  Write-Host "psql not found at $psql"
  exit 1
}

Write-Host "==> Ensuring database and user..."
& $psql -U postgres -h 127.0.0.1 -c @"
DO `$`$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'acompanhante') THEN
    CREATE ROLE acompanhante LOGIN PASSWORD 'acompanhante_dev';
  END IF;
END `$`$;
"@ | Out-Null

$dbExists = & $psql -U postgres -h 127.0.0.1 -tAc "SELECT 1 FROM pg_database WHERE datname='acompanhante'"
if ($dbExists.Trim() -ne "1") {
  & $psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE acompanhante OWNER acompanhante;" | Out-Null
}
& $psql -U postgres -h 127.0.0.1 -c "GRANT ALL PRIVILEGES ON DATABASE acompanhante TO acompanhante;" | Out-Null

Write-Host "==> Pushing Prisma schema..."
npx prisma db push

Write-Host "==> Seeding database..."
npm run db:seed

Write-Host ""
Write-Host "Setup complete! Start servers:"
Write-Host "  npm run dev:api"
Write-Host "  npm run dev:web"
Write-Host ""
Write-Host "Demo logins (senha companions: Demo123!):"
Write-Host "  Admin:     admin@demo.local / Admin123!"
Write-Host "  Companion: maria@demo.local, thiago@demo.local, gabriel@demo.local ..."
Write-Host "  Ver lista completa ao rodar: npm run db:seed"
