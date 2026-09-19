"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, clearAccessToken, fetchMe, getAccessToken } from "@/lib/auth";
import { toastToneFromMessage, useToast } from "@/components/toast";

type OwnVideo = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
};

function mediaStatusLabel(status: string) {
  if (status === "approved") return "Publicado";
  if (status === "rejected") return "Rejeitado";
  if (status === "pending") return "Em análise";
  return status;
}

export function CompanionVideosManager() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [ownVideos, setOwnVideos] = useState<OwnVideo[]>([]);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  function notify(message: string, tone?: "success" | "error" | "info") {
    toast(message, tone ?? toastToneFromMessage(message));
  }

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    load();
  }, [router]);

  async function load() {
    try {
      const me = await fetchMe();
      if (me.roles.includes("admin")) {
        router.replace("/admin");
        return;
      }
      const videosRes = await apiFetch<{ data: OwnVideo[] }>("/v1/companion/videos");
      setOwnVideos(videosRes.data ?? []);
    } catch {
      clearAccessToken();
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  async function uploadVideo(file: File) {
    setUploadingVideo(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const token = getAccessToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1/companion/videos`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
          credentials: "include",
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Falha no upload");
      }
      await load();
      notify("Vídeo publicado no perfil.", "success");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erro no upload", "error");
    } finally {
      setUploadingVideo(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-text-muted">Carregando vídeos...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Vídeos</h1>
      <p className="mt-1 text-sm text-text-muted">
        MP4 ou WebM — máx. 50MB. Publicados na hora no seu perfil.
      </p>

      <section className="mt-6 rounded-2xl border border-border-subtle bg-bg-secondary p-6">
        <label className="inline-flex cursor-pointer rounded-xl border border-dashed border-border-subtle px-6 py-4 text-sm text-text-secondary hover:border-purple-deep">
          {uploadingVideo ? "Enviando..." : "Selecionar vídeo"}
          <input
            type="file"
            accept="video/mp4,video/webm"
            className="hidden"
            disabled={uploadingVideo}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) uploadVideo(file);
            }}
          />
        </label>

        {ownVideos.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {ownVideos.map((video) => (
              <li
                key={video.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-sm"
              >
                <span className="text-text-primary">{video.title}</span>
                <span className="text-xs text-text-muted">
                  {mediaStatusLabel(video.status)} ·{" "}
                  {new Date(video.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-text-muted">Nenhum vídeo enviado ainda.</p>
        )}
      </section>
    </div>
  );
}
