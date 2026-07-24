"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { register } from "@/lib/auth";
import { isValidBrazilianState } from "@/lib/brazilian-states";

const inputClass =
  "w-full rounded-xl border border-border-subtle bg-bg-secondary px-4 py-3 text-text-primary focus:border-purple-deep focus:outline-none";

const STEPS = ["Acesso", "Dados", "Localização", "Biografia", "Revisão"];

function isAtLeast18(birthDate: string): boolean {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 18;
}

export function RegistrationWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    email: "",
    password: "",
    displayName: "",
    birthDate: "",
    bio: "",
    city: "",
    state: "SP",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function validateStep(index: number): string | null {
    if (index === 0) {
      if (!form.email.trim()) return "Informe o email";
      if (form.password.length < 8) return "Senha deve ter pelo menos 8 caracteres";
    }
    if (index === 1) {
      if (!form.displayName.trim()) return "Informe o nome público";
      if (!form.birthDate) return "Informe a data de nascimento";
      if (!isAtLeast18(form.birthDate)) return "É necessário ter pelo menos 18 anos";
    }
    if (index === 2) {
      if (!form.city.trim()) return "Informe a cidade";
      if (!isValidBrazilianState(form.state)) return "UF inválida (ex: SP, RJ)";
    }
    if (index === 3) {
      if (form.bio.trim().length < 20) return "A biografia deve ter pelo menos 20 caracteres";
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    const err = validateStep(3);
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await register({
        email: form.email,
        password: form.password,
        displayName: form.displayName,
        city: form.city,
        state: form.state.toUpperCase(),
        birthDate: form.birthDate,
        bio: form.bio.trim(),
      });
      router.push("/painel");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro no cadastro";
      setError(
        msg.includes("fetch") || msg.includes("Timeout") || msg === "Failed to fetch"
          ? "Não foi possível conectar à API. Inicie o servidor com: npm run dev:api"
          : msg,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8 flex gap-2">
        {STEPS.map((label, index) => (
          <div
            key={label}
            className={`flex-1 rounded-full py-1 text-center text-[10px] font-medium sm:text-xs ${
              index <= step
                ? "bg-purple-deep/30 text-purple-light"
                : "bg-bg-tertiary text-text-muted"
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Senha (mín. 8)</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Nome público</label>
            <input
              required
              value={form.displayName}
              onChange={(e) => update("displayName", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Data de nascimento</label>
            <input
              type="date"
              required
              value={form.birthDate}
              onChange={(e) => update("birthDate", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="mb-1 block text-sm text-text-secondary">Cidade</label>
            <input
              required
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-text-secondary">UF</label>
            <input
              required
              maxLength={2}
              value={form.state}
              onChange={(e) => update("state", e.target.value.toUpperCase())}
              className={inputClass}
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <label className="mb-1 block text-sm text-text-secondary">Descrição / biografia</label>
          <textarea
            required
            minLength={20}
            maxLength={1000}
            rows={5}
            value={form.bio}
            onChange={(e) => update("bio", e.target.value)}
            placeholder="Conte sobre você, serviços e o que te diferencia..."
            className={inputClass}
          />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3 rounded-2xl border border-border-subtle bg-bg-secondary p-4 text-sm text-text-secondary">
          <p>
            <strong className="text-text-primary">Email:</strong> {form.email}
          </p>
          <p>
            <strong className="text-text-primary">Nome:</strong> {form.displayName}
          </p>
          <p>
            <strong className="text-text-primary">Local:</strong> {form.city}, {form.state}
          </p>
          <p>
            <strong className="text-text-primary">Bio:</strong> {form.bio.slice(0, 120)}
            {form.bio.length > 120 ? "…" : ""}
          </p>
          <p className="text-xs text-text-muted">
            Depois do cadastro, complete fotos, WhatsApp, tags e valores no painel.
          </p>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-8 flex flex-wrap gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={back}
            className="rounded-xl border border-border-subtle px-5 py-3 text-sm text-text-secondary"
          >
            Voltar
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={next}
            className="rounded-xl bg-purple-deep px-6 py-3 text-sm font-medium text-white hover:bg-purple-light"
          >
            Continuar
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-gold to-orange px-6 py-3 text-sm font-semibold text-bg-primary disabled:opacity-50"
          >
            {loading ? "Criando..." : "Criar conta"}
          </button>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Já tem conta?{" "}
        <Link href="/login" className="text-purple-light hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
