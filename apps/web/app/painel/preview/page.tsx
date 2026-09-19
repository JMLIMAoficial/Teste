"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProfilePageView } from "@/components/profile-page-view";
import { PainelShell } from "@/components/painel-shell";
import type { VideoItem } from "@/lib/api";
import { apiFetch, getAccessToken, logout } from "@/lib/auth";
import { profilePositionLabel } from "@/lib/profile-position";

type PreviewProfile = {
  slug: string;
  name: string;
  age: number | null;
  city: string;
  neighborhood?: string | null;
  locationLabel?: string | null;
  mapUrl?: string | null;
  memberSince?: string | null;
  preference: string;
  position?: string | null;
  penisSizeCm?: number | null;
  bio?: string | null;
  tags?: string[];
  status: string;
  isPublic: boolean;
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
  videos?: VideoItem[];
  id?: string;
};

export default function PainelPreviewPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<PreviewProfile | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    apiFetch<PreviewProfile>("/v1/companion/profile/preview")
      .then((preview) => {
        setProfile(preview);
        setVideos(preview.videos ?? []);
      })
      .catch(() => router.replace("/painel"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary text-text-secondary">
        Carregando prévia...
      </div>
    );
  }

  if (!profile?.id) return null;

  return (
    <PainelShell
      onLogout={async () => {
        await logout();
        router.push("/login");
      }}
    >
      <div className="mb-6 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
        Modo pré-visualização — {profile.status !== "approved" || !profile.isPublic
          ? `seu perfil ainda não está público (status: ${profile.status}).`
          : "este é o visual do seu perfil público."}
        {" "}Fotos em moderação também aparecem aqui.
      </div>

      <ProfilePageView
        profile={{
          slug: profile.slug,
          profileId: profile.id,
          name: profile.name,
          age: profile.age,
          city: profile.city,
          neighborhood: profile.neighborhood,
          locationLabel: profile.locationLabel,
          mapUrl: profile.mapUrl,
          memberSince: profile.memberSince,
          bio: profile.bio,
          preference: profile.preference,
          position: profilePositionLabel(profile.position),
          penisSizeCm: profile.penisSizeCm,
          tags: profile.tags ?? [],
          photos: profile.photos ?? [],
          coverPhotoUrl:
            profile.coverPhotoUrl ??
            profile.photos?.find((p) => p.isCover)?.url ??
            profile.photos?.[0]?.url,
          hotScore: profile.hotScore,
          hotScoreLabel: profile.hotScoreLabel,
          isPremium: profile.isPremium,
          isFeatured: profile.isFeatured,
          isVerified: profile.isVerified,
          hasWhatsApp: profile.hasWhatsApp,
          whatsappUrl: profile.whatsappUrl,
          socialLinks: profile.socialLinks,
          pricing: profile.pricing ?? null,
          availability: profile.availability ?? [],
        }}
        videos={videos}
        reviews={[]}
        reviewSummary={null}
        comments={[]}
        topNotice={null}
        backHref="/painel"
        backLabel="← Voltar ao painel"
      />
    </PainelShell>
  );
}
