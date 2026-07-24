"use client";



import Link from "next/link";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/auth";



type PendingProfile = {

  id: string;

  slug: string;

  displayName: string;

  bio: string | null;

  city?: string;

  state?: string;

  completionPercent: number;

  readyForReview: boolean;

  missing: string[];

  photoCount: number;

};



type PendingComment = {

  id: string;

  authorName: string;

  content: string;

  targetType: string;

  profileId: string;

  createdAt: string;

};



type PendingReview = {

  id: string;

  authorName: string;

  rating: number;

  comment: string | null;

  profileId: string;

  createdAt: string;

};



type PendingVideo = {

  id: string;

  title: string;

  profileName: string;

  profileId: string;

  createdAt: string;

};



type PendingMoment = {

  id: string;

  caption: string | null;

  profileName: string;

  profileId: string;

  mediaType: string;

  createdAt: string;

};



type ApprovedProfile = {

  id: string;

  slug: string;

  displayName: string;

  city?: string;

  state?: string;

  isVerified: boolean;

};



export default function AdminModeracaoPage() {

  const [pending, setPending] = useState<PendingProfile[]>([]);

  const [comments, setComments] = useState<PendingComment[]>([]);

  const [reviews, setReviews] = useState<PendingReview[]>([]);

  const [videos, setVideos] = useState<PendingVideo[]>([]);

  const [moments, setMoments] = useState<PendingMoment[]>([]);

  const [approved, setApproved] = useState<ApprovedProfile[]>([]);

  const [loading, setLoading] = useState(true);



  useEffect(() => {

    load();

  }, []);



  async function load() {

    try {

      const [profilesRes, commentsRes, reviewsRes, videosRes, momentsRes, approvedRes] =

        await Promise.all([

          apiFetch<{ data: PendingProfile[] }>("/v1/admin/profiles/pending"),

          apiFetch<{ data: PendingComment[] }>("/v1/admin/comments/pending"),

          apiFetch<{ data: PendingReview[] }>("/v1/admin/reviews/pending"),

          apiFetch<{ data: PendingVideo[] }>("/v1/admin/videos/pending"),

          apiFetch<{ data: PendingMoment[] }>("/v1/admin/moments/pending"),

          apiFetch<{ data: ApprovedProfile[] }>("/v1/admin/profiles/approved"),

        ]);

      setPending(profilesRes.data);

      setComments(commentsRes.data);

      setReviews(reviewsRes.data);

      setVideos(videosRes.data);

      setMoments(momentsRes.data);

      setApproved(approvedRes.data);

    } finally {

      setLoading(false);

    }

  }



  if (loading) return <p className="text-text-secondary">Carregando moderação...</p>;



  return (

    <>

      <h1 className="text-2xl font-bold text-text-primary">Moderação</h1>

      <p className="mt-1 text-sm text-text-secondary">

        Aprove conteúdos pendentes ou abra o perfil para editar e ajudar a acompanhante.

      </p>



      <ModerationSection

        title="Perfis pendentes"

        empty="Nenhum perfil aguardando moderação."

        items={pending.map((p) => ({

          id: p.id,

          title: p.displayName,

          subtitle: `${p.city}, ${p.state} · ${p.photoCount} foto(s) · ${p.completionPercent}%${

            p.readyForReview ? " · Pronto" : ""

          }`,

          body: p.readyForReview

            ? p.bio

            : `Pendências: ${p.missing.join(", ")}${p.bio ? `\n\n${p.bio}` : ""}`,

          profileHref: `/admin/perfis/${p.id}`,

          approvePath: `/v1/admin/profiles/${p.id}/approve`,

          rejectPath: `/v1/admin/profiles/${p.id}/reject`,

          rejectBody: { reason: "Não atende aos critérios" },

          approveDisabled: !p.readyForReview,

          forceApprovePath: `/v1/admin/profiles/${p.id}/approve`,

        }))}

        onAction={load}

      />



      <ModerationSection

        title="Vídeos pendentes"

        empty="Nenhum vídeo aguardando moderação."

        items={videos.map((v) => ({

          id: v.id,

          title: v.title,

          subtitle: `${v.profileName} · ${new Date(v.createdAt).toLocaleDateString("pt-BR")}`,

          profileHref: `/admin/perfis/${v.profileId}`,

          approvePath: `/v1/admin/videos/${v.id}/approve`,

          rejectPath: `/v1/admin/videos/${v.id}/reject`,

        }))}

        onAction={load}
        batchType="videos"
      />

      <ModerationSection
        title="Momentos pendentes"
        empty="Nenhum momento aguardando moderação."

        items={moments.map((m) => ({

          id: m.id,

          title: m.caption || "Momento sem legenda",

          subtitle: `${m.profileName} · ${m.mediaType} · ${new Date(m.createdAt).toLocaleDateString("pt-BR")}`,

          profileHref: `/admin/perfis/${m.profileId}`,

          approvePath: `/v1/admin/moments/${m.id}/approve`,

          rejectPath: `/v1/admin/moments/${m.id}/reject`,

        }))}

        onAction={load}
        batchType="moments"
      />

      <ModerationSection
        title="Comentários pendentes"
        empty="Nenhum comentário aguardando moderação."

        items={comments.map((c) => ({

          id: c.id,

          title: c.authorName,

          subtitle: `${c.targetType} · ${new Date(c.createdAt).toLocaleDateString("pt-BR")}`,

          body: c.content,

          profileHref: `/admin/perfis/${c.profileId}`,

          approvePath: `/v1/admin/comments/${c.id}/approve`,

          rejectPath: `/v1/admin/comments/${c.id}/reject`,

        }))}

        onAction={load}
        batchType="comments"
      />

      <ModerationSection
        title="Avaliações pendentes"
        empty="Nenhuma avaliação aguardando moderação."

        items={reviews.map((r) => ({

          id: r.id,

          title: `${r.authorName} — ${r.rating}★`,

          subtitle: new Date(r.createdAt).toLocaleDateString("pt-BR"),

          body: r.comment,

          profileHref: `/admin/perfis/${r.profileId}`,

          approvePath: `/v1/admin/reviews/${r.id}/approve`,

          rejectPath: `/v1/admin/reviews/${r.id}/reject`,

        }))}

        onAction={load}
        batchType="reviews"
      />

      <VerificationSection profiles={approved} onAction={load} />

    </>

  );

}



function ModerationSection({
  title,
  empty,
  items,
  onAction,
  batchType,
}: {
  title: string;
  empty: string;
  items: Array<{

    id: string;

    title: string;

    subtitle: string;

    body?: string | null;

    profileHref?: string;

    approvePath: string;

    rejectPath: string;

    rejectBody?: object;

    approveDisabled?: boolean;

    forceApprovePath?: string;

  }>;

  onAction: () => void;
  batchType?: "comments" | "reviews" | "moments" | "videos";
}) {
  async function batchAction(action: "approve" | "reject") {
    if (!batchType || items.length === 0) return;
    await apiFetch("/v1/admin/moderation/batch", {
      method: "POST",
      body: JSON.stringify({
        type: batchType,
        ids: items.map((i) => i.id),
        action,
      }),
    });
    onAction();
  }

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
        {batchType && items.length > 1 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void batchAction("approve")}
              className="rounded-xl bg-success px-3 py-1.5 text-xs font-medium text-white"
            >
              Aprovar todos ({items.length})
            </button>
            <button
              type="button"
              onClick={() => void batchAction("reject")}
              className="rounded-xl border border-border-subtle px-3 py-1.5 text-xs text-text-secondary"
            >
              Rejeitar todos
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (

        <p className="mt-4 text-text-secondary">{empty}</p>

      ) : (

        <div className="mt-4 space-y-4">

          {items.map((item) => (

            <div

              key={item.id}

              className="flex flex-col gap-4 rounded-2xl border border-border-subtle bg-bg-secondary p-5 lg:flex-row lg:items-start lg:justify-between"

            >

              <div className="min-w-0 flex-1">

                <h3 className="font-semibold text-text-primary">{item.title}</h3>

                <p className="text-sm text-text-secondary">{item.subtitle}</p>

                {item.body && (

                  <p className="mt-2 whitespace-pre-line text-sm text-text-muted line-clamp-4">

                    {item.body}

                  </p>

                )}

                {item.profileHref && (

                  <Link

                    href={item.profileHref}

                    className="mt-3 inline-block text-sm text-purple-light hover:underline"

                  >

                    Abrir perfil completo →

                  </Link>

                )}

              </div>

              <div className="flex flex-wrap gap-2">

                <button

                  type="button"

                  onClick={async () => {

                    await apiFetch(item.approvePath, { method: "PATCH" });

                    onAction();

                  }}

                  disabled={item.approveDisabled}

                  className="rounded-xl bg-success px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"

                >

                  Aprovar

                </button>

                {item.approveDisabled && item.forceApprovePath && (

                  <button

                    type="button"

                    onClick={async () => {

                      await apiFetch(item.forceApprovePath!, {

                        method: "PATCH",

                        body: JSON.stringify({ force: true }),

                      });

                      onAction();

                    }}

                    className="rounded-xl border border-gold/40 px-4 py-2 text-sm text-gold hover:bg-gold/10"

                  >

                    Aprovar mesmo incompleto

                  </button>

                )}

                <button

                  type="button"

                  onClick={async () => {

                    await apiFetch(item.rejectPath, {

                      method: "PATCH",

                      body: item.rejectBody ? JSON.stringify(item.rejectBody) : undefined,

                    });

                    onAction();

                  }}

                  className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary"

                >

                  Rejeitar

                </button>

              </div>

            </div>

          ))}

        </div>

      )}

    </section>

  );

}



function VerificationSection({

  profiles,

  onAction,

}: {

  profiles: ApprovedProfile[];

  onAction: () => void;

}) {

  return (

    <section className="mt-10">

      <h2 className="text-xl font-semibold text-text-primary">Verificação de perfis</h2>

      <p className="mt-1 text-sm text-text-secondary">

        Perfis aprovados — conceda ou remova o selo verificado.

      </p>

      {profiles.length === 0 ? (

        <p className="mt-4 text-text-secondary">Nenhum perfil aprovado.</p>

      ) : (

        <div className="mt-4 space-y-3">

          {profiles.map((p) => (

            <div

              key={p.id}

              className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-bg-secondary p-4 sm:flex-row sm:items-center sm:justify-between"

            >

              <div>

                <div className="flex flex-wrap items-center gap-2">

                  <h3 className="font-medium text-text-primary">{p.displayName}</h3>

                  {p.isVerified && (

                    <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-bold uppercase text-success">

                      Verificado

                    </span>

                  )}

                </div>

                <p className="text-sm text-text-muted">

                  {p.city}, {p.state} · /{p.slug}

                </p>

              </div>

              <div className="flex flex-wrap gap-2">

                <Link

                  href={`/admin/perfis/${p.id}`}

                  className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary"

                >

                  Editar perfil

                </Link>

                <button

                  type="button"

                  onClick={async () => {

                    await apiFetch(`/v1/admin/profiles/${p.id}/verification`, {

                      method: "PATCH",

                      body: JSON.stringify({ isVerified: !p.isVerified }),

                    });

                    onAction();

                  }}

                  className={`rounded-xl px-4 py-2 text-sm font-medium ${

                    p.isVerified

                      ? "border border-border-subtle text-text-secondary hover:text-text-primary"

                      : "bg-success text-white hover:opacity-90"

                  }`}

                >

                  {p.isVerified ? "Remover verificação" : "Verificar"}

                </button>

              </div>

            </div>

          ))}

        </div>

      )}

    </section>

  );

}

