"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PainelShell } from "@/components/painel-shell";
import { apiFetch, clearAccessToken, fetchMe, getAccessToken, logout } from "@/lib/auth";

type Conversation = {
  id: string;
  subject: string;
  status: string;
  lastMessage: { body: string; createdAt: string; senderType: string } | null;
  updatedAt: string;
};

type ConversationDetail = Conversation & {
  messages: Array<{ id: string; body: string; senderType: string; createdAt: string }>;
};

export default function PainelMensagensPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<ConversationDetail | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

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
        router.replace("/admin/mensagens");
        return;
      }
      const data = await apiFetch<{ data: Conversation[] }>("/v1/companion/conversations");
      setConversations(data.data);
    } catch {
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  async function openConversation(id: string) {
    const data = await apiFetch<ConversationDetail>(`/v1/companion/conversations/${id}`);
    setSelected(data);
  }

  async function createConversation(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    try {
      const data = await apiFetch<ConversationDetail>("/v1/companion/conversations", {
        method: "POST",
        body: JSON.stringify({ subject, body }),
      });
      setSubject("");
      setBody("");
      setSelected(data);
      await load();
      setMessage("Mensagem enviada! Aguarde resposta da administração.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro ao enviar");
    }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    try {
      const data = await apiFetch<ConversationDetail>(
        `/v1/companion/conversations/${selected.id}/messages`,
        { method: "POST", body: JSON.stringify({ body: reply }) },
      );
      setReply("");
      setSelected(data);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro ao responder");
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary text-text-secondary">
        Carregando...
      </div>
    );
  }

  return (
    <PainelShell
      onLogout={async () => {
        await logout();
        router.push("/login");
      }}
    >
      <h1 className="text-2xl font-bold text-text-primary">Mensagens</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Entre em contato com a administração da plataforma.
      </p>

      {message && (
          <p className="mt-4 rounded-xl border border-border-subtle bg-bg-secondary p-3 text-sm text-text-secondary">
            {message}
          </p>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-border-subtle bg-bg-secondary p-6">
            <h2 className="font-semibold text-text-primary">Nova conversa</h2>
            <form onSubmit={createConversation} className="mt-4 space-y-3">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Assunto"
                required
                className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-2 text-sm text-text-primary"
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Sua mensagem..."
                required
                rows={4}
                className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-2 text-sm text-text-primary"
              />
              <button
                type="submit"
                className="rounded-xl bg-purple-deep px-4 py-2 text-sm font-medium text-white hover:bg-purple-light"
              >
                Enviar
              </button>
            </form>

            <h3 className="mt-8 font-medium text-text-primary">Histórico</h3>
            <div className="mt-3 space-y-2">
              {conversations.length === 0 && (
                <p className="text-sm text-text-muted">Nenhuma conversa ainda.</p>
              )}
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openConversation(c.id)}
                  className={`w-full rounded-xl border p-3 text-left transition-colors ${
                    selected?.id === c.id
                      ? "border-purple-deep bg-purple-deep/10"
                      : "border-border-subtle hover:border-purple-deep/30"
                  }`}
                >
                  <p className="font-medium text-text-primary">{c.subject}</p>
                  <p className="text-xs text-text-muted">
                    {c.status} · {new Date(c.updatedAt).toLocaleDateString("pt-BR")}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border-subtle bg-bg-secondary p-6">
            {selected ? (
              <>
                <h2 className="font-semibold text-text-primary">{selected.subject}</h2>
                <p className="text-xs text-text-muted">Status: {selected.status}</p>
                <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">
                  {selected.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-xl p-3 text-sm ${
                        m.senderType === "companion"
                          ? "ml-4 bg-purple-deep/20 text-text-primary"
                          : "mr-4 bg-bg-tertiary text-text-secondary"
                      }`}
                    >
                      <p className="text-xs text-text-muted mb-1">
                        {m.senderType === "companion" ? "Você" : "Admin"} ·{" "}
                        {new Date(m.createdAt).toLocaleString("pt-BR")}
                      </p>
                      {m.body}
                    </div>
                  ))}
                </div>
                {selected.status !== "closed" && (
                  <form onSubmit={sendReply} className="mt-4 flex gap-2">
                    <input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Responder..."
                      required
                      className="flex-1 rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-purple-deep px-4 py-2 text-sm text-white"
                    >
                      Enviar
                    </button>
                  </form>
                )}
              </>
            ) : (
              <p className="text-sm text-text-muted">Selecione uma conversa ou crie uma nova.</p>
            )}
          </section>
        </div>
    </PainelShell>
  );
}
