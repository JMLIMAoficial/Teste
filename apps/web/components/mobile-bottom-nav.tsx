"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Início", icon: "🏠", exact: true },
  { href: "/busca", label: "Buscar", icon: "🔍", exact: false },
  { href: "/momentos", label: "Momentos", icon: "✨", exact: false },
  { href: "/rankings", label: "Rankings", icon: "🏆", exact: false },
] as const;

const HIDDEN_PREFIXES = ["/painel", "/admin", "/login", "/cadastro"];

function isActive(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();

  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-bg-primary/95 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto flex max-w-lg">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href, tab.exact);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                active ? "text-purple-light" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <span className="text-lg leading-none" aria-hidden="true">
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function useShowMobileNav() {
  const pathname = usePathname();
  return !HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
