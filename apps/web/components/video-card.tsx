"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { VideoItem } from "@/lib/api";

export function VideoCard({
  video,
  linkToProfile = false,
}: {
  video: VideoItem;
  /** Na galeria geral, opcionalmente mostra link para o perfil no modal. */
  linkToProfile?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isVideo = !video.mimeType || video.mimeType.startsWith("video/");

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group block w-full overflow-hidden rounded-2xl border border-border-subtle bg-bg-secondary text-left transition-all hover:border-purple-deep/30"
        aria-label={`Reproduzir ${video.title}`}
      >
        <div className="relative aspect-video overflow-hidden bg-bg-tertiary">
          {isVideo ? (
            <video
              src={video.url}
              className="h-full w-full object-cover"
              muted
              playsInline
              preload="metadata"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-purple-900/60 to-orange-900/40">
              <span className="text-4xl text-text-muted">▶</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/80 via-transparent to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-primary/80 text-lg text-text-primary shadow-lg transition group-hover:scale-105">
              ▶
            </span>
          </div>
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="line-clamp-1 font-semibold text-text-primary">{video.title}</h3>
            <p className="text-xs text-text-secondary">
              {video.profileName}
              {video.city ? ` · ${video.city}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-4 px-4 py-2 text-xs text-text-muted">
          <span>{video.viewCount} views</span>
          <span>{video.likeCount} curtidas</span>
        </div>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={video.title}
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-border-subtle bg-bg-secondary shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border-subtle px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-text-primary">{video.title}</p>
                <p className="text-xs text-text-muted">
                  {video.profileName}
                  {video.city ? ` · ${video.city}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-lg px-2 py-1 text-sm text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
              >
                Fechar
              </button>
            </div>
            <div className="bg-black">
              {isVideo ? (
                <video
                  src={video.url}
                  className="max-h-[min(70vh,720px)] w-full"
                  controls
                  autoPlay
                  playsInline
                />
              ) : (
                <div className="flex aspect-video items-center justify-center text-text-muted">
                  Vídeo indisponível
                </div>
              )}
            </div>
            {linkToProfile && video.profileSlug && (
              <div className="border-t border-border-subtle px-4 py-3">
                <Link
                  href={`/perfil/${video.profileSlug}`}
                  className="text-sm text-purple-light hover:underline"
                >
                  Ver perfil →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
