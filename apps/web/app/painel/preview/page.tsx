"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProfilePageView } from "@/components/profile-page-view";
import { PainelShell } from "@/components/painel-shell";
import type { VideoItem } from "@/lib/api";
import { apiFetch, getAccessToken, logout } from "@/lib/auth";

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
  photos?: Array<{ id: string; url: string; isCover: boolean }>;
  coverPhotoUrl?: string | null;
  hotScore?: number;
  hotScoreLabel?: string;
  isPremium?: boolean;
  isFeatured?: boolean;
  isVerified?: boolean;
  hasWhatsApp?: boolean;
  whatsappUrl?: string;
  socialLinks?: Partial<Record<"privacy" | "onlyfans" | "x" | "instagram", string>>;
  id?: string;
};

function positionLabel(position?: string | null) {
  if (position === "active") return "Ativo";
  if (position === "passive") return "Passivo";
  if (position === "versatile") return "Versátil";
  return null;
}

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
    Promise.all([
      apiFetch<PreviewProfile>("/v1/companion/profile/preview"),
      apiFetch<{ data: VideoItem[] }>("/v1/companion/videos"),
    ])
      .then(([preview, videosRes]) => {
        setProfile(preview);
        setVideos(videosRes.data ?? []);
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
          position: positionLabel(profile.position),
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
