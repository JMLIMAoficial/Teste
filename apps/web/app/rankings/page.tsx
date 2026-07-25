import type { Metadata } from "next";
import Link from "next/link";
import { CompanionCard } from "@/components/companion-card";
import { PublicPageLayout } from "@/components/public-header";
import { fetchRankings, fetchSeoMeta } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await fetchSeoMeta("rankings");
  return {
    title: meta?.title ?? "Rankings",
    description: meta?.description,
  };
}

const tabs = [
  { type: "hotscore", label: "Em alta" },
  { type: "views", label: "Mais vistos" },
  { type: "premium", label: "Premium" },
];

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: typeParam } = await searchParams;
  const type = typeParam ?? "hotscore";
  const { entries, total, source } = await fetchRankings(type, 24);

  return (
    <PublicPageLayout mainClassName="mx-auto flex-1 max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-text-primary">Rankings</h1>
        <p className="mt-2 text-text-secondary">
          Perfis mais populares e em alta na plataforma.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Link
              key={tab.type}
              href={`/rankings?type=${tab.type}`}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                type === tab.type
                  ? "border-purple-deep bg-purple-deep/20 text-purple-light"
                  : "border-border-subtle text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <p className="mt-4 text-sm text-text-muted">
          {total} perfis · {source === "api" ? "Dados da API" : "Dados mock"}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {entries.map((profile, index) => (
            <div key={profile.slug} className="relative">
              <span className="absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-bg-primary/90 text-sm font-bold text-gold shadow-lg">
                {index + 1}
              </span>
              <CompanionCard profile={profile} />
            </div>
          ))}
        </div>
    </PublicPageLayout>
  );
}
