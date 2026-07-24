"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NotificationBell } from "@/components/notification-bell";
import { logout } from "@/lib/auth";

const NAV_ITEMS = [
  { href: "/admin", label: "Visão geral", exact: true },
  { href: "/admin/perfis", label: "Perfis" },
  { href: "/admin/moderacao", label: "Moderação" },
  { href: "/admin/denuncias", label: "Denúncias" },
  { href: "/admin/verificacoes", label: "Verificações" },
  { href: "/admin/mensagens", label: "Mensagens" },
  { href: "/admin/configuracoes", label: "Configurações" },
  { href: "/admin/auditoria", label: "Auditoria" },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="border-b border-border-subtle bg-bg-secondary">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/admin" className="shrink-0 font-semibold text-text-primary">
            Admin
          </Link>
          <div className="flex items-center gap-3">
            <NotificationBell href="/admin" />
            <Link href="/" className="hidden text-sm text-text-secondary hover:text-text-primary sm:inline">
              Site
            </Link>
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              Sair
            </button>
          </div>
        </div>
        <nav className="border-t border-border-subtle">
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm transition-colors ${
                  isActive(item.href, "exact" in item ? item.exact : false)
                    ? "bg-purple-deep/20 font-medium text-purple-light"
                    : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
