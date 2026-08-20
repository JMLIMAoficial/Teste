"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch, clearAccessToken, fetchMe, getAccessToken } from "@/lib/auth";
import { getProfileCompletion, type ProfileCompletion } from "@/lib/profile-completion";
import { toastToneFromMessage, useToast } from "@/components/toast";
const PREFERENCES = ["Heterossexual", "Homossexual", "Bissexual", "Pansexual"];
const POSITIONS = [
  { value: "active", label: "Ativo" },
  { value: "passive", label: "Passivo" },
  { value: "versatile", label: "Versátil" },
] as const;

type SocialLinkPlatform = "privacy" | "onlyfans" | "x" | "instagram";
type SocialLinks = Record<SocialLinkPlatform, string>;

const EMPTY_SOCIAL_LINKS: SocialLinks = {
  privacy: "",
  onlyfans: "",
  x: "",
  instagram: "",
};

const SOCIAL_LINK_OPTIONS: Array<{
  platform: SocialLinkPlatform;
  label: string;
  placeholder: string;
}> = [
  { platform: "privacy", label: "Privacy", placeholder: "https://privacy.com.br/..." },
  { platform: "onlyfans", label: "OnlyFans", placeholder: "https://onlyfans.com/..." },
  { platform: "x", label: "X", placeholder: "https://x.com/..." },
  { platform: "instagram", label: "Instagram", placeholder: "https://instagram.com/..." },
];

type PricingData = {
  pricingDisplayMode: "show" | "consult" | "hidden";
  thirtyMin: number | null;
  oneHour: number | null;
  twoHours: number | null;
  overnight: number | null;
  customItems: Array<{ label: string; price: number }>;
};

type AvailabilityDay = {
  dayOfWeek: number;
  isAvailable: boolean;
  startTime: string | null;
  endTime: string | null;
};

const DAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const EMPTY_PRICING: PricingData = {
  pricingDisplayMode: "show",
  thirtyMin: null,
  oneHour: null,
  twoHours: null,
  overnight: null,
  customItems: [],
};

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
  socialLinks?: Partial<SocialLinks>;
  tagIds?: string[];
  tags?: Array<{ id: string; name: string }>;
  photos: Array<{
    id: string;
    url: string;
    thumbUrl?: string;
    status: string;
    isCover: boolean;
    isProfile?: boolean;
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

export function CompanionProfileEditor() {
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [availableTags, setAvailableTags] = useState<TagOption[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [bio, setBio] = useState("");
  const [sexualPreference, setSexualPreference] = useState("");
  const [position, setPosition] = useState("");
  const [penisSizeCm, setPenisSizeCm] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(EMPTY_SOCIAL_LINKS);
  const [cep, setCep] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [customTagNames, setCustomTagNames] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPricing, setSavingPricing] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingRole, setUploadingRole] = useState<"profile" | "cover" | "album" | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [photoBusy, setPhotoBusy] = useState<string | null>(null);
  const [ownVideos, setOwnVideos] = useState<OwnVideo[]>([]);
  const [pricing, setPricing] = useState<PricingData>(EMPTY_PRICING);
  const [availabilityDays, setAvailabilityDays] = useState<AvailabilityDay[]>([]);

  function notify(message: string, tone?: "success" | "error" | "info") {
    toast(message, tone ?? toastToneFromMessage(message));
  }

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

      const [data, tagsRes, videosRes, pricingRes, availabilityRes] = await Promise.all([
        apiFetch<Profile>("/v1/companion/profile"),
        fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/v1/tags`).then(
          (r) => (r.ok ? r.json() : { data: [] }),
        ),
        apiFetch<{ data: OwnVideo[] }>("/v1/companion/videos"),
        apiFetch<PricingData>("/v1/companion/pricing"),
        apiFetch<{ days: AvailabilityDay[] }>("/v1/companion/availability"),
      ]);

      setProfile(data);
      setOwnVideos(videosRes.data ?? []);
      setPricing(pricingRes ?? EMPTY_PRICING);
      setAvailabilityDays(availabilityRes.days ?? []);
      setAvailableTags(tagsRes.data ?? []);
      setDisplayName(data.displayName ?? "");
      setBirthDate(data.birthDate ?? "");
      setBio(data.bio ?? "");
      setSexualPreference(data.sexualPreference ?? "");
      setPosition(data.position ?? "");
      setPenisSizeCm(data.penisSizeCm != null ? String(data.penisSizeCm) : "");
      setSocialLinks({ ...EMPTY_SOCIAL_LINKS, ...data.socialLinks });
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
          socialLinks,
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
      setSocialLinks({ ...EMPTY_SOCIAL_LINKS, ...data.socialLinks });
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
      notify(data.warning ? `${successMsg} ${data.warning}` : successMsg, data.warning ? "info" : "success");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erro ao salvar", "error");
    } finally {
      setSaving(false);
    }
  }

  async function savePricing() {
    setSavingPricing(true);
    try {
      const updated = await apiFetch<PricingData>("/v1/companion/pricing", {
        method: "PATCH",
        body: JSON.stringify(pricing),
      });
      setPricing(updated);
      notify("Valores salvos com sucesso.", "success");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erro ao salvar valores", "error");
    } finally {
      setSavingPricing(false);
    }
  }

  function updateAvailabilityDay(index: number, patch: Partial<AvailabilityDay>) {
    setAvailabilityDays((prev) => prev.map((day, i) => (i === index ? { ...day, ...patch } : day)));
  }

  async function saveAvailability() {
    setSavingAvailability(true);
    try {
      const res = await apiFetch<{ days: AvailabilityDay[] }>("/v1/companion/availability", {
        method: "PATCH",
        body: JSON.stringify({ days: availabilityDays }),
      });
      setAvailabilityDays(res.days);
      notify("Horários salvos com sucesso.", "success");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erro ao salvar horários", "error");
    } finally {
      setSavingAvailability(false);
    }
  }

  async function uploadMedia(
    endpoint: string,
    file: File,
    extra?: Record<string, string>,
  ) {
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

  async function uploadPhoto(file: File, role: "profile" | "cover" | "album" = "album") {
    setUploading(true);
    setUploadingRole(role);
    try {
      await uploadMedia("/v1/companion/photos", file, { role });
      await loadAll();
      notify(
        role === "profile"
          ? "Foto de perfil atualizada!"
          : role === "cover"
            ? "Foto de capa atualizada!"
            : "Foto adicionada ao álbum!",
        "success",
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erro no upload", "error");
    } finally {
      setUploading(false);
      setUploadingRole(null);
    }
  }

  function sortedPhotos() {
    return [...(profile?.photos ?? [])].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );
  }

  function profilePhoto() {
    return sortedPhotos().find((p) => p.isProfile) ?? null;
  }

  function coverPhoto() {
    return sortedPhotos().find((p) => p.isCover) ?? null;
  }

  function albumPhotos() {
    return sortedPhotos().filter((p) => !p.isProfile && !p.isCover);
  }

  async function movePhoto(photoId: string, direction: -1 | 1) {
    const album = albumPhotos();
    const index = album.findIndex((p) => p.id === photoId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= album.length) return;

    const nextAlbum = [...album];
    [nextAlbum[index], nextAlbum[target]] = [nextAlbum[target], nextAlbum[index]];

    const featuredIds = new Set(
      sortedPhotos()
        .filter((p) => p.isProfile || p.isCover)
        .map((p) => p.id),
    );
    const featured = sortedPhotos().filter((p) => featuredIds.has(p.id));
    const photoIds = [...featured.map((p) => p.id), ...nextAlbum.map((p) => p.id)];

    setPhotoBusy(photoId);
    try {
      await apiFetch("/v1/companion/photos/reorder", {
        method: "PATCH",
        body: JSON.stringify({ photoIds }),
      });
      await loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erro ao reordenar fotos", "error");
    } finally {
      setPhotoBusy(null);
    }
  }

  async function deletePhoto(photoId: string) {
    if (!confirm("Excluir esta foto?")) return;

    setPhotoBusy(photoId);
    try {
      await apiFetch(`/v1/companion/photos/${photoId}`, { method: "DELETE" });
      await loadAll();
      notify("Foto excluída.", "success");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erro ao excluir foto", "error");
    } finally {
      setPhotoBusy(null);
    }
  }

  async function uploadVideo(file: File) {
    setUploadingVideo(true);
    try {
      await uploadMedia("/v1/companion/videos", file);
      await loadAll();
      notify("Vídeo enviado! Aguardando aprovação.", "success");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erro no upload de vídeo", "error");
    } finally {
      setUploadingVideo(false);
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
          Atualize seus dados, valores, horários, fotos e mídia.
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
          <h2 className="text-lg font-semibold text-text-primary">Completar perfil</h2>
          <p className="mt-1 text-sm text-text-muted">
            Fotos principais, preferência, posição, dote e tags — preenchidos após o cadastro inicial.
          </p>

          <div
            id="fotos-principais"
            className="mt-5 scroll-mt-24 rounded-2xl border border-gold/40 bg-gold/10 p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gold">
                  Essencial para aparecer
                </p>
                <h3 className="mt-1 text-base font-semibold text-text-primary">Fotos principais</h3>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-gold/25 bg-bg-primary/50 p-4">
                <div className="flex items-start gap-4">
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-gold/50 bg-bg-tertiary">
                    {profilePhoto() ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profilePhoto()!.thumbUrl ?? profilePhoto()!.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl text-text-muted">
                        ?
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-text-primary">Foto de perfil</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-muted">
                      Aparece nos cards da home e nas listagens.
                    </p>
                    <label className="mt-3 inline-flex cursor-pointer rounded-xl bg-purple-deep px-4 py-2 text-sm font-medium text-white hover:bg-purple-light">
                      {uploadingRole === "profile"
                        ? "Enviando..."
                        : profilePhoto()
                          ? "Trocar foto de perfil"
                          : "Adicionar foto de perfil"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) uploadPhoto(file, "profile");
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gold/25 bg-bg-primary/50 p-4">
                <div className="space-y-3">
                  <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-border-subtle bg-bg-tertiary">
                    {coverPhoto() ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverPhoto()!.thumbUrl ?? coverPhoto()!.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-text-muted">
                        Sem capa
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-text-primary">Foto de capa</p>
                    <p className="mt-1 text-xs leading-relaxed text-text-muted">
                      Aparece no topo da página pública do seu perfil. Prefira uma imagem mais larga.
                    </p>
                    <label className="mt-3 inline-flex cursor-pointer rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-2 text-sm font-medium text-text-primary hover:border-purple-deep/40">
                      {uploadingRole === "cover"
                        ? "Enviando..."
                        : coverPhoto()
                          ? "Trocar foto de capa"
                          : "Adicionar foto de capa"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) uploadPhoto(file, "cover");
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
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

        <section id="redes-sociais" className="mt-8 scroll-mt-24 rounded-2xl border border-border-subtle bg-bg-secondary p-6">
          <h2 className="text-lg font-semibold text-text-primary">Redes sociais</h2>
          <p className="mt-1 text-sm text-text-muted">
            Adicione links externos para criar botões no seu perfil público. Deixe em branco para
            remover um botão.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {SOCIAL_LINK_OPTIONS.map(({ platform, label, placeholder }) => (
              <label key={platform} className="block">
                <span className="mb-1 block text-sm text-text-secondary">{label}</span>
                <input
                  type="url"
                  inputMode="url"
                  value={socialLinks[platform]}
                  onChange={(event) =>
                    setSocialLinks((current) => ({
                      ...current,
                      [platform]: event.target.value,
                    }))
                  }
                  placeholder={placeholder}
                  maxLength={500}
                  className={inputClass}
                />
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-text-muted">
            Por segurança, cada botão aceita somente links HTTPS do site correspondente.
          </p>
        </section>

        <section id="valores" className="mt-8 scroll-mt-24 rounded-2xl border border-border-subtle bg-bg-secondary p-6">
          <h2 className="text-lg font-semibold text-text-primary">Valores</h2>
          <p className="mt-1 text-sm text-text-muted">
            Defina seus preços e como eles aparecem no perfil público.
          </p>

          <div className="mt-4">
            <h3 className="text-sm font-medium text-text-primary">Exibição no perfil</h3>
            <p className="mt-1 text-sm text-text-secondary">
              Deseja exibir o valor cobrado por hora?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
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
                  onClick={() =>
                    setPricing((current) => ({ ...current, pricingDisplayMode: opt.value }))
                  }
                  className={`rounded-xl border px-4 py-2 text-sm ${
                    pricing.pricingDisplayMode === opt.value
                      ? "border-purple-deep bg-purple-deep/20 text-purple-light"
                      : "border-border-subtle text-text-secondary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {pricing.pricingDisplayMode === "show" && (
            <div className="mt-5">
              <h3 className="text-sm font-medium text-text-primary">Tabela de preços (R$)</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["thirtyMin", "30 minutos"],
                    ["oneHour", "1 hora"],
                    ["twoHours", "2 horas"],
                    ["overnight", "Pernoite"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="mb-1 block text-sm text-text-secondary">{label}</span>
                    <input
                      type="number"
                      min={0}
                      className={inputClass}
                      value={pricing[key] ?? ""}
                      onChange={(e) =>
                        setPricing((current) => ({
                          ...current,
                          [key]: e.target.value ? Number(e.target.value) : null,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={savePricing}
            disabled={savingPricing}
            className="mt-5 rounded-xl bg-purple-deep px-6 py-3 text-sm font-medium text-white hover:bg-purple-light disabled:opacity-50"
          >
            {savingPricing ? "Salvando..." : "Salvar valores"}
          </button>
        </section>

        <section id="horarios" className="mt-8 scroll-mt-24 rounded-2xl border border-border-subtle bg-bg-secondary p-6">
          <h2 className="text-lg font-semibold text-text-primary">Horários</h2>
          <p className="mt-1 text-sm text-text-muted">
            Informe quando você costuma estar disponível. Visitantes veem isso no perfil público.
          </p>

          <div className="mt-4 space-y-3">
            {availabilityDays.map((day, index) => (
              <div
                key={day.dayOfWeek}
                className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-bg-tertiary p-4 sm:flex-row sm:items-center"
              >
                <label className="flex min-w-[140px] items-center gap-2 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    checked={day.isAvailable}
                    onChange={(e) =>
                      updateAvailabilityDay(index, {
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
                      onChange={(e) => updateAvailabilityDay(index, { startTime: e.target.value })}
                      className="rounded-xl border border-border-subtle bg-bg-secondary px-3 py-2 text-sm text-text-primary"
                    />
                    <span className="text-text-muted">até</span>
                    <input
                      type="time"
                      value={day.endTime ?? ""}
                      onChange={(e) => updateAvailabilityDay(index, { endTime: e.target.value })}
                      className="rounded-xl border border-border-subtle bg-bg-secondary px-3 py-2 text-sm text-text-primary"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={saveAvailability}
            disabled={savingAvailability}
            className="mt-5 rounded-xl bg-purple-deep px-6 py-3 text-sm font-medium text-white hover:bg-purple-light disabled:opacity-50"
          >
            {savingAvailability ? "Salvando..." : "Salvar horários"}
          </button>
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
          <h2 className="text-lg font-semibold text-text-primary">Álbum de fotos</h2>
          <p className="mt-1 text-sm text-text-muted">
            Fotos extras da galeria pública. A foto de perfil e a foto de capa ficam em{" "}
            <a href="#fotos-principais" className="text-purple-light hover:underline">
              Completar perfil
            </a>
            .
            {profile?.status !== "approved" || !profile?.isPublic ? (
              <> A visibilidade na busca depende da moderação do perfil.</>
            ) : null}
          </p>

          <label className="mt-4 inline-flex cursor-pointer rounded-xl border border-dashed border-border-subtle px-6 py-4 text-sm text-text-secondary hover:border-purple-deep">
            {uploadingRole === "album" ? "Enviando..." : "Adicionar ao álbum"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) uploadPhoto(file, "album");
              }}
            />
          </label>

          {albumPhotos().length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {albumPhotos().map((photo, index, photos) => (
                <div key={photo.id} className="overflow-hidden rounded-xl border border-border-subtle">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.thumbUrl ?? photo.url}
                    alt=""
                    className="aspect-[3/4] w-full object-cover"
                  />
                  <div className="space-y-2 p-2">
                    <p className="text-center text-xs text-text-muted">Álbum</p>
                    <div className="flex flex-wrap justify-center gap-1">
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
          ) : (
            <p className="mt-4 text-sm text-text-muted">
              Nenhuma foto no álbum ainda. As fotos principais ficam acima, em Completar perfil.
            </p>
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
    </>
  );
}