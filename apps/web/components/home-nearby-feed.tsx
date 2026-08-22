"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CompanionCard } from "@/components/companion-card";
import type { CompanionCardData } from "@/lib/mock-data";
import { fetchNearbyProfiles } from "@/lib/api";
import { formatDistanceKm, requestUserLocation, type GeoPosition } from "@/lib/geo";
import {
  CONSENT_CHANGED_EVENT,
  hasConsentDecision,
  hasGeoConsent,
} from "@/lib/consent";
import { PROFILE_POSITIONS } from "@/lib/profile-position";

const POSITION_OPTIONS = [
  { value: "", label: "Todas" },
  ...PROFILE_POSITIONS,
] as const;

type QuickFilter = "verified" | "premium" | "featured" | null;

type GeoState =
  | { status: "idle" | "loading" }
  | { status: "ready"; position: GeoPosition }
  | { status: "denied"; message: string };

type HomeNearbyFeedProps = {
  initialProfiles: CompanionCardData[];
};

function rankProfile(a: CompanionCardData, b: CompanionCardData) {
  const score = (p: CompanionCardData) =>
    (p.isFeatured ? 4 : 0) + (p.isPremium ? 2 : 0) + (p.isVerified ? 1 : 0);
  return score(b) - score(a);
}

function chipClass(active: boolean) {
  return active
    ? "rounded-full border border-orange/60 bg-gradient-to-r from-orange to-gold px-3 py-1.5 text-xs font-semibold text-bg-primary"
    : "rounded-full border border-border-subtle bg-bg-secondary px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-orange/40 hover:text-text-primary";
}

export function HomeNearbyFeed({ initialProfiles }: HomeNearbyFeedProps) {
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });
  const [profiles, setProfiles] = useState(initialProfiles);
  const [sortedByDistance, setSortedByDistance] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [positionFilter, setPositionFilter] = useState("");
  const [neighborhoodFilter, setNeighborhoodFilter] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>(null);

  const loadNearby = useCallback(
    async (position: GeoPosition) => {
      setLoadingProfiles(true);
      try {
        const result = await fetchNearbyProfiles(position.lat, position.lng, 200, 50);
        setProfiles(result.profiles.length > 0 ? result.profiles : initialProfiles);
        setSortedByDistance(true);
        setNeighborhoodFilter("");
      } finally {
        setLoadingProfiles(false);
      }
    },
    [initialProfiles],
  );

  const detectLocation = useCallback(async () => {
    setGeo({ status: "loading" });
    try {
      const position = await requestUserLocation();
      setGeo({ status: "ready", position });
      await loadNearby(position);
    } catch {
      setGeo({
        status: "denied",
        message: "Localização indisponível",
      });
    }
  }, [loadNearby]);

  useEffect(() => {
    if (hasConsentDecision() && hasGeoConsent()) {
      void detectLocation();
    }

    function onConsentChanged() {
      if (hasGeoConsent()) void detectLocation();
    }

    window.addEventListener(CONSENT_CHANGED_EVENT, onConsentChanged);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onConsentChanged);
  }, [detectLocation]);

  const neighborhoods = useMemo(() => {
    const set = new Set<string>();
    for (const profile of profiles) {
      if (profile.neighborhood?.trim()) set.add(profile.neighborhood.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [profiles]);

  const activeNeighborhoodFilter =
    neighborhoodFilter && neighborhoods.includes(neighborhoodFilter) ? neighborhoodFilter : "";

  const verifiedCount = useMemo(
    () => profiles.filter((p) => p.isVerified).length,
    [profiles],
  );

  const filteredProfiles = useMemo(() => {
    const list = profiles.filter((profile) => {
      if (positionFilter && profile.position !== positionFilter) return false;
      if (activeNeighborhoodFilter && profile.neighborhood !== activeNeighborhoodFilter) {
        return false;
      }
      if (quickFilter === "verified" && !profile.isVerified) return false;
      if (quickFilter === "premium" && !profile.isPremium) return false;
      if (quickFilter === "featured" && !profile.isFeatured) return false;
      return true;
    });

    if (sortedByDistance) return list;
    return [...list].sort(rankProfile);
  }, [
    profiles,
    positionFilter,
    activeNeighborhoodFilter,
    quickFilter,
    sortedByDistance,
  ]);

  function toggleQuick(next: QuickFilter) {
    setQuickFilter((current) => (current === next ? null : next));
  }

  function clearFilters() {
    setPositionFilter("");
    setNeighborhoodFilter("");
    setQuickFilter(null);
  }

  const hasFilters = Boolean(positionFilter || activeNeighborhoodFilter || quickFilter);

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">
            Garotos perto de você
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {profiles.length} perfil{profiles.length === 1 ? "" : "s"}
            {verifiedCount > 0 ? ` · ${verifiedCount} verificado${verifiedCount === 1 ? "" : "s"}` : ""}
            {sortedByDistance && geo.status === "ready"
              ? filteredProfiles[0]?.distanceKm != null
                ? ` · mais próximo a ${formatDistanceKm(filteredProfiles[0].distanceKm)}`
                : " · ordenado por distância"
              : " · escolha rápido e fale no WhatsApp"}
          </p>
        </div>

        {geo.status !== "ready" && (
          <button
            type="button"
            onClick={() => void detectLocation()}
            disabled={geo.status === "loading" || loadingProfiles}
            className="rounded-lg border border-orange/40 bg-orange/10 px-3 py-1.5 text-xs font-medium text-orange hover:bg-orange/20 disabled:opacity-50"
          >
            {geo.status === "loading" ? "Localizando..." : "Usar localização"}
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => toggleQuick("verified")}
          className={chipClass(quickFilter === "verified")}
        >
          Verificados
        </button>
        <button
          type="button"
          onClick={() => toggleQuick("premium")}
          className={chipClass(quickFilter === "premium")}
        >
          Premium
        </button>
        <button
          type="button"
          onClick={() => toggleQuick("featured")}
          className={chipClass(quickFilter === "featured")}
        >
          Destaque
        </button>
        <button
          type="button"
          onClick={() => {
            if (geo.status === "ready") {
              void loadNearby(geo.position);
              return;
            }
            void detectLocation();
          }}
          disabled={geo.status === "loading" || loadingProfiles}
          className={chipClass(sortedByDistance && geo.status === "ready")}
        >
          {geo.status === "loading" || loadingProfiles ? "Localizando…" : "Perto de mim"}
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <span className="text-text-muted">Posição</span>
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="rounded-lg border border-border-subtle bg-bg-secondary px-3 py-1.5 text-sm text-text-primary"
          >
            {POSITION_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <span className="text-text-muted">Bairro</span>
          <select
            value={activeNeighborhoodFilter}
            onChange={(e) => setNeighborhoodFilter(e.target.value)}
            disabled={neighborhoods.length === 0}
            className="max-w-[12rem] rounded-lg border border-border-subtle bg-bg-secondary px-3 py-1.5 text-sm text-text-primary disabled:opacity-50"
          >
            <option value="">Todos</option>
            {neighborhoods.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-orange hover:text-gold"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {loadingProfiles && (
        <div className="mb-3 flex items-center gap-2 text-xs text-text-muted">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-orange border-t-transparent" />
          Atualizando por distância...
        </div>
      )}

      {filteredProfiles.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filteredProfiles.map((profile) => (
            <CompanionCard key={profile.slug} profile={profile} />
          ))}
        </div>
      ) : !loadingProfiles ? (
        <div className="rounded-2xl border border-border-subtle bg-bg-secondary px-6 py-10 text-center">
          <p className="text-text-secondary">Nenhum perfil com esses filtros.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 text-sm text-orange hover:text-gold"
          >
            Limpar filtros
          </button>
        </div>
      ) : null}
    </section>
  );
}
