"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, fetchMe } from "@/lib/auth";

type SettingRow = {
  key: string;
  value: string;
  description: string;
  updatedAt: string | null;
};

const labels: Record<string, string> = {
  site_name: "Nome do site",
  hero_title_prefix: "Hero — título (parte 1)",
  hero_title_highlight: "Hero — destaque colorido",
  hero_subtitle: "Hero — subtítulo",
  maintenance_mode: "Modo manutenção (true/false)",
  registration_open: "Cadastro aberto (true/false)",
  "public.home.premium.limit": "Limite de perfis Premium na home",
  "hotscore.weights.premium_bonus": "Bônus hot score — Premium",
  "hotscore.weights.featured_bonus": "Bônus hot score — Destaque",
};

export default function AdminConfiguracoesPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const me = await fetchMe();
      if (!me.roles.includes("admin")) {
        router.replace("/admin");
        return;
      }
      const data = await apiFetch<{ data: SettingRow[] }>("/v1/admin/settings");
      setSettings(data.data);
      setValues(Object.fromEntries(data.data.map((s) => [s.key, s.value])));
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      await apiFetch("/v1/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          settings: settings.map((s) => ({ key: s.key, value: values[s.key] ?? s.value })),
        }),
      });
      setMessage("Configurações salvas.");
      await load();
    } catch {
      setMessage("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function recalculateHotScores() {
    setRecalculating(true);
    setMessage("");
    try {
      const res = await apiFetch<{ recalculated: number }>("/v1/admin/hot-scores/recalculate", {
        method: "POST",
      });
      setMessage(`Hot score recalculado para ${res.recalculated} perfis.`);
    } catch {
      setMessage("Erro ao recalcular hot scores.");
    } finally {
      setRecalculating(false);
    }
  }

  if (loading) return <p className="text-text-secondary">Carregando...</p>;

  return (
    <>
      <h1 className="text-2xl font-bold text-text-primary">Configurações</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Textos do site e flags operacionais. Alterações refletem na home após revalidação (~1 min).
      </p>

      {message && (
        <p className="mt-4 rounded-xl border border-border-subtle bg-bg-secondary p-3 text-sm text-text-secondary">
          {message}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {settings.map((s) => (
          <label key={s.key} className="block rounded-2xl border border-border-subtle bg-bg-secondary p-4">
            <span className="text-sm font-medium text-text-primary">{labels[s.key] ?? s.key}</span>
            <p className="mt-1 text-xs text-text-muted">{s.description}</p>
            <input
              value={values[s.key] ?? s.value}
              onChange={(e) => setValues((v) => ({ ...v, [s.key]: e.target.value }))}
              className="mt-3 w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-2 text-text-primary focus:border-purple-deep focus:outline-none"
            />
          </label>
        ))}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="mt-6 rounded-xl bg-purple-deep px-6 py-2 text-sm font-medium text-white hover:bg-purple-light disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar configurações"}
      </button>

      <div className="mt-10 rounded-2xl border border-border-subtle bg-bg-secondary p-5">
        <h2 className="font-semibold text-text-primary">Hot Score</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Após alterar os bônus Premium/Destaque, recalcule todos os perfis para aplicar a nova
          fórmula.
        </p>
        <button
          type="button"
          onClick={recalculateHotScores}
          disabled={recalculating}
          className="mt-4 rounded-xl border border-gold/40 px-4 py-2 text-sm text-gold hover:bg-gold/10 disabled:opacity-50"
        >
          {recalculating ? "Recalculando..." : "Recalcular todos os hot scores"}
        </button>
      </div>
    </>
  );
}
