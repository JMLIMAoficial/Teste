"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, getAccessToken } from "@/lib/auth";

type Notification = {
  id: string;
  title: string;
  message: string;
  status: string;
  actionUrl: string | null;
  createdAt: string;
};

export function NotificationBell({ href = "/painel" }: { href?: string }) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    if (!getAccessToken()) return;
    try {
      const [countRes, listRes] = await Promise.all([
        apiFetch<{ count: number }>("/v1/notifications/unread-count"),
        apiFetch<{ data: Notification[] }>("/v1/notifications"),
      ]);
      setCount(countRes.count);
      setItems(listRes.data.slice(0, 8));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  async function markRead(id: string) {
    await apiFetch(`/v1/notifications/${id}/read`, { method: "PATCH" });
    await load();
  }

  async function markAllRead() {
    await apiFetch("/v1/notifications/read-all", { method: "PATCH" });
    await load();
  }

  if (!getAccessToken()) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        className="relative rounded-lg p-2 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
        aria-label="Notificações"
      >
        <span className="text-lg">🔔</span>
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-purple-deep px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-border-subtle bg-bg-secondary shadow-xl">
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
            <span className="text-sm font-semibold text-text-primary">Notificações</span>
            {count > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-purple-light hover:text-gold"
              >
                Marcar todas
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-4 text-sm text-text-muted">Nenhuma notificação.</p>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-border-subtle px-4 py-3 last:border-0 ${
                    n.status === "unread" ? "bg-purple-deep/5" : ""
                  }`}
                >
                  <p className="text-sm font-medium text-text-primary">{n.title}</p>
                  <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">{n.message}</p>
                  <div className="mt-2 flex gap-2">
                    {n.actionUrl && (
                      <a
                        href={n.actionUrl}
                        className="text-xs text-purple-light hover:underline"
                        onClick={() => markRead(n.id)}
                      >
                        Abrir
                      </a>
                    )}
                    {n.status === "unread" && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="text-xs text-text-muted hover:text-text-primary"
                      >
                        Marcar lida
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-border-subtle p-3 text-center">
            <Link
              href="/painel/notificacoes"
              className="text-xs text-purple-light hover:text-gold"
              onClick={() => setOpen(false)}
            >
              Ver todas
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
