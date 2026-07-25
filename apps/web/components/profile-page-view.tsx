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

type ProfilePhoto = { id: string; url: string; isCover: boolean };
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
  if (position === "Ativo") return "🔥";
  if (position === "Passivo") return "🍑";
  if (position === "Versátil") return "⚡";
  return "👤";
}

function SectionHeading({ emoji, children }: { emoji?: string; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-purple-light">
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
    ? "rounded-full bg-bg-primary/90 px-2.5 py-1 text-xs font-medium text-text-primary md:bg-bg-primary/70 md:backdrop-blur-sm"
    : "rounded-full border border-border-subtle bg-bg-tertiary px-3 py-1 text-sm text-text-secondary";

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
    ? "rounded-full bg-bg-primary/90 px-2.5 py-1 text-xs font-medium text-text-primary md:bg-bg-primary/70 md:backdrop-blur-sm"
    : "rounded-full border border-border-subtle bg-bg-tertiary px-3 py-1 text-sm text-text-secondary";

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
          className="rounded-full border border-border-subtle bg-bg-primary px-3 py-1 text-sm text-text-secondary md:bg-bg-tertiary"
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
        Informe que viu o anunciante neste site. Não nos envolvemos em tratativas entre as partes.
        Todo atendimento deve ser alinhado com o anunciante antes do encontro.
      </p>
      <p className="mt-2 font-medium text-gold">Evite golpes — não faça pagamento antecipado.</p>
    </section>
  );
}

function ProfileWhatsAppSection({
  profile,
  variant = "default",
}: {
  profile: ProfilePageData;
  variant?: "default" | "compact" | "sticky";
}) {
  const showWhatsApp =
    (profile.hasWhatsApp && profile.whatsappUrl && profile.profileId) || profile.isMock;

  if (!showWhatsApp) return null;

  const wrapperClass =
    variant === "sticky"
      ? "fixed inset-x-0 bottom-[calc(3.25rem+env(safe-area-inset-bottom))] z-30 border-t border-success/20 bg-bg-secondary/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_32px_rgba(0,0,0,0.45)] md:static md:bottom-auto md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none"
      : variant === "compact"
        ? ""
        : "md:rounded-2xl md:border md:border-success/20 md:bg-bg-secondary md:p-4";

  return (
    <section className={wrapperClass} aria-label="Contato WhatsApp">
      <div
        className={
          variant === "sticky"
            ? "mx-auto max-w-4xl md:rounded-2xl md:border md:border-success/20 md:bg-bg-secondary md:p-4"
            : ""
        }
      >
        {variant !== "compact" && (
          <p className="mb-3 hidden text-sm text-text-secondary md:block">
            Interessado? Entre em contato agora.
          </p>
        )}
        {variant === "compact" && (
          <p className="mb-2 text-xs text-text-muted">Contato profissional apenas.</p>
        )}
        {profile.hasWhatsApp && profile.whatsappUrl && profile.profileId ? (
          <WhatsAppButton
            profileId={profile.profileId}
            url={profile.whatsappUrl}
            label={variant === "compact" ? "Me chama no WhatsApp" : "Conversar no WhatsApp"}
            fullWidth
          />
        ) : (
          <a
            href={`https://wa.me/5511999999999?text=${encodeURIComponent("Olá! Vi seu perfil no Acompanhante e gostaria de mais informações.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-success py-3.5 font-semibold text-white transition-opacity hover:opacity-90"
          >
            Conversar no WhatsApp
          </a>
        )}
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
  const heroUrl =
    profile.coverPhotoUrl ??
    profile.photos.find((p) => p.isCover)?.url ??
    profile.photos[0]?.url;

  const showWhatsApp =
    (profile.hasWhatsApp && profile.whatsappUrl && profile.profileId) || profile.isMock;

  const premiumFrame = profile.isPremium
    ? "border-gold/40 ring-1 ring-gold/20"
    : "border-border-subtle";

  const galleryPhotos =
    profile.photos.length > 0
      ? profile.photos
      : heroUrl
        ? [{ id: "cover", url: heroUrl, isCover: true }]
        : [];
  const heroIndex = resolvePhotoIndex(galleryPhotos, heroUrl);

  return (
    <ProfilePhotoGalleryProvider photos={galleryPhotos}>
    <div className={`min-h-full bg-bg-primary ${showWhatsApp ? "pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:pb-8" : "pb-8"}`}>
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

      {showWhatsApp && (
        <div className="px-4 pt-4 md:hidden">
          <ProfileWhatsAppSection profile={profile} variant="compact" />
        </div>
      )}

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
            {showWhatsApp && (
              <div className="mt-5">
                <ProfileWhatsAppSection profile={profile} variant="compact" />
              </div>
            )}
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
                    {slot.startTime}–{slot.endTime}
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

        {galleryPhotos.length > 0 && (
          <section>
            <SectionHeading emoji="📸">Fotos</SectionHeading>
            <div className="mt-3">
              <ProfilePhotoGrid />
            </div>
          </section>
        )}

        {videos.length > 0 && (
          <section>
            <SectionHeading emoji="🎬">Vídeos</SectionHeading>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
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

        {showWhatsApp && <div className="hidden md:block"><ProfileWhatsAppSection profile={profile} variant="default" /></div>}

        {showWhatsApp && <div className="md:hidden"><ProfileWhatsAppSection profile={profile} variant="sticky" /></div>}
      </div>
    </div>
    </ProfilePhotoGalleryProvider>
  );
}
