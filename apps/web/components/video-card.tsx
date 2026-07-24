import Link from "next/link";
import type { VideoItem } from "@/lib/api";

export function VideoCard({ video }: { video: VideoItem }) {
  const isVideo = video.mimeType.startsWith("video/");

  return (
    <Link
      href={video.profileSlug ? `/perfil/${video.profileSlug}` : "#"}
      className="group block overflow-hidden rounded-2xl border border-border-subtle bg-bg-secondary transition-all hover:border-purple-deep/30"
    >
      <div className="relative aspect-video overflow-hidden bg-bg-tertiary">
        {isVideo ? (
          <video
            src={video.url}
            className="h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-purple-900/60 to-orange-900/40">
            <span className="text-4xl text-text-muted">▶</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/80 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="font-semibold text-text-primary line-clamp-1">{video.title}</h3>
          <p className="text-xs text-text-secondary">
            {video.profileName}
            {video.city ? ` · ${video.city}` : ""}
          </p>
        </div>
      </div>
      <div className="flex gap-4 px-4 py-2 text-xs text-text-muted">
        <span>{video.viewCount} views</span>
        <span>{video.likeCount} curtidas</span>
      </div>
    </Link>
  );
}
