"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

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

const tabs: Array<{
  href: string;
  label: string;
  exact: boolean;
  icon: ReactNode;
}> = [
  {
    href: "/",
    label: "Garotos",
    exact: true,
    icon: (
      <span className="text-[1.15rem] leading-none" role="img" aria-label="Berinjela">
        🍆
      </span>
    ),
  },
  {
    href: "/momentos",
    label: "Momentos",
    exact: false,
    icon: <PhotosIcon className="h-5 w-5" />,
  },
];

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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto flex max-w-lg bg-black">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href, tab.exact);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
                active ? "text-gold" : "text-white/55 hover:text-white/80"
              }`}
            >
              <span className="flex h-5 w-5 items-center justify-center" aria-hidden>
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
