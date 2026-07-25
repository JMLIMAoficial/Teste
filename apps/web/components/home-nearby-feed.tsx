"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CompanionCard } from "@/components/companion-card";
import type { CompanionCardData } from "@/lib/mock-data";
import { fetchNearbyProfiles } from "@/lib/api";
import { formatDistanceKm, requestUserLocation, type GeoPosition } from "@/lib/geo";
import {
  CONSENT_CHANGED_EVENT,
  hasConsentDecision,
  hasGeoConsent,
} from "@/lib/consent";

const POSITION_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "active", label: "Ativo" },
  { value: "passive", label: "Passivo" },
  { value: "versatile", label: "Versátil" },
] as const;

type GeoState =
  | { status: "idle" | "loading" }
  | { status: "ready"; position: GeoPosition }
  | { status: "denied"; message: string };

type HomeNearbyFeedProps = {
  initialProfiles: CompanionCardData[];
};

export function HomeNearbyFeed({ initialProfiles }: HomeNearbyFeedProps) {
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });
  const [profiles, setProfiles] = useState(initialProfiles);
  const [sortedByDistance, setSortedByDistance] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [positionFilter, setPositionFilter] = useState("");
  const [neighborhoodFilter, setNeighborhoodFilter] = useState("");

  const loadNearby = useCallback(async (position: GeoPosition) => {
    setLoadingProfiles(true);
    try {
      const result = await fetchNearbyProfiles(position.lat, position.lng, 200, 50);
      setProfiles(result.profiles.length > 0 ? result.profiles : initialProfiles);
      setSortedByDistance(true);
      setNeighborhoodFilter("");
    } finally {
      setLoadingProfiles(false);
    }
  }, [initialProfiles]);

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

  const filteredProfiles = useMemo(() => {
    return profiles.filter((profile) => {
      if (positionFilter && profile.position !== positionFilter) return false;
      if (activeNeighborhoodFilter && profile.neighborhood !== activeNeighborhoodFilter) return false;
      return true;
    });
  }, [profiles, positionFilter, activeNeighborhoodFilter]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary sm:text-2xl">Perto de você</h1>
          <p className="mt-1 text-sm text-text-muted">
            {sortedByDistance && geo.status === "ready"
              ? `Ordenado por distância${
                  filteredProfiles[0]?.distanceKm != null
                    ? ` · mais próximo a ${formatDistanceKm(filteredProfiles[0].distanceKm)}`
                    : ""
                }`
              : "Ative a localização para ver quem está mais perto"}
          </p>
        </div>

        {geo.status !== "ready" && (
          <button
            type="button"
            onClick={() => void detectLocation()}
            disabled={geo.status === "loading" || loadingProfiles}
            className="rounded-lg border border-border-subtle px-3 py-1.5 text-xs text-text-secondary hover:border-purple-deep/40 disabled:opacity-50"
          >
            {geo.status === "loading" ? "Localizando..." : "📍 Usar localização"}
          </button>
        )}
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

        {(positionFilter || activeNeighborhoodFilter) && (
          <button
            type="button"
            onClick={() => {
              setPositionFilter("");
              setNeighborhoodFilter("");
            }}
            className="text-xs text-purple-light hover:text-gold"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {loadingProfiles && (
        <div className="mb-3 flex items-center gap-2 text-xs text-text-muted">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-purple-light border-t-transparent" />
          Atualizando por distância...
        </div>
      )}

      {filteredProfiles.length > 0 ? (
        <>
          <p className="mb-3 text-xs text-text-muted">
            {filteredProfiles.length} perfil{filteredProfiles.length !== 1 ? "is" : ""}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filteredProfiles.map((profile) => (
              <CompanionCard key={profile.slug} profile={profile} />
            ))}
          </div>
        </>
      ) : !loadingProfiles ? (
        <div className="rounded-2xl border border-border-subtle bg-bg-secondary px-6 py-10 text-center">
          <p className="text-text-secondary">Nenhum perfil com esses filtros.</p>
          <button
            type="button"
            onClick={() => {
              setPositionFilter("");
              setNeighborhoodFilter("");
            }}
            className="mt-3 text-sm text-purple-light hover:text-gold"
          >
            Limpar filtros
          </button>
        </div>
      ) : null}

      <p className="mt-8 text-center text-xs text-text-muted">
        <Link href="/busca" className="text-purple-light hover:text-gold">
          Busca avançada
        </Link>
        {" · "}
        <Link href="/cadastro" className="text-text-secondary hover:text-text-primary">
          Anunciar
        </Link>
      </p>
    </section>
  );
}
