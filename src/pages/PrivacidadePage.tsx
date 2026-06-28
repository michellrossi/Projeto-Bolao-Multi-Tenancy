import type { ReactNode } from 'react';

export default function PrivacidadePage() {
  return (

    <div className="min-h-screen bg-dark text-white">
      <div className="max-w-3xl mx-auto px-6 py-20 space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">LGPD</p>
          <h1 className="text-4xl md:text-5xl font-black font-lexend tracking-tighter uppercase leading-tight">
            Política de <span className="text-primary">Privacidade</span>
          </h1>
          <p className="text-white/40 text-sm">Última atualização: 11 de maio de 2026</p>
        </div>

        <div className="space-y-10 text-white/70 text-sm leading-relaxed">
          <p>
            A Bolão 2026 ("nós", "nos" ou "nossa") está comprometida com a proteção dos seus dados pessoais, em conformidade
            com a <strong className="text-white">Lei Geral de Proteção de Dados Pessoais (LGPD — Lei 13.709/2018)</strong>.
            Esta Política descreve como coletamos, usamos, armazenamos e protegemos suas informações.
          </p>

          <Section title="1. Dados Coletados">
            <p><strong className="text-white">a) Dados fornecidos por você:</strong></p>
            <ul className="space-y-2 list-disc pl-5 mt-2">
              <li>Nome completo e e-mail (cadastro e checkout)</li>
              <li>CPF e CEP (somente para processamento do pagamento — não armazenados por nós)</li>
              <li>Dados do cartão de crédito (transmitidos diretamente ao gateway Asaas via HTTPS — nunca armazenados em nossos servidores)</li>
              <li>Palpites e interações com a Plataforma</li>
            </ul>
            <p className="mt-4"><strong className="text-white">b) Dados coletados automaticamente:</strong></p>
            <ul className="space-y-2 list-disc pl-5 mt-2">
              <li>Endereço IP e informações do navegador</li>
              <li>Data e hora de acesso</li>
              <li>Logs de autenticação</li>
            </ul>
          </Section>

          <Section title="2. Finalidade do Tratamento">
            <p>Seus dados são utilizados para:</p>
            <ul className="space-y-2 list-disc pl-5 mt-3">
              <li>Criação e gerenciamento da sua conta</li>
              <li>Processamento de pagamentos e emissão de comprovantes</li>
              <li>Envio de e-mails transacionais (confirmação de compra, recuperação de senha)</li>
              <li>Exibição do ranking e gestão de ligas</li>
              <li>Suporte ao usuário</li>
              <li>Cumprimento de obrigações legais</li>
            </ul>
          </Section>

          <Section title="3. Base Legal">
            <p>
              O tratamento dos seus dados é fundamentado nas seguintes bases legais (Art. 7º da LGPD):
            </p>
            <ul className="space-y-2 list-disc pl-5 mt-3">
              <li><strong className="text-white">Execução de contrato</strong> — para fornecer os serviços contratados</li>
              <li><strong className="text-white">Consentimento</strong> — para comunicações de marketing (quando aplicável)</li>
              <li><strong className="text-white">Obrigação legal</strong> — para cumprimento de requisitos fiscais e regulatórios</li>
              <li><strong className="text-white">Interesse legítimo</strong> — para segurança e melhoria da Plataforma</li>
            </ul>
          </Section>

          <Section title="4. Compartilhamento de Dados">
            <p>Compartilhamos seus dados somente com:</p>
            <ul className="space-y-2 list-disc pl-5 mt-3">
              <li><strong className="text-white">Supabase</strong> — provedor de banco de dados e autenticação (servidores na AWS, região São Paulo)</li>
              <li><strong className="text-white">Asaas</strong> — gateway de pagamento brasileiro, regulado pelo Banco Central</li>
              <li><strong className="text-white">Resend</strong> — serviço de envio de e-mails transacionais</li>
              <li><strong className="text-white">Vercel</strong> — hospedagem da aplicação</li>
            </ul>
            <p className="mt-3">
              Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins de marketing.
            </p>
          </Section>

          <Section title="5. Retenção de Dados">
            <ul className="space-y-2 list-disc pl-5">
              <li>Dados de conta: enquanto sua conta estiver ativa</li>
              <li>Dados de pagamento (referência): 5 anos (obrigação fiscal)</li>
              <li>Logs de acesso: 6 meses (Marco Civil da Internet)</li>
              <li>Após exclusão da conta: dados anonimizados em até 30 dias</li>
            </ul>
          </Section>

          <Section title="6. Seus Direitos (LGPD — Art. 18)">
            <p>Você tem direito a:</p>
            <ul className="space-y-2 list-disc pl-5 mt-3">
              <li><strong className="text-white">Acesso</strong> — solicitar cópia dos seus dados pessoais</li>
              <li><strong className="text-white">Correção</strong> — atualizar dados incompletos ou incorretos</li>
              <li><strong className="text-white">Exclusão</strong> — solicitar a exclusão dos seus dados (sujeito a obrigações legais)</li>
              <li><strong className="text-white">Portabilidade</strong> — receber seus dados em formato legível por máquina</li>
              <li><strong className="text-white">Revogação do consentimento</strong> — a qualquer momento</li>
              <li><strong className="text-white">Oposição</strong> — ao tratamento baseado em interesse legítimo</li>
            </ul>
            <p className="mt-3">
              Para exercer seus direitos, envie um e-mail para:{' '}
              <a href="mailto:privacidade@bolao2026.com" className="text-primary hover:underline">
                privacidade@bolao2026.com
              </a>
            </p>
          </Section>

          <Section title="7. Segurança">
            <p>
              Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados, incluindo:
              criptografia em trânsito (TLS 1.3), autenticação segura via Supabase Auth, e controle de acesso
              por Row Level Security (RLS) no banco de dados. No entanto, nenhum sistema é 100% seguro.
              Em caso de incidente, notificaremos você e a ANPD conforme exigido pela LGPD.
            </p>
          </Section>

          <Section title="8. Cookies">
            <p>
              Utilizamos apenas cookies estritamente necessários para autenticação e funcionamento da Plataforma.
              Não utilizamos cookies de rastreamento ou publicidade de terceiros.
            </p>
          </Section>

          <Section title="9. Encarregado de Dados (DPO)">
            <p>
              Nosso Encarregado de Proteção de Dados pode ser contactado pelo e-mail:{' '}
              <a href="mailto:privacidade@bolao2026.com" className="text-primary hover:underline">
                privacidade@bolao2026.com
              </a>
            </p>
          </Section>

          <Section title="10. Alterações desta Política">
            <p>
              Podemos atualizar esta Política periodicamente. A data da última atualização é indicada no topo do documento.
              Alterações significativas serão comunicadas por e-mail.
            </p>
          </Section>
        </div>

        <div className="pt-8 border-t border-white/5 flex gap-4">
          <a href="/" className="text-white/40 hover:text-primary text-xs font-black uppercase tracking-widest transition-colors">
            ← Voltar
          </a>
          <a href="/termos" className="text-white/40 hover:text-primary text-xs font-black uppercase tracking-widest transition-colors">
            Termos de Uso →
          </a>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-white font-black text-lg uppercase tracking-tight">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
