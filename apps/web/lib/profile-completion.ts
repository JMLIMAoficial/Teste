export type ProfileCompletionCheck = {
  key: string;
  label: string;
  done: boolean;
};

export type ProfileCompletion = {
  percent: number;
  readyForReview: boolean;
  missing: string[];
  checks: ProfileCompletionCheck[];
};

type ProfileForCompletion = {
  birthDate?: string | null;
  bio?: string | null;
  sexualPreference?: string | null;
  position?: string | null;
  penisSizeCm?: number | null;
  city?: string;
  state?: string;
  hasLocation?: boolean;
  hasWhatsApp?: boolean;
  photos?: unknown[];
  tags?: unknown[];
  tagIds?: string[];
};

export function computeProfileCompletion(profile: ProfileForCompletion): ProfileCompletion {
  const hasAnyPhoto = (profile.photos?.length ?? 0) > 0;
  const tagCount = profile.tags?.length ?? profile.tagIds?.length ?? 0;

  const checks: ProfileCompletionCheck[] = [
    { key: "birthDate", label: "Data de nascimento", done: !!profile.birthDate },
    { key: "bio", label: "Descrição / biografia", done: (profile.bio?.trim().length ?? 0) >= 20 },
    { key: "preference", label: "Preferência sexual", done: !!profile.sexualPreference },
    { key: "position", label: "Posição", done: !!profile.position },
    { key: "penisSizeCm", label: "Dote (cm)", done: profile.penisSizeCm != null },
    {
      key: "location",
      label: "Cidade e estado",
      done: !!(profile.city && profile.state),
    },
    { key: "cep", label: "CEP (proximidade)", done: !!profile.hasLocation },
    { key: "photo", label: "Pelo menos 1 foto", done: hasAnyPhoto },
    { key: "tags", label: "Tags do perfil", done: tagCount > 0 },
    { key: "whatsapp", label: "WhatsApp", done: !!profile.hasWhatsApp },
  ];

  const doneCount = checks.filter((c) => c.done).length;
  const missing = checks.filter((c) => !c.done).map((c) => c.label);

  return {
    percent: Math.round((doneCount / checks.length) * 100),
    readyForReview: doneCount === checks.length && hasAnyPhoto,
    missing,
    checks,
  };
}

export function getProfileCompletion(profile: ProfileForCompletion & { completion?: ProfileCompletion }) {
  return profile.completion ?? computeProfileCompletion(profile);
}
