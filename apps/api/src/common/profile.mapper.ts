import { HotScoreLevel } from '@prisma/client';

export function calculateAge(birthDate: Date | null): number | null {
  if (!birthDate) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function hotScoreLevel(score: number): HotScoreLevel {
  if (score >= 76) return 'blazing';
  if (score >= 51) return 'hot';
  if (score >= 26) return 'warm';
  return 'cold';
}

export function hotScoreLabel(level: HotScoreLevel): string {
  const map: Record<HotScoreLevel, string> = {
    cold: 'Frio',
    warm: 'Morno',
    hot: 'Quente',
    blazing: 'Em chamas',
  };
  return map[level];
}

export function isStatusActive(active: boolean, expiresAt: Date | null | undefined): boolean {
  if (!active) return false;
  if (!expiresAt) return true;
  return expiresAt > new Date();
}

export function effectiveProfileStatus(profile: {
  isPremium: boolean;
  isFeatured: boolean;
  premiumExpiresAt?: Date | null;
  featuredExpiresAt?: Date | null;
}) {
  return {
    isPremium: isStatusActive(profile.isPremium, profile.premiumExpiresAt),
    isFeatured: isStatusActive(profile.isFeatured, profile.featuredExpiresAt),
  };
}

export function computeHotScore(input: {
  viewCount: number;
  isPremium: boolean;
  isFeatured: boolean;
  whatsappClicks?: number;
  premiumBonus?: number;
  featuredBonus?: number;
}): number {
  const premiumBonus = input.premiumBonus ?? 12;
  const featuredBonus = input.featuredBonus ?? 8;
  let score =
    15 +
    Math.min(50, input.viewCount * 0.6) +
    (input.isPremium ? premiumBonus : 0) +
    (input.isFeatured ? featuredBonus : 0) +
    Math.min(15, (input.whatsappClicks ?? 0) * 3);
  return Math.min(100, Math.round(score * 100) / 100);
}

export type ProfileCardInput = {
  slug: string;
  displayName: string;
  birthDate: Date | null;
  sexualPreference: string | null;
  isPremium: boolean;
  isFeatured: boolean;
  premiumExpiresAt?: Date | null;
  featuredExpiresAt?: Date | null;
  viewCount: number;
  hotScore?: number;
  hotScoreLevel?: HotScoreLevel;
  tags?: string[];
  location: { city: string; state: string; neighborhood?: string | null } | null;
  coverPhotoUrl?: string | null;
  coverPhotoThumbUrl?: string | null;
  distanceKm?: number;
  penisSizeCm?: number | null;
  position?: string | null;
  isVerified?: boolean;
};

export function toPublicCard(profile: ProfileCardInput) {
  const effective = effectiveProfileStatus(profile);
  const city = profile.location
    ? `${profile.location.city}, ${profile.location.state}`
    : 'Brasil';

  const score =
    profile.hotScore ??
    computeHotScore({
      viewCount: profile.viewCount,
      isPremium: effective.isPremium,
      isFeatured: effective.isFeatured,
    });

  const level = profile.hotScoreLevel ?? hotScoreLevel(score);

  return {
    slug: profile.slug,
    name: profile.displayName,
    age: calculateAge(profile.birthDate),
    city,
    preference: profile.sexualPreference ?? 'Não informado',
    tags: profile.tags ?? [],
    hotScore: Math.round(score),
    hotScoreLevel: level,
    hotScoreLabel: hotScoreLabel(level),
    isPremium: effective.isPremium,
    isFeatured: effective.isFeatured,
    isVerified: profile.isVerified ?? false,
    photoGradient: 'from-purple-900/80 to-orange-900/60',
    coverPhotoUrl: profile.coverPhotoUrl,
    coverPhotoThumbUrl: profile.coverPhotoThumbUrl ?? profile.coverPhotoUrl,
    ...(profile.distanceKm != null && {
      distanceKm: Math.round(profile.distanceKm * 10) / 10,
    }),
    ...(profile.penisSizeCm != null && { penisSizeCm: profile.penisSizeCm }),
    ...(profile.position && { position: profile.position }),
    ...(profile.location?.neighborhood && { neighborhood: profile.location.neighborhood }),
  };
}

export function cityToSlug(city: string): string {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function slugToCityName(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function formatMemberSince(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatLocationLabel(location: {
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
}): string {
  const cityState = [location.city, location.state].filter(Boolean).join(', ');
  if (location.neighborhood && cityState) {
    return `${location.neighborhood}, ${cityState}`;
  }
  return cityState || location.neighborhood || 'Brasil';
}

export function buildMapUrl(location: {
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}): string | null {
  if (location.latitude != null && location.longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
  }
  const parts = [location.neighborhood, location.city, location.state, 'Brasil'].filter(Boolean);
  if (parts.length === 0) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}`;
}

export function buildProfileLocationFields(location: {
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  latitude?: unknown;
  longitude?: unknown;
} | null) {
  if (!location?.city) {
    return {
      neighborhood: null as string | null,
      locationLabel: null as string | null,
      mapUrl: null as string | null,
    };
  }

  const latitude =
    location.latitude != null ? Number(location.latitude) : null;
  const longitude =
    location.longitude != null ? Number(location.longitude) : null;

  return {
    neighborhood: location.neighborhood ?? null,
    locationLabel: formatLocationLabel(location),
    mapUrl: buildMapUrl({
      neighborhood: location.neighborhood,
      city: location.city,
      state: location.state,
      latitude,
      longitude,
    }),
  };
}
