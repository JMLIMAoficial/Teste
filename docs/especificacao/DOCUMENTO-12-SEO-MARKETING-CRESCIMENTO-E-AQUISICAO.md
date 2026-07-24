# Documento 12 — SEO, Marketing, Crescimento e Aquisição

**Versão:** 1.0.0  
**Status:** Especificação Oficial  
**Última atualização:** 2026-07-09  
**Dependências:**
- [Documento 1 — Arquitetura da Plataforma](../arquitetura/DOCUMENTO-01-ARQUITETURA-DA-PLATAFORMA.md)
- [Documento 2 — Área Pública](./DOCUMENTO-02-AREA-PUBLICA.md)
- [Documento 4 — Área Administrativa](./DOCUMENTO-04-AREA-ADMINISTRATIVA.md)
- [Documento 5 — Engajamento e Inteligência](./DOCUMENTO-05-MODULOS-ENGAJAMENTO-INTELIGENCIA-DESCOBERTA.md)
- [Documento 9 — Banco de Dados](./DOCUMENTO-09-BANCO-DE-DADOS-MODELAGEM-E-ESTRUTURA-DE-DADOS.md)
- [Documento 11 — Infraestrutura](./DOCUMENTO-11-INFRAESTRUTURA-DEVOPS-PERFORMANCE-E-ESCALABILIDADE.md)  
**Escopo:** SEO técnico, crescimento orgânico, marketing analytics, conversão, landing pages, retenção e critérios de aceitação

---

## Sumário

1. [Visão Geral e Princípios](#1-visão-geral-e-princípios)
2. [Arquitetura dos Módulos de Growth](#2-arquitetura-dos-módulos-de-growth)
3. [SEO Técnico](#3-seo-técnico)
4. [SEO de Perfis](#4-seo-de-perfis)
5. [Dados Estruturados (Schema.org)](#5-dados-estruturados-schemaorg)
6. [Landing Pages Dinâmicas](#6-landing-pages-dinâmicas)
7. [Sitemap Inteligente](#7-sitemap-inteligente)
8. [Performance SEO](#8-performance-seo)
9. [Analytics de Marketing](#9-analytics-de-marketing)
10. [Rastreamento de Campanhas](#10-rastreamento-de-campanhas)
11. [Conversão de Visitantes](#11-conversão-de-visitantes)
12. [Programa de Crescimento](#12-programa-de-crescimento)
13. [Sistema de Landing Pages (CMS)](#13-sistema-de-landing-pages-cms)
14. [Conteúdo Institucional e Blog](#14-conteúdo-institucional-e-blog)
15. [Retenção e Personalização](#15-retenção-e-personalização)
16. [Testes A/B](#16-testes-ab)
17. [Dashboard de Growth](#17-dashboard-de-growth)
18. [Gestão de Metadados](#18-gestão-de-metadados)
19. [Integração com Redes Sociais](#19-integração-com-redes-sociais)
20. [Segurança SEO](#20-segurança-seo)
21. [Eventos do Sistema](#21-eventos-do-sistema)
22. [Critérios de Aceitação](#22-critérios-de-aceitação)

---

## 1. Visão Geral e Princípios

### 1.1 Objetivo

Definir a estratégia e a arquitetura para **crescimento orgânico, aquisição, conversão e retenção** da plataforma, preparando-a para:

| Capacidade | Manifestação |
|---|---|
| **Crescimento orgânico** | SEO técnico, landing pages dinâmicas, sitemap inteligente |
| **Indexação** | Meta tags, Schema.org, canonical, robots configuráveis |
| **Aquisição** | Rastreamento UTM, campanhas, integração GA/GTM |
| **Conversão** | Funis medidos, CTAs estratégicos, cadastro de acompanhante |
| **Retenção** | Favoritos, recomendações, notificações, histórico |
| **Análise** | Dashboard de growth, jornada do visitante, origem de tráfego |

### 1.2 Princípios Obrigatórios (Documento 1)

| Princípio | Aplicação |
|---|---|
| **Módulos desacoplados** | SEO, CMS, Analytics e Growth são módulos independentes |
| **Sem regra de negócio no front-end** | UI dispara eventos; services calculam métricas e metadados |
| **Event-driven** | Atualizações de SEO, sitemap e cache via eventos de domínio |
| **Configuração dinâmica** | Indexação, templates e limites via Settings |
| **Read Models** | Landing pages e dashboards consomem projeções, não JOINs |
| **API pública por interface** | `ISeoService`, `ICmsService`, `IAnalyticsService`, `IGrowthService` |

### 1.3 Posicionamento Arquitetural

```
┌─────────────────────────────────────────────────────────────────┐
│                    ÁREA PÚBLICA (apps/web)                       │
│  SeoHead │ Tracking hooks │ ShareButton │ LandingPageView       │
│         ★ Apenas renderização + emissão de eventos ★            │
└────────────────────────────┬────────────────────────────────────┘
                             │ BFF / API Routes
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
   ┌─────────┐         ┌──────────┐         ┌──────────┐
   │   SEO   │         │   CMS    │         │ Analytics │
   │ Module  │         │  Module  │         │  Module   │
   └────┬────┘         └────┬─────┘         └─────┬────┘
        │                   │                      │
        │              ┌────┴────┐                 │
        │              │ Growth  │◄───────────────┘
        │              │ Module  │   (projeções)
        └──────────────┴────┬────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
         Profiles      Search        Settings
         Tags          Rankings      Cache
```

### 1.4 O Que Evitar

| Anti-padrão | Alternativa |
|---|---|
| Meta tags hardcoded em páginas | `ISeoService.getMetaForPage()` |
| Google Analytics no componente com lógica | Hook `useTracking()` → BFF → Analytics |
| Landing page com HTML estático no front | CMS module + ISR |
| Sitemap manual | Job agendado no módulo SEO |
| Métricas de conversão calculadas no React | Growth module + aggregates |
| Páginas duplicadas sem canonical | Canonical obrigatório em toda URL pública |

---

## 2. Arquitetura dos Módulos de Growth

### 2.1 Módulos e Responsabilidades

| Módulo | Localização | Responsabilidade | Interface pública |
|---|---|---|---|
| **SEO** | `packages/modules/seo/` | Meta tags, sitemap, robots, Schema.org, canonical | `ISeoService` |
| **CMS** | `packages/modules/cms/` | Páginas institucionais, landing pages, blog (futuro) | `ICmsService` |
| **Analytics** | `packages/modules/analytics/` | Coleta de eventos comportamentais, agregações | `IAnalyticsService` |
| **Growth** | `packages/modules/growth/` | Campanhas, UTM, conversões, A/B, referrals, favoritos | `IGrowthService` |

### 2.2 Módulo Growth — Escopo

O módulo **Growth** é a camada de **marketing e aquisição** que consome eventos do Analytics e produz projeções de negócio.

| Responsabilidade | Entidades |
|---|---|
| Atribuição de tráfego | `TrafficSource`, `UtmSession` |
| Campanhas | `Campaign`, `CampaignLink` |
| Conversões | `Conversion`, `FunnelStep` |
| Experimentos A/B | `Experiment`, `ExperimentVariant`, `ExperimentResult` |
| Programa de indicação (futuro) | `Referral`, `ReferralCode` |
| Favoritos (futuro) | `Favorite`, `FavoriteActivity` |
| Dashboard | `GrowthMetric`, `GrowthReport` |

### 2.3 Dependências Permitidas

```
SEO ──► Profiles (leitura via interface), CMS, Settings
CMS ──► SEO (metadados), Settings
Analytics ──► (reativo — sem dependência upstream)
Growth ──► Analytics (via eventos e leitura agregada), CMS, Settings
Profiles ──► SEO (evento ProfileUpdated)
Search ──► SEO (landing pages de busca)
```

> Growth **não** acessa repositories de outros módulos. Consome `IAnalyticsService` e eventos.

### 2.4 Persistência (Doc 9)

| Módulo | Schema | Tabelas principais |
|---|---|---|
| SEO | `cms` | `seo_metadata` |
| CMS | `cms` | `cms_pages`, `tag_categories`, `tags` |
| Analytics | `analytics` | `analytics_events`, `analytics_aggregates_daily` |
| Growth | `analytics` (ou `platform` futuro) | `campaigns`, `conversions`, `experiments`, `utm_sessions`, `favorites` |

---

## 3. SEO Técnico

### 3.1 Arquitetura SEO-First

Toda página pública deve ser construída com **indexação como requisito**, não como afterthought.

| Requisito | Implementação |
|---|---|
| URLs amigáveis | App Router com slugs semânticos |
| Meta Title | `ISeoService` → `SeoHead` component |
| Meta Description | Template configurável + override por entidade |
| Open Graph | `og:title`, `og:description`, `og:image`, `og:url`, `og:type` |
| Twitter Cards | `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image` |
| Canonical URLs | Absolutas, uma por página |
| Sitemap XML | `/sitemap.xml` + sitemaps segmentados |
| Robots.txt | `/robots.txt` configurável via Settings |
| Structured Data | JSON-LD via `SeoMetaDTO.schema` |
| Hreflang | Preparado para i18n futuro |

### 3.2 Fluxo de Metadados

```
Página renderiza
        │
        ▼
BFF chama ISeoService.getMetaForPage(pageType, params)
        │
        ├── Cache Redis (TTL 15 min)
        ├── Se miss: compor de templates + dados da entidade
        └── Retorna SeoMetaDTO
        │
        ▼
Componente SeoHead renderiza <head>
        │
        ▼
Next.js Metadata API (SSR/ISR) para crawlers
```

### 3.3 Padrões de URL

| Página | Padrão | Indexável | Canonical |
|---|---|---|---|
| Home | `/` | Sim | `/` |
| Perfil | `/perfil/{slug}` | Condicional | URL absoluta do perfil |
| Busca | `/busca` | Não (`noindex`) | `/busca` |
| Busca filtrada | `/busca?{params}` | Não | `/busca` (sem params) |
| Categoria/Tag | `/categoria/{tag-slug}` | Sim | URL da categoria |
| Cidade | `/cidade/{city-slug}` | Sim | URL da cidade |
| Rankings | `/rankings` | Sim | `/rankings` |
| Rankings tipo | `/rankings/{type}` | Sim | URL específica |
| Vídeos | `/videos` | Configurável | `/videos` |
| Momentos | `/momentos` | Configurável | `/momentos` |
| Vídeo (futuro) | `/videos/{slug}` | Configurável | URL do vídeo |
| Institucional | `/{slug}` | Sim | URL da página |
| Landing campanha | `/lp/{slug}` | Configurável | URL da landing |
| Login | `/login` | Não | — |
| Admin | `/admin/*` | Não (robots + auth) | — |

### 3.4 Regras de Slug

| ID | Regra |
|---|---|
| RN-URL-001 | Lowercase, hífens, sem acentos nem caracteres especiais |
| RN-URL-002 | Slugs imutáveis após publicação; alteração gera redirect 301 |
| RN-URL-003 | Slug único por entidade (perfil, tag, cidade, landing) |
| RN-URL-004 | Máximo 100 caracteres |
| RN-URL-005 | Gerados pelo módulo dono da entidade (Profiles, CMS, Tags) |

### 3.5 Meta Tags — Template Global

| Tag | Fonte | Fallback |
|---|---|---|
| `title` | Template por `pageType` + variáveis | `{siteName}` |
| `description` | Template ou campo da entidade | Settings `seo.default_description` |
| `og:image` | Imagem da entidade ou institucional | Settings `seo.default_og_image` |
| `robots` | Regra de indexação da entidade | `index, follow` |
| `canonical` | URL absoluta calculada | — |

### 3.6 Robots.txt

Gerado dinamicamente pelo módulo SEO:

| Diretiva | Valor |
|---|---|
| `User-agent: *` | — |
| `Allow` | `/`, `/perfil/`, `/categoria/`, `/cidade/`, `/rankings`, `/videos`, `/momentos` |
| `Disallow` | `/admin/`, `/api/`, `/login`, `/companion/` |
| `Disallow` | `/busca?*` (query strings de busca) |
| `Sitemap` | `https://{domain}/sitemap.xml` |

Configurável via Settings: `seo.robots.rules` (JSON).

### 3.7 Open Graph e Twitter Cards

| Propriedade OG | Valor padrão |
|---|---|
| `og:site_name` | Settings `seo.site_name` |
| `og:locale` | `pt_BR` |
| `og:type` | `website` (home), `profile` (perfil), `article` (blog futuro) |
| `og:image:width` | 1200 |
| `og:image:height` | 630 |

| Propriedade Twitter | Valor |
|---|---|
| `twitter:card` | `summary_large_image` |
| `twitter:site` | Configurável (futuro) |

---

## 4. SEO de Perfis

### 4.1 URL do Perfil

```
/perfil/{slug}
```

Exemplo: `/perfil/maria-santos`

- `slug` gerado pelo módulo Profiles na criação.
- Único, normalizado, imutável.
- Redirect 301 se slug legado existir.

### 4.2 Campos SEO Configuráveis

| Campo | Onde configurar | Quem edita | Default |
|---|---|---|---|
| `seoTitle` | Perfil (companion) ou admin | Acompanhante / Admin | `{nome}, {idade} — {cidade} \| {siteName}` |
| `seoDescription` | Perfil | Acompanhante / Admin | Bio truncada (160 chars) |
| `ogImage` | Perfil | Automático (foto capa) ou override | Foto principal aprovada |
| `seoIndexable` | Perfil | Admin | `true` quando aprovado |
| `slug` | Perfil | Sistema (imutável) | Gerado do `displayName` |

Persistência: campos em `profiles.profiles` + `cms.seo_metadata` (projeção).

### 4.3 Condições de Indexação

| Condição | Indexável | Robots |
|---|---|---|
| `status = approved` + `isPublic = true` + `seoIndexable = true` | Sim | `index, follow` |
| `status = pending` | Não | `noindex, nofollow` |
| `status = rejected` | Não | `noindex, nofollow` |
| `status = blocked` | Não | `noindex, nofollow` |
| `isPublic = false` | Não | `noindex, nofollow` |
| `seoIndexable = false` (admin) | Não | `noindex, nofollow` |

### 4.4 Meta Tags — Perfil

| Tag | Template |
|---|---|
| Title | `{seoTitle}` ou `{displayName}, {age} — {city} \| {siteName}` |
| Description | `{seoDescription}` ou `Conheça {displayName}, acompanhante em {city}. {bio_resumo}` |
| OG Image | Foto capa (1200×630 crop) ou `seo.ogImage` |
| OG Type | `profile` |
| Canonical | `https://{domain}/perfil/{slug}` |

### 4.5 Atualização de SEO

| Trigger | Ação |
|---|---|
| `ProfileUpdated` | Recalcular metadados; invalidar cache SEO |
| `ProfileApproved` | Habilitar indexação; incluir no sitemap |
| `PhotoApproved` (capa) | Atualizar `og:image` |
| `ReviewApproved` | Atualizar Schema.org AggregateRating |
| `SEOUpdated` (manual) | Recalcular + invalidar cache |

---

## 5. Dados Estruturados (Schema.org)

### 5.1 Tipos Implementados

| Página | Schema.org Type | Campos principais |
|---|---|---|
| Perfil | `Person` | name, description, image, address |
| Perfil + reviews | `Person` + `AggregateRating` | ratingValue, reviewCount |
| Vídeo (futuro) | `VideoObject` | name, description, thumbnailUrl, uploadDate, duration |
| Localização | `PostalAddress` | addressLocality, addressRegion (sem rua/CEP) |
| Breadcrumbs | `BreadcrumbList` | itemListElement |
| Institucional | `WebPage` | name, description, url |
| FAQ | `FAQPage` | mainEntity (Question/Answer) |
| Rankings | `ItemList` | itemListElement (posição + perfil) |

### 5.2 Perfil — JSON-LD Completo

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "{displayName}",
  "description": "{bio}",
  "image": "{photoUrl}",
  "url": "https://{domain}/perfil/{slug}",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "{city}",
    "addressRegion": "{state}",
    "addressCountry": "BR"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "{averageRating}",
    "reviewCount": "{reviewCount}",
    "bestRating": 5,
    "worstRating": 1
  }
}
```

> `aggregateRating` incluído apenas quando `reviewCount >= 1` e reviews aprovadas.

### 5.3 Breadcrumbs — JSON-LD

| Página | Breadcrumb |
|---|---|
| Perfil | Home > {cidade} > {nome} |
| Categoria | Home > Categorias > {tag} |
| Cidade | Home > Cidades > {cidade} |
| Ranking | Home > Rankings > {tipo} |

### 5.4 Regras

| ID | Regra |
|---|---|
| RN-SCHEMA-001 | JSON-LD gerado pelo módulo SEO, não no front-end |
| RN-SCHEMA-002 | Nunca expor endereço completo, CEP ou coordenadas |
| RN-SCHEMA-003 | AggregateRating apenas com reviews moderadas e aprovadas |
| RN-SCHEMA-004 | Validar JSON-LD via Google Rich Results Test em CI (staging) |

---

## 6. Landing Pages Dinâmicas

### 6.1 Tipos de Landing Page

| Tipo | URL | Gerada por | Conteúdo |
|---|---|---|---|
| **Por cidade** | `/cidade/{city-slug}` | SEO + GeoLocation + Profiles | Perfis da cidade, texto SEO |
| **Por categoria/tag** | `/categoria/{tag-slug}` | SEO + Tags + Search | Perfis com tag, descrição |
| **Por ranking** | `/rankings/{type}` | SEO + Rankings | Top perfis, métricas |
| **Galeria de vídeos** | `/videos` | SEO + Video Gallery | Grid de vídeos públicos |
| **Campanha (CMS)** | `/lp/{slug}` | CMS + Growth | Conteúdo editorial + CTA |
| **Busca popular (futuro)** | `/busca/{query-slug}` | Search + SEO | Resultados pré-filtrados indexáveis |

### 6.2 Landing Page — Cidade

| Elemento | Fonte |
|---|---|
| Title | `Acompanhantes em {cidade} — {siteName}` |
| H1 | `Acompanhantes em {cidade}` |
| Descrição SEO | Template + contagem de perfis |
| Grid de perfis | `IProfilesService.listByCity(city, pagination)` |
| Schema.org | `ItemList` com perfis |
| Filtros | Tags, preferência (client-side, não indexados) |
| CTA | "Cadastre-se" → `/login` |

**Regra:** Página gerada apenas para cidades com ≥ 3 perfis aprovados (configurável: `seo.landing.min_profiles`).

### 6.3 Landing Page — Categoria

| Elemento | Fonte |
|---|---|
| Title | `{tagName} — Acompanhantes \| {siteName}` |
| H1 | `Acompanhantes — {tagName}` |
| Grid | `ISearchService.search({ tags: [tagSlug] })` |
| Schema.org | `ItemList` |
| Texto introdutório | CMS override ou template automático |

### 6.4 Renderização

| Aspecto | Especificação |
|---|---|
| Estratégia | ISR (revalidate: 300s) |
| Cache | Redis `landing:{type}:{slug}` TTL 300s |
| Invalidação | `ProfileApproved`, `ProfileUpdated`, `TagUpdated`, `RankingUpdated` |
| Paginação | Cursor-based; página 1 indexável, demais com `rel=next/prev` |

---

## 7. Sitemap Inteligente

### 7.1 Estrutura

| Arquivo | Conteúdo | Atualização |
|---|---|---|
| `/sitemap.xml` | Índice de sitemaps | Diário |
| `/sitemap-pages.xml` | Home, institucional, rankings | Semanal |
| `/sitemap-profiles.xml` | Perfis aprovados | Diário |
| `/sitemap-categories.xml` | Tags/categorias ativas | Semanal |
| `/sitemap-cities.xml` | Cidades com perfis | Semanal |
| `/sitemap-videos.xml` | Vídeos públicos (se indexável) | Diário |
| `/sitemap-landings.xml` | Landing pages CMS | Sob demanda |

### 7.2 Prioridades e Frequência

| Tipo | Priority | changefreq | Critério |
|---|---|---|---|
| Home | 1.0 | daily | — |
| Perfis premium/destaque | 0.9 | daily | `isPremium \|\| isFeatured` |
| Perfis aprovados | 0.8 | daily | `status=approved` |
| Cidades (top 20) | 0.7 | weekly | Por contagem de perfis |
| Categorias/tags | 0.6 | weekly | `isActive` |
| Rankings | 0.6 | daily | — |
| Vídeos | 0.5 | daily | Se `seo.index.videos=true` |
| Institucional | 0.3 | monthly | CMS pages |
| Landing pages CMS | 0.5 | weekly | Campanhas ativas |

### 7.3 Geração Automática

| Aspecto | Especificação |
|---|---|
| Job | `seo.sitemap.generate` — diário às 03:00 |
| Trigger adicional | `ProfileApproved`, `CmsPagePublished`, `SEOUpdated` |
| Armazenamento | Filesystem temporário ou S3; servido via API route |
| Limite | Máx. 50.000 URLs por sitemap (split automático) |
| Exclusão | Perfis não aprovados, bloqueados, `noindex` |
| Ping | Notificar Google Search Console após regeneração (futuro) |

### 7.4 Interface

```typescript
// Contrato público (referência — não é código de implementação)
ISeoService.generateSitemap(): Promise<SitemapIndex>
ISeoService.getSitemapUrl(type: SitemapType): string
```

---

## 8. Performance SEO

### 8.1 Core Web Vitals — Alvos (Doc 11)

| Métrica | Alvo (p75) | Impacto SEO |
|---|---|---|
| LCP | < 2.5s | Crítico |
| INP | < 200ms | Crítico |
| CLS | < 0.1 | Crítico |
| TTFB | < 300ms | Alto |
| FCP | < 1.5s | Médio |

### 8.2 Estratégias por Página

| Página | Renderização | Justificativa SEO |
|---|---|---|
| Home | ISR (60s) | Conteúdo dinâmico + crawlability |
| Perfil | ISR (120s) | Alta frequência + meta tags SSR |
| Landing cidade/tag | ISR (300s) | Conteúdo semi-estático |
| Institucional | SSG/ISR | Máxima velocidade |
| Busca | CSR + noindex | Interatividade > indexação |

### 8.3 Otimizações Obrigatórias

| Área | Técnica |
|---|---|
| Imagens | WebP/AVIF, `next/image`, lazy load, blur_hash |
| JavaScript | Code splitting, budget < 200KB first load |
| CSS | Tailwind purge, critical CSS |
| Fonts | `next/font` com `display: swap` |
| Preload | LCP image (foto capa do primeiro card/perfil) |
| Compressão | Brotli via CDN |
| Caching | CDN + Redis + ISR |

### 8.4 Renderização para Crawlers

| Requisito | Implementação |
|---|---|
| SSR/ISR para conteúdo indexável | Next.js App Router |
| Meta tags no HTML inicial | `generateMetadata()` + `SeoHead` |
| JSON-LD no HTML inicial | Inclusão server-side |
| Não depender de JS para conteúdo principal | Perfis e landing pages renderizados no servidor |
| Teste | Google Search Console + Lighthouse CI |

---

## 9. Analytics de Marketing

### 9.1 Visão Geral

O **Analytics de Marketing** é a camada de inteligência de aquisição, implementada como extensão do módulo **Growth** consumindo eventos do módulo **Analytics**.

```
Visitante → Evento (Analytics) → Agregação (Analytics) → Projeção (Growth) → Dashboard
```

### 9.2 Dados Capturados

| Dado | Captura | Armazenamento |
|---|---|---|
| Origem do visitante | `referrer` + UTM no primeiro acesso | `utm_sessions` |
| Campanha | `utm_campaign` | `campaigns` + sessão |
| UTM completo | `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` | `utm_sessions` |
| Página de entrada | `landingPage` no `SiteVisited` | `analytics_events` |
| Sessão | Cookie `visitor_session` (UUID, 30 dias) | Cookie + Redis |
| Jornada | Sequência de eventos por `sessionId` | `analytics_events` |
| Conversões | Eventos de conversão mapeados | `conversions` |
| Dispositivo | `userAgent` parseado | Metadata do evento |

### 9.3 Sessão e Atribuição

| Regra | Especificação |
|---|---|
| Cookie | `visitor_session` — UUID, 30 dias, HttpOnly, SameSite=Lax |
| UTM capture | No primeiro `SiteVisited` da sessão |
| Atribuição | First-touch (sessão) + last-touch (conversão) |
| Persistência UTM | Redis `utm:{sessionId}` TTL 30 dias |
| Cross-device | Não na v1; preparar `visitorId` unificado (futuro) |

### 9.4 Eventos de Marketing

| Evento | Módulo emissor | Trigger | Payload mínimo |
|---|---|---|---|
| `PageViewed` | Analytics | Navegação de página | `pageType`, `pagePath`, `sessionId`, `referrer` |
| `ProfileViewed` | Analytics | Abertura de perfil | `profileId`, `sessionId`, `source` |
| `SearchPerformed` | Analytics | Submissão de busca | `query`, `filters`, `resultCount`, `sessionId` |
| `WhatsAppClicked` | Analytics | Clique no botão WhatsApp | `profileId`, `sessionId` |
| `SignupStarted` | Growth | Início do formulário de cadastro | `sessionId`, `source` |
| `SignupCompleted` | Growth | Cadastro finalizado | `userId`, `sessionId`, `source` |
| `ProfileApproved` | Profiles | Admin aprova perfil | `profileId`, `userId` |
| `ContentShared` | Analytics | Compartilhamento | `contentType`, `contentId`, `channel`, `sessionId` |

> `PageViewed` unifica `SiteVisited` (primeira página) e navegações subsequentes. `SearchPerformed` alinha com `ProfileSearched` do Doc 5.

### 9.5 Mapeamento Doc 5 → Marketing

| Evento Doc 5 | Evento Marketing | Notas |
|---|---|---|
| `SiteVisited` | `PageViewed` | Primeira página da sessão |
| `ProfileSearched` | `SearchPerformed` | Mesmo evento, nome de marketing |
| `ShareCreated` | `ContentShared` | Unificação |
| `CardClicked` | `PageViewed` + metadata | Mantido no Analytics; útil para funil |
| `FilterApplied` | Metadata de `SearchPerformed` | Incorporado |

### 9.6 Pipeline de Coleta

```
UI (hook useTracking)
        │
        ▼
POST /api/public/analytics/track
        │
        ├── Validação Zod
        ├── Rate limit (60/min por session)
        ├── Enriquecimento (UTM, referrer, device)
        └── AnalyticsService.track()
                │
                ├── Persistir analytics_events
                ├── Emitir evento de domínio
                └── Growth handler (se conversão/atribuição)
```

**Regra:** Front-end **nunca** persiste eventos diretamente. Sempre via BFF.

---

## 10. Rastreamento de Campanhas

### 10.1 Parâmetros UTM

| Parâmetro | Exemplo | Uso |
|---|---|---|
| `utm_source` | `google`, `instagram`, `email` | Origem |
| `utm_medium` | `cpc`, `social`, `newsletter` | Meio |
| `utm_campaign` | `lancamento-sp` | Campanha |
| `utm_term` | `acompanhantes premium` | Termo (paid) |
| `utm_content` | `banner-hero` | Variante criativa |

### 10.2 Entidade Campaign

| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| name | string | Nome da campanha |
| slug | string | Identificador URL |
| utmSource | string | UTM source padrão |
| utmMedium | string | UTM medium padrão |
| utmCampaign | string | UTM campaign |
| landingPageId | UUID? | Landing page CMS associada |
| startDate | date | Início |
| endDate | date? | Fim (null = contínua) |
| status | enum | draft, active, paused, ended |
| budget | decimal? | Orçamento (futuro) |
| createdBy | UUID | Admin |

### 10.3 Integrações Externas

| Ferramenta | Integração | Dados |
|---|---|---|
| **Google Analytics 4** | GTM dataLayer + gtag | Eventos de página, conversão |
| **Google Tag Manager** | Container no layout público | Tags configuráveis sem deploy |
| **Google Search Console** | Sitemap ping + verificação DNS | Indexação, queries |
| **Meta Pixel** | Via GTM (futuro) | Conversões paid social |
| **TikTok Pixel** | Via GTM (futuro) | Conversões |
| **Hotjar/Clarity** | Script via GTM (futuro) | Heatmaps |

### 10.4 Google Tag Manager — Estrutura

| Evento dataLayer | Trigger GTM | Tags destino |
|---|---|---|
| `page_view` | Toda navegação | GA4 |
| `profile_view` | Visualização de perfil | GA4 + Pixel (futuro) |
| `search` | Busca realizada | GA4 |
| `whatsapp_click` | Clique WhatsApp | GA4 + conversão |
| `signup_start` | Início cadastro | GA4 + conversão |
| `signup_complete` | Cadastro concluído | GA4 + conversão |
| `share` | Compartilhamento | GA4 |

**Regra:** GTM carregado apenas na área pública. Admin e companion **sem** pixels de marketing.

### 10.5 Configuração

| Setting | Descrição |
|---|---|
| `marketing.gtm.container_id` | GTM-XXXXXXX |
| `marketing.ga4.measurement_id` | G-XXXXXXXX |
| `marketing.pixels.enabled` | `false` (v1) |
| `marketing.utm.cookie_days` | 30 |

---

## 11. Conversão de Visitantes

### 11.1 Funis de Conversão

#### Funil Principal — Visitante → Contato

```
PageViewed → ProfileViewed → WhatsAppClicked
```

#### Funil de Aquisição — Visitante → Acompanhante

```
PageViewed → SignupStarted → SignupCompleted → ProfileApproved
```

#### Funil de Engajamento — Visitante → Retorno

```
PageViewed → ProfileViewed → ContentShared → PageViewed (retorno)
```

### 11.2 Pontos de Conversão

| Conversão | Evento | Valor |
|---|---|---|
| Contato WhatsApp | `WhatsAppClicked` | Alto |
| Início de cadastro | `SignupStarted` | Médio |
| Cadastro completo | `SignupCompleted` | Alto |
| Perfil aprovado | `ProfileApproved` | Máximo |
| Compartilhamento | `ContentShared` | Médio |
| Retorno (7 dias) | `PageViewed` com sessão recorrente | Médio |

### 11.3 CTAs Estratégicos

| Local | CTA | Conversão medida |
|---|---|---|
| Home — hero | "Encontrar acompanhantes" | `SearchPerformed` |
| Home — seção cadastro | "Anuncie seu perfil" | `SignupStarted` |
| Perfil | Botão WhatsApp | `WhatsAppClicked` |
| Perfil | Compartilhar | `ContentShared` |
| Landing cidade | "Cadastre-se em {cidade}" | `SignupStarted` |
| Footer | "Seja acompanhante" | `SignupStarted` |
| Pós-cadastro | "Complete seu perfil" | Retenção (companion) |

### 11.4 Métricas de Conversão

| Métrica | Cálculo |
|---|---|
| Taxa de conversão (contato) | `WhatsAppClicked / ProfileViewed` |
| Taxa de cadastro | `SignupCompleted / PageViewed` |
| Taxa de aprovação | `ProfileApproved / SignupCompleted` |
| Conversão por origem | Funil filtrado por `utm_source` |
| Conversão por página | Funil filtrado por `landingPage` |
| Conversão por campanha | Funil filtrado por `utm_campaign` |

### 11.5 Entidade Conversion

| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| type | enum | whatsapp_click, signup, share, return |
| sessionId | string | Sessão do visitante |
| userId | UUID? | Se autenticado |
| profileId | UUID? | Perfil relacionado |
| campaignId | UUID? | Campanha atribuída |
| landingPage | string | Página de entrada da sessão |
| utmSource | string? | UTM source |
| utmMedium | string? | UTM medium |
| utmCampaign | string? | UTM campaign |
| createdAt | timestamp | Momento da conversão |

---

## 12. Programa de Crescimento

### 12.1 Estrutura Preparatória

| Programa | Status | Módulo |
|---|---|---|
| Convites (referral) | Futuro (v2) | Growth |
| Indicações com recompensa | Futuro (v2) | Growth |
| Afiliados | Futuro (v3) | Growth |
| Parcerias (agências, portals) | Futuro (v3) | Growth |

### 12.2 Referral (Preparação v2)

| Entidade | Campos |
|---|---|
| `ReferralCode` | `userId`, `code` (único), `uses`, `maxUses`, `expiresAt` |
| `Referral` | `referrerId`, `referredId`, `code`, `status`, `rewardApplied` |

| Evento | Quando |
|---|---|
| `ReferralCreated` | Código gerado |
| `ReferralUsed` | Novo cadastro com código |
| `ReferralRewarded` | Recompensa aplicada |

### 12.3 Configuração (Settings)

| Chave | Default | Descrição |
|---|---|---|
| `growth.referral.enabled` | `false` | Habilitar programa |
| `growth.referral.reward_type` | `featured_days` | Tipo de recompensa |
| `growth.referral.reward_value` | `7` | Dias de destaque |
| `growth.referral.max_uses` | `10` | Usos por código |

---

## 13. Sistema de Landing Pages (CMS)

### 13.1 Landing Pages Administráveis

O admin pode criar landing pages de campanha via módulo CMS.

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| title | string | Sim | Título da página (H1) |
| slug | string | Sim | URL: `/lp/{slug}` |
| content | rich text | Sim | Corpo (HTML sanitizado) |
| heroImage | media ref | Não | Imagem principal |
| ctaText | string | Não | Texto do botão |
| ctaUrl | string | Não | Destino do CTA |
| seoTitle | string | Não | Meta title override |
| seoDescription | string | Não | Meta description override |
| ogImage | media ref | Não | Imagem de compartilhamento |
| status | enum | Sim | draft, published, archived |
| campaignId | UUID? | Não | Vínculo com campanha Growth |
| publishedAt | datetime? | — | Data de publicação |

### 13.2 Templates de Landing Page

| Template | Uso | Seções |
|---|---|---|
| `campaign` | Campanhas de marketing | Hero + texto + CTA + grid perfis |
| `city` | SEO por cidade | Hero + grid + FAQ |
| `category` | SEO por categoria | Hero + grid + descrição |
| `institutional` | Sobre, termos, FAQ | Título + conteúdo |
| `conversion` | Cadastro de acompanhante | Hero + benefícios + CTA + formulário |

### 13.3 Fluxo de Publicação

```
Admin cria/edita landing no CMS
        │
        ▼
Salvar como draft → preview
        │
        ▼
Publicar → status = published
        │
        ├── CmsPagePublished event
        ├── SEO: gerar metadados
        ├── Sitemap: incluir URL
        ├── Cache: invalidar
        └── LandingPageCreated event
```

### 13.4 Permissões

| Ação | Permissão |
|---|---|
| Listar páginas | `cms:manage` |
| Criar/editar | `cms:manage` |
| Publicar | `cms:manage` |
| Excluir | `cms:manage` + confirmação |

---

## 14. Conteúdo Institucional e Blog

### 14.1 Páginas Institucionais (CMS)

| Página | Slug | Indexável |
|---|---|---|
| Sobre | `/sobre` | Sim |
| FAQ | `/faq` | Sim (FAQPage schema) |
| Termos de uso | `/termos` | Sim |
| Política de privacidade | `/privacidade` | Sim |
| LGPD | `/privacidade#lgpd` | Sim (anchor) |
| Contato | `/contato` | Sim |

### 14.2 Versionamento CMS

| Aspecto | Especificação |
|---|---|
| Versão | Incremental a cada save |
| Histórico | `cms_page_versions` (futuro) ou campo `version` |
| Preview | `/api/admin/cms/preview/{id}` (auth required) |
| Publicação | Apenas versão publicada visível publicamente |

### 14.3 Blog (Preparação Futura — v2)

| Entidade | Campos |
|---|---|
| `Article` | title, slug, content, excerpt, authorId, categoryId, tags, status, publishedAt |
| `ArticleCategory` | name, slug, description |
| `ArticleTag` | name, slug |

| URL | `/blog/{slug}` |
|---|---|
| Listagem | `/blog` |
| Categoria | `/blog/categoria/{slug}` |
| Schema.org | `Article` + `BreadcrumbList` |
| RSS | `/blog/feed.xml` (futuro) |
| Sitemap | `/sitemap-blog.xml` |

### 14.4 SEO Institucional

| Página | Title template |
|---|---|
| Sobre | `Sobre — {siteName}` |
| FAQ | `Perguntas Frequentes — {siteName}` |
| Termos | `Termos de Uso — {siteName}` |
| Privacidade | `Política de Privacidade — {siteName}` |
| Blog (futuro) | `{articleTitle} — Blog {siteName}` |

---

## 15. Retenção e Personalização

### 15.1 Estratégias de Retenção

| Estratégia | Módulo | Mecanismo |
|---|---|---|
| Notificações | Notifications | Alertas de novos momentos, mensagens |
| Favoritos | Growth (futuro) | Salvar perfis para retorno |
| Histórico | Analytics | Últimos perfis visitados (sessão) |
| Recomendações | Search/Recommendation | Perfis similares, "você pode gostar" |
| Conteúdo novo | Moments, Videos | Feed atualizado, seções "Novos" |
| Email (futuro) | Notifications | Digest semanal de novidades |

### 15.2 Favoritos (Preparação v2)

| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| visitorId | string | Fingerprint ou sessionId |
| profileId | UUID | Perfil salvo |
| createdAt | timestamp | Data que salvou |
| lastAccessedAt | timestamp? | Último acesso via favoritos |
| accessCount | int | Frequência de acesso |

| Regra | Especificação |
|---|---|
| Armazenamento | Cookie + localStorage (v1); conta autenticada (futuro) |
| Limite | 50 favoritos por visitante |
| Evento | `FavoriteAdded`, `FavoriteRemoved`, `FavoriteAccessed` |
| UI | Ícone coração no card e perfil |

### 15.3 Personalização (Preparação)

| Feature | Fonte de dados | Onde exibir |
|---|---|---|
| Últimos visitados | `AnalyticsSessionSignal` | Home, sidebar |
| Recomendações | `IRecommendationService` | Perfil, home |
| Preferências | Tags/cidades visitadas (sessão) | Busca default |
| "Continue explorando" | Histórico de sessão | Home |

**Regra:** Personalização baseada em **sessão** na v1 (sem conta). Com conta (futuro), persistir preferências.

### 15.4 Histórico de Navegação

| Dado | Retenção | Armazenamento |
|---|---|---|
| Perfis visitados (sessão) | Duração da sessão | Redis `history:{sessionId}` |
| Perfis visitados (persistente) | 90 dias | Futuro: com conta |
| Buscas recentes | Sessão | Redis `searches:{sessionId}` max 10 |

---

## 16. Testes A/B

### 16.1 Arquitetura

| Componente | Responsabilidade |
|---|---|
| `Experiment` | Definição do teste |
| `ExperimentVariant` | Variantes (A, B, C...) |
| `ExperimentAssignment` | Qual variante o visitante viu |
| `ExperimentResult` | Métricas por variante |

### 16.2 Entidade Experiment

| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID | PK |
| name | string | Nome do teste |
| description | string | Hipótese |
| type | enum | layout, cta, card, sort, landing |
| status | enum | draft, running, paused, concluded |
| targetMetric | enum | click_rate, conversion_rate, signup_rate |
| trafficAllocation | decimal | % de tráfego no teste (ex.: 0.5) |
| startDate | datetime | Início |
| endDate | datetime? | Fim |
| winnerVariantId | UUID? | Variante vencedora |
| createdBy | UUID | Admin |

### 16.3 O Que Pode Ser Testado

| Elemento | Variantes exemplo |
|---|---|
| Layout home | Grid 3 col vs 4 col |
| CTA hero | "Buscar" vs "Explorar" |
| Card perfil | Com foto hover vs sem |
| Ordenação busca | Hot Score vs Premium first |
| Landing page | Template A vs Template B |

### 16.4 Fluxo

```
Admin cria experimento (draft)
        │
        ▼
Ativar → ExperimentStarted event
        │
        ▼
Visitante acessa página
        │
        ├── GrowthService.assignVariant(experimentId, sessionId)
        ├── Persistir assignment
        └── Retornar variante para UI
        │
        ▼
UI renderiza variante (via props, não lógica)
        │
        ▼
Eventos de interação medidos por variante
        │
        ▼
Admin conclui → calcular resultado → declarar vencedor
```

### 16.5 Regras

| ID | Regra |
|---|---|
| RN-AB-001 | Variante decidida no server/BFF, não no client |
| RN-AB-002 | Assignment sticky por `sessionId` |
| RN-AB-003 | Máximo 2 experimentos simultâneos por página |
| RN-AB-004 | Experimento precisa de significância mínima (configurável) |
| RN-AB-005 | UI recebe `variantId` via props — sem if/else de negócio |

---

## 17. Dashboard de Growth

### 17.1 Localização

| Superfície | Rota | Permissão |
|---|---|---|
| Admin | `/admin/growth` | `analytics:read` |
| Admin (campanhas) | `/admin/growth/campanhas` | `analytics:read` |
| Admin (experimentos) | `/admin/growth/experimentos` | `analytics:read` |

### 17.2 Indicadores Principais

| Indicador | Visualização | Período |
|---|---|---|
| Visitantes (únicos) | MetricCard + sparkline | 7d, 30d, 90d |
| Page views | MetricCard | 7d, 30d |
| Cadastros iniciados | MetricCard + taxa | 30d |
| Cadastros completos | MetricCard + taxa | 30d |
| Perfis aprovados | MetricCard | 30d |
| Conversões WhatsApp | MetricCard + taxa | 30d |
| Taxa de conversão geral | Gráfico funil | 30d |
| Origem de tráfego | Gráfico pizza/barra | 30d |
| Campanhas ativas | Tabela com métricas | Atual |
| Top landing pages | Tabela (entrada + conversão) | 30d |
| Perfis mais acessados | Top 20 | 30d |
| Conteúdos mais compartilhados | Top 10 | 30d |
| Termos de busca top | Top 20 | 30d |

### 17.3 Gráficos

| Gráfico | Tipo | Dados |
|---|---|---|
| Tráfego ao longo do tempo | Linha | PageViewed por dia |
| Origem de tráfego | Donut | UTM source |
| Funil de conversão | Funil | PageView → Profile → WhatsApp |
| Funil de cadastro | Funil | PageView → Signup → Approved |
| Conversão por campanha | Barra | Por utm_campaign |
| Experimento A/B | Barra comparativa | Por variant |

### 17.4 Filtros

| Filtro | Opções |
|---|---|
| Período | 7d, 30d, 90d, custom |
| Origem | utm_source |
| Campanha | utm_campaign |
| Dispositivo | mobile, desktop, tablet |
| Cidade | GeoLocation |

### 17.5 Interface

```typescript
// Contrato público (referência)
IGrowthService.getDashboard(period, filters): Promise<GrowthDashboardDTO>
IGrowthService.getCampaignMetrics(campaignId, period): Promise<CampaignMetricsDTO>
IGrowthService.getFunnel(type, period, filters): Promise<FunnelDTO>
```

---

## 18. Gestão de Metadados

### 18.1 Painel Administrativo — SEO

| Rota | Funcionalidade | Permissão |
|---|---|---|
| `/admin/seo` | Overview de indexação | `seo:manage` |
| `/admin/seo/metadados` | Editar templates globais | `seo:manage` |
| `/admin/seo/sitemap` | Status e regenerar sitemap | `seo:manage` |
| `/admin/seo/indexacao` | Regras de indexação por tipo | `seo:manage` |

### 18.2 Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| Templates de title/description | Editar templates por `pageType` |
| Default OG image | Upload de imagem institucional |
| Regras de indexação | Toggle por tipo: momentos, vídeos, rankings |
| Sitemap manual | Botão "Regenerar sitemap" |
| Preview SEO | Preview de meta tags por URL |
| Bulk noindex | Desindexar perfis em lote (admin) |
| Robots.txt | Editar regras via Settings |

### 18.3 Settings de SEO

| Chave | Tipo | Descrição |
|---|---|---|
| `seo.site_name` | string | Nome do site |
| `seo.default_title` | string | Title fallback |
| `seo.default_description` | string | Description fallback |
| `seo.default_og_image` | string (URL) | OG image fallback |
| `seo.index.moments` | boolean | Indexar momentos |
| `seo.index.videos` | boolean | Indexar vídeos |
| `seo.index.rankings` | boolean | Indexar rankings |
| `seo.robots.rules` | json | Regras robots.txt |
| `seo.sitemap.auto_ping` | boolean | Ping Google após regen |
| `seo.landing.min_profiles` | number | Mín. perfis para landing cidade |
| `seo.title_templates` | json | Templates por pageType |
| `seo.description_templates` | json | Templates por pageType |

---

## 19. Integração com Redes Sociais

### 19.1 Compartilhamento

| Canal | Mecanismo | Evento |
|---|---|---|
| WhatsApp (contato) | Link `wa.me/{number}` | `WhatsAppClicked` |
| WhatsApp (compartilhar) | Link com texto + URL | `ContentShared(channel=whatsapp)` |
| Facebook | Share dialog URL | `ContentShared(channel=facebook)` |
| Twitter/X | Intent URL | `ContentShared(channel=twitter)` |
| Telegram | Share URL | `ContentShared(channel=telegram)` |
| Copiar link | Clipboard API | `ContentShared(channel=copy_link)` |
| Web Share API | `navigator.share()` (mobile) | `ContentShared(channel=web_share)` |

### 19.2 Links Personalizados

| Tipo | Formato |
|---|---|
| Perfil | `https://{domain}/perfil/{slug}` |
| Perfil com UTM | `...?utm_source=share&utm_medium=social&utm_campaign=profile` |
| Landing | `https://{domain}/lp/{slug}?utm_*` |
| Campanha | `https://{domain}/lp/{slug}?utm_source={source}&utm_campaign={campaign}` |

### 19.3 Open Graph para Compartilhamento

Toda URL compartilhável deve ter OG tags completas para preview rico:

| Campo | Perfil | Landing |
|---|---|---|
| og:title | Nome + cidade | Título da landing |
| og:description | Bio resumo | Descrição |
| og:image | Foto capa 1200×630 | Hero image |
| og:url | Canonical | Canonical |

### 19.4 Componente ShareButton

| Prop | Tipo | Descrição |
|---|---|---|
| url | string | URL a compartilhar |
| title | string | Título para share |
| contentType | enum | profile, moment, video, landing |
| contentId | UUID | ID do conteúdo |

**Regra:** Componente emite evento via hook; não contém lógica de tracking.

---

## 20. Segurança SEO

### 20.1 Controle contra Spam

| Ameaça | Mitigação |
|---|---|
| Perfis spam | Moderação obrigatória antes de indexação |
| Comentários spam | Moderação + rate limit |
| Páginas duplicadas | Canonical URLs |
| Keyword stuffing | Limite de caracteres em bio/SEO fields |
| Link farms | `nofollow` em links user-generated |
| Scraping | Rate limit + Cloudflare bot management |

### 20.2 Proteção contra Páginas Falsas

| Controle | Implementação |
|---|---|
| Verificação de perfil | Badge + prioridade no sitemap |
| Moderação | Nenhum perfil indexado sem `status=approved` |
| Denúncia | Reports module; remoção → `noindex` + sitemap purge |
| Slug squatting | Slugs reservados (admin, api, login, etc.) |
| Phishing | WAF + monitoramento de domínios similares (manual) |

### 20.3 Conteúdo Duplicado

| Cenário | Solução |
|---|---|
| Perfil acessível por ID e slug | Redirect 301 para slug; canonical |
| Busca com filtros | `noindex`; canonical = `/busca` |
| Paginação | `rel=next/prev` + canonical na página 1 |
| WWW vs non-WWW | Redirect 301 para versão canônica |
| HTTP vs HTTPS | Redirect 301 para HTTPS |
| Tags duplicadas | Tag canônica por `slug` único |

### 20.4 Monitoramento SEO

| Verificação | Frequência | Ferramenta |
|---|---|---|
| Links quebrados | Semanal | Health Monitor + crawler |
| Sitemap válido | Após regeneração | XML validation |
| JSON-LD válido | Após deploy staging | Rich Results Test |
| Core Web Vitals | Contínuo | Search Console + RUM |
| Cobertura de indexação | Semanal | Search Console |
| Erros de rastreamento | Semanal | Search Console |

---

## 21. Eventos do Sistema

### 21.1 Catálogo de Eventos — SEO e Marketing

| Evento | Módulo emissor | Quando | Payload | Consumidores |
|---|---|---|---|---|
| `SEOUpdated` | SEO | Metadados alterados (manual ou automático) | `{ entityType, entityId, changes }` | Cache, Sitemap job, Audit |
| `SitemapRegenerated` | SEO | Sitemap regerado | `{ urlCount, generatedAt }` | Audit |
| `CampaignCreated` | Growth | Nova campanha | `{ campaignId, name, utmCampaign }` | Audit, Notifications |
| `CampaignActivated` | Growth | Campanha ativada | `{ campaignId }` | Audit |
| `LandingPageCreated` | CMS | Landing publicada | `{ pageId, slug, campaignId? }` | SEO, Sitemap, Cache, Growth |
| `CmsPageUpdated` | CMS | Página institucional editada | `{ pageId, slug }` | SEO, Cache |
| `CmsPagePublished` | CMS | Página publicada | `{ pageId, slug }` | SEO, Sitemap, Cache |
| `TrafficCaptured` | Growth | UTM capturado em nova sessão | `{ sessionId, utm, landingPage }` | Analytics |
| `ConversionCreated` | Growth | Conversão registrada | `{ type, sessionId, profileId?, campaignId? }` | Analytics, Dashboard, Notifications |
| `ExperimentStarted` | Growth | Experimento A/B ativado | `{ experimentId, name, variants }` | Audit |
| `ExperimentConcluded` | Growth | Experimento finalizado | `{ experimentId, winnerVariantId, results }` | Audit, Settings (aplicar vencedor) |
| `FavoriteAdded` | Growth | Perfil favoritado (futuro) | `{ visitorId, profileId }` | Analytics |
| `ContentShared` | Analytics | Compartilhamento | `{ contentType, contentId, channel }` | Growth, HotScore |
| `PageViewed` | Analytics | Página visualizada | `{ pageType, pagePath, sessionId }` | Growth, Dashboard |
| `SearchPerformed` | Analytics | Busca realizada | `{ query, filters, resultCount }` | Growth, Search |
| `SignupStarted` | Growth | Início de cadastro | `{ sessionId, source }` | Analytics, Growth |
| `SignupCompleted` | Growth | Cadastro concluído | `{ userId, sessionId }` | Analytics, Growth, Notifications |

### 21.2 Integração com Módulos Existentes

| Evento existente (Doc 5/6) | Relação com Growth |
|---|---|
| `ProfileViewed` | Alimenta funil de conversão |
| `WhatsAppClicked` | Conversão primária |
| `ProfileApproved` | Conversão de aquisição |
| `ShareCreated` | Alias de `ContentShared` |
| `ProfileUpdated` | Trigger `SEOUpdated` |
| `ProfileApproved` | Inclusão no sitemap |

---

## 22. Critérios de Aceitação

### 22.1 SEO Técnico

| ID | Critério | Prioridade |
|---|---|---|
| CA-GRO-01 | Toda página pública com title, description, OG, canonical | Must |
| CA-GRO-02 | `/sitemap.xml` gerado automaticamente | Must |
| CA-GRO-03 | `/robots.txt` configurável via Settings | Must |
| CA-GRO-04 | JSON-LD Schema.org em perfis, breadcrumbs, FAQ | Must |
| CA-GRO-05 | Perfis não aprovados com `noindex` | Must |
| CA-GRO-06 | URLs amigáveis conforme §3.3 | Must |
| CA-GRO-07 | Redirect 301 em mudança de slug | Must |
| CA-GRO-08 | Twitter Cards em todas as páginas públicas | Should |

### 22.2 SEO de Perfis

| ID | Critério | Prioridade |
|---|---|---|
| CA-GRO-10 | Perfil em `/perfil/{slug}` | Must |
| CA-GRO-11 | Campos SEO configuráveis (title, description, indexação) | Must |
| CA-GRO-12 | OG image da foto capa automática | Must |
| CA-GRO-13 | AggregateRating quando reviews aprovadas existem | Must |

### 22.3 Landing Pages

| ID | Critério | Prioridade |
|---|---|---|
| CA-GRO-20 | Landing pages por cidade e categoria | Must |
| CA-GRO-21 | Landing pages CMS administráveis (`/lp/{slug}`) | Must |
| CA-GRO-22 | ISR com invalidação por eventos | Must |
| CA-GRO-23 | Mínimo de perfis configurável para landing cidade | Should |

### 22.4 Analytics e Marketing

| ID | Critério | Prioridade |
|---|---|---|
| CA-GRO-30 | Eventos de marketing catalogados e persistidos | Must |
| CA-GRO-31 | Captura de UTM na sessão | Must |
| CA-GRO-32 | Cookie `visitor_session` (30 dias) | Must |
| CA-GRO-33 | Integração GTM + GA4 configurável | Must |
| CA-GRO-34 | Funis de conversão medidos | Must |
| CA-GRO-35 | Zero lógica de tracking em componentes React | Must |

### 22.5 Growth e Retenção

| ID | Critério | Prioridade |
|---|---|---|
| CA-GRO-40 | Dashboard de growth em `/admin/growth` | Must |
| CA-GRO-41 | Campanhas criáveis pelo admin | Must |
| CA-GRO-42 | Experimento A/B com assignment no server | Should |
| CA-GRO-43 | Estrutura de favoritos preparada | Should |
| CA-GRO-44 | Estrutura de referral preparada | Should |
| CA-GRO-45 | Blog preparado (entidades, rotas) | Should |

### 22.6 CMS e Conteúdo

| ID | Critério | Prioridade |
|---|---|---|
| CA-GRO-50 | 6 páginas institucionais via CMS | Must |
| CA-GRO-51 | Versionamento de páginas CMS | Must |
| CA-GRO-52 | Preview antes de publicar | Should |
| CA-GRO-53 | FAQ com Schema.org FAQPage | Should |

### 22.7 Performance e Segurança SEO

| ID | Critério | Prioridade |
|---|---|---|
| CA-GRO-60 | Core Web Vitals dentro dos alvos (Doc 11) | Must |
| CA-GRO-61 | Conteúdo principal renderizado server-side | Must |
| CA-GRO-62 | Canonical em todas as páginas indexáveis | Must |
| CA-GRO-63 | Proteção contra indexação de páginas privadas | Must |
| CA-GRO-64 | Moderação obrigatória antes de indexação | Must |

### 22.8 Arquitetura

| ID | Critério | Prioridade |
|---|---|---|
| CA-GRO-70 | Módulos SEO, CMS, Analytics, Growth desacoplados | Must |
| CA-GRO-71 | Interfaces públicas documentadas | Must |
| CA-GRO-72 | Eventos registrados no catálogo | Must |
| CA-GRO-73 | Configuração via Settings (sem redeploy) | Must |
| CA-GRO-74 | GTM apenas na área pública | Must |

---

## Apêndice A — Mapa de Páginas e SEO

| Rota | Módulo de conteúdo | Módulo SEO | Indexável |
|---|---|---|---|
| `/` | CMS + Profiles + Rankings | SEO | Sim |
| `/perfil/{slug}` | Profiles | SEO | Condicional |
| `/busca` | Search | SEO | Não |
| `/cidade/{slug}` | GeoLocation + Profiles | SEO | Sim |
| `/categoria/{slug}` | Tags + Search | SEO | Sim |
| `/rankings` | Rankings | SEO | Sim |
| `/rankings/{type}` | Rankings | SEO | Sim |
| `/videos` | Video Gallery | SEO | Configurável |
| `/momentos` | Moments | SEO | Configurável |
| `/lp/{slug}` | CMS | SEO | Configurável |
| `/sobre` | CMS | SEO | Sim |
| `/faq` | CMS | SEO | Sim |
| `/termos` | CMS | SEO | Sim |
| `/privacidade` | CMS | SEO | Sim |
| `/blog` (futuro) | CMS | SEO | Sim |
| `/blog/{slug}` (futuro) | CMS | SEO | Sim |

---

## Apêndice B — Referências Cruzadas

| Documento | Relação |
|---|---|
| [Documento 1 — Arquitetura](../arquitetura/DOCUMENTO-01-ARQUITETURA-DA-PLATAFORMA.md) | Módulos SEO, CMS, Analytics; matriz de dependências |
| [Documento 2 — Área Pública](./DOCUMENTO-02-AREA-PUBLICA.md) | §11 Regras de SEO, componente SeoHead, URLs |
| [Documento 4 — Admin](./DOCUMENTO-04-AREA-ADMINISTRATIVA.md) | CMS, SEO settings, `/admin/cms` |
| [Documento 5 — Engajamento](./DOCUMENTO-05-MODULOS-ENGAJAMENTO-INTELIGENCIA-DESCOBERTA.md) | Analytics, eventos, funis, dashboard |
| [Documento 6 — Mídia](./DOCUMENTO-06-CONTEUDO-MIDIA-E-INTERACOES.md) | OG images, compartilhamento |
| [Documento 9 — Banco](./DOCUMENTO-09-BANCO-DE-DADOS-MODELAGEM-E-ESTRUTURA-DE-DADOS.md) | `seo_metadata`, `cms_pages`, `analytics_events` |
| [Documento 10 — Design System](./DOCUMENTO-10-DESIGN-SYSTEM-UX-UI-E-IDENTIDADE-VISUAL.md) | ShareButton, performance visual |
| [Documento 11 — Infraestrutura](./DOCUMENTO-11-INFRAESTRUTURA-DEVOPS-PERFORMANCE-E-ESCALABILIDADE.md) | CDN, ISR, Core Web Vitals, cache |

---

> **Este documento é a especificação oficial de SEO, marketing, crescimento e aquisição da plataforma.**  
> Toda implementação de indexação, tracking, campanhas e landing pages deve seguir estas definições.  
> Desvios exigem atualização formal deste documento e validação contra o Documento 1.
