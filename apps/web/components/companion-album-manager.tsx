"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, clearAccessToken, fetchMe, getAccessToken } from "@/lib/auth";
import { toastToneFromMessage, useToast } from "@/components/toast";

type Photo = {
  id: string;
  url: string;
  thumbUrl?: string | null;
  isCover: boolean;
  isProfile?: boolean;
  sortOrder?: number;
  status?: string;
};

type Profile = {
  status: string;
  isPublic?: boolean;
  photos: Photo[];
};

export function CompanionAlbumManager() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState<string | null>(null);

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
      const data = await apiFetch<Profile>("/v1/companion/profile");
      setProfile(data);
    } catch {
      clearAccessToken();
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  function albumPhotos() {
    return [...(profile?.photos ?? [])]
      .filter((p) => !p.isProfile && !p.isCover)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  async function uploadOnePhoto(file: File) {
    const form = new FormData();
    form.append("file", file);
    form.append("role", "album");
    const token = getAccessToken();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1/companion/photos`,
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
        credentials: "include",
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message = Array.isArray(err.message)
        ? err.message.join(". ")
        : (err.message ?? "Falha no upload");
      throw new Error(message);
    }
  }

  async function uploadPhotos(files: File[]) {
    const list = files.filter(
      (f) =>
        f.type.startsWith("image/") ||
        /\.(jpe?g|png|webp)$/i.test(f.name),
    );
    if (list.length === 0) {
      notify("Selecione ao menos uma imagem válida (JPEG, PNG ou WebP).", "error");
      return;
    }

    const remainingSlots = Math.max(0, 20 - (profile?.photos.length ?? 0));
    if (remainingSlots === 0) {
      notify("Limite de 20 fotos atingido.", "error");
      return;
    }
    const toUpload = list.slice(0, remainingSlots);
    if (list.length > remainingSlots) {
      notify(`Limite de 20 fotos: enviando ${toUpload.length} de ${list.length}.`, "info");
    }

    setUploading(true);
    let ok = 0;
    const errors: string[] = [];

    try {
      for (let i = 0; i < toUpload.length; i++) {
        const file = toUpload[i];
        setUploadProgress(`Enviando ${i + 1} de ${toUpload.length}…`);
        try {
          await uploadOnePhoto(file);
          ok += 1;
        } catch (err) {
          errors.push(
            `${file.name}: ${err instanceof Error ? err.message : "erro"}`,
          );
        }
      }
      await load();
      if (ok > 0 && errors.length === 0) {
        notify(
          ok === 1 ? "Foto adicionada ao álbum!" : `${ok} fotos adicionadas ao álbum!`,
          "success",
        );
      } else if (ok > 0) {
        notify(`${ok} enviada(s), ${errors.length} falhou/falharam.`, "info");
      } else {
        notify(errors[0] ?? "Erro no upload", "error");
      }
    } finally {
      setUploadProgress(null);
      setUploading(false);
    }
  }

  async function movePhoto(photoId: string, direction: -1 | 1) {
    const album = albumPhotos();
    const index = album.findIndex((p) => p.id === photoId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= album.length) return;

    const nextAlbum = [...album];
    [nextAlbum[index], nextAlbum[target]] = [nextAlbum[target], nextAlbum[index]];

    const featured = [...(profile?.photos ?? [])]
      .filter((p) => p.isProfile || p.isCover)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const photoIds = [...featured.map((p) => p.id), ...nextAlbum.map((p) => p.id)];

    setPhotoBusy(photoId);
    try {
      await apiFetch("/v1/companion/photos/reorder", {
        method: "PATCH",
        body: JSON.stringify({ photoIds }),
      });
      await load();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erro ao reordenar fotos", "error");
    } finally {
      setPhotoBusy(null);
    }
  }

  async function deletePhoto(photoId: string) {
    if (!confirm("Excluir esta foto?")) return;
    setPhotoBusy(photoId);
    try {
      await apiFetch(`/v1/companion/photos/${photoId}`, { method: "DELETE" });
      await load();
      notify("Foto excluída.", "success");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erro ao excluir", "error");
    } finally {
      setPhotoBusy(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-text-muted">Carregando álbum...</p>;
  }

  const album = albumPhotos();

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Fotos</h1>
      <p className="mt-1 text-sm text-text-muted">
        Álbum da galeria pública. A foto principal fica em{" "}
        <Link href="/painel/perfil#fotos-principais" className="text-purple-light hover:underline">
          Editar perfil
        </Link>
        .
        {profile?.status !== "approved" || !profile?.isPublic ? (
          <> A visibilidade na busca depende da moderação do perfil.</>
        ) : null}
      </p>

      <section className="mt-6 rounded-2xl border border-border-subtle bg-bg-secondary p-6">
        <label className="inline-flex cursor-pointer rounded-xl border border-dashed border-border-subtle px-6 py-4 text-sm text-text-secondary hover:border-purple-deep">
          {uploading ? uploadProgress ?? "Enviando..." : "Adicionar fotos ao álbum"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              // Copiar antes de limpar: FileList é live e some ao resetar o value.
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (files.length) void uploadPhotos(files);
            }}
          />
        </label>
        <p className="mt-2 text-xs text-text-muted">
          Você pode selecionar várias imagens de uma vez (JPEG, PNG ou WebP).
        </p>

        {album.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {album.map((photo, index) => (
              <div key={photo.id} className="overflow-hidden rounded-xl border border-border-subtle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.thumbUrl ?? photo.url}
                  alt=""
                  className="aspect-[3/4] w-full object-cover"
                />
                <div className="space-y-2 p-2">
                  <p className="text-center text-xs text-text-muted">Álbum</p>
                  <div className="flex flex-wrap justify-center gap-1">
                    <button
                      type="button"
                      disabled={photoBusy === photo.id || index === 0}
                      onClick={() => movePhoto(photo.id, -1)}
                      className="rounded-lg border border-border-subtle px-2 py-1 text-[10px] text-text-secondary hover:border-purple-deep/40 disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={photoBusy === photo.id || index === album.length - 1}
                      onClick={() => movePhoto(photo.id, 1)}
                      className="rounded-lg border border-border-subtle px-2 py-1 text-[10px] text-text-secondary hover:border-purple-deep/40 disabled:opacity-40"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      disabled={photoBusy === photo.id}
                      onClick={() => deletePhoto(photo.id)}
                      className="rounded-lg border border-red-500/30 px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/10"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-text-muted">
            Nenhuma foto no álbum ainda. A foto principal fica em Editar perfil.
          </p>
        )}
      </section>
    </div>
  );
}
