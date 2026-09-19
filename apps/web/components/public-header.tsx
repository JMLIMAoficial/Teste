import Link from "next/link";
import { MobileHeaderMenuButton } from "@/components/mobile-bottom-nav";

const navItems = [
  { label: "Garotos", href: "/" },
  { label: "Momentos", href: "/momentos" },
];

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#a65f0c]/50 bg-gradient-to-r from-[#e07012] via-[#d98916] to-[#c9971a] shadow-[0_4px_20px_rgba(180,90,10,0.25)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1a1408]/90">
            <span className="text-[10px] font-bold tracking-tight text-[#f5d78a]">CG</span>
          </div>
          <span className="truncate text-base font-semibold text-[#1a1408] sm:text-lg">
            Clube dos Garotos
          </span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex lg:justify-end">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-[#2a1c08]/85 transition-colors hover:bg-[#1a1408]/10 hover:text-[#1a1408]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <MobileHeaderMenuButton />
          <Link
            href="/cadastro"
            className="hidden rounded-xl border border-[#1a1408]/25 px-4 py-2 text-sm font-medium text-[#1a1408]/80 transition-colors hover:bg-[#1a1408]/10 hover:text-[#1a1408] sm:inline-flex lg:inline-flex"
          >
            Anunciar
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-[#1a1408] px-4 py-2 text-sm font-medium text-[#f5d78a] transition-colors hover:bg-[#2a1f0c]"
          >
            Entrar
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-border-subtle bg-bg-secondary">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-text-muted">
            © {new Date().getFullYear()} Clube dos Garotos. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-sm text-text-secondary">
            <Link href="/sobre" className="hover:text-text-primary">
              Sobre
            </Link>
            <Link href="/termos" className="hover:text-text-primary">
              Termos
            </Link>
            <Link href="/privacidade" className="hover:text-text-primary">
              Privacidade
            </Link>
            <Link href="/contato" className="hover:text-text-primary">
              Contato
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function PublicPageLayout({
  children,
  mainClassName = "flex-1",
}: {
  children: React.ReactNode;
  mainClassName?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <PublicHeader />
      <main className={mainClassName}>{children}</main>
      <PublicFooter />
    </div>
  );
}
