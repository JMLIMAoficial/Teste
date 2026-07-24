import Link from "next/link";
import type { CompanionCardData } from "@/lib/mock-data";
import { HotScoreThermometer } from "@/components/hot-score-thermometer";
import { OptimizedImage } from "@/components/optimized-image";

function positionLabel(position?: string | null) {
  if (position === "active") return "Ativo";
  if (position === "passive") return "Passivo";
  if (position === "versatile") return "Versátil";
  return null;
}

export function CompanionCard({ profile }: { profile: CompanionCardData }) {
  const position = positionLabel(profile.position);
  const imageUrl = profile.coverPhotoThumbUrl ?? profile.coverPhotoUrl;

  return (
    <Link
      href={`/perfil/${profile.slug}`}
      className={`group block overflow-hidden rounded-2xl bg-bg-secondary shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(107,33,168,0.15)] ${
        profile.isPremium
          ? "border border-gold/40 ring-1 ring-gold/20 hover:border-gold/55 hover:ring-gold/30"
          : "border border-border-subtle hover:border-purple-deep/30"
      }`}
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
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-transparent to-transparent" />

        <HotScoreThermometer score={profile.hotScore} label={profile.hotScoreLabel} overlay />

        <div className="absolute left-3 top-3 flex max-w-[calc(100%-3rem)] flex-wrap gap-1.5">
          {profile.distanceKm != null && (
            <span className="rounded-full bg-bg-primary/95 px-2 py-0.5 text-[10px] font-semibold text-purple-light md:bg-bg-primary/90 md:backdrop-blur">
              {profile.distanceKm < 1
                ? `${Math.round(profile.distanceKm * 1000)} m`
                : `${profile.distanceKm.toFixed(1)} km`}
            </span>
          )}
          {profile.isPremium && (
            <span className="rounded-full bg-gradient-to-r from-gold to-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-bg-primary">
              Premium
            </span>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-9 p-4">
          <h3 className="flex items-center gap-1.5 text-lg font-semibold text-text-primary">
            <span>{profile.name}</span>
            {profile.isFeatured && (
              <span className="text-sm leading-none" title="Destaque" aria-label="Destaque">
                ⭐
              </span>
            )}
            {profile.isVerified && (
              <span
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-success px-1.5 py-0.5 text-[11px] font-bold leading-none text-white shadow-sm"
                title="Perfil verificado"
                aria-label="Perfil verificado"
              >
                ✓
              </span>
            )}
          </h3>
          <p className="text-sm text-text-secondary">
            {(profile.age ?? 0) > 0 ? `${profile.age} anos` : "Idade não informada"}
            {profile.penisSizeCm != null && (
              <>
                {" · "}
                <span aria-label={`${profile.penisSizeCm} centímetros`}>
                  🍆 {profile.penisSizeCm} cm
                </span>
              </>
            )}
            {" · "}
            {profile.neighborhood ? `${profile.neighborhood}, ${profile.city}` : profile.city}
          </p>
          {position && <p className="mt-0.5 text-xs text-text-muted">{position}</p>}
          <div className="mt-2 flex flex-wrap gap-1">
            {profile.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-bg-tertiary/80 px-2 py-0.5 text-[11px] text-text-secondary"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}
