import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanionCard } from "@/components/companion-card";
import { JsonLd } from "@/components/json-ld";
import { PublicPageLayout } from "@/components/public-header";
import { fetchCity, fetchSeoMeta, fetchSeoSchema } from "@/lib/api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cityData = await fetchCity(slug);
  const meta = await fetchSeoMeta("city", {
    slug,
    name: cityData?.city,
  });
  return {
    title: meta?.title ?? `Garotos de programa em ${cityData?.city ?? slug}`,
    description:
      meta?.description ??
      `Encontre garoto de programa em ${cityData?.city ?? slug} no Clube dos Garotos.`,
    alternates: meta?.canonical ? { canonical: meta.canonical } : undefined,
  };
}

export default async function CidadePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await fetchCity(slug);

  if (!data) {
    notFound();
  }

  const schema = await fetchSeoSchema("city", {
    slug,
    name: data.city,
    city: data.city,
  });

  return (
    <PublicPageLayout mainClassName="mx-auto flex-1 max-w-7xl px-4 py-10 sm:px-6">
        <JsonLd data={schema} />
        <Link href="/" className="text-sm text-text-muted hover:text-text-primary">
          ← Voltar
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-text-primary">
          Garotos de programa em {data.city}
        </h1>
        <p className="mt-2 text-text-secondary">
          Anúncios de garoto de programa em {data.city}. {data.total} perfil
          {data.total !== 1 ? "s" : ""} disponível{data.total !== 1 ? "is" : ""}.
        </p>

        {data.profiles.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-border-subtle bg-bg-secondary p-8 text-center">
            <p className="text-text-secondary">Nenhum perfil nesta cidade ainda.</p>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {data.profiles.map((profile) => (
              <CompanionCard key={profile.slug} profile={profile} />
            ))}
          </div>
        )}
    </PublicPageLayout>
  );
}