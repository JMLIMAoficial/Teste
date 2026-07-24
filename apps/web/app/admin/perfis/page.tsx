"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/auth";

type ProfileRow = {
  id: string;
  slug: string;
  displayName: string;
  email: string;
  status: string;
  isPublic: boolean;
  isPremium: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  city?: string;
  state?: string;
  completionPercent: number;
  readyForReview: boolean;
  viewCount: number;
  photoCount: number;
  coverPhotoUrl: string | null;
  coverPhotoThumbUrl: string | null;
};

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "pending", label: "Pendentes" },
  { value: "approved", label: "Aprovados" },
  { value: "rejected", label: "Rejeitados" },
];

const BADGE_FILTERS = [
  { key: "premium", label: "Premium" },
  { key: "featured", label: "Destaque" },
  { key: "verified", label: "Verificados" },
] as const;

function statusBadge(status: string) {
  if (status === "approved") return "bg-success/15 text-success";
  if (status === "pending") return "bg-purple-deep/15 text-purple-light";
  if (status === "rejected") return "bg-red-500/15 text-red-400";
  return "bg-bg-tertiary text-text-muted";
}

export default function AdminPerfisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [queryInput, setQueryInput] = useState(searchParams.get("q") ?? "");
  const [appliedQuery, setAppliedQuery] = useState(searchParams.get("q") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [badges, setBadges] = useState({
    premium: searchParams.get("premium") === "true",
    featured: searchParams.get("featured") === "true",
    verified: searchParams.get("verified") === "true",
  });
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    if (appliedQuery.trim()) params.set("q", appliedQuery.trim());
    if (status) params.set("status", status);
    if (badges.premium) params.set("premium", "true");
    if (badges.featured) params.set("featured", "true");
    if (badges.verified) params.set("verified", "true");
    params.set("limit", "50");
    return params;
  }, [appliedQuery, status, badges]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ data: ProfileRow[]; total: number }>(
        `/v1/admin/profiles?${buildParams()}`,
      );
      setProfiles(data.data);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    router.replace(`/admin/perfis?${buildParams()}`);
  }, [appliedQuery, status, badges, buildParams, router]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setAppliedQuery(queryInput);
  }

  function toggleBadge(key: (typeof BADGE_FILTERS)[number]["key"]) {
    setBadges((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Perfis</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {total} perfil(is) — foto, status, premium e destaque em uma só lista.
          </p>
        </div>
      </div>

      <form onSubmit={handleSearch} className="mt-6 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="Nome, email, slug ou cidade..."
            className="flex-1 rounded-xl border border-border-subtle bg-bg-secondary px-4 py-3 text-text-primary focus:border-purple-deep focus:outline-none"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-border-subtle bg-bg-secondary px-4 py-3 text-text-primary focus:border-purple-deep focus:outline-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-xl bg-purple-deep px-6 py-3 text-sm font-medium text-white hover:bg-purple-light"
          >
            Buscar
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {BADGE_FILTERS.map((filter) => {
            const active = badges[filter.key];
            return (
              <button
                key={filter.key}
                type="button"
                onClick={() => toggleBadge(filter.key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-purple-deep text-white"
                    : "border border-border-subtle bg-bg-secondary text-text-secondary hover:text-text-primary"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </form>

      {loading ? (
        <p className="mt-8 text-text-secondary">Carregando...</p>
      ) : profiles.length === 0 ? (
        <p className="mt-8 text-text-secondary">Nenhum perfil encontrado.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {profiles.map((p) => (
            <Link
              key={p.id}
              href={`/admin/perfis/${p.id}`}
              className="flex gap-4 rounded-2xl border border-border-subtle bg-bg-secondary p-4 transition-colors hover:border-purple-deep/40"
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-bg-tertiary">
                {p.coverPhotoThumbUrl || p.coverPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.coverPhotoThumbUrl || p.coverPhotoUrl!}
                    alt={p.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-[10px] text-text-muted">
                    <span className="text-lg">👤</span>
                    <span>Sem foto</span>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-text-primary">{p.displayName}</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadge(p.status)}`}
                  >
                    {p.status}
                  </span>
                  {p.isPremium && (
                    <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold uppercase text-gold">
                      Premium
                    </span>
                  )}
                  {p.isFeatured && (
                    <span className="rounded-full bg-purple-deep/20 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-light">
                      Destaque
                    </span>
                  )}
                  {p.isVerified && (
                    <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-bold uppercase text-success">
                      Verificado
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-text-secondary">
                  {p.email} · {p.city}, {p.state} · {p.completionPercent}% completo
                  {p.readyForReview ? " · Pronto para análise" : ""}
                </p>
                <p className="text-xs text-text-muted">
                  /perfil/{p.slug} · {p.viewCount} views · {p.photoCount} foto(s) ·{" "}
                  {p.isPublic ? "Público" : "Privado"}
                </p>
              </div>

              <span className="hidden shrink-0 self-center text-sm text-purple-light sm:inline">
                Editar →
              </span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
