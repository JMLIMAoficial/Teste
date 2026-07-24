export type CompanionCardData = {
  slug: string;
  name: string;
  age: number | null;
  city: string;
  preference: string;
  position?: string | null;
  tags: string[];
  hotScore: number;
  hotScoreLabel?: string;
  isPremium: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  photoGradient: string;
  coverPhotoUrl?: string | null;
  coverPhotoThumbUrl?: string | null;
  distanceKm?: number;
  penisSizeCm?: number | null;
  neighborhood?: string | null;
};

/** Coordenadas demo para geolocalização offline */
export const profileCoordinates: Record<string, { lat: number; lng: number }> = {
  "maria-santos": { lat: -23.5613, lng: -46.6565 },
  "ana-oliveira": { lat: -22.9711, lng: -43.1822 },
  "julia-costa": { lat: -19.9245, lng: -43.9352 },
  "camila-ferreira": { lat: -25.4284, lng: -49.2733 },
};

export const featuredProfiles: CompanionCardData[] = [
  {
    slug: "maria-santos",
    name: "Maria Santos",
    age: 25,
    city: "São Paulo, SP",
    neighborhood: "Jardins",
    preference: "Heterossexual",
    position: "active",
    tags: ["Massagem", "Jantar", "Viagem"],
    hotScore: 87,
    penisSizeCm: 18,
    isPremium: true,
    isFeatured: true,
    isVerified: true,
    photoGradient: "from-purple-900/80 to-orange-900/60",
  },
  {
    slug: "ana-oliveira",
    name: "Ana Oliveira",
    age: 28,
    city: "Rio de Janeiro, RJ",
    neighborhood: "Copacabana",
    preference: "Bissexual",
    position: "versatile",
    tags: ["Eventos", "Companhia", "Premium"],
    hotScore: 72,
    penisSizeCm: 16,
    isPremium: true,
    isFeatured: false,
    isVerified: true,
    photoGradient: "from-indigo-900/80 to-purple-900/60",
  },
  {
    slug: "julia-costa",
    name: "Julia Costa",
    age: 23,
    city: "Belo Horizonte, MG",
    neighborhood: "Savassi",
    preference: "Heterossexual",
    position: "passive",
    tags: ["Fitness", "Gastronomia", "Arte"],
    hotScore: 65,
    penisSizeCm: 20,
    isPremium: false,
    isFeatured: true,
    isVerified: false,
    photoGradient: "from-rose-900/80 to-orange-900/60",
  },
  {
    slug: "camila-ferreira",
    name: "Camila Ferreira",
    age: 27,
    city: "Curitiba, PR",
    neighborhood: "Batel",
    preference: "Heterossexual",
    position: "active",
    tags: ["Viagem", "Cultura", "Música"],
    hotScore: 58,
    penisSizeCm: 17,
    isPremium: false,
    isFeatured: false,
    isVerified: true,
    photoGradient: "from-violet-900/80 to-fuchsia-900/60",
  },
];

export const quickFilters = [
  "São Paulo",
  "Premium",
  "Verificadas",
  "Com vídeos",
  "Em alta",
];

export const popularTags = [
  "Massagem",
  "Jantar",
  "Viagem",
  "Eventos",
  "Fitness",
  "Gastronomia",
  "Companhia",
  "Arte",
  "Música",
  "Cultura",
  "Premium",
  "Exclusivo",
];
