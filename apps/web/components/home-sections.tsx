import Link from "next/link";
import { CompanionCard } from "@/components/companion-card";
import { MomentsFeed } from "@/components/moments-stories";
import type { CompanionCardData } from "@/lib/mock-data";
import { fetchMomentsFeed, fetchRankings, fetchSearch, fetchTags } from "@/lib/api";

const QUICK_FILTERS = [
  { label: "Premium", href: "/busca?premium=true" },
  { label: "Em destaque", href: "/busca?featured=true" },
  { label: "Verificadas", href: "/busca?verified=true" },
  { label: "São Paulo", href: "/busca?city=São Paulo" },
  { label: "Rio de Janeiro", href: "/busca?city=Rio de Janeiro" },
];

function ProfileGrid({ profiles }: { profiles: CompanionCardData[] }) {
  if (profiles.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {profiles.map((profile) => (
        <CompanionCard key={profile.slug} profile={profile} />
      ))}
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  href,
  linkLabel = "Ver todos",
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>}
      </div>
      {href && (
        <Link
          href={href}
          className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-text-secondary transition hover:border-purple-deep/40 hover:text-text-primary"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

export async function HomeSections({ premiumLimit = 8 }: { premiumLimit?: number }) {
  const [featured, premium, trending, topWeek, moments, tagsResult] = await Promise.all([
    fetchSearch({ featured: true, limit: 8 }).catch(() => ({ profiles: [], total: 0, source: "api" as const })),
    fetchSearch({ premium: true, limit: premiumLimit }).catch(() => ({ profiles: [], total: 0, source: "api" as const })),
    fetchRankings("hotscore", 8).catch(() => ({ entries: [], total: 0, type: "hotscore", source: "api" as const, positions: [] })),
    fetchRankings("hotscore", 5).catch(() => ({ entries: [], total: 0, type: "hotscore", source: "api" as const, positions: [] })),
    fetchMomentsFeed(24).catch(() => ({ moments: [], total: 0, source: "api" as const })),
    fetchTags().catch(() => ({ tags: [], source: "api" as const })),
  ]);

  const tagChips = tagsResult.tags.slice(0, 8);

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <SectionHeader title="Explorar rápido" subtitle="Filtros populares para começar" />
        <div className="flex flex-wrap gap-2">
          {QUICK_FILTERS.map((chip) => (
            <Link
              key={chip.href}
              href={chip.href}
              className="rounded-full border border-border-subtle bg-bg-secondary px-4 py-2 text-sm text-text-secondary transition hover:border-purple-deep/40 hover:text-text-primary"
            >
              {chip.label}
            </Link>
          ))}
          {tagChips.map((tag) => (
            <Link
              key={tag.slug}
              href={`/categoria/${tag.slug}`}
              className="rounded-full border border-purple-deep/20 bg-purple-deep/10 px-4 py-2 text-sm text-purple-light transition hover:border-purple-deep/40"
            >
              {tag.name}
            </Link>
          ))}
        </div>
      </section>

      {featured.profiles.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <SectionHeader
            title="Acompanhantes em destaque"
            subtitle="Perfis selecionados pela plataforma"
            href="/busca?featured=true"
          />
          <ProfileGrid profiles={featured.profiles} />
        </section>
      )}

      {premium.profiles.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <SectionHeader
            title="Perfis Premium"
            subtitle="Experiência exclusiva e prioridade nas buscas"
            href="/busca?premium=true"
          />
          <ProfileGrid profiles={premium.profiles} />
        </section>
      )}

      {trending.entries.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <SectionHeader
            title="Perfis em alta"
            subtitle="Maior engajamento nos últimos dias"
            href="/rankings?type=hotscore"
          />
          <ProfileGrid profiles={trending.entries} />
        </section>
      )}

      {topWeek.entries.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <SectionHeader
            title="Top da semana"
            subtitle="Ranking por hot score"
            href="/rankings"
            linkLabel="Ver ranking completo"
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {topWeek.entries.map((profile, index) => (
              <div key={profile.slug} className="relative">
                <span className="absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-bg-primary/90 text-sm font-bold text-gold shadow-lg">
                  {index + 1}
                </span>
                <CompanionCard profile={profile} />
              </div>
            ))}
          </div>
        </section>
      )}

      {moments.moments.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <SectionHeader
            title="Momentos"
            subtitle="Foto e vídeo — deslize para passar"
            href="/momentos"
          />
          <MomentsFeed moments={moments.moments} />
        </section>
      )}
    </>
  );
}
