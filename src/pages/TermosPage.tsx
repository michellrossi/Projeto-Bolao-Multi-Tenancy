import type { ReactNode } from 'react';

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-dark text-white">
      <div className="max-w-3xl mx-auto px-6 py-20 space-y-12">
        {/* Header */}
        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">Legal</p>
          <h1 className="text-4xl md:text-5xl font-black font-lexend tracking-tighter uppercase leading-tight">
            Termos de <span className="text-primary">Uso</span>
          </h1>
          <p className="text-white/40 text-sm">Última atualização: 11 de maio de 2026</p>
        </div>

        <div className="space-y-10 text-white/70 text-sm leading-relaxed">
          <Section title="1. Aceitação dos Termos">
            <p>
              Ao acessar ou utilizar a plataforma Bolão 2026 ("Plataforma"), você concorda com estes Termos de Uso e com nossa
              Política de Privacidade. Se você não concordar com qualquer parte destes termos, não utilize a Plataforma.
            </p>
          </Section>

          <Section title="2. Descrição do Serviço">
            <p>
              A Bolão 2026 é uma plataforma digital que permite aos usuários criar e participar de bolões esportivos privados,
              realizar palpites em jogos, acompanhar rankings e gerenciar grupos de participantes.
            </p>
            <p className="mt-3">
              A Plataforma é oferecida como software como serviço (SaaS) mediante pagamento único conforme o plano escolhido.
            </p>
          </Section>

          <Section title="3. Cadastro e Conta">
            <ul className="space-y-2 list-disc pl-5">
              <li>Você deve ter pelo menos 18 anos para criar uma conta.</li>
              <li>As informações fornecidas no cadastro devem ser verdadeiras e atualizadas.</li>
              <li>Você é responsável pela confidencialidade de sua senha.</li>
              <li>Uma conta por pessoa física ou jurídica.</li>
              <li>A Bolão 2026 reserva-se o direito de encerrar contas que violem estes termos.</li>
            </ul>
          </Section>

          <Section title="4. Pagamento e Licença">
            <p>
              Os planos são cobrados em pagamento único (não recorrente). Após a confirmação do pagamento, você recebe uma
              licença de uso vitalício para o plano contratado.
            </p>
            <ul className="space-y-2 list-disc pl-5 mt-3">
              <li>Pagamentos processados via gateway Asaas com criptografia SSL/TLS.</li>
              <li>Não armazenamos dados de cartão de crédito em nossos servidores.</li>
              <li>Reembolsos solicitados em até 7 dias corridos serão analisados caso a caso.</li>
              <li>Preços expressos em Reais (BRL), incluídos todos os tributos aplicáveis.</li>
            </ul>
          </Section>

          <Section title="5. Uso Permitido">
            <p>Ao usar a Plataforma, você concorda em não:</p>
            <ul className="space-y-2 list-disc pl-5 mt-3">
              <li>Usar a Plataforma para fins ilegais ou apostas com envolvimento de dinheiro real entre participantes sem autorização legal.</li>
              <li>Compartilhar sua conta ou licença com terceiros.</li>
              <li>Tentar acessar sistemas ou dados de outros usuários sem autorização.</li>
              <li>Fazer engenharia reversa, copiar ou distribuir o software da Plataforma.</li>
              <li>Usar a Plataforma para envio de spam ou conteúdo impróprio.</li>
            </ul>
          </Section>

          <Section title="6. Propriedade Intelectual">
            <p>
              Todo o conteúdo da Plataforma — incluindo código, design, logotipos e textos — é propriedade da Bolão 2026 e
              está protegido pelas leis brasileiras de direitos autorais (Lei 9.610/98).
            </p>
          </Section>

          <Section title="7. Limitação de Responsabilidade">
            <p>
              A Bolão 2026 não se responsabiliza por eventuais interrupções de serviço, perda de dados decorrente de falhas
              de terceiros (como provedores de hospedagem) ou danos indiretos resultantes do uso da Plataforma.
            </p>
          </Section>

          <Section title="8. Rescisão">
            <p>
              Você pode encerrar sua conta a qualquer momento pelo painel de configurações. A Bolão 2026 pode suspender ou
              encerrar sua conta em caso de violação destes termos, sem direito a reembolso.
            </p>
          </Section>

          <Section title="9. Alterações dos Termos">
            <p>
              Podemos atualizar estes termos periodicamente. Notificaremos você por e-mail sobre mudanças significativas.
              O uso continuado da Plataforma após a notificação constitui aceite dos novos termos.
            </p>
          </Section>

          <Section title="10. Legislação Aplicável">
            <p>
              Estes termos são regidos pela legislação brasileira. Fica eleito o foro da Comarca de São Paulo/SP para
              dirimir eventuais litígios, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
            </p>
          </Section>

          <Section title="11. Contato">
            <p>
              Para dúvidas sobre estes termos, entre em contato pelo e-mail:{' '}
              <a href="mailto:contato@bolao2026.com" className="text-primary hover:underline">
                contato@bolao2026.com
              </a>
            </p>
          </Section>
        </div>

        <div className="pt-8 border-t border-white/5 flex gap-4">
          <a href="/" className="text-white/40 hover:text-primary text-xs font-black uppercase tracking-widest transition-colors">
            ← Voltar
          </a>
          <a href="/privacidade" className="text-white/40 hover:text-primary text-xs font-black uppercase tracking-widest transition-colors">
            Política de Privacidade →
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
      <div className="pl-0">{children}</div>
    </section>
  );
}
