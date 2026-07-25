import type { Metadata } from "next";
import Link from "next/link";
import { CompanionCard } from "@/components/companion-card";
import { PublicPageLayout } from "@/components/public-header";
import { SearchAdvancedPanel, SearchResultsSummary } from "@/components/search-advanced-panel";
import { fetchSearch, fetchSeoMeta, fetchTags } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await fetchSeoMeta("search");
  return {
    title: meta?.title ?? "Buscar acompanhantes",
    description: meta?.description,
    robots: meta?.robots,
  };
}

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    city?: string;
    bairro?: string;
    posicao?: string;
    premium?: string;
    featured?: string;
    verificado?: string;
    preferencia?: string;
    tag?: string;
    tags?: string;
    ordenar?: string;
  }>;
}) {
  const params = await searchParams;
  const tag = params.tag ?? params.tags;
  const sort = params.ordenar ?? "relevancia";

  const hasSearch = Boolean(
    params.q?.trim() ||
      params.city?.trim() ||
      params.bairro?.trim() ||
      params.posicao ||
      params.preferencia ||
      params.premium === "true" ||
      params.featured === "true" ||
      params.verificado === "true" ||
      tag,
  );

  const [searchResult, tagsResult] = await Promise.all([
    hasSearch
      ? fetchSearch({
          q: params.q,
          city: params.city,
          neighborhood: params.bairro,
          position: params.posicao,
          premium: params.premium === "true",
          featured: params.featured === "true",
          verified: params.verificado === "true",
          preference: params.preferencia,
          tag,
          sort,
          limit: 48,
        })
      : Promise.resolve({ profiles: [], total: 0, source: "api" as const }),
    fetchTags().catch(() => ({ tags: [], source: "api" as const })),
  ]);

  const { profiles, total, source } = searchResult;

  return (
    <PublicPageLayout mainClassName="mx-auto flex-1 max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">Encontre o perfil ideal</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Filtre por local, posição, preferências e destaques para achar quem combina com você.
        </p>

        <SearchAdvancedPanel params={{ ...params, tag, ordenar: sort }} tags={tagsResult.tags} />

        {!hasSearch ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border-subtle bg-bg-secondary/50 px-6 py-12 text-center">
            <p className="text-text-secondary">Configure os filtros e clique em &quot;Buscar perfis&quot;.</p>
            <p className="mt-2 text-sm text-text-muted">
              Os resultados aparecem aqui depois da busca.
            </p>
          </div>
        ) : (
          <>
            <SearchResultsSummary total={total} source={source} profiles={profiles} />

            {profiles.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-border-subtle bg-bg-secondary p-8 text-center">
                <p className="text-text-secondary">Nenhum perfil com esses critérios.</p>
                <p className="mt-2 text-sm text-text-muted">Tente ampliar a cidade ou remover algum filtro.</p>
                <Link href="/busca" className="mt-4 inline-block text-sm text-purple-light hover:text-gold">
                  Limpar filtros
                </Link>
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {profiles.map((profile) => (
                  <CompanionCard key={profile.slug} profile={profile} />
                ))}
              </div>
            )}
          </>
        )}
    </PublicPageLayout>
  );
}
