import type { Metadata } from "next";
import { InstitutionalLayout } from "@/components/institutional-layout";

export const metadata: Metadata = {
  title: "Sobre",
  description: "Conheça a plataforma Acompanhante.",
};

export default function SobrePage() {
  return (
    <InstitutionalLayout title="Sobre a plataforma">
      <p>
        A Acompanhante é uma plataforma de descoberta e gestão de perfis, pensada para oferecer
        uma experiência premium, segura e transparente para visitantes e profissionais.
      </p>
      <h2>O que oferecemos</h2>
      <ul>
        <li>Perfis públicos com fotos, momentos, avaliações e selo de verificação</li>
        <li>Busca por cidade, tags e rankings de popularidade</li>
        <li>Painel completo para acompanhantes gerirem perfil, valores, horários e métricas</li>
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
