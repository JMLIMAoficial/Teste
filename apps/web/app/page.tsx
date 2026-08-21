import type { Metadata } from "next";
import { fetchPublicProfiles, fetchSeoMeta, fetchSeoSchema } from "@/lib/api";
import { HomeNearbyFeed } from "@/components/home-nearby-feed";
import { JsonLd } from "@/components/json-ld";
import { PublicPageLayout } from "@/components/public-header";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await fetchSeoMeta("home");
  return {
    title: meta?.title
      ? { absolute: meta.title }
      : { absolute: "Garotos de programa — Clube dos Garotos" },
    description:
      meta?.description ??
      "Garotos de programa no Clube dos Garotos: perfis com fotos, momentos e contato perto de você.",
    alternates: {
      canonical: meta?.canonical ?? "/",
    },
    robots: meta?.robots,
    openGraph: {
      title: meta?.title ?? "Garotos de programa — Clube dos Garotos",
      description: meta?.description,
      url: meta?.canonical,
      type: "website",
    },
  };
}

export default async function HomePage() {
  const [schema, { profiles: initialProfiles }] = await Promise.all([
    fetchSeoSchema("home"),
    fetchPublicProfiles(),
  ]);

  return (
    <PublicPageLayout>
      <JsonLd data={schema} />
      <section className="border-b border-border-subtle bg-bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Garotos de programa no Clube dos Garotos
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg">
            Encontre garoto de programa com perfil completo: fotos, momentos, valores e contato.
            Navegue por quem está perto de você ou explore anúncios em todo o Brasil.
          </p>
        </div>
      </section>
      <HomeNearbyFeed initialProfiles={initialProfiles} />
    </PublicPageLayout>
  );
}
