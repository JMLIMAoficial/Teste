"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, clearAccessToken, fetchMe, getAccessToken } from "@/lib/auth";
import { getProfileCompletion, type ProfileCompletion } from "@/lib/profile-completion";
import { uploadCompanionMoment, type OwnMomentItem } from "@/lib/moment-upload";
const PREFERENCES = ["Heterossexual", "Homossexual", "Bissexual", "Pansexual"];
const POSITIONS = [
  { value: "active", label: "Ativo" },
  { value: "passive", label: "Passivo" },
  { value: "versatile", label: "Versátil" },
] as const;

type TagOption = { id: string; name: string; slug: string };

type OwnVideo = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
};

type Profile = {
  id: string;
  slug: string;
  displayName: string;
  birthDate: string | null;
  status: string;
  isPublic?: boolean;
  bio: string | null;
  sexualPreference: string | null;
  position: string | null;
  penisSizeCm: number | null;
  city?: string;
  state?: string;
  neighborhood?: string | null;
  cep?: string | null;
  hasLocation?: boolean;
  hasWhatsApp?: boolean;
  whatsappMasked?: string | null;
  tagIds?: string[];
  tags?: Array<{ id: string; name: string }>;
  photos: Array<{
    id: string;
    url: string;
    thumbUrl?: string;
    status: string;
    isCover: boolean;
    sortOrder?: number;
  }>;
  completion?: ProfileCompletion;
  warning?: string;
};

const inputClass =
  "w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-text-primary focus:border-purple-deep focus:outline-none";

function mediaStatusLabel(status: string) {
  if (status === "approved") return "Publicado";
  if (status === "pending") return "Aguardando moderação";
  if (status === "rejected") return "Rejeitado";
  return status;
}

export function CompanionProfileEditor() {  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [availableTags, setAvailableTags] = useState<TagOption[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [bio, setBio] = useState("");
  const [sexualPreference, setSexualPreference] = useState("");
  const [position, setPosition] = useState("");
  const [penisSizeCm, setPenisSizeCm] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cep, setCep] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [customTagNames, setCustomTagNames] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingMoment, setUploadingMoment] = useState(false);
  const [photoBusy, setPhotoBusy] = useState<string | null>(null);
  const [ownVideos, setOwnVideos] = useState<OwnVideo[]>([]);
  const [ownMoments, setOwnMoments] = useState<OwnMomentItem[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    loadAll();
  }, [router]);

  useEffect(() => {
    if (loading || !window.location.hash) return;
    const id = window.location.hash.slice(1);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading]);

  async function loadAll() {
    try {
      const me = await fetchMe();
      if (me.roles.includes("admin")) {
        router.replace("/admin");
        return;
      }

      const [data, tagsRes, videosRes, momentsRes] = await Promise.all([
        apiFetch<Profile>("/v1/companion/profile"),
        fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1/tags`).then(
          (r) => (r.ok ? r.json() : { data: [] }),
        ),
        apiFetch<{ data: OwnVideo[] }>("/v1/companion/videos"),
        apiFetch<{ data: OwnMomentItem[] }>("/v1/companion/moments"),
      ]);

      setProfile(data);
      setOwnVideos(videosRes.data ?? []);
      setOwnMoments(momentsRes.data ?? []);
      setAvailableTags(tagsRes.data ?? []);
      setDisplayName(data.displayName ?? "");
      setBirthDate(data.birthDate ?? "");
      setBio(data.bio ?? "");
      setSexualPreference(data.sexualPreference ?? "");
      setPosition(data.position ?? "");
      setPenisSizeCm(data.penisSizeCm != null ? String(data.penisSizeCm) : "");
      setCep(data.cep ?? "");
      setNeighborhood(data.neighborhood ?? "");
      setCity(data.city ?? "");
      setState(data.state ?? "");
      setSelectedTagIds(data.tags?.map((t) => t.id) ?? data.tagIds ?? []);
      setCustomTagNames([]);
      setTagInput("");
    } catch {
      clearAccessToken();
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  function tagCount() {
    return selectedTagIds.length + customTagNames.length;
  }

  function getTagName(tagId: string) {
    return (
      profile?.tags?.find((t) => t.id === tagId)?.name ??
      availableTags.find((t) => t.id === tagId)?.name ??
      "Tag"
    );
  }

  function addCustomTag(raw: string) {
    const parts = raw
      .split(/[,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const name of parts) {
      if (tagCount() >= 8) break;
      const lower = name.toLowerCase();
      const existingTag = availableTags.find((t) => t.name.toLowerCase() === lower);
      if (existingTag) {
        if (!selectedTagIds.includes(existingTag.id)) {
          setSelectedTagIds((prev) => [...prev, existingTag.id]);
        }
        continue;
      }
      if (customTagNames.some((n) => n.toLowerCase() === lower)) continue;
      if (selectedTagIds.some((id) => getTagName(id).toLowerCase() === lower)) continue;
      setCustomTagNames((prev) => [...prev, name.slice(0, 100)]);
    }
  }

  function moveTag(tagId: string, direction: -1 | 1) {
    setSelectedTagIds((prev) => {
      const index = prev.indexOf(tagId);
      if (index < 0) return prev;
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) => {
      if (prev.includes(tagId)) return prev.filter((id) => id !== tagId);
      if (tagCount() >= 8) return prev;
      return [...prev, tagId];
    });
  }

  async function saveProfile() {
    setSaving(true);
    setMessage("");
    try {
      const data = await apiFetch<Profile>("/v1/companion/profile", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: displayName.trim(),
          birthDate: birthDate || undefined,
          bio: bio.trim(),
          sexualPreference: sexualPreference || undefined,
          position: position || undefined,
          penisSizeCm: penisSizeCm ? Number(penisSizeCm) : undefined,
          tagIds: selectedTagIds,
          tagNames: customTagNames.length > 0 ? customTagNames : undefined,
          ...(whatsapp.trim() && { whatsapp: whatsapp.trim() }),
          ...(cep.trim() && { cep: cep.trim() }),
          ...(neighborhood.trim() && { neighborhood: neighborhood.trim() }),
          ...(city.trim() && { city: city.trim() }),
          ...(state.trim() && { state: state.trim() }),
        }),
      });
      setProfile(data);
      setDisplayName(data.displayName ?? "");
      setBirthDate(data.birthDate ?? "");
      setBio(data.bio ?? "");
      setSexualPreference(data.sexualPreference ?? "");
      setPosition(data.position ?? "");
      setPenisSizeCm(data.penisSizeCm != null ? String(data.penisSizeCm) : "");
      setCep(data.cep ?? "");
      setNeighborhood(data.neighborhood ?? "");
      setCity(data.city ?? "");
      setState(data.state ?? "");
      setSelectedTagIds(data.tags?.map((t) => t.id) ?? data.tagIds ?? []);
      setCustomTagNames([]);
      setTagInput("");

      const tagsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1/tags`,
      ).then((r) => (r.ok ? r.json() : { data: [] }));
      setAvailableTags(tagsRes.data ?? []);

      const successMsg =
        data.status === "pending"
          ? "Perfil salvo com sucesso! Aguardando moderação para publicação na plataforma."
          : "Perfil salvo com sucesso! As alterações já refletem no seu perfil.";
      setMessage(data.warning ? `${successMsg} ${data.warning}` : successMsg);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function uploadMedia(endpoint: string, file: File, extra?: Record<string, string>) {
    const form = new FormData();
    form.append("file", file);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) form.append(k, v);
    }
    const token = getAccessToken();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api${endpoint}`,
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
        credentials: "include",
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? "Falha no upload");
    }
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    setMessage("");
    try {
      await uploadMedia("/v1/companion/photos", file);
      await loadAll();
      setMessage("Foto adicionada ao seu perfil!");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
  }

  function sortedPhotos() {
    return [...(profile?.photos ?? [])].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );
  }

  async function setPhotoCover(photoId: string) {
    setPhotoBusy(photoId);
    setMessage("");
    try {
      await apiFetch(`/v1/companion/photos/${photoId}/cover`, { method: "PATCH" });
      await loadAll();
      setMessage("Capa atualizada.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro ao definir capa");
    } finally {
      setPhotoBusy(null);
    }
  }

  async function movePhoto(photoId: string, direction: -1 | 1) {
    const photos = sortedPhotos();
    const index = photos.findIndex((p) => p.id === photoId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= photos.length) return;

    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];

    setPhotoBusy(photoId);
    setMessage("");
    try {
      await apiFetch("/v1/companion/photos/reorder", {
        method: "PATCH",
        body: JSON.stringify({ photoIds: next.map((p) => p.id) }),
      });
      await loadAll();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro ao reordenar fotos");
    } finally {
      setPhotoBusy(null);
    }
  }

  async function deletePhoto(photoId: string) {
    if (!confirm("Excluir esta foto?")) return;

    setPhotoBusy(photoId);
    setMessage("");
    try {
      await apiFetch(`/v1/companion/photos/${photoId}`, { method: "DELETE" });
      await loadAll();
      setMessage("Foto excluída.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro ao excluir foto");
    } finally {
      setPhotoBusy(null);
    }
  }

  async function uploadVideo(file: File) {
    setUploadingVideo(true);
    setMessage("");
    try {
      await uploadMedia("/v1/companion/videos", file);
      await loadAll();
      setMessage("Vídeo enviado! Aguardando aprovação.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro no upload de vídeo");
    } finally {
      setUploadingVideo(false);
    }
  }

  async function uploadMoment(file: File, caption: string) {
    setUploadingMoment(true);
    setMessage("");
    try {
      await uploadCompanionMoment(file, caption);
      await loadAll();
      setMessage("Momento enviado! Aguardando aprovação.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro no upload de momento");
    } finally {
      setUploadingMoment(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary text-text-secondary">
        Carregando...
      </div>
    );
  }

  const completion = profile ? getProfileCompletion(profile) : null;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Editar perfil</h1>
        <p className="mt-1 text-sm text-text-muted">
          Atualize seus dados, complete o perfil e envie fotos e mídia.
        </p>
      </div>

      {profile && completion && (
        <section className="mb-6 rounded-2xl border border-border-subtle bg-bg-secondary p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-text-primary">Completude</h2>
              <p className="mt-1 text-sm text-text-muted">{completion.percent}% preenchido</p>
            </div>
            <span className="text-xl font-bold text-purple-light">{completion.percent}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-tertiary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-deep to-gold transition-all"
              style={{ width: `${completion.percent}%` }}
            />
          </div>
        </section>
      )}

      {message && (          <p
            className={`mt-4 rounded-xl border p-3 text-sm ${
              message.includes("sucesso")
                ? "border-success/30 bg-success/10 text-success"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            {message}
          </p>
        )}

        <section className="sticky top-0 z-20 mt-6 rounded-2xl border border-purple-deep/30 bg-bg-secondary/95 p-4 backdrop-blur sm:hidden">
          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full rounded-xl bg-purple-deep py-3 text-sm font-medium text-white hover:bg-purple-light disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar perfil completo"}
          </button>
        </section>

        <section id="dados" className="mt-8 scroll-mt-24 rounded-2xl border border-border-subtle bg-bg-secondary p-6">
          <h2 className="text-lg font-semibold text-text-primary">Dados do perfil</h2>          <p className="mt-1 text-sm text-text-muted">
            Nome, idade e biografia exibidos nos cards e na página pública.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm text-text-secondary">Nome público</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Data de nascimento</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-sm text-text-secondary">Descrição / biografia</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={1000}
              className={inputClass}
              placeholder="Conte um pouco sobre você..."
            />
          </div>
        </section>

        <section id="completar" className="mt-8 scroll-mt-24 rounded-2xl border border-purple-deep/20 bg-bg-secondary p-6">
          <h2 className="text-lg font-semibold text-text-primary">Completar perfil</h2>          <p className="mt-1 text-sm text-text-muted">
            Preferência, posição, dote e tags — preenchidos após o cadastro inicial.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Preferência sexual</label>
              <select
                value={sexualPreference}
                onChange={(e) => setSexualPreference(e.target.value)}
                className={inputClass}
              >
                <option value="">Selecione</option>
                {PREFERENCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Posição</label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className={inputClass}
              >
                <option value="">Selecione</option>
                {POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Dote (cm)</label>
              <input
                type="number"
                min={10}
                max={35}
                value={penisSizeCm}
                onChange={(e) => setPenisSizeCm(e.target.value)}
                placeholder="Ex: 18"
                className={inputClass}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm text-text-secondary">
              Tags do perfil (até 8)
            </label>
            <p className="mb-3 rounded-xl border border-gold/20 bg-gold/5 px-3 py-2 text-xs leading-relaxed text-text-muted">
              As <strong className="text-gold">3 primeiras tags</strong> da ordem abaixo são as que
              aparecem em destaque nos cards da home. Escolha abaixo e use as setas para definir a
              ordem. Salve o perfil para aplicar.
            </p>

            {(selectedTagIds.length > 0 || customTagNames.length > 0) && (
              <ul className="mb-3 space-y-2">
                {selectedTagIds.map((tagId, index) => (
                  <li
                    key={tagId}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                      index < 3
                        ? "border-gold/30 bg-gold/5"
                        : "border-border-subtle bg-bg-tertiary"
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        index < 3
                          ? "bg-gold/20 text-gold"
                          : "bg-bg-primary text-text-muted"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                      {getTagName(tagId)}
                    </span>
                    {index < 3 && (
                      <span className="hidden text-[10px] font-medium uppercase text-gold sm:inline">
                        Card
                      </span>
                    )}
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveTag(tagId, -1)}
                        disabled={index === 0}
                        className="rounded-lg px-2 py-1 text-xs text-text-muted hover:bg-bg-primary disabled:opacity-30"
                        aria-label="Mover tag para cima"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveTag(tagId, 1)}
                        disabled={index === selectedTagIds.length - 1}
                        className="rounded-lg px-2 py-1 text-xs text-text-muted hover:bg-bg-primary disabled:opacity-30"
                        aria-label="Mover tag para baixo"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTagIds((prev) => prev.filter((id) => id !== tagId))}
                        className="rounded-lg px-2 py-1 text-xs text-text-muted hover:bg-bg-primary"
                        aria-label={`Remover tag ${getTagName(tagId)}`}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
                {customTagNames.map((name, index) => {
                  const order = selectedTagIds.length + index + 1;
                  return (
                    <li
                      key={name}
                      className="flex items-center gap-2 rounded-xl border border-purple-deep/30 bg-purple-deep/5 px-3 py-2"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-deep/20 text-[10px] font-bold text-purple-light">
                        {order}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                        {name}
                      </span>
                      <span className="text-[10px] text-text-muted">(nova — salve para ordenar)</span>
                      <button
                        type="button"
                        onClick={() =>
                          setCustomTagNames((prev) => prev.filter((n) => n !== name))
                        }
                        className="shrink-0 rounded-lg px-2 py-1 text-xs text-text-muted hover:bg-bg-primary"
                        aria-label={`Remover tag ${name}`}
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomTag(tagInput);
                  setTagInput("");
                }
              }}
              onBlur={() => {
                if (tagInput.trim()) {
                  addCustomTag(tagInput);
                  setTagInput("");
                }
              }}
              placeholder="Digite uma tag e pressione Enter"
              className={inputClass}
              disabled={tagCount() >= 8}
            />
            <p className="mt-1 text-xs text-text-muted">
              {tagCount()}/8 selecionadas · apenas as 3 primeiras vão para os cards
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const selected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    disabled={!selected && tagCount() >= 8}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
                      selected
                        ? "bg-purple-deep text-white"
                        : "bg-bg-tertiary text-text-secondary hover:bg-bg-primary"
                    }`}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section id="localizacao" className="mt-8 scroll-mt-24 rounded-2xl border border-border-subtle bg-bg-secondary p-6">
          <h2 className="text-lg font-semibold text-text-primary">Localização</h2>
          <p className="mt-1 text-sm text-text-muted">            Bairro aparece no perfil com link para o mapa. CEP define proximidade em &quot;Perto de
            você&quot;.
            {profile?.hasLocation && " ✓ Coordenadas ativas"}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="Bairro (ex: Consolação)"
              className={inputClass}
            />
            <input
              type="text"
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              placeholder="CEP (01310-100)"
              className={inputClass}
            />
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Cidade"
              className={inputClass}
            />
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="UF"
              maxLength={2}
              className={inputClass}
            />
          </div>
        </section>

        <section id="whatsapp" className="mt-8 scroll-mt-24 rounded-2xl border border-border-subtle bg-bg-secondary p-6">
          <h2 className="text-lg font-semibold text-text-primary">WhatsApp</h2>          <p className="mt-1 text-sm text-text-muted">
            Número privado — só o botão de contato aparece no perfil.
            {profile?.whatsappMasked && ` Atual: ${profile.whatsappMasked}`}
          </p>
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="(11) 99999-9999"
            className={`mt-3 max-w-xs ${inputClass}`}
          />
        </section>

        <div className="mt-6">
          <button
            onClick={saveProfile}
            disabled={saving}
            className="rounded-xl bg-purple-deep px-8 py-3 text-sm font-medium text-white hover:bg-purple-light disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar perfil completo"}
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/painel/preview" className="text-sm text-purple-light hover:underline">
            Pré-visualizar perfil →
          </Link>
          {profile?.status === "approved" && profile?.isPublic && (
            <Link
              href={`/perfil/${profile.slug}`}
              className="text-sm text-purple-light hover:underline"
            >
              Ver perfil público →
            </Link>
          )}
        </div>

        <section id="fotos" className="mt-8 scroll-mt-24 rounded-2xl border border-border-subtle bg-bg-secondary p-6">
          <h2 className="text-lg font-semibold text-text-primary">Fotos</h2>          <p className="mt-1 text-sm text-text-muted">
            Suas fotos aparecem na prévia e no perfil assim que enviadas. Defina qual é a capa nos cards.
            {profile?.status !== "approved" || !profile?.isPublic ? (
              <> A visibilidade na busca depende da moderação do perfil.</>
            ) : null}
          </p>

          <label className="mt-4 inline-flex cursor-pointer rounded-xl border border-dashed border-border-subtle px-6 py-4 text-sm text-text-secondary hover:border-purple-deep">
            {uploading ? "Enviando..." : "Selecionar foto"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadPhoto(file);
              }}
            />
          </label>

          {sortedPhotos().length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {sortedPhotos().map((photo, index, photos) => (
                <div key={photo.id} className="overflow-hidden rounded-xl border border-border-subtle">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.thumbUrl ?? photo.url}
                    alt=""
                    className="aspect-[3/4] w-full object-cover"
                  />
                  <div className="space-y-2 p-2">
                    <p className="text-center text-xs text-text-muted">
                      {photo.isCover ? "Capa" : "No perfil"}
                    </p>
                    <div className="flex flex-wrap justify-center gap-1">
                      {!photo.isCover && (
                        <button
                          type="button"
                          disabled={photoBusy === photo.id}
                          onClick={() => setPhotoCover(photo.id)}
                          className="rounded-lg border border-border-subtle px-2 py-1 text-[10px] text-text-secondary hover:border-purple-deep/40"
                        >
                          Capa
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={photoBusy === photo.id || index === 0}
                        onClick={() => movePhoto(photo.id, -1)}
                        className="rounded-lg border border-border-subtle px-2 py-1 text-[10px] text-text-secondary hover:border-purple-deep/40 disabled:opacity-40"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={photoBusy === photo.id || index === photos.length - 1}
                        onClick={() => movePhoto(photo.id, 1)}
                        className="rounded-lg border border-border-subtle px-2 py-1 text-[10px] text-text-secondary hover:border-purple-deep/40 disabled:opacity-40"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        disabled={photoBusy === photo.id}
                        onClick={() => deletePhoto(photo.id)}
                        className="rounded-lg border border-red-500/30 px-2 py-1 text-[10px] text-red-400 hover:bg-red-500/10"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section id="videos" className="mt-8 scroll-mt-24 rounded-2xl border border-border-subtle bg-bg-secondary p-6">
          <h2 className="text-lg font-semibold text-text-primary">Vídeos</h2>
          <p className="mt-1 text-sm text-text-muted">
            MP4 ou WebM — máx. 50MB. Aguardam moderação antes de aparecer no perfil público.
          </p>
          <label className="mt-4 inline-flex cursor-pointer rounded-xl border border-dashed border-border-subtle px-6 py-4 text-sm text-text-secondary hover:border-purple-deep">
            {uploadingVideo ? "Enviando..." : "Selecionar vídeo"}
            <input
              type="file"
              accept="video/mp4,video/webm"
              className="hidden"
              disabled={uploadingVideo}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadVideo(file);
              }}
            />
          </label>
          {ownVideos.length > 0 && (
            <ul className="mt-4 space-y-2">
              {ownVideos.map((video) => (
                <li
                  key={video.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-3 text-sm"
                >
                  <span className="text-text-primary">{video.title}</span>
                  <span className="text-xs text-text-muted">
                    {mediaStatusLabel(video.status)} ·{" "}
                    {new Date(video.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="momentos" className="mt-8 scroll-mt-24 rounded-2xl border border-border-subtle bg-bg-secondary p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Momentos</h2>
              <p className="mt-1 text-sm text-text-muted">
                Fotos e vídeos curtos no feed — quanto mais você publica, mais visibilidade ganha.
              </p>
            </div>
            <Link
              href="/painel/momentos"
              className="text-sm text-purple-light hover:underline"
            >
              Ver estatísticas →
            </Link>
          </div>
          <p className="mt-3 rounded-xl border border-purple-deep/20 bg-purple-deep/5 px-4 py-3 text-sm text-text-secondary">
            Dica: use o botão <strong>+</strong> flutuante em qualquer tela do painel para publicar
            rapidamente, ou selecione abaixo.
          </p>
          <label className="mt-4 inline-flex cursor-pointer rounded-xl border border-dashed border-border-subtle px-6 py-4 text-sm text-text-secondary hover:border-purple-deep">
            {uploadingMoment ? "Enviando..." : "Selecionar momento"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              className="hidden"
              disabled={uploadingMoment}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const caption = prompt("Legenda (opcional):") ?? "";
                  uploadMoment(file, caption);
                }
              }}
            />
          </label>
          {ownMoments.length > 0 && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {ownMoments.map((moment) => {
                const isVideo =
                  moment.mediaType === "video" || moment.mimeType?.startsWith("video/");
                return (
                  <div
                    key={moment.id}
                    className="overflow-hidden rounded-xl border border-border-subtle bg-bg-tertiary"
                  >
                    <div className="relative aspect-video bg-bg-primary">
                      {isVideo ? (
                        <video
                          src={moment.url}
                          className="h-full w-full object-cover"
                          controls
                          playsInline
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={moment.url} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm text-text-primary">
                        {moment.caption || "Sem legenda"}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        {mediaStatusLabel(moment.status)} ·{" "}
                        {new Date(moment.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                      <p className="mt-2 text-xs text-text-secondary">
                        👁 {moment.viewCount} · ♥ {moment.likeCount}
                        {moment.commentCount > 0 ? ` · 💬 ${moment.commentCount}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
    </>
  );
}