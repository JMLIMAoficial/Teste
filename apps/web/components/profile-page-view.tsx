import Link from "next/link";
import dynamic from "next/dynamic";
import { CompanionCard } from "@/components/companion-card";
import type { CompanionCardData } from "@/lib/mock-data";
import { OptimizedImage } from "@/components/optimized-image";
import {
  ProfilePhotoGalleryProvider,
  ProfilePhotoGrid,
  ProfilePhotoTrigger,
} from "@/components/profile-photo-gallery";
import { resolvePhotoIndex } from "@/lib/profile-photo-utils";
import { VideoCard } from "@/components/video-card";
import { WhatsAppButton } from "@/components/whatsapp-button";
import type { VideoItem } from "@/lib/api";

const ProfileEngagement = dynamic(
  () => import("@/components/profile-engagement").then((m) => ({ default: m.ProfileEngagement })),
  {
    loading: () => (
      <div className="h-40 animate-pulse rounded-2xl border border-border-subtle bg-bg-secondary" />
    ),
  },
);

const ReportContentModal = dynamic(
  () => import("@/components/report-content-modal").then((m) => ({ default: m.ReportContentModal })),
  {
    loading: () => (
      <span className="inline-block h-9 w-24 animate-pulse rounded-lg bg-bg-secondary" />
    ),
  },
);

type ProfilePhoto = {
  id: string;
  url: string;
  thumbUrl?: string;
  isCover: boolean;
  isProfile?: boolean;
};
type SocialLinks = Partial<Record<"privacy" | "onlyfans" | "x" | "instagram", string>>;

export type ProfilePageData = {
  slug: string;
  profileId?: string;
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
  tags: string[];
  photos: ProfilePhoto[];
  coverPhotoUrl?: string | null;
  photoGradient?: string;
  hotScore?: number;
  hotScoreLabel?: string;
  isPremium?: boolean;
  isFeatured?: boolean;
  isVerified?: boolean;
  hasWhatsApp?: boolean;
  whatsappUrl?: string;
  socialLinks?: SocialLinks;
  isMock?: boolean;
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

type ProfilePageViewProps = {
  profile: ProfilePageData;
  videos: VideoItem[];
  reviews: Array<{
    id: string;
    authorName: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  }>;
  reviewSummary: { averageRating: number; reviewCount: number } | null;
  comments: Array<{ id: string; authorName: string; content: string; createdAt: string }>;
  similarProfiles?: CompanionCardData[];
  topNotice?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
};

function positionEmoji(position?: string | null) {
  if (!position) return "👤";
  if (position.startsWith("Ativo") && position.includes("Passivo")) return "🔄";
  if (position.startsWith("Ativo")) return "🔥";
  if (position.startsWith("Passivo")) return "🍑";
  if (position.startsWith("Versátil")) return "⚡";
  return "👤";
}

function SectionHeading({ emoji, children }: { emoji?: string; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-white">
      {emoji ? <span aria-hidden="true">{emoji}</span> : null}
      {children}
    </h2>
  );
}

const SOCIAL_BUTTONS = [
  { platform: "privacy", label: "Privacy", className: "border-violet-400/40 hover:border-violet-400" },
  { platform: "onlyfans", label: "OnlyFans", className: "border-sky-400/40 hover:border-sky-400" },
  { platform: "x", label: "X", className: "border-text-muted/40 hover:border-text-primary" },
  { platform: "instagram", label: "Instagram", className: "border-pink-400/40 hover:border-pink-400" },
] as const;

function SocialLinkButtons({ links }: { links?: SocialLinks }) {
  const visibleLinks = SOCIAL_BUTTONS.filter(({ platform }) => links?.[platform]);
  if (visibleLinks.length === 0) return null;

  return (
    <section>
      <SectionHeading>Redes sociais</SectionHeading>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {visibleLinks.map(({ platform, label, className }) => (
          <a
            key={platform}
            href={links![platform]}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border bg-bg-secondary px-4 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-tertiary ${className}`}
          >
            {label}
            <span aria-hidden="true">↗</span>
          </a>
        ))}
      </div>
    </section>
  );
}

function ProfileBadges({ profile }: { profile: ProfilePageData }) {
  if (!profile.isPremium && !profile.isFeatured && !profile.isVerified) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-1.5 md:mb-3">
      {profile.isPremium && (
        <span className="rounded-full bg-gradient-to-r from-gold to-orange px-2.5 py-0.5 text-[10px] font-bold uppercase text-bg-primary">
          ⭐ Premium
        </span>
      )}
      {profile.isFeatured && (
        <span className="rounded-full bg-purple-deep px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">
          ✨ Destaque
        </span>
      )}
      {profile.isVerified && (
        <span className="rounded-full bg-success/25 px-2.5 py-0.5 text-[10px] font-bold uppercase text-success md:bg-success/15">
          ✅ Verificado
        </span>
      )}
    </div>
  );
}

function ProfileStats({
  profile,
  overlay = false,
}: {
  profile: ProfilePageData;
  overlay?: boolean;
}) {
  const pillClass = overlay
    ? "rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-xs font-semibold text-white/90 backdrop-blur-[2px]"
    : "rounded-full border border-gold/50 bg-gold/90 px-3 py-1 text-sm font-medium text-[#1a1408]";

  const locationText = profile.locationLabel ?? profile.city;

  return (
    <div className="flex flex-wrap gap-1.5 md:gap-2">
      {profile.age != null && profile.age > 0 && (
        <span className={pillClass}>
          <span aria-hidden="true">🎂 </span>
          {profile.age} anos
        </span>
      )}
      {profile.penisSizeCm != null && (
        <span className={pillClass}>
          <span aria-hidden="true">🍆 </span>
          Dote {profile.penisSizeCm} cm
        </span>
      )}
      {locationText && (
        <span className={pillClass}>
          <span aria-hidden="true">📍 </span>
          {locationText}
        </span>
      )}
    </div>
  );
}

function ProfileMetaChips({
  profile,
  overlay = false,
}: {
  profile: ProfilePageData;
  overlay?: boolean;
}) {
  const pillClass = overlay
    ? "rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-xs font-semibold text-white/90 backdrop-blur-[2px]"
    : "rounded-full border border-gold/50 bg-gold/90 px-3 py-1 text-sm font-medium text-[#1a1408]";

  const items: Array<{ emoji: string; label: string }> = [];
  if (profile.preference) items.push({ emoji: "💕", label: profile.preference });
  if (profile.position) items.push({ emoji: positionEmoji(profile.position), label: profile.position });

  if (items.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1.5 ${overlay ? "mt-2" : "mt-3 md:mt-3"}`}>
      {items.map((item) => (
        <span key={item.label} className={pillClass}>
          <span aria-hidden="true">{item.emoji} </span>
          {item.label}
        </span>
      ))}
    </div>
  );
}

function ProfileTags({ tags, className = "" }: { tags: string[]; className?: string }) {
  if (tags.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full border border-[#a67c1a]/60 bg-[#c4a035] px-3 py-1 text-sm font-medium text-[#1a1408]"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

function ProfilePhoto({
  url,
  gradient,
  className = "",
  priority = false,
}: {
  url?: string | null;
  gradient?: string;
  className?: string;
  priority?: boolean;
}) {
  if (url) {
    return (
      <div className={`relative h-full w-full ${className}`}>
        <OptimizedImage
          src={url}
          alt=""
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, 320px"
          className="object-cover object-top"
        />
      </div>
    );
  }

  return (
    <div
      className={`h-full w-full bg-gradient-to-br ${gradient ?? "from-purple-900/80 to-orange-900/60"} ${className}`}
    />
  );
}

function ProfileSafetyNotice() {
  return (
    <section className="rounded-2xl border border-gold/20 bg-gold/5 p-4 text-sm leading-relaxed text-text-muted">
      <p className="font-medium text-text-secondary">
        <span aria-hidden="true">⚠️ </span>
        Atenção
      </p>
      <p className="mt-2">
        Não nos envolvemos em tratativas entre as partes, valores ou serviços acordados entre as
        partes, condições de atendimento, valores e alinhamentos devem ser combinados exclusivamente
        e diretamente com o anunciante antes da realização de qualquer encontro.
      </p>
    </section>
  );
}

function ProfileWhatsAppSection({
  profile,
}: {
  profile: ProfilePageData;
}) {
  if (!(profile.hasWhatsApp && profile.whatsappUrl && profile.profileId)) {
    return null;
  }

  return (
    <section
      className="fixed inset-x-0 bottom-0 z-30 border-t border-success/20 bg-bg-secondary/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md md:p-4 md:pb-[max(1rem,env(safe-area-inset-bottom))]"
      aria-label="Contato WhatsApp"
    >
      <div className="mx-auto max-w-4xl">
        <WhatsAppButton
          profileId={profile.profileId}
          url={profile.whatsappUrl}
          label="Conversar no WhatsApp"
          fullWidth
        />
      </div>
    </section>
  );
}

export function ProfilePageView({
  profile,
  videos,
  reviews,
  reviewSummary,
  comments,
  similarProfiles = [],
  topNotice,
  backHref = "/",
  backLabel = "← Voltar",
}: ProfilePageViewProps) {
  // API já envia só álbum; capa/perfil ficam em coverPhotoUrl (hero), não na sessão Fotos.
  const albumPhotos = profile.photos.filter((p) => !p.isCover && !p.isProfile);
  const heroUrl =
    profile.coverPhotoUrl ??
    profile.photos.find((p) => p.isCover)?.url ??
    albumPhotos[0]?.url;

  const showWhatsApp = Boolean(
    profile.hasWhatsApp && profile.whatsappUrl && profile.profileId,
  );

  const premiumFrame = profile.isPremium
    ? "border-gold/40 ring-1 ring-gold/20"
    : "border-border-subtle";

  const galleryPhotos =
    heroUrl && profile.coverPhotoUrl
      ? [{ id: "cover", url: profile.coverPhotoUrl, isCover: true as const }, ...albumPhotos]
      : albumPhotos.length > 0
        ? albumPhotos
        : heroUrl
          ? [{ id: "cover", url: heroUrl, isCover: true as const }]
          : [];
  const heroIndex = resolvePhotoIndex(galleryPhotos, heroUrl);

  return (
    <ProfilePhotoGalleryProvider photos={galleryPhotos}>
    <div className={`min-h-full bg-bg-primary ${showWhatsApp ? "pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-28" : "pb-8"}`}>
      <section
        className={`relative aspect-[3/4] max-h-[min(85vh,720px)] w-full overflow-hidden md:hidden ${profile.isPremium ? "ring-2 ring-inset ring-gold/30" : ""}`}
      >
        {galleryPhotos.length > 0 ? (
          <ProfilePhotoTrigger index={heroIndex} className="absolute inset-0 h-full w-full" label="Abrir foto em tela cheia">
            <ProfilePhoto url={heroUrl} gradient={profile.photoGradient} priority />
          </ProfilePhotoTrigger>
        ) : (
          <ProfilePhoto url={heroUrl} gradient={profile.photoGradient} priority />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/30 to-transparent" />

        <Link
          href={backHref}
          className="absolute left-3 top-3 z-10 rounded-full bg-bg-primary/90 px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-bg-primary md:bg-bg-primary/70 md:backdrop-blur-sm"
        >
          {backLabel}
        </Link>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <ProfileBadges profile={profile} />
          <h1 className="text-2xl font-bold text-text-primary">{profile.name}</h1>
          <div className="mt-2">
            <ProfileStats profile={profile} overlay />
          </div>
          <ProfileMetaChips profile={profile} overlay />
        </div>
      </section>

      <section className="mx-auto hidden max-w-4xl px-6 pt-8 md:block">
        <Link
          href={backHref}
          className="mb-6 inline-flex items-center gap-1 text-sm text-text-secondary transition-colors hover:text-text-primary"
        >
          {backLabel}
        </Link>

        <div className={`flex gap-8 rounded-2xl border bg-bg-secondary p-6 lg:gap-10 lg:p-8 ${premiumFrame}`}>
          <div className="w-64 shrink-0 lg:w-72 xl:w-80">
            <div className={`aspect-[3/4] overflow-hidden rounded-xl border ${premiumFrame}`}>
              {galleryPhotos.length > 0 ? (
                <ProfilePhotoTrigger index={heroIndex} className="block h-full w-full" label="Abrir foto em tela cheia">
                  <ProfilePhoto url={heroUrl} gradient={profile.photoGradient} />
                </ProfilePhotoTrigger>
              ) : (
                <ProfilePhoto url={heroUrl} gradient={profile.photoGradient} />
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <ProfileBadges profile={profile} />
            <h1 className="text-3xl font-bold text-text-primary lg:text-4xl">{profile.name}</h1>
            <div className="mt-3">
              <ProfileStats profile={profile} />
            </div>
            <ProfileMetaChips profile={profile} />
            <ProfileTags tags={profile.tags} className="mt-4" />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-6 px-4 pt-4 md:space-y-8 md:px-6 md:pt-8">
        {topNotice}

        {profile.isMock && (
          <p className="rounded-xl border border-border-subtle bg-bg-secondary px-4 py-3 text-sm text-text-muted">
            Dados mock — API indisponível ou perfil não encontrado no banco.
          </p>
        )}

        {profile.profileId && !profile.isMock && (
          <div className="flex justify-end">
            <ReportContentModal
              targetType="profile"
              targetId={profile.profileId}
              profileId={profile.profileId}
            />
          </div>
        )}

        {profile.bio && (
          <section>
            <SectionHeading emoji="📝">Sobre</SectionHeading>
            <p className="mt-3 leading-relaxed text-text-secondary">{profile.bio}</p>
          </section>
        )}

        <SocialLinkButtons links={profile.socialLinks} />

        {profile.pricing?.mode === "consult" && (
          <section>
            <SectionHeading>Valores</SectionHeading>
            <p className="mt-3 text-sm text-text-secondary">Consulte pelo WhatsApp</p>
          </section>
        )}

        {profile.pricing?.mode === "show" && (
          <section>
            <SectionHeading>Valores</SectionHeading>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.pricing.thirtyMin != null && (
                <span className="inline-flex items-baseline gap-1.5 rounded-full border border-border-subtle bg-bg-secondary px-3 py-1.5 text-sm text-text-secondary">
                  <span className="text-text-muted">30 min</span>
                  <span className="font-semibold text-text-primary">
                    R$ {profile.pricing.thirtyMin.toLocaleString("pt-BR")}
                  </span>
                </span>
              )}
              {profile.pricing.oneHour != null && (
                <span className="inline-flex items-baseline gap-1.5 rounded-full border border-border-subtle bg-bg-secondary px-3 py-1.5 text-sm text-text-secondary">
                  <span className="text-text-muted">1h</span>
                  <span className="font-semibold text-text-primary">
                    R$ {profile.pricing.oneHour.toLocaleString("pt-BR")}
                  </span>
                </span>
              )}
              {profile.pricing.twoHours != null && (
                <span className="inline-flex items-baseline gap-1.5 rounded-full border border-border-subtle bg-bg-secondary px-3 py-1.5 text-sm text-text-secondary">
                  <span className="text-text-muted">2h</span>
                  <span className="font-semibold text-text-primary">
                    R$ {profile.pricing.twoHours.toLocaleString("pt-BR")}
                  </span>
                </span>
              )}
              {profile.pricing.overnight != null && (
                <span className="inline-flex items-baseline gap-1.5 rounded-full border border-border-subtle bg-bg-secondary px-3 py-1.5 text-sm text-text-secondary">
                  <span className="text-text-muted">Pernoite</span>
                  <span className="font-semibold text-text-primary">
                    R$ {profile.pricing.overnight.toLocaleString("pt-BR")}
                  </span>
                </span>
              )}
              {(profile.pricing.customItems ?? []).map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-baseline gap-1.5 rounded-full border border-border-subtle bg-bg-secondary px-3 py-1.5 text-sm text-text-secondary"
                >
                  <span className="text-text-muted">{item.label}</span>
                  <span className="font-semibold text-text-primary">
                    R$ {item.price.toLocaleString("pt-BR")}
                  </span>
                </span>
              ))}
            </div>
          </section>
        )}

        {(profile.availability?.length ?? 0) > 0 && (
          <section>
            <SectionHeading>Disponibilidade</SectionHeading>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.availability!.map((slot) => (
                <span
                  key={slot.dayOfWeek}
                  className="inline-flex items-baseline gap-1.5 rounded-full border border-border-subtle bg-bg-secondary px-3 py-1.5 text-sm text-text-secondary"
                >
                  <span className="font-medium text-text-primary">{slot.label}</span>
                  <span className="text-text-muted">
                    {slot.startTime === "00:00" && slot.endTime === "23:59"
                      ? "24h"
                      : `${slot.startTime}–${slot.endTime}`}
                  </span>
                </span>
              ))}
            </div>
          </section>
        )}

        {profile.tags.length > 0 && (
          <section className="md:hidden">
            <SectionHeading>Tags</SectionHeading>
            <ProfileTags tags={profile.tags} className="mt-3" />
          </section>
        )}

        {videos.length > 0 && (
          <section id="videos">
            <SectionHeading emoji="🎬">Vídeos</SectionHeading>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          </section>
        )}

        {albumPhotos.length > 0 && (
          <section id="fotos">
            <SectionHeading emoji="📸">Fotos</SectionHeading>
            <div className="mt-3">
              <ProfilePhotoGrid albumOnly />
            </div>
          </section>
        )}

        {similarProfiles.length > 0 && (
          <section>
            <SectionHeading>Perfis semelhantes</SectionHeading>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {similarProfiles.slice(0, 4).map((item) => (
                <CompanionCard key={item.slug} profile={item} />
              ))}
            </div>
          </section>
        )}

        {profile.profileId && (
          <ProfileEngagement
            profileId={profile.profileId}
            slug={profile.slug}
            initialReviews={reviews}
            initialSummary={reviewSummary}
            initialComments={comments}
          />
        )}

        <ProfileSafetyNotice />
      </div>

      {showWhatsApp && <ProfileWhatsAppSection profile={profile} />}
    </div>
    </ProfilePhotoGalleryProvider>
  );
}
