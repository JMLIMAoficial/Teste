import { getAccessToken } from "@/lib/auth";
import { hasAnalyticsConsent } from "@/lib/consent";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function uploadCompanionMoment(file: File, caption?: string) {
  const form = new FormData();
  form.append("file", file);
  if (caption?.trim()) form.append("caption", caption.trim());

  const token = getAccessToken();
  const res = await fetch(`${API_URL}/api/v1/companion/moments`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Falha no upload");
  }

  return res.json();
}

export function getVisitorId() {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("visitor_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("visitor_id", id);
  }
  return id;
}

export async function trackMomentView(momentId: string) {
  if (typeof window === "undefined") return;
  if (!hasAnalyticsConsent()) return;

  const key = `moment_view_${momentId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");

  try {
    await fetch(`${API_URL}/api/v1/moments/${momentId}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: getVisitorId() }),
    });
  } catch {
    /* ignore */
  }
}

export type MomentStats = {
  totalMoments: number;
  approvedMoments: number;
  pendingMoments: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
};

export type OwnMomentItem = {
  id: string;
  caption?: string | null;
  status: string;
  mediaType: string;
  url: string;
  mimeType: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
};
