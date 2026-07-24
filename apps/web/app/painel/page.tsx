"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PainelShell } from "@/components/painel-shell";
import type { MomentStats } from "@/lib/moment-upload";
import { apiFetch, clearAccessToken, fetchMe, getAccessToken, logout } from "@/lib/auth";
import {
  getProfileCompletion,
  type ProfileCompletion,
} from "@/lib/profile-completion";

type DashboardProfile = {
  id: string;
  slug: string;
  displayName: string;
  age: number | null;
  status: string;
  isPublic: boolean;
  isPremium?: boolean;
  isFeatured?: boolean;
  isVerified?: boolean;
  viewCount?: number;
  city?: string;
  state?: string;
  photos: Array<{ id: string; url: string; thumbUrl?: string; isCover: boolean }>;
  tags?: Array<{ id: string; name: string }>;
  completion?: ProfileCompletion;
};

const SECTION_BY_KEY: Record<string, string> = {
  birthDate: "dados",
  bio: "dados",
  preference: "completar",
  position: "completar",
  penisSizeCm: "completar",
  tags: "completar",
  location: "localizacao",
  cep: "localizacao",
  photo: "fotos",
  whatsapp: "whatsapp",
};

function publicationInsight(profile: DashboardProfile, completion: ReturnType<typeof getProfileCompletion>) {
  if (profile.status === "approved" && profile.isPublic) {
    return {
      title: "Perfil publicado",
      body: "Seu perfil está visível na plataforma e aparece nas buscas.",
      tone: "success" as const,
    };
  }
  if (profile.status === "approved") {
    return {
      title: "Aprovado, mas não público",
      body: "O perfil foi aprovado pela moderação, mas ainda não está visível publicamente.",
      tone: "gold" as const,
    };
  }
  if (profile.status === "pending") {
    if (completion.readyForReview) {
      return {
        title: "Perfil completo — aguardando moderação",
        body: "Você preencheu todos os campos obrigatórios. Nossa equipe analisará seu perfil em breve para publicação.",
        tone: "purple" as const,
      };
    }
    return {
      title: "Aguardando moderação",
      body: "Complete todos os campos e aguarde a análise da equipe para publicação.",
      tone: "purple" as const,
    };
  }
  if (profile.status === "rejected") {
    return {
      title: "Perfil rejeitado",
      body: "Entre em contato com a administração para entender o que precisa ser ajustado.",
      tone: "danger" as const,
    };
  }
  return {
    title: `Status: ${profile.status}`,
    body: "Acompanhe aqui o andamento do seu perfil na plataforma.",
    tone: "muted" as const,
  };
}

function toneClasses(tone: "success" | "gold" | "purple" | "danger" | "muted") {
  if (tone === "success") return "border-success/30 bg-success/10";
  if (tone === "gold") return "border-gold/30 bg-gold/10";
  if (tone === "purple") return "border-purple-deep/30 bg-purple-deep/10";
  if (tone === "danger") return "border-red-500/30 bg-red-500/10";
  return "border-border-subtle bg-bg-secondary";
}

type DashboardInsights = {
  period: string;
  views: { total: number; inPeriod: number };
  whatsapp: { total: number; inPeriod: number };
  hotScore: { score: number; level: string } | null;
  reviews: { averageRating: number | null; count: number };
};

export default function PainelDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [insights, setInsights] = useState<DashboardInsights | null>(null);
  const [momentStats, setMomentStats] = useState<MomentStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    loadProfile();
  }, [router]);

  async function loadProfile() {
    try {
      const me = await fetchMe();
      if (me.roles.includes("admin")) {
        router.replace("/admin");
        return;
      }
      const [data, stats, dashboard] = await Promise.all([
        apiFetch<DashboardProfile>("/v1/companion/profile"),
        apiFetch<MomentStats>("/v1/companion/moments/stats").catch(() => null),
        apiFetch<DashboardInsights>("/v1/companion/dashboard").catch(() => null),
      ]);
      setProfile(data);
      setMomentStats(stats);
      setInsights(dashboard);
    } catch {
      clearAccessToken();
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary text-text-secondary">
        Carregando...
      </div>
    );
  }

  if (!profile) return null;

  const completion = getProfileCompletion(profile);
  const insight = publicationInsight(profile, completion);
  const coverPhoto =
    profile.photos.find((p) => p.isCover)?.thumbUrl ??
    profile.photos.find((p) => p.isCover)?.url ??
    profile.photos[0]?.thumbUrl ??
    profile.photos[0]?.url;
  const locationLabel = [profile.city, profile.state].filter(Boolean).join(", ");
  const pendingChecks = completion.checks.filter((c) => !c.done).slice(0, 4);

  return (
    <PainelShell onLogout={handleLogout}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Olá, {profile.displayName}</h1>
        <p className="mt-1 text-sm text-text-muted">
          Acompanhe seu perfil, complete o cadastro e acesse as ferramentas do painel.
        </p>
      </div>

      <section className="rounded-2xl border border-border-subtle bg-bg-secondary p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="mx-auto aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-xl border border-border-subtle sm:mx-0 sm:w-32">
            {coverPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverPhoto} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-bg-tertiary text-3xl text-text-muted">
                ?
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="rounded-full bg-bg-tertiary px-3 py-1 text-xs text-text-secondary">
                Status: <strong className="text-text-primary">{profile.status}</strong>
              </span>
              {profile.isPremium && (
                <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-medium text-gold">
                  Premium
                </span>
              )}
              {profile.isFeatured && (
                <span className="rounded-full bg-purple-deep/20 px-3 py-1 text-xs font-medium text-purple-light">
                  Destaque
                </span>
              )}
              {profile.isVerified && (
                <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">
                  Verificado
                </span>
              )}
            </div>
            <h2 className="mt-3 text-xl font-semibold text-text-primary">{profile.displayName}</h2>
            <p className="mt-1 text-sm text-text-secondary">
              {[profile.age ? `${profile.age} anos` : null, locationLabel || null]
                .filter(Boolean)
                .join(" · ") || "Localização não informada"}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              {profile.status === "approved" && profile.isPublic && (
                <Link
                  href={`/perfil/${profile.slug}`}
                  className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:border-purple-deep/40 hover:text-text-primary"
                >
                  Ver perfil público
                </Link>
              )}
              <Link
                href="/painel/preview"
                className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:border-purple-deep/40 hover:text-text-primary"
              >
                Pré-visualizar
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Completude", value: `${completion.percent}%`, hint: "do perfil" },
          {
            label: "Views do perfil",
            value: String(insights?.views.total ?? profile.viewCount ?? 0),
            hint: insights ? `${insights.views.inPeriod} nos últimos 30 dias` : "página pública",
          },
          {
            label: "Cliques WhatsApp",
            value: String(insights?.whatsapp.total ?? 0),
            hint: insights ? `${insights.whatsapp.inPeriod} nos últimos 30 dias` : "contato",
          },
          {
            label: "Hot Score",
            value: insights?.hotScore ? String(Math.round(insights.hotScore.score)) : "—",
            hint: insights?.hotScore?.level ?? "popularidade",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border-subtle bg-bg-secondary p-4"
          >
            <p className="text-xs uppercase tracking-wider text-text-muted">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{stat.value}</p>
            <p className="text-xs text-text-muted">{stat.hint}</p>
          </div>
        ))}
      </div>

      {(momentStats?.totalMoments === 0 || profile.photos.length < 2) && (
        <section className="mt-6 rounded-2xl border border-gold/30 bg-gold/10 p-5">
          <h2 className="font-semibold text-text-primary">Publique fotos nos momentos</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Quem posta momentos com fotos aparece mais no feed da plataforma e recebe mais visitas.
            Toque no botão <strong className="text-gold">+</strong> no canto da tela para publicar agora.
          </p>
          <Link
            href="/painel/momentos"
            className="mt-4 inline-flex rounded-xl bg-purple-deep px-4 py-2 text-sm font-medium text-white hover:bg-purple-light"
          >
            Ver meus momentos →
          </Link>
        </section>
      )}

      <section className={`mt-6 rounded-2xl border p-5 ${toneClasses(insight.tone)}`}>
        <h2 className="font-semibold text-text-primary">{insight.title}</h2>
        <p className="mt-2 text-sm text-text-secondary">{insight.body}</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-bg-tertiary">
          <div
            className="h-full rounded-full bg-gradient-to-r from-purple-deep to-gold transition-all"
            style={{ width: `${completion.percent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-text-muted">{completion.percent}% completo</p>
        {profile.status === "pending" && completion.readyForReview && (
          <p className="mt-3 text-sm font-medium text-purple-light">
            Perfil pronto para análise — nenhuma ação extra necessária no momento.
          </p>
        )}
        {(profile.status === "rejected" || (!profile.isPremium && profile.status === "approved")) && (
          <Link
            href="/painel/mensagens"
            className="mt-4 inline-flex rounded-xl border border-border-subtle px-4 py-2 text-sm text-purple-light hover:border-purple-deep/40"
          >
            Falar com a administração →
          </Link>
        )}
      </section>

      {pendingChecks.length > 0 && (
        <section className="mt-6 rounded-2xl border border-border-subtle bg-bg-secondary p-5">
          <h2 className="font-semibold text-text-primary">Próximos passos</h2>
          <p className="mt-1 text-sm text-text-muted">
            Complete estes itens para melhorar seu perfil nos cards e na página pública.
          </p>
          <ul className="mt-4 space-y-2">
            {pendingChecks.map((check) => {
              const section = SECTION_BY_KEY[check.key] ?? "dados";
              return (
                <li key={check.key}>
                  <Link
                    href={`/painel/perfil#${section}`}
                    className="flex items-center justify-between rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-sm transition-colors hover:border-purple-deep/40"
                  >
                    <span className="text-text-secondary">{check.label}</span>
                    <span className="text-purple-light">Completar →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-text-primary">Ações rápidas</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            {
              href: "/painel/perfil",
              title: "Editar perfil",
              desc: "Nome, bio, preferências, tags e contato",
            },
            {
              href: "/painel/valores",
              title: "Valores e horários",
              desc: "Preços e disponibilidade no perfil",
            },
            {
              href: "/painel/verificacao",
              title: "Verificação",
              desc: profile.isVerified ? "Perfil verificado ✓" : "Solicitar selo verificado",
            },
            {
              href: "/painel/momentos",
              title: "Meus momentos",
              desc: `${momentStats?.totalViews ?? 0} views · ${momentStats?.totalLikes ?? 0} curtidas`,
            },
            {
              href: "/painel/perfil#fotos",
              title: "Fotos do perfil",
              desc: `${profile.photos.length} foto(s) enviadas`,
            },
            {
              href: "/painel/mensagens",
              title: "Mensagens",
              desc: "Converse com a administração",
            },
            {
              href: "/painel/status",
              title: "Premium & Destaque",
              desc: "Veja planos, termômetro e visibilidade",
            },
            {
              href: "/painel/preview",
              title: "Pré-visualizar",
              desc: "Veja como seu perfil ficará público",
            },
            {
              href: completion.percent < 100 ? "/painel/perfil#completar" : "/painel/perfil",
              title: completion.percent < 100 ? "Completar perfil" : "Revisar cadastro",
              desc:
                completion.percent < 100
                  ? `${completion.missing.length} item(ns) pendente(s)`
                  : "Confira se está tudo certo",
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
    </PainelShell>
  );
}
