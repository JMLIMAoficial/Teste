export type ConsentChoices = {
  analytics: boolean;
  geo: boolean;
  timestamp: number;
};

const CONSENT_KEY = "platform_consent";
export const CONSENT_CHANGED_EVENT = "consent-changed";

export function getConsent(): ConsentChoices | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? (JSON.parse(raw) as ConsentChoices) : null;
  } catch {
    return null;
  }
}

export function setConsent(choices: Pick<ConsentChoices, "analytics" | "geo">) {
  const payload: ConsentChoices = { ...choices, timestamp: Date.now() };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
}

export function hasAnalyticsConsent(): boolean {
  return getConsent()?.analytics ?? false;
}

export function hasGeoConsent(): boolean {
  return getConsent()?.geo ?? false;
}

export function hasConsentDecision(): boolean {
  return getConsent() !== null;
}
