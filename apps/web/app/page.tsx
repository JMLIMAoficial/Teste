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
      <HomeNearbyFeed initialProfiles={initialProfiles} />
    </PublicPageLayout>
  );
}
