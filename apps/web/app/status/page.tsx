import Link from "next/link";
import { PublicFooter, PublicHeader } from "@/components/public-header";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type CheckResult = { ok: boolean; detail: string };

async function checkApi(): Promise<CheckResult> {
  try {
    const res = await fetch(`${API_URL}/api/health`, { cache: "no-store" });
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const json = await res.json();
    return { ok: true, detail: json.status ?? "ok" };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "offline" };
  }
}

async function checkProfiles(): Promise<CheckResult> {
  try {
    const res = await fetch(`${API_URL}/api/v1/profiles`, { cache: "no-store" });
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const json = await res.json();
    return { ok: true, detail: `${json.total ?? json.data?.length ?? 0} perfis` };
  } catch {
    return { ok: false, detail: "API indisponível — usando mock" };
  }
}

const routes = [
  { href: "/", label: "Home", phase: "Fase 0–2", desc: "Hero, destaques, premium, categorias, momentos" },
  { href: "/busca", label: "Busca", phase: "Fase 2", desc: "Filtros por nome, cidade, tag, premium" },
  { href: "/rankings", label: "Rankings", phase: "Fase 2", desc: "Em alta, mais vistos, premium" },
  { href: "/cidade/sao-paulo", label: "Cidade", phase: "Fase 2", desc: "Landing por cidade" },
  { href: "/categoria/massagem", label: "Categoria", phase: "Fase 2", desc: "Landing por tag" },
  { href: "/videos", label: "Vídeos", phase: "Fase 3", desc: "Galeria de vídeos" },
  { href: "/momentos", label: "Momentos", phase: "Fase 3", desc: "Feed com curtidas" },
  { href: "/perfil/maria-santos", label: "Perfil", phase: "Fase 1–4", desc: "Bio, WhatsApp, reviews, comentários" },
  { href: "/login", label: "Login", phase: "Fase 1", desc: "Autenticação JWT" },
  { href: "/cadastro", label: "Cadastro", phase: "Fase 1", desc: "Registro de acompanhante" },
  { href: "/painel", label: "Painel", phase: "Fase 1–6", desc: "Bio, fotos, vídeos, momentos, WhatsApp, 🔔" },
  { href: "/painel/status", label: "Status (painel)", phase: "Fase 6", desc: "Premium, Destaque, hot score" },
  { href: "/painel/mensagens", label: "Mensagens (painel)", phase: "Fase 5", desc: "Contato com administração" },
  { href: "/admin/mensagens", label: "Mensagens (admin)", phase: "Fase 5", desc: "Responder acompanhantes" },
  { href: "/admin/premium", label: "Premium & Destaque", phase: "Fase 6", desc: "Ativar/remover badges com expiração" },
  { href: "/admin/configuracoes", label: "Configurações CMS", phase: "Fase 5", desc: "Textos do hero e flags do site" },
  { href: "/admin/auditoria", label: "Auditoria", phase: "Fase 5", desc: "Log de ações administrativas" },
  { href: "/admin", label: "Admin", phase: "Fase 1–5", desc: "Moderação perfis, comentários, avaliações" },
];

const phases = [
  { name: "Fase 0 — Fundação", done: true, items: ["Monorepo", "Docker Compose", "Prisma multi-schema", "Tema Dark Premium"] },
  { name: "Fase 1 — MVP", done: true, items: ["Auth JWT", "Perfis", "Fotos", "Admin moderação", "Painel"] },
  { name: "Fase 2 — Descoberta", done: true, items: ["Meilisearch", "Busca", "Rankings", "SEO", "Cidade/Categoria"] },
  { name: "Fase 3 — Conteúdo", done: true, items: ["Vídeos", "Momentos", "Comentários", "Reviews", "MinIO storage"] },
  { name: "Fase 4 — Comunicação", done: true, items: ["Notificações in-app", "WhatsApp real", "E-mail MailHog", "Event bus"] },
  { name: "Fase 5 — Operações", done: true, items: ["Mensagens companion↔admin", "CMS/Settings", "Audit log"] },
  { name: "Fase 6 — Monetização", done: true, items: ["Premium/Destaque admin", "Expiração automática", "Status companion", "Notificações"] },
];

export default async function StatusPage() {
  const [api, profiles] = await Promise.all([checkApi(), checkProfiles()]);
  const dataSource = profiles.ok ? "api" : "mock";

  return (
    <div className="min-h-screen bg-bg-primary">
      <PublicHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-text-primary">Status do Projeto</h1>
        <p className="mt-2 text-text-secondary">
          Visão geral do que está implementado e do estado dos serviços.
        </p>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border-subtle bg-bg-secondary p-5">
            <p className="text-sm text-text-muted">API NestJS</p>
            <p className={`mt-1 text-xl font-bold ${api.ok ? "text-success" : "text-orange"}`}>
              {api.ok ? "Online" : "Offline"}
            </p>
            <p className="mt-1 text-xs text-text-muted">{api.detail}</p>
          </div>
          <div className="rounded-2xl border border-border-subtle bg-bg-secondary p-5">
            <p className="text-sm text-text-muted">Dados na Home</p>
            <p className={`mt-1 text-xl font-bold ${dataSource === "api" ? "text-success" : "text-gold"}`}>
              {dataSource === "api" ? "PostgreSQL" : "Mock"}
            </p>
            <p className="mt-1 text-xs text-text-muted">{profiles.detail}</p>
          </div>
          <div className="rounded-2xl border border-border-subtle bg-bg-secondary p-5">
            <p className="text-sm text-text-muted">Web Next.js</p>
            <p className="mt-1 text-xl font-bold text-success">Online</p>
            <p className="mt-1 text-xs text-text-muted">http://localhost:3000</p>
          </div>
        </section>

        {!api.ok && (
          <div className="mt-6 rounded-2xl border border-orange/40 bg-orange/10 p-5">
            <p className="font-medium text-orange">Docker Desktop necessário</p>
            <p className="mt-2 text-sm text-text-secondary">
              A API precisa do PostgreSQL. Instale o Docker Desktop e execute:
            </p>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-bg-primary p-4 text-xs text-text-secondary">
{`npm run docker:up
npx prisma db push
npm run db:seed
npm run dev:api`}
            </pre>
            <p className="mt-3 text-sm text-text-muted">
              Contas demo: <code className="text-purple-light">admin@demo.local</code> /{" "}
              <code className="text-purple-light">Admin123!</code>
            </p>
          </div>
        )}

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-text-primary">Fases concluídas</h2>
          <div className="mt-4 space-y-3">
            {phases.map((phase) => (
              <div
                key={phase.name}
                className="rounded-2xl border border-border-subtle bg-bg-secondary p-4"
              >
                <div className="flex items-center gap-2">
                  <span className={phase.done ? "text-success" : "text-text-muted"}>
                    {phase.done ? "✓" : "○"}
                  </span>
                  <span className="font-medium text-text-primary">{phase.name}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {phase.items.map((item) => (
                    <span
                      key={item}
                      className="rounded-full bg-bg-tertiary px-3 py-1 text-xs text-text-secondary"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold text-text-primary">Navegar pelo site</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className="rounded-2xl border border-border-subtle bg-bg-secondary p-4 transition-colors hover:border-purple-deep/40"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-text-primary">{route.label}</span>
                  <span className="text-xs text-purple-light">{route.phase}</span>
                </div>
                <p className="mt-1 text-sm text-text-muted">{route.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-purple-deep/30 bg-purple-deep/10 p-6">
          <h2 className="text-lg font-semibold text-purple-light">Visual — Dark Premium</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Fundo escuro (#0a0a0f), acentos roxo (#6b21a8) e dourado (#f59e0b), cards com bordas
            sutis, gradientes nas fotos dos perfis, badges Premium/Destaque/Hot Score.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {["bg-primary", "purple-deep", "gold", "success"].map((c) => (
              <div key={c} className="flex items-center gap-2">
                <div
                  className={`h-8 w-8 rounded-lg border border-border-subtle ${
                    c === "bg-primary"
                      ? "bg-bg-primary"
                      : c === "purple-deep"
                        ? "bg-purple-deep"
                        : c === "gold"
                          ? "bg-gold"
                          : "bg-success"
                  }`}
                />
                <span className="text-xs text-text-muted">{c}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
