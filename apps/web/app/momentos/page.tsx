import Link from "next/link";
import { MomentsFeed } from "@/components/moments-stories";
import { PublicPageLayout } from "@/components/public-header";
import { fetchMomentsFeed } from "@/lib/api";

export default async function MomentosPage() {
  const { moments, total, source } = await fetchMomentsFeed(40);

  return (
    <PublicPageLayout mainClassName="mx-auto flex-1 max-w-7xl px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">Momentos</h1>
        <p className="mt-1 text-sm text-text-muted">
          {total} momento{total !== 1 ? "s" : ""} · {source === "api" ? "Ao vivo" : "Sem momentos"}
        </p>

        {moments.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-border-subtle bg-bg-secondary p-8 text-center">
            <p className="text-text-secondary">Nenhum momento publicado ainda.</p>
            <Link href="/" className="mt-4 inline-block text-sm text-purple-light">
              Voltar ao início
            </Link>
          </div>
        ) : (
          <div className="mt-4">
            <MomentsFeed moments={moments} variant="page" />
          </div>
        )}
    </PublicPageLayout>
  );
}
