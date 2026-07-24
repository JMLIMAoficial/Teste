"use client";

import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function ProfileEngagement({
  profileId,
  slug,
  initialReviews,
  initialSummary,
  initialComments,
}: {
  profileId: string;
  slug: string;
  initialReviews: Array<{
    id: string;
    authorName: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  }>;
  initialSummary: { averageRating: number; reviewCount: number } | null;
  initialComments: Array<{ id: string; authorName: string; content: string; createdAt: string }>;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [summary, setSummary] = useState(initialSummary);
  const [comments, setComments] = useState(initialComments);
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [commentText, setCommentText] = useState("");
  const [message, setMessage] = useState("");

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    try {
      const res = await fetch(`${API_URL}/api/v1/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          authorName,
          rating,
          comment: reviewComment || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Erro ao enviar");
      setMessage(json.message ?? "Avaliação enviada para moderação.");
      setReviewComment("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro ao enviar avaliação");
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    try {
      const res = await fetch(`${API_URL}/api/v1/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "profile",
          targetId: profileId,
          authorName,
          content: commentText,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Erro ao enviar");
      setMessage(json.message ?? "Comentário enviado para moderação.");
      setCommentText("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Erro ao enviar comentário");
    }
  }

  return (
    <div className="mt-8 space-y-8">
      {message && (
        <p className="rounded-xl border border-border-subtle bg-bg-tertiary p-3 text-sm text-text-secondary">
          {message}
        </p>
      )}

      <section className="rounded-2xl border border-border-subtle bg-bg-secondary p-6">
        <h2 className="text-lg font-semibold text-text-primary">Avaliações</h2>
        {summary && (
          <p className="mt-1 text-sm text-text-secondary">
            ★ {summary.averageRating.toFixed(1)} · {summary.reviewCount} avaliação
            {summary.reviewCount !== 1 ? "ões" : ""}
          </p>
        )}
        <div className="mt-4 space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl bg-bg-tertiary p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium text-text-primary">{r.authorName}</span>
                <span className="text-gold">{"★".repeat(r.rating)}</span>
              </div>
              {r.comment && <p className="mt-2 text-sm text-text-secondary">{r.comment}</p>}
            </div>
          ))}
          {reviews.length === 0 && (
            <p className="text-sm text-text-muted">Nenhuma avaliação ainda.</p>
          )}
        </div>

        <form onSubmit={submitReview} className="mt-6 space-y-3 border-t border-border-subtle pt-6">
          <h3 className="text-sm font-medium text-text-primary">Deixe sua avaliação</h3>
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
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} estrela{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
          <textarea
            placeholder="Comentário (opcional)"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-2 text-sm text-text-primary"
          />
          <button
            type="submit"
            className="rounded-xl bg-purple-deep px-4 py-2 text-sm font-medium text-white hover:bg-purple-light"
          >
            Enviar avaliação
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-border-subtle bg-bg-secondary p-6">
        <h2 className="text-lg font-semibold text-text-primary">Comentários</h2>
        <div className="mt-4 space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="rounded-xl bg-bg-tertiary p-4">
              <span className="font-medium text-text-primary">{c.authorName}</span>
              <p className="mt-1 text-sm text-text-secondary">{c.content}</p>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-sm text-text-muted">Nenhum comentário ainda.</p>
          )}
        </div>

        <form onSubmit={submitComment} className="mt-6 space-y-3 border-t border-border-subtle pt-6">
          <h3 className="text-sm font-medium text-text-primary">Comentar</h3>
          <input
            type="text"
            placeholder="Seu nome"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            required
            className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-2 text-sm text-text-primary"
          />
          <textarea
            placeholder="Seu comentário"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            required
            rows={2}
            className="w-full rounded-xl border border-border-subtle bg-bg-tertiary px-4 py-2 text-sm text-text-primary"
          />
          <button
            type="submit"
            className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            Enviar comentário
          </button>
        </form>
      </section>
    </div>
  );
}
