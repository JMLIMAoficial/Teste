"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  { href: "/painel/valores", label: "Valores", short: "Valores" },
  { href: "/painel/horarios", label: "Horários", short: "Horários" },
  { href: "/painel/verificacao", label: "Verificação", short: "Verif." },
  { href: "/painel/notificacoes", label: "Notificações", short: "Alertas" },
  { href: "/painel/mensagens", label: "Mensagens", short: "Mensagens", hint: "Administração" },
  { href: "/painel/status", label: "Premium & Destaque", short: "Status" },
  { href: "/painel/preview", label: "Pré-visualizar", short: "Prévia" },
];

function NavLink({
  href,
  label,
  active,
  compact = false,
}: {
  href: string;
  label: string;
  active: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-xl px-3 py-2.5 text-sm transition-colors ${
        compact ? "whitespace-nowrap" : ""
      } ${
        active
          ? "bg-purple-deep/20 font-medium text-purple-light"
          : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
      }`}
    >
      {label}
    </Link>
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

  function isActive(href: string) {
    if (href === "/painel") return pathname === "/painel";
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <header className="border-b border-border-subtle bg-bg-secondary">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/painel" className="shrink-0 font-semibold text-text-primary">
            ← Meu painel
          </Link>
          <p className="hidden text-sm font-medium text-text-primary sm:block">Meu painel</p>
          <div className="flex items-center gap-3">
            <NotificationBell href="/painel/notificacoes" />
            <button
              type="button"
              onClick={onLogout}
              className="text-sm text-text-secondary hover:text-text-primary"
            >
              Sair
            </button>
          </div>
        </div>

        <nav className="border-t border-border-subtle md:hidden">
          <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.short}
                active={isActive(item.href)}
                compact
              />
            ))}
          </div>
        </nav>
      </header>

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
