"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/auth";

type Conversation = {
  id: string;
  subject: string;
  status: string;
  profileName?: string;
  profileSlug?: string;
  lastMessage: { body: string; createdAt: string } | null;
  updatedAt: string;
};

type ConversationDetail = Conversation & {
  messages: Array<{ id: string; body: string; senderType: string; createdAt: string }>;
};

export default function AdminMensagensPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<ConversationDetail | null>(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await apiFetch<{ data: Conversation[] }>("/v1/admin/conversations");
      setConversations(data.data);
    } finally {
      setLoading(false);
    }
  }

  async function openConversation(id: string) {
    const data = await apiFetch<ConversationDetail>(`/v1/admin/conversations/${id}`);
    setSelected(data);
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const data = await apiFetch<ConversationDetail>(
      `/v1/admin/conversations/${selected.id}/reply`,
      { method: "POST", body: JSON.stringify({ body: reply }) },
    );
    setReply("");
    setSelected(data);
    await load();
  }

  async function closeConversation() {
    if (!selected) return;
    await apiFetch(`/v1/admin/conversations/${selected.id}/close`, { method: "PATCH" });
    await load();
    await openConversation(selected.id);
  }

  if (loading) return <p className="text-text-secondary">Carregando...</p>;

  return (
    <>
      <h1 className="text-2xl font-bold text-text-primary">Mensagens</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Responda acompanhantes e acompanhe conversas abertas.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="space-y-2">
          {conversations.length === 0 && (
            <p className="text-text-muted">Nenhuma conversa recebida.</p>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => openConversation(c.id)}
              className={`w-full rounded-2xl border p-4 text-left ${
                selected?.id === c.id
                  ? "border-purple-deep bg-purple-deep/10"
                  : "border-border-subtle bg-bg-secondary hover:border-purple-deep/30"
              }`}
            >
              <p className="font-medium text-text-primary">{c.subject}</p>
              <p className="text-sm text-text-secondary">{c.profileName}</p>
              <p className="text-xs text-text-muted">
                {c.status} · {new Date(c.updatedAt).toLocaleDateString("pt-BR")}
              </p>
            </button>
          ))}
        </section>

        <section className="rounded-2xl border border-border-subtle bg-bg-secondary p-6">
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-text-primary">{selected.subject}</h2>
                  <p className="text-sm text-text-secondary">{selected.profileName}</p>
                  {selected.profileSlug && (
                    <Link
                      href={`/perfil/${selected.profileSlug}`}
                      className="text-xs text-purple-light hover:underline"
                    >
                      Ver perfil público
                    </Link>
                  )}
                </div>
                {selected.status !== "closed" && (
                  <button
                    onClick={closeConversation}
                    className="rounded-lg border border-border-subtle px-3 py-1 text-xs text-text-muted hover:text-text-primary"
                  >
                    Encerrar
                  </button>
                )}
              </div>
              <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">
                {selected.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-xl p-3 text-sm ${
                      m.senderType === "admin" ? "ml-4 bg-purple-deep/20" : "mr-4 bg-bg-tertiary"
                    }`}
                  >
                    <p className="mb-1 text-xs text-text-muted">
                      {m.senderType === "admin" ? "Admin" : "Acompanhante"} ·{" "}
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
                    placeholder="Sua resposta..."
                    required
                    className="flex-1 rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-2 text-sm"
                  />
                  <button type="submit" className="rounded-xl bg-success px-4 py-2 text-sm text-white">
                    Responder
                  </button>
                </form>
              )}
            </>
          ) : (
            <p className="text-sm text-text-muted">Selecione uma conversa.</p>
          )}
        </section>
      </div>
    </>
  );
}
