import { fetchPublicProfiles, fetchSeoSchema } from "@/lib/api";
import { HomeNearbyFeed } from "@/components/home-nearby-feed";
import { JsonLd } from "@/components/json-ld";
import { PublicFooter, PublicHeader } from "@/components/public-header";

export default async function HomePage() {
  const [schema, { profiles: initialProfiles }] = await Promise.all([
    fetchSeoSchema("home"),
    fetchPublicProfiles(),
  ]);

  return (
    <div className="min-h-screen bg-bg-primary">
      <JsonLd data={schema} />
      <PublicHeader />

      <main>
        <HomeNearbyFeed initialProfiles={initialProfiles} />
      </main>

      <PublicFooter />
    </div>
  );
}
