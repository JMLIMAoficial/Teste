"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { apiFetch, getAccessToken } from "@/lib/auth";

type PendingBoost = {
  id: string;
  profileId: string;
  type: "premium" | "featured";
  note: string | null;
  createdAt: string;
  displayName: string;
  slug: string;
  city?: string;
  state?: string;
};

export default function AdminPremiumPage() {
  const router = useRouter();
  const [items, setItems] = useState<PendingBoost[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    void load();
  }, [router]);

  async function load() {
    try {
      const res = await apiFetch<{ data: PendingBoost[]; total: number }>(
        "/v1/admin/boost-requests/pending",
      );
      setItems(res.data);
    } catch {
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  async function approve(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/v1/admin/boost-requests/${id}/approve`, {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    const reason = window.prompt("Motivo da recusa (opcional):") ?? undefined;
    setBusyId(id);
    try {
      await apiFetch(`/v1/admin/boost-requests/${id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Premium & Destaque</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Solicitações enviadas pelos acompanhantes. Aprovar ativa o badge no perfil.
          </p>
        </div>
        <Link
          href="/admin/perfis?premium=true"
          className="text-sm text-purple-light hover:underline"
        >
          Ver perfis Premium →
        </Link>
      </div>

      {loading ? (
        <p className="mt-8 text-text-muted">Carregando...</p>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border-subtle bg-bg-secondary p-8 text-center text-text-secondary">
          Nenhuma solicitação pendente.
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-border-subtle bg-bg-secondary p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-text-primary">{item.displayName}</p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        item.type === "premium"
                          ? "bg-gold/20 text-gold"
                          : "bg-purple-deep/20 text-purple-light"
                      }`}
                    >
                      {item.type === "premium" ? "Premium" : "Destaque"}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary">
                    {[item.city, item.state].filter(Boolean).join(", ") || "Localização não informada"}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {new Date(item.createdAt).toLocaleString("pt-BR")}
                  </p>
                  {item.note && (
                    <p className="mt-3 text-sm text-text-secondary">“{item.note}”</p>
                  )}
                  <Link
                    href={`/admin/perfis/${item.profileId}`}
                    className="mt-2 inline-block text-sm text-purple-light hover:underline"
                  >
                    Ver perfil no admin
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void approve(item.id)}
                    className="rounded-xl bg-success px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Aprovar
                  </button>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void reject(item.id)}
                    className="rounded-xl border border-red-500/40 px-4 py-2 text-sm text-red-400 disabled:opacity-50"
                  >
                    Recusar
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminShell>
  );
}
