import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanionCard } from "@/components/companion-card";
import { PublicPageLayout } from "@/components/public-header";
import { fetchCategory, fetchSeoMeta } from "@/lib/api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = await fetchCategory(slug);
  const meta = await fetchSeoMeta("category", {
    slug,
    name: cat?.tag.name,
  });
  return {
    title: meta?.title ?? `${cat?.tag.name ?? slug} — Acompanhantes`,
    description: meta?.description,
    alternates: meta?.canonical ? { canonical: meta.canonical } : undefined,
  };
}

export default async function CategoriaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await fetchCategory(slug);

  if (!data) {
    notFound();
  }

  return (
    <PublicPageLayout mainClassName="mx-auto flex-1 max-w-7xl px-4 py-10 sm:px-6">
        <Link href="/busca" className="text-sm text-text-muted hover:text-text-primary">
          ← Busca
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-text-primary">{data.tag.name}</h1>
        <p className="mt-2 text-text-secondary">
          {data.total} perfil{data.total !== 1 ? "s" : ""} com esta categoria
        </p>

        {data.profiles.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-border-subtle bg-bg-secondary p-8 text-center">
            <p className="text-text-secondary">Nenhum perfil nesta categoria ainda.</p>
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
