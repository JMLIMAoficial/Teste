"use client";

import Link from "next/link";
import type { CompanionCardData } from "@/lib/mock-data";

const SORT_OPTIONS = [
  { value: "relevancia", label: "Mais relevantes" },
  { value: "hotscore", label: "Maior Hot Score" },
  { value: "visualizacoes", label: "Mais visualizados" },
  { value: "recentes", label: "Mais recentes" },
  { value: "premium", label: "Premium primeiro" },
  { value: "destaque", label: "Destaques primeiro" },
] as const;

const POSITION_OPTIONS = [
  { value: "", label: "Qualquer" },
  { value: "active", label: "Ativo" },
  { value: "passive", label: "Passivo" },
  { value: "versatile", label: "Versátil" },
] as const;

const PREFERENCE_OPTIONS = [
  { value: "", label: "Qualquer" },
  { value: "homens", label: "Homens" },
  { value: "mulheres", label: "Mulheres" },
  { value: "casais", label: "Casais" },
  { value: "todos", label: "Todos" },
] as const;

const TAG_SUGGESTIONS = ["Massagem", "Jantar", "Viagem", "Eventos", "Fitness", "Companhia"];

export type SearchPageParams = {
  q?: string;
  city?: string;
  bairro?: string;
  posicao?: string;
  preferencia?: string;
  premium?: string;
  featured?: string;
  verificado?: string;
  tag?: string;
  ordenar?: string;
};

function activeFilters(params: SearchPageParams) {
  const items: Array<{ key: string; label: string; href: string }> = [];
  const base = { ...params };

  const drop = (key: keyof SearchPageParams) => {
    const next = { ...base, [key]: undefined };
    if (key === "tag") next.tag = undefined;
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) {
      if (v) qs.set(k, v);
    }
    const query = qs.toString();
    return query ? `/busca?${query}` : "/busca";
  };

  if (params.q) items.push({ key: "q", label: `"${params.q}"`, href: drop("q") });
  if (params.city) items.push({ key: "city", label: params.city, href: drop("city") });
  if (params.bairro) items.push({ key: "bairro", label: params.bairro, href: drop("bairro") });
  if (params.posicao) {
    const label = POSITION_OPTIONS.find((o) => o.value === params.posicao)?.label ?? params.posicao;
    items.push({ key: "posicao", label, href: drop("posicao") });
  }
  if (params.preferencia) {
    items.push({
      key: "preferencia",
      label: PREFERENCE_OPTIONS.find((o) => o.value === params.preferencia)?.label ?? params.preferencia,
      href: drop("preferencia"),
    });
  }
  if (params.premium === "true") items.push({ key: "premium", label: "Premium", href: drop("premium") });
  if (params.featured === "true")
    items.push({ key: "featured", label: "Destaque", href: drop("featured") });
  if (params.verificado === "true")
    items.push({ key: "verificado", label: "Verificado", href: drop("verificado") });
  if (params.tag) items.push({ key: "tag", label: params.tag, href: drop("tag") });

  return items;
}

type SearchAdvancedPanelProps = {
  params: SearchPageParams;
  tags?: Array<{ name: string; slug: string }>;
};

export function SearchAdvancedPanel({ params, tags = [] }: SearchAdvancedPanelProps) {
  const sort = params.ordenar ?? "relevancia";
  const chips = activeFilters(params);
  const tagOptions = tags.length > 0 ? tags.map((t) => t.name) : TAG_SUGGESTIONS;

  return (
    <div className="mt-6 space-y-5">
      <form
        action="/busca"
        method="get"
        className="rounded-2xl border border-border-subtle bg-bg-secondary p-5 sm:p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block sm:col-span-2 lg:col-span-3">
            <span className="mb-1.5 block text-xs font-medium text-text-muted">Palavra-chave</span>
            <input
              type="search"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Nome, bio ou tag..."
              className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-deep focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-text-muted">Cidade</span>
            <input
              type="text"
              name="city"
              defaultValue={params.city ?? ""}
              placeholder="Ex: São Paulo"
              className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-deep focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-text-muted">Bairro</span>
            <input
              type="text"
              name="bairro"
              defaultValue={params.bairro ?? ""}
              placeholder="Ex: Jardins"
              className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-purple-deep focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-text-muted">Posição</span>
            <select
              name="posicao"
              defaultValue={params.posicao ?? ""}
              className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-2.5 text-sm text-text-primary focus:border-purple-deep focus:outline-none"
            >
              {POSITION_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-text-muted">Preferência</span>
            <select
              name="preferencia"
              defaultValue={params.preferencia ?? ""}
              className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-2.5 text-sm text-text-primary focus:border-purple-deep focus:outline-none"
            >
              {PREFERENCE_OPTIONS.map((opt) => (
                <option key={opt.value || "all"} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-text-muted">Ordenar por</span>
            <select
              name="ordenar"
              defaultValue={sort}
              className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-2.5 text-sm text-text-primary focus:border-purple-deep focus:outline-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-text-muted">Categoria</span>
            <select
              name="tag"
              defaultValue={params.tag ?? ""}
              className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-2.5 text-sm text-text-primary focus:border-purple-deep focus:outline-none"
            >
              <option value="">Qualquer</option>
              {tagOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              name="premium"
              value="true"
              defaultChecked={params.premium === "true"}
              className="rounded border-border-subtle"
            />
            Premium
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              name="featured"
              value="true"
              defaultChecked={params.featured === "true"}
              className="rounded border-border-subtle"
            />
            Em destaque
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              name="verificado"
              value="true"
              defaultChecked={params.verificado === "true"}
              className="rounded border-border-subtle"
            />
            Verificado
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-purple-deep px-6 py-2.5 text-sm font-medium text-white hover:bg-purple-light"
          >
            Buscar perfis
          </button>
          <Link
            href="/busca"
            className="rounded-xl border border-border-subtle px-6 py-2.5 text-sm text-text-secondary hover:text-text-primary"
          >
            Limpar tudo
          </Link>
        </div>
      </form>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-muted">Filtros ativos:</span>
          {chips.map((chip) => (
            <Link
              key={chip.key}
              href={chip.href}
              className="inline-flex items-center gap-1 rounded-full border border-purple-deep/30 bg-purple-deep/10 px-3 py-1 text-xs text-purple-light hover:border-purple-deep/50"
            >
              {chip.label}
              <span aria-hidden>×</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function SearchResultsSummary({
  total,
  source,
  profiles,
}: {
  total: number;
  source: string;
  profiles: CompanionCardData[];
}) {
  return (
    <p className="mt-2 text-sm text-text-muted">
      {total} perfil{total !== 1 ? "is" : ""} encontrado{total !== 1 ? "s" : ""}
      {source === "meilisearch" && " · busca rápida"}
      {source === "database" && " · banco de dados"}
      {profiles.length > 0 && profiles[0]?.neighborhood && (
        <> · bairros como {profiles[0].neighborhood}</>
      )}
    </p>
  );
}
