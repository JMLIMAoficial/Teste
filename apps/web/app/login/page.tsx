"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PublicFooter, PublicHeader } from "@/components/public-header";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await login(email, password);
      if (user.roles.includes("admin") || user.roles.includes("moderator")) {
        router.push("/admin");
      } else {
        router.push("/painel");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao entrar";
      setError(
        msg.includes("fetch") || msg.includes("Timeout")
          ? "Não foi possível conectar à API. Verifique se ela está rodando (npm run dev:api)."
          : msg,
      );
      setLoading(false);
      return;
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <PublicHeader />
      <main className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <h1 className="text-3xl font-bold text-text-primary">Entrar</h1>
        <p className="mt-2 text-text-secondary">Acesse sua conta de acompanhante ou admin.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-border-subtle bg-bg-secondary px-4 py-3 text-text-primary focus:border-purple-deep focus:outline-none"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">Senha</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border-subtle bg-bg-secondary px-4 py-3 text-text-primary focus:border-purple-deep focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-purple-deep py-3 font-medium text-white transition-colors hover:bg-purple-light disabled:opacity-50"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Não tem conta?{" "}
          <Link href="/cadastro" className="text-purple-light hover:underline">
            Cadastre-se
          </Link>
        </p>

        {process.env.NODE_ENV === "development" && (
          <div className="mt-8 space-y-3 rounded-xl border border-border-subtle bg-bg-secondary p-4 text-xs text-text-muted">
            <div>
              <p className="font-medium text-text-secondary">Demo admin</p>
              <p>admin@demo.local / Admin123!</p>
            </div>
            <div>
              <p className="font-medium text-text-secondary">Demo acompanhante</p>
              <p>maria@demo.local / Demo123!</p>
            </div>
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
