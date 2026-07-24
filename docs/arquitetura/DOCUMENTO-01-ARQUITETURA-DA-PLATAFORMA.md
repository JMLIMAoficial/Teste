# Documento 1 — Arquitetura da Plataforma

**Versão:** 1.0.0  
**Status:** Referência Oficial  
**Última atualização:** 2026-07-08  
**Escopo:** Base técnica obrigatória para todo o desenvolvimento da plataforma

---

## Sumário

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Princípios Arquiteturais](#2-princípios-arquiteturais)
3. [Estrutura de Pastas](#3-estrutura-de-pastas)
4. [Definição dos Módulos](#4-definição-dos-módulos)
5. [Comunicação Entre Módulos](#5-comunicação-entre-módulos)
6. [Estratégia de Banco de Dados](#6-estratégia-de-banco-de-dados)
7. [Estratégia de Eventos](#7-estratégia-de-eventos)
8. [Estratégia de Segurança](#8-estratégia-de-segurança)
9. [Estratégia de Performance](#9-estratégia-de-performance)
10. [Regras Obrigatórias para Desenvolvimento Futuro](#10-regras-obrigatórias-para-desenvolvimento-futuro)

---

## 1. Visão Geral da Arquitetura

### 1.1 Contexto

A plataforma é um **catálogo web premium** com três superfícies principais:

| Superfície | Público | Objetivo |
|---|---|---|
| **Área Pública** | Visitantes | Descoberta, busca, visualização de perfis e conteúdo |
| **Área Autenticada** | Acompanhantes | Gestão de perfil, mídia, métricas e interações |
| **Área Administrativa** | Operadores / Moderadores | Moderação, configuração, analytics e governança |

### 1.2 Padrão Arquitetural

A plataforma adota um **Modular Monolith** como ponto de partida, estruturado para evolução futura em microsserviços sem reescrita.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CAMADA DE APRESENTAÇÃO                      │
│   Área Pública  │  Área Acompanhante  │  Área Admin  │  API/BFF   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                      CAMADA DE APLICAÇÃO (MÓDULOS)                  │
│  Auth │ Users │ Profiles │ Media │ Reviews │ Search │ HotScore │ …  │
│         Cada módulo expõe apenas interfaces e serviços públicos     │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
┌─────────▼─────────┐ ┌────────▼────────┐ ┌────────▼────────┐
│   EVENT BUS       │ │  CONFIG STORE   │ │  SHARED CORE    │
│  (Pub/Sub interno)│ │  (Settings)     │ │  (Infra comum)  │
└─────────┬─────────┘ └────────┬────────┘ └────────┬────────┘
          │                    │                    │
┌─────────▼────────────────────▼────────────────────▼─────────────────┐
│                    CAMADA DE PERSISTÊNCIA                           │
│   PostgreSQL (schemas por domínio)  │  Redis  │  Object Storage    │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Stack Tecnológica Recomendada

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Linguagem | **TypeScript** (strict) | Tipagem forte, contratos explícitos entre módulos |
| Monorepo | **pnpm workspaces + Turborepo** | Isolamento de módulos, builds incrementais |
| Frontend | **Next.js 15+ (App Router)** | SSR/SSG, code splitting nativo, SEO |
| Backend API | **NestJS** (módulos por domínio) | DI nativo, guards, interceptors, modularidade |
| ORM | **Prisma** (multi-schema) | Migrações versionadas, type-safety |
| Banco principal | **PostgreSQL 16+** | ACID, JSONB, full-text search, schemas |
| Cache / Pub-Sub | **Redis 7+** | Cache, rate limiting, filas leves |
| Busca | **Meilisearch** (ou Elasticsearch) | Busca avançada desacoplada |
| Filas assíncronas | **BullMQ** | Processamento de eventos, jobs pesados |
| Mídia | **S3-compatible** (R2, MinIO, AWS) | Upload, CDN, transformação |
| Observabilidade | **OpenTelemetry + Sentry + Prometheus** | Logs, traces, métricas, erros |
| Validação | **Zod** | Schemas compartilhados front/back |
| Testes | **Vitest + Playwright** | Unit, integration, E2E |

> **Nota:** A stack pode ser ajustada por módulo na evolução para microsserviços. Os **contratos de interface e eventos** são imutáveis; apenas a implementação muda.

### 1.4 Fluxo de Requisição Padrão

```
Cliente → CDN/Edge → Next.js (SSR/CSR)
                         │
                         ▼
                    API Gateway / BFF
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         Module A    Module B    Module C
              │          │          │
              └──────────┼──────────┘
                         ▼
                   Event Bus (async)
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
         HotScore   Analytics  Notifications
```

---

## 2. Princípios Arquiteturais

### 2.1 Princípio Fundamental

> **Nenhuma funcionalidade é um bloco único.** Cada recurso possui responsabilidade única e opera como módulo independente.

### 2.2 Princípios Obrigatórios

| Princípio | Aplicação na Plataforma |
|---|---|
| **Single Responsibility** | Um módulo = um domínio de negócio |
| **Open/Closed** | Extensível via eventos e interfaces; fechado para modificação interna cruzada |
| **Liskov Substitution** | Implementações de interfaces são intercambiáveis (ex.: trocar Redis por RabbitMQ no Event Bus) |
| **Interface Segregation** | Interfaces pequenas e específicas por caso de uso |
| **Dependency Inversion** | Módulos dependem de abstrações, nunca de implementações concretas de outros módulos |
| **DRY** | Lógica compartilhada apenas em `shared-core`; nunca duplicar regras de negócio |
| **KISS** | Soluções simples; complexidade apenas onde o domínio exige |
| **Separation of Concerns** | UI, aplicação, domínio e infraestrutura em camadas distintas |
| **Event-Driven** | Comunicação assíncrona entre módulos via eventos de domínio |
| **Configuration over Code** | Regras variáveis administráveis via módulo Settings |

### 2.3 Anti-Padrões Proibidos

| Anti-padrão | Por que é proibido |
|---|---|
| Import direto de repository de outro módulo | Viola isolamento de domínio |
| JOIN cross-schema em query de outro módulo | Acoplamento de dados |
| Regra de negócio em componente React | Impossibilita reutilização e testes |
| Arquivo com mais de 300 linhas | Indica violação de SRP |
| Função com mais de 30 linhas | Dificulta leitura e testes |
| Constantes mágicas no código | Devem estar em Settings ou constants |
| Chamada síncrona entre módulos para efeitos colaterais | Deve usar eventos |
| Estado global mutável compartilhado | Usar eventos ou cache com TTL |

---

## 3. Estrutura de Pastas

### 3.1 Estrutura do Monorepo

```
acompannhante/
├── apps/
│   ├── web/                          # Next.js — frontend público + autenticado
│   │   ├── app/
│   │   │   ├── (public)/             # Rotas públicas
│   │   │   ├── (companion)/          # Rotas da acompanhante
│   │   │   ├── (admin)/              # Rotas administrativas
│   │   │   └── api/                  # BFF / route handlers leves
│   │   ├── components/               # Componentes globais de UI
│   │   └── lib/                      # Utilitários exclusivos do web
│   │
│   └── api/                          # NestJS — backend modular
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   └── modules/              # Importa packages/modules/*
│       └── test/
│
├── packages/
│   ├── modules/                      # ★ DOMÍNIOS DE NEGÓCIO
│   │   ├── authentication/
│   │   ├── users/
│   │   ├── profiles/
│   │   ├── media/
│   │   ├── photos/
│   │   ├── videos/
│   │   ├── comments/
│   │   ├── reviews/
│   │   ├── notifications/
│   │   ├── analytics/
│   │   ├── hot-score/
│   │   ├── search/
│   │   ├── tags/
│   │   ├── verification/
│   │   ├── messaging/
│   │   ├── moments/
│   │   ├── video-gallery/
│   │   ├── rankings/
│   │   ├── moderation/
│   │   ├── reports/
│   │   ├── audit/
│   │   ├── cms/
│   │   ├── seo/
│   │   ├── settings/
│   │   ├── dashboard/
│   │   ├── geo-location/
│   │   ├── cache/
│   │   └── health-monitor/
│   │
│   ├── shared-core/                  # Infraestrutura compartilhada
│   │   ├── event-bus/
│   │   ├── database/
│   │   ├── logger/
│   │   ├── errors/
│   │   ├── pagination/
│   │   ├── validation/
│   │   ├── auth-guards/
│   │   ├── rate-limiter/
│   │   └── types/
│   │
│   ├── ui/                           # Design system compartilhado
│   │   ├── components/
│   │   ├── tokens/
│   │   └── hooks/
│   │
│   └── config/                       # ESLint, TSConfig, Prettier compartilhados
│       ├── eslint/
│       ├── typescript/
│       └── tailwind/
│
├── infrastructure/
│   ├── docker/
│   ├── terraform/                    # IaC (futuro)
│   └── k8s/                          # Orquestração (futuro)
│
├── docs/
│   ├── arquitetura/                  # Este documento e derivados
│   ├── modulos/                      # Spec por módulo
│   ├── api/                          # Contratos OpenAPI
│   └── eventos/                      # Catálogo de eventos
│
├── prisma/
│   ├── schema/                       # Schemas por domínio
│   │   ├── authentication.prisma
│   │   ├── users.prisma
│   │   ├── profiles.prisma
│   │   └── ...
│   └── migrations/
│
├── scripts/
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### 3.2 Estrutura Interna Padrão de Cada Módulo

Todo módulo em `packages/modules/<module-name>/` **deve** seguir esta estrutura:

```
<module-name>/
├── index.ts                  # Barrel export — APENAS API pública
├── module.ts                 # Registro NestJS (providers, controllers)
│
├── interfaces/               # Contratos públicos (IProfileService, etc.)
│   └── IProfileService.ts
│
├── services/                 # Lógica de aplicação / casos de uso
│   └── ProfileService.ts
│
├── repositories/             # Acesso a dados (APENAS deste domínio)
│   └── ProfileRepository.ts
│
├── events/                   # Eventos emitidos e handlers internos
│   ├── emitters/
│   │   └── ProfileApproved.event.ts
│   └── handlers/
│       └── on-profile-created.handler.ts
│
├── schemas/                  # Schemas Zod (input/output)
│   └── profile.schema.ts
│
├── validators/               # Regras de validação de domínio
│   └── profile.validator.ts
│
├── types/                    # Tipos TypeScript do domínio
│   └── profile.types.ts
│
├── constants/                # Constantes imutáveis do domínio
│   └── profile.constants.ts
│
├── configs/                  # Configuração padrão do módulo
│   └── profile.config.ts
│
├── components/               # Componentes React (se aplicável ao módulo)
│   └── ProfileCard.tsx
│
├── pages/                    # Páginas Next.js (se aplicável)
│   └── ProfilePage.tsx
│
├── hooks/                    # React hooks do módulo
│   └── useProfile.ts
│
└── tests/
    ├── unit/
    ├── integration/
    └── fixtures/
```

### 3.3 Regras da Estrutura de Pastas

1. **`index.ts` é a única porta de entrada** — outros módulos importam somente deste arquivo.
2. **`interfaces/` define o contrato** — implementações ficam em `services/`.
3. **`repositories/` nunca são exportados** — acesso a dados é interno ao módulo.
4. **`events/` separa emissão de reação** — emitters são públicos; handlers podem ser internos ou cross-module via registro no Event Bus.
5. **`components/` e `pages/`** existem apenas em módulos que possuem UI própria.
6. **Nenhum arquivo fora da estrutura padrão** sem aprovação arquitetural documentada.

---

## 4. Definição dos Módulos

### 4.1 Mapa de Módulos e Responsabilidades

#### Núcleo de Identidade

| Módulo | Responsabilidade | Entidades Principais |
|---|---|---|
| **Authentication** | Login, logout, sessões, tokens, OAuth, 2FA | Session, Token, Credential |
| **Users** | Conta de usuário, papéis, status, preferências | User, Role, UserPreference |
| **Verification** | Verificação de identidade, documentos, badges | VerificationRequest, Badge |
| **Profiles** | Perfil público da acompanhante, bio, disponibilidade | Profile, ProfileStatus, Availability |

#### Conteúdo e Mídia

| Módulo | Responsabilidade | Entidades Principais |
|---|---|---|
| **Media** | Orquestração de uploads, storage, CDN, transformação | MediaAsset, UploadJob |
| **Photos** | Galeria de fotos, ordenação, capa, moderação visual | Photo, PhotoAlbum |
| **Videos** | Vídeos de perfil, transcodificação, thumbnails | Video, VideoTranscode |
| **Video Gallery** | Coleções de vídeo, playlists públicas | VideoCollection |
| **Moments** | Conteúdo efêmero / stories com expiração | Moment, MomentView |
| **CMS** | Páginas estáticas, banners, conteúdo editorial | Page, Banner, Article |
| **Tags** | Taxonomia, categorias, filtros, SEO tags | Tag, TagCategory |

#### Interação e Engajamento

| Módulo | Responsabilidade | Entidades Principais |
|---|---|---|
| **Comments** | Comentários em perfis/conteúdo, threads | Comment, CommentThread |
| **Reviews** | Avaliações estruturadas com critérios | Review, ReviewCriteria |
| **Messaging** | Mensagens internas (futuro), templates | Message, Conversation |
| **Notifications** | Push, email, in-app, preferências de alerta | Notification, NotificationPreference |

#### Descoberta e Ranking

| Módulo | Responsabilidade | Entidades Principais |
|---|---|---|
| **Search** | Indexação, filtros avançados, autocomplete | SearchIndex, SearchQuery |
| **Hot Score** | Cálculo de popularidade, pesos dinâmicos | HotScore, ScoreFactor |
| **Rankings** | Listas ranqueadas, destaques, trending | Ranking, RankingEntry |
| **Geo Location** | Geolocalização, proximidade, regiões | Location, Region |

#### Governança e Operações

| Módulo | Responsabilidade | Entidades Principais |
|---|---|---|
| **Moderation** | Fila de moderação, aprovação, rejeição | ModerationQueue, ModerationAction |
| **Reports** | Denúncias de usuários, triagem | Report, ReportReason |
| **Audit** | Trilha de auditoria imutável | AuditLog, AuditEntry |
| **Settings** | Configurações dinâmicas administráveis | Setting, SettingGroup |
| **Dashboard** | Agregação de KPIs para admin e acompanhante | DashboardWidget, Metric |

#### Infraestrutura de Plataforma

| Módulo | Responsabilidade | Entidades Principais |
|---|---|---|
| **Analytics** | Tracking de eventos, funis, relatórios | AnalyticsEvent, Funnel |
| **SEO** | Meta tags, sitemap, structured data, canonical | SeoMeta, SitemapEntry |
| **Cache** | Estratégias de cache, invalidação, warming | CacheKey, CachePolicy |
| **Health Monitor** | Health checks, uptime, alertas de sistema | HealthCheck, SystemAlert |
| **Shared Core** | Utilitários transversais sem regra de negócio | — |

### 4.2 Matriz de Dependências Permitidas

Módulos só podem depender de módulos listados como permitidos. Dependência = importar interface pública ou reagir a evento.

```
Authentication ──► Users
Users ──► Profiles, Settings
Profiles ──► Media, Photos, Videos, Tags, GeoLocation, SEO
Media ──► Photos, Videos, Moments
Comments ──► Profiles (via evento)
Reviews ──► Profiles (via evento)
HotScore ──► Analytics, Settings (via eventos)
Search ──► Profiles, Tags, GeoLocation (via indexação)
Moderation ──► Comments, Photos, Videos, Profiles, Reports
Notifications ──► Users (via evento)
Analytics ──► (reativo — sem dependência upstream)
Dashboard ──► Analytics, HotScore, Rankings (via leitura)
Audit ──► (reativo — escuta todos os eventos críticos)
```

> **Regra:** Se uma dependência não está na matriz, deve ser mediada por **evento**, nunca por import direto.

### 4.3 Superfícies por Módulo

| Módulo | Público | Acompanhante | Admin |
|---|---|---|---|
| Profiles | Leitura | CRUD | Moderação |
| Photos / Videos | Leitura | Upload/Gestão | Moderação |
| Comments | Leitura (aprovados) | — | Moderação |
| Reviews | Leitura | Visualização | Moderação |
| Search | Busca | — | Config |
| Hot Score / Rankings | Visualização | Métricas próprias | Config pesos |
| Dashboard | — | Métricas próprias | KPIs globais |
| Settings | Aparência pública | Preferências | Config global |
| Notifications | — | Inbox | Templates |
| CMS | Leitura | — | CRUD |
| Moderation / Reports | Denúncia | — | Gestão completa |
| Analytics | — | Métricas próprias | Relatórios |

---

## 5. Comunicação Entre Módulos

### 5.1 Canais de Comunicação

| Canal | Quando Usar | Síncrono/Assíncrono |
|---|---|---|
| **Interface pública** (`interfaces/`) | Consulta que precisa de resposta imediata | Síncrono |
| **Service público** | Operação dentro do domínio solicitado por outro módulo | Síncrono |
| **Evento de domínio** | Efeito colateral, desacoplamento, reação em cadeia | Assíncrono |
| **Contrato API (REST/GraphQL)** | Comunicação front ↔ back | Síncrono |
| **Query de leitura (Read Model)** | Dados agregados para dashboard/search | Síncrono (cache) |

### 5.2 Regras de Comunicação

```
┌──────────┐                              ┌──────────┐
│ Comments │ ──── CommentApproved ────────► │ Event Bus│
└──────────┘         (evento)              └────┬─────┘
                                                │
                     ┌──────────────────────────┼──────────────────┐
                     ▼                          ▼                  ▼
              ┌──────────┐              ┌──────────────┐   ┌───────────┐
              │ HotScore │              │ Notifications│   │ Analytics │
              │ (handler)│              │   (handler)  │   │  (handler)│
              └──────────┘              └──────────────┘   └───────────┘
```

**Regras absolutas:**

1. **Proibido** importar `services/`, `repositories/` ou `types/` internos de outro módulo.
2. **Permitido** importar apenas de `packages/modules/<x>/index.ts`.
3. **Efeitos colaterais** sempre via eventos — nunca via chamada direta pós-ação.
4. **Falha em handler de evento** não deve reverter a ação original (eventual consistency).
5. **Idempotência** obrigatória em todos os event handlers.
6. **Dead Letter Queue (DLQ)** para eventos que falham após N retentativas.

### 5.3 Contrato de Interface Pública

Todo serviço público deve seguir este padrão:

```typescript
// packages/modules/profiles/interfaces/IProfileService.ts

export interface IProfileService {
  getById(id: string): Promise<ProfileDTO | null>;
  getBySlug(slug: string): Promise<ProfilePublicDTO | null>;
  getByUserId(userId: string): Promise<ProfileDTO | null>;
}

// packages/modules/profiles/index.ts
export type { IProfileService } from './interfaces/IProfileService';
export { ProfileService } from './services/ProfileService';
export { ProfileApprovedEvent } from './events/emitters/ProfileApproved.event';
// NUNCA exportar ProfileRepository
```

### 5.4 Event Bus — Implementação

| Aspecto | Decisão |
|---|---|
| Transporte interno | Redis Pub/Sub ou BullMQ |
| Serialização | JSON com schema Zod |
| Naming | `<Domain><Action>` em PascalCase (ex.: `CommentApproved`) |
| Versionamento | Campo `version` no payload; handlers suportam N e N-1 |
| Ordenação | Não garantida; handlers devem ser order-independent |
| Retry | 3 tentativas com backoff exponencial |
| Monitoramento | Cada evento gera métrica `event.{name}.{status}` |

---

## 6. Estratégia de Banco de Dados

### 6.1 Modelo de Ownership

Cada módulo é **dono exclusivo** de suas tabelas. Nenhum outro módulo acessa diretamente.

```
PostgreSQL
├── schema: auth          → Authentication
├── schema: users         → Users
├── schema: profiles      → Profiles
├── schema: media         → Media, Photos, Videos
├── schema: engagement    → Comments, Reviews
├── schema: platform      → Notifications, Settings, Audit
├── schema: analytics     → Analytics, HotScore, Rankings
└── schema: cms           → CMS, SEO, Tags
```

### 6.2 Regras de Acesso a Dados

| Regra | Descrição |
|---|---|
| **Repository Pattern** | Toda query SQL/ORM fica encapsulada em `repositories/` |
| **Sem cross-schema JOIN** | Módulos não fazem JOIN entre schemas de outros domínios |
| **IDs como contrato** | Módulos se referenciam por ID (UUID), nunca por FK cross-schema |
| **Read Models** | Dados agregados (search, dashboard) usam tabelas de projeção atualizadas por eventos |
| **Soft Delete** | Entidades de negócio usam `deleted_at`; nunca DELETE físico em produção |
| **Timestamps** | Toda tabela possui `created_at`, `updated_at` |
| **Auditoria** | Tabelas críticas possuem `created_by`, `updated_by` |

### 6.3 Migrações

```
prisma/
├── schema/
│   ├── base.prisma           # Generator, datasource
│   ├── auth.prisma
│   ├── profiles.prisma
│   └── ...
└── migrations/
    ├── 20260708_auth_init/
    ├── 20260708_profiles_init/
    └── ...
```

**Regras de migração:**

1. Migrações são **imutáveis** — nunca editar uma migração já aplicada.
2. Toda migração possui **rollback documentado** (mesmo que manual).
3. Migrações destrutivas exigem **aprovação** e janela de manutenção.
4. Dados de seed ficam em `prisma/seeds/<module>.seed.ts`.
5. Ambientes: `dev` → `staging` → `production` (nunca pular staging).

### 6.4 Histórico e Auditoria

| Mecanismo | Uso |
|---|---|
| **Audit Log (módulo Audit)** | Toda ação administrativa e mudança crítica |
| **Event Sourcing (seletivo)** | HotScore, Analytics — para replay e debug |
| **Versionamento de perfil** | Profiles mantém histórico de alterações (profile_versions) |
| **Snapshot de configuração** | Settings versiona cada alteração com diff |

### 6.5 Índices e Performance de Query

- Índices definidos no schema Prisma com justificativa em comentário.
- Queries com EXPLAIN ANALYZE obrigatório em PRs que adicionam queries complexas.
- Paginação obrigatória: cursor-based para listas grandes, offset para admin.
- Connection pooling via PgBouncer em produção.

---

## 7. Estratégia de Eventos

### 7.1 Anatomia de um Evento

Todo evento do sistema segue esta estrutura:

```typescript
interface DomainEvent<T = unknown> {
  /** Identificador único do evento */
  id: string;

  /** Nome do evento em PascalCase */
  name: string;

  /** Versão do schema do evento */
  version: number;

  /** Módulo que originou o evento */
  source: string;

  /** Timestamp ISO 8601 */
  occurredAt: string;

  /** ID do usuário que disparou a ação (se aplicável) */
  actorId: string | null;

  /** ID de correlação para rastrear cadeia de eventos */
  correlationId: string;

  /** Dados específicos do evento */
  payload: T;
}
```

### 7.2 Catálogo de Eventos do Sistema

#### Identidade e Perfis

| Evento | Payload | Módulos Receptores |
|---|---|---|
| `UserCreated` | `{ userId, email, role }` | Profiles, Notifications, Analytics, Audit |
| `UserUpdated` | `{ userId, changes }` | Profiles, Audit |
| `UserDeactivated` | `{ userId, reason }` | Profiles, Search, Notifications, Audit |
| `ProfileCreated` | `{ profileId, userId, slug }` | Search, SEO, Analytics, Audit |
| `ProfileUpdated` | `{ profileId, changes }` | Search, SEO, Cache |
| `ProfileApproved` | `{ profileId, approvedBy }` | Search, Notifications, HotScore, Analytics |
| `ProfileRejected` | `{ profileId, reason, rejectedBy }` | Notifications, Audit |
| `ProfileViewed` | `{ profileId, viewerId?, source }` | Analytics, HotScore |

#### Conteúdo e Mídia

| Evento | Payload | Módulos Receptores |
|---|---|---|
| `PhotoUploaded` | `{ photoId, profileId, url }` | Moderation, Analytics |
| `PhotoApproved` | `{ photoId, profileId }` | Cache, SEO, Analytics |
| `VideoUploaded` | `{ videoId, profileId, url }` | Moderation, Media (transcode) |
| `VideoTranscoded` | `{ videoId, profileId, qualities }` | Cache, Notifications |
| `MomentPublished` | `{ momentId, profileId, expiresAt }` | Notifications, HotScore, Analytics |
| `MomentExpired` | `{ momentId, profileId }` | Cache |

#### Engajamento

| Evento | Payload | Módulos Receptores |
|---|---|---|
| `CommentCreated` | `{ commentId, profileId, authorId, content }` | Moderation, Analytics |
| `CommentApproved` | `{ commentId, profileId }` | HotScore, Notifications, Analytics, Dashboard |
| `CommentRejected` | `{ commentId, reason }` | Notifications, Audit |
| `ReviewCreated` | `{ reviewId, profileId, rating, criteria }` | Moderation, Analytics |
| `ReviewApproved` | `{ reviewId, profileId, rating }` | HotScore, Rankings, Profiles, Notifications |
| `WhatsAppClicked` | `{ profileId, visitorId? }` | Analytics, HotScore |

#### Plataforma

| Evento | Payload | Módulos Receptores |
|---|---|---|
| `HotScoreUpdated` | `{ profileId, score, factors }` | Rankings, Cache, Dashboard |
| `NotificationCreated` | `{ notificationId, userId, type }` | Analytics |
| `ReportSubmitted` | `{ reportId, targetType, targetId }` | Moderation, Audit |
| `SettingChanged` | `{ key, oldValue, newValue, changedBy }` | Cache (invalidação), Audit |
| `MediaProcessed` | `{ mediaId, type, status }` | Photos/Videos, Notifications |

### 7.3 Fluxo de Exemplo: Comentário Aprovado

```
1. Admin aprova comentário no módulo Moderation
2. Moderation emite → CommentApproved { commentId, profileId }
3. Event Bus distribui:
   ├── HotScore.handler     → recalcula pontuação do perfil
   ├── Notifications.handler → notifica a acompanhante
   ├── Analytics.handler    → registra evento de engajamento
   └── Dashboard.handler    → invalida cache de KPIs
4. Nenhum handler conhece a implementação interna de Comments ou Moderation
```

### 7.4 Registro e Documentação de Eventos

- Todo novo evento deve ser registrado em `docs/eventos/CATALOGO.md`.
- Todo handler deve ser registrado no módulo consumidor em `events/handlers/`.
- Testes de integração obrigatórios: emissão + pelo menos um handler.

---

## 8. Estratégia de Segurança

### 8.1 Autenticação e Autorização

| Camada | Estratégia |
|---|---|
| **Autenticação** | JWT (access + refresh) com rotação; sessões em Redis |
| **Autorização** | RBAC (Role-Based Access Control) com permissões granulares |
| **Papéis base** | `visitor`, `companion`, `moderator`, `admin`, `super_admin` |
| **Guards** | NestJS Guards em toda rota; middleware no Next.js |
| **API** | Bearer token + validação de escopo por endpoint |

### 8.2 Modelo de Permissões

```typescript
// Permissões no formato: <recurso>:<ação>
// Exemplos:
'profile:read'        // Público
'profile:write'       // Acompanhante (próprio perfil)
'profile:moderate'    // Moderador
'photo:upload'        // Acompanhante
'photo:moderate'      // Moderador
'settings:manage'     // Admin
'audit:read'          // Admin
'analytics:read'      // Admin + Acompanhante (escopo próprio)
```

**Regras:**

- Permissões são **configuráveis** via módulo Settings (não hardcoded).
- Toda verificação de permissão passa pelo `AuthorizationService` do Shared Core.
- Princípio do **menor privilégio** — default deny.

### 8.3 Proteção de Dados

| Medida | Implementação |
|---|---|
| **Criptografia em trânsito** | TLS 1.3 obrigatório |
| **Criptografia em repouso** | AES-256 para dados sensíveis (documentos de verificação) |
| **Dados pessoais** | LGPD — consentimento, direito de exclusão, portabilidade |
| **Mascaramento** | Dados sensíveis mascarados em logs e analytics |
| **Retenção** | Políticas de retenção configuráveis por tipo de dado |

### 8.4 Validação e Sanitização

- **Toda entrada** validada com Zod antes de atingir services.
- **Uploads** validados por MIME type real (não apenas extensão), tamanho máximo configurável, scan antivírus.
- **HTML user-generated** sanitizado com DOMPurify antes de persistir.
- **SQL Injection** prevenido pelo ORM (Prisma); queries raw proibidas exceto em repositories com review.
- **XSS** prevenido por CSP headers, escape de output, sanitização de input.

### 8.5 Rate Limiting e Anti-Abuso

| Endpoint / Ação | Limite | Janela |
|---|---|---|
| Login | 5 tentativas | 15 min |
| Registro | 3 por IP | 1 hora |
| Upload de mídia | Configurável por plano | 1 hora |
| Busca | 60 requests | 1 min |
| API geral | 100 requests | 1 min |
| Denúncia | 5 por usuário | 24 horas |

Implementação: Redis sliding window via módulo Shared Core `rate-limiter`.

### 8.6 Auditoria de Segurança

Toda ação sensível gera registro no módulo Audit:

- Login / logout / falha de autenticação
- Alteração de permissões
- Aprovação / rejeição de conteúdo
- Acesso a dados pessoais
- Alteração de configurações
- Exportação de dados

---

## 9. Estratégia de Performance

### 9.1 Cache

| Camada | Tecnologia | TTL | Invalidação |
|---|---|---|---|
| **CDN** | Cloudflare / Vercel Edge | Configurável | Purge por tag |
| **Redis — dados** | Perfis públicos, rankings | 5–15 min | Evento `*Updated` |
| **Redis — sessões** | Dados de sessão | Sliding | Logout / expiração |
| **Next.js — ISR** | Páginas de perfil público | 60s–300s | On-demand revalidation |
| **React Query** | Dados do cliente | stale-while-revalidate | Por query key |

**Regras de cache (módulo Cache):**

1. Toda chave segue o padrão: `<module>:<entity>:<id>:<variant>`.
2. Invalidação é sempre orientada a eventos — nunca TTL-only para dados críticos.
3. Cache warming para rankings e destaques via job agendado.

### 9.2 Frontend

| Técnica | Aplicação |
|---|---|
| **Code Splitting** | Por rota (App Router) e por módulo (dynamic imports) |
| **Lazy Loading** | Imagens (next/image), componentes abaixo da dobra, modais |
| **SSR / SSG / ISR** | Perfil público = ISR; Admin = CSR; Landing = SSG |
| **Bundle Size** | Budget: < 200KB first load JS; monitorado no CI |
| **Prefetch** | Links visíveis prefetchados via Next.js Link |

### 9.3 Mídia

| Tipo | Estratégia |
|---|---|
| **Imagens** | Upload original → transformação (WebP/AVIF, múltiplos tamanhos) → CDN |
| **Vídeos** | Upload → fila de transcodificação → HLS/DASH → CDN |
| **Thumbnails** | Gerados automaticamente no upload |
| **Placeholder** | Blur hash (LQIP) durante carregamento |

### 9.4 Banco de Dados

- Queries com paginação cursor-based para feeds e listagens.
- Read replicas para consultas pesadas (analytics, dashboard).
- Projeções materializadas atualizadas por eventos para search e rankings.
- EXPLAIN ANALYZE no CI para queries novas.

### 9.5 Observabilidade e Performance

| Métrica | Threshold de Alerta |
|---|---|
| API response time (p95) | > 500ms |
| Database query time (p95) | > 100ms |
| Error rate | > 1% em 5 min |
| Cache hit rate | < 80% |
| Event processing lag | > 30s |

---

## 10. Regras Obrigatórias para Desenvolvimento Futuro

### 10.1 Checklist de Novo Módulo

Antes de considerar um módulo pronto para produção:

- [ ] Estrutura de pastas segue o padrão da seção 3.2
- [ ] `index.ts` exporta apenas API pública
- [ ] Interfaces definidas em `interfaces/`
- [ ] Repositories não são exportados
- [ ] Schemas Zod para toda entrada e saída
- [ ] Eventos registrados em `docs/eventos/CATALOGO.md`
- [ ] Handlers de eventos são idempotentes
- [ ] Testes unitários para services (cobertura mínima 80%)
- [ ] Testes de integração para repositories
- [ ] Migração de banco versionada e testada
- [ ] Permissões definidas e documentadas
- [ ] Entradas de auditoria para ações sensíveis
- [ ] Métricas e logs estruturados configurados

### 10.2 Checklist de Novo Endpoint / Feature

- [ ] Validação de entrada com Zod
- [ ] Autorização verificada via guard
- [ ] Lógica de negócio no service, não no controller/component
- [ ] Efeitos colaterais via eventos
- [ ] Resposta paginada (se listagem)
- [ ] Cache configurado (se leitura frequente)
- [ ] Rate limiting aplicado (se endpoint público)
- [ ] Testes escritos
- [ ] Documentação API atualizada

### 10.3 Convenções de Código

| Aspecto | Convenção |
|---|---|
| Nomenclatura de arquivos | kebab-case (`profile-service.ts`) |
| Nomenclatura de classes | PascalCase (`ProfileService`) |
| Nomenclatura de interfaces | `I` + PascalCase (`IProfileService`) |
| Nomenclatura de eventos | PascalCase (`ProfileApproved`) |
| Nomenclatura de tabelas | snake_case plural (`profile_versions`) |
| Nomenclatura de schemas DB | snake_case singular por domínio |
| Commits | Conventional Commits (`feat(profiles): add availability toggle`) |
| Branches | `<tipo>/<modulo>/<descricao>` (ex.: `feat/profiles/availability`) |
| PRs | Um módulo ou feature por PR; máximo 400 linhas alteradas |

### 10.4 Limites de Código

| Métrica | Limite |
|---|---|
| Linhas por arquivo | 300 |
| Linhas por função | 30 |
| Parâmetros por função | 4 (usar objeto se mais) |
| Nível de aninhamento | 3 |
| Dependências diretas de um módulo | 5 (excluindo shared-core) |
| Handlers por evento | Sem limite, mas cada um em arquivo separado |

### 10.5 Configurações Dinâmicas (Módulo Settings)

Toda regra que pode mudar sem deploy deve ser configurável:

| Categoria | Exemplos |
|---|---|
| **Hot Score** | Pesos por ação, decay rate, boost factors |
| **Limites** | Máx fotos, vídeos, comentários, uploads/dia |
| **Expirações** | Duração de moments, sessão, cache TTL |
| **Moderação** | Auto-approve rules, filas prioritárias |
| **Notificações** | Templates, canais habilitados, frequência |
| **Aparência** | Tema, cores, logos, layout |
| **SEO** | Meta defaults, robots.txt rules |
| **Rate Limiting** | Limites por endpoint e papel |

**Implementação:**

```typescript
// Uso em qualquer módulo
const maxPhotos = await settingsService.get('profiles.max_photos', { default: 20 });
const viewWeight = await settingsService.get('hotscore.weights.profile_view', { default: 1 });
```

### 10.6 Processo de Evolução para Microsserviços

Quando um módulo precisar ser extraído:

```
1. Módulo já está isolado (sem imports internos cruzados) ✓
2. Contratos de interface já estão definidos ✓
3. Eventos já são assíncronos ✓
4. Substituir implementação local por client HTTP/gRPC
5. Mover banco para instância dedicada
6. Nenhum outro módulo precisa ser alterado
```

**Candidatos naturais para extração (ordem sugerida):**

1. Media (upload/transcode é pesado)
2. Search (indexação é intensiva)
3. Analytics (volume de dados)
4. Notifications (entrega multi-canal)

### 10.7 Governança de Mudanças Arquiteturais

| Tipo de Mudança | Processo |
|---|---|
| Novo módulo | Proposta documentada → revisão → aprovação → implementação |
| Novo evento | Registro no catálogo → implementação → testes |
| Mudança de contrato de interface | Versionamento → migração → deprecation period |
| Cross-schema query necessária | Proibida → usar Read Model ou evento |
| Nova dependência externa | Avaliação de segurança, licença, tamanho → aprovação |
| Alteração deste documento | PR dedicado com justificativa → aprovação de arquitetura |

---

## Apêndice A — Diagrama de Contexto (C4 Nível 1)

```
                    ┌──────────────┐
                    │  Visitante   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Acompanhante│
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐        ┌─────────────────────────┐
                    │    Admin     │        │   Plataforma Web Premium │
                    └──────┬───────┘        │   (Modular Monolith)     │
                           │                └────────────┬────────────┘
                           └────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
             ┌──────▼──────┐    ┌───────▼──────┐   ┌───────▼──────┐
             │  PostgreSQL  │    │    Redis     │   │  S3 / CDN    │
             └─────────────┘    └──────────────┘   └──────────────┘
                                        │
                                 ┌──────▼──────┐
                                 │ Meilisearch  │
                                 └─────────────┘
```

## Apêndice B — Referências

- [NestJS Modular Architecture](https://docs.nestjs.com/modules)
- [Prisma Multi-Schema](https://www.prisma.io/docs/orm/prisma-schema/data-model/multi-schema)
- [Domain-Driven Design — Bounded Contexts](https://martinfowler.com/bliki/BoundedContext.html)
- [Event-Driven Architecture Patterns](https://martinfowler.com/articles/201701-event-driven.html)
- [C4 Model](https://c4model.com/)
- [LGPD — Lei Geral de Proteção de Dados](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)

---

> **Este documento é a referência oficial da plataforma.**  
> Toda funcionalidade, módulo, endpoint, evento e decisão técnica deve estar alinhada com as regras definidas aqui.  
> Desvios exigem proposta formal e aprovação arquitetural.
