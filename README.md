# Acompanhante — Plataforma Premium

Monorepo da plataforma de catálogo premium, conforme Documentos 1–12.

## Estrutura

```
apps/
  web/          Next.js 15 — frontend público
  api/          NestJS — backend modular
packages/
  shared-core/  Utilitários compartilhados
  ui/           Design System (futuro)
  config/       Configs compartilhadas
prisma/         Schemas multi-schema (auth, users, profiles)
infrastructure/ Docker Compose para dev
docs/           Especificação oficial (12 documentos)
```

## Pré-requisitos

- Node.js 20+
- Docker Desktop
- npm 10+

## Setup rápido

```bash
# 1. Instalar dependências
npm install

# 2. Configurar ambiente
copy .env.example .env

# 3. Subir infraestrutura (PostgreSQL, Redis, Meilisearch, MinIO)
npm run docker:up

# 4. Criar schemas e dados de demo
npm run db:push
npx prisma db seed

# 5. Gerar Prisma Client
npm run db:generate

# 6. Rodar em desenvolvimento
npm run dev:api    # http://localhost:4000
npm run dev:web    # http://localhost:3000
```

## Endpoints

| Serviço | URL |
|---|---|
| Web | http://localhost:3000 |
| API Health | http://localhost:4000/api/health |
| API Profiles | http://localhost:4000/api/v1/profiles |
| MinIO Console | http://localhost:9001 |
| Mailhog | http://localhost:8025 |
| Meilisearch | http://localhost:7700 |

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Web + API (turbo) |
| `npm run dev:web` | Apenas frontend |
| `npm run dev:api` | Apenas backend |
| `npm run docker:up` | Sobe containers |
| `npm run docker:down` | Para containers |
| `npm run db:push` | Sincroniza schema com DB |
| `npm run db:migrate` | Cria migration |
| `npm run db:studio` | Prisma Studio |

## Fase atual

**Fase 0 — Fundação** ✅

- [x] Monorepo
- [x] Docker Compose
- [x] NestJS + health check
- [x] Prisma multi-schema (auth, users, profiles)
- [x] API pública de perfis
- [x] Web integrado com API (fallback mock)

**Fase 1 — MVP** (em progresso)

- [x] Auth: registro, login, JWT, refresh cookie, logout
- [x] Perfil companion: leitura e edição
- [x] Upload de fotos (local, pendente moderação)
- [x] Admin: aprovar/rejeitar perfis
- [x] Telas: `/login`, `/cadastro`, `/painel`, `/admin`

## Documentação

Especificação completa em `docs/`:

- [Doc 1 — Arquitetura](docs/arquitetura/DOCUMENTO-01-ARQUITETURA-DA-PLATAFORMA.md)
- [Docs 2–12 — Especificações](docs/especificacao/)
