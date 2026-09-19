import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfilePageView } from "@/components/profile-page-view";
import { JsonLd } from "@/components/json-ld";
import { PublicPageLayout } from "@/components/public-header";
import {
  fetchComments,
  fetchProfileBySlug,
  fetchProfileVideos,
  fetchReviews,
  fetchSeoMeta,
  fetchSeoSchema,
  fetchSimilarProfiles,
} from "@/lib/api";
import { featuredProfiles } from "@/lib/mock-data";
import { profilePositionLabel } from "@/lib/profile-position";

const USE_MOCK_FALLBACK = process.env.NODE_ENV !== "production";

type ApiProfileDetail = {
  id: string;
  name: string;
  age: number | null;
  city: string;
  neighborhood?: string | null;
  locationLabel?: string | null;
  mapUrl?: string | null;
  memberSince?: string | null;
  bio?: string | null;
  preference?: string | null;
  position?: string | null;
  penisSizeCm?: number | null;
  tags?: string[];
  photos?: Array<{
    id: string;
    url: string;
    thumbUrl?: string;
    isCover: boolean;
    isProfile?: boolean;
  }>;
  coverPhotoUrl?: string | null;
  hotScore?: number;
  hotScoreLabel?: string;
  isPremium?: boolean;
  isFeatured?: boolean;
  isVerified?: boolean;
  hasWhatsApp?: boolean;
  whatsappUrl?: string;
  socialLinks?: Partial<Record<"privacy" | "onlyfans" | "x" | "instagram", string>>;
  pricing?: {
    mode: "show" | "consult";
    thirtyMin?: number | null;
    oneHour?: number | null;
    twoHours?: number | null;
    overnight?: number | null;
    customItems?: Array<{ label: string; price: number }>;
  } | null;
  availability?: Array<{
    dayOfWeek: number;
    label: string;
    startTime: string;
    endTime: string;
  }>;
};

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const apiProfile = (await fetchProfileBySlug(slug)) as ApiProfileDetail | null;
  const meta = await fetchSeoMeta("profile", {
    slug,
    name: apiProfile?.name,
    city: apiProfile?.city,
  });

  const title =
    meta?.title ??
    (apiProfile
      ? `${apiProfile.name} — garoto de programa em ${apiProfile.city}`
      : undefined);
  const description =
    meta?.description ??
    (apiProfile
      ? `${apiProfile.name} é garoto de programa em ${apiProfile.city}. ${
          apiProfile.bio?.slice(0, 100) ?? "Veja fotos e entre em contato no Clube dos Garotos."
        }`
      : undefined);
  const image = apiProfile?.coverPhotoUrl ?? apiProfile?.photos?.[0]?.url;

  return {
    title: title ?? "Perfil",
    description,
    robots: meta?.robots,
    alternates: meta?.canonical ? { canonical: meta.canonical } : undefined,
    openGraph: {
      title: title ?? "Perfil",
      description: description ?? undefined,
      url: meta?.canonical,
      images: image ? [{ url: image }] : undefined,
      type: "profile",
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: title ?? "Perfil",
      description: description ?? undefined,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const apiProfile = (await fetchProfileBySlug(slug)) as ApiProfileDetail | null;
  const mockProfile = USE_MOCK_FALLBACK
    ? featuredProfiles.find((p) => p.slug === slug)
    : undefined;

  if (!apiProfile && !mockProfile) {
    notFound();
  }

  const profileId = apiProfile?.id;
  const [reviewsData, comments, videosData, similarData, schema] = profileId
    ? await Promise.all([
        fetchReviews(slug),
        fetchComments("profile", profileId),
        fetchProfileVideos(slug),
        fetchSimilarProfiles(slug, 4),
        fetchSeoSchema("profile", {
          slug,
          name: apiProfile!.name,
          city: apiProfile!.city,
          description: apiProfile!.bio ?? undefined,
          imageUrl: apiProfile!.coverPhotoUrl ?? apiProfile!.photos?.[0]?.url,
        }),
      ])
    : [{ data: [], summary: null }, [], { videos: [] }, { profiles: [], total: 0 }, null];

  const profileData = apiProfile
    ? {
        slug,
        profileId: apiProfile.id,
        name: apiProfile.name,
        age: apiProfile.age,
        city: apiProfile.city,
        neighborhood: apiProfile.neighborhood,
        locationLabel: apiProfile.locationLabel,
        mapUrl: apiProfile.mapUrl,
        memberSince: apiProfile.memberSince,
        bio: apiProfile.bio,
        preference: apiProfile.preference,
        position: profilePositionLabel(apiProfile.position),
        penisSizeCm: apiProfile.penisSizeCm,
        tags: apiProfile.tags ?? [],
        photos: apiProfile.photos ?? [],
        coverPhotoUrl: apiProfile.coverPhotoUrl,
        hotScore: apiProfile.hotScore,
        hotScoreLabel: apiProfile.hotScoreLabel,
        isPremium: apiProfile.isPremium,
        isFeatured: apiProfile.isFeatured,
        isVerified: apiProfile.isVerified,
        hasWhatsApp: apiProfile.hasWhatsApp,
        whatsappUrl: apiProfile.whatsappUrl,
        socialLinks: apiProfile.socialLinks,
        pricing: apiProfile.pricing ?? null,
        availability: apiProfile.availability ?? [],
        isMock: false,
      }
    : {
        slug,
        name: mockProfile!.name,
        age: mockProfile!.age,
        city: mockProfile!.city,
        bio: undefined,
        preference: mockProfile!.preference,
        position: null as string | null,
        penisSizeCm: mockProfile!.penisSizeCm,
        tags: mockProfile!.tags,
        photos: [] as Array<{
          id: string;
          url: string;
          thumbUrl?: string;
          isCover: boolean;
          isProfile?: boolean;
        }>,
        photoGradient: mockProfile!.photoGradient,
        hotScore: mockProfile!.hotScore,
        hotScoreLabel: mockProfile!.hotScoreLabel,
        isPremium: mockProfile!.isPremium,
        isFeatured: mockProfile!.isFeatured,
        isVerified: mockProfile!.isVerified,
        isMock: true,
      };

  return (
    <PublicPageLayout mainClassName="flex-1">
      <JsonLd data={schema} />
      <ProfilePageView
        profile={profileData}
        videos={videosData.videos}
        reviews={reviewsData.data}
        reviewSummary={reviewsData.summary}
        comments={comments}
        similarProfiles={similarData.profiles}
      />
    </PublicPageLayout>
  );
}
