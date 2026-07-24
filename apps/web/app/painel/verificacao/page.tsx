"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PainelShell } from "@/components/painel-shell";
import { apiFetch, getAccessToken, logout } from "@/lib/auth";

type VerificationStatus = {
  isVerified: boolean;
  canRequest: boolean;
  pendingRequest: { id: string; note: string | null; createdAt: string } | null;
  lastRequest: {
    id: string;
    status: string;
    rejectionReason: string | null;
    createdAt: string;
  } | null;
};

export default function PainelVerificacaoPage() {
  const router = useRouter();
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
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
      const data = await apiFetch<VerificationStatus>("/v1/companion/verification");
      setStatus(data);
    } catch {
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await apiFetch("/v1/companion/verification", {
        method: "POST",
        body: JSON.stringify({ note: note.trim() || undefined }),
      });
      setNote("");
      setMessage("Solicitação enviada. A equipe analisará em breve.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  if (loading || !status) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary text-text-secondary">
        Carregando...
      </div>
    );
  }

  return (
    <PainelShell onLogout={handleLogout}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Verificação</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Solicite o selo verificado após seu perfil ser aprovado pela moderação.
        </p>
      </div>

      {status.isVerified ? (
        <div className="rounded-2xl border border-success/30 bg-success/10 p-6">
          <p className="text-lg font-semibold text-success">Perfil verificado ✓</p>
          <p className="mt-2 text-sm text-text-secondary">
            Seu selo aparece nos cards e na página pública.
          </p>
        </div>
      ) : status.pendingRequest ? (
        <div className="rounded-2xl border border-purple-deep/30 bg-purple-deep/10 p-6">
          <p className="font-semibold text-text-primary">Solicitação em análise</p>
          <p className="mt-2 text-sm text-text-secondary">
            Enviada em {new Date(status.pendingRequest.createdAt).toLocaleString("pt-BR")}.
            Aguarde a resposta da equipe.
          </p>
        </div>
      ) : (
        <>
          {status.lastRequest?.status === "rejected" && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-text-secondary">
              Última solicitação recusada
              {status.lastRequest.rejectionReason
                ? `: ${status.lastRequest.rejectionReason}`
                : "."}{" "}
              Você pode enviar uma nova solicitação.
            </div>
          )}

          {!status.canRequest ? (
            <div className="rounded-2xl border border-border-subtle bg-bg-secondary p-6 text-sm text-text-secondary">
              Seu perfil precisa estar <strong>aprovado</strong> antes de solicitar verificação.{" "}
              <Link href="/painel" className="text-purple-light hover:underline">
                Ver status no painel
              </Link>
            </div>
          ) : (
            <form onSubmit={handleRequest} className="rounded-2xl border border-border-subtle bg-bg-secondary p-6">
              <label className="block text-sm text-text-secondary">
                Mensagem opcional para a equipe
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-text-primary focus:border-purple-deep focus:outline-none"
                  placeholder="Ex.: documentos disponíveis mediante contato..."
                />
              </label>
              {message && <p className="mt-3 text-sm text-success">{message}</p>}
              {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="mt-4 rounded-xl bg-purple-deep px-6 py-3 text-sm font-medium text-white hover:bg-purple-light disabled:opacity-50"
              >
                {submitting ? "Enviando..." : "Solicitar verificação"}
              </button>
            </form>
          )}
        </>
      )}
    </PainelShell>
  );
}
