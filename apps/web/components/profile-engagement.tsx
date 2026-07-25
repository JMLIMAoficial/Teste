"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type ReviewItem = {
  id: string;
  authorName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

type CommentItem = {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
};

type EngagementItem = {
  id: string;
  authorName: string;
  createdAt: string;
  rating?: number;
  text: string;
};

function mergeEngagement(reviews: ReviewItem[], comments: CommentItem[]): EngagementItem[] {
  const fromReviews: EngagementItem[] = reviews
    .filter((r) => r.comment?.trim() || r.rating)
    .map((r) => ({
      id: `review-${r.id}`,
      authorName: r.authorName,
      createdAt: r.createdAt,
      rating: r.rating,
      text: r.comment?.trim() || `${r.rating} estrela${r.rating !== 1 ? "s" : ""}`,
    }));

  const reviewTexts = new Set(
    fromReviews.map((r) => `${r.authorName}:${r.text}`.toLowerCase()),
  );

  const fromComments: EngagementItem[] = comments
    .filter((c) => !reviewTexts.has(`${c.authorName}:${c.content.trim()}`.toLowerCase()))
    .map((c) => ({
      id: `comment-${c.id}`,
      authorName: c.authorName,
      createdAt: c.createdAt,
      text: c.content,
    }));

  return [...fromReviews, ...fromComments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function ProfileEngagement({
  profileId,
  initialReviews,
  initialSummary,
  initialComments,
}: {
  profileId: string;
  slug: string;
  initialReviews: ReviewItem[];
  initialSummary: { averageRating: number; reviewCount: number } | null;
  initialComments: CommentItem[];
}) {
  const { toast } = useToast();
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");

  const items = useMemo(
    () => mergeEngagement(initialReviews, initialComments),
    [initialReviews, initialComments],
  );

  async function submitEngagement(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      toast("Escreva um comentário antes de enviar.", "error");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/v1/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          authorName,
          rating,
          comment: trimmed,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Erro ao enviar");

      toast(json.message ?? "Comentário enviado para moderação.", "success");
      setText("");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao enviar comentário", "error");
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-border-subtle bg-bg-secondary p-6">
      <h2 className="text-lg font-semibold text-text-primary">Comentários</h2>
      {initialSummary && initialSummary.reviewCount > 0 && (
        <p className="mt-1 text-sm text-text-secondary">
          ★ {initialSummary.averageRating.toFixed(1)} · {initialSummary.reviewCount} avaliação
          {initialSummary.reviewCount !== 1 ? "ões" : ""}
        </p>
      )}

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl bg-bg-tertiary p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-text-primary">{item.authorName}</span>
              {item.rating != null && (
                <span className="shrink-0 text-gold" aria-label={`${item.rating} estrelas`}>
                  {"★".repeat(item.rating)}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-text-secondary">{item.text}</p>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-text-muted">Nenhum comentário ainda. Seja o primeiro!</p>
        )}
      </div>

      <form onSubmit={submitEngagement} className="mt-6 space-y-3 border-t border-border-subtle pt-6">
        <h3 className="text-sm font-medium text-text-primary">Deixe seu comentário</h3>
        <input
          type="text"
          placeholder="Seu nome"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          required
          className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-2 text-sm text-text-primary"
        />
        <select
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-2 text-sm text-text-primary"
          aria-label="Nota"
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} estrela{n > 1 ? "s" : ""}
            </option>
          ))}
        </select>
        <textarea
          placeholder="Seu comentário"
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          rows={3}
          className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-2 text-sm text-text-primary"
        />
        <button
          type="submit"
          className="rounded-xl bg-purple-deep px-4 py-2 text-sm font-medium text-white hover:bg-purple-light"
        >
          Enviar comentário
        </button>
      </form>
    </section>
  );
}
