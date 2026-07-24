"use client";

import Link from "next/link";

const SORT_OPTIONS = [
  { value: "relevancia", label: "Mais relevantes" },
  { value: "hotscore", label: "Maior Hot Score" },
  { value: "visualizacoes", label: "Mais visualizados" },
  { value: "recentes", label: "Mais recentes" },
  { value: "premium", label: "Premium primeiro" },
  { value: "destaque", label: "Destaques primeiro" },
] as const;

const PREFERENCE_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "homens", label: "Homens" },
  { value: "mulheres", label: "Mulheres" },
  { value: "casais", label: "Casais" },
  { value: "todos", label: "Todos" },
] as const;

function buildSearchHref(
  current: Record<string, string | undefined>,
  patch: Record<string, string | undefined>,
) {
  const merged = { ...current, ...patch };
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) qs.set(key, value);
  }
  const query = qs.toString();
  return query ? `/busca?${query}` : "/busca";
}

type SearchFilterControlsProps = {
  filterBase: Record<string, string | undefined>;
  sort: string;
  preference?: string;
};

export function SearchFilterControls({ filterBase, sort, preference }: SearchFilterControlsProps) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm text-text-secondary">
        <span>Ordenar:</span>
        <select
          value={sort}
          className="rounded-lg border border-border-subtle bg-bg-secondary px-3 py-1.5 text-text-primary"
          onChange={(e) => {
            window.location.href = buildSearchHref(filterBase, { ordenar: e.target.value });
          }}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-text-secondary">
        <span>Preferência:</span>
        <select
          value={preference ?? ""}
          className="rounded-lg border border-border-subtle bg-bg-secondary px-3 py-1.5 text-text-primary"
          onChange={(e) => {
            window.location.href = buildSearchHref(filterBase, {
              preferencia: e.target.value || undefined,
            });
          }}
        >
          {PREFERENCE_OPTIONS.map((opt) => (
            <option key={opt.value || "all"} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function SearchQuickFilters({
  filterBase,
  params,
  tag,
}: {
  filterBase: Record<string, string | undefined>;
  params: {
    premium?: string;
    featured?: string;
    verificado?: string;
  };
  tag?: string;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Link
        href={buildSearchHref(filterBase, {
          premium: params.premium === "true" ? undefined : "true",
        })}
        className={`rounded-full border px-3 py-1 text-sm transition-colors ${
          params.premium === "true"
            ? "border-purple-deep bg-purple-deep/20 text-purple-light"
            : "border-border-subtle text-text-secondary hover:text-text-primary"
        }`}
      >
        Premium
      </Link>
      <Link
        href={buildSearchHref(filterBase, {
          featured: params.featured === "true" ? undefined : "true",
        })}
        className={`rounded-full border px-3 py-1 text-sm transition-colors ${
          params.featured === "true"
            ? "border-purple-deep bg-purple-deep/20 text-purple-light"
            : "border-border-subtle text-text-secondary hover:text-text-primary"
        }`}
      >
        Em destaque
      </Link>
      <Link
        href={buildSearchHref(filterBase, {
          verificado: params.verificado === "true" ? undefined : "true",
        })}
        className={`rounded-full border px-3 py-1 text-sm transition-colors ${
          params.verificado === "true"
            ? "border-purple-deep bg-purple-deep/20 text-purple-light"
            : "border-border-subtle text-text-secondary hover:text-text-primary"
        }`}
      >
        Verificado
      </Link>
      {["Massagem", "Jantar", "Viagem", "Eventos"].map((t) => (
        <Link
          key={t}
          href={buildSearchHref(filterBase, { tag: tag === t ? undefined : t })}
          className={`rounded-full border px-3 py-1 text-sm transition-colors ${
            tag === t
              ? "border-purple-deep bg-purple-deep/20 text-purple-light"
              : "border-border-subtle text-text-secondary hover:text-text-primary"
          }`}
        >
          {t}
        </Link>
      ))}
    </div>
  );
}
