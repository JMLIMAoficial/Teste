"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { apiFetch, getAccessToken } from "@/lib/auth";

type ReportItem = {
  id: string;
  targetType: string;
  targetId: string;
  profileId: string | null;
  profileName: string | null;
  profileSlug: string | null;
  reason: string;
  description: string | null;
  createdAt: string;
};

export default function AdminDenunciasPage() {
  const router = useRouter();
  const [items, setItems] = useState<ReportItem[]>([]);
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
      const res = await apiFetch<{ data: ReportItem[]; total: number }>(
        "/v1/admin/reports/pending",
      );
      setItems(res.data);
    } catch {
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  async function resolve(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/v1/admin/reports/${id}/resolve`, {
        method: "PATCH",
        body: JSON.stringify({ resolution: "Tratada pela moderação" }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function dismiss(id: string) {
    setBusyId(id);
    try {
      await apiFetch(`/v1/admin/reports/${id}/dismiss`, {
        method: "PATCH",
        body: JSON.stringify({ resolution: "Arquivada sem ação" }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AdminShell>
      <h1 className="text-2xl font-bold text-text-primary">Denúncias</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Fila de denúncias enviadas por visitantes.
      </p>

      {loading ? (
        <p className="mt-8 text-text-muted">Carregando...</p>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border-subtle bg-bg-secondary p-8 text-center text-text-secondary">
          Nenhuma denúncia pendente.
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
                  <p className="font-semibold capitalize text-text-primary">
                    {item.targetType} · {item.reason}
                  </p>
                  {item.profileName && (
                    <p className="text-sm text-text-secondary">
                      Perfil: {item.profileName}
                      {item.profileId && (
                        <>
                          {" · "}
                          <Link
                            href={`/admin/perfis/${item.profileId}`}
                            className="text-purple-light hover:underline"
                          >
                            Ver no admin
                          </Link>
                        </>
                      )}
                    </p>
                  )}
                  {item.description && (
                    <p className="mt-2 text-sm text-text-muted">{item.description}</p>
                  )}
                  <p className="mt-2 text-xs text-text-muted">
                    {new Date(item.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void resolve(item.id)}
                    className="rounded-xl bg-success px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    Resolver
                  </button>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => void dismiss(item.id)}
                    className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-text-secondary"
                  >
                    Arquivar
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
