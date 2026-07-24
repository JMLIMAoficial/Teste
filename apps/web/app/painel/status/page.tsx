"use client";



import Link from "next/link";

import { useRouter } from "next/navigation";

import { useEffect, useState } from "react";

import { HotScoreThermometer } from "@/components/hot-score-thermometer";

import { PainelShell } from "@/components/painel-shell";

import { apiFetch, getAccessToken, logout } from "@/lib/auth";



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

};



export default function PainelStatusPage() {

  const router = useRouter();

  const [data, setData] = useState<CompanionStatus | null>(null);

  const [loading, setLoading] = useState(true);



  useEffect(() => {

    if (!getAccessToken()) {

      router.replace("/login");

      return;

    }

    load();

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



  return (

    <PainelShell onLogout={handleLogout}>

      <h1 className="text-2xl font-bold text-text-primary">Premium & Destaque</h1>

      <p className="mt-1 text-text-secondary">

        Visão do seu perfil público, badges e popularidade.

      </p>



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



      <section className="mt-8 rounded-2xl border border-border-subtle bg-bg-secondary p-6">

        <h2 className="text-lg font-semibold text-text-primary">Badges ativos</h2>

        <div className="mt-4 flex flex-wrap gap-3">

          <span

            className={`rounded-full px-4 py-2 text-sm ${

              data.isPremium

                ? "bg-gold/20 text-gold"

                : "bg-bg-tertiary text-text-muted"

            }`}

          >

            Premium {data.isPremium ? "✓" : "—"}

          </span>

          <span

            className={`rounded-full px-4 py-2 text-sm ${

              data.isFeatured

                ? "bg-purple-deep/20 text-purple-light"

                : "bg-bg-tertiary text-text-muted"

            }`}

          >

            Destaque {data.isFeatured ? "✓" : "—"}

          </span>

        </div>



        {(data.premiumExpiresAt || data.featuredExpiresAt) && (

          <div className="mt-4 space-y-1 text-sm text-text-secondary">

            {data.premiumExpiresAt && (

              <p>

                Premium expira em:{" "}

                {new Date(data.premiumExpiresAt).toLocaleDateString("pt-BR")}

              </p>

            )}

            {data.featuredExpiresAt && (

              <p>

                Destaque expira em:{" "}

                {new Date(data.featuredExpiresAt).toLocaleDateString("pt-BR")}

              </p>

            )}

          </div>

        )}



        {!data.isPremium && !data.isFeatured && (

          <p className="mt-4 text-sm text-text-muted">

            Nenhum badge ativo no momento.

          </p>

        )}



        {(!data.isPremium || !data.isFeatured) && (

          <div className="mt-5 flex flex-wrap gap-3">

            {!data.isPremium && (

              <Link

                href="/painel/mensagens"

                className="rounded-xl bg-gold/20 px-4 py-2 text-sm font-medium text-gold hover:bg-gold/30"

              >

                Solicitar Premium →

              </Link>

            )}

            {!data.isFeatured && (

              <Link

                href="/painel/mensagens"

                className="rounded-xl border border-purple-deep/40 px-4 py-2 text-sm font-medium text-purple-light hover:bg-purple-deep/10"

              >

                Solicitar Destaque →

              </Link>

            )}

          </div>

        )}

      </section>

    </PainelShell>

  );

}


