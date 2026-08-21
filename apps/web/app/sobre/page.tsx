import type { Metadata } from "next";
import { InstitutionalLayout } from "@/components/institutional-layout";

export const metadata: Metadata = {
  title: "Sobre",
  description:
    "Sobre o Clube dos Garotos: plataforma para encontrar garoto de programa com perfis, fotos e momentos.",
};

export default function SobrePage() {
  return (
    <InstitutionalLayout title="Sobre o Clube dos Garotos">
      <p>
        O Clube dos Garotos é uma plataforma para encontrar garoto de programa com perfil completo:
        fotos, momentos, valores e contato. Nosso foco é uma experiência clara, segura e fácil de
        navegar para visitantes e anunciantes.
      </p>
      <h2>O que oferecemos</h2>
      <ul>
        <li>Anúncios de garotos de programa com fotos, momentos e avaliações</li>
        <li>Busca por cidade, bairro, posição e categorias</li>
        <li>Painel completo para anunciantes gerirem perfil, valores, horários e métricas</li>
        <li>Moderação humana de perfis e conteúdo gerado por terceiros</li>
      </ul>
      <h2>Compromisso</h2>
      <p>
        Trabalhamos com moderação ativa, denúncias analisadas por equipe e políticas claras de
        privacidade. Perfis devem ser de maiores de 18 anos e respeitar as regras da plataforma.
      </p>
    </InstitutionalLayout>
  );
}
