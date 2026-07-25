"use client";

import { PublicPageLayout } from "@/components/public-header";
import { RegistrationWizard } from "@/components/registration-wizard";

export default function CadastroPage() {
  return (
    <PublicPageLayout mainClassName="mx-auto flex-1 max-w-lg px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold text-text-primary">Criar conta</h1>
      <p className="mt-2 text-text-secondary">
        Cadastro em etapas — depois complete fotos, valores e verificação no painel.
      </p>
      <div className="mt-8">
        <RegistrationWizard />
      </div>
    </PublicPageLayout>
  );
}
