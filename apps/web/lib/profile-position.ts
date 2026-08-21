export const PROFILE_POSITIONS = [
  { value: "active", label: "Ativo" },
  { value: "passive", label: "Passivo" },
  { value: "versatile", label: "Versátil" },
  { value: "active_passive", label: "Ativo/Passivo" },
  { value: "active_liberal", label: "Ativo Liberal" },
] as const;

export type ProfilePositionValue = (typeof PROFILE_POSITIONS)[number]["value"];

const LABEL_BY_VALUE: Record<string, string> = Object.fromEntries(
  PROFILE_POSITIONS.map((item) => [item.value, item.label]),
);

export function profilePositionLabel(position?: string | null): string | null {
  if (!position) return null;
  return LABEL_BY_VALUE[position] ?? null;
}
