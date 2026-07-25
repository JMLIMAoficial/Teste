"use client";

import { useCallback, useEffect, useState } from "react";
import { CompanionCard } from "@/components/companion-card";
import type { CompanionCardData } from "@/lib/mock-data";
import { featuredProfiles } from "@/lib/mock-data";
import { fetchNearbyProfiles, fetchPublicProfiles } from "@/lib/api";
import { formatDistanceKm, requestUserLocation, type GeoPosition } from "@/lib/geo";
import {
  CONSENT_CHANGED_EVENT,
  hasConsentDecision,
  hasGeoConsent,
} from "@/lib/consent";

type GeoState =
  | { status: "idle" | "loading" }
  | { status: "ready"; position: GeoPosition; label: string }
  | { status: "denied"; message: string };

export function NearbySection() {
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });
  const [profiles, setProfiles] = useState<CompanionCardData[]>([]);
  const [sortedByDistance, setSortedByDistance] = useState(true);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  const loadNearby = useCallback(async (position: GeoPosition) => {
    setLoadingProfiles(true);
    try {
      const result = await fetchNearbyProfiles(position.lat, position.lng, 200, 50);
      setProfiles(result.profiles);
      setSortedByDistance(true);
    } finally {
      setLoadingProfiles(false);
    }
  }, []);

  const loadFallback = useCallback(async () => {
    setLoadingProfiles(true);
    try {
      const result = await fetchPublicProfiles();
      setProfiles(result.profiles);
      setSortedByDistance(false);
    } finally {
      setLoadingProfiles(false);
    }
  }, []);

  const detectLocation = useCallback(async () => {
    setGeo({ status: "loading" });
    try {
      const position = await requestUserLocation();
      setGeo({
        status: "ready",
        position,
        label: `${position.lat.toFixed(2)}°, ${position.lng.toFixed(2)}°`,
      });
      await loadNearby(position);
    } catch (err) {
      setGeo({
        status: "denied",
        message: err instanceof Error ? err.message : "Não foi possível obter sua localização",
      });
      await loadFallback();
    }
  }, [loadNearby, loadFallback]);

  useEffect(() => {
    function init() {
      if (hasConsentDecision() && hasGeoConsent()) {
        void detectLocation();
      } else {
        void loadFallback();
      }
    }

    init();

    function onConsentChanged() {
      if (hasGeoConsent()) {
        void detectLocation();
      }
    }

    window.addEventListener(CONSENT_CHANGED_EVENT, onConsentChanged);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onConsentChanged);
  }, [detectLocation, loadFallback]);

  return (
    <section id="perfis" className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-text-primary sm:text-2xl">Perfis perto de você</h2>
          {sortedByDistance && geo.status === "ready" ? (
            <p className="text-sm text-text-secondary">
              Ordenado por proximidade
              {profiles[0]?.distanceKm != null &&
                ` · mais próximo a ${formatDistanceKm(profiles[0].distanceKm)}`}
            </p>
          ) : (
            <p className="mt-1 text-sm text-text-secondary">Explore os perfis disponíveis na plataforma</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {geo.status === "ready" && (
            <span className="rounded-full border border-border-subtle bg-bg-secondary px-3 py-1 text-xs text-text-muted">
              📍 {geo.label}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              if (hasGeoConsent()) {
                void detectLocation();
              } else {
                void loadFallback();
              }
            }}
            disabled={geo.status === "loading" || loadingProfiles}
            className="rounded-xl border border-border-subtle bg-bg-secondary px-4 py-2 text-sm text-text-secondary transition hover:border-purple-deep/40 hover:text-text-primary disabled:opacity-50"
          >
            {geo.status === "loading" ? "Localizando..." : "Atualizar localização"}
          </button>
        </div>
      </div>

      {geo.status === "denied" && (
        <div className="mb-6 rounded-xl border border-border-subtle bg-bg-secondary px-4 py-3 text-sm text-text-muted">
          {!hasGeoConsent()
            ? "Ative a geolocalização nas preferências de cookies para ordenar perfis por proximidade."
            : "Localização indisponível — exibindo perfis sem ordenação por distância."}
        </div>
      )}

      {loadingProfiles && profiles.length === 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] animate-pulse rounded-2xl border border-border-subtle bg-bg-secondary"
            />
          ))}
        </div>
      )}

      {profiles.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {profiles.map((profile) => (
            <CompanionCard key={profile.slug} profile={profile} />
          ))}
        </div>
      )}

      {!loadingProfiles && profiles.length === 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {featuredProfiles.map((profile) => (
            <CompanionCard key={profile.slug} profile={profile} />
          ))}
        </div>
      )}
    </section>
  );
}
