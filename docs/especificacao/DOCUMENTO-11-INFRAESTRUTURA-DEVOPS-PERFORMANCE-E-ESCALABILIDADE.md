# Documento 11 — Infraestrutura, DevOps, Performance e Escalabilidade

**Versão:** 1.0.0  
**Status:** Especificação Oficial  
**Última atualização:** 2026-07-09  
**Dependências:**
- [Documento 1 — Arquitetura da Plataforma](../arquitetura/DOCUMENTO-01-ARQUITETURA-DA-PLATAFORMA.md)
- [Documento 6 — Conteúdo e Mídia](./DOCUMENTO-06-CONTEUDO-MIDIA-E-INTERACOES.md)
- [Documento 8 — Autenticação e Segurança](./DOCUMENTO-08-AUTENTICACAO-USUARIOS-PERMISSOES-E-SEGURANCA.md)
- [Documento 9 — Banco de Dados](./DOCUMENTO-09-BANCO-DE-DADOS-MODELAGEM-E-ESTRUTURA-DE-DADOS.md)
- [Documento 10 — Design System](./DOCUMENTO-10-DESIGN-SYSTEM-UX-UI-E-IDENTIDADE-VISUAL.md)  
**Escopo:** Ambientes, deploy, hospedagem, performance, observabilidade, segurança operacional e escalabilidade

---

## Sumário

1. [Visão Geral e Princípios](#1-visão-geral-e-princípios)
2. [Arquitetura de Infraestrutura](#2-arquitetura-de-infraestrutura)
3. [Ambientes](#3-ambientes)
4. [Controle de Código e Branches](#4-controle-de-código-e-branches)
5. [Pipeline CI/CD](#5-pipeline-cicd)
6. [Containers e Reprodutibilidade](#6-containers-e-reprodutibilidade)
7. [Hospedagem e Serviços](#7-hospedagem-e-serviços)
8. [CDN e Entrega de Conteúdo](#8-cdn-e-entrega-de-conteúdo)
9. [Armazenamento de Mídia](#9-armazenamento-de-mídia)
10. [Processamento Assíncrono](#10-processamento-assíncrono)
11. [Cache Inteligente](#11-cache-inteligente)
12. [Performance](#12-performance)
13. [Banco de Dados — Operações](#13-banco-de-dados--operações)
14. [Monitoramento e Observabilidade](#14-monitoramento-e-observabilidade)
15. [Logs](#15-logs)
16. [Alertas](#16-alertas)
17. [Backup e Recuperação de Desastres](#17-backup-e-recuperação-de-desastres)
18. [Segurança de Infraestrutura](#18-segurança-de-infraestrutura)
19. [Escalabilidade e Balanceamento](#19-escalabilidade-e-balanceamento)
20. [Health Monitor](#20-health-monitor)
21. [Custos e Otimização](#21-custos-e-otimização)
22. [Preparação Mobile](#22-preparação-mobile)
23. [Eventos Operacionais](#23-eventos-operacionais)
24. [Critérios de Aceitação](#24-critérios-de-aceitação)

---

## 1. Visão Geral e Princípios

### 1.1 Objetivo

Definir a estratégia técnica de **execução, hospedagem, implantação, monitoramento e evolução** da plataforma, capaz de suportar:

| Capacidade | Requisito |
|---|---|
| Crescimento de usuários | Escala horizontal sem redesign |
| Grande volume de mídia | Object storage + CDN + processamento assíncrono |
| Alto tráfego simultâneo | Cache em múltiplas camadas + load balancing |
| Processamento assíncrono | Filas BullMQ para jobs pesados |
| Expansão mobile | APIs REST estáveis, auth compartilhada |
| Evolução microsserviços | Serviços desacoplados por domínio, contratos por evento/API |

### 1.2 Princípios Obrigatórios (Documento 1)

| Princípio | Aplicação em Infra |
|---|---|
| **Modular Monolith** | Um deploy unificado na v1; separação lógica por módulo |
| **Sem acoplamento entre módulos** | Infra compartilhada (Redis, PG) com namespaces isolados por chave/fila |
| **Event-driven** | Invalidação de cache, jobs e alertas via eventos — não polling |
| **Configuração dinâmica** | Settings module para limites, TTLs e flags sem redeploy |
| **Observabilidade por módulo** | Métricas e logs com `module` tag |
| **Infrastructure as Code** | Toda infra versionada em `infrastructure/` |
| **Ambientes reproduzíveis** | Docker Compose local = paridade com staging |

### 1.3 O Que Evitar

| Anti-padrão | Alternativa |
|---|---|
| Deploy manual em produção | CI/CD com gates obrigatórios |
| Secrets no código ou git | Vault / secrets manager / env injetado |
| Um bucket S3 sem lifecycle | Políticas de tiering e expiração |
| Cache sem invalidação por evento | Event handlers + Cache module |
| Monolito de logs sem estrutura | JSON estruturado com correlation ID |
| Scaling reativo sem métricas | Alertas proativos + auto-scaling rules |
| Dependência de vendor único | Abstrações S3-compatible, Redis-compatible |

---

## 2. Arquitetura de Infraestrutura

### 2.1 Diagrama Geral — Produção (Fase 1)

```
                         ┌─────────────────────────────────┐
                         │         Cloudflare CDN          │
                         │   (DNS, WAF, DDoS, Edge Cache)  │
                         └───────────────┬─────────────────┘
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
              ▼                          ▼                          ▼
    ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
    │  apps/web        │      │  apps/api        │      │  Object Storage  │
    │  (Next.js 15)    │      │  (NestJS)        │      │  (S3 / R2)       │
    │  Vercel / Edge   │      │  Container(s)    │      │  + CDN origin    │
    └────────┬─────────┘      └────────┬─────────┘      └────────┬─────────┘
             │                         │                          │
             │              ┌──────────┼──────────┐               │
             │              │          │          │               │
             │              ▼          ▼          ▼               │
             │     ┌────────────┐ ┌─────────┐ ┌──────────┐       │
             │     │ PostgreSQL │ │  Redis  │ │Meilisearch│       │
             │     │    16+     │ │   7+    │ │  Search   │       │
             │     │ (managed)  │ │(managed)│ │ (managed) │       │
             │     └────────────┘ └────┬────┘ └──────────┘       │
             │                         │                          │
             │                         ▼                          │
             │              ┌─────────────────────┐               │
             │              │   BullMQ Workers     │◄──────────────┘
             │              │ (transcode, email,   │
             │              │  rankings, cleanup)  │
             │              └─────────────────────┘
             │
             ▼
    ┌─────────────────┐
    │  Observability   │
    │  Sentry + Grafana│
    │  + Loki/CloudWatch│
    └─────────────────┘
```

### 2.2 Componentes e Responsabilidades

| Componente | Tecnologia | Responsabilidade |
|---|---|---|
| **Frontend** | Next.js 15 (apps/web) | SSR/ISR/CSR, BFF leve, edge |
| **API** | NestJS (apps/api) | Lógica de negócio, eventos, jobs |
| **Banco** | PostgreSQL 16+ | Dados transacionais multi-schema |
| **Cache/Filas** | Redis 7+ | Cache, sessões, rate limit, BullMQ |
| **Busca** | Meilisearch | Índice de busca (Read Model) |
| **Mídia** | S3-compatible (R2/AWS) | Arquivos binários |
| **CDN** | Cloudflare | Entrega global, WAF, purge |
| **Workers** | BullMQ processors | Jobs assíncronos pesados |
| **CI/CD** | GitHub Actions | Build, test, deploy |
| **IaC** | Terraform (futuro) | Provisionamento cloud |
| **Monitoramento** | Sentry + Prometheus/Grafana | Erros, métricas, alertas |

### 2.3 Separação Lógica por Módulo (sem acoplamento)

| Recurso compartilhado | Isolamento |
|---|---|
| Redis cache | Prefixo de chave: `<module>:<entity>:<id>` |
| BullMQ filas | Fila por domínio: `media.transcode`, `notifications.email`, `analytics.aggregate` |
| PostgreSQL | Schema por domínio (Doc 9) |
| S3 | Prefixo de path: `/{env}/{module}/{entity}/` |
| Logs | Campo `module` em todo log estruturado |
| Métricas | Label `module` em Prometheus |

> **Regra:** Módulos compartilham infraestrutura física, mas **nunca** acessam filas, chaves ou paths de outro módulo diretamente.

---

## 3. Ambientes

### 3.1 Mapa de Ambientes

| Ambiente | Código | Objetivo | URL exemplo |
|---|---|---|---|
| **Desenvolvimento** | `dev` | Criação local, testes rápidos | `localhost:3000` / `localhost:4000` |
| **Homologação** | `staging` | Validação pré-produção, integração | `staging.acompannhante.com.br` |
| **Produção** | `production` | Ambiente oficial, alta disponibilidade | `acompannhante.com.br` |

### 3.2 Desenvolvimento (Local)

| Aspecto | Especificação |
|---|---|
| Orquestração | `docker compose up` (PostgreSQL, Redis, Meilisearch, MinIO) |
| Apps | `pnpm dev` — Next.js (3000) + NestJS (4000) via Turborepo |
| Banco | PostgreSQL local com seeds de desenvolvimento |
| Mídia | MinIO local (S3-compatible) |
| Filas | BullMQ com Redis local; workers no processo NestJS |
| Hot reload | Ativo em web e api |
| Dados | Seeds fictícios; sem dados de produção |
| Secrets | `.env.local` (gitignored) |

**Objetivo:** Feedback loop < 5s; paridade funcional com staging.

### 3.3 Homologação (Staging)

| Aspecto | Especificação |
|---|---|
| Deploy | Automático via merge em `develop` |
| Infra | Réplica em escala reduzida da produção |
| Banco | PostgreSQL dedicado (dados anonimizados ou sintéticos) |
| Mídia | Bucket staging separado |
| CDN | Ativo com domínio staging |
| Integrações | Sandbox (email, pagamentos futuros) |
| Testes | E2E, integração, smoke tests obrigatórios |
| Acesso | Equipe interna + stakeholders (auth básica opcional) |

**Objetivo:** Gate de qualidade antes de produção; reproduzir bugs de integração.

### 3.4 Produção

| Aspecto | Especificação |
|---|---|
| Deploy | Manual ou automático via tag/release (após aprovação) |
| Alta disponibilidade | Multi-AZ para banco e Redis; ≥ 2 instâncias API |
| SLA alvo | 99.9% uptime (≤ 8.7h downtime/ano) |
| Dados | Produção real; backups contínuos |
| Segurança | WAF, TLS 1.3, secrets rotacionados, audit ativo |
| Monitoramento | 24/7 com alertas para equipe on-call |
| Rollback | < 5 minutos para versão anterior |

### 3.5 Paridade entre Ambientes

| Serviço | Dev | Staging | Production |
|---|---|---|---|
| PostgreSQL | ✅ Docker | ✅ Managed (small) | ✅ Managed (HA) |
| Redis | ✅ Docker | ✅ Managed | ✅ Managed (HA) |
| Meilisearch | ✅ Docker | ✅ Managed | ✅ Managed |
| S3/MinIO | ✅ MinIO | ✅ R2/S3 | ✅ R2/S3 + lifecycle |
| CDN | ❌ (local) | ✅ | ✅ |
| BullMQ workers | ✅ In-process | ✅ Dedicated | ✅ Dedicated (auto-scale) |
| Sentry | ❌ | ✅ | ✅ |
| Email real | ❌ (Mailhog) | ❌ (sandbox) | ✅ |

### 3.6 Variáveis de Ambiente

| Variável | Descrição | Por ambiente |
|---|---|---|
| `NODE_ENV` | development / staging / production | Sim |
| `DATABASE_URL` | Connection string PostgreSQL | Sim |
| `REDIS_URL` | Connection string Redis | Sim |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` | Object storage | Sim |
| `MEILISEARCH_URL`, `MEILISEARCH_KEY` | Busca | Sim |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Autenticação | Sim (único por ambiente) |
| `SENTRY_DSN` | Monitoramento de erros | Staging + Production |
| `CDN_URL` | Base URL da CDN | Staging + Production |

**Regra:** Nenhum secret de produção em dev/staging. Rotação trimestral de secrets críticos.

---

## 4. Controle de Código e Branches

### 4.1 Estratégia de Branches (GitFlow Simplificado)

```
main ─────────────────────────────────────────► produção
  │
  ├── develop ────────────────────────────────► staging
  │     │
  │     ├── feature/DOC-123-profile-upload
  │     ├── feature/DOC-456-hot-score-v2
  │     └── fix/DOC-789-cache-invalidation
  │
  └── hotfix/DOC-999-auth-bypass ─────────────► produção (emergência)
```

| Branch | Origem | Destino | Propósito |
|---|---|---|---|
| `main` | — | Production deploy | Sempre estável, tagged |
| `develop` | `main` | Staging deploy | Integração contínua |
| `feature/*` | `develop` | `develop` (PR) | Nova funcionalidade |
| `fix/*` | `develop` | `develop` (PR) | Correção não urgente |
| `hotfix/*` | `main` | `main` + `develop` (PR) | Correção urgente em produção |
| `release/*` | `develop` | `main` + `develop` | Preparação de release |

### 4.2 Pull Requests

| Requisito | Especificação |
|---|---|
| Título | `[DOC-XXX] Descrição concisa` |
| Descrição | O que, por que, como testar |
| Tamanho | Máximo ~400 linhas alteradas (preferir PRs pequenos) |
| Checks obrigatórios | Lint, typecheck, testes, build |
| Review | Mínimo 1 aprovação (2 para mudanças de infra/security) |
| Branch atualizada | Rebase ou merge com base antes do merge |
| Sem force push | Proibido em `main` e `develop` |

### 4.3 Code Review — Checklist

| Item | Verificação |
|---|---|
| Arquitetura | Respeita Documento 1 (sem cross-module, eventos) |
| Segurança | Sem secrets, input validado, auth verificada |
| Performance | Cache configurado, queries paginadas |
| Testes | Cobertura adequada para mudança |
| Migrações | Prisma migration incluída e reversível |
| Observabilidade | Logs e métricas adicionados se necessário |
| Documentação | Spec atualizada se comportamento mudou |

### 4.4 Versionamento

| Aspecto | Padrão |
|---|---|
| Formato | [Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH` |
| Tags | `v1.2.3` no `main` a cada release de produção |
| Changelog | `CHANGELOG.md` atualizado por release |
| Apps | `apps/web` e `apps/api` versionados juntos (monorepo) |
| Módulos | Sem versão independente na v1; contratos via interfaces |

---

## 5. Pipeline CI/CD

### 5.1 Visão Geral do Fluxo

```
Desenvolvedor push/PR
        │
        ▼
┌───────────────────┐
│  1. Validações    │  Lint (ESLint) + Format (Prettier) + TypeCheck (tsc)
└────────┬──────────┘
         ▼
┌───────────────────┐
│  2. Testes        │  Unit (Jest) + Integration (Testcontainers)
└────────┬──────────┘
         ▼
┌───────────────────┐
│  3. Qualidade     │  Coverage ≥ 80% (modules) + Bundle size budget
└────────┬──────────┘
         ▼
┌───────────────────┐
│  4. Build         │  Turborepo build (web + api + packages)
└────────┬──────────┘
         ▼
┌───────────────────┐
│  5. Security      │  npm audit + SAST (opcional) + secret scan
└────────┬──────────┘
         ▼
┌───────────────────┐
│  6. Deploy        │  Staging (auto) / Production (manual gate)
└────────┬──────────┘
         ▼
┌───────────────────┐
│  7. Smoke Tests   │  Health checks + rotas críticas
└────────┬──────────┘
         ▼
┌───────────────────┐
│  8. Notificação   │  DeploymentCompleted / ServiceFailed
└───────────────────┘
```

### 5.2 Jobs do Pipeline

| Job | Trigger | Duração alvo | Bloqueante |
|---|---|---|---|
| `lint` | Todo PR e push | < 2 min | Sim |
| `typecheck` | Todo PR e push | < 3 min | Sim |
| `test:unit` | Todo PR e push | < 5 min | Sim |
| `test:integration` | PR para develop/main | < 10 min | Sim |
| `build` | Todo PR e push | < 8 min | Sim |
| `bundle-size` | PR que altera web | < 3 min | Sim (budget) |
| `migrate:check` | PR com mudanças prisma | < 2 min | Sim |
| `deploy:staging` | Merge em develop | < 10 min | Sim |
| `e2e:staging` | Pós deploy staging | < 15 min | Sim |
| `deploy:production` | Tag em main (manual) | < 15 min | Sim |
| `smoke:production` | Pós deploy production | < 5 min | Sim |

### 5.3 Estratégia de Deploy

| Aspecto | Especificação |
|---|---|
| **Staging** | Rolling deploy automático ao merge em `develop` |
| **Production** | Blue-green ou rolling com health check |
| **Database** | Migrations executadas **antes** do deploy da API (expand-contract) |
| **Rollback** | Revert para imagem/tag anterior; migration rollback documentado |
| **Feature flags** | Settings module para ativar/desativar sem redeploy |
| **Downtime** | Zero-downtime para API; ISR revalidation para web |

### 5.4 Processo de Release (Produção)

```
1. Criar branch release/vX.Y.Z a partir de develop
2. Freeze de features; apenas bugfixes
3. QA completo em staging
4. Merge release → main
5. Tag vX.Y.Z
6. Pipeline deploy:production (aprovação manual)
7. Smoke tests em produção
8. Merge main → develop (sync)
9. DeploymentCompleted event
```

### 5.5 Rollback

| Cenário | Ação | Tempo alvo |
|---|---|---|
| Bug na API | Redeploy tag anterior | < 5 min |
| Bug no frontend | Redeploy Vercel anterior / revert ISR | < 3 min |
| Migration com falha | Executar rollback SQL documentado | < 15 min |
| Degradação parcial | Desativar feature flag via Settings | < 1 min |

---

## 6. Containers e Reprodutibilidade

### 6.1 Quando Utilizar Docker

| Contexto | Docker | Justificativa |
|---|---|---|
| Desenvolvimento local | ✅ Docker Compose | Paridade com staging |
| CI (testes integração) | ✅ Testcontainers | Banco/Redis efêmeros |
| API em staging/production | ✅ Container | Portabilidade, scaling |
| Workers BullMQ | ✅ Container | Scaling independente |
| Next.js (web) | ⚡ Vercel nativo (v1) | Edge, ISR, zero-config |
| PostgreSQL/Redis | ❌ Managed service | Operação simplificada |

### 6.2 Docker Compose (Desenvolvimento)

| Serviço | Imagem | Porta | Volume |
|---|---|---|---|
| `postgres` | postgres:16-alpine | 5432 | `pgdata` |
| `redis` | redis:7-alpine | 6379 | — |
| `meilisearch` | getmeili/meilisearch | 7700 | `meili_data` |
| `minio` | minio/minio | 9000, 9001 | `minio_data` |
| `mailhog` | mailhog/mailhog | 1025, 8025 | — |

Localização: `infrastructure/docker/docker-compose.yml`

### 6.3 Dockerfile — API

| Aspecto | Especificação |
|---|---|
| Base | `node:22-alpine` (multi-stage) |
| Stages | `deps` → `build` → `production` |
| Output | Imagem < 200MB |
| User | Non-root (`node`) |
| Health check | `GET /health` |
| Variáveis | Injetadas em runtime, nunca baked |

### 6.4 Quando NÃO Containerizar

| Componente | Alternativa |
|---|---|
| PostgreSQL produção | Managed (RDS, Neon, Supabase) |
| Redis produção | Managed (Upstash, ElastiCache) |
| Meilisearch | Managed ou VM dedicada |
| Next.js | Vercel (build nativo) |

---

## 7. Hospedagem e Serviços

### 7.1 Mapa de Hospedagem — Fase 1

| Serviço | Provider recomendado | Alternativa | Notas |
|---|---|---|---|
| **Web (Next.js)** | Vercel | Cloudflare Pages | ISR, edge, preview deploys |
| **API (NestJS)** | Railway / Fly.io | AWS ECS, GCP Cloud Run | Containers, auto-scale |
| **Workers** | Mesmo provider da API | Kubernetes (futuro) | Processo separado |
| **PostgreSQL** | Neon / Supabase | AWS RDS | Multi-schema, PITR |
| **Redis** | Upstash | ElastiCache | Serverless ou dedicated |
| **Meilisearch** | Meilisearch Cloud | Self-hosted | Índice de busca |
| **Object Storage** | Cloudflare R2 | AWS S3 | Sem egress fee (R2) |
| **CDN** | Cloudflare | Vercel Edge | WAF + cache |
| **DNS** | Cloudflare | — | Proxy ativo |
| **Email** | Resend / SendGrid | Amazon SES | Transacional |
| **Monitoramento** | Sentry + Grafana Cloud | Datadog | Erros + métricas |

### 7.2 Dimensionamento Inicial (Produção)

| Serviço | Spec mínima | Escala trigger |
|---|---|---|
| API | 1 vCPU, 1GB RAM × 2 instâncias | CPU > 70% por 5 min |
| Workers | 1 vCPU, 2GB RAM × 1 | Queue depth > 100 |
| PostgreSQL | 2 vCPU, 4GB RAM, 50GB SSD | Connections > 80% pool |
| Redis | 256MB (dedicated) | Memory > 80% |
| Meilisearch | 1 vCPU, 2GB RAM | Index lag > 30s |

### 7.3 Rede e Comunicação

| Conexão | Protocolo | Restrição |
|---|---|---|
| Internet → CDN → Web | HTTPS (TLS 1.3) | Público |
| Internet → CDN → API | HTTPS | Rate limited |
| API → PostgreSQL | TLS, private network | Apenas API/workers |
| API → Redis | TLS, private network | Apenas API/workers |
| API → S3 | HTTPS, IAM/key | Apenas API/workers |
| API → Meilisearch | HTTPS, API key | Apenas API/workers |
| Admin → API | HTTPS + JWT + RBAC | Autenticado |

---

## 8. CDN e Entrega de Conteúdo

### 8.1 Estratégia CDN

| Tipo de conteúdo | Origem | Cache TTL | Purge |
|---|---|---|---|
| Páginas estáticas (SSG) | Vercel Edge | Longo (1d+) | On deploy |
| Páginas ISR (perfil) | Vercel/Next.js | 60–300s | On-demand revalidation |
| Imagens (variantes) | S3/R2 via CDN | 30d | Por tag `profile:{id}` |
| Vídeos (HLS segments) | S3/R2 via CDN | 7d | Por tag `video:{id}` |
| Thumbnails | S3/R2 via CDN | 30d | Por tag |
| Assets JS/CSS | Vercel Edge | Imutável (hash no filename) | On deploy |
| API responses | Não cachear no CDN | — | — |

### 8.2 Configuração Cloudflare

| Feature | Configuração |
|---|---|
| SSL | Full (strict) |
| WAF | OWASP ruleset + custom rules |
| DDoS | Proteção automática |
| Brotli/Gzip | Ativo |
| HTTP/3 | Ativo |
| Cache Rules | Por path pattern |
| Purge API | Integrado com eventos de mídia |

### 8.3 Purge por Eventos

| Evento | Ação CDN |
|---|---|
| `ProfileUpdated` | Purge `profile:{id}`, revalidate ISR |
| `PhotoApproved` | Purge `profile:{id}`, `photo:{id}` |
| `VideoTranscoded` | Purge `video:{id}` |
| `SettingChanged` | Purge `settings:public` |
| `DeploymentCompleted` | Purge assets se necessário |

### 8.4 Objetivos de Performance CDN

| Métrica | Alvo |
|---|---|
| Cache hit rate (mídia) | > 90% |
| TTFB (páginas cacheadas) | < 100ms |
| TTFB (páginas dinâmicas) | < 300ms |
| Latência CDN (Brasil) | < 50ms |

---

## 9. Armazenamento de Mídia

### 9.1 Arquitetura de Storage

```
Upload (API) → S3/R2 (original) → BullMQ job → Worker processa → S3/R2 (variantes) → CDN
```

### 9.2 Estrutura de Paths

| Path | Conteúdo |
|---|---|
| `/{env}/media/originals/{assetId}` | Arquivo original |
| `/{env}/media/variants/{assetId}/{variant}` | thumb, medium, large, hls_360, etc. |
| `/{env}/media/thumbnails/{assetId}` | Thumbnail gerado |
| `/{env}/media/temp/{uploadId}` | Upload em progresso (lifecycle: 24h) |

### 9.3 Requisitos

| Requisito | Implementação |
|---|---|
| Escalabilidade | Object storage ilimitado; sem filesystem local |
| Segurança | URLs assinadas para upload; acesso público apenas para aprovados |
| Controle de acesso | Mídia pendente/rejeitada: URL assinada com TTL curto |
| Otimização | Variantes geradas no processamento; nunca servir original em listagem |
| Antivírus | Scan antes de processar (Doc 6) |
| Lifecycle | Temp → delete 24h; rejeitados → delete 30d; originals → IA após 90d |

### 9.4 Limites de Upload

| Tipo | Tamanho máx. | Formatos | Configurável via Settings |
|---|---|---|---|
| Foto | 10 MB | JPEG, PNG, WebP | `media.photo.max_size_mb` |
| Vídeo | 500 MB | MP4, MOV, WebM | `media.video.max_size_mb` |
| Documento (verificação) | 5 MB | JPEG, PNG, PDF | `media.document.max_size_mb` |
| Anexo (mensagem) | 10 MB | JPEG, PNG, PDF | `media.attachment.max_size_mb` |

### 9.5 Projeção de Volume

| Fase | Perfis | Fotos/perfil | Vídeos/perfil | Storage estimado |
|---|---|---|---|---|
| Lançamento | 500 | 10 | 2 | ~50 GB |
| 6 meses | 5.000 | 15 | 3 | ~750 GB |
| 12 meses | 20.000 | 20 | 5 | ~4 TB |

**Preparação:** Lifecycle policies para tiering (frequente → infrequente → arquivo).

---

## 10. Processamento Assíncrono

### 10.1 Arquitetura de Filas (BullMQ)

```
API Service ──enqueue──► Redis (BullMQ) ──dequeue──► Worker Process(es)
                                │
                                ▼
                         Dead Letter Queue (DLQ)
                                │
                                ▼
                         Alerta (ServiceFailed)
```

### 10.2 Filas por Domínio

| Fila | Módulo dono | Jobs | Prioridade | Concurrency |
|---|---|---|---|---|
| `media.image.process` | Media | Resize, WebP/AVIF, blur_hash | Alta | 5 |
| `media.video.transcode` | Media | HLS transcode, thumbnail | Normal | 2 |
| `media.antivirus.scan` | Media | Scan de arquivo | Alta | 10 |
| `notifications.email` | Notifications | Envio de email | Normal | 5 |
| `notifications.push` | Notifications | Push (futuro) | Normal | 5 |
| `analytics.aggregate` | Analytics | Agregação diária | Baixa | 3 |
| `hotscore.recalculate` | HotScore | Recálculo de score | Normal | 3 |
| `rankings.snapshot` | Rankings | Snapshot de rankings | Baixa | 1 |
| `search.reindex` | Search | Reindexação Meilisearch | Normal | 2 |
| `cleanup.*` | Vários | Limpeza de dados expirados | Baixa | 1 |

### 10.3 Configuração de Jobs

| Parâmetro | Valor padrão | Configurável |
|---|---|---|
| Retry attempts | 3 | Sim (por fila) |
| Backoff | Exponential (5s, 25s, 125s) | Sim |
| Timeout | 5 min (imagem), 30 min (vídeo) | Sim |
| DLQ | Após 3 falhas | — |
| Idempotência | Obrigatória (jobId = entityId + action) | — |

### 10.4 Fluxo — Transcodificação de Vídeo

```
1. VideoUploaded event
2. media.video.transcode job enqueued
3. Worker: download original do S3
4. Worker: transcode H.264 → HLS (360p, 720p)
5. Worker: gera thumbnail
6. Worker: upload variantes para S3
7. Worker: atualiza media_variants no banco
8. VideoTranscoded event → CDN purge, Notifications
```

### 10.5 Fluxo — Processamento de Imagem

```
1. PhotoUploaded event
2. media.image.process job enqueued
3. Worker: resize (thumb 200px, medium 800px, large 1600px)
4. Worker: convert WebP + AVIF
5. Worker: gera blur_hash
6. Worker: upload variantes
7. PhotoProcessed event → CDN purge
```

### 10.6 Scaling de Workers

| Métrica | Ação |
|---|---|
| Queue depth > 50 (media) | Scale workers +1 |
| Queue depth > 100 (qualquer) | Alerta + scale |
| Job duration p95 > timeout 80% | Investigar + scale |
| DLQ > 0 | Alerta imediato |

---

## 11. Cache Inteligente

### 11.1 Camadas de Cache

| Camada | Tecnologia | Dados | TTL | Invalidação |
|---|---|---|---|---|
| **L1 — CDN** | Cloudflare | Mídia, assets estáticos | Longo | Purge por tag/evento |
| **L2 — ISR** | Next.js | Páginas de perfil | 60–300s | On-demand revalidation |
| **L3 — Redis** | Redis | Perfis, rankings, busca, settings | 60s–30d | Evento `*Updated` |
| **L4 — React Query** | Cliente | Dados de dashboard | SWR | Por query key |
| **L5 — Meilisearch** | Meilisearch | Índice de busca | Persistente | Evento `SearchIndexUpdated` |

### 11.2 Chaves Redis (Doc 9)

| Chave | TTL | Evento de invalidação |
|---|---|---|
| `profile:public:{slug}` | 120s | ProfileUpdated, ProfileApproved |
| `profile:card:{id}` | 120s | ProfileUpdated, HotScoreUpdated |
| `hotscore:{profileId}` | 120s | HotScoreUpdated |
| `ranking:{type}:{period}` | 300s | RankingUpdated |
| `search:autocomplete:{term}` | 60s | SearchIndexUpdated |
| `settings:public` | 600s | SettingChanged |
| `permissions:{userId}` | 300s | UserRoleChanged |
| `session:{sessionId}` | Sliding | Logout, expiração |
| `ratelimit:{key}` | Janela | Expiração natural |

### 11.3 Regras de Cache

| ID | Regra |
|---|---|
| RN-CACHE-001 | Invalidação orientada a eventos — nunca TTL-only para dados críticos |
| RN-CACHE-002 | Padrão de chave: `<module>:<entity>:<id>:<variant>` |
| RN-CACHE-003 | Cache warming via job agendado (rankings, destaques) |
| RN-CACHE-004 | Cache miss não deve causar cascade (circuit breaker) |
| RN-CACHE-005 | Módulo Cache é dono da estratégia; outros módulos emitem eventos |

### 11.4 Fluxo de Invalidação

```
Evento de domínio (ex: ProfileUpdated)
        │
        ▼
Handler do módulo Cache
        │
        ├── DELETE redis keys matching pattern
        ├── POST CDN purge API (tags)
        ├── POST Next.js revalidate API (paths)
        └── (opcional) Pre-warm ranking/profile
        │
        ▼
CacheInvalidated event (auditoria)
```

---

## 12. Performance

### 12.1 Performance Front-end

| Técnica | Aplicação | Alvo |
|---|---|---|
| **Code Splitting** | App Router por rota + dynamic imports | Bundle < 200KB first load |
| **Lazy Loading** | Componentes abaixo da dobra, modais, charts | LCP < 2.5s |
| **SSR/SSG/ISR** | Landing=SSG, Perfil=ISR, Admin=CSR | TTFB < 300ms |
| **Prefetch** | Next.js Link para rotas visíveis | Navegação < 200ms |
| **Tree Shaking** | Imports específicos (Lucide, date-fns) | Reduzir JS |
| **Compression** | Brotli (CDN) + Gzip fallback | -70% transfer |
| **Font Loading** | `next/font` com display:swap | Sem FOIT |
| **Critical CSS** | Tailwind purge + inline critical | FCP < 1.5s |

### 12.2 Budget de Performance (CI)

| Métrica | Budget | Ação se exceder |
|---|---|---|
| First Load JS | < 200 KB | Bloquear PR |
| LCP (lab) | < 2.5s | Warning |
| CLS | < 0.1 | Bloquear PR |
| INP | < 200ms | Warning |
| Total page weight (home) | < 1.5 MB | Warning |

Ferramenta: Lighthouse CI no pipeline.

### 12.3 Performance de Imagens

| Etapa | Especificação |
|---|---|
| Upload | Original preservado no S3 |
| Processamento | Worker gera: thumb (200px), medium (800px), large (1600px) |
| Formatos | WebP (primário) + AVIF (progressive) + JPEG (fallback) |
| Responsivo | `srcset` com variantes; `next/image` com sizes |
| Lazy loading | `loading="lazy"` abaixo da dobra; eager no LCP |
| Placeholder | blur_hash (LQIP) durante carregamento |
| CDN | Variantes servidas via CDN; original nunca em listagem |

### 12.4 Performance de Vídeos

| Aspecto | Especificação |
|---|---|
| Transcodificação | H.264 → HLS (360p, 720p) |
| Streaming | HLS manifest + segments via CDN |
| Thumbnail | Frame aos 2s; servido como WebP |
| Carregamento | Player sob demanda; preload=metadata |
| Adaptativo | HLS quality switching automático |
| Limite | Sem autoplay com som; muted autoplay opcional em feed |

### 12.5 Performance de API

| Técnica | Aplicação |
|---|---|
| Paginação cursor-based | Feeds, listagens, mensagens |
| Response compression | Gzip/Brotli em API |
| Connection pooling | PgBouncer (transaction mode, pool 20–50) |
| Query optimization | Índices (Doc 9); EXPLAIN ANALYZE no CI |
| Read replicas | Analytics/dashboard (futuro) |
| Timeout | 30s max por request; 5s target p95 |

### 12.6 Core Web Vitals — Alvos

| Métrica | Alvo (p75) | Crítico |
|---|---|---|
| LCP | < 2.5s | > 4.0s |
| INP | < 200ms | > 500ms |
| CLS | < 0.1 | > 0.25 |
| TTFB | < 300ms | > 800ms |
| FCP | < 1.5s | > 3.0s |

---

## 13. Banco de Dados — Operações

### 13.1 Otimização

| Técnica | Aplicação |
|---|---|
| Índices | Conforme Doc 9; revisão trimestral |
| Paginação | Cursor-based para feeds; offset apenas em admin |
| Connection pool | PgBouncer entre API e PostgreSQL |
| Query timeout | 10s statement timeout |
| EXPLAIN ANALYZE | CI valida queries novas > 50ms |
| Projeções | Read Models atualizados por eventos (não JOINs pesados) |
| Particionamento | `analytics_events` por mês (quando > 10M rows) |

### 13.2 Pool de Conexões

| Componente | Configuração |
|---|---|
| PgBouncer | Transaction mode; max 50 connections |
| Prisma (por instância API) | `connection_limit: 10` |
| Workers | `connection_limit: 5` |
| Total máximo | < 80% do max_connections do PG |

### 13.3 Replicação (Futuro)

| Fase | Configuração |
|---|---|
| Fase 1 | Single instance + PITR |
| Fase 2 | Read replica para analytics/dashboard |
| Fase 3 | Multi-region read replica |

### 13.4 Manutenção

| Tarefa | Frequência | Janela |
|---|---|---|
| VACUUM ANALYZE | Automático (autovacuum) | Contínuo |
| REINDEX | Trimestral | Madrugada |
| Estatísticas | Diário | Automático |
| Limpeza de dados | Conforme Doc 9 (jobs) | Automático |
| Migration | Por release | Pré-deploy |

---

## 14. Monitoramento e Observabilidade

### 14.1 Pilares

| Pilar | Ferramenta | Dados |
|---|---|---|
| **Erros** | Sentry | Exceptions, stack traces, breadcrumbs |
| **Métricas** | Prometheus + Grafana | Latência, throughput, recursos |
| **Logs** | Loki / CloudWatch | Logs estruturados JSON |
| **Traces** | OpenTelemetry (futuro) | Distributed tracing |
| **Uptime** | Health Monitor + UptimeRobot | Disponibilidade externa |
| **RUM** | Vercel Analytics / Sentry | Core Web Vitals reais |

### 14.2 Métricas de Aplicação

| Métrica | Tipo | Labels | Alerta |
|---|---|---|---|
| `http_request_duration_seconds` | Histogram | method, route, status, module | p95 > 500ms |
| `http_requests_total` | Counter | method, route, status | error rate > 1% |
| `db_query_duration_seconds` | Histogram | schema, operation | p95 > 100ms |
| `cache_hit_ratio` | Gauge | module, entity | < 80% |
| `queue_depth` | Gauge | queue_name | > 100 |
| `queue_job_duration_seconds` | Histogram | queue_name, status | p95 > timeout 80% |
| `event_processing_lag_seconds` | Gauge | event_type | > 30s |
| `active_sessions` | Gauge | surface | — |
| `media_processing_total` | Counter | type, status | failed > 5/h |

### 14.3 Métricas de Infraestrutura

| Métrica | Alerta |
|---|---|
| CPU utilization | > 80% por 10 min |
| Memory utilization | > 85% |
| Disk usage | > 80% |
| Network throughput | Anomalia (baseline) |
| PostgreSQL connections | > 80% max |
| Redis memory | > 80% max |
| S3 storage growth | > 20% mês |

### 14.4 Métricas de Usuário (RUM)

| Métrica | Fonte | Alvo |
|---|---|---|
| LCP, INP, CLS | Vercel Analytics | Conforme §12.6 |
| Page views | Analytics module | — |
| Error rate (client) | Sentry | < 0.5% |
| API error rate (client) | Sentry | < 1% |

### 14.5 Dashboards

| Dashboard | Conteúdo | Audiência |
|---|---|---|
| **Overview** | Uptime, error rate, p95 latency, active users | Admin |
| **API** | Requests/s, latency por rota, error breakdown | DevOps |
| **Database** | Query time, connections, slow queries | DevOps |
| **Queues** | Depth, processing time, DLQ | DevOps |
| **Media** | Uploads/h, processing time, failures | DevOps |
| **Cache** | Hit rate, memory, invalidations | DevOps |
| **Business** | Views, registrations, conversions | Admin/Analyst |

---

## 15. Logs

### 15.1 Padrão de Log Estruturado

Todo log em **JSON estruturado** com campos obrigatórios:

| Campo | Tipo | Descrição |
|---|---|---|
| `timestamp` | ISO 8601 | Momento do log |
| `level` | enum | debug, info, warn, error, fatal |
| `message` | string | Descrição legível |
| `module` | string | Módulo de origem |
| `correlationId` | UUID | Rastreio de request (X-Request-ID) |
| `userId` | UUID? | Se autenticado |
| `action` | string? | Ação executada |
| `duration_ms` | number? | Duração da operação |
| `metadata` | object? | Contexto adicional |

### 15.2 Categorias de Log

| Categoria | Nível | Exemplos | Retenção |
|---|---|---|---|
| **Técnico** | debug–error | Request, query, cache miss, job | 30 dias |
| **Segurança** | info–warn | Login, rate limit, auth failure | 90 dias |
| **Auditoria** | info | Ações admin, moderação, settings | 2 anos (banco) |
| **Negócio** | info | Eventos processados, métricas | 30 dias |

### 15.3 Separação

| Tipo | Destino | Acesso |
|---|---|---|
| Logs técnicos | Loki / CloudWatch | DevOps |
| Logs de segurança | Loki + alerta | DevOps + Admin |
| Auditoria | `platform.audit_entries` (PostgreSQL) | Admin (RBAC) |
| Logs de acesso | CDN/proxy logs | DevOps |

### 15.4 Regras

| ID | Regra |
|---|---|
| RN-LOG-001 | Nunca logar senhas, tokens, PII completa |
| RN-LOG-002 | IP mascarado em logs (hash parcial) |
| RN-LOG-003 | `correlationId` propagado em toda cadeia (API → worker → evento) |
| RN-LOG-004 | Nível `error` gera alerta automático |
| RN-LOG-005 | Logs de auditoria vão para banco, não para stdout |

### 15.5 Implementação

| Componente | Localização |
|---|---|
| Logger | `packages/shared-core/logger/` |
| Middleware | Correlation ID em todo request HTTP |
| Interceptor NestJS | Log de request/response (sem body sensível) |
| Worker | Log de início/fim/erro de cada job |

---

## 16. Alertas

### 16.1 Canais

| Canal | Uso | Destinatário |
|---|---|---|
| **Slack / Discord** | Alertas operacionais | Equipe DevOps |
| **Email** | Alertas críticos | On-call + admin |
| **Sentry** | Erros de aplicação | Dev |
| **Admin panel** | Alertas de negócio | Admin (via Health Monitor) |
| **PagerDuty (futuro)** | Incidentes críticos | On-call 24/7 |

### 16.2 Catálogo de Alertas

| Alerta | Condição | Severidade | Canal |
|---|---|---|---|
| API down | Health check falha 3× (1 min) | Critical | Slack + Email |
| Error rate spike | > 5% em 5 min | Critical | Sentry + Slack |
| High latency | p95 > 1s por 10 min | Warning | Slack |
| Database slow | Query p95 > 500ms | Warning | Slack |
| Queue backlog | Depth > 200 por 15 min | Warning | Slack |
| DLQ not empty | Qualquer job na DLQ | Critical | Slack + Email |
| Disk space | > 85% | Warning | Slack |
| Disk space | > 95% | Critical | Slack + Email |
| Media processing fail | > 10 falhas/h | Warning | Slack |
| Cache hit rate low | < 60% por 30 min | Warning | Slack |
| SSL expiry | < 14 dias | Warning | Email |
| Backup failed | Job de backup falhou | Critical | Slack + Email |
| Integration down | Meilisearch/Redis/S3 unreachable | Critical | Slack + Email |
| Storage growth anomaly | > 30% semana | Warning | Slack |

### 16.3 Severidade e SLA de Resposta

| Severidade | Resposta | Resolução |
|---|---|---|
| **Critical** | < 15 min | < 2 horas |
| **Warning** | < 1 hora | < 8 horas |
| **Info** | Próximo dia útil | Best effort |

### 16.4 HealthStatusChanged

O módulo Health Monitor consolida status e emite `HealthStatusChanged` quando qualquer serviço muda de estado (healthy → degraded → down).

---

## 17. Backup e Recuperação de Desastres

### 17.1 Estratégia de Backup

| Recurso | Método | Frequência | Retenção | Localização |
|---|---|---|---|---|
| PostgreSQL | Automated backup + WAL (PITR) | Contínuo (WAL) + diário (full) | 30 dias | Região primária + cópia |
| Redis | RDB snapshot | Diário | 7 dias | Região primária |
| S3/R2 | Versioning + cross-region replication | Contínuo | 90 dias (versions) | Multi-region |
| Meilisearch | Snapshot | Diário | 7 dias | Região primária |
| Configuração | Git (IaC + .env templates) | Contínuo | Indefinido | GitHub |
| Secrets | Secrets manager backup | Diário | 30 dias | Provider |

### 17.2 Recovery Objectives

| Métrica | Alvo | Descrição |
|---|---|---|
| **RPO** (Recovery Point Objective) | < 1 hora | Perda máxima de dados |
| **RTO** (Recovery Time Objective) | < 4 horas | Tempo para restaurar serviço |
| **RTO crítico** (API + DB) | < 2 horas | Caminho crítico |

### 17.3 Plano de Recuperação de Desastres

| Cenário | Procedimento | RTO |
|---|---|---|
| Falha de instância API | Auto-restart / scale new instance | < 5 min |
| Falha de banco (primary) | Failover para standby | < 30 min |
| Corrupção de dados | Restore PITR para ponto anterior | < 2 horas |
| Perda de região | Ativar região secundária (futuro) | < 4 horas |
| Perda de bucket S3 | Restore de replica/cross-region | < 2 horas |
| Comprometimento de secrets | Rotação emergencial + redeploy | < 1 hora |

### 17.4 Testes de Backup

| Teste | Frequência | Procedimento |
|---|---|---|
| Restore de banco | Mensal | Restaurar backup em ambiente isolado |
| PITR | Trimestral | Restaurar para ponto específico |
| Restore de mídia | Trimestral | Verificar integridade de amostra |
| DR drill completo | Semestral | Simular perda de região |
| Documentação | Após cada teste | Atualizar runbook |

### 17.5 Runbook

Localização: `docs/operacoes/RUNBOOK-RECUPERACAO.md` (a criar na implementação)

Conteúdo mínimo:
1. Contatos de emergência
2. Procedimento de failover de banco
3. Procedimento de restore PITR
4. Procedimento de rollback de deploy
5. Procedimento de rotação de secrets
6. Checklist pós-incidente

---

## 18. Segurança de Infraestrutura

### 18.1 Rede

| Controle | Implementação |
|---|---|
| Firewall | Apenas portas 80/443 públicas; resto em rede privada |
| WAF | Cloudflare OWASP + custom rules |
| DDoS | Cloudflare automatic mitigation |
| TLS | 1.3 obrigatório; HSTS com preload |
| IP allowlist | Admin API opcional por IP (configurável) |

### 18.2 Acesso

| Princípio | Implementação |
|---|---|
| Least privilege | IAM roles mínimas por serviço |
| Sem SSH em produção | Apenas via provider console/API |
| Bastion (futuro) | Para acesso a recursos privados |
| MFA | Obrigatório em todos os painéis de provider |
| RBAC | Conforme Doc 8 para aplicação |

### 18.3 Secrets

| Aspecto | Especificação |
|---|---|
| Armazenamento | Provider secrets manager / Doppler / Vault |
| Injeção | Environment variables em runtime |
| Proibido | Secrets em código, git, Docker image, logs |
| Rotação | Trimestral (JWT, DB, S3); imediata se comprometido |
| Separação | Secrets únicos por ambiente |

### 18.4 Criptografia

| Dado | Em trânsito | Em repouso |
|---|---|---|
| HTTP | TLS 1.3 | — |
| Database | TLS connection | AES-256 (provider) |
| Redis | TLS | AES-256 (provider) |
| S3 | HTTPS | AES-256 (server-side) |
| Backups | TLS | AES-256 |
| PII sensível | TLS | AES-256-GCM (aplicação) |

### 18.5 Proteção contra Ataques

| Ameaça | Mitigação |
|---|---|
| DDoS | Cloudflare + rate limiting |
| Brute force | Rate limit (Doc 8): 5 login/15min |
| SQL Injection | Prisma ORM; raw queries proibidas |
| XSS | CSP headers, sanitização, escape |
| CSRF | Token CSRF em formulários; SameSite cookies |
| File upload abuse | MIME validation, size limit, antivírus |
| Dependency vulnerabilities | `npm audit` no CI; Dependabot |
| Secret leakage | GitLeaks / trufflehog no CI |

### 18.6 Headers de Segurança

| Header | Valor |
|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `Content-Security-Policy` | Restritiva (scripts, styles, images) |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | Restringir camera, microphone, geolocation |

---

## 19. Escalabilidade e Balanceamento

### 19.1 Estratégia de Escala — Fases

| Fase | Usuários | Arquitetura | Trigger |
|---|---|---|---|
| **Fase 1** (lançamento) | < 10K | Monolith modular, 2 API instances | — |
| **Fase 2** (crescimento) | 10K–100K | + read replica, + workers, CDN otimizado | CPU > 70% |
| **Fase 3** (scale) | 100K–500K | + auto-scaling, + Redis cluster, partition analytics | Latência p95 > 500ms |
| **Fase 4** (microservices) | > 500K | Separar módulos críticos (media, analytics) | Equipe + complexidade |

### 19.2 Escalabilidade Horizontal

| Componente | Escalável | Método |
|---|---|---|
| API (NestJS) | ✅ | Mais instâncias atrás de load balancer |
| Workers | ✅ | Mais instâncias por fila |
| Next.js (web) | ✅ | Vercel auto-scale / edge |
| PostgreSQL | ⚠️ | Read replicas; write em single primary |
| Redis | ⚠️ | Redis Cluster (fase 3) |
| Meilisearch | ✅ | Réplicas de leitura |
| S3/R2 | ✅ | Ilimitado (provider) |

### 19.3 Load Balancer

| Aspecto | Fase 1 | Fase 2+ |
|---|---|---|
| Web | Vercel (built-in) | Vercel + Cloudflare |
| API | Provider LB (Railway/Fly) | ALB/NLB dedicado |
| Algoritmo | Round robin | Least connections |
| Health check | `GET /health` (5s interval) | Com circuit breaker |
| Sticky sessions | Não necessário (stateless JWT) | — |

### 19.4 Distribuição Geográfica (Futuro)

| Componente | Estratégia |
|---|---|
| CDN | Global (Cloudflare edge) |
| Web | Vercel edge functions |
| API | Multi-region (fase 4) |
| Database | Primary em São Paulo; read replica US/EU (fase 3) |
| S3 | Cross-region replication |

### 19.5 Preparação para Microsserviços

| Hoje (Monolith) | Futuro (Microsserviço) | Contrato mantido |
|---|---|---|
| `packages/modules/media/` | `media-service` container | `IMediaService` → REST/gRPC |
| `packages/modules/analytics/` | `analytics-service` | Eventos + API |
| PostgreSQL shared | DB por serviço | UUIDs + eventos |
| BullMQ shared | Fila por serviço | Eventos |
| Redis shared | Redis por serviço (ou cluster) | — |

**Regra:** Nenhuma decisão de infra na v1 deve impedir esta separação.

---

## 20. Health Monitor

### 20.1 Módulo

| Aspecto | Especificação |
|---|---|
| Localização | `packages/modules/health-monitor/` |
| Interface | `IHealthMonitorService` |
| Permissão | `health:read` (admin, analyst) |
| UI | `/admin/saude` (Doc 4) |

### 20.2 Health Checks

| Serviço | Endpoint/Método | Intervalo | Timeout |
|---|---|---|---|
| API | `GET /health` | 30s | 5s |
| PostgreSQL | `SELECT 1` via Prisma | 60s | 5s |
| Redis | `PING` | 30s | 3s |
| Meilisearch | `GET /health` | 60s | 5s |
| S3/R2 | Head bucket | 120s | 10s |
| BullMQ | Queue stats (depth, active) | 60s | 5s |
| CDN | HTTP HEAD para asset conhecido | 120s | 10s |

### 20.3 Resposta `/health`

| Campo | Tipo | Descrição |
|---|---|---|
| `status` | enum | `healthy`, `degraded`, `down` |
| `version` | string | Versão deployada |
| `uptime` | number | Segundos desde start |
| `checks` | array | Status individual de cada serviço |
| `timestamp` | ISO 8601 | Momento da verificação |

**Lógica:**
- `healthy`: todos os checks passam
- `degraded`: serviço não-crítico falha (Meilisearch, CDN)
- `down`: serviço crítico falha (PostgreSQL, Redis, API)

### 20.4 Painel Administrativo (`/admin/saude`)

| Seção | Conteúdo |
|---|---|
| **Status geral** | Indicador verde/amarelo/vermelho + uptime |
| **Serviços** | Tabela: serviço, status, latência, último check |
| **Erros recentes** | Últimos 24h (Sentry integration) |
| **Filas** | Depth, processing rate, DLQ count |
| **Performance** | API p95, DB p95, cache hit rate |
| **Alertas ativos** | Lista de alertas não resolvidos |
| **Histórico** | Gráfico de uptime (7d, 30d) |

### 20.5 Eventos do Health Monitor

| Evento | Quando | Payload |
|---|---|---|
| `HealthStatusChanged` | Status muda (healthy→degraded→down) | `{ previousStatus, currentStatus, failedChecks }` |
| `ServiceFailed` | Serviço individual falha 3× consecutivas | `{ service, error, since }` |
| `ServiceRecovered` | Serviço volta após falha | `{ service, downtime_seconds }` |

---

## 21. Custos e Otimização

### 21.1 Princípios

| Princípio | Aplicação |
|---|---|
| Pay for what you use | Serverless/managed onde possível |
| Right-sizing | Monitorar e ajustar specs trimestralmente |
| Lifecycle policies | S3 tiering automático |
| Cache agressivo | Reduzir compute e DB |
| Reserved capacity | Apenas quando uso estável (fase 2+) |

### 21.2 Estimativa de Custos — Fase 1

| Serviço | Estimativa mensal (USD) |
|---|---|
| Vercel (Pro) | $20 |
| API hosting (2 instances) | $40–80 |
| PostgreSQL (managed) | $30–50 |
| Redis (managed) | $10–20 |
| Meilisearch Cloud | $30 |
| Cloudflare (Pro) | $20 |
| R2 storage (100GB) | $1–5 |
| Sentry | $26 |
| Email (Resend) | $0–20 |
| **Total estimado** | **$180–270/mês** |

### 21.3 Otimizações

| Área | Ação | Economia estimada |
|---|---|---|
| S3 lifecycle | Mover originals > 90d para Infrequent Access | -40% storage |
| CDN cache | Aumentar TTL de variantes de mídia | -30% origin requests |
| DB queries | Cache + projeções | -50% DB compute |
| Workers | Scale to zero em filas vazias | -20% worker compute |
| Images | Servir WebP/AVIF (menor tamanho) | -60% bandwidth |
| Logs | Retenção 30d (não indefinido) | -50% log storage |

### 21.4 Monitoramento de Custos

| Ferramenta | Dados |
|---|---|
| Provider dashboards | Custo por serviço |
| S3 metrics | Storage growth, requests |
| Alerta | Custo mensal > 150% do baseline |

---

## 22. Preparação Mobile

### 22.1 Requisitos de Infraestrutura

| Requisito | Especificação |
|---|---|
| API REST | NestJS expõe endpoints versionados (`/api/v1/`) |
| Autenticação | JWT (access + refresh) compartilhado com web |
| Push notifications | FCM (Android) + APNs (iOS) — fila `notifications.push` |
| Upload de mídia | Presigned URLs do S3 (upload direto do device) |
| Offline | Dados públicos cacheáveis; sync on reconnect |
| Rate limiting | Mesmos limites do web (por IP/device) |

### 22.2 API Versioning

| Versão | Status | Notas |
|---|---|---|
| `v1` | Ativa | Lançamento web + mobile |
| `v2` | Futuro | Breaking changes |

**Regra:** Mobile consome `v1`; breaking changes exigem nova versão, nunca alteração in-place.

### 22.3 Endpoints Críticos para Mobile

| Endpoint | Método | Módulo |
|---|---|---|
| `/api/v1/auth/login` | POST | Authentication |
| `/api/v1/auth/refresh` | POST | Authentication |
| `/api/v1/profiles` | GET | Profiles |
| `/api/v1/profiles/:slug` | GET | Profiles |
| `/api/v1/search` | GET | Search |
| `/api/v1/moments` | GET | Moments |
| `/api/v1/videos` | GET | Video Gallery |
| `/api/v1/rankings` | GET | Rankings |
| `/api/v1/media/upload/presign` | POST | Media |
| `/api/v1/notifications` | GET | Notifications |

### 22.4 Infra Adicional para Mobile (Futuro)

| Componente | Quando | Provider |
|---|---|---|
| FCM | App Android | Firebase |
| APNs | App iOS | Apple Developer |
| Deep linking | Lançamento mobile | Branch.io ou nativo |
| App analytics | Lançamento mobile | Firebase Analytics / Mixpanel |

---

## 23. Eventos Operacionais

### 23.1 Catálogo

| Evento | Módulo emissor | Quando | Payload | Consumidores |
|---|---|---|---|---|
| `DeploymentCompleted` | CI/CD (infra) | Deploy bem-sucedido | `{ version, environment, deployer, duration_ms }` | Audit, Notifications (admin) |
| `DeploymentFailed` | CI/CD | Deploy falhou | `{ version, environment, error, stage }` | Alertas, Audit |
| `ServiceFailed` | Health Monitor | Serviço falha 3× | `{ service, error, since }` | Alertas, Notifications (admin) |
| `ServiceRecovered` | Health Monitor | Serviço restaurado | `{ service, downtime_seconds }` | Audit, Notifications |
| `BackupCompleted` | Infra (job) | Backup bem-sucedido | `{ resource, size_bytes, duration_ms }` | Audit |
| `BackupFailed` | Infra (job) | Backup falhou | `{ resource, error }` | Alertas, Audit |
| `CacheInvalidated` | Cache | Invalidação executada | `{ pattern, keys_count, trigger_event }` | Audit (debug) |
| `HealthStatusChanged` | Health Monitor | Status geral muda | `{ previous, current, failed_checks }` | Notifications (admin), Audit |
| `StorageThresholdReached` | Infra (monitor) | Storage > 80% | `{ resource, percentage, size_bytes }` | Alertas |
| `ScalingEvent` | Infra (auto-scale) | Instância adicionada/removida | `{ service, action, instances_count }` | Audit |

### 23.2 Integração com Audit

Todos os eventos operacionais geram entrada em `platform.audit_entries` com `resource_type: infrastructure`.

---

## 24. Critérios de Aceitação

### 24.1 Ambientes e Deploy

| ID | Critério | Prioridade |
|---|---|---|
| CA-INF-01 | 3 ambientes definidos: dev, staging, production | Must |
| CA-INF-02 | Docker Compose funcional para desenvolvimento local | Must |
| CA-INF-03 | Pipeline CI/CD com lint, test, build, deploy | Must |
| CA-INF-04 | Deploy staging automático ao merge em develop | Must |
| CA-INF-05 | Deploy production com aprovação manual | Must |
| CA-INF-06 | Rollback < 5 minutos documentado e testado | Must |
| CA-INF-07 | Versionamento semântico com tags | Must |

### 24.2 Hospedagem e Serviços

| ID | Critério | Prioridade |
|---|---|---|
| CA-INF-10 | Todos os serviços do Doc 1 provisionados | Must |
| CA-INF-11 | CDN ativo para mídia e assets em staging/production | Must |
| CA-INF-12 | Object storage com paths padronizados | Must |
| CA-INF-13 | Secrets em manager, nunca em código | Must |
| CA-INF-14 | TLS 1.3 em todas as comunicações externas | Must |

### 24.3 Processamento e Cache

| ID | Critério | Prioridade |
|---|---|---|
| CA-INF-20 | BullMQ com filas por domínio | Must |
| CA-INF-21 | Workers para transcode, imagem, email, rankings | Must |
| CA-INF-22 | DLQ com alerta automático | Must |
| CA-INF-23 | Cache Redis com invalidação por eventos | Must |
| CA-INF-24 | CDN purge integrado com eventos de mídia | Must |

### 24.4 Performance

| ID | Critério | Prioridade |
|---|---|---|
| CA-INF-30 | First Load JS < 200KB (CI budget) | Must |
| CA-INF-31 | LCP < 2.5s (lab) | Must |
| CA-INF-32 | API p95 < 500ms | Must |
| CA-INF-33 | Imagens em WebP/AVIF com variantes responsivas | Must |
| CA-INF-34 | Vídeos em HLS com adaptive streaming | Must |
| CA-INF-35 | PgBouncer configurado entre API e PostgreSQL | Must |

### 24.5 Monitoramento e Logs

| ID | Critério | Prioridade |
|---|---|---|
| CA-INF-40 | Sentry configurado em staging e production | Must |
| CA-INF-41 | Logs estruturados JSON com correlationId | Must |
| CA-INF-42 | Métricas de aplicação e infraestrutura | Must |
| CA-INF-43 | Alertas críticos configurados (§16.2) | Must |
| CA-INF-44 | Dashboards Grafana para DevOps | Should |
| CA-INF-45 | Core Web Vitals monitorados (RUM) | Should |

### 24.6 Backup e Segurança

| ID | Critério | Prioridade |
|---|---|---|
| CA-INF-50 | Backup diário PostgreSQL + PITR | Must |
| CA-INF-51 | RPO < 1h e RTO < 4h documentados | Must |
| CA-INF-52 | Teste de restore mensal | Must |
| CA-INF-53 | WAF ativo em production | Must |
| CA-INF-54 | Headers de segurança configurados | Must |
| CA-INF-55 | Rotação de secrets trimestral | Should |

### 24.7 Health Monitor

| ID | Critério | Prioridade |
|---|---|---|
| CA-INF-60 | Endpoint `/health` com checks de todos os serviços | Must |
| CA-INF-61 | Painel `/admin/saude` funcional | Must |
| CA-INF-62 | Eventos HealthStatusChanged e ServiceFailed | Must |
| CA-INF-63 | Health check usado pelo load balancer | Must |

### 24.8 Escalabilidade e Mobile

| ID | Critério | Prioridade |
|---|---|---|
| CA-INF-70 | API stateless, escalável horizontalmente | Must |
| CA-INF-71 | Workers escaláveis independentemente | Must |
| CA-INF-72 | API versionada (`/api/v1/`) | Must |
| CA-INF-73 | Presigned URLs para upload mobile | Should |
| CA-INF-74 | Preparação para separação em microsserviços | Should |

### 24.9 Governança

| ID | Critério | Prioridade |
|---|---|---|
| CA-INF-80 | Infra versionada em `infrastructure/` | Must |
| CA-INF-81 | Runbook de recuperação documentado | Must |
| CA-INF-82 | Branch strategy conforme §4.1 | Must |
| CA-INF-83 | Code review obrigatório (1+ aprovação) | Must |
| CA-INF-84 | Nenhum acoplamento de infra entre módulos | Must |

---

## Apêndice A — Estrutura `infrastructure/`

```
infrastructure/
├── docker/
│   ├── docker-compose.yml          # Dev: PG, Redis, Meili, MinIO, Mailhog
│   ├── docker-compose.test.yml     # CI: Testcontainers config
│   └── Dockerfile.api              # Multi-stage API image
├── terraform/                      # (futuro) IaC para cloud
│   ├── environments/
│   │   ├── staging/
│   │   └── production/
│   └── modules/
│       ├── database/
│       ├── redis/
│       ├── storage/
│       └── networking/
├── k8s/                            # (futuro) Kubernetes manifests
├── scripts/
│   ├── backup-verify.sh
│   ├── seed-dev.sh
│   └── rotate-secrets.sh
└── monitoring/
    ├── grafana-dashboards/
    ├── alertmanager-rules.yml
    └── prometheus.yml
```

---

## Apêndice B — Referências Cruzadas

| Documento | Relação |
|---|---|
| [Documento 1 — Arquitetura](../arquitetura/DOCUMENTO-01-ARQUITETURA-DA-PLATAFORMA.md) | §9 Performance, stack, health-monitor |
| [Documento 4 — Admin](./DOCUMENTO-04-AREA-ADMINISTRATIVA.md) | `/admin/saude`, permissão `health:read` |
| [Documento 6 — Mídia](./DOCUMENTO-06-CONTEUDO-MIDIA-E-INTERACOES.md) | Upload, transcode, CDN, antivírus |
| [Documento 8 — Auth](./DOCUMENTO-08-AUTENTICACAO-USUARIOS-PERMISSOES-E-SEGURANCA.md) | Rate limiting, sessões Redis, RBAC |
| [Documento 9 — Banco](./DOCUMENTO-09-BANCO-DE-DADOS-MODELAGEM-E-ESTRUTURA-DE-DADOS.md) | Cache keys, backup, PITR, pool |
| [Documento 10 — Design System](./DOCUMENTO-10-DESIGN-SYSTEM-UX-UI-E-IDENTIDADE-VISUAL.md) | Performance front-end, bundle budget |

---

> **Este documento é a especificação oficial de infraestrutura, DevOps, performance e escalabilidade da plataforma.**  
> Toda decisão de hospedagem, deploy e operação deve seguir estas definições.  
> Desvios exigem atualização formal deste documento e validação contra o Documento 1.
