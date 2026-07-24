# Documento 9 — Banco de Dados, Modelagem e Estrutura de Dados

**Versão:** 1.0.0  
**Status:** Especificação Oficial  
**Última atualização:** 2026-07-09  
**Dependências:**
- [Documento 1 — Arquitetura da Plataforma](../arquitetura/DOCUMENTO-01-ARQUITETURA-DA-PLATAFORMA.md)
- [Documentos 2–8 — Especificações de módulos](./DOCUMENTO-02-AREA-PUBLICA.md)  
**Escopo:** Estratégia de armazenamento, modelagem por domínio, índices, cache, auditoria e migrações

---

## Sumário

1. [Visão Geral e Princípios](#1-visão-geral-e-princípios)
2. [Estratégia Geral do Banco](#2-estratégia-geral-do-banco)
3. [Organização por Domínios (Schemas)](#3-organização-por-domínios-schemas)
4. [Entidades por Domínio](#4-entidades-por-domínio)
5. [Relacionamentos e Contratos](#5-relacionamentos-e-contratos)
6. [Índices e Performance](#6-índices-e-performance)
7. [Cache e Read Models](#7-cache-e-read-models)
8. [Histórico, Retenção e Expiração](#8-histórico-retenção-e-expiração)
9. [Auditoria](#9-auditoria)
10. [Segurança dos Dados](#10-segurança-dos-dados)
11. [Migrações](#11-migrações)
12. [Eventos e Persistência](#12-eventos-e-persistência)
13. [Critérios de Aceitação](#13-critérios-de-aceitação)

---

## 1. Visão Geral e Princípios

### 1.1 Objetivo

Definir a arquitetura de dados da plataforma como base **escalável, segura, performática, auditável** e preparada para evolução em microsserviços.

### 1.2 Princípios Obrigatórios (Documento 1)

| Princípio | Aplicação |
|---|---|
| **Ownership por domínio** | Cada módulo é dono exclusivo de suas tabelas |
| **Sem cross-schema FK** | Módulos referenciam-se por UUID, nunca por FK entre schemas |
| **Sem JOIN cross-domain** | Proibido em código de aplicação; Read Models para agregações |
| **Repository Pattern** | Toda query encapsulada em `repositories/` do módulo |
| **Sem regra de negócio no banco** | Triggers limitados a auditoria técnica; lógica nos services |
| **Soft delete** | `deleted_at` em entidades de negócio |
| **Timestamps universais** | `created_at`, `updated_at` em toda tabela |
| **IDs UUID v7** | Identificadores globalmente únicos, ordenáveis |

### 1.3 O Que Evitar

| Anti-padrão | Alternativa |
|---|---|
| Tabelas gigantes (> 30 colunas) | Normalizar ou separar em entidades |
| Tabela única "users_everything" | Users + Profiles + Settings separados |
| FK entre schemas | Referência por ID + validação no service |
| Queries em controllers/components | Repository do módulo |
| Stored procedures com regra de negócio | Services TypeScript |
| JSONB como lixeira | Campos tipados; JSONB apenas para metadata extensível |

---

## 2. Estratégia Geral do Banco

### 2.1 Stack de Persistência

| Camada | Tecnologia | Papel |
|---|---|---|
| **Banco principal** | PostgreSQL 16+ | Dados transacionais, ACID |
| **ORM** | Prisma (multi-schema) | Migrações, type-safety |
| **Cache** | Redis 7+ | Cache, sessões, rate limits, pub/sub |
| **Busca** | Meilisearch | Índice de busca (Read Model externo) |
| **Object Storage** | S3-compatible | Arquivos binários (mídia) |
| **Filas** | BullMQ + Redis | Jobs assíncronos, agregações |

### 2.2 Diagrama de Persistência

```
┌─────────────────────────────────────────────────────────────┐
│                     PostgreSQL 16+                           │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌───────────┐ ┌────────┐ │
│  │  auth  │ │ users  │ │profiles│ │   media   │ │engage- │ │
│  │        │ │        │ │        │ │           │ │ ment   │ │
│  └────────┘ └────────┘ └────────┘ └───────────┘ └────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │analytics │ │   cms    │ │ platform │ │  (future)    │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
    ┌─────────┐         ┌──────────┐        ┌──────────┐
    │  Redis  │         │Meilisearch│        │    S3    │
    │  Cache  │         │  Search   │        │  Media   │
    └─────────┘         └──────────┘        └──────────┘
```

### 2.3 Convenções Globais de Colunas

| Coluna | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | UUID | Sim | PK, UUID v7 |
| `created_at` | TIMESTAMPTZ | Sim | Criação (default: now()) |
| `updated_at` | TIMESTAMPTZ | Sim | Última atualização |
| `deleted_at` | TIMESTAMPTZ | Não | Soft delete |
| `tenant_id` | UUID | Não | Multi-tenant futuro (default: platform) |

### 2.4 Convenções de Nomenclatura

| Elemento | Convenção | Exemplo |
|---|---|---|
| Schema | snake_case singular | `profiles` |
| Tabela | snake_case plural | `profile_versions` |
| Coluna | snake_case | `display_name` |
| PK | `id` | — |
| FK interna (mesmo schema) | `{entity}_id` | `profile_id` |
| Referência cross-module | `{entity}_id` sem FK | `user_id` (apenas UUID) |
| Índice | `idx_{table}_{columns}` | `idx_photos_profile_order` |
| Enum | snake_case | `moderation_status` |

---

## 3. Organização por Domínios (Schemas)

### 3.1 Mapa de Schemas

| Schema | Módulos | Responsabilidade |
|---|---|---|
| `auth` | Authentication | Credenciais, sessões, tokens, reset |
| `users` | Users | Contas, roles, permissões |
| `profiles` | Profiles, GeoLocation | Perfil público, localização, pricing, availability |
| `media` | Media, Photos, Videos, Moments, Video Gallery | Arquivos, fotos, vídeos, momentos |
| `engagement` | Comments, Reviews, Likes, Sharing | Interações e avaliações |
| `analytics` | Analytics, HotScore, Rankings | Eventos, métricas, scores, rankings |
| `cms` | Tags, CMS, SEO | Taxonomia, conteúdo editorial |
| `platform` | Notifications, Messaging, Moderation, Reports, Settings, Audit | Infraestrutura transversal |

### 3.2 Ownership Matrix

| Tabela | Schema | Módulo dono | Acesso externo |
|---|---|---|---|
| `users` | users | Users | Via `IUsersService` |
| `profiles` | profiles | Profiles | Via `IProfilesService` |
| `photos` | media | Photos | Via `IPhotosService` |
| `analytics_events` | analytics | Analytics | Via `IAnalyticsService` |
| `notifications` | platform | Notifications | Via `INotificationsService` |
| `audit_entries` | platform | Audit | Via `IAuditService` (read) |

> **Regra:** Nenhum módulo executa `SELECT` direto em tabela de outro schema.

---

## 4. Entidades por Domínio

### 4.1 Schema `auth` — Authentication

#### `credentials`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | Ref → users.users (sem FK cross-schema) |
| password_hash | VARCHAR(255) | Argon2id/bcrypt |
| password_changed_at | TIMESTAMPTZ | Última troca |
| failed_attempts | SMALLINT | Tentativas falhas (default: 0) |
| locked_until | TIMESTAMPTZ? | Bloqueio temporário |
| two_factor_enabled | BOOLEAN | 2FA ativo |
| two_factor_secret | VARCHAR(255)? | TOTP (criptografado) |
| created_at | TIMESTAMPTZ | — |
| updated_at | TIMESTAMPTZ | — |

#### `sessions`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | Ref Users |
| refresh_token_hash | VARCHAR(255) | Hash do refresh |
| device_name | VARCHAR(100)? | Ex.: "Chrome on Windows" |
| device_type | ENUM | desktop, mobile, tablet, unknown |
| ip_address | VARCHAR(45) | IPv4/IPv6 mascarado |
| user_agent | VARCHAR(500)? | Truncado |
| surface | ENUM | companion, admin |
| last_active_at | TIMESTAMPTZ | Último acesso |
| expires_at | TIMESTAMPTZ | Expiração |
| revoked_at | TIMESTAMPTZ? | Revogação |
| created_at | TIMESTAMPTZ | — |

#### `password_reset_tokens`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | Ref Users |
| token_hash | VARCHAR(255) | Hash do token |
| expires_at | TIMESTAMPTZ | 1h |
| used_at | TIMESTAMPTZ? | Utilizado |
| created_at | TIMESTAMPTZ | — |

---

### 4.2 Schema `users` — Users

#### `users`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| email | VARCHAR(255) | Único, lowercase |
| email_verified | BOOLEAN | Confirmado |
| status | ENUM | active, inactive, blocked, pending_verification |
| display_name | VARCHAR(100)? | Nome interno (admin) |
| last_login_at | TIMESTAMPTZ? | Último login |
| blocked_at | TIMESTAMPTZ? | Bloqueio |
| blocked_reason | TEXT? | Motivo |
| tenant_id | UUID | Multi-tenant (default: platform) |
| created_at | TIMESTAMPTZ | — |
| updated_at | TIMESTAMPTZ | — |
| deleted_at | TIMESTAMPTZ? | Soft delete |

#### `roles`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(50) | companion, admin, etc. |
| display_name | VARCHAR(100) | Label UI |
| permissions | JSONB | Array de strings |
| is_system | BOOLEAN | Não deletável |
| tenant_id | UUID? | Multi-tenant |
| created_at | TIMESTAMPTZ | — |

#### `user_roles`

| Coluna | Tipo | Descrição |
|---|---|---|
| user_id | UUID | PK (composto) |
| role_id | UUID | PK (composto) |
| assigned_at | TIMESTAMPTZ | — |
| assigned_by | UUID? | Quem atribuiu |

#### `permission_overrides`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | Ref Users |
| permission | VARCHAR(100) | Ex.: profiles:moderate |
| granted | BOOLEAN | true=grant, false=revoke |
| created_at | TIMESTAMPTZ | — |

#### `user_settings`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | Único, ref Users |
| locale | VARCHAR(10) | pt-BR (default) |
| timezone | VARCHAR(50) | America/Sao_Paulo |
| preferences | JSONB | Preferências gerais |
| created_at | TIMESTAMPTZ | — |
| updated_at | TIMESTAMPTZ | — |

---

### 4.3 Schema `profiles` — Profiles e GeoLocation

#### `profiles`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | Único, ref Users |
| slug | VARCHAR(100) | Único, URL amigável |
| display_name | VARCHAR(100) | Nome público |
| real_name | VARCHAR(100)? | Nome real (privado) |
| birth_date | DATE | Data nascimento |
| bio | TEXT? | Biografia (máx. 1000) |
| sexual_preference | VARCHAR(50)? | Configurável |
| position | ENUM? | active, passive, versatile |
| characteristics | JSONB? | Array de características |
| whatsapp | VARCHAR(255)? | Criptografado |
| status | ENUM | pending, approved, rejected, blocked |
| is_public | BOOLEAN | Visível publicamente |
| is_premium | BOOLEAN | Premium ativo |
| is_featured | BOOLEAN | Destaque ativo |
| premium_expires_at | TIMESTAMPTZ? | Expiração premium |
| featured_expires_at | TIMESTAMPTZ? | Expiração destaque |
| pricing_display_mode | ENUM | show, consult, hidden |
| view_count | INTEGER | Projeção Analytics (default: 0) |
| seo_indexable | BOOLEAN | Indexável |
| created_at | TIMESTAMPTZ | — |
| updated_at | TIMESTAMPTZ | — |
| deleted_at | TIMESTAMPTZ? | — |

#### `profile_pricing`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| profile_id | UUID | FK interna → profiles |
| thirty_min | INTEGER? | Centavos |
| one_hour | INTEGER? | Centavos |
| two_hours | INTEGER? | Centavos |
| overnight | INTEGER? | Centavos |
| custom_items | JSONB? | `[{ label, value }]` |
| created_at | TIMESTAMPTZ | — |
| updated_at | TIMESTAMPTZ | — |

#### `profile_availability`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| profile_id | UUID | FK interna |
| day_of_week | SMALLINT | 0=Dom, 1=Seg, ... 6=Sáb |
| is_available | BOOLEAN | — |
| start_time | TIME? | Início |
| end_time | TIME? | Fim |

#### `profile_locations`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| profile_id | UUID | Único, FK interna |
| cep | VARCHAR(10) | CEP |
| city | VARCHAR(100) | Cidade |
| state | VARCHAR(2) | UF |
| latitude | DECIMAL(9,6)? | **Nunca exposto ao frontend** |
| longitude | DECIMAL(9,6)? | **Nunca exposto ao frontend** |
| timezone | VARCHAR(50) | Fuso da cidade |
| created_at | TIMESTAMPTZ | — |
| updated_at | TIMESTAMPTZ | — |

#### `profile_versions`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| profile_id | UUID | FK interna |
| version | INTEGER | Sequencial |
| changes | JSONB | Diff de campos |
| changed_by | UUID? | userId ou adminId |
| created_at | TIMESTAMPTZ | — |

#### `profile_tag_order`

| Coluna | Tipo | Descrição |
|---|---|---|
| profile_id | UUID | PK (composto) |
| tag_id | UUID | PK (composto), ref cms.tags |
| sort_order | SMALLINT | Ordem (0, 1, 2 = top 3 no card) |

> Regra: `sort_order` 0–2 são as 3 tags exibidas nos cards (Doc 2, Doc 6).

---

### 4.4 Schema `media` — Media Core, Photos, Videos, Moments

#### `media_assets`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| owner_type | VARCHAR(50) | photo, video, moment, message_attachment |
| owner_id | UUID? | ID da entidade dona (preenchido após criação) |
| mime_type | VARCHAR(100) | MIME real |
| original_filename | VARCHAR(255)? | Nome original |
| storage_path | VARCHAR(500) | Path no S3 |
| size_bytes | BIGINT | Tamanho |
| status | ENUM | uploading, processing, ready, failed |
| metadata | JSONB? | Dimensões, duração, blur_hash |
| created_at | TIMESTAMPTZ | — |
| updated_at | TIMESTAMPTZ | — |

#### `media_variants`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| asset_id | UUID | FK interna → media_assets |
| variant | VARCHAR(20) | thumb, medium, large, hls_360, etc. |
| storage_path | VARCHAR(500) | Path no S3/CDN |
| width | INTEGER? | Largura px |
| height | INTEGER? | Altura px |
| size_bytes | BIGINT? | — |
| created_at | TIMESTAMPTZ | — |

#### `media_processing_jobs`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| asset_id | UUID | FK interna |
| job_type | ENUM | image_optimize, video_transcode |
| status | ENUM | queued, processing, completed, failed |
| attempts | SMALLINT | Tentativas |
| error_message | TEXT? | Erro |
| started_at | TIMESTAMPTZ? | — |
| completed_at | TIMESTAMPTZ? | — |
| created_at | TIMESTAMPTZ | — |

#### `photos`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| profile_id | UUID | Ref Profiles |
| media_asset_id | UUID | FK interna → media_assets |
| status | ENUM | pending, approved, rejected, hidden, removed |
| sort_order | SMALLINT | Ordem na galeria |
| is_cover | BOOLEAN | Foto principal |
| is_active | BOOLEAN | Visível quando aprovada |
| rejection_reason | TEXT? | Motivo |
| moderated_at | TIMESTAMPTZ? | — |
| moderated_by | UUID? | Admin |
| created_at | TIMESTAMPTZ | — |
| updated_at | TIMESTAMPTZ | — |
| deleted_at | TIMESTAMPTZ? | — |

#### `videos`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| profile_id | UUID | Ref Profiles |
| media_asset_id | UUID | FK interna |
| title | VARCHAR(200)? | Título |
| description | TEXT? | Descrição |
| status | ENUM | pending, approved, rejected, hidden, removed |
| show_in_profile | BOOLEAN | Exibir no perfil |
| show_in_gallery | BOOLEAN | Exibir na galeria pública |
| duration_seconds | INTEGER? | Após transcode |
| view_count | INTEGER | Projeção (default: 0) |
| like_count | INTEGER | Projeção (default: 0) |
| comment_count | INTEGER | Projeção (default: 0) |
| rejection_reason | TEXT? | — |
| moderated_at | TIMESTAMPTZ? | — |
| moderated_by | UUID? | — |
| transcoded_at | TIMESTAMPTZ? | — |
| created_at | TIMESTAMPTZ | — |
| updated_at | TIMESTAMPTZ | — |
| deleted_at | TIMESTAMPTZ? | — |

#### `moments`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| profile_id | UUID | Ref Profiles |
| media_asset_id | UUID | FK interna |
| media_type | ENUM | photo, video |
| caption | VARCHAR(300)? | Legenda |
| status | ENUM | pending, approved, rejected, hidden, removed |
| view_count | INTEGER | Projeção |
| like_count | INTEGER | Projeção |
| comment_count | INTEGER | Projeção |
| share_count | INTEGER | Projeção |
| published_at | TIMESTAMPTZ? | Após aprovação |
| moderated_at | TIMESTAMPTZ? | — |
| moderated_by | UUID? | — |
| created_at | TIMESTAMPTZ | — |
| updated_at | TIMESTAMPTZ | — |
| deleted_at | TIMESTAMPTZ? | — |

#### `video_gallery_entries` (Read Model)

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| video_id | UUID | Único, ref videos |
| profile_id | UUID | Ref Profiles |
| profile_name | VARCHAR(100) | Desnormalizado |
| profile_photo_url | VARCHAR(500)? | Desnormalizado |
| thumbnail_url | VARCHAR(500) | — |
| title | VARCHAR(200)? | — |
| duration_seconds | INTEGER? | — |
| city | VARCHAR(100)? | Desnormalizado |
| tags | JSONB? | Array de tag names |
| view_count | INTEGER | — |
| like_count | INTEGER | — |
| comment_count | INTEGER | — |
| published_at | TIMESTAMPTZ | — |
| indexed_at | TIMESTAMPTZ | Última indexação |

---

### 4.5 Schema `engagement` — Comments, Reviews, Likes, Sharing

#### `comments`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| target_type | ENUM | profile, moment, video |
| target_id | UUID | ID do alvo |
| profile_id | UUID | Perfil dono do conteúdo |
| author_name | VARCHAR(100) | Nome informado |
| author_id | UUID? | Futuro: user autenticado |
| content | VARCHAR(500) | Texto sanitizado |
| status | ENUM | pending, approved, rejected, hidden |
| rejection_reason | TEXT? | — |
| moderated_at | TIMESTAMPTZ? | — |
| moderated_by | UUID? | — |
| created_at | TIMESTAMPTZ | — |
| updated_at | TIMESTAMPTZ | — |
| deleted_at | TIMESTAMPTZ? | — |

#### `reviews`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| profile_id | UUID | Perfil avaliado |
| author_name | VARCHAR(100) | — |
| author_fingerprint | VARCHAR(64)? | Anti-duplicata |
| rating | SMALLINT | 1–5 |
| comment | VARCHAR(500)? | — |
| status | ENUM | pending, approved, rejected, hidden |
| rejection_reason | TEXT? | — |
| moderated_at | TIMESTAMPTZ? | — |
| moderated_by | UUID? | — |
| created_at | TIMESTAMPTZ | — |
| updated_at | TIMESTAMPTZ | — |
| deleted_at | TIMESTAMPTZ? | — |

#### `review_summaries` (Read Model / Cache)

| Coluna | Tipo | Descrição |
|---|---|---|
| profile_id | UUID | PK |
| average_rating | DECIMAL(3,2) | Média |
| review_count | INTEGER | Contagem |
| distribution | JSONB | `{ "1": n, "2": n, ... }` |
| updated_at | TIMESTAMPTZ | — |

#### `likes`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| target_type | ENUM | moment, video |
| target_id | UUID | Conteúdo |
| profile_id | UUID | Dono do conteúdo |
| visitor_id | VARCHAR(64) | Hash fingerprint/session |
| source | ENUM | fingerprint, session, user |
| created_at | TIMESTAMPTZ | — |

> UNIQUE: `(target_type, target_id, visitor_id)`

#### `shares`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| target_type | ENUM | profile, moment, video |
| target_id | UUID | — |
| profile_id | UUID | Dono |
| channel | ENUM | web_share, copy_link, whatsapp, social |
| visitor_id | VARCHAR(64)? | — |
| created_at | TIMESTAMPTZ | — |

---

### 4.6 Schema `analytics` — Analytics, HotScore, Rankings

#### `analytics_events`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| event_type | VARCHAR(50) | ProfileViewed, etc. |
| profile_id | UUID? | Perfil relacionado |
| session_id | VARCHAR(64)? | visitor_session |
| user_id | UUID? | Se autenticado |
| metadata | JSONB | Payload específico |
| ip_hash | VARCHAR(64)? | IP mascarado/hashed |
| created_at | TIMESTAMPTZ | — |

**Particionamento:** Por mês (`created_at`) — preparado para volume.

#### `analytics_aggregates_daily`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| profile_id | UUID? | null = global |
| metric_type | VARCHAR(50) | views, whatsapp_clicks, etc. |
| date | DATE | Dia |
| value | BIGINT | Contagem |
| metadata | JSONB? | Breakdown |

> UNIQUE: `(profile_id, metric_type, date)`

#### `hot_scores`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| profile_id | UUID | Único |
| score | DECIMAL(5,2) | 0.00–100.00 |
| raw_score | DECIMAL(10,2) | Score bruto pré-normalização |
| level | VARCHAR(20) | cold, warm, hot, blazing |
| trend | ENUM | up, down, stable |
| trend_percentage | DECIMAL(5,2)? | Variação 7d |
| updated_at | TIMESTAMPTZ | — |

#### `hot_score_events`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| profile_id | UUID | — |
| event_type | VARCHAR(50) | profile_view, whatsapp_click, etc. |
| points | DECIMAL(6,2) | Pontos atribuídos |
| weight | DECIMAL(4,2) | Peso no momento |
| source_event_id | UUID? | Ref analytics_events |
| expires_at | TIMESTAMPTZ? | Expiração do ponto |
| created_at | TIMESTAMPTZ | — |

#### `hot_score_history`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| profile_id | UUID | — |
| date | DATE | Dia |
| score | DECIMAL(5,2) | Snapshot |
| delta | DECIMAL(5,2)? | Variação vs dia anterior |

> UNIQUE: `(profile_id, date)`

#### `hot_score_adjustments`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| profile_id | UUID | — |
| adjustment | DECIMAL(6,2) | +/- pontos |
| reason | TEXT | Justificativa obrigatória |
| adjusted_by | UUID | Admin |
| expires_at | TIMESTAMPTZ? | Temporário |
| created_at | TIMESTAMPTZ | — |

#### `ranking_snapshots`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| ranking_type | VARCHAR(30) | hotscore, views, trending, etc. |
| period | VARCHAR(20) | daily, weekly, monthly, all_time |
| city | VARCHAR(100)? | Filtro cidade |
| snapshot_date | DATE | Data do snapshot |
| entries | JSONB | `[{ position, profileId, metric, change }]` |
| created_at | TIMESTAMPTZ | — |

#### `ranking_entries` (projeção atual)

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| ranking_type | VARCHAR(30) | — |
| period | VARCHAR(20) | — |
| profile_id | UUID | — |
| position | INTEGER | Posição |
| position_change | INTEGER? | vs snapshot anterior |
| metric_value | DECIMAL(12,2) | Valor da métrica |
| city | VARCHAR(100)? | — |
| updated_at | TIMESTAMPTZ | — |

---

### 4.7 Schema `cms` — Tags, CMS, SEO

#### `tags`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| slug | VARCHAR(100) | Único |
| name | VARCHAR(100) | Nome exibição |
| category_id | UUID? | FK interna → tag_categories |
| profile_count | INTEGER | Projeção (default: 0) |
| is_active | BOOLEAN | Ativa |
| sort_order | SMALLINT? | Ordem admin |
| created_at | TIMESTAMPTZ | — |
| updated_at | TIMESTAMPTZ | — |

#### `tag_categories`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR(100) | — |
| slug | VARCHAR(100) | Único |
| sort_order | SMALLINT | — |

#### `cms_pages`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| slug | VARCHAR(100) | Único |
| title | VARCHAR(200) | — |
| content | TEXT | HTML sanitizado |
| meta_title | VARCHAR(200)? | SEO |
| meta_description | VARCHAR(300)? | SEO |
| status | ENUM | draft, published |
| version | INTEGER | Versionamento |
| published_at | TIMESTAMPTZ? | — |
| created_at | TIMESTAMPTZ | — |
| updated_at | TIMESTAMPTZ | — |

#### `seo_metadata`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| entity_type | VARCHAR(30) | profile, page, category |
| entity_id | UUID | — |
| title | VARCHAR(200)? | — |
| description | VARCHAR(300)? | — |
| og_image_url | VARCHAR(500)? | — |
| canonical_url | VARCHAR(500)? | — |
| robots | VARCHAR(50)? | index/noindex |
| schema_json | JSONB? | Schema.org |
| updated_at | TIMESTAMPTZ | — |

> UNIQUE: `(entity_type, entity_id)`

---

### 4.8 Schema `platform` — Notifications, Messaging, Moderation, Settings, Audit

#### `notifications`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | Destinatário |
| type | VARCHAR(50) | profile_approved, etc. |
| title | VARCHAR(200) | — |
| message | TEXT | — |
| priority | ENUM | low, normal, high, critical |
| status | ENUM | unread, read, archived |
| source_event | VARCHAR(50) | Evento origem |
| source_event_id | UUID | ID do evento |
| action_url | VARCHAR(500)? | Link |
| metadata | JSONB? | — |
| channels_delivered | JSONB? | Array |
| read_at | TIMESTAMPTZ? | — |
| archived_at | TIMESTAMPTZ? | — |
| created_at | TIMESTAMPTZ | — |

#### `notification_preferences`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | — |
| type | VARCHAR(50) | Tipo notificação |
| in_app | BOOLEAN | Default: true |
| email | BOOLEAN | Default: false |
| push | BOOLEAN | Default: false |
| updated_at | TIMESTAMPTZ | — |

> UNIQUE: `(user_id, type)`

#### `conversations`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| profile_id | UUID | Ref Profiles |
| user_id | UUID | Ref Users (companion) |
| subject | VARCHAR(100) | Assunto |
| status | ENUM | open, in_progress, answered, closed |
| priority | ENUM | low, normal, high, critical |
| assigned_to | UUID? | Admin responsável |
| internal_notes | TEXT? | Notas admin |
| closed_at | TIMESTAMPTZ? | — |
| closed_by | UUID? | — |
| created_at | TIMESTAMPTZ | — |
| updated_at | TIMESTAMPTZ | — |

#### `messages`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| conversation_id | UUID | FK interna |
| sender_type | ENUM | companion, admin, system |
| sender_id | UUID | — |
| body | VARCHAR(2000) | — |
| read_at | TIMESTAMPTZ? | — |
| created_at | TIMESTAMPTZ | — |

#### `message_attachments`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| message_id | UUID | FK interna |
| media_asset_id | UUID | Ref media.media_assets |
| file_name | VARCHAR(255) | — |
| created_at | TIMESTAMPTZ | — |

#### `moderation_actions`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| target_type | VARCHAR(30) | profile, photo, comment, etc. |
| target_id | UUID | — |
| action | ENUM | approved, rejected, hidden, removed |
| reason | TEXT? | Motivo |
| moderator_id | UUID | Admin |
| created_at | TIMESTAMPTZ | — |

#### `reports`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| target_type | ENUM | profile, photo, video, moment, comment |
| target_id | UUID | — |
| reason | ENUM | inappropriate, fake_profile, spam, other |
| description | TEXT? | — |
| reporter_fingerprint | VARCHAR(64)? | — |
| status | ENUM | new, in_review, resolved, dismissed |
| resolved_by | UUID? | — |
| resolution | TEXT? | — |
| resolved_at | TIMESTAMPTZ? | — |
| created_at | TIMESTAMPTZ | — |

#### `verification_requests`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| profile_id | UUID | Ref Profiles |
| status | ENUM | pending, approved, rejected |
| documents | JSONB | Refs media_assets (criptografados) |
| internal_notes | TEXT? | — |
| reviewed_by | UUID? | — |
| reviewed_at | TIMESTAMPTZ? | — |
| rejection_reason | TEXT? | — |
| created_at | TIMESTAMPTZ | — |

#### `settings`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| key | VARCHAR(200) | Único (ex.: hotscore.weights.profile_view) |
| value | JSONB | Valor |
| group | VARCHAR(50) | Categoria |
| version | INTEGER | Versionamento |
| updated_by | UUID? | — |
| updated_at | TIMESTAMPTZ | — |

#### `setting_snapshots`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| setting_key | VARCHAR(200) | — |
| old_value | JSONB? | — |
| new_value | JSONB | — |
| changed_by | UUID | — |
| created_at | TIMESTAMPTZ | — |

#### `audit_entries`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| actor_id | UUID? | Quem executou |
| action | VARCHAR(100) | auth.login.success, etc. |
| resource_type | VARCHAR(50) | user, profile, setting, etc. |
| resource_id | UUID? | — |
| old_value | JSONB? | Estado anterior |
| new_value | JSONB? | Novo estado |
| ip_hash | VARCHAR(64)? | IP mascarado |
| user_agent | VARCHAR(200)? | — |
| metadata | JSONB? | Contexto extra |
| created_at | TIMESTAMPTZ | — |

> **Imutável** — sem UPDATE ou DELETE.

---

## 5. Relacionamentos e Contratos

### 5.1 Relacionamentos Internos (FK permitida — mesmo schema)

```
profiles.profile_pricing     ──FK──► profiles.profiles
profiles.profile_locations   ──FK──► profiles.profiles
profiles.profile_tag_order   ──FK──► profiles.profiles
media.photos                 ──FK──► media.media_assets
media.videos                 ──FK──► media.media_assets
media.media_variants         ──FK──► media.media_assets
platform.messages            ──FK──► platform.conversations
```

### 5.2 Contratos Cross-Module (UUID apenas — sem FK)

```
users.users.id          ◄──── profiles.profiles.user_id
profiles.profiles.id    ◄──── media.photos.profile_id
profiles.profiles.id    ◄──── engagement.reviews.profile_id
profiles.profiles.id    ◄──── analytics.hot_scores.profile_id
profiles.profiles.id    ◄──── analytics.analytics_events.profile_id
users.users.id          ◄──── platform.notifications.user_id
cms.tags.id             ◄──── profiles.profile_tag_order.tag_id
```

Validação de integridade referencial cross-module: **no service layer**, não no banco.

### 5.3 Diagrama ER Simplificado

```
┌─────────┐     1:1      ┌──────────┐     1:N     ┌─────────┐
│  users  │─────────────►│ profiles │────────────►│ photos  │
└────┬────┘              └────┬─────┘             └─────────┘
     │                       │
     │ 1:N                   │ 1:N
     ▼                       ▼
┌─────────┐              ┌──────────┐
│notifica-│              │ reviews  │
│ tions   │              │ comments │
└─────────┘              └──────────┘
     │
     │ (via events, not FK)
     ▼
┌──────────┐     1:1     ┌───────────┐
│hot_scores│◄───────────│ profiles  │
└──────────┘             └───────────┘
```

### 5.4 Regras de Integridade

| ID | Regra |
|---|---|
| RN-DB-001 | FK apenas dentro do mesmo schema |
| RN-DB-002 | Cross-module: validar existência no service antes de INSERT |
| RN-DB-003 | Cascade delete apenas intra-schema |
| RN-DB-004 | Soft delete não viola referências (registro permanece) |
| RN-DB-005 | Orphan check via job agendado (semanal) |

---

## 6. Índices e Performance

### 6.1 Índices por Domínio

#### `profiles`

| Índice | Colunas | Tipo | Justificativa |
|---|---|---|---|
| `idx_profiles_slug` | slug | UNIQUE | URL lookup |
| `idx_profiles_user_id` | user_id | UNIQUE | 1:1 user |
| `idx_profiles_status_public` | status, is_public | BTREE | Listagem pública |
| `idx_profiles_city` | — (via join location) | — | Filtro cidade |
| `idx_profiles_premium_featured` | is_premium, is_featured | BTREE | Filtros |
| `idx_profile_locations_coords` | latitude, longitude | GiST | Busca geográfica |

#### `media`

| Índice | Colunas | Justificativa |
|---|---|---|
| `idx_photos_profile_order` | profile_id, sort_order | Galeria ordenada |
| `idx_photos_profile_status` | profile_id, status | Fotos aprovadas |
| `idx_videos_profile_gallery` | profile_id, show_in_gallery, status | Galeria |
| `idx_moments_profile_status` | profile_id, status | Momentos |
| `idx_moments_feed` | status, published_at DESC | Feed público |

#### `engagement`

| Índice | Colunas | Justificativa |
|---|---|---|
| `idx_comments_target` | target_type, target_id, status | Comentários aprovados |
| `idx_reviews_profile_status` | profile_id, status | Reviews aprovadas |
| `idx_likes_unique` | target_type, target_id, visitor_id | UNIQUE anti-duplicata |
| `idx_likes_target` | target_type, target_id | Contagem |

#### `analytics`

| Índice | Colunas | Justificativa |
|---|---|---|
| `idx_events_profile_date` | profile_id, created_at | Métricas por perfil |
| `idx_events_type_date` | event_type, created_at | Agregações |
| `idx_hot_scores_profile` | profile_id | UNIQUE lookup |
| `idx_hot_score_history` | profile_id, date | UNIQUE gráfico |
| `idx_ranking_entries` | ranking_type, period, position | Rankings |

#### `platform`

| Índice | Colunas | Justificativa |
|---|---|---|
| `idx_notifications_user_status` | user_id, status, created_at DESC | Inbox |
| `idx_conversations_status` | status, updated_at DESC | Inbox admin |
| `idx_reports_status` | status, created_at | Fila denúncias |
| `idx_audit_actor_date` | actor_id, created_at DESC | Auditoria |
| `idx_audit_resource` | resource_type, resource_id | Histórico entidade |
| `idx_settings_key` | key | UNIQUE lookup |

### 6.2 Full-Text Search

| Escopo | Implementação |
|---|---|
| Perfis (nome, bio) | Meilisearch (Read Model) — primário |
| Perfis (fallback) | PostgreSQL `tsvector` em `profiles.search_vector` |
| Tags | Meilisearch + índice `cms.tags` |
| CMS pages | PostgreSQL FTS opcional |

Coluna gerada (profiles):

```
search_vector = to_tsvector('portuguese', display_name || ' ' || coalesce(bio, ''))
```

Índice GIN em `search_vector` como fallback.

### 6.3 Busca Geográfica

| Técnica | Uso |
|---|---|
| PostGIS (futuro) | `GEOGRAPHY(POINT)` em profile_locations |
| Fase 1 | Haversine em application layer + GiST em lat/lng |
| Cache | Redis geo sets por cidade |

### 6.4 Particionamento (Preparação)

| Tabela | Estratégia | Quando |
|---|---|---|
| `analytics_events` | RANGE por `created_at` (mensal) | > 10M rows |
| `audit_entries` | RANGE por `created_at` (trimestral) | > 5M rows |
| `hot_score_events` | RANGE por `created_at` (mensal) | > 5M rows |

### 6.5 Connection Pooling

| Componente | Configuração |
|---|---|
| PgBouncer | Transaction mode, pool 20–50 |
| Prisma | Connection limit por instância |
| Read replicas | Analytics queries pesadas (futuro) |

---

## 7. Cache e Read Models

### 7.1 Estratégia de Cache (Redis)

| Chave | TTL | Invalidação (evento) |
|---|---|---|
| `profile:public:{slug}` | 120s | ProfileUpdated, ProfileApproved |
| `profile:card:{id}` | 120s | ProfileUpdated, HotScoreUpdated |
| `hotscore:{profileId}` | 120s | HotScoreUpdated |
| `ranking:{type}:{period}` | 300s | RankingUpdated |
| `search:autocomplete:{term}` | 60s | SearchIndexUpdated |
| `similar:{profileId}` | 900s | ProfileUpdated |
| `settings:public` | 600s | SettingChanged |
| `notifications:unread:{userId}` | — | NotificationCreated, NotificationRead |
| `review:summary:{profileId}` | 300s | ReviewApproved |
| `geo:cep:{cep}` | 30d | — |

### 7.2 Read Models (Tabelas de Projeção)

| Read Model | Schema | Alimentado por | Consumido por |
|---|---|---|---|
| `video_gallery_entries` | media | VideoApproved, VideoVisibilityChanged | Video Gallery |
| `review_summaries` | engagement | ReviewApproved, ReviewRejected | Profiles, Search |
| `ranking_entries` | analytics | RankingUpdated job | Rankings, Dashboard |
| `search_index` | Meilisearch (externo) | Profile*, Tag*, HotScore* events | Search |
| `seo_metadata` | cms | ProfileUpdated, CmsPageUpdated | SEO |

### 7.3 Regra de Invalidação

```
Evento → Handler → DELETE cache key(s) → (opcional) warming
```

Nunca TTL-only para dados que mudam por eventos de negócio.

---

## 8. Histórico, Retenção e Expiração

### 8.1 Tabelas de Histórico

| Tabela | Granularidade | Retenção |
|---|---|---|
| `profile_versions` | Por alteração | Permanente |
| `hot_score_history` | Diária | 2 anos |
| `hot_score_events` | Por evento | 90 dias |
| `ranking_snapshots` | Por snapshot | 1 ano |
| `analytics_events` (raw) | Por evento | 90 dias |
| `analytics_aggregates_daily` | Diária | 2 anos |
| `setting_snapshots` | Por alteração | Permanente |
| `moderation_actions` | Por ação | Permanente |
| `audit_entries` | Por ação | 2 anos |

### 8.2 Jobs de Limpeza

| Job | Frequência | Ação |
|---|---|---|
| `cleanup.analytics_events` | Diário | Purge > 90 dias → agregado |
| `cleanup.hot_score_events` | Semanal | Purge expirados |
| `cleanup.notifications` | Diário | Archive lidas > 90 dias |
| `cleanup.sessions` | Diário | Purge revogadas > 90 dias |
| `cleanup.orphan_check` | Semanal | Reportar referências órfãs |
| `archive.audit` | Mensal | Mover > 2 anos para cold storage |

### 8.3 Configuração (Settings)

| Chave | Default |
|---|---|
| `data.retention.analytics_raw_days` | 90 |
| `data.retention.analytics_aggregate_days` | 730 |
| `data.retention.audit_days` | 730 |
| `data.retention.notifications_days` | 90 |
| `data.retention.hot_score_events_days` | 90 |
| `data.retention.sessions_revoked_days` | 90 |

---

## 9. Auditoria

### 9.1 Tabela Universal — `platform.audit_entries`

Registra **toda ação sensível** da plataforma (Doc 4, Doc 7, Doc 8).

### 9.2 Categorias Auditadas

| Categoria | Exemplos de `action` |
|---|---|
| **Auth** | auth.login.success, auth.login.failed, auth.password.changed |
| **User** | user.blocked, user.role.changed, user.permission.changed |
| **Profile** | profile.approved, profile.rejected, profile.updated |
| **Content** | content.approved, content.removed |
| **Moderation** | moderation.action |
| **Settings** | setting.changed |
| **Hot Score** | hotscore.adjusted |
| **Messaging** | message.sent, conversation.closed |
| **Security** | security.suspicious |

### 9.3 Regras

| ID | Regra |
|---|---|
| RN-AUD-DB-001 | audit_entries é append-only (sem UPDATE/DELETE) |
| RN-AUD-DB-002 | old_value e new_value em JSONB (diff) |
| RN-AUD-DB-003 | IP sempre mascarado/hash |
| RN-AUD-DB-004 | Retenção mínima 2 anos |

### 9.4 Histórico por Entidade

Além da auditoria global, histórico específico:

| Entidade | Tabela histórico |
|---|---|
| Profile | `profile_versions` |
| Settings | `setting_snapshots` |
| Hot Score | `hot_score_history` + `hot_score_adjustments` |
| Moderação | `moderation_actions` |
| Rankings | `ranking_snapshots` |

---

## 10. Segurança dos Dados

### 10.1 Classificação e Proteção

| Classificação | Exemplos | Proteção |
|---|---|---|
| **Crítico** | password_hash, 2fa_secret, documents | Criptografia + acesso restrito |
| **PII sensível** | email, whatsapp, cep, coordinates | Criptografia em repouso (AES-256) |
| **PII parcial** | ip_address, author_name | Mascaramento/hash |
| **Público** | display_name, bio, slug | Acesso público (se approved) |
| **Operacional** | settings, audit | RBAC |

### 10.2 Criptografia

| Dado | Método |
|---|---|
| Senhas | Argon2id / bcrypt (hash irreversível) |
| WhatsApp | AES-256-GCM (coluna encrypted) |
| Documentos verificação | AES-256 + storage criptografado |
| Tokens | Hash SHA-256 (reset, refresh) |
| IP em audit | Hash parcial |

### 10.3 Separação Público vs Privado

| Dado | Tabela | Exposto em API pública |
|---|---|---|
| display_name | profiles | ✅ |
| real_name | profiles | ❌ (admin only) |
| email | users | ❌ |
| whatsapp | profiles | ❌ (apenas link wa.me) |
| latitude/longitude | profile_locations | ❌ (nunca) |
| city/state | profile_locations | ✅ |
| password_hash | credentials | ❌ (nunca) |

### 10.4 Controle de Acesso ao Banco

| Papel DB | Permissão | Uso |
|---|---|---|
| `app_readwrite` | CRUD nos schemas | Aplicação |
| `app_readonly` | SELECT | Analytics replica |
| `migration` | DDL | Prisma migrate apenas |
| `admin` | Superuser | Emergências (não app) |

### 10.5 Backup e Recuperação

| Aspecto | Especificação |
|---|---|
| Backup full | Diário (automated) |
| WAL archiving | Contínuo (PITR) |
| Retenção backup | 30 dias |
| Teste de restore | Mensal |
| RTO | < 4 horas |
| RPO | < 1 hora |
| Geo-replicação | Preparado (futuro) |

---

## 11. Migrações

### 11.1 Estratégia (Prisma Multi-Schema)

```
prisma/
├── schema/
│   ├── base.prisma           # generator, datasource
│   ├── auth.prisma
│   ├── users.prisma
│   ├── profiles.prisma
│   ├── media.prisma
│   ├── engagement.prisma
│   ├── analytics.prisma
│   ├── cms.prisma
│   └── platform.prisma
└── migrations/
    ├── 20260709_000001_auth_init/
    ├── 20260709_000002_users_init/
    ├── 20260709_000003_profiles_init/
    └── ...
```

### 11.2 Regras de Migração

| ID | Regra |
|---|---|
| RN-MIG-001 | Migrações são imutáveis após aplicadas |
| RN-MIG-002 | Uma migração por schema ou feature coesa |
| RN-MIG-003 | Nome: `YYYYMMDD_NNNNNN_{schema}_{descricao}` |
| RN-MIG-004 | Rollback documentado (SQL manual) em cada migração |
| RN-MIG-005 | Migrações destrutivas exigem aprovação |
| RN-MIG-006 | Ambientes: dev → staging → production (nunca pular) |
| RN-MIG-007 | Seed data em `prisma/seeds/{schema}.seed.ts` |

### 11.3 Processo de Alteração Estrutural

```
1. Alterar schema Prisma
2. Gerar migração: npx prisma migrate dev
3. Review SQL gerado
4. Documentar rollback
5. Aplicar em staging
6. Testes de integração
7. Aplicar em production (janela se destrutivo)
```

### 11.4 Preparação Microsserviços

| Hoje (Monolith) | Futuro (Microsserviço) |
|---|---|
| Schema `profiles` no mesmo PG | PG dedicado por serviço |
| Referência por UUID | Contrato de API mantido |
| Prisma multi-schema | Prisma single-schema por serviço |
| Eventos | Eventos (inalterados) |

---

## 12. Eventos e Persistência

### 12.1 Mapeamento Evento → Tabela

| Evento | Tabela(s) afetada(s) | Operação |
|---|---|---|
| `UserCreated` | users.users, users.user_roles | INSERT |
| `ProfileCreated` | profiles.profiles, profiles.profile_locations | INSERT |
| `ProfileUpdated` | profiles.profiles, profiles.profile_versions | UPDATE + INSERT version |
| `ProfileApproved` | profiles.profiles (status) | UPDATE |
| `PhotoUploaded` | media.photos, media.media_assets | INSERT |
| `VideoUploaded` | media.videos, media.media_assets | INSERT |
| `MomentPublished` | media.moments | INSERT |
| `ReviewCreated` | engagement.reviews | INSERT |
| `ReviewApproved` | engagement.reviews, engagement.review_summaries | UPDATE + UPSERT |
| `LikeCreated` | engagement.likes, media.moments (like_count) | INSERT + UPDATE projection |
| `ShareCreated` | engagement.shares | INSERT |
| `ProfileViewed` | analytics.analytics_events | INSERT |
| `HotScoreUpdated` | analytics.hot_scores, analytics.hot_score_history | UPSERT + INSERT |
| `HotScoreAdjusted` | analytics.hot_score_adjustments | INSERT |
| `RankingUpdated` | analytics.ranking_entries | UPSERT batch |
| `NotificationCreated` | platform.notifications | INSERT |
| `MessageSent` | platform.messages, platform.conversations | INSERT + UPDATE |
| `ContentReported` | platform.reports | INSERT |
| `SettingChanged` | platform.settings, platform.setting_snapshots | UPDATE + INSERT |
| `*Approved/Rejected` | platform.moderation_actions | INSERT |

### 12.2 Consistência Eventual

| Padrão | Descrição |
|---|---|
| Write principal | Transação no módulo dono |
| Projeções | Handler assíncrono (eventual consistency) |
| Idempotência | Handlers verificam duplicata antes de INSERT |
| Falha em projeção | Retry 3x → DLQ → alerta |

---

## 13. Critérios de Aceitação

### 13.1 Estratégia e Organização

| ID | Critério | Prioridade |
|---|---|---|
| CA-DB-01 | PostgreSQL 16+ com 8 schemas definidos | Must |
| CA-DB-02 | Ownership por módulo documentado | Must |
| CA-DB-03 | Zero FK cross-schema | Must |
| CA-DB-04 | Convenções de nomenclatura seguidas | Must |
| CA-DB-05 | UUID v7 como PK padrão | Should |

### 13.2 Entidades

| ID | Critério | Prioridade |
|---|---|---|
| CA-DB-10 | Todas as entidades dos Docs 3–8 modeladas | Must |
| CA-DB-11 | Soft delete em entidades de negócio | Must |
| CA-DB-12 | Timestamps universais (created_at, updated_at) | Must |
| CA-DB-13 | Read Models identificados e documentados | Must |

### 13.3 Índices e Performance

| ID | Critério | Prioridade |
|---|---|---|
| CA-DB-20 | Índices definidos para busca, geo, status, data | Must |
| CA-DB-21 | GiST para coordenadas geográficas | Must |
| CA-DB-22 | Meilisearch como índice primário de busca | Must |
| CA-DB-23 | Particionamento preparado para analytics_events | Should |

### 13.4 Cache e Histórico

| ID | Critério | Prioridade |
|---|---|---|
| CA-DB-30 | Estratégia de cache Redis documentada | Must |
| CA-DB-31 | Invalidação por eventos definida | Must |
| CA-DB-32 | Retenção e jobs de limpeza configuráveis | Must |
| CA-DB-33 | Histórico: profile_versions, hot_score_history, audit | Must |

### 13.5 Segurança e Auditoria

| ID | Critério | Prioridade |
|---|---|---|
| CA-DB-40 | Dados sensíveis criptografados | Must |
| CA-DB-41 | Separação público/privado documentada | Must |
| CA-DB-42 | audit_entries append-only | Must |
| CA-DB-43 | Backup diário + PITR | Must |

### 13.6 Migrações

| ID | Critério | Prioridade |
|---|---|---|
| CA-DB-50 | Prisma multi-schema configurado | Must |
| CA-DB-51 | Migrações versionadas e imutáveis | Must |
| CA-DB-52 | Rollback documentado por migração | Must |
| CA-DB-53 | Seeds por schema | Should |

### 13.7 Arquitetura

| ID | Critério | Prioridade |
|---|---|---|
| CA-DB-60 | Repository pattern — zero query fora de repositories | Must |
| CA-DB-61 | Sem regra de negócio em triggers/procedures | Must |
| CA-DB-62 | Preparado para separação em microsserviços | Should |
| CA-DB-63 | tenant_id preparado em tabelas core | Should |

---

## Apêndice A — Inventário de Tabelas

| Schema | Tabelas | Total |
|---|---|---|
| auth | credentials, sessions, password_reset_tokens | 3 |
| users | users, roles, user_roles, permission_overrides, user_settings | 5 |
| profiles | profiles, profile_pricing, profile_availability, profile_locations, profile_versions, profile_tag_order | 6 |
| media | media_assets, media_variants, media_processing_jobs, photos, videos, moments, video_gallery_entries | 7 |
| engagement | comments, reviews, review_summaries, likes, shares | 5 |
| analytics | analytics_events, analytics_aggregates_daily, hot_scores, hot_score_events, hot_score_history, hot_score_adjustments, ranking_snapshots, ranking_entries | 8 |
| cms | tags, tag_categories, cms_pages, seo_metadata | 4 |
| platform | notifications, notification_preferences, conversations, messages, message_attachments, moderation_actions, reports, verification_requests, settings, setting_snapshots, audit_entries | 11 |
| **Total** | | **49** |

---

## Apêndice B — Referências Cruzadas

| Documento | Relação |
|---|---|
| [Documento 1 — Arquitetura](../arquitetura/DOCUMENTO-01-ARQUITETURA-DA-PLATAFORMA.md) | §6 Estratégia de Banco |
| [Documento 5 — Engajamento](./DOCUMENTO-05-MODULOS-ENGAJAMENTO-INTELIGENCIA-DESCOBERTA.md) | analytics, hot_score, rankings |
| [Documento 6 — Conteúdo](./DOCUMENTO-06-CONTEUDO-MIDIA-E-INTERACOES.md) | media, engagement |
| [Documento 7 — Comunicação](./DOCUMENTO-07-COMUNICACAO-NOTIFICACOES-E-MENSAGERIA.md) | notifications, messaging |
| [Documento 8 — Auth](./DOCUMENTO-08-AUTENTICACAO-USUARIOS-PERMISSOES-E-SEGURANCA.md) | auth, users |

---

> **Este documento é a especificação oficial da arquitetura de dados da plataforma.**  
> Toda implementação de persistência, migração e acesso a dados deve seguir estas definições.  
> Desvios exigem atualização formal deste documento e validação contra o Documento 1.
