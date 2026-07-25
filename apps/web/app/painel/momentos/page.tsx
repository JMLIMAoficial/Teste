"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PainelShell } from "@/components/painel-shell";
import type { MomentStats, OwnMomentItem } from "@/lib/moment-upload";
import { apiFetch, logout } from "@/lib/auth";

function mediaStatusLabel(status: string) {
  if (status === "approved") return "Publicado";
  if (status === "pending") return "Em análise";
  if (status === "rejected") return "Rejeitado";
  return status;
}

function statusClass(status: string) {
  if (status === "approved") return "bg-success/15 text-success";
  if (status === "pending") return "bg-purple-deep/15 text-purple-light";
  if (status === "rejected") return "bg-red-500/15 text-red-400";
  return "bg-bg-tertiary text-text-muted";
}

export default function PainelMomentosPage() {
  const router = useRouter();
  const [stats, setStats] = useState<MomentStats | null>(null);
  const [moments, setMoments] = useState<OwnMomentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [statsRes, momentsRes] = await Promise.all([
        apiFetch<MomentStats>("/v1/companion/moments/stats"),
        apiFetch<{ data: OwnMomentItem[] }>("/v1/companion/moments"),
      ]);
      setStats(statsRes);
      setMoments(momentsRes.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    function onUploaded() {
      load();
    }
    window.addEventListener("companion-moment-uploaded", onUploaded);
    return () => window.removeEventListener("companion-moment-uploaded", onUploaded);
  }, [load]);

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  if (loading) {
    return (
      <PainelShell onLogout={handleLogout}>
        <p className="text-text-secondary">Carregando momentos...</p>
      </PainelShell>
    );
  }

  return (
    <PainelShell onLogout={handleLogout}>
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Meus momentos</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Publique fotos e vídeos curtos para aparecer no feed e atrair mais visitantes.
        </p>
      </div>

      {stats && stats.totalMoments === 0 && (
        <section className="mt-6 rounded-2xl border border-purple-deep/30 bg-purple-deep/10 p-5">
          <h2 className="font-semibold text-text-primary">Comece a publicar hoje</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Perfis com momentos recebem mais visualizações. Toque no botão <strong>+</strong> no canto
            inferior para enviar sua primeira foto — quanto mais conteúdo, mais chances de ser visto.
          </p>
          <Link
            href="/painel/perfil#fotos"
            className="mt-4 inline-block text-sm text-purple-light hover:underline"
          >
            Também complete suas fotos de perfil →
          </Link>
        </section>
      )}

      {stats && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Visualizações", value: stats.totalViews, hint: "nos seus momentos" },
            { label: "Curtidas", value: stats.totalLikes, hint: "total acumulado" },
            { label: "Comentários", value: stats.totalComments, hint: "aprovados" },
            {
              label: "Publicados",
              value: stats.approvedMoments,
              hint: "visíveis no feed",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-border-subtle bg-bg-secondary p-4"
            >
              <p className="text-xs uppercase tracking-wider text-text-muted">{item.label}</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{item.value}</p>
              <p className="text-xs text-text-muted">{item.hint}</p>
            </div>
          ))}
        </div>
      )}

      {moments.length === 0 ? (
        <p className="mt-8 text-text-secondary">
          Nenhum momento ainda. Use o botão flutuante + para publicar.
        </p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {moments.map((moment) => {
            const isVideo =
              moment.mediaType === "video" || moment.mimeType?.startsWith("video/");
            return (
              <article
                key={moment.id}
                className="overflow-hidden rounded-2xl border border-border-subtle bg-bg-secondary"
              >
                <div className="relative aspect-[4/5] bg-bg-tertiary">
                  {isVideo ? (
                    <video
                      src={moment.url}
                      className="h-full w-full object-cover"
                      controls
                      playsInline
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={moment.url} alt="" className="h-full w-full object-cover" />
                  )}
                  <span
                    className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusClass(moment.status)}`}
                  >
                    {mediaStatusLabel(moment.status)}
                  </span>
                </div>
                <div className="p-4">
                  <p className="line-clamp-2 text-sm text-text-primary">
                    {moment.caption || "Sem legenda"}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {new Date(moment.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-secondary">
                    <span>👁 {moment.viewCount} views</span>
                    <span>♥ {moment.likeCount} curtidas</span>
                    {moment.commentCount > 0 && (
                      <span>💬 {moment.commentCount}</span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </PainelShell>
  );
}
