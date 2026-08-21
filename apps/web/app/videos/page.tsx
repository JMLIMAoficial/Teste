import type { Metadata } from "next";
import Link from "next/link";
import { PublicPageLayout } from "@/components/public-header";
import { VideoCard } from "@/components/video-card";
import { fetchSeoMeta, fetchVideos } from "@/lib/api";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await fetchSeoMeta("videos");
  return {
    title: meta?.title ?? "Vídeos de garotos de programa",
    description:
      meta?.description ??
      "Galeria de vídeos de garotos de programa no Clube dos Garotos.",
    alternates: meta?.canonical ? { canonical: meta.canonical } : undefined,
  };
}

export default async function VideosPage() {
  const { videos, total, source } = await fetchVideos(24);

  return (
    <PublicPageLayout mainClassName="mx-auto flex-1 max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-text-primary">Vídeos de garotos de programa</h1>
      <p className="mt-2 text-text-secondary">
        Galeria com vídeos publicados por anunciantes do Clube dos Garotos.
      </p>
      <p className="mt-2 text-sm text-text-muted">
        {total} vídeo{total !== 1 ? "s" : ""} · {source === "api" ? "Ao vivo" : "Sem vídeos"}
      </p>

      {videos.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-border-subtle bg-bg-secondary p-8 text-center">
          <p className="text-text-secondary">Nenhum vídeo publicado ainda.</p>
          <Link href="/" className="mt-4 inline-block text-sm text-purple-light">
            Voltar aos garotos
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} linkToProfile />
          ))}
        </div>
      )}
    </PublicPageLayout>
  );
}
