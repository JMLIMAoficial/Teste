"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function MomentsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.2 13.7 8.3 19.8 10 13.7 11.7 12 17.8 10.3 11.7 4.2 10 10.3 8.3 12 2.2Zm6.2 10.3 1 3.4 3.4 1-3.4 1-1 3.4-1-3.4-3.4-1 3.4-1 1-3.4Zm-13.1.9.75 2.55 2.55.75-2.55.75-.75 2.55-.75-2.55-2.55-.75 2.55-.75.75-2.55Z" />
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
      ? "bg-white/40 text-[#1a1408]"
      : "text-[#1a1408]/70 hover:bg-[#1a1408]/10 hover:text-[#1a1408]"
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
        <MomentsIcon className="h-5 w-5" />
      </Link>
      <Link href="/login" className={iconBtnClass(onLogin)} title="Entrar" aria-label="Entrar">
        <LoginIcon className="h-5 w-5" />
      </Link>
    </nav>
  );
}
