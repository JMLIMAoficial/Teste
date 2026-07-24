# Setup local — Windows PowerShell
# Requer: Node.js 20+, Docker Desktop

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot/..

Write-Host "=== Acompanhante — Setup ===" -ForegroundColor Cyan

if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "Criado .env a partir de .env.example"
}

Write-Host "Instalando dependencias..."
npm install

Write-Host "Subindo Docker..."
docker compose -f infrastructure/docker/docker-compose.yml up -d

Write-Host "Aguardando PostgreSQL..."
Start-Sleep -Seconds 8

Write-Host "Sincronizando banco..."
npx prisma db push

Write-Host "Gerando Prisma Client..."
npx prisma generate

Write-Host "Seed de dados demo..."
npx prisma db seed

Write-Host ""
Write-Host "Setup concluido!" -ForegroundColor Green
Write-Host "  npm run dev:api   -> http://localhost:4000"
Write-Host "  npm run dev:web   -> http://localhost:3000"
