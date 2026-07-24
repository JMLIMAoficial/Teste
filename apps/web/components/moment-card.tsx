"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MomentItem } from "@/lib/api";
import { trackMomentView } from "@/lib/moment-upload";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function getVisitorId() {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("visitor_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("visitor_id", id);
  }
  return id;
}

export function MomentCard({ moment }: { moment: MomentItem }) {
  const [likes, setLikes] = useState(moment.likeCount);
  const [liked, setLiked] = useState(false);
  const isVideo = moment.mediaType === "video" || moment.mimeType.startsWith("video/");

  useEffect(() => {
    trackMomentView(moment.id);
  }, [moment.id]);

  async function toggleLike() {
    const visitorId = getVisitorId();
    try {
      const res = await fetch(`${API_URL}/api/v1/likes/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "moment",
          targetId: moment.id,
          visitorId,
        }),
      });
      if (!res.ok) return;
      const json = await res.json();
      setLiked(json.liked);
      setLikes((n) => (json.liked ? n + 1 : Math.max(0, n - 1)));
    } catch {
      /* ignore */
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-border-subtle bg-bg-secondary">
      <div className="relative aspect-[4/5] overflow-hidden bg-bg-tertiary">
        {isVideo ? (
          <video src={moment.url} className="h-full w-full object-cover" controls playsInline />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={moment.url} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="p-4">
        <Link
          href={`/perfil/${moment.profileSlug}`}
          className="font-semibold text-text-primary hover:text-purple-light"
        >
          {moment.profileName}
        </Link>
        {moment.city && <p className="text-xs text-text-muted">{moment.city}</p>}
        {moment.caption && <p className="mt-2 text-sm text-text-secondary">{moment.caption}</p>}
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={toggleLike}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              liked
                ? "bg-purple-deep/30 text-purple-light"
                : "bg-bg-tertiary text-text-secondary hover:text-text-primary"
            }`}
          >
            ♥ {likes}
          </button>
          <span className="text-xs text-text-muted">{moment.viewCount} views</span>
        </div>
      </div>
    </article>
  );
}
