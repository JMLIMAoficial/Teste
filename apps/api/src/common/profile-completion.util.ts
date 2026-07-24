export type ProfileCompletionResult = {
  percent: number;
  readyForReview: boolean;
  missing: string[];
};

type ProfileForCompletion = {
  birthDate: Date | null;
  bio: string | null;
  sexualPreference: string | null;
  position: string | null;
  penisSizeCm: number | null;
  location: {
    city: string;
    state: string;
    latitude?: unknown;
    longitude?: unknown;
  } | null;
  photos: unknown[];
  tags: unknown[];
  whatsapp: string | null;
};

export function computeProfileCompletion(profile: ProfileForCompletion): ProfileCompletionResult {
  const hasAnyPhoto = profile.photos.length > 0;

  const checks = [
    { done: !!profile.birthDate, label: 'Data de nascimento' },
    { done: (profile.bio?.trim().length ?? 0) >= 20, label: 'Descrição / biografia' },
    { done: !!profile.sexualPreference, label: 'Preferência sexual' },
    { done: !!profile.position, label: 'Posição' },
    { done: profile.penisSizeCm != null, label: 'Dote (cm)' },
    { done: !!(profile.location?.city && profile.location?.state), label: 'Cidade e estado' },
    {
      done: !!(profile.location?.latitude && profile.location?.longitude),
      label: 'CEP (proximidade)',
    },
    { done: hasAnyPhoto, label: 'Pelo menos 1 foto' },
    { done: profile.tags.length > 0, label: 'Tags do perfil' },
    { done: !!profile.whatsapp, label: 'WhatsApp' },
  ];

  const doneCount = checks.filter((c) => c.done).length;
  const missing = checks.filter((c) => !c.done).map((c) => c.label);

  return {
    percent: Math.round((doneCount / checks.length) * 100),
    readyForReview: doneCount === checks.length && hasAnyPhoto,
    missing,
  };
}
