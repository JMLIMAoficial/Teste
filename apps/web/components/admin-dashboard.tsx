"use client";

import Link from "next/link";

type ProfileInsight = {
  id: string;
  slug: string;
  displayName: string;
  city?: string;
  state?: string;
  viewCount: number;
  hotScore: number | null;
  hotScoreLevel: string | null;
  whatsappClicks: number;
  isPremium: boolean;
  isVerified: boolean;
};

type RecentProfile = {
  id: string;
  slug: string;
  displayName: string;
  status: string;
  city?: string;
  state?: string;
  createdAt: string;
};

type CityInsight = {
  city: string;
  state: string;
  count: number;
};

export type AdminDashboardStats = {
  pendingProfiles: number;
  approvedProfiles: number;
  rejectedProfiles: number;
  blockedProfiles: number;
  totalProfiles: number;
  totalUsers: number;
  pendingComments: number;
  pendingReviews: number;
  pendingVideos: number;
  pendingMoments: number;
  moderationQueue: number;
  insights: {
    totalViews: number;
    viewsLast7Days: number;
    viewsLast30Days: number;
    totalWhatsAppClicks: number;
    newProfilesLast7Days: number;
    newProfilesLast30Days: number;
    premiumActive: number;
    verifiedActive: number;
    viewsTrend: Array<{ date: string; count: number }>;
    topByViews: ProfileInsight[];
    topByHotScore: ProfileInsight[];
    topByWhatsAppClicks: ProfileInsight[];
    recentProfiles: RecentProfile[];
    topCities: CityInsight[];
  };
};

function formatDayLabel(isoDate: string) {
  const [, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}

function hotLevelColor(level: string | null) {
  if (level === "blazing") return "text-red-400";
  if (level === "hot") return "text-orange-400";
  if (level === "warm") return "text-gold";
  return "text-text-muted";
}

function statusBadge(status: string) {
  if (status === "approved") return "bg-success/15 text-success";
  if (status === "pending") return "bg-purple-deep/15 text-purple-light";
  if (status === "rejected") return "bg-red-500/15 text-red-400";
  return "bg-bg-tertiary text-text-muted";
}

function ProfileRankList({
  title,
  profiles,
  metric,
}: {
  title: string;
  profiles: ProfileInsight[];
  metric: "views" | "hotScore" | "whatsapp";
}) {
  return (
    <section className="rounded-2xl border border-border-subtle bg-bg-secondary p-5">
      <h2 className="font-semibold text-text-primary">{title}</h2>
      {profiles.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted">Sem dados ainda.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {profiles.map((p, index) => (
            <li key={p.id}>
              <Link
                href={`/admin/perfis/${p.id}`}
                className="flex items-center gap-3 rounded-xl border border-transparent p-2 transition-colors hover:border-purple-deep/30 hover:bg-bg-tertiary"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-deep/20 text-xs font-bold text-purple-light">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-text-primary">{p.displayName}</p>
                    {p.isPremium && (
                      <span className="rounded-full bg-gold/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gold">
                        Premium
                      </span>
                    )}
                    {p.isVerified && (
                      <span className="rounded-full bg-success/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-success">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted">
                    {p.city}, {p.state}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {metric === "views" && (
                    <>
                      <p className="text-sm font-semibold text-text-primary">{p.viewCount}</p>
                      <p className="text-[10px] text-text-muted">views</p>
                    </>
                  )}
                  {metric === "hotScore" && (
                    <>
                      <p className={`text-sm font-semibold ${hotLevelColor(p.hotScoreLevel)}`}>
                        {p.hotScore ?? 0}
                      </p>
                      <p className="text-[10px] capitalize text-text-muted">
                        {p.hotScoreLevel ?? "cold"}
                      </p>
                    </>
                  )}
                  {metric === "whatsapp" && (
                    <>
                      <p className="text-sm font-semibold text-success">{p.whatsappClicks}</p>
                      <p className="text-[10px] text-text-muted">cliques</p>
                    </>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function AdminDashboard({ stats }: { stats: AdminDashboardStats }) {
  const { insights } = stats;
  const maxTrend = Math.max(...insights.viewsTrend.map((d) => d.count), 1);

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Visão geral</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Dashboard analítico da plataforma — tráfego, engajamento e operação.
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Visualizações totais", value: insights.totalViews, hint: "perfis publicados" },
          { label: "Views — 7 dias", value: insights.viewsLast7Days, hint: "acessos recentes" },
          { label: "Views — 30 dias", value: insights.viewsLast30Days, hint: "último mês" },
          { label: "Cliques WhatsApp", value: insights.totalWhatsAppClicks, hint: "contatos gerados" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-border-subtle bg-bg-secondary p-4"
          >
            <p className="text-xs uppercase tracking-wider text-text-muted">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">
              {item.value.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-text-muted">{item.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Perfis publicados", value: stats.approvedProfiles, hint: "aprovados e visíveis" },
          { label: "Novos — 7 dias", value: insights.newProfilesLast7Days, hint: "cadastros recentes" },
          { label: "Premium ativos", value: insights.premiumActive, hint: "perfis com badge" },
          { label: "Verificados", value: insights.verifiedActive, hint: "selo ativo" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-border-subtle bg-bg-secondary p-4"
          >
            <p className="text-xs uppercase tracking-wider text-text-muted">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{item.value}</p>
            <p className="text-xs text-text-muted">{item.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Pendentes moderação", value: stats.pendingProfiles },
          { label: "Fila total", value: stats.moderationQueue },
          { label: "Rejeitados", value: stats.rejectedProfiles },
          { label: "Total cadastrados", value: stats.totalProfiles },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-border-subtle bg-bg-secondary p-4"
          >
            <p className="text-xs uppercase tracking-wider text-text-muted">{item.label}</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{item.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-8 rounded-2xl border border-border-subtle bg-bg-secondary p-5">
        <h2 className="font-semibold text-text-primary">Visualizações — últimos 7 dias</h2>
        <div className="mt-6 flex items-end justify-between gap-2">
          {insights.viewsTrend.map((day) => (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-[10px] font-medium text-text-secondary">{day.count}</span>
              <div
                className="w-full max-w-10 rounded-t-lg bg-purple-deep/70 transition-all"
                style={{ height: `${Math.max(8, (day.count / maxTrend) * 96)}px` }}
              />
              <span className="text-[10px] text-text-muted">{formatDayLabel(day.date)}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <ProfileRankList title="Mais visualizados" profiles={insights.topByViews} metric="views" />
        <ProfileRankList
          title="Maior popularidade"
          profiles={insights.topByHotScore}
          metric="hotScore"
        />
        <ProfileRankList
          title="Mais contatados (WhatsApp)"
          profiles={insights.topByWhatsAppClicks}
          metric="whatsapp"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border-subtle bg-bg-secondary p-5">
          <h2 className="font-semibold text-text-primary">Cidades com mais perfis</h2>
          {insights.topCities.length === 0 ? (
            <p className="mt-4 text-sm text-text-muted">Sem dados de localização.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {insights.topCities.map((c, index) => {
                const maxCity = insights.topCities[0]?.count ?? 1;
                return (
                  <li key={`${c.city}-${c.state}`}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-primary">
                        {index + 1}. {c.city}, {c.state}
                      </span>
                      <span className="font-medium text-text-secondary">{c.count}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg-tertiary">
                      <div
                        className="h-full rounded-full bg-purple-light"
                        style={{ width: `${(c.count / maxCity) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border-subtle bg-bg-secondary p-5">
          <h2 className="font-semibold text-text-primary">Cadastros recentes</h2>
          {insights.recentProfiles.length === 0 ? (
            <p className="mt-4 text-sm text-text-muted">Nenhum cadastro ainda.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {insights.recentProfiles.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/admin/perfis/${p.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl p-2 transition-colors hover:bg-bg-tertiary"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-text-primary">{p.displayName}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadge(p.status)}`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted">
                        {p.city}, {p.state} ·{" "}
                        {new Date(p.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <span className="text-sm text-purple-light">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-text-primary">Ações rápidas</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              href: "/admin/perfis",
              title: "Gerenciar perfis",
              desc: "Buscar, editar e ajudar acompanhantes",
            },
            {
              href: "/admin/moderacao",
              title: "Fila de moderação",
              desc: `${stats.moderationQueue} item(ns) pendente(s)`,
            },
            {
              href: "/admin/perfis?status=pending",
              title: "Perfis pendentes",
              desc: `${stats.pendingProfiles} aguardando análise`,
            },
            {
              href: "/admin/perfis?premium=true",
              title: "Premium & Destaque",
              desc: `${insights.premiumActive} premium ativo(s)`,
            },
            {
              href: "/admin/mensagens",
              title: "Mensagens",
              desc: "Falar com acompanhantes",
            },
            {
              href: "/admin/auditoria",
              title: "Auditoria",
              desc: "Histórico de ações admin",
            },
          ].map((action) => (
            <Link
              key={action.href + action.title}
              href={action.href}
              className="rounded-2xl border border-border-subtle bg-bg-secondary p-5 transition-all hover:border-purple-deep/40 hover:bg-bg-tertiary"
            >
              <h3 className="font-medium text-text-primary">{action.title}</h3>
              <p className="mt-1 text-sm text-text-muted">{action.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
