"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const REASONS = [
  { value: "fake", label: "Perfil falso ou enganoso" },
  { value: "inappropriate", label: "Conteúdo impróprio" },
  { value: "spam", label: "Spam ou propaganda" },
  { value: "harassment", label: "Assédio ou ameaça" },
  { value: "other", label: "Outro" },
] as const;

export function ReportContentModal({
  targetType,
  targetId,
  profileId,
  label = "Denunciar",
}: {
  targetType: "profile" | "comment" | "moment" | "review";
  targetId: string;
  profileId?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]["value"]>("inappropriate");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`${API_URL}/api/v1/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          profileId,
          reason,
          description: description.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Erro ao enviar");
      }
      setMessage("Denúncia registrada. Obrigado.");
      setDescription("");
      setTimeout(() => setOpen(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-text-muted underline-offset-2 hover:text-red-400 hover:underline"
      >
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/80 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-labelledby="report-title"
            className="w-full max-w-md rounded-2xl border border-border-subtle bg-bg-secondary p-6 shadow-xl"
          >
            <h2 id="report-title" className="text-lg font-semibold text-text-primary">
              Denunciar conteúdo
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Sua denúncia será analisada pela equipe de moderação.
            </p>
            <form onSubmit={submit} className="mt-4 space-y-4">
              <label className="block text-sm text-text-secondary">
                Motivo
                <select
                  value={reason}
                  onChange={(e) =>
                    setReason(e.target.value as (typeof REASONS)[number]["value"])
                  }
                  className="mt-1 w-full rounded-xl border border-border-subtle bg-bg-tertiary px-3 py-2 text-text-primary"
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-text-secondary">
                Detalhes (opcional)
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-border-subtle bg-bg-tertiary px-3 py-2 text-text-primary"
                />
              </label>
              {message && <p className="text-sm text-success">{message}</p>}
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-xl border border-border-subtle py-2.5 text-sm text-text-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {loading ? "Enviando..." : "Enviar denúncia"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
