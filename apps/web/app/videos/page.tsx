import Link from "next/link";
import { PublicFooter, PublicHeader } from "@/components/public-header";
import { VideoCard } from "@/components/video-card";
import { fetchVideos } from "@/lib/api";

export default async function VideosPage() {
  const { videos, total, source } = await fetchVideos(24);

  return (
    <div className="min-h-screen bg-bg-primary">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-bold text-text-primary">Galeria de Vídeos</h1>
        <p className="mt-2 text-text-secondary">
          Vídeos das acompanhantes da plataforma.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          {total} vídeo{total !== 1 ? "s" : ""} · {source === "api" ? "Dados da API" : "Sem vídeos"}
        </p>

        {videos.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-border-subtle bg-bg-secondary p-8 text-center">
            <p className="text-text-secondary">Nenhum vídeo publicado ainda.</p>
            <Link href="/" className="mt-4 inline-block text-sm text-purple-light">
              Voltar ao início
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
