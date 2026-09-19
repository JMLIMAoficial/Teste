"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function PhotosIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4.5 5.25A2.75 2.75 0 0 1 7.25 2.5h9.5a2.75 2.75 0 0 1 2.75 2.75v13.5a2.75 2.75 0 0 1-2.75 2.75h-9.5A2.75 2.75 0 0 1 4.5 18.75V5.25Zm6.05 3.2a.9.9 0 0 0-1.35.78v5.54a.9.9 0 0 0 1.35.78l4.55-2.77a.9.9 0 0 0 0-1.56l-4.55-2.77Z" />
    </svg>
  );
}

function LoginIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3.5a4.25 4.25 0 1 1 0 8.5 4.25 4.25 0 0 1 0-8.5Zm0 1.7a2.55 2.55 0 1 0 0 5.1 2.55 2.55 0 0 0 0-5.1ZM12 13c3.9 0 7.25 2.35 8.55 5.7.25.65-.25 1.3-.95 1.3H4.4c-.7 0-1.2-.65-.95-1.3C4.75 15.35 8.1 13 12 13Zm0 1.7c-2.85 0-5.3 1.5-6.55 3.8h13.1C17.3 16.2 14.85 14.7 12 14.7Z" />
    </svg>
  );
}

function iconBtnClass(active: boolean) {
  return `inline-flex h-10 w-10 flex-col items-center justify-center rounded-xl transition-colors ${
    active
      ? "bg-[#1a1408] text-[#f5d78a]"
      : "bg-[#1a1408]/10 text-[#1a1408] hover:bg-[#1a1408]/20"
  }`;
}

/** Menu compacto no topo (mobile): Garotos, Momentos, Entrar. */
export function MobileTopIcons() {
  const pathname = usePathname();
  const onGarotos = pathname === "/";
  const onMomentos = pathname === "/momentos" || pathname.startsWith("/momentos/");
  const onLogin = pathname === "/login" || pathname.startsWith("/login/");

  return (
    <nav aria-label="Navegação principal" className="flex items-center gap-1.5 md:hidden">
      <Link href="/" className={iconBtnClass(onGarotos)} title="Garotos" aria-label="Garotos">
        <span className="text-lg leading-none" aria-hidden>
          🍆
        </span>
      </Link>
      <Link
        href="/momentos"
        className={iconBtnClass(onMomentos)}
        title="Momentos"
        aria-label="Momentos"
      >
        <PhotosIcon className="h-5 w-5" />
      </Link>
      <Link href="/login" className={iconBtnClass(onLogin)} title="Entrar" aria-label="Entrar">
        <LoginIcon className="h-5 w-5" />
      </Link>
    </nav>
  );
}
