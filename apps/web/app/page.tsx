import { fetchPublicProfiles, fetchSeoSchema } from "@/lib/api";
import { HomeNearbyFeed } from "@/components/home-nearby-feed";
import { JsonLd } from "@/components/json-ld";
import { PublicPageLayout } from "@/components/public-header";

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
