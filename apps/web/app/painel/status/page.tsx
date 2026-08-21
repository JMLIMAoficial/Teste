"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HotScoreThermometer } from "@/components/hot-score-thermometer";
import { PainelShell } from "@/components/painel-shell";
import { apiFetch, getAccessToken, logout } from "@/lib/auth";

type BoostRequestInfo = {
  id: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  rejectionReason: string | null;
};

type CompanionStatus = {
  slug: string;
  displayName: string;
  status: string;
  isPublic: boolean;
  city?: string;
  isPremium: boolean;
  isFeatured: boolean;
  premiumExpiresAt: string | null;
  featuredExpiresAt: string | null;
  hotScore: number | null;
  hotScoreLevel: string | null;
  viewCount: number;
  premiumRequest: BoostRequestInfo | null;
  featuredRequest: BoostRequestInfo | null;
  canRequestPremium: boolean;
  canRequestFeatured: boolean;
};

export default function PainelStatusPage() {
  const router = useRouter();
  const [data, setData] = useState<CompanionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"premium" | "featured" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    void load();
  }, [router]);

  async function load() {
    try {
      const status = await apiFetch<CompanionStatus>("/v1/companion/status");
      setData(status);
    } catch {
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  async function requestBoost(type: "premium" | "featured") {
    setBusy(type);
    setError("");
    try {
      await apiFetch(`/v1/companion/status/${type}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar solicitação");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary text-text-secondary">
        Carregando...
      </div>
    );
  }

  if (!data) return null;

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  const premiumPending = !data.isPremium && data.premiumRequest?.status === "pending";
  const featuredPending = !data.isFeatured && data.featuredRequest?.status === "pending";

  return (
    <PainelShell onLogout={handleLogout}>
      <h1 className="text-2xl font-bold text-text-primary">Premium & Destaque</h1>
      <p className="mt-1 text-text-secondary">
        Escolha o plano que combina com o seu momento: presença fixa ou impulso rápido.
      </p>

      {error && (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border-subtle bg-bg-secondary p-5">
          <p className="text-sm text-text-muted">Perfil</p>
          <p className="mt-1 text-lg font-semibold text-text-primary">{data.displayName}</p>
          <p className="text-sm text-text-secondary">
            {data.status} · {data.isPublic ? "Público" : "Privado"}
          </p>
          {data.city && <p className="mt-1 text-sm text-text-muted">{data.city}</p>}
          {data.status === "approved" && data.isPublic && (
            <Link
              href={`/perfil/${data.slug}`}
              className="mt-3 inline-block text-sm text-purple-light hover:underline"
            >
              Ver perfil público →
            </Link>
          )}
          {data.status === "approved" && !data.isPublic && (
            <Link
              href="/painel/preview"
              className="mt-3 inline-block text-sm text-purple-light hover:underline"
            >
              Pré-visualizar perfil →
            </Link>
          )}
        </div>

        <div className="rounded-2xl border border-border-subtle bg-bg-secondary p-5">
          <p className="text-sm text-text-muted">Popularidade</p>
          {data.hotScore != null ? (
            <div className="mt-3">
              <HotScoreThermometer
                score={data.hotScore}
                label={data.hotScoreLevel ?? undefined}
                badge
              />
            </div>
          ) : (
            <p className="mt-1 text-3xl font-bold text-text-primary">—</p>
          )}
          <p className="mt-3 text-sm text-text-muted">{data.viewCount} visualizações</p>
        </div>
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <article
          className={`rounded-2xl border p-6 ${
            data.isPremium
              ? "border-gold/40 bg-gold/10"
              : premiumPending
                ? "border-amber-400/40 bg-amber-400/10"
                : "border-border-subtle bg-bg-secondary"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gold">
                Presença contínua
              </p>
              <h2 className="mt-1 text-xl font-semibold text-text-primary">Premium</h2>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                data.isPremium
                  ? "bg-gold/20 text-gold"
                  : premiumPending
                    ? "bg-amber-400/20 text-amber-200"
                    : "bg-bg-tertiary text-text-muted"
              }`}
            >
              {data.isPremium ? "Ativo ✓" : premiumPending ? "Solicitado" : "Inativo"}
            </span>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-text-secondary">
            Ideal para quem busca <strong className="font-medium text-text-primary">fidelidade no anúncio</strong>{" "}
            e atende em <strong className="font-medium text-text-primary">lugar fixo</strong>. Você ganha mais
            estabilidade na vitrine e aparece com prioridade nos{" "}
            <strong className="font-medium text-text-primary">melhores resultados de buscas e recomendações</strong>.
          </p>

          <ul className="mt-4 space-y-2 text-sm text-text-muted">
            <li>• Melhor posicionamento na busca e nas recomendações</li>
            <li>• Selo Premium no perfil e nos cards</li>
            <li>• Indicado para rotina estável na mesma região</li>
          </ul>

          {data.premiumExpiresAt && data.isPremium && (
            <p className="mt-4 text-sm text-text-secondary">
              Expira em {new Date(data.premiumExpiresAt).toLocaleDateString("pt-BR")}
            </p>
          )}

          {premiumPending && (
            <p className="mt-4 text-sm text-amber-200">
              Solicitação enviada em{" "}
              {new Date(data.premiumRequest!.createdAt).toLocaleDateString("pt-BR")}. Aguardando a
              administração.
            </p>
          )}

          {!data.isPremium && data.premiumRequest?.status === "rejected" && (
            <p className="mt-4 text-sm text-red-300">
              Solicitação recusada
              {data.premiumRequest.rejectionReason
                ? `: ${data.premiumRequest.rejectionReason}`
                : "."}{" "}
              Você pode solicitar novamente.
            </p>
          )}

          {data.canRequestPremium && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void requestBoost("premium")}
              className="mt-5 inline-flex rounded-xl bg-gold/20 px-4 py-2.5 text-sm font-medium text-gold hover:bg-gold/30 disabled:opacity-50"
            >
              {busy === "premium" ? "Enviando..." : "Solicitar Premium"}
            </button>
          )}
        </article>

        <article
          className={`rounded-2xl border p-6 ${
            data.isFeatured
              ? "border-purple-deep/40 bg-purple-deep/10"
              : featuredPending
                ? "border-amber-400/40 bg-amber-400/10"
                : "border-border-subtle bg-bg-secondary"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-purple-light">
                Impulso rápido
              </p>
              <h2 className="mt-1 text-xl font-semibold text-text-primary">Destaque</h2>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                data.isFeatured
                  ? "bg-purple-deep/20 text-purple-light"
                  : featuredPending
                    ? "bg-amber-400/20 text-amber-200"
                    : "bg-bg-tertiary text-text-muted"
              }`}
            >
              {data.isFeatured ? "Ativo ✓" : featuredPending ? "Solicitado" : "Inativo"}
            </span>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-text-secondary">
            Recomendado para quem é <strong className="font-medium text-text-primary">novo na região</strong>{" "}
            ou vai ficar por <strong className="font-medium text-text-primary">pouco tempo</strong>. Ajuda a
            ganhar visibilidade rápida enquanto o perfil ainda está se estabelecendo.
          </p>

          <ul className="mt-4 space-y-2 text-sm text-text-muted">
            <li>• Maior exposição por um período limitado</li>
            <li>• Selo Destaque no perfil e nos cards</li>
            <li>• Ideal para chegada nova ou passagem curta</li>
          </ul>

          {data.featuredExpiresAt && data.isFeatured && (
            <p className="mt-4 text-sm text-text-secondary">
              Expira em {new Date(data.featuredExpiresAt).toLocaleDateString("pt-BR")}
            </p>
          )}

          {featuredPending && (
            <p className="mt-4 text-sm text-amber-200">
              Solicitação enviada em{" "}
              {new Date(data.featuredRequest!.createdAt).toLocaleDateString("pt-BR")}. Aguardando a
              administração.
            </p>
          )}

          {!data.isFeatured && data.featuredRequest?.status === "rejected" && (
            <p className="mt-4 text-sm text-red-300">
              Solicitação recusada
              {data.featuredRequest.rejectionReason
                ? `: ${data.featuredRequest.rejectionReason}`
                : "."}{" "}
              Você pode solicitar novamente.
            </p>
          )}

          {data.canRequestFeatured && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void requestBoost("featured")}
              className="mt-5 inline-flex rounded-xl border border-purple-deep/40 px-4 py-2.5 text-sm font-medium text-purple-light hover:bg-purple-deep/10 disabled:opacity-50"
            >
              {busy === "featured" ? "Enviando..." : "Solicitar Destaque"}
            </button>
          )}
        </article>
      </section>
    </PainelShell>
  );
}
