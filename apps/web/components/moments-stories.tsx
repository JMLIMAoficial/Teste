"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MomentItem } from "@/lib/api";
import { getVisitorId, trackMomentView } from "@/lib/moment-upload";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const INITIAL_COMMENTS_VISIBLE = 2;

type CommentItem = {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
};

type MomentsFeedProps = {
  moments: MomentItem[];
  variant?: "page" | "embedded";
  initialIndex?: number;
  className?: string;
};

export function MomentsFeed({
  moments,
  variant = "embedded",
  initialIndex = 0,
  className = "",
}: MomentsFeedProps) {
  const [index, setIndex] = useState(initialIndex);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [showAllComments, setShowAllComments] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [commentText, setCommentText] = useState("");
  const [commentMessage, setCommentMessage] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const didSwipe = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const commentsCacheRef = useRef<Map<string, CommentItem[]>>(new Map());

  const moment = moments[index];
  const isVideo = !!moment && (moment.mediaType === "video" || moment.mimeType.startsWith("video/"));
  const isPage = variant === "page";

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(moments.length - 1, i + 1));
    setShowAllComments(false);
    resetDrag();
  }, [moments.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
    setShowAllComments(false);
    resetDrag();
  }, []);

  function resetDrag() {
    if (trackRef.current) {
      trackRef.current.style.transform = "";
      trackRef.current.style.transitionDuration = "";
    }
  }

  function setDragOffset(dx: number) {
    if (!trackRef.current) return;
    trackRef.current.style.transform = `translateX(${dx}px)`;
    trackRef.current.style.transitionDuration = dx !== 0 ? "0ms" : "200ms";
  }

  useEffect(() => {
    if (!moment) return;
    setLiked(false);
    setLikes(moment.likeCount);
    setCommentMessage("");
    setShowAllComments(false);
    trackMomentView(moment.id);
  }, [moment?.id, moment?.likeCount]);

  useEffect(() => {
    if (!moment) return;

    const cached = commentsCacheRef.current.get(moment.id);
    if (cached) {
      setComments(cached);
      setLoadingComments(false);
      return;
    }

    let cancelled = false;
    setLoadingComments(true);

    fetch(`${API_URL}/api/v1/comments/moment/${moment.id}`)
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((json) => {
        const data = (json.data ?? []) as CommentItem[];
        commentsCacheRef.current.set(moment.id, data);
        if (!cancelled) setComments(data);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingComments(false);
      });

    return () => {
      cancelled = true;
    };
  }, [moment?.id]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") goNext();
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") goPrev();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev]);

  async function toggleLike() {
    if (!moment) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/likes/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "moment",
          targetId: moment.id,
          visitorId: getVisitorId(),
        }),
      });
      if (!res.ok) return;
      const json = await res.json();
      setLiked(json.liked);
      setLikes((n) => (json.liked ? n + 1 : Math.max(0, n - 1)));
    } catch {
      /* ignore */
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!moment) return;
    setCommentMessage("");

    try {
      const res = await fetch(`${API_URL}/api/v1/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "moment",
          targetId: moment.id,
          ...(authorName.trim() ? { authorName: authorName.trim() } : {}),
          content: commentText,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Erro ao enviar");
      if (json.data) {
        setComments((prev) => [json.data as CommentItem, ...prev]);
      }
      setCommentMessage(json.message ?? "Comentário publicado.");
      setCommentText("");
    } catch (err) {
      setCommentMessage(err instanceof Error ? err.message : "Erro ao enviar comentário");
    }
  }

  function handleTap(e: React.MouseEvent<HTMLDivElement>) {
    if (didSwipe.current) {
      didSwipe.current = false;
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    if (ratio < 0.25) goPrev();
    else if (ratio > 0.75) goNext();
  }

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    if (!t) return;
    touchStart.current = { x: t.clientX, y: t.clientY };
    didSwipe.current = false;
    resetDrag();
  }

  function handleTouchMove(e: React.TouchEvent) {
    const start = touchStart.current;
    const t = e.touches[0];
    if (!start || !t) return;

    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
      didSwipe.current = true;
      setDragOffset(dx);
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    const t = e.changedTouches[0];
    touchStart.current = null;
    if (!start || !t) return;

    const dx = t.clientX - start.x;
    const threshold = 50;

    if (Math.abs(dx) >= threshold) {
      didSwipe.current = true;
      resetDrag();
      if (dx < 0) goNext();
      else goPrev();
    } else {
      resetDrag();
    }
  }

  if (moments.length === 0 || !moment) return null;

  const shellClass = isPage
    ? "mx-auto flex min-h-[calc(100dvh-12rem)] w-full max-w-lg flex-col"
    : "mx-auto flex w-full max-w-lg flex-col";

  const mediaHeight = isPage ? "min-h-[calc(100dvh-12rem)]" : "aspect-[9/16] max-h-[70vh]";
  const visibleComments = showAllComments
    ? comments
    : comments.slice(0, INITIAL_COMMENTS_VISIBLE);
  const hiddenCommentsCount = Math.max(0, comments.length - INITIAL_COMMENTS_VISIBLE);

  return (
    <div className={`${shellClass} ${className}`}>
      <div className="mb-3 flex items-center justify-between px-1 text-xs text-text-muted">
        <span>
          {index + 1} / {moments.length}
        </span>
        {!isPage && (
          <Link href="/momentos" className="text-purple-light hover:text-gold">
            Ver todos
          </Link>
        )}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-black">
        <div
          className={`relative ${mediaHeight} w-full touch-pan-y select-none overflow-hidden bg-black`}
          onClick={handleTap}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            ref={trackRef}
            className="flex h-full w-full transition-transform duration-200 ease-out"
          >
          {moment && isVideo ? (
            <video
              key={moment.id}
              src={moment.url}
              className="h-full w-full shrink-0 object-contain"
              controls
              playsInline
              autoPlay
              muted
              loop={moments.length === 1}
            />
          ) : moment ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={moment.id}
              src={moment.url}
              alt=""
              decoding="async"
              className="h-full w-full shrink-0 object-contain"
              draggable={false}
            />
          ) : null}
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 to-transparent" />

          <div className="absolute left-3 top-3 z-10">
            <Link
              href={`/perfil/${moment.profileSlug}`}
              className="flex items-center gap-2 rounded-full bg-black/60 px-2 py-1 pr-3 md:bg-black/40 md:backdrop-blur-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-8 w-8 overflow-hidden rounded-full border border-white/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={moment.url} alt="" decoding="async" loading="lazy" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{moment.profileName}</p>
                {moment.city && <p className="truncate text-[10px] text-white/70">{moment.city}</p>}
              </div>
            </Link>
          </div>

          <div className="absolute bottom-3 left-3 right-16 z-10">
            {moment.caption && (
              <p className="line-clamp-3 text-sm leading-snug text-white">{moment.caption}</p>
            )}
            <p className="mt-1 text-[10px] text-white/50">{moment.viewCount} visualizações</p>
          </div>

          <div className="absolute bottom-3 right-3 z-10 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleLike();
              }}
              className={`flex flex-col items-center gap-0.5 rounded-2xl px-2 py-2 transition ${
                liked ? "scale-110" : "hover:bg-white/10"
              }`}
              aria-label="Curtir"
            >
              <span
                className={`text-2xl ${liked ? "animate-pulse drop-shadow-[0_0_8px_rgba(245,158,11,0.9)]" : ""}`}
              >
                🔥
              </span>
              <span className="text-[11px] font-semibold text-white">{likes}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowAllComments(true);
              }}
              className="flex flex-col items-center gap-0.5 rounded-2xl px-2 py-2 hover:bg-white/10"
              aria-label="Comentários"
            >
              <span className="text-2xl">💬</span>
              <span className="text-[11px] font-semibold text-white">{comments.length}</span>
            </button>
          </div>
        </div>

        <section className="border-t border-border-subtle bg-bg-secondary p-4">
          <h3 className="text-sm font-semibold text-text-primary">
            Comentários {comments.length > 0 && `(${comments.length})`}
          </h3>

          {loadingComments ? (
            <p className="mt-3 text-sm text-text-muted">Carregando comentários...</p>
          ) : comments.length === 0 ? (
            <p className="mt-3 text-sm text-text-muted">Nenhum comentário ainda. Seja o primeiro!</p>
          ) : (
            <div className="mt-3 space-y-2">
              {visibleComments.map((c) => (
                <div key={c.id} className="rounded-xl bg-bg-tertiary px-3 py-2.5">
                  <p className="text-sm font-medium text-text-primary">{c.authorName}</p>
                  <p className="mt-0.5 text-sm leading-snug text-text-secondary">{c.content}</p>
                </div>
              ))}

              {!showAllComments && hiddenCommentsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllComments(true)}
                  className="w-full rounded-xl border border-border-subtle py-2 text-sm font-medium text-purple-light transition hover:border-purple-deep/40 hover:text-gold"
                >
                  Ver mais ({hiddenCommentsCount})
                </button>
              )}

              {showAllComments && hiddenCommentsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllComments(false)}
                  className="w-full py-1 text-sm text-text-muted hover:text-text-secondary"
                >
                  Ver menos
                </button>
              )}
            </div>
          )}

          {commentMessage && (
            <p className="mt-3 rounded-lg bg-purple-deep/20 px-3 py-2 text-xs text-purple-light">
              {commentMessage}
            </p>
          )}

          <form onSubmit={submitComment} className="mt-4 space-y-2 border-t border-border-subtle pt-4">
            <input
              type="text"
              placeholder="Seu nome (opcional)"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-3 py-2 text-sm text-text-primary"
            />
            <textarea
              placeholder="Escreva um comentário..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              required
              rows={2}
              className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-3 py-2 text-sm text-text-primary"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-purple-deep py-2 text-sm font-medium text-white hover:bg-purple-light"
            >
              Comentar
            </button>
          </form>
        </section>
      </div>

      <p className="mt-3 text-center text-xs text-text-muted">
        Arraste a foto com o dedo ← → para passar
      </p>
    </div>
  );
}

/** @deprecated use MomentsFeed */
export const MomentsStories = MomentsFeed;
