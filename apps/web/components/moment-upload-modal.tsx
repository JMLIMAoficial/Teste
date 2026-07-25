"use client";

import { useRef, useState } from "react";
import { uploadCompanionMoment } from "@/lib/moment-upload";

type MomentUploadModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function MomentUploadModal({ open, onClose, onSuccess }: MomentUploadModalProps) {
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function reset() {
    setCaption("");
    setFile(null);
    setPreview(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFileChange(selected: File | null) {
    setFile(selected);
    setError("");
    if (preview) URL.revokeObjectURL(preview);
    if (selected && selected.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(selected));
    } else {
      setPreview(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Selecione uma foto ou vídeo.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      await uploadCompanionMoment(file, caption);
      reset();
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar momento");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        className="absolute inset-0"
        onClick={handleClose}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-border-subtle bg-bg-secondary p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-text-primary">Publicar momento</h2>
        <p className="mt-1 text-sm text-text-muted">
          Fotos chamam mais atenção no feed. Seu momento fica público assim que for enviado.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-purple-deep/40 bg-purple-deep/5 px-4 py-8 text-center transition-colors hover:bg-purple-deep/10">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="mb-3 max-h-40 rounded-xl object-cover" />
            ) : (
              <span className="mb-2 text-3xl">📸</span>
            )}
            <span className="text-sm font-medium text-purple-light">
              {file ? file.name : "Toque para escolher foto ou vídeo"}
            </span>
            <span className="mt-1 text-xs text-text-muted">JPG, PNG, WebP, MP4 · até 30MB</span>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
          </label>

          <label className="block text-sm">
            <span className="text-text-secondary">Legenda (opcional)</span>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Conte algo sobre este momento..."
              className="mt-1 w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-text-primary focus:border-purple-deep focus:outline-none"
            />
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-xl border border-border-subtle px-4 py-3 text-sm text-text-secondary hover:text-text-primary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="flex-1 rounded-xl bg-purple-deep px-4 py-3 text-sm font-medium text-white hover:bg-purple-light disabled:opacity-50"
            >
              {uploading ? "Enviando..." : "Publicar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
