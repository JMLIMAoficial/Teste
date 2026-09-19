"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MomentUploadFab } from "@/components/moment-upload-fab";
import { NotificationBell } from "@/components/notification-bell";

type NavItem = {
  href: string;
  label: string;
  short: string;
  hint?: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/painel", label: "Visão geral", short: "Início" },
  { href: "/painel/momentos", label: "Momentos", short: "Momentos" },
  { href: "/painel/perfil", label: "Editar perfil", short: "Perfil" },
  { href: "/painel/fotos", label: "Fotos", short: "Fotos" },
  { href: "/painel/videos", label: "Vídeos", short: "Vídeos" },
  { href: "/painel/verificacao", label: "Verificação", short: "Verif." },
  { href: "/painel/notificacoes", label: "Notificações", short: "Alertas" },
  { href: "/painel/mensagens", label: "Mensagens", short: "Mensagens", hint: "Administração" },
  { href: "/painel/status", label: "Premium & Destaque", short: "Status" },
  { href: "/painel/preview", label: "Pré-visualizar", short: "Prévia" },
];

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-xl px-3 py-2.5 text-sm transition-colors ${
        active
          ? "bg-purple-deep/20 font-medium text-purple-light"
          : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
      }`}
    >
      {label}
    </Link>
  );
}

function PainelFullscreenMenu({
  open,
  onClose,
  onLogout,
  isActive,
}: {
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  isActive: (href: string) => boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      id="painel-full-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu do painel"
      className="fixed inset-0 z-[80] flex flex-col bg-bg-primary md:hidden"
    >
      <div className="flex items-center justify-between border-b border-border-subtle bg-bg-secondary px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="text-lg font-semibold text-text-primary">Menu</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border-subtle text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <ul className="mx-auto flex max-w-lg flex-col gap-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-4 transition-colors ${
                    active
                      ? "border-purple-deep/50 bg-purple-deep/15 text-purple-light"
                      : "border-border-subtle bg-bg-secondary text-text-primary hover:border-purple-deep/30"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-base font-semibold">{item.label}</span>
                    {item.hint && (
                      <span className="mt-0.5 block text-sm text-text-muted">{item.hint}</span>
                    )}
                  </span>
                  <span className="text-text-muted" aria-hidden>
                    ›
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={() => {
            onClose();
            onLogout();
          }}
          className="mx-auto mt-6 flex w-full max-w-lg items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3.5 text-sm font-medium text-red-400"
        >
          Sair da conta
        </button>
      </div>
    </div>
  );
}

export function PainelShell({
  children,
  onLogout,
}: {
  children: React.ReactNode;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/painel") return pathname === "/painel";
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="border-b border-border-subtle bg-bg-secondary">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4">
          <Link href="/painel" className="shrink-0 font-semibold text-text-primary">
            ← Meu painel
          </Link>
          <p className="hidden text-sm font-medium text-text-primary sm:block">Meu painel</p>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-expanded={menuOpen}
              aria-controls="painel-full-menu"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-bg-tertiary px-3 py-2 text-sm font-semibold text-text-primary md:hidden"
            >
              <MenuIcon className="h-4 w-4" />
              Menu
            </button>
            <NotificationBell href="/painel/notificacoes" />
            <button
              type="button"
              onClick={onLogout}
              className="hidden text-sm text-text-secondary hover:text-text-primary sm:inline"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <PainelFullscreenMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onLogout={onLogout}
        isActive={isActive}
      />

      <div className="mx-auto flex max-w-6xl gap-8 px-4 py-8">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="sticky top-8 space-y-1">
            {NAV_ITEMS.map((item) => (
              <div key={item.href}>
                <NavLink href={item.href} label={item.label} active={isActive(item.href)} />
                {item.hint && !isActive(item.href) && (
                  <p className="ml-3 mt-0.5 text-[10px] text-text-muted">{item.hint}</p>
                )}
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-24">{children}</main>
      </div>
      <MomentUploadFab />
    </div>
  );
}
