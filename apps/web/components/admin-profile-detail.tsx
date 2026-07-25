"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HotScoreThermometer } from "@/components/hot-score-thermometer";
import { useToast } from "@/components/toast";
import { apiFetch } from "@/lib/auth";

type AdminProfile = {
  id: string;
  slug: string;
  displayName: string;
  email: string;
  birthDate: string | null;
  age: number | null;
  bio: string | null;
  sexualPreference: string | null;
  position: string | null;
  penisSizeCm: number | null;
  status: string;
  isPublic: boolean;
  isPremium: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  city?: string;
  state?: string;
  neighborhood?: string | null;
  cep?: string | null;
  hasWhatsApp?: boolean;
  whatsappMasked?: string | null;
  viewCount: number;
  hotScore: number | null;
  hotScoreLevel: string | null;
  pendingVideos: number;
  pendingMoments: number;
  tagIds: string[];
  photos: Array<{ id: string; url: string; thumbUrl?: string; isCover: boolean; status: string }>;
  completion: { percent: number; readyForReview: boolean; missing: string[] };
};

type TagOption = { id: string; name: string };

const PREFERENCES = ["Heterossexual", "Homossexual", "Bissexual", "Pansexual"];
const POSITIONS = [
  { value: "active", label: "Ativo" },
  { value: "passive", label: "Passivo" },
  { value: "versatile", label: "Versátil" },
];

const inputClass =
  "w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-text-primary focus:border-purple-deep focus:outline-none";

export function AdminProfileDetail({ profileId }: { profileId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    displayName: "",
    birthDate: "",
    bio: "",
    sexualPreference: "",
    position: "",
    penisSizeCm: "",
    city: "",
    state: "",
    neighborhood: "",
    cep: "",
    status: "pending",
    isPublic: false,
    isVerified: false,
    isPremium: false,
    isFeatured: false,
    selectedTagIds: [] as string[],
  });

  useEffect(() => {
    load();
  }, [profileId]);

  async function load() {
    setLoading(true);
    try {
      const [data, tagsRes] = await Promise.all([
        apiFetch<AdminProfile>(`/v1/admin/profiles/${profileId}`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1/tags`).then(
          (r) => (r.ok ? r.json() : { data: [] }),
        ),
      ]);
      setProfile(data);
      setTags(tagsRes.data ?? []);
      setForm({
        displayName: data.displayName ?? "",
        birthDate: data.birthDate ?? "",
        bio: data.bio ?? "",
        sexualPreference: data.sexualPreference ?? "",
        position: data.position ?? "",
        penisSizeCm: data.penisSizeCm != null ? String(data.penisSizeCm) : "",
        city: data.city ?? "",
        state: data.state ?? "",
        neighborhood: data.neighborhood ?? "",
        cep: data.cep ?? "",
        status: data.status,
        isPublic: data.isPublic,
        isVerified: data.isVerified,
        isPremium: data.isPremium,
        isFeatured: data.isFeatured,
        selectedTagIds: data.tagIds ?? [],
      });
    } catch {
      router.replace("/admin/perfis");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      await apiFetch(`/v1/admin/profiles/${profileId}`, {
        method: "PATCH",
        body: JSON.stringify({
          displayName: form.displayName,
          birthDate: form.birthDate || undefined,
          bio: form.bio,
          sexualPreference: form.sexualPreference || undefined,
          position: form.position || undefined,
          penisSizeCm: form.penisSizeCm ? Number(form.penisSizeCm) : undefined,
          city: form.city,
          state: form.state,
          neighborhood: form.neighborhood || undefined,
          cep: form.cep || undefined,
          status: form.status,
          isPublic: form.isPublic,
          isVerified: form.isVerified,
          isPremium: form.isPremium,
          isFeatured: form.isFeatured,
          tagIds: form.selectedTagIds,
        }),
      });
      toast("Perfil salvo com sucesso.", "success");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao salvar", "error");
    } finally {
      setSaving(false);
    }
  }

  async function approve(force = false) {
    try {
      await apiFetch(`/v1/admin/profiles/${profileId}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ force }),
      });
      toast(force ? "Perfil aprovado (forçado)." : "Perfil aprovado.", "success");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao aprovar", "error");
    }
  }

  async function reject() {
    const reason = prompt("Motivo da rejeição (opcional):") ?? "";
    try {
      await apiFetch(`/v1/admin/profiles/${profileId}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ reason: reason || "Não atende aos critérios" }),
      });
      toast("Perfil rejeitado.", "success");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao rejeitar", "error");
    }
  }

  async function blockProfile() {
    const reason = prompt("Motivo do bloqueio (opcional):") ?? "";
    if (!confirm("Bloquear perfil e conta? Sessões serão encerradas.")) return;
    try {
      await apiFetch(`/v1/admin/profiles/${profileId}/block`, {
        method: "PATCH",
        body: JSON.stringify({ reason: reason || undefined }),
      });
      toast("Perfil bloqueado.", "success");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao bloquear", "error");
    }
  }

  async function unblockProfile() {
    try {
      await apiFetch(`/v1/admin/profiles/${profileId}/unblock`, { method: "PATCH" });
      toast("Perfil desbloqueado.", "success");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao desbloquear", "error");
    }
  }

  async function deleteProfile() {
    if (!confirm("Excluir perfil permanentemente? Esta ação não pode ser desfeita.")) return;
    try {
      await apiFetch(`/v1/admin/profiles/${profileId}`, { method: "DELETE" });
      toast("Perfil excluído.", "success");
      router.push("/admin/perfis");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao excluir", "error");
    }
  }

  function toggleTag(tagId: string) {
    setForm((f) => ({
      ...f,
      selectedTagIds: f.selectedTagIds.includes(tagId)
        ? f.selectedTagIds.filter((id) => id !== tagId)
        : f.selectedTagIds.length < 8
          ? [...f.selectedTagIds, tagId]
          : f.selectedTagIds,
    }));
  }

  if (loading || !profile) {
    return <p className="text-text-secondary">Carregando perfil...</p>;
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/perfis" className="text-sm text-purple-light hover:underline">
            ← Voltar aos perfis
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-text-primary">{profile.displayName}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {profile.email} · /perfil/{profile.slug}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {profile.status === "approved" && profile.isPublic && (
            <Link
              href={`/perfil/${profile.slug}`}
              target="_blank"
              className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
            >
              Ver público
            </Link>
          )}
          <Link
            href="/admin/mensagens"
            className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-purple-light hover:border-purple-deep/40"
          >
            Mensagens
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border-subtle bg-bg-secondary p-4">
          <p className="text-xs text-text-muted">Completude</p>
          <p className="text-2xl font-bold text-text-primary">{profile.completion.percent}%</p>
          {!profile.completion.readyForReview && (
            <p className="mt-1 text-xs text-text-muted">{profile.completion.missing.join(", ")}</p>
          )}
        </div>
        <div className="rounded-2xl border border-border-subtle bg-bg-secondary p-4">
          <p className="text-xs text-text-muted">Visualizações</p>
          <p className="text-2xl font-bold text-text-primary">{profile.viewCount}</p>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-bg-secondary p-4">
          <p className="text-xs text-text-muted">Mídia pendente</p>
          <p className="text-lg font-semibold text-text-primary">
            {profile.pendingVideos} vídeos · {profile.pendingMoments} momentos
          </p>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-bg-secondary p-4">
          <p className="text-xs text-text-muted">Popularidade</p>
          {profile.hotScore != null ? (
            <div className="mt-2">
              <HotScoreThermometer
                score={profile.hotScore}
                label={profile.hotScoreLevel ?? undefined}
                badge
              />
            </div>
          ) : (
            <p className="text-2xl font-bold text-text-primary">—</p>
          )}
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-border-subtle bg-bg-secondary p-6">
        <h2 className="text-lg font-semibold text-text-primary">Status e visibilidade</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block text-sm">
            <span className="text-text-secondary">Status</span>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className={`mt-1 ${inputClass}`}
            >
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
              <option value="blocked">blocked</option>
            </select>
          </label>
          {[
            { key: "isPublic", label: "Público na busca" },
            { key: "isVerified", label: "Verificado" },
            { key: "isPremium", label: "Premium" },
            { key: "isFeatured", label: "Destaque" },
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={form[item.key as keyof typeof form] as boolean}
                onChange={(e) =>
                  setForm((f) => ({ ...f, [item.key]: e.target.checked }))
                }
                className="rounded border-border-subtle"
              />
              {item.label}
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => approve(false)}
            disabled={!profile.completion.readyForReview}
            className="rounded-xl bg-success px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Aprovar
          </button>
          {!profile.completion.readyForReview && (
            <button
              type="button"
              onClick={() => approve(true)}
              className="rounded-xl border border-gold/40 px-4 py-2 text-sm text-gold"
            >
              Aprovar incompleto
            </button>
          )}
          <button
            type="button"
            onClick={reject}
            className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-text-secondary"
          >
            Rejeitar
          </button>
          {profile.status === "blocked" ? (
            <button
              type="button"
              onClick={unblockProfile}
              className="rounded-xl border border-success/40 px-4 py-2 text-sm text-success"
            >
              Desbloquear
            </button>
          ) : (
            <button
              type="button"
              onClick={blockProfile}
              className="rounded-xl border border-red-500/40 px-4 py-2 text-sm text-red-400"
            >
              Bloquear
            </button>
          )}
          <button
            type="button"
            onClick={deleteProfile}
            className="rounded-xl border border-red-500/30 px-4 py-2 text-sm text-red-400/80"
          >
            Excluir
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border-subtle bg-bg-secondary p-6">
        <h2 className="text-lg font-semibold text-text-primary">Dados do perfil</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="text-text-secondary">Nome público</span>
            <input
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="block text-sm">
            <span className="text-text-secondary">Nascimento</span>
            <input
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="block text-sm">
            <span className="text-text-secondary">Dote (cm)</span>
            <input
              type="number"
              min={10}
              max={35}
              value={form.penisSizeCm}
              onChange={(e) => setForm((f) => ({ ...f, penisSizeCm: e.target.value }))}
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-text-secondary">Biografia</span>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={4}
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="block text-sm">
            <span className="text-text-secondary">Preferência</span>
            <select
              value={form.sexualPreference}
              onChange={(e) => setForm((f) => ({ ...f, sexualPreference: e.target.value }))}
              className={`mt-1 ${inputClass}`}
            >
              <option value="">—</option>
              {PREFERENCES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-text-secondary">Posição</span>
            <select
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              className={`mt-1 ${inputClass}`}
            >
              <option value="">—</option>
              {POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border-subtle bg-bg-secondary p-6">
        <h2 className="text-lg font-semibold text-text-primary">Localização</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-text-secondary">Cidade</span>
            <input
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="block text-sm">
            <span className="text-text-secondary">UF</span>
            <input
              value={form.state}
              maxLength={2}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))}
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="block text-sm">
            <span className="text-text-secondary">Bairro</span>
            <input
              value={form.neighborhood}
              onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))}
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="block text-sm">
            <span className="text-text-secondary">CEP</span>
            <input
              value={form.cep}
              onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value }))}
              className={`mt-1 ${inputClass}`}
            />
          </label>
        </div>
        {profile.whatsappMasked && (
          <p className="mt-3 text-sm text-text-muted">WhatsApp: {profile.whatsappMasked}</p>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-border-subtle bg-bg-secondary p-6">
        <h2 className="text-lg font-semibold text-text-primary">Tags</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className={`rounded-full px-3 py-1 text-sm ${
                form.selectedTagIds.includes(tag.id)
                  ? "bg-purple-deep text-white"
                  : "border border-border-subtle text-text-secondary"
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </section>

      {profile.photos.length > 0 && (
        <section className="mt-6 rounded-2xl border border-border-subtle bg-bg-secondary p-6">
          <h2 className="text-lg font-semibold text-text-primary">Fotos ({profile.photos.length})</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {profile.photos.map((photo) => (
              <div key={photo.id} className="overflow-hidden rounded-xl border border-border-subtle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.thumbUrl ?? photo.url}
                  alt=""
                  className="aspect-[3/4] w-full object-cover"
                />
                <p className="p-2 text-center text-xs text-text-muted">
                  {photo.isCover ? "Capa" : photo.status}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-purple-deep px-8 py-3 text-sm font-medium text-white hover:bg-purple-light disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </>
  );
}
