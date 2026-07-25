import Link from "next/link";

const navItems = [
  { label: "Início", href: "/" },
  { label: "Momentos", href: "/momentos" },
];

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-bg-primary/95 md:bg-bg-primary/80 md:backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-deep to-purple-light">
            <span className="text-sm font-bold text-white">A</span>
          </div>
          <span className="hidden text-lg font-semibold text-text-primary sm:block">
            Acompanhante
          </span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex lg:justify-end">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/cadastro"
          className="hidden rounded-xl border border-border-subtle px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-text-primary sm:inline-flex"
        >
          Anunciar
        </Link>
        <Link
          href="/login"
          className="rounded-xl bg-purple-deep px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-light"
        >
          Entrar
        </Link>
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
            © {new Date().getFullYear()} Acompanhante. Todos os direitos reservados.
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
