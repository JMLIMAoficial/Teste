"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PainelShell } from "@/components/painel-shell";
import { apiFetch, getAccessToken, logout } from "@/lib/auth";

type DayRow = {
  dayOfWeek: number;
  isAvailable: boolean;
  startTime: string | null;
  endTime: string | null;
};

const DAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function PainelHorariosPage() {
  const router = useRouter();
  const [days, setDays] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      const res = await apiFetch<{ days: DayRow[] }>("/v1/companion/availability");
      setDays(res.days);
    } catch {
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  function updateDay(index: number, patch: Partial<DayRow>) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await apiFetch<{ days: DayRow[] }>("/v1/companion/availability", {
        method: "PATCH",
        body: JSON.stringify({ days }),
      });
      setDays(res.days);
      setMessage("Horários salvos com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Horários</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Informe quando você costuma estar disponível. Visitantes veem isso no perfil público.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {days.map((day, index) => (
          <div
            key={day.dayOfWeek}
            className="flex flex-col gap-3 rounded-2xl border border-border-subtle bg-bg-secondary p-4 sm:flex-row sm:items-center"
          >
            <label className="flex min-w-[140px] items-center gap-2 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={day.isAvailable}
                onChange={(e) =>
                  updateDay(index, {
                    isAvailable: e.target.checked,
                    startTime: e.target.checked ? day.startTime ?? "10:00" : null,
                    endTime: e.target.checked ? day.endTime ?? "22:00" : null,
                  })
                }
              />
              {DAY_LABELS[day.dayOfWeek]}
            </label>
            {day.isAvailable && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="time"
                  value={day.startTime ?? ""}
                  onChange={(e) => updateDay(index, { startTime: e.target.value })}
                  className="rounded-xl border border-border-subtle bg-bg-tertiary px-3 py-2 text-sm text-text-primary"
                />
                <span className="text-text-muted">até</span>
                <input
                  type="time"
                  value={day.endTime ?? ""}
                  onChange={(e) => updateDay(index, { endTime: e.target.value })}
                  className="rounded-xl border border-border-subtle bg-bg-tertiary px-3 py-2 text-sm text-text-primary"
                />
              </div>
            )}
          </div>
        ))}

        {message && <p className="text-sm text-success">{message}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-purple-deep px-6 py-3 text-sm font-medium text-white hover:bg-purple-light disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar horários"}
        </button>
      </form>
    </PainelShell>
  );
}
