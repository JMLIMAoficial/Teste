import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanionCard } from "@/components/companion-card";
import { PublicFooter, PublicHeader } from "@/components/public-header";
import { fetchCity, fetchSeoMeta } from "@/lib/api";

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
    title: meta?.title ?? `Acompanhantes em ${cityData?.city ?? slug}`,
    description: meta?.description,
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

  return (
    <div className="min-h-screen bg-bg-primary">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Link href="/" className="text-sm text-text-muted hover:text-text-primary">
          ← Voltar
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-text-primary">
          Acompanhantes em {data.city}
        </h1>
        <p className="mt-2 text-text-secondary">
          {data.total} perfil{data.total !== 1 ? "s" : ""} encontrado
          {data.total !== 1 ? "s" : ""}
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
      </main>
      <PublicFooter />
    </div>
  );
}
