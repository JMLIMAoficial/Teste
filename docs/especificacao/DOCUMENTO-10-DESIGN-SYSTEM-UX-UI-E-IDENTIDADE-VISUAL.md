# Documento 10 — Design System, UX/UI e Identidade Visual

**Versão:** 1.0.0  
**Status:** Especificação Oficial  
**Última atualização:** 2026-07-09  
**Dependências:**
- [Documento 1 — Arquitetura da Plataforma](../arquitetura/DOCUMENTO-01-ARQUITETURA-DA-PLATAFORMA.md)
- [Documento 2 — Área Pública](./DOCUMENTO-02-AREA-PUBLICA.md)
- [Documento 3 — Área do Acompanhante](./DOCUMENTO-03-AREA-DO-ACOMPANHANTE.md)
- [Documento 4 — Área Administrativa](./DOCUMENTO-04-AREA-ADMINISTRATIVA.md)  
**Escopo:** Identidade visual, tokens, componentes, layouts, responsividade, acessibilidade e critérios de aceitação

---

## Sumário

1. [Visão Geral e Princípios](#1-visão-geral-e-princípios)
2. [Identidade Visual e Direção](#2-identidade-visual-e-direção)
3. [Paleta de Cores](#3-paleta-de-cores)
4. [Tipografia](#4-tipografia)
5. [Estilo Visual e Linguagem](#5-estilo-visual-e-linguagem)
6. [Design Tokens](#6-design-tokens)
7. [Sistema de Componentes](#7-sistema-de-componentes)
8. [Layouts por Superfície](#8-layouts-por-superfície)
9. [Responsividade](#9-responsividade)
10. [Experiência Mobile](#10-experiência-mobile)
11. [Animações e Microinterações](#11-animações-e-microinterações)
12. [Estados de Interface](#12-estados-de-interface)
13. [Acessibilidade](#13-acessibilidade)
14. [Biblioteca de Componentes](#14-biblioteca-de-componentes)
15. [Documentação Visual e Governança](#15-documentação-visual-e-governança)
16. [Critérios de Aceitação](#16-critérios-de-aceitação)

---

## 1. Visão Geral e Princípios

### 1.1 Objetivo

Definir o **Design System oficial** da plataforma: identidade visual, padrões de interface, componentes reutilizáveis e experiência do usuário consistente em todas as superfícies.

A experiência deve transmitir:

| Valor | Manifestação |
|---|---|
| **Exclusividade** | Tema Dark Premium, curadoria visual, badges de status |
| **Confiança** | Hierarquia clara, verificação visível, feedback honesto |
| **Elegância** | Tipografia refinada, espaçamento generoso, animações sutis |
| **Tecnologia** | Glassmorphism, indicadores dinâmicos, dashboards modernos |
| **Facilidade** | Navegação intuitiva, estados previsíveis, mobile-first |

### 1.2 Posicionamento Arquitetural (Documento 1)

O Design System reside em **`packages/ui/`** e é consumido por todas as aplicações:

```
packages/ui/
├── tokens/           # Design tokens (cores, espaçamento, tipografia)
├── components/       # Componentes visuais puros
├── hooks/            # Hooks de UI (useMediaQuery, useReducedMotion)
├── patterns/         # Composições reutilizáveis (não de negócio)
└── docs/             # Storybook / documentação visual
```

| Regra | Descrição |
|---|---|
| **DS-001** | Componentes do DS **não importam** módulos de domínio |
| **DS-002** | Componentes recebem dados via **props** — zero fetch interno |
| **DS-003** | Lógica de negócio fica nos **services**; UI apenas renderiza e emite callbacks |
| **DS-004** | Telas em `apps/web/` **compõem** componentes do DS, não os recriam |
| **DS-005** | Componentes exclusivos de página exigem **justificativa documentada** |
| **DS-006** | Tokens centralizados — proibido hardcode de cores/espaçamentos fora de `tokens/` |
| **DS-007** | Máximo **300 linhas** por arquivo de componente |

### 1.3 Superfícies Cobertas

| Superfície | Rota base | Tom visual |
|---|---|---|
| **Área Pública** | `apps/web/app/(public)/` | Descoberta, impacto visual, cards premium |
| **Área do Acompanhante** | `apps/web/app/(companion)/` | Produtividade, clareza, métricas pessoais |
| **Área Administrativa** | `apps/web/app/(admin)/` | Densidade informacional, ações rápidas, auditoria |
| **Mobile (futuro)** | React Native / PWA | Mesmos tokens, adaptação de layout |

### 1.4 O Que Evitar

| Anti-padrão | Alternativa |
|---|---|
| Componente por página duplicado | Compor do catálogo existente |
| Cores inline (`#hex` no JSX) | Token semântico (`color.action.primary`) |
| Lógica de score/badge no componente | Props: `score={82}`, `level="hot"` |
| Interface genérica (Bootstrap-like) | Dark Premium com identidade própria |
| Poluição visual (muitos badges/ícones) | Hierarquia: 1 CTA, 2 badges máx. por card |
| Animações longas (> 500ms decorativas) | Transições rápidas e funcionais |

---

## 2. Identidade Visual e Direção

### 2.1 Tema Principal — Dark Premium

A plataforma adota **Dark Premium** como tema único (sem light mode na v1).

| Característica | Descrição |
|---|---|
| Fundo escuro | Preto profundo e grafite como base |
| Alto contraste | Texto claro sobre fundos escuros (WCAG AA) |
| Elementos luminosos | Roxo e dourado como acentos de luz |
| Cards sofisticados | Elevação sutil, bordas translúcidas, glassmorphism |
| Sensação de exclusividade | Gradientes discretos, badges premium, curadoria |

### 2.2 Personalidade da Marca

| Atributo | Expressão visual |
|---|---|
| Sofisticada | Espaçamento amplo, tipografia limpa, poucos elementos |
| Confiante | CTAs claros, feedback imediato, estados definidos |
| Moderna | Glassmorphism, microinterações, indicadores dinâmicos |
| Discreta | Sem cores saturadas em excesso; roxo e dourado com moderação |
| Premium | Qualidade perceptível em cards, fotos e transições |

### 2.3 Referências de Estilo

| Referência | Aplicação na plataforma |
|---|---|
| **Glassmorphism** | Modais, dropdowns, header fixo, sidebar |
| **Liquid Glass UI** | Overlays de card, tooltips, badges flutuantes |
| **Cards flutuantes** | Perfis, vídeos, momentos, métricas |
| **Sombras suaves** | Elevação de cards e modais |
| **Bordas translúcidas** | `border: 1px solid rgba(255,255,255,0.08)` |
| **Gradientes discretos** | Badges Premium, Hot Score alto, hero sections |

---

## 3. Paleta de Cores

### 3.1 Fundos

| Token | Hex | Uso |
|---|---|---|
| `color.bg.primary` | `#0A0A0F` | Fundo principal da aplicação |
| `color.bg.secondary` | `#14141F` | Cards, seções, painéis |
| `color.bg.tertiary` | `#1E1E2E` | Inputs, hover de itens, tags |
| `color.bg.elevated` | `#252536` | Modais, dropdowns, popovers, tooltips |
| `color.bg.overlay` | `rgba(10, 10, 15, 0.85)` | Overlay de modal/drawer |

### 3.2 Destaques e Ações

| Token | Hex | Uso |
|---|---|---|
| `color.brand.purple` | `#6B21A8` | Ação primária, item ativo, Destaque badge |
| `color.brand.purple-light` | `#9333EA` | Hover, focus ring, links ativos |
| `color.brand.gold` | `#F59E0B` | Premium, Hot Score alto, destaques |
| `color.brand.orange` | `#EA580C` | CTAs secundários, alertas de atenção |
| `color.brand.gradient-premium` | `gold → orange` | Badge Premium, barras de destaque |
| `color.brand.gradient-hot` | `orange → gold` | Hot Score "Em chamas" |

### 3.3 Texto

| Token | Hex | Uso |
|---|---|---|
| `color.text.primary` | `#F8FAFC` | Títulos, corpo principal |
| `color.text.secondary` | `#94A3B8` | Subtítulos, metadados, labels |
| `color.text.muted` | `#64748B` | Placeholders, timestamps, hints |
| `color.text.inverse` | `#0A0A0F` | Texto sobre badges claros (Premium) |
| `color.text.link` | `#9333EA` | Links; hover: underline |

### 3.4 Feedback e Status

| Token | Hex | Uso |
|---|---|---|
| `color.status.success` | `#22C55E` | Verificado, confirmação, sucesso |
| `color.status.error` | `#EF4444` | Erros, ações destrutivas |
| `color.status.warning` | `#F59E0B` | Alertas, pendências |
| `color.status.info` | `#3B82F6` | Informação, Hot Score "Morno" |
| `color.status.neutral` | `#64748B` | Desabilitado, Frio |

### 3.5 Bordas e Divisores

| Token | Valor | Uso |
|---|---|---|
| `color.border.subtle` | `#1E293B` | Bordas de cards, inputs, tabelas |
| `color.border.focus` | `#9333EA` | Focus ring (2px) |
| `color.border.glass` | `rgba(255,255,255,0.08)` | Bordas glassmorphism |
| `color.border.hover` | `rgba(107,33,168,0.30)` | Hover em cards interativos |

### 3.6 Hot Score — Cores por Nível

| Nível | Faixa | Label | Token de cor |
|---|---|---|---|
| Baixo | 0–25 | Frio | `color.status.neutral` |
| Médio | 26–50 | Morno | `color.status.info` |
| Alto | 51–75 | Quente | `color.brand.orange` |
| Muito alto | 76–100 | Em chamas | `color.brand.gradient-hot` |

### 3.7 Regras de Uso de Cor

| ID | Regra |
|---|---|
| RN-COL-001 | Máximo **1 cor de destaque** por bloco visual (roxo OU dourado, não ambos competindo) |
| RN-COL-002 | Premium usa gradiente gold→orange; Destaque usa roxo sólido |
| RN-COL-003 | Erro nunca é a cor dominante — apenas em mensagens e botões de perigo |
| RN-COL-004 | Fundos de badge com opacidade 20% da cor de status (ex.: verificado) |
| RN-COL-005 | Admin pode usar densidade maior, mas **mesma paleta** — sem tema claro separado |

---

## 4. Tipografia

### 4.1 Famílias Tipográficas

| Token | Família | Uso |
|---|---|---|
| `font.family.sans` | **Inter** (primária) | UI, corpo, labels, dashboards |
| `font.family.display` | **DM Sans** (secundária) | Títulos hero, headings de marketing |
| `font.family.mono` | **JetBrains Mono** | Códigos, IDs, dados técnicos (admin) |

**Fallback:** `system-ui, -apple-system, sans-serif`

### 4.2 Escala Tipográfica

| Token | Tamanho | Line-height | Peso | Uso |
|---|---|---|---|---|
| `font.size.xs` | 11px | 16px | 400–600 | Badges, micro-labels |
| `font.size.sm` | 13px | 18px | 400 | Metadados, captions |
| `font.size.base` | 16px | 24px | 400 | Corpo padrão |
| `font.size.lg` | 18px | 28px | 600 | Título de card (H3) |
| `font.size.xl` | 20px | 28px | 600 | Subtítulo de seção |
| `font.size.2xl` | 24px | 32px | 600 | Título de seção (H2) |
| `font.size.3xl` | 30px | 36px | 700 | Título de página |
| `font.size.4xl` | 36px | 40px | 700 | Hero (mobile) |
| `font.size.5xl` | 48px | 52px | 700 | Hero (desktop) |

### 4.3 Pesos

| Token | Valor | Uso |
|---|---|---|
| `font.weight.normal` | 400 | Corpo, descrições |
| `font.weight.medium` | 500 | Labels, navegação |
| `font.weight.semibold` | 600 | Títulos de card, botões |
| `font.weight.bold` | 700 | Hero, métricas destacadas |

### 4.4 Hierarquia por Contexto

| Elemento | Token composto | Exemplo de uso |
|---|---|---|
| Hero (público) | `display / 5xl / bold` | "Descubra acompanhantes premium" |
| Título de seção | `sans / 2xl / semibold` | "Em Destaque", "Perfis Premium" |
| Título de card | `sans / lg / semibold` | Nome no CompanionCard |
| Corpo | `sans / base / normal` | Bio, descrições |
| Meta / small | `sans / sm / normal` | "28 anos · São Paulo" |
| Badge | `sans / xs / semibold / uppercase` | PREMIUM, VERIFICADO |
| Label de formulário | `sans / sm / medium` | "Nome público" |
| Mensagem de sistema | `sans / sm / normal` | Erros, toasts, hints |
| Métrica (dashboard) | `sans / 3xl / bold` | "1.284 visualizações" |
| Label de métrica | `sans / sm / normal / muted` | "Últimos 30 dias" |

### 4.5 Espaçamento de Texto

| Token | Valor | Uso |
|---|---|---|
| `font.tracking.tight` | -0.02em | Títulos grandes |
| `font.tracking.normal` | 0 | Corpo |
| `font.tracking.wide` | 0.05em | Badges uppercase |
| `font.tracking.wider` | 0.1em | Micro-labels |

---

## 5. Estilo Visual e Linguagem

### 5.1 Glassmorphism — Especificação

| Propriedade | Valor | Aplicação |
|---|---|---|
| Background | `rgba(20, 20, 31, 0.72)` | Header fixo, sidebar, modais |
| Backdrop-filter | `blur(16px)` | Painéis flutuantes |
| Border | `1px solid rgba(255,255,255,0.08)` | Contorno sutil |
| Shadow | `0 8px 32px rgba(0,0,0,0.37)` | Elevação |
| Border-radius | `16px` (painéis), `12px` (itens internos) | — |

**Fallback (sem suporte a backdrop-filter):** `background: #14141F` sólido com opacidade 95%.

### 5.2 Cards — Linguagem Visual

| Propriedade | Valor padrão |
|---|---|
| Background | `color.bg.secondary` |
| Border | `1px color.border.subtle` |
| Border-radius | `16px` (`radius.lg`) |
| Padding | `16px` (compacto) / `24px` (padrão) |
| Shadow | `shadow.md` — `0 4px 24px rgba(0,0,0,0.40)` |
| Hover (interativo) | `translateY(-2px)`, shadow `shadow.lg`, border `color.border.hover` |
| Transition | `300ms cubic-bezier(0.4, 0, 0.2, 1)` |

### 5.3 Elevação (Sombras)

| Token | Valor | Uso |
|---|---|---|
| `shadow.sm` | `0 2px 8px rgba(0,0,0,0.25)` | Badges flutuantes, tooltips |
| `shadow.md` | `0 4px 24px rgba(0,0,0,0.40)` | Cards padrão |
| `shadow.lg` | `0 8px 32px rgba(107,33,168,0.15)` | Card hover, modais |
| `shadow.xl` | `0 16px 48px rgba(0,0,0,0.50)` | Drawer, lightbox |

### 5.4 Iconografia

| Aspecto | Especificação |
|---|---|
| Biblioteca | **Lucide Icons** (consistente, stroke-based) |
| Tamanho padrão | 20px (UI), 16px (inline), 24px (navegação) |
| Stroke | 1.5px (padrão), 2px (ênfase) |
| Cor | Herda do texto ou token semântico |
| Badges com ícone | Ícone 12px à esquerda do label |

### 5.5 Imagens e Mídia

| Regra | Especificação |
|---|---|
| Aspect ratio card perfil | 3:4 (portrait) |
| Aspect ratio vídeo | 16:9 |
| Aspect ratio momento | 1:1 ou 4:5 (configurável) |
| Overlay gradiente | `from-bg-primary via-transparent to-transparent` (bottom) |
| Placeholder | Gradiente sutil da paleta (sem imagem genérica cinza) |
| Bordas de foto | `radius.lg` no card; `radius.full` no avatar |

---

## 6. Design Tokens

### 6.1 Estrutura de Tokens

Tokens organizados em três camadas:

```
Primitivos → Semânticos → Componentes
```

| Camada | Exemplo | Descrição |
|---|---|---|
| **Primitivo** | `purple.600 = #6B21A8` | Valor bruto |
| **Semântico** | `color.action.primary = purple.600` | Significado contextual |
| **Componente** | `button.primary.bg = color.action.primary` | Uso específico |

### 6.2 Tokens de Espaçamento

Base: **4px** (grid de 4)

| Token | Valor | Uso |
|---|---|---|
| `space.0` | 0 | — |
| `space.1` | 4px | Gap mínimo (badges) |
| `space.2` | 8px | Gap interno compacto |
| `space.3` | 12px | Padding de badge, gap de tags |
| `space.4` | 16px | Padding de card compacto |
| `space.5` | 20px | — |
| `space.6` | 24px | Padding de card padrão, seções |
| `space.8` | 32px | Gap entre seções |
| `space.10` | 40px | Padding de seção |
| `space.12` | 48px | Margem de hero |
| `space.16` | 64px | Espaçamento de página |

### 6.3 Tokens de Border Radius

| Token | Valor | Uso |
|---|---|---|
| `radius.sm` | 6px | Tags, chips pequenos |
| `radius.md` | 8px | Inputs, botões pequenos |
| `radius.lg` | 16px | Cards, modais |
| `radius.xl` | 24px | Hero cards, feature sections |
| `radius.full` | 9999px | Badges, avatares, pills |

### 6.4 Tokens de Animação

| Token | Valor | Uso |
|---|---|---|
| `duration.fast` | 150ms | Hover de botão, toggle |
| `duration.normal` | 300ms | Card hover, fade in |
| `duration.slow` | 500ms | Scroll reveal, page transition |
| `easing.default` | `cubic-bezier(0.4, 0, 0.2, 1)` | Maioria das transições |
| `easing.enter` | `ease-out` | Entrada de elementos |
| `easing.exit` | `ease-in` | Saída de modais |
| `easing.spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Badge entrance |

### 6.5 Tokens de Z-Index

| Token | Valor | Uso |
|---|---|---|
| `z.base` | 0 | Conteúdo padrão |
| `z.dropdown` | 100 | Dropdowns, tooltips |
| `z.sticky` | 200 | Header fixo, sidebar |
| `z.modal` | 300 | Modais, drawers |
| `z.toast` | 400 | Toasts, notificações flutuantes |
| `z.overlay` | 500 | Overlay fullscreen (lightbox) |

### 6.6 Tokens de Layout

| Token | Valor | Uso |
|---|---|---|
| `layout.max-width` | 1400px | Container máximo (wide) |
| `layout.sidebar.width` | 260px | Sidebar companion/admin |
| `layout.sidebar.collapsed` | 64px | Sidebar colapsada (desktop) |
| `layout.header.height` | 64px | Header fixo |
| `layout.bottom-nav.height` | 56px | Navegação inferior mobile |

---

## 7. Sistema de Componentes

### 7.1 Button

#### Variantes

| Variante | Background | Texto | Border | Uso |
|---|---|---|---|---|
| **Primary** | `color.brand.purple` | `color.text.primary` | — | Ação principal (1 por tela) |
| **Secondary** | transparent | `color.text.primary` | `color.border.subtle` | Ações secundárias |
| **Ghost** | transparent | `color.text.secondary` | — | Ações terciárias, ícones |
| **Danger** | `color.status.error` | `color.text.primary` | — | Exclusão, bloqueio |
| **Success** | `color.status.success` | `color.text.primary` | — | Confirmação positiva |
| **Premium** | gradiente gold→orange | `color.text.inverse` | — | Upgrade, destaque comercial |

#### Tamanhos

| Tamanho | Height | Padding horizontal | Font |
|---|---|---|---|
| `sm` | 32px | 12px | `font.size.sm` |
| `md` | 40px | 16px | `font.size.base` |
| `lg` | 48px | 24px | `font.size.base` |

#### Estados

| Estado | Comportamento visual |
|---|---|
| **Normal** | Cor base da variante |
| **Hover** | Background 10% mais claro; `shadow.sm` em primary |
| **Active/Pressed** | Background 10% mais escuro; `scale(0.98)` |
| **Focus** | Ring 2px `color.border.focus`, offset 2px |
| **Loading** | Spinner central; texto oculto; largura mantida |
| **Disabled** | Opacidade 40%; cursor not-allowed; sem hover |
| **Error** | Border `color.status.error`; mensagem abaixo |

#### Regras

| ID | Regra |
|---|---|
| RN-BTN-001 | Máximo 1 botão Primary por viewport/seção |
| RN-BTN-002 | Loading desabilita clique e mantém dimensões |
| RN-BTN-003 | Ícone opcional à esquerda (16px); nunca ícone isolado sem label (exceto icon button) |

---

### 7.2 Card (Base)

Componente genérico para qualquer conteúdo encapsulado.

| Prop | Tipo | Descrição |
|---|---|---|
| `variant` | `default \| elevated \| glass \| interactive` | Estilo visual |
| `padding` | `compact \| default \| spacious` | Espaçamento interno |
| `as` | `div \| article \| section` | Elemento semântico |

| Variante | Características |
|---|---|
| `default` | bg-secondary, border subtle, shadow md |
| `elevated` | bg-elevated, shadow lg |
| `glass` | Glassmorphism completo |
| `interactive` | Hover com translateY e shadow (clicável) |

**Estados:** loading (skeleton interno), empty (slot), error (banner inline).

---

### 7.3 CompanionCard (Card de Perfil Público)

Componente especializado — composição de Card + elementos de perfil.

#### Anatomia

```
┌─────────────────────────────────┐
│ [Premium] [Destaque] [Verificado]│  ← Badges (top-left)
│                                  │
│         FOTO (3:4)               │  ← Aspect ratio fixo
│         (hover: troca fotos)     │
│                                  │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← Gradient overlay
│ Nome                    (H3)     │
│ 28 anos · São Paulo    (meta)   │
│ Ativo                  (pref.)   │
│ [tag1] [tag2] [tag3]    (tags)   │  ← Máx. 3 tags
│ 🔥 82  Em chamas       (score)  │  ← HotScoreIndicator
└─────────────────────────────────┘
```

#### Elementos

| Elemento | Componente | Props principais |
|---|---|---|
| Foto | `Avatar` / `ImageCarousel` | `photos`, `alt`, `aspectRatio` |
| Nome | Texto H3 | `name` |
| Idade + cidade | Texto meta | `age`, `city` |
| Preferência | Texto muted | `preference` |
| Tags | `TagList` | `tags`, `maxVisible={3}` |
| Badges | `Badge` | `variant`: premium, featured, verified |
| Hot Score | `HotScoreIndicator` | `score`, `level`, `variant="compact"` |

#### Estados do Card

| Estado | Visual |
|---|---|
| **Normal** | Card padrão |
| **Premium** | Badge gold; borda sutil gold no hover |
| **Destaque** | Badge roxo; posição prioritária no grid |
| **Verificado** | Badge success com ícone shield |
| **Hover (desktop)** | `translateY(-2px)`; foto scale 1.05; troca para próxima foto (se múltiplas) |
| **Focus (teclado)** | Ring roxo; mesmo comportamento de clique |
| **Loading** | Skeleton com pulse na proporção 3:4 |

#### Interações

| Interação | Desktop | Mobile |
|---|---|---|
| Troca de fotos | Hover cicla fotos (250ms fade) | Swipe horizontal na área da foto |
| Clique | Navega para `/perfil/[slug]` | Tap → mesma rota |
| Long press | — | Preview rápido (futuro) |

---

### 7.4 Badge

| Variante | Background | Texto | Ícone | Uso |
|---|---|---|---|---|
| `premium` | Gradiente gold→orange | `text.inverse` | Coroa | Perfil premium |
| `featured` | `brand.purple` | `text.primary` | Estrela | Destaque editorial |
| `verified` | `success` 20% | `success` | Shield-check | Verificação |
| `new` | `info` 20% | `info` | Sparkle | Perfil novo (< 7 dias) |
| `trending` | `orange` 20% | `orange` | Trending-up | Em alta |
| `status` | Contextual | Contextual | — | Admin: pending, approved, etc. |

| Propriedade | Valor |
|---|---|
| Border-radius | `radius.full` |
| Padding | `4px 8px` |
| Font | `xs / semibold / uppercase / tracking.wide` |
| Max por card | 3 badges visíveis simultaneamente |

---

### 7.5 HotScoreIndicator

Componente universal — mesma API em card, perfil e dashboard.

#### Props

| Prop | Tipo | Descrição |
|---|---|---|
| `score` | `number` (0–100) | Pontuação atual |
| `level` | `cold \| warm \| hot \| blazing` | Nível calculado externamente |
| `trend` | `up \| down \| stable`? | Tendência (opcional) |
| `trendPercentage` | `number`? | Variação percentual |
| `variant` | `compact \| bar \| gauge \| flame` | Visualização |
| `showLabel` | `boolean` | Exibir label textual |

#### Variantes Visuais

| Variant | Onde usar | Descrição |
|---|---|---|
| `compact` | Cards de perfil | Número + label ("82 Em chamas") |
| `bar` | Perfil público, dashboard | Barra horizontal preenchida com cor do nível |
| `gauge` | Dashboard acompanhante | Indicador circular (arco 0–100) |
| `flame` | Rankings, destaques | Ícone de fogo com intensidade por nível |

#### Níveis Visuais

| Nível | Score | Label | Cor | Ícone (flame) |
|---|---|---|---|---|
| `cold` | 0–25 | Frio | neutral | Chama apagada (opacidade 30%) |
| `warm` | 26–50 | Morno | info | Chama baixa |
| `hot` | 51–75 | Quente | orange | Chama média |
| `blazing` | 76–100 | Em chamas | gradient-hot | Chama animada sutil |

#### Regras

| ID | Regra |
|---|---|
| RN-HS-001 | Componente **não calcula** score — recebe via props |
| RN-HS-002 | Mesmo componente em todas as superfícies |
| RN-HS-003 | Animação de chama apenas em `blazing`; respeita `prefers-reduced-motion` |
| RN-HS-004 | `trend` exibe seta ↑↓ com cor success/error |

---

### 7.6 Formulários

#### Input (Text, Email, Password, Number)

| Propriedade | Valor |
|---|---|
| Height | 44px (touch-friendly) |
| Background | `color.bg.tertiary` |
| Border | `1px color.border.subtle` |
| Border-radius | `radius.md` |
| Padding | `12px 16px` |
| Font | `base / normal` |
| Placeholder | `color.text.muted` |

| Estado | Visual |
|---|---|
| Normal | Border subtle |
| Focus | Border `brand.purple-light`; ring 2px |
| Error | Border `status.error`; mensagem abaixo em `sm / error` |
| Disabled | Opacidade 50%; background mais escuro |
| Read-only | Sem border; texto secondary |

#### Select / Combobox

| Aspecto | Especificação |
|---|---|
| Aparência | Mesmo estilo do Input |
| Dropdown | `bg.elevated` com glassmorphism; `shadow.lg` |
| Item hover | `bg.tertiary` |
| Item selected | `brand.purple` 20% background + check icon |
| Multi-select | Chips com `radius.sm` dentro do input |

#### Textarea

| Propriedade | Valor |
|---|---|
| Min-height | 96px |
| Resize | Vertical apenas |
| Contador | `sm / muted` alinhado à direita (quando `maxLength`) |

#### Checkbox / Radio / Switch

| Componente | Tamanho | Cor ativo |
|---|---|---|
| Checkbox | 20px | `brand.purple` |
| Radio | 20px | `brand.purple` |
| Switch | 44×24px | Track: tertiary; thumb active: purple |

#### Upload de Mídia

| Tipo | Componente | Estados |
|---|---|---|
| Foto | `PhotoUpload` | idle → uploading → processing → complete → error |
| Vídeo | `VideoUpload` | idle → uploading → processing → complete → error |
| Genérico | `FileUpload` | Drag & drop zone + botão |

| Estado | Visual |
|---|---|
| **Idle** | Área tracejada (`border.dashed`); ícone + "Arraste ou clique" |
| **Uploading** | Barra de progresso (`brand.purple`); percentual |
| **Processing** | Spinner + "Processando mídia..." |
| **Complete** | Thumbnail preview + botão remover |
| **Error** | Border error + mensagem + botão "Tentar novamente" |

#### Validação

| Aspecto | Regra |
|---|---|
| Momento | Inline on blur; resumo on submit |
| Mensagem | Específica ("Email inválido", não "Erro") |
| Posição | Abaixo do campo, `font.size.sm`, `color.status.error` |
| Ícone | Alert-circle 16px à esquerda da mensagem |
| Acessibilidade | `aria-invalid`, `aria-describedby` vinculado à mensagem |

---

### 7.7 Navegação

#### Header — Área Pública

| Elemento | Posição | Comportamento |
|---|---|---|
| Logo | Esquerda | Link para `/` |
| Busca | Centro (desktop) / ícone (mobile) | `SearchInput` com autocomplete |
| Menu | Direita | Links: Momentos, Vídeos, Rankings |
| Login | Direita | Botão ghost → `/login` |

| Propriedade | Valor |
|---|---|
| Height | 64px |
| Background | Glassmorphism (`bg.glass`) |
| Position | Sticky top; `z.sticky` |
| Border-bottom | `color.border.glass` |

#### Footer — Área Pública

| Seção | Conteúdo |
|---|---|
| Links | Sobre, Termos, Privacidade, Contato |
| Social | Ícones (se aplicável) |
| Copyright | Ano + nome da plataforma |

Background: `bg.secondary`; padding `space.10`.

#### Sidebar — Área Privada (Companion / Admin)

| Elemento | Especificação |
|---|---|
| Width | 260px (expandida), 64px (colapsada) |
| Background | `bg.secondary` com border-right `border.subtle` |
| Item ativo | Background `brand.purple` 15%; texto `brand.purple-light`; borda esquerda 3px purple |
| Item hover | Background `bg.tertiary` |
| Ícones | 20px Lucide + label |
| Collapse | Botão no rodapé da sidebar |
| Mobile | Drawer (overlay) acionado por hamburger |

#### Bottom Navigation — Mobile

| Propriedade | Valor |
|---|---|
| Height | 56px |
| Position | Fixed bottom |
| Background | Glassmorphism |
| Itens | 4–5 ícones com label micro |
| Ativo | Ícone + label em `brand.purple-light` |

Aplicável em: área pública (Home, Busca, Rankings, Login) e companion (Dashboard, Perfil, Momentos, Mensagens).

#### Breadcrumb

| Contexto | Exibição |
|---|---|
| Público | Não utilizado (navegação flat) |
| Companion | Dashboard > Seção > Página |
| Admin | Admin > Módulo > Ação |

Separador: `/` ou chevron; cor `text.muted`.

---

### 7.8 Dashboard

Padrões visuais para métricas, gráficos e tabelas — aplicáveis em Companion e Admin.

#### MetricCard

```
┌──────────────────────┐
│ 👁 Visualizações     │  ← Ícone + label (sm, muted)
│ 1.284                │  ← Valor (3xl, bold)
│ ↑ 12% vs período     │  ← Trend (sm, success/error)
└──────────────────────┘
```

| Propriedade | Valor |
|---|---|
| Background | `bg.secondary` ou `glass` |
| Padding | `space.6` |
| Border-radius | `radius.lg` |
| Grid | 2 colunas (mobile), 3–4 (desktop) |

#### Gráficos

| Tipo | Uso | Cores |
|---|---|---|
| Linha | Evolução temporal (views, score) | `brand.purple-light` (linha), `bg.tertiary` (área) |
| Barra | Comparação (períodos, categorias) | `brand.purple` (primária), `brand.gold` (secundária) |
| Donut | Distribuição (reviews, status) | Paleta semântica |
| Sparkline | Mini-tendência em MetricCard | `brand.purple-light` |

**Regras:** Sem grid pesado; eixos em `text.muted`; tooltip com `bg.elevated`.

#### Tabelas (Admin)

| Elemento | Estilo |
|---|---|
| Header | `bg.tertiary`; texto `sm / semibold / secondary`; sticky top |
| Row | Border-bottom `border.subtle`; hover `bg.tertiary` |
| Row selecionada | Background `brand.purple` 10% |
| Paginação | Botões ghost; página ativa com `brand.purple` |
| Ações em linha | Icon buttons ghost (editar, aprovar, rejeitar) |
| Empty | Componente `EmptyState` centralizado |
| Loading | Skeleton rows (5 linhas) |

#### Filtros (Admin)

| Componente | Uso |
|---|---|
| `FilterBar` | Barra horizontal com selects, date range, search |
| `FilterChip` | Chips removíveis para filtros ativos |
| `DateRangePicker` | Seleção de período com presets (7d, 30d, 90d) |

#### Alertas (Admin)

| Variante | Ícone | Background | Uso |
|---|---|---|---|
| `info` | Info | `info` 10% | Informação operacional |
| `warning` | Alert-triangle | `warning` 10% | Atenção necessária |
| `error` | Alert-circle | `error` 10% | Erro crítico |
| `success` | Check-circle | `success` 10% | Ação concluída |

---

## 8. Layouts por Superfície

### 8.1 Área Pública

| Página | Layout | Componentes principais |
|---|---|---|
| Home | Hero + seções horizontais (carrossel/grid) | `HeroBanner`, `ProfileGrid`, `SectionHeader` |
| Busca | Sidebar filtros (desktop) / drawer (mobile) + grid | `FilterPanel`, `ProfileGrid`, `SearchInput` |
| Perfil | Header foto + info + galeria + reviews | `ProfileHeader`, `PhotoGallery`, `ReviewList` |
| Momentos | Feed vertical (1 col mobile, 2–3 desktop) | `MomentCard`, `InfiniteScroll` |
| Vídeos | Grid 16:9 | `VideoCard`, `VideoPlayer` |
| Rankings | Tabela/grid com posição | `RankingTable`, `HotScoreIndicator` |

**Container:** `max-width: 1400px`; padding horizontal `space.4` (mobile) / `space.8` (desktop).

### 8.2 Área do Acompanhante

| Página | Layout | Componentes principais |
|---|---|---|
| Dashboard | MetricCards grid + gráficos + atividade recente | `MetricCard`, `LineChart`, `ActivityFeed` |
| Editar perfil | Formulário em seções (tabs ou accordion) | `FormSection`, `PhotoUpload`, `TagSelector` |
| Fotos/Vídeos | Grid com drag-and-drop reorder | `MediaGrid`, `PhotoUpload`, `SortableList` |
| Momentos | Feed próprio + botão criar | `MomentCard`, `CreateMomentModal` |
| Mensagens | Lista conversas + thread | `ConversationList`, `MessageThread` |
| Configurações | Formulário simples | `SettingsForm`, `Switch`, `NotificationPrefs` |

**Layout:** Sidebar (desktop) / drawer (mobile) + área de conteúdo com breadcrumb.

### 8.3 Área Administrativa

| Página | Layout | Componentes principais |
|---|---|---|
| Dashboard | MetricCards + filas de ação + gráficos | `MetricCard`, `ActionQueue`, `BarChart` |
| Moderação | Tabela com preview + ações inline | `DataTable`, `ModerationPreview`, `ActionButtons` |
| Perfis | Tabela filtrável + detalhe lateral | `DataTable`, `FilterBar`, `DetailDrawer` |
| Configurações | Formulário por grupo | `SettingsGroup`, `KeyValueEditor` |
| Auditoria | Tabela cronológica + filtros | `AuditLog`, `DateRangePicker` |

**Layout:** Sidebar fixa + header com busca global + área de conteúdo densa.

**Diferença visual do admin:** Maior densidade informacional (tabelas, menos padding), mas **mesmos tokens** de cor e tipografia.

---

## 9. Responsividade

### 9.1 Breakpoints

| Token | Largura | Dispositivo |
|---|---|---|
| `breakpoint.sm` | ≥ 640px | Smartphone grande |
| `breakpoint.md` | ≥ 768px | Tablet portrait |
| `breakpoint.lg` | ≥ 1024px | Tablet landscape / desktop pequeno |
| `breakpoint.xl` | ≥ 1280px | Desktop |
| `breakpoint.2xl` | ≥ 1440px | Desktop wide |

**Abordagem:** Mobile First — estilos base para mobile; media queries `min-width` para telas maiores.

### 9.2 Adaptação de Componentes

| Componente | Mobile (< 640px) | Tablet (640–1024px) | Desktop (> 1024px) |
|---|---|---|---|
| ProfileGrid | 1–2 colunas | 2–3 colunas | 3–4 colunas |
| CompanionCard | Full width | 50% | 25–33% |
| Sidebar | Drawer | Drawer | Fixa 260px |
| Header | Logo + ícones | Logo + busca compacta | Logo + busca + menu |
| Bottom nav | Visível | Visível | Oculta |
| Filtros busca | Drawer bottom | Sidebar colapsável | Sidebar fixa |
| Tabelas admin | Cards empilhados | Scroll horizontal | Tabela completa |
| Modal | Fullscreen | Centralizado 90% | Centralizado max 600px |
| Dashboard metrics | 2 colunas | 2–3 colunas | 3–4 colunas |

### 9.3 Grid System

| Propriedade | Valor |
|---|---|
| Colunas | 12 |
| Gutter | `space.4` (mobile), `space.6` (desktop) |
| Margin | `space.4` (mobile), `space.8` (desktop) |

---

## 10. Experiência Mobile

### 10.1 Gestos

| Gesto | Ação | Componente |
|---|---|---|
| Swipe horizontal | Trocar foto no card / navegar galeria | `CompanionCard`, `PhotoGallery` |
| Swipe vertical | Scroll de feed (momentos) | `MomentFeed` |
| Pull to refresh | Atualizar feed / dashboard | `PullRefresh` |
| Long press | Menu contextual (admin: ações rápidas) | `ContextMenu` |
| Pinch | Zoom em foto (lightbox) | `Lightbox` |

### 10.2 Cards Deslizáveis

Para seções horizontais (Home: "Em Destaque", "Premium"):

| Propriedade | Valor |
|---|---|
| Scroll | Snap horizontal (`scroll-snap-type: x mandatory`) |
| Card width | 75vw (mobile), 280px (tablet+) |
| Gap | `space.4` |
| Indicador | Dots ou scrollbar sutil |

### 10.3 Navegação Mobile

| Superfície | Padrão |
|---|---|
| Pública | Bottom nav: Home, Busca, Rankings, Login |
| Companion | Bottom nav: Dashboard, Perfil, Momentos, Mensagens |
| Admin | Sem bottom nav; hamburger → drawer sidebar |

### 10.4 Touch Targets

| Regra | Valor |
|---|---|
| Mínimo | 44×44px (WCAG 2.5.5) |
| Espaçamento entre targets | ≥ 8px |
| Botões em mobile | Height mínimo 48px |

---

## 11. Animações e Microinterações

### 11.1 Catálogo de Animações

| Nome | Duração | Easing | Uso |
|---|---|---|---|
| `fade-in` | 300ms | ease-out | Entrada de seções |
| `fade-in-up` | 500ms | ease-out | Scroll reveal de cards |
| `card-hover` | 300ms | default | Elevação e translateY em cards |
| `photo-crossfade` | 250ms | ease-in-out | Troca de foto no card |
| `skeleton-pulse` | 1500ms | ease-in-out (loop) | Loading skeleton |
| `badge-enter` | 400ms | spring | Aparição de badges |
| `modal-enter` | 200ms | ease-out | Abertura de modal |
| `modal-exit` | 150ms | ease-in | Fechamento de modal |
| `toast-enter` | 300ms | spring | Notificação toast |
| `slide-up` | 300ms | ease-out | Drawer mobile (bottom) |
| `flame-flicker` | 2000ms | ease-in-out (loop) | Hot Score "Em chamas" |
| `progress-fill` | linear | — | Barras de upload/progresso |

### 11.2 Microinterações

| Interação | Feedback |
|---|---|
| Botão clique | `scale(0.98)` por 100ms |
| Toggle switch | Thumb desliza 200ms |
| Like | Ícone scale 1.2 → 1.0 + cor (300ms) |
| Notificação nova | Badge bounce sutil (400ms, once) |
| Copiar link | Ícone muda para check (1500ms) |
| Upload completo | Check animado + fade no progress bar |

### 11.3 Regras

| ID | Regra |
|---|---|
| RN-ANIM-001 | Respeitar `prefers-reduced-motion: reduce` — desabilitar animações decorativas |
| RN-ANIM-002 | Animações funcionais (loading, progress) mantidas mesmo com reduced motion |
| RN-ANIM-003 | Nenhuma animação > 500ms exceto skeleton pulse (loop) |
| RN-ANIM-004 | Scroll reveal: máximo 1 animação por viewport (Intersection Observer) |
| RN-ANIM-005 | Flame flicker apenas em `blazing` level |

---

## 12. Estados de Interface

Todo componente e página deve prever os seguintes estados:

### 12.1 Loading

| Contexto | Componente | Visual |
|---|---|---|
| Página inteira | `PageSkeleton` | Layout skeleton da página |
| Grid de cards | `CardSkeleton` | Retângulos 3:4 com pulse |
| Tabela | `TableSkeleton` | 5 rows com pulse |
| Botão | Spinner inline | Spinner 16px + largura fixa |
| Imagem | `ImageSkeleton` | Blur placeholder (blur_hash) |
| Métrica | `MetricSkeleton` | Retângulo largo + retângulo curto |

Cor do pulse: `bg.tertiary` → `bg.elevated` (alternância).

### 12.2 Empty (Vazio)

| Contexto | Mensagem exemplo | CTA |
|---|---|---|
| Busca sem resultados | "Nenhum perfil encontrado" | "Limpar filtros" |
| Sem momentos | "Nenhum momento publicado" | "Criar momento" (companion) |
| Sem mensagens | "Nenhuma conversa" | — |
| Sem notificações | "Tudo em dia!" | — |
| Dashboard zerado | "Seu perfil ainda não recebeu visitas" | "Melhorar perfil" |

Visual: Ilustração sutil (ícone grande muted) + texto `base` + CTA ghost ou primary.

### 12.3 Error

| Contexto | Componente | Visual |
|---|---|---|
| Erro de página | `ErrorPage` | Mensagem + botão "Tentar novamente" |
| Erro inline (form) | Mensagem abaixo do campo | Texto `sm / error` + ícone |
| Erro de API (toast) | `Toast` variant error | Auto-dismiss 5s + botão retry |
| Erro de rede | `OfflineBanner` | Banner fixo top: "Sem conexão" |

### 12.4 Success

| Contexto | Componente | Visual |
|---|---|---|
| Ação concluída | `Toast` variant success | Auto-dismiss 3s |
| Formulário salvo | `Toast` ou banner inline | Check + "Salvo com sucesso" |
| Upload completo | Transição no `PhotoUpload` | Thumbnail + check animado |

### 12.5 Sem Permissão

| Contexto | Componente | Visual |
|---|---|---|
| Rota protegida | Redirect para login | — |
| Ação não permitida | `PermissionDenied` | Ícone lock + mensagem + link voltar |
| Feature desabilitada | Componente oculto ou disabled | Tooltip: "Disponível com Premium" |

### 12.6 Estados Especiais

| Estado | Página | Visual |
|---|---|---|
| 404 | `NotFoundPage` | Ilustração + busca sugerida |
| 410 (perfil removido) | `GonePage` | Mensagem + perfis semelhantes |
| Perfil pendente (companion) | Banner top | Amarelo: "Seu perfil está em análise" |
| Perfil bloqueado (companion) | Banner top | Vermelho: "Perfil bloqueado" + motivo |
| Offline | `OfflineBanner` | Banner discreto fixo |

---

## 13. Acessibilidade

### 13.1 Contraste

| Elemento | Ratio mínimo | Padrão |
|---|---|---|
| Texto normal (< 18px) | 4.5:1 | WCAG AA |
| Texto grande (≥ 18px bold / 24px) | 3:1 | WCAG AA |
| Componentes UI (bordas, ícones) | 3:1 | WCAG AA |
| Texto em badges Premium | 4.5:1 sobre gradiente | Validar gold/orange sobre texto inverse |

### 13.2 Navegação por Teclado

| Requisito | Implementação |
|---|---|
| Tab order | Lógico: header → conteúdo → footer |
| Focus visible | Ring 2px `brand.purple-light`, offset 2px |
| Skip link | "Pular para conteúdo" (oculto, visível on focus) |
| Modais | Trap focus; Escape fecha |
| Dropdowns | Arrow keys navegam; Enter seleciona |
| Carrossel | Arrow keys navegam itens |

### 13.3 Screen Readers

| Elemento | ARIA |
|---|---|
| Badges | `aria-label="Premium"`, `aria-label="Verificado"` |
| Hot Score | `aria-label="Hot Score: 82, Em chamas"` |
| Botões com ícone | `aria-label` descritivo |
| Loading | `aria-busy="true"`, `aria-live="polite"` |
| Toast | `role="alert"`, `aria-live="assertive"` |
| Modal | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` |
| Rating | `role="img"`, `aria-label="4 de 5 estrelas"` |

### 13.4 Imagens

| Tipo | Alt text |
|---|---|
| Foto de perfil (card) | `"{nome}, {idade} anos, {cidade}"` |
| Foto de perfil (página) | `"{nome} — foto {número} de {total}"` |
| Thumbnail vídeo | `"{título do vídeo}"` |
| Avatar (mensagens) | `"{nome do remetente}"` |
| Decorativa | `alt=""` (vazia) |

### 13.5 Formulários Acessíveis

| Requisito | Implementação |
|---|---|
| Labels | Todo input com `<label>` associado ou `aria-label` |
| Erros | `aria-invalid="true"` + `aria-describedby` apontando para mensagem |
| Required | `aria-required="true"` + indicação visual (*) |
| Grupos | `fieldset` + `legend` para radio/checkbox groups |

---

## 14. Biblioteca de Componentes

### 14.1 Catálogo Completo

| Componente | Categoria | Variantes / Props principais | Superfícies |
|---|---|---|---|
| `Button` | Ação | primary, secondary, ghost, danger, success, premium; sm/md/lg | Todas |
| `IconButton` | Ação | ghost; com aria-label | Todas |
| `Card` | Container | default, elevated, glass, interactive | Todas |
| `CompanionCard` | Domínio | profile data props | Pública |
| `VideoCard` | Domínio | video data props | Pública |
| `MomentCard` | Domínio | moment data props | Pública, Companion |
| `MetricCard` | Dashboard | icon, value, label, trend | Companion, Admin |
| `Badge` | Indicador | premium, featured, verified, new, trending, status | Todas |
| `HotScoreIndicator` | Indicador | compact, bar, gauge, flame | Todas |
| `Avatar` | Mídia | size (sm/md/lg/xl), src, fallback | Todas |
| `Tag` | Indicador | label, removable | Pública, Companion |
| `TagList` | Indicador | tags, maxVisible | Pública |
| `Rating` | Indicador | value, max, readonly, size | Pública |
| `Modal` | Overlay | sm/md/lg/fullscreen | Todas |
| `Drawer` | Overlay | left, right, bottom | Todas |
| `Dropdown` | Navegação | items, trigger | Todas |
| `Tabs` | Navegação | horizontal, vertical | Companion, Admin |
| `Table` / `DataTable` | Dados | sortable, paginated, selectable | Admin |
| `Toast` | Feedback | success, error, warning, info | Todas |
| `NotificationBell` | Feedback | count, onClick | Companion, Admin |
| `SearchInput` | Entrada | autocomplete, debounce | Pública, Admin |
| `Input` | Entrada | text, email, password, number | Todas |
| `Select` | Entrada | single, multi | Todas |
| `Textarea` | Entrada | maxLength, counter | Companion, Admin |
| `Checkbox` | Entrada | checked, indeterminate | Todas |
| `Radio` | Entrada | group | Todas |
| `Switch` | Entrada | on/off | Companion, Admin |
| `PhotoUpload` | Mídia | multiple, max, onUpload | Companion |
| `VideoUpload` | Mídia | maxDuration, onUpload | Companion |
| `FileUpload` | Mídia | accept, maxSize | Companion, Admin |
| `Carousel` | Mídia | autoplay, snap | Pública |
| `PhotoGallery` | Mídia | photos, lightbox | Pública, Companion |
| `Lightbox` | Mídia | fullscreen, zoom, swipe | Pública |
| `VideoPlayer` | Mídia | src, poster, controls | Pública |
| `Skeleton` | Estado | card, text, circle, table | Todas |
| `EmptyState` | Estado | icon, title, description, action | Todas |
| `ErrorPage` | Estado | code, message, retry | Todas |
| `Spinner` | Estado | sm/md/lg | Todas |
| `ProgressBar` | Estado | value, max, variant | Todas |
| `Breadcrumb` | Navegação | items | Companion, Admin |
| `Sidebar` | Navegação | items, collapsed, activeItem | Companion, Admin |
| `Header` | Navegação | logo, search, menu, actions | Pública |
| `Footer` | Navegação | links, copyright | Pública |
| `BottomNav` | Navegação | items, activeItem | Mobile |
| `FilterBar` | Dados | filters, onChange | Pública, Admin |
| `FilterChip` | Dados | label, onRemove | Pública, Admin |
| `Pagination` | Dados | page, totalPages, onChange | Admin |
| `LineChart` | Dashboard | data, xKey, yKey | Companion, Admin |
| `BarChart` | Dashboard | data, categories | Admin |
| `ActivityFeed` | Dashboard | items, maxItems | Companion, Admin |
| `ConversationList` | Mensagens | conversations, activeId | Companion, Admin |
| `MessageThread` | Mensagens | messages, onSend | Companion, Admin |
| `ProfileHeader` | Domínio | profile data | Pública |
| `ProfileGrid` | Domínio | profiles, columns | Pública |
| `RankingTable` | Domínio | entries, type | Pública |
| `ReviewList` | Domínio | reviews, pagination | Pública |
| `SectionHeader` | Layout | title, subtitle, action | Pública |
| `HeroBanner` | Layout | title, subtitle, cta | Pública |
| `OfflineBanner` | Estado | — | Todas |
| `PermissionDenied` | Estado | message | Companion, Admin |

### 14.2 Componentes de Composição (Patterns)

Padrões que combinam múltiplos componentes — residem em `packages/ui/patterns/`:

| Pattern | Composição | Uso |
|---|---|---|
| `FormSection` | Title + Description + Fields + Actions | Formulários longos |
| `ActionQueue` | Table compacta + ActionButtons | Admin moderação |
| `ModerationPreview` | Image + Metadata + Approve/Reject | Admin |
| `SettingsGroup` | Card + KeyValue fields | Admin settings |
| `InfiniteScroll` | Sentinel + Skeleton + Content | Feeds |
| `PullRefresh` | Wrapper + Spinner | Mobile feeds |

---

## 15. Documentação Visual e Governança

### 15.1 Storybook

| Aspecto | Especificação |
|---|---|
| Localização | `packages/ui/.storybook/` |
| Cobertura | Todo componente do catálogo com todas as variantes e estados |
| Addons | A11y, Viewport, Controls, Themes |
| Organização | Por categoria (Ação, Container, Entrada, etc.) |

### 15.2 Regras de Uso

| ID | Regra |
|---|---|
| RN-DOC-001 | Antes de criar componente novo, verificar catálogo (§14.1) |
| RN-DOC-002 | Componente novo exige story no Storybook antes do merge |
| RN-DOC-003 | Props documentadas com JSDoc / TSDoc |
| RN-DOC-004 | Variantes limitadas — não criar variante sem 2+ casos de uso |
| RN-DOC-005 | Combinações proibidas documentadas (ex.: 2 botões primary na mesma seção) |

### 15.3 Processo de Evolução do DS

```
1. Proposta (issue/PR) com justificativa
2. Design review (conformidade com tokens)
3. Implementação em packages/ui/
4. Story no Storybook
5. Consumo nas apps (sem override local)
6. Atualização deste documento (se novo componente)
```

### 15.4 Combinações Recomendadas

| Contexto | Combinação |
|---|---|
| Card de perfil | `Card(interactive)` + `Badge` + `TagList` + `HotScoreIndicator(compact)` |
| Dashboard métrica | `MetricCard` + `Sparkline` + `Trend` |
| Formulário de perfil | `FormSection` + `Input` + `Select` + `PhotoUpload` + `Button(primary)` |
| Moderação admin | `DataTable` + `ModerationPreview` + `Button(danger/success)` |
| Busca pública | `SearchInput` + `FilterBar` + `ProfileGrid` + `EmptyState` |

### 15.5 Combinações Proibidas

| Combinação | Motivo |
|---|---|
| 2+ botões Primary na mesma seção | Confusão de hierarquia |
| Badge Premium + Badge Destaque + Badge Verificado + Badge New no mesmo card | Poluição visual (máx. 3) |
| Glassmorphism em glassmorphism (modal sobre modal glass) | Legibilidade comprometida |
| Cor de erro como background de seção inteira | Alarmismo visual |
| Animação flame em score < 76 | Inconsistente com nível |

---

## 16. Critérios de Aceitação

### 16.1 Identidade e Tokens

| ID | Critério | Prioridade |
|---|---|---|
| CA-DS-01 | Tema Dark Premium aplicado em todas as superfícies | Must |
| CA-DS-02 | Design tokens centralizados em `packages/ui/tokens/` | Must |
| CA-DS-03 | Zero hardcode de cores fora dos tokens | Must |
| CA-DS-04 | Paleta conforme §3 (14 cores + gradientes) | Must |
| CA-DS-05 | Tipografia Inter + DM Sans conforme §4 | Must |

### 16.2 Componentes

| ID | Critério | Prioridade |
|---|---|---|
| CA-DS-10 | Catálogo §14.1 implementado em `packages/ui/components/` | Must |
| CA-DS-11 | Componentes sem lógica de negócio (apenas props) | Must |
| CA-DS-12 | CompanionCard conforme §7.3 (foto, badges, tags, score) | Must |
| CA-DS-13 | HotScoreIndicator com 4 variantes e 4 níveis | Must |
| CA-DS-14 | Badges: premium, featured, verified, new, trending | Must |
| CA-DS-15 | Botões: 6 variantes × 5 estados | Must |
| CA-DS-16 | Upload de mídia com 5 estados visuais | Must |
| CA-DS-17 | Máximo 300 linhas por arquivo de componente | Must |

### 16.3 Layouts e Navegação

| ID | Critério | Prioridade |
|---|---|---|
| CA-DS-20 | Header público com glassmorphism e busca | Must |
| CA-DS-21 | Sidebar companion/admin com estados expandido/colapsado | Must |
| CA-DS-22 | Bottom nav mobile nas superfícies definidas | Must |
| CA-DS-23 | Dashboard com MetricCard, gráficos e tabelas | Must |
| CA-DS-24 | Breadcrumb em companion e admin | Should |

### 16.4 Responsividade

| ID | Critério | Prioridade |
|---|---|---|
| CA-DS-30 | Mobile First com 5 breakpoints definidos | Must |
| CA-DS-31 | ProfileGrid adapta colunas por breakpoint | Must |
| CA-DS-32 | Touch targets ≥ 44×44px em mobile | Must |
| CA-DS-33 | Sidebar vira drawer em mobile | Must |
| CA-DS-34 | Carrossel com scroll-snap em mobile | Should |

### 16.5 Animações

| ID | Critério | Prioridade |
|---|---|---|
| CA-DS-40 | Catálogo §11.1 implementado | Must |
| CA-DS-41 | `prefers-reduced-motion` respeitado | Must |
| CA-DS-42 | Nenhuma animação decorativa > 500ms | Must |
| CA-DS-43 | Card hover com translateY e shadow | Must |

### 16.6 Estados

| ID | Critério | Prioridade |
|---|---|---|
| CA-DS-50 | Loading: skeleton em cards, tabelas e páginas | Must |
| CA-DS-51 | Empty: ilustração + mensagem + CTA | Must |
| CA-DS-52 | Error: toast, inline e página dedicada | Must |
| CA-DS-53 | Success: toast com auto-dismiss | Must |
| CA-DS-54 | Sem permissão: componente dedicado | Must |

### 16.7 Acessibilidade

| ID | Critério | Prioridade |
|---|---|---|
| CA-DS-60 | Contraste WCAG AA em todos os textos | Must |
| CA-DS-61 | Focus visible em todos os interativos | Must |
| CA-DS-62 | ARIA labels em badges, scores e botões-ícone | Must |
| CA-DS-63 | Alt text em todas as imagens de perfil | Must |
| CA-DS-64 | Formulários com labels e aria-describedby | Must |

### 16.8 Governança

| ID | Critério | Prioridade |
|---|---|---|
| CA-DS-70 | Storybook com stories para todo componente | Must |
| CA-DS-71 | Nenhum componente duplicado em apps (apenas composição) | Must |
| CA-DS-72 | Processo de evolução do DS documentado | Should |
| CA-DS-73 | Componentes novos atualizam este documento | Should |

### 16.9 Arquitetura

| ID | Critério | Prioridade |
|---|---|---|
| CA-DS-80 | DS em `packages/ui/` conforme Documento 1 | Must |
| CA-DS-81 | Apps importam de `@acompannhante/ui` — sem cópia local | Must |
| CA-DS-82 | Tokens semânticos (3 camadas: primitivo → semântico → componente) | Must |
| CA-DS-83 | Mesmos tokens preparados para React Native (futuro) | Should |

---

## Apêndice A — Mapa de Tokens → CSS Variables

Referência para implementação (valores já aplicados em `apps/web/app/globals.css`):

| Token semântico | CSS Variable | Hex/Valor |
|---|---|---|
| `color.bg.primary` | `--bg-primary` | `#0A0A0F` |
| `color.bg.secondary` | `--bg-secondary` | `#14141F` |
| `color.bg.tertiary` | `--bg-tertiary` | `#1E1E2E` |
| `color.bg.elevated` | `--surface-elevated` | `#252536` |
| `color.brand.purple` | `--purple-deep` | `#6B21A8` |
| `color.brand.purple-light` | `--purple-light` | `#9333EA` |
| `color.brand.gold` | `--gold` | `#F59E0B` |
| `color.brand.orange` | `--orange` | `#EA580C` |
| `color.text.primary` | `--text-primary` | `#F8FAFC` |
| `color.text.secondary` | `--text-secondary` | `#94A3B8` |
| `color.text.muted` | `--text-muted` | `#64748B` |
| `color.border.subtle` | `--border-subtle` | `#1E293B` |
| `color.status.success` | `--success` | `#22C55E` |
| `color.status.error` | `--error` | `#EF4444` |

---

## Apêndice B — Referências Cruzadas

| Documento | Relação |
|---|---|
| [Documento 1 — Arquitetura](../arquitetura/DOCUMENTO-01-ARQUITETURA-DA-PLATAFORMA.md) | `packages/ui/`, restrições de componentes |
| [Documento 2 — Área Pública](./DOCUMENTO-02-AREA-PUBLICA.md) | §9 Requisitos UX (paleta, cards, animações) |
| [Documento 3 — Acompanhante](./DOCUMENTO-03-AREA-DO-ACOMPANHANTE.md) | §9 Dashboard, sidebar, mobile |
| [Documento 4 — Admin](./DOCUMENTO-04-AREA-ADMINISTRATIVA.md) | §10 Tabelas, moderação, densidade |
| [Documento 5 — Engajamento](./DOCUMENTO-05-MODULOS-ENGAJAMENTO-INTELIGENCIA-DESCOBERTA.md) | HotScoreIndicator, Rankings |
| [Documento 6 — Conteúdo](./DOCUMENTO-06-CONTEUDO-MIDIA-E-INTERACOES.md) | Upload, MomentCard, VideoCard |
| [Documento 9 — Banco de Dados](./DOCUMENTO-09-BANCO-DE-DADOS-MODELAGEM-E-ESTRUTURA-DE-DADOS.md) | Dados exibidos nos componentes (via props) |

---

> **Este documento é a especificação oficial do Design System e da experiência visual da plataforma.**  
> Toda implementação de interface deve consumir componentes e tokens de `packages/ui/`.  
> Desvios exigem atualização formal deste documento e validação contra o Documento 1.
