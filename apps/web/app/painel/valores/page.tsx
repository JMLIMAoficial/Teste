"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PainelShell } from "@/components/painel-shell";
import { useToast } from "@/components/toast";
import { apiFetch, getAccessToken, logout } from "@/lib/auth";

type PricingData = {
  pricingDisplayMode: "show" | "consult" | "hidden";
  thirtyMin: number | null;
  oneHour: number | null;
  twoHours: number | null;
  overnight: number | null;
  customItems: Array<{ label: string; price: number }>;
};

const inputClass =
  "w-full rounded-xl border border-border-subtle bg-bg-secondary px-4 py-3 text-text-primary focus:border-purple-deep focus:outline-none";

export default function PainelValoresPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    void load();
  }, [router]);

  async function load() {
    try {
      const pricing = await apiFetch<PricingData>("/v1/companion/pricing");
      setData(pricing);
    } catch {
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    try {
      const updated = await apiFetch<PricingData>("/v1/companion/pricing", {
        method: "PATCH",
        body: JSON.stringify(data),
      });
      setData(updated);
      toast("Valores salvos com sucesso.", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao salvar", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  if (loading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary text-text-secondary">
        Carregando...
      </div>
    );
  }

  return (
    <PainelShell onLogout={handleLogout}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Valores</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Defina seus preços e como eles aparecem no perfil público.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <section className="rounded-2xl border border-border-subtle bg-bg-secondary p-5">
          <h2 className="font-semibold text-text-primary">Exibição no perfil</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                { value: "show", label: "Mostrar valores" },
                { value: "consult", label: "Consultar" },
                { value: "hidden", label: "Ocultar" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setData({ ...data, pricingDisplayMode: opt.value })}
                className={`rounded-xl border px-4 py-2 text-sm ${
                  data.pricingDisplayMode === opt.value
                    ? "border-purple-deep bg-purple-deep/20 text-purple-light"
                    : "border-border-subtle text-text-secondary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {data.pricingDisplayMode === "show" && (
          <section className="rounded-2xl border border-border-subtle bg-bg-secondary p-5">
            <h2 className="font-semibold text-text-primary">Tabela de preços (R$)</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["thirtyMin", "30 minutos"],
                  ["oneHour", "1 hora"],
                  ["twoHours", "2 horas"],
                  ["overnight", "Pernoite"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block">
                  <span className="text-sm text-text-secondary">{label}</span>
                  <input
                    type="number"
                    min={0}
                    className={`${inputClass} mt-1`}
                    value={data[key] ?? ""}
                    onChange={(e) =>
                      setData({
                        ...data,
                        [key]: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </label>
              ))}
            </div>
          </section>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-purple-deep px-6 py-3 text-sm font-medium text-white hover:bg-purple-light disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar valores"}
        </button>
      </form>
    </PainelShell>
  );
}
