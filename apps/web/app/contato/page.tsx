import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalLayout } from "@/components/institutional-layout";

export const metadata: Metadata = {
  title: "Contato",
  description: "Entre em contato com a plataforma Acompanhante.",
};

export default function ContatoPage() {
  return (
    <InstitutionalLayout title="Contato">
      <h2>Acompanhantes cadastradas</h2>
      <p>
        Use o painel em{" "}
        <Link href="/painel/mensagens" className="text-purple-light hover:underline">
          Mensagens
        </Link>{" "}
        para falar diretamente com a administração sobre moderação, premium ou suporte técnico.
      </p>
      <h2>Visitantes e dúvidas gerais</h2>
      <p>
        Para questões sobre privacidade, denúncias ou uso da plataforma, envie um e-mail para{" "}
        <a href="mailto:contato@acompanhante.local" className="text-purple-light hover:underline">
          contato@acompanhante.local
        </a>
        .
      </p>
      <h2>Denúncias</h2>
      <p>
        Perfis ou conteúdos impróprios podem ser denunciados diretamente na página pública do
        perfil. Denúncias são analisadas pela equipe de moderação.
      </p>
    </InstitutionalLayout>
  );
}
