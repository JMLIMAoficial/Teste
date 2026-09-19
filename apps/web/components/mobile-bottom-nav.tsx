"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

function PhotosIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="14" height="12" rx="2" />
      <path d="M7 19h10a2 2 0 0 0 2-2V9" />
      <circle cx="8.5" cy="10" r="1.2" fill="currentColor" stroke="none" />
      <path d="m7 15 2.5-2.5L12 15l2-2 3 3" />
    </svg>
  );
}

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

const menuItems: Array<{
  href: string;
  label: string;
  exact?: boolean;
  icon: ReactNode;
  description?: string;
}> = [
  {
    href: "/",
    label: "Garotos",
    exact: true,
    icon: (
      <span className="text-2xl leading-none" role="img" aria-label="Berinjela">
        🍆
      </span>
    ),
    description: "Perfis perto de você",
  },
  {
    href: "/momentos",
    label: "Momentos",
    icon: <PhotosIcon className="h-7 w-7" />,
    description: "Fotos e stories dos anunciantes",
  },
  {
    href: "/busca",
    label: "Busca",
    icon: <span className="text-xl font-semibold">⌕</span>,
    description: "Filtros e pesquisa avançada",
  },
  {
    href: "/cadastro",
    label: "Anunciar",
    icon: <span className="text-xl font-semibold">+</span>,
    description: "Criar seu perfil",
  },
  {
    href: "/login",
    label: "Entrar",
    icon: <span className="text-xl font-semibold">→</span>,
    description: "Acessar o painel",
  },
];

const HIDDEN_PREFIXES = ["/painel", "/admin"];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function FullscreenMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

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
      id="mobile-full-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="fixed inset-0 z-[80] flex flex-col bg-black lg:hidden"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="text-lg font-semibold text-white">Menu</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-white hover:bg-white/10"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <ul className="mx-auto flex max-w-lg flex-col gap-2">
          {menuItems.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-4 rounded-2xl border px-4 py-4 transition-colors ${
                    active
                      ? "border-gold/50 bg-gold/10 text-gold"
                      : "border-white/10 bg-white/5 text-white hover:border-white/25 hover:bg-white/10"
                  }`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/40">
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold">{item.label}</span>
                    {item.description && (
                      <span className="mt-0.5 block text-sm text-white/55">{item.description}</span>
                    )}
                  </span>
                  <span className="text-white/35" aria-hidden>
                    ›
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

/** Botão Menu no header (mobile/tablet). */
export function MobileHeaderMenuButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="mobile-full-menu"
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#1a1408]/25 bg-[#1a1408]/10 px-3 py-2 text-sm font-semibold text-[#1a1408] lg:hidden"
      >
        <MenuIcon className="h-4 w-4" />
        Menu
      </button>
      <FullscreenMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Barra inferior com Menu (mobile/tablet). */
export function MobileBottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="mx-auto flex max-w-lg bg-black">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="mobile-full-menu"
            className="flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium text-white transition-colors hover:text-gold"
          >
            <MenuIcon className="h-5 w-5" />
            Menu
          </button>
        </div>
      </nav>
      <FullscreenMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function useShowMobileNav() {
  const pathname = usePathname();
  return !HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
