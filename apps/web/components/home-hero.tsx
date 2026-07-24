import Link from "next/link";
import type { SiteSettings } from "@/lib/api";

export function HomeHero({ settings }: { settings: SiteSettings }) {
  return (
    <section className="relative overflow-hidden border-b border-border-subtle">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-deep/15 via-transparent to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-text-primary sm:text-4xl lg:text-5xl">
          {settings.heroTitlePrefix}{" "}
          <span className="bg-gradient-to-r from-purple-light to-gold bg-clip-text text-transparent">
            {settings.heroTitleHighlight}
          </span>
        </h1>
        <p className="mt-4 max-w-xl text-base text-text-secondary sm:text-lg">
          {settings.heroSubtitle}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#perfis"
            className="rounded-xl bg-purple-deep px-6 py-3 text-sm font-medium text-white hover:bg-purple-light"
          >
            Ver perfis
          </a>
          <Link
            href="/momentos"
            className="rounded-xl border border-border-subtle bg-bg-secondary px-6 py-3 text-sm font-medium text-text-primary hover:border-purple-deep/40"
          >
            Momentos
          </Link>
          <Link
            href="/cadastro"
            className="rounded-xl border border-gold/30 px-6 py-3 text-sm font-medium text-gold hover:bg-gold/10"
          >
            Anunciar perfil
          </Link>
        </div>

        <p className="mt-6 text-xs text-text-muted">
          Perfis ordenados pela sua localização quando disponível
        </p>
      </div>
    </section>
  );
}
