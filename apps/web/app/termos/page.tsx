import type { Metadata } from "next";
import { InstitutionalLayout } from "@/components/institutional-layout";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "Termos de uso da plataforma Acompanhante.",
};

export default function TermosPage() {
  return (
    <InstitutionalLayout title="Termos de uso">
      <p>Última atualização: julho de 2026.</p>
      <h2>1. Aceitação</h2>
      <p>
        Ao acessar ou usar a plataforma, você concorda com estes termos. Se não concordar, não
        utilize os serviços.
      </p>
      <h2>2. Elegibilidade</h2>
      <p>
        Visitantes devem ter 18 anos ou mais. Acompanhantes cadastradas devem comprovar maioridade
        e fornecer informações verdadeiras no cadastro.
      </p>
      <h2>3. Conduta</h2>
      <ul>
        <li>É proibido conteúdo ilegal, ofensivo, fraudulento ou que viole direitos de terceiros</li>
        <li>Perfis falsos, spam e assédio resultam em bloqueio ou exclusão</li>
        <li>A plataforma pode moderar, remover ou recusar conteúdo a seu critério</li>
      </ul>
      <h2>4. Responsabilidades</h2>
      <p>
        A plataforma atua como intermediária de divulgação. Negociações e encontros ocorrem fora
        do ambiente digital, sob responsabilidade das partes envolvidas.
      </p>
      <h2>5. Alterações</h2>
      <p>
        Estes termos podem ser atualizados. O uso continuado após alterações implica aceitação da
        nova versão.
      </p>
    </InstitutionalLayout>
  );
}
