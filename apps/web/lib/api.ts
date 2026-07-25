import type { CompanionCardData } from './mock-data';
import { featuredProfiles, profileCoordinates } from './mock-data';
import { haversineKm } from './geo';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const USE_MOCK_FALLBACK = process.env.NODE_ENV !== 'production';

type ApiProfileCard = {
  slug: string;
  name: string;
  age: number | null;
  city: string;
  preference: string;
  tags: string[];
  hotScore: number;
  hotScoreLabel?: string;
  isPremium: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  photoGradient?: string;
  coverPhotoUrl?: string | null;
  coverPhotoThumbUrl?: string | null;
  distanceKm?: number;
  penisSizeCm?: number | null;
  position?: string | null;
  neighborhood?: string | null;
};

const gradients = [
  'from-purple-900/80 to-orange-900/60',
  'from-indigo-900/80 to-purple-900/60',
  'from-rose-900/80 to-orange-900/60',
  'from-violet-900/80 to-fuchsia-900/60',
];

function toCardData(profile: ApiProfileCard, index: number): CompanionCardData {
  return {
    slug: profile.slug,
    name: profile.name,
    age: profile.age ?? 0,
    city: profile.city,
    preference: profile.preference,
    tags: profile.tags.length > 0 ? profile.tags : [],
    hotScore: profile.hotScore,
    hotScoreLabel: profile.hotScoreLabel,
    isPremium: profile.isPremium,
    isFeatured: profile.isFeatured,
    isVerified: profile.isVerified,
    photoGradient: profile.photoGradient ?? gradients[index % gradients.length],
    coverPhotoUrl: profile.coverPhotoUrl,
    coverPhotoThumbUrl: profile.coverPhotoThumbUrl,
    distanceKm: profile.distanceKm,
    penisSizeCm: profile.penisSizeCm,
    position: profile.position,
    neighborhood: profile.neighborhood,
  };
}

export async function fetchPublicProfiles(): Promise<{
  profiles: CompanionCardData[];
  source: 'api' | 'mock';
}> {
  try {
    const res = await fetch(`${API_URL}/api/v1/profiles`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const json = (await res.json()) as { data: ApiProfileCard[] };
    if (!json.data?.length) {
      return USE_MOCK_FALLBACK
        ? { profiles: featuredProfiles, source: 'mock' }
        : { profiles: [], source: 'api' };
    }

    return {
      profiles: json.data.map(toCardData),
      source: 'api',
    };
  } catch {
    return USE_MOCK_FALLBACK
      ? { profiles: featuredProfiles, source: 'mock' }
      : { profiles: [], source: 'api' };
  }
}

export async function fetchProfileBySlug(slug: string) {
  try {
    const res = await fetch(`${API_URL}/api/v1/profiles/${slug}`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export type SearchParams = {
  q?: string;
  city?: string;
  state?: string;
  premium?: boolean;
  featured?: boolean;
  verified?: boolean;
  preference?: string;
  position?: string;
  neighborhood?: string;
  tag?: string;
  sort?: string;
  limit?: number;
  offset?: number;
};

export async function fetchSearch(params: SearchParams = {}) {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.city) qs.set('city', params.city);
  if (params.state) qs.set('state', params.state);
  if (params.premium) qs.set('premium', 'true');
  if (params.featured) qs.set('featured', 'true');
  if (params.verified) qs.set('verificado', 'true');
  if (params.preference) qs.set('preferencia', params.preference);
  if (params.position) qs.set('posicao', params.position);
  if (params.neighborhood) qs.set('bairro', params.neighborhood);
  if (params.tag) qs.set('tag', params.tag);
  if (params.sort) qs.set('ordenar', params.sort);
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.offset) qs.set('offset', String(params.offset));

  try {
    const res = await fetch(`${API_URL}/api/v1/search?${qs}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error('search failed');
    const json = await res.json();
    return {
      profiles: (json.data as ApiProfileCard[]).map(toCardData),
      total: json.total as number,
      source: (json.source as string) ?? 'api',
    };
  } catch {
    if (!USE_MOCK_FALLBACK) {
      return { profiles: [], total: 0, source: 'api' };
    }
    const mock = featuredProfiles.filter((p) => {
      if (params.premium && !p.isPremium) return false;
      if (params.featured && !p.isFeatured) return false;
      if (params.verified && !p.isVerified) return false;
      if (params.position && p.position !== params.position) return false;
      if (
        params.neighborhood &&
        !p.neighborhood?.toLowerCase().includes(params.neighborhood.toLowerCase())
      )
        return false;
      if (params.tag && !p.tags.some((t) => t.toLowerCase() === params.tag!.toLowerCase()))
        return false;
      if (params.q) {
        const q = params.q.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
    return { profiles: mock, total: mock.length, source: 'mock' };
  }
}

export async function fetchRankings(type = 'hotscore', limit = 20) {
  try {
    const res = await fetch(
      `${API_URL}/api/v1/rankings?type=${type}&limit=${limit}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) throw new Error('rankings failed');
    const json = await res.json();
    return {
      entries: (json.data as Array<ApiProfileCard & { position: number }>).map((e, i) =>
        toCardData(e, i),
      ),
      positions: json.data as Array<{ position: number; slug: string }>,
      total: json.total as number,
      type: json.type as string,
      source: 'api' as const,
    };
  } catch {
    if (!USE_MOCK_FALLBACK) {
      return {
        entries: [],
        positions: [],
        total: 0,
        type,
        source: 'api' as const,
      };
    }
    const sorted = [...featuredProfiles].sort((a, b) => b.hotScore - a.hotScore);
    return {
      entries: sorted,
      positions: sorted.map((p, i) => ({ position: i + 1, slug: p.slug })),
      total: sorted.length,
      type,
      source: 'mock' as const,
    };
  }
}

export async function fetchTags() {
  try {
    const res = await fetch(`${API_URL}/api/v1/tags`, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error('tags failed');
    const json = await res.json();
    return {
      tags: json.data as Array<{ slug: string; name: string; profileCount: number }>,
      source: 'api' as const,
    };
  } catch {
    return { tags: [], source: 'mock' as const };
  }
}

export async function fetchCategory(slug: string) {
  try {
    const res = await fetch(`${API_URL}/api/v1/categorias/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return {
      tag: json.tag as { slug: string; name: string; profileCount: number },
      profiles: (json.data as ApiProfileCard[]).map(toCardData),
      total: json.total as number,
      source: (json.source as string) ?? 'api',
    };
  } catch {
    return null;
  }
}

export async function fetchCity(slug: string) {
  try {
    const res = await fetch(`${API_URL}/api/v1/cidades/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return {
      city: json.city as string,
      slug: json.slug as string,
      profiles: (json.data as ApiProfileCard[]).map(toCardData),
      total: json.total as number,
      source: (json.source as string) ?? 'api',
    };
  } catch {
    return null;
  }
}

export async function fetchSeoMeta(
  page: string,
  params?: { slug?: string; name?: string; city?: string },
) {
  const qs = new URLSearchParams({ page });
  if (params?.slug) qs.set('slug', params.slug);
  if (params?.name) qs.set('name', params.name);
  if (params?.city) qs.set('city', params.city);

  try {
    const res = await fetch(`${API_URL}/api/v1/seo/meta?${qs}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<{
      title: string;
      description: string;
      robots: string;
      canonical: string;
    }>;
  } catch {
    return null;
  }
}

export async function fetchSeoSchema(
  page: string,
  params?: { slug?: string; name?: string; city?: string; description?: string; imageUrl?: string },
) {
  const qs = new URLSearchParams({ page });
  if (params?.slug) qs.set('slug', params.slug);
  if (params?.name) qs.set('name', params.name);
  if (params?.city) qs.set('city', params.city);
  if (params?.description) qs.set('description', params.description);
  if (params?.imageUrl) qs.set('imageUrl', params.imageUrl);

  try {
    const res = await fetch(`${API_URL}/api/v1/seo/schema?${qs}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<Record<string, unknown>>;
  } catch {
    return null;
  }
}

export async function fetchSimilarProfiles(slug: string, limit = 4) {
  try {
    const res = await fetch(`${API_URL}/api/v1/profiles/${slug}/similar?limit=${limit}`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return { profiles: [], total: 0 };
    const json = await res.json();
    return {
      profiles: (json.data as Array<{ profile: ApiProfileCard; similarityScore: number }>).map(
        (item, index) => toCardData(item.profile, index),
      ),
      total: json.total as number,
    };
  } catch {
    return { profiles: [], total: 0 };
  }
}

export type VideoItem = {
  id: string;
  title: string;
  description?: string | null;
  url: string;
  mimeType: string;
  viewCount: number;
  likeCount: number;
  profileName: string;
  profileSlug?: string;
  city?: string;
};

export type MomentItem = {
  id: string;
  caption?: string | null;
  url: string;
  mimeType: string;
  mediaType: string;
  likeCount: number;
  viewCount: number;
  profileName: string;
  profileSlug: string;
  city?: string;
  publishedAt: string;
};

export async function fetchVideos(limit = 24) {
  try {
    const res = await fetch(`${API_URL}/api/v1/videos?limit=${limit}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error('videos failed');
    const json = await res.json();
    return { videos: json.data as VideoItem[], total: json.total as number, source: 'api' as const };
  } catch {
    return { videos: [], total: 0, source: 'mock' as const };
  }
}

export async function fetchMomentsFeed(limit = 20) {
  try {
    const res = await fetch(`${API_URL}/api/v1/moments/feed?limit=${limit}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) throw new Error('moments failed');
    const json = await res.json();
    return { moments: json.data as MomentItem[], total: json.total as number, source: 'api' as const };
  } catch {
    return { moments: [], total: 0, source: 'mock' as const };
  }
}

export async function fetchProfileMoments(slug: string) {
  try {
    const res = await fetch(`${API_URL}/api/v1/profiles/${slug}/moments`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { moments: [], total: 0 };
    const json = await res.json();
    return { moments: json.data as MomentItem[], total: json.total as number };
  } catch {
    return { moments: [], total: 0 };
  }
}

export async function fetchProfileVideos(slug: string) {
  try {
    const res = await fetch(`${API_URL}/api/v1/profiles/${slug}/videos`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { videos: [], total: 0 };
    const json = await res.json();
    return { videos: json.data as VideoItem[], total: json.total as number };
  } catch {
    return { videos: [], total: 0 };
  }
}

export async function fetchReviews(slug: string) {
  try {
    const res = await fetch(`${API_URL}/api/v1/reviews/profile/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return { data: [], summary: null };
    return res.json() as Promise<{
      data: Array<{ id: string; authorName: string; rating: number; comment: string | null; createdAt: string }>;
      summary: { averageRating: number; reviewCount: number } | null;
    }>;
  } catch {
    return { data: [], summary: null };
  }
}

export async function fetchComments(targetType: string, targetId: string) {
  try {
    const res = await fetch(`${API_URL}/api/v1/comments/${targetType}/${targetId}`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data as Array<{ id: string; authorName: string; content: string; createdAt: string }>;
  } catch {
    return [];
  }
}

export type SiteSettings = {
  siteName: string;
  heroTitlePrefix: string;
  heroTitleHighlight: string;
  heroSubtitle: string;
  maintenanceMode: boolean;
  registrationOpen: boolean;
  premiumHomeLimit: number;
};

const defaultSettings: SiteSettings = {
  siteName: 'Acompanhante',
  heroTitlePrefix: 'Encontre acompanhantes',
  heroTitleHighlight: 'exclusivas',
  heroSubtitle: 'Descubra perfis premium com confiança, sofisticação e facilidade de navegação.',
  maintenanceMode: false,
  registrationOpen: true,
  premiumHomeLimit: 6,
};

export async function fetchNearbyProfiles(
  lat: number,
  lng: number,
  radiusKm = 150,
  limit = 12,
): Promise<{ profiles: CompanionCardData[]; source: 'api' | 'mock' }> {
  try {
    const qs = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      radius: String(radiusKm),
      limit: String(limit),
    });
    const res = await fetch(`${API_URL}/api/v1/profiles/nearby?${qs}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const json = (await res.json()) as { data: ApiProfileCard[] };
    if (!json.data?.length) {
      return USE_MOCK_FALLBACK
        ? { profiles: mockNearby(lat, lng, radiusKm, limit), source: 'mock' }
        : { profiles: [], source: 'api' };
    }
    return {
      profiles: json.data.map(toCardData),
      source: 'api',
    };
  } catch {
    return USE_MOCK_FALLBACK
      ? { profiles: mockNearby(lat, lng, radiusKm, limit), source: 'mock' }
      : { profiles: [], source: 'api' };
  }
}

function mockNearby(lat: number, lng: number, _radiusKm: number, limit: number) {
  return featuredProfiles
    .map((p, index) => {
      const coords = profileCoordinates[p.slug];
      const distanceKm = coords ? haversineKm(lat, lng, coords.lat, coords.lng) : undefined;
      return { ...p, distanceKm, index };
    })
    .sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    })
    .slice(0, limit)
    .map(({ index: _, ...p }) => p);
}

export async function fetchSiteSettings(): Promise<SiteSettings> {
  try {
    const res = await fetch(`${API_URL}/api/v1/settings`, { next: { revalidate: 60 } });
    if (!res.ok) return defaultSettings;
    return (await res.json()) as SiteSettings;
  } catch {
    return defaultSettings;
  }
}
