'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ChevronLeft, Sparkles } from 'lucide-react';

export default function TermsOfUsePage() {
  return (
    <main className="min-h-screen w-full bg-dark-bg text-gray-100 pb-20 selection:bg-gold-primary selection:text-dark-bg relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-wine-primary/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gold-primary/10 blur-[150px] rounded-full pointer-events-none" />

      {/* Header Fixo */}
      <div className="sticky top-0 z-40 bg-black/60 backdrop-blur-lg border-b border-white/5 px-4 sm:px-6 py-3.5 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Voltar para a Vitrine</span>
        </Link>
        <div className="font-semibold text-white tracking-wide truncate flex-1 text-center pr-6 sm:pr-0">
          Termos de Uso e Aviso Legal
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 mt-12 space-y-8 relative z-10">
        {/* Intro */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 rounded-full bg-gold-primary/10 border border-gold-primary/20 text-gold-primary mb-2">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">
            Termos de Uso & Consentimento de Imagem
          </h1>
          <p className="text-gray-400 text-xs uppercase tracking-widest">
            Última atualização: Junho de 2026
          </p>
        </div>

        {/* Legal Grid Content */}
        <div className="space-y-6">
          
          {/* Card Jurídico Central */}
          <div className="glass-effect rounded-2xl border border-white/5 p-6 sm:p-8 space-y-6">
            
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-gold-light flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold-primary" />
                1. A Tese Jurídica Central (Provedor de Mídia)
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed font-light">
                O <strong>Relaxa & Goza</strong> atua estritamente em conformidade com o <strong>Artigo 19 do Marco Civil da Internet (Lei nº 12.965/2014)</strong>. A plataforma é uma ferramenta de publicidade digital automatizada na modalidade Software as a Service (SaaS). 
                Não geramos conteúdo, não contratamos anunciantes e não gerimos agendas ou atendimentos. Os anúncios são de propriedade, responsabilidade e controle exclusivos dos seus respectivos criadores, que possuem autonomia total sobre sua publicação, edição e exclusão.
              </p>
            </section>

            <hr className="border-white/5" />

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-wine-light flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-wine-primary" />
                2. Cláusula de Independência Absoluta
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed font-light">
                O site atua exclusivamente como veículo de comunicação e provedor de espaço publicitário digital. Não mantemos qualquer relação de subordinação, emprego, sociedade, representação jurídica ou parceria comercial com os anunciantes. O portal não se responsabiliza pelas transações, promessas, condutas ou acertos ocorridos fora dele.
              </p>
            </section>

            <hr className="border-white/5" />

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                3. Ausência de Participação nos Ganhos
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed font-light">
                Este portal cobra valores fixos e periódicos de assinatura pela locação do espaço publicitário digital, independentemente do volume de negócios, agendamentos, clientes ou atendimentos obtidos pelo anunciante. <strong>Não retemos, não intermediamos, não coletamos e não cobramos qualquer comissão ou porcentagem</strong> sobre os valores acertados entre anunciantes e terceiros. Todo pagamento por serviços ocorre de forma externa e direta entre o anunciante e o cliente final.
              </p>
            </section>

            <hr className="border-white/5" />

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-gold-light flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold-primary" />
                4. Vedação Expressa de Agenciamento
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed font-light">
                É expressamente proibida a utilização do portal para atividades de agenciamento, intermediação de encontros por terceiros ou facilitação de exploração sexual (cafetinagem). Os anúncios devem ser criados e gerenciados de forma direta e exclusiva por pessoa física maior de 18 anos, titular de seus próprios dados cadastrais e de imagem.
              </p>
            </section>

            <hr className="border-white/5" />

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                5. Direito e Consentimento de Imagem
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed font-light">
                Ao fazer o upload de fotografias e vídeos em sua área administrativa, o anunciante concede autorização expressa para a veiculação de sua imagem para fins estritamente publicitários no portal. O anunciante declara ser o único detentor dos direitos autorais das imagens fornecidas, isentando a plataforma de qualquer responsabilidade legal decorrente do uso inadequado de propriedade intelectual de terceiros.
              </p>
            </section>
            
          </div>

          {/* Aviso do Rodapé em Destaque */}
          <div className="bg-wine-primary/5 border border-wine-primary/20 rounded-2xl p-6 text-center space-y-2">
            <h3 className="text-xs font-bold text-wine-light uppercase tracking-widest">Aviso de Responsabilidade Civil</h3>
            <p className="text-gray-400 text-xs leading-relaxed font-light">
              Em estrita conformidade com a legislação penal brasileira (Art. 228, 229 e 230 do Código Penal), este portal atua unicamente como classificado de mídia de aluguel fixo. Repudiamos qualquer forma de exploração, favorecimento ou exploração comercial da prostituição alheia por terceiros intermediários.
            </p>
          </div>

        </div>

        {/* Footer Link */}
        <div className="text-center">
          <Link href="/cadastro" className="text-xs text-gold-primary hover:underline font-semibold">
            ← Voltar para o Formulário de Cadastro
          </Link>
        </div>
      </div>
    </main>
  );
}
