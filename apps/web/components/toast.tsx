"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4500;

function toneClasses(tone: ToastTone) {
  if (tone === "success") {
    return "border-success/35 bg-bg-secondary text-success shadow-[0_8px_32px_rgba(0,0,0,0.35)]";
  }
  if (tone === "error") {
    return "border-red-500/35 bg-bg-secondary text-red-400 shadow-[0_8px_32px_rgba(0,0,0,0.35)]";
  }
  return "border-border-subtle bg-bg-secondary text-text-secondary shadow-[0_8px_32px_rgba(0,0,0,0.35)]";
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((message: string, tone: ToastTone = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setItems((prev) => [...prev.slice(-4), { id, message, tone }]);
  }, []);

  useEffect(() => {
    if (items.length === 0) return;

    const timers = items.map((item) =>
      window.setTimeout(() => dismiss(item.id), AUTO_DISMISS_MS),
    );

    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [items, dismiss]);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2 md:bottom-6 md:right-6"
        aria-live="polite"
        aria-relevant="additions"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto animate-[toast-in_0.25s_ease-out] rounded-xl border px-4 py-3 text-sm leading-snug ${toneClasses(item.tone)}`}
          >
            <div className="flex items-start gap-3">
              <p className="min-w-0 flex-1">{item.message}</p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="shrink-0 text-xs text-text-muted transition-colors hover:text-text-primary"
                aria-label="Fechar aviso"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

/** Infer success/error from common Portuguese message patterns. */
export function toastToneFromMessage(message: string): ToastTone {
  const lower = message.toLowerCase();
  if (
    lower.includes("erro") ||
    lower.includes("falha") ||
    lower.includes("inválid") ||
    lower.includes("nao foi") ||
    lower.includes("não foi") ||
    lower.includes("obrigatório")
  ) {
    return "error";
  }
  if (
    lower.includes("sucesso") ||
    lower.includes("salvo") ||
    lower.includes("enviado") ||
    lower.includes("adicionad") ||
    lower.includes("atualizad") ||
    lower.includes("excluíd") ||
    lower.includes("aprovad")
  ) {
    return "success";
  }
  return "info";
}
