"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CONSENT_CHANGED_EVENT,
  hasConsentDecision,
  setConsent,
} from "@/lib/consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!hasConsentDecision());

    function onConsentChanged() {
      setVisible(!hasConsentDecision());
    }

    window.addEventListener(CONSENT_CHANGED_EVENT, onConsentChanged);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onConsentChanged);
  }, []);

  if (!visible) return null;

  function acceptAll() {
    setConsent({ analytics: true, geo: true });
    setVisible(false);
  }

  function acceptEssential() {
    setConsent({ analytics: false, geo: false });
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      className="fixed inset-x-0 bottom-[calc(3.25rem+env(safe-area-inset-bottom))] z-50 border-t border-border-subtle bg-bg-secondary/95 p-4 shadow-[0_-8px_32px_rgba(0,0,0,0.45)] md:bottom-0 md:backdrop-blur sm:p-6"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="cookie-consent-title" className="text-sm font-semibold text-text-primary">
            Privacidade e cookies
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Usamos cookies e dados locais para analytics, geolocalização (perfis próximos) e
            melhorar sua experiência. Você pode aceitar tudo ou usar apenas o essencial.{" "}
            <Link href="/privacidade" className="text-purple-light underline-offset-2 hover:underline">
              Política de privacidade
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={acceptEssential}
            className="rounded-xl border border-border-subtle px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary"
          >
            Apenas essencial
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="rounded-xl bg-purple-deep px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-light"
          >
            Aceitar tudo
          </button>
        </div>
      </div>
    </div>
  );
}
