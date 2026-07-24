import type { Metadata } from "next";
import Link from "next/link";
import { InstitutionalLayout } from "@/components/institutional-layout";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description: "Como tratamos seus dados na plataforma Acompanhante.",
};

export default function PrivacidadePage() {
  return (
    <InstitutionalLayout title="Política de privacidade">
      <p>Última atualização: julho de 2026.</p>
      <h2>Dados que coletamos</h2>
      <ul>
        <li>Cadastro: email, nome público, data de nascimento, localização e biografia</li>
        <li>Uso: visualizações de perfil, cliques em WhatsApp (com consentimento)</li>
        <li>Geolocalização: apenas se você autorizar nos cookies do site</li>
      </ul>
      <h2>Finalidade</h2>
      <p>
        Utilizamos os dados para operar a plataforma, exibir perfis, calcular métricas,
        moderar conteúdo e melhorar a experiência. Não vendemos dados pessoais a terceiros.
      </p>
      <h2>Cookies e consentimento</h2>
      <p>
        Você pode aceitar ou recusar cookies não essenciais no banner exibido na primeira visita.
        Analytics e geolocalização só são ativados com consentimento.
      </p>
      <h2>Seus direitos (LGPD)</h2>
      <p>
        Você pode solicitar acesso, correção ou exclusão de dados entrando em contato pelo{" "}
        <Link href="/contato" className="text-purple-light hover:underline">
          formulário de contato
        </Link>
        .
      </p>
      <h2>Retenção e segurança</h2>
      <p>
        Mantemos dados enquanto a conta estiver ativa ou conforme exigido por lei. Aplicamos
        criptografia para dados sensíveis como WhatsApp e controles de acesso administrativo.
      </p>
    </InstitutionalLayout>
  );
}
