"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PainelShell } from "@/components/painel-shell";
import { apiFetch, getAccessToken, logout } from "@/lib/auth";

type Notification = {
  id: string;
  title: string;
  message: string;
  status: string;
  actionUrl: string | null;
  createdAt: string;
};

export default function PainelNotificacoesPage() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: Notification[] }>("/v1/notifications");
      setItems(res.data);
    } catch {
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    void load();
  }, [load, router]);

  async function markRead(id: string) {
    await apiFetch(`/v1/notifications/${id}/read`, { method: "PATCH" });
    await load();
  }

  async function markAllRead() {
    await apiFetch("/v1/notifications/read-all", { method: "PATCH" });
    await load();
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary text-text-secondary">
        Carregando...
      </div>
    );
  }

  return (
    <PainelShell onLogout={handleLogout}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Notificações</h1>
          <p className="mt-1 text-sm text-text-secondary">Histórico de avisos da plataforma</p>
        </div>
        {items.some((n) => n.status === "unread") && (
          <button
            type="button"
            onClick={markAllRead}
            className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-purple-light hover:border-purple-deep/40"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-border-subtle bg-bg-secondary p-8 text-center text-text-secondary">
          Nenhuma notificação ainda.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-2xl border border-border-subtle p-4 ${
                n.status === "unread" ? "bg-purple-deep/5" : "bg-bg-secondary"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-text-primary">{n.title}</p>
                  <p className="mt-1 text-sm text-text-secondary">{n.message}</p>
                  <p className="mt-2 text-xs text-text-muted">
                    {new Date(n.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex gap-2">
                  {n.actionUrl && (
                    <Link
                      href={n.actionUrl.replace(/^https?:\/\/[^/]+/, "")}
                      onClick={() => void markRead(n.id)}
                      className="text-sm text-purple-light hover:underline"
                    >
                      Abrir
                    </Link>
                  )}
                  {n.status === "unread" && (
                    <button
                      type="button"
                      onClick={() => void markRead(n.id)}
                      className="text-sm text-text-muted hover:text-text-primary"
                    >
                      Marcar lida
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PainelShell>
  );
}
