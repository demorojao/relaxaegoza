'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, ChevronLeft, Lock, FileText, UserCheck, AlertTriangle, Scale, Eye, RefreshCw, Mail } from 'lucide-react';

export default function TermsOfUsePage() {
  const [activeTab, setActiveTab] = useState<'termos' | 'privacidade' | 'denuncia'>('termos');

  return (
    <main className="min-h-screen w-full bg-dark-bg text-gray-100 pb-24 selection:bg-gold-primary selection:text-dark-bg relative overflow-hidden">
      {/* Glows Decorativos de Fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] bg-wine-primary/10 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-gold-primary/10 blur-[160px] rounded-full pointer-events-none" />

      {/* Header Fixo de Navegação */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 text-gray-400 hover:text-gold-primary transition-colors text-xs sm:text-sm font-medium">
          <ChevronLeft className="w-4 h-4" />
          <span>Voltar para a Vitrine</span>
        </Link>
        
        <div className="font-semibold text-white tracking-wide text-xs sm:text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gold-primary animate-pulse" />
          <span>Relaxe e Goze — Portal Oficial</span>
        </div>

        <Link href="/cadastro" className="hidden sm:block text-xs font-bold text-gold-primary hover:underline">
          Criar Anúncio →
        </Link>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-10 sm:mt-14 space-y-8 relative z-10">
        
        {/* Banner Superior & Título */}
        <div className="text-center space-y-4">
          <div className="inline-flex p-3.5 rounded-2xl bg-gold-primary/10 border border-gold-primary/30 text-gold-primary mb-1 shadow-[0_0_20px_rgba(197,168,128,0.15)]">
            <ShieldCheck className="w-10 h-10" />
          </div>
          
          <h1 className="text-3xl sm:text-5xl font-light text-white tracking-tight leading-tight">
            Termos de Uso, Legislação & <span className="font-semibold text-gold-primary">Privacidade</span>
          </h1>

          <p className="text-gray-400 text-xs sm:text-sm max-w-2xl mx-auto font-light leading-relaxed">
            Conheça as diretrizes de conformidade jurídica, proteção de dados (LGPD), termos de hospedagem e avisos legais que regem a plataforma <strong className="text-white">Relaxe e Goze</strong>.
          </p>

          <div className="text-[11px] text-gray-500 font-mono pt-1">
            Versão 3.2 • Atualizado em Julho de 2026 • Em conformidade com o Marco Civil da Internet e LGPD
          </div>
        </div>

        {/* Abas de Navegação Jurídica */}
        <div className="flex justify-center border-b border-white/10 pb-px">
          <div className="flex bg-black/60 p-1.5 rounded-2xl border border-white/10 gap-1.5 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('termos')}
              className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'termos'
                  ? 'bg-gold-primary text-dark-bg shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Termos de Uso & Isenção</span>
            </button>

            <button
              onClick={() => setActiveTab('privacidade')}
              className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'privacidade'
                  ? 'bg-gold-primary text-dark-bg shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Privacidade & LGPD</span>
            </button>

            <button
              onClick={() => setActiveTab('denuncia')}
              className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'denuncia'
                  ? 'bg-gold-primary text-dark-bg shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Denúncias & Take-down</span>
            </button>
          </div>
        </div>

        {/* CONTEÚDO DA ABA 1: TERMOS DE USO */}
        {activeTab === 'termos' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Card Principal */}
            <div className="glass-effect rounded-3xl border border-white/10 p-6 sm:p-10 space-y-8 shadow-2xl bg-black/40">
              
              {/* Seção 1 */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-gold-primary font-bold text-sm sm:text-base">
                  <Scale className="w-5 h-5" />
                  <h2>1. Natureza Jurídica da Plataforma (Provedor de Aplicação)</h2>
                </div>
                <p className="text-gray-300 text-xs sm:text-sm leading-relaxed font-light">
                  O portal <strong>Relaxe e Goze</strong> opera estritamente na qualidade de <strong>Provedor de Aplicação e Veículo de Publicidade Digital (SaaS - Software as a Service)</strong>, nos termos e sob a proteção do <strong>Artigo 19 da Lei Federal nº 12.965/2014 (Marco Civil da Internet)</strong>. 
                </p>
                <p className="text-gray-300 text-xs sm:text-sm leading-relaxed font-light">
                  A plataforma disponibiliza única e exclusivamente infraestrutura tecnológica automatizada para que terceiros independentes publiquem seus próprios anúncios. A plataforma não produz, não edita no mérito, não contrata, não gerencia e não fiscaliza as agendas ou relacionamentos pessoais de seus usuários.
                </p>
              </section>

              <hr className="border-white/10" />

              {/* Seção 2 */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-wine-light font-bold text-sm sm:text-base">
                  <UserCheck className="w-5 h-5 text-wine-primary" />
                  <h2>2. Requisito Absoluto de Maioridade (+18 Anos) & Verificação</h2>
                </div>
                <p className="text-gray-300 text-xs sm:text-sm leading-relaxed font-light">
                  O acesso e utilização do portal é <strong>rigorosamente restrito a pessoas físicas maiores de 18 (dezoito) anos</strong> e em pleno gozo de sua capacidade civil legal. 
                </p>
                <ul className="space-y-2 text-xs sm:text-sm text-gray-300 font-light pl-4 list-disc">
                  <li><strong>Auditoria Preventiva de Identidade:</strong> Para cadastrar um anúncio, o usuário anunciante submete-se obrigatoriamente à verificação de identidade via selfie e documento oficial com foto.</li>
                  <li><strong>Falsidade Ideológica:</strong> Qualquer tentativa de fraude cadastral, uso de documento de terceiros ou tentativa de acesso por menores resultará no banimento imediato e definitivo da conta, bem como na comunicação das autoridades policiais competentes.</li>
                </ul>
              </section>

              <hr className="border-white/10" />

              {/* Seção 3 */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm sm:text-base">
                  <ShieldCheck className="w-5 h-5" />
                  <h2>3. Conformidade com o Código Penal (Artigos 228, 229 e 230)</h2>
                </div>
                <p className="text-gray-300 text-xs sm:text-sm leading-relaxed font-light">
                  Em estrito cumprimento à legislação penal brasileira, declaramos expressamente:
                </p>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 text-xs sm:text-sm text-gray-300 font-light">
                  <p>• <strong>Ausência de Agenciamento:</strong> Não intermediamos, não indicamos e não agenciamos encontros. O contato entre o visitante e a anunciante ocorre de forma direta e sem qualquer ingerência do portal.</p>
                  <p>• <strong>Ausência de Comissionamento / Participação em Ganhos:</strong> O portal cobra exclusivamente um valor fixo e periódico pela veiculação da publicidade (aluguel de espaço digital). <strong>Não retemos nenhuma comissão, porcentagem ou taxa sobre eventuais valores acertados entre anunciantes e terceiros.</strong></p>
                  <p>• <strong>Proibição de Terceiros / Casa de Prostituição:</strong> É expressamente vedado o uso do site por intermediários, agenciadores ou gestores de locais de exploração de prostituição alheia (cafetinagem).</p>
                </div>
              </section>

              <hr className="border-white/10" />

              {/* Seção 4 */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-gold-light font-bold text-sm sm:text-base">
                  <Eye className="w-5 h-5 text-gold-primary" />
                  <h2>4. Direitos Autorais, Direitos de Imagem & Proteção Anti-Vazamento</h2>
                </div>
                <p className="text-gray-300 text-xs sm:text-sm leading-relaxed font-light">
                  Ao publicar fotos ou vídeos na plataforma, o anunciante declara sob as penas da lei ser o único titular dos direitos autorais e de imagem do material enviado, concedendo à plataforma licença temporária, não exclusiva e revogável para veiculação no site.
                </p>
                <div className="bg-gold-primary/10 border border-gold-primary/20 rounded-2xl p-4 text-xs sm:text-sm text-gold-light space-y-2 font-light">
                  <h4 className="font-bold text-white uppercase tracking-wider text-[11px]">🛡️ Cláusula de Proteção Anti-Download e Redistribuição Não Autorizada</h4>
                  <p>
                    É estritamente proibida a cópia, gravação de tela, raspagem de dados (scraping), reprodução ou redistribuição de qualquer mídia veiculada no portal sem permissão prévia e por escrito. O descumprimento sujeitará o infrator a sanções civis e criminais (Lei nº 9.610/98 e Art. 153 do Código Penal).
                  </p>
                </div>
              </section>

              <hr className="border-white/10" />

              {/* Seção 5 */}
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-gray-200 font-bold text-sm sm:text-base">
                  <RefreshCw className="w-5 h-5 text-gold-primary" />
                  <h2>5. Política de Assinaturas, Boosts e Reembolsos</h2>
                </div>
                <p className="text-gray-300 text-xs sm:text-sm leading-relaxed font-light">
                  Os planos de veiculação de anúncios (Standard, Pro, Gold Premium) e recursos de impulsionamento (Boost) consistem na prestação imediata de serviços de publicidade digital. 
                </p>
                <p className="text-gray-300 text-xs sm:text-sm leading-relaxed font-light">
                  Por se tratar de serviço digital executado e disponibilizado de forma instantânea, nos termos do Artigo 49 do Código de Defesa do Consumidor, não haverá reembolso proporcional por períodos já fruídos após a disponibilização e publicação do anúncio na vitrine.
                </p>
              </section>

            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA 2: PRIVACIDADE & LGPD */}
        {activeTab === 'privacidade' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="glass-effect rounded-3xl border border-white/10 p-6 sm:p-10 space-y-8 shadow-2xl bg-black/40">
              
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-gold-primary font-bold text-sm sm:text-base">
                  <Lock className="w-5 h-5" />
                  <h2>1. Compromisso com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/18)</h2>
                </div>
                <p className="text-gray-300 text-xs sm:text-sm leading-relaxed font-light">
                  O <strong>Relaxe e Goze</strong> preza pelo sigilo absoluto e privacidade de todos os seus usuários e anunciantes. Esta política descreve como coletamos, armazenamos e protegemos seus dados pessoais.
                </p>
              </section>

              <hr className="border-white/10" />

              <section className="space-y-3">
                <h3 className="text-sm font-bold text-white">2. Coleta e Finalidade dos Dados</h3>
                <div className="space-y-2 text-xs sm:text-sm text-gray-300 font-light">
                  <p>• <strong>Dados Cadastrais:</strong> Nome, endereço de e-mail, telefone/WhatsApp e foto de perfil, necessários para gestão da conta e contato de potenciais clientes.</p>
                  <p>• <strong>Dados de Verificação (Restritos):</strong> Documento de identidade e selfie de auditoria. Tais mídias são armazenadas em servidor isolado e criptografado com acesso restrito à equipe interna de segurança, jamais sendo exibidas publicamente.</p>
                  <p>• <strong>Logs de Acesso e IP:</strong> Em conformidade com o Artigo 15 do Marco Civil da Internet, mantemos os registros de IP, data e hora de acesso em ambiente seguro pelo período legalmente exigido.</p>
                </div>
              </section>

              <hr className="border-white/10" />

              <section className="space-y-3">
                <h3 className="text-sm font-bold text-white">3. Segurança da Informação & Criptografia</h3>
                <p className="text-gray-300 text-xs sm:text-sm leading-relaxed font-light">
                  Utilizamos padrões de segurança de nível bancário, incluindo tráfego criptografado via SSL/TLS (HTTPS), políticas de Row Level Security (RLS) no banco de dados Supabase e armazenamento descentralizado em nuvem Cloudflare R2.
                </p>
              </section>

              <hr className="border-white/10" />

              <section className="space-y-3">
                <h3 className="text-sm font-bold text-white">4. Direitos do Titular de Dados</h3>
                <p className="text-gray-300 text-xs sm:text-sm leading-relaxed font-light">
                  Conforme os artigos 18 e seguintes da LGPD, você possui o direito de solicitar a confirmação, acesso, correção, anonimização ou <strong>exclusão definitiva dos seus dados pessoais</strong> de nossos sistemas a qualquer momento através dos canais de atendimento.
                </p>
              </section>

            </div>
          </div>
        )}

        {/* CONTEÚDO DA ABA 3: DENÚNCIAS & TAKE-DOWN */}
        {activeTab === 'denuncia' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="glass-effect rounded-3xl border border-white/10 p-6 sm:p-10 space-y-8 shadow-2xl bg-black/40">
              
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-wine-light font-bold text-sm sm:text-base">
                  <AlertTriangle className="w-5 h-5 text-wine-primary" />
                  <h2>Procedimento de Notificação e Remoção de Conteúdo (Take-down Notice)</h2>
                </div>
                <p className="text-gray-300 text-xs sm:text-sm leading-relaxed font-light">
                  Comprometemo-nos a manter uma plataforma ética e segura. Caso identificada a veiculação não autorizada de sua imagem, violação de direitos autorais ou descumprimento de nossas diretrizes, nossa equipe de moderação efetuará a análise e remoção preventiva imediata.
                </p>
              </section>

              <div className="bg-wine-primary/10 border border-wine-primary/30 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gold-primary" /> Canal Oficial de Notificação Extrajudicial
                </h3>

                <div className="space-y-2 text-xs text-gray-300 font-light">
                  <p>Para enviar um pedido formal de remoção de anúncio ou foto, envie um e-mail para:</p>
                  <div className="bg-black/60 border border-white/10 p-3 rounded-xl font-mono text-gold-light font-bold text-sm flex items-center justify-between">
                    <span>contato@relaxeegoze.com.br</span>
                    <span className="text-[10px] text-gray-500 font-sans font-normal">Resposta em até 24h</span>
                  </div>
                </div>

                <div className="text-[11px] text-gray-400 space-y-1 font-light">
                  <p><strong>Requisitos para atendimento rápido:</strong></p>
                  <p>1. URL exata do anúncio a ser moderado/removido.</p>
                  <p>2. Comprovação da titularidade dos direitos de imagem ou fundamentação do pedido.</p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Rodapé Legal & Foro */}
        <div className="text-center space-y-4 pt-4 border-t border-white/5">
          <p className="text-[11px] text-gray-500 font-light">
            Relaxe e Goze © 2026 — Todos os direitos reservados. Fica eleito o Foro da Comarca de São Paulo/SP para dirimir quaisquer controvérsias oriundas destes termos.
          </p>

          <Link href="/" className="inline-flex items-center gap-1 text-xs text-gold-primary hover:underline font-semibold">
            ← Retornar para a Página Inicial
          </Link>
        </div>

      </div>
    </main>
  );
}
