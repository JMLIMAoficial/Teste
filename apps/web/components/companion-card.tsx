import Link from "next/link";
import type { CompanionCardData } from "@/lib/mock-data";
import { OptimizedImage } from "@/components/optimized-image";
import { profilePositionLabel } from "@/lib/profile-position";

function cardLocation(profile: CompanionCardData) {
  if (profile.neighborhood?.trim()) return profile.neighborhood.trim();
  return profile.city.replace(/,\s*[A-Z]{2}$/i, "").trim() || profile.city;
}

export function CompanionCard({ profile }: { profile: CompanionCardData }) {
  const position = profilePositionLabel(profile.position);
  const imageUrl = profile.coverPhotoThumbUrl ?? profile.coverPhotoUrl;

  const frameClass = profile.isFeatured
    ? "border border-purple-light/50 shadow-[0_0_0_1px_rgba(147,51,234,0.22),0_6px_22px_rgba(107,33,168,0.32)] hover:border-purple-light/70 hover:shadow-[0_0_0_1px_rgba(147,51,234,0.35),0_8px_28px_rgba(107,33,168,0.4)]"
    : profile.isPremium
      ? "border border-gold/40 shadow-[0_4px_24px_rgba(0,0,0,0.4)] ring-1 ring-gold/20 hover:border-gold/55 hover:ring-gold/30 hover:shadow-[0_8px_32px_rgba(234,88,12,0.18)]"
      : "border border-border-subtle shadow-[0_4px_24px_rgba(0,0,0,0.4)] hover:border-orange/35 hover:shadow-[0_8px_32px_rgba(234,88,12,0.18)]";

  return (
    <Link
      href={`/perfil/${profile.slug}`}
      className={`group block overflow-hidden rounded-2xl bg-bg-secondary transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 ${frameClass}`}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        {imageUrl ? (
          <OptimizedImage
            src={imageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className={`absolute inset-0 bg-gradient-to-br ${profile.photoGradient} transition-transform duration-300 group-hover:scale-105`}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />

        <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5">
          {profile.isFeatured && (
            <span className="rounded-full border border-purple-light/50 bg-purple-deep/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Destaque
            </span>
          )}
          {profile.isPremium && (
            <span className="rounded-full bg-gradient-to-r from-gold to-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-bg-primary">
              Premium
            </span>
          )}
          {profile.distanceKm != null && (
            <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white/95">
              {profile.distanceKm < 1
                ? `${Math.round(profile.distanceKm * 1000)} m`
                : `${profile.distanceKm.toFixed(1)} km`}
            </span>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-white sm:text-lg">
            <span className="truncate">{profile.name}</span>
            {profile.isVerified && (
              <span
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success text-xs font-bold text-white shadow-[0_0_0_2px_rgba(0,0,0,0.4)]"
                title="Perfil verificado"
                aria-label="Perfil verificado"
              >
                ✓
              </span>
            )}
          </h3>
          <p className="mt-0.5 truncate text-sm font-medium text-white">
            {cardLocation(profile)}
          </p>
          {(profile.penisSizeCm != null || position) && (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-white/95">
              {profile.penisSizeCm != null && (
                <span aria-label={`${profile.penisSizeCm} centímetros`}>
                  {profile.penisSizeCm} cm
                </span>
              )}
              {profile.penisSizeCm != null && position && (
                <span className="text-white/50" aria-hidden>
                  ·
                </span>
              )}
              {position && <span>{position}</span>}
            </p>
          )}
          {profile.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {profile.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-black/50 px-2 py-0.5 text-[11px] text-white/90"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
