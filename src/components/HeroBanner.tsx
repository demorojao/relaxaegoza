'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, ShieldCheck, Star, Users, ChevronUp, ChevronDown, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HeroBannerProps {
  isLoggedIn?: boolean;
}

export default function HeroBanner({ isLoggedIn }: HeroBannerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hasUser, setHasUser] = useState<boolean>(!!isLoggedIn);

  useEffect(() => {
    if (isLoggedIn !== undefined) {
      setHasUser(isLoggedIn);
      return;
    }

    // Verificar se existe sessão ativa caso não receba a prop explicitamente
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setHasUser(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasUser(!!session?.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isLoggedIn]);

  // Se o usuário estiver logado, não exibe o banner de captura/boas-vindas
  if (hasUser) {
    return null;
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 pt-3 sm:pt-4 pb-2 transition-all duration-300 animate-fadeIn">
      <div className={`relative rounded-2xl sm:rounded-3xl bg-linear-to-b from-black/90 via-dark-card/70 to-dark-bg/90 border border-gold-primary/20 shadow-[0_10px_40px_rgba(0,0,0,0.6)] overflow-hidden transition-all ${isCollapsed ? 'p-3 sm:p-4' : 'p-5 sm:p-8'}`}>
        
        {/* Glow de Iluminação Dourada no fundo */}
        <div className="absolute top-[-30%] right-[-10%] w-[45%] h-[70%] bg-gold-primary/10 blur-[110px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[60%] bg-wine-primary/10 blur-[100px] rounded-full pointer-events-none" />

        {/* Botão de Minimizar / Expandir posicionamento seguro */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`absolute ${isCollapsed ? 'top-2.5 right-2.5 sm:top-3 sm:right-4' : 'top-4 right-4'} p-1.5 sm:p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all text-xs flex items-center gap-1 cursor-pointer z-20 border border-white/5`}
          title={isCollapsed ? "Expandir banner" : "Minimizar banner"}
        >
          {isCollapsed ? (
            <>
              <span className="hidden sm:inline text-[10px] font-semibold text-gray-300">Exibir</span>
              <ChevronDown className="w-3.5 h-3.5 text-gold-primary" />
            </>
          ) : (
            <>
              <span className="hidden sm:inline text-[10px] font-semibold">Minimizar</span>
              <ChevronUp className="w-4 h-4 text-gray-400" />
            </>
          )}
        </button>

        {/* Conteúdo Principal do Banner */}
        {!isCollapsed && (
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-6 sm:gap-8 animate-fadeIn pt-2 sm:pt-0">
            
            {/* Lado Esquerdo: Textos & Métricas */}
            <div className="space-y-4 sm:space-y-5 text-center lg:text-left max-w-2xl">
              
              {/* Badge de Categoria */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gold-primary/10 border border-gold-primary/30 text-gold-light text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-gold-primary animate-pulse" />
                Experiência Premium & Seleção de Elite
              </div>

              {/* Título Principal */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light tracking-tight text-white leading-tight">
                A Maior Plataforma de <span className="font-semibold text-gold-primary">Acompanhantes de Luxo</span> & <span className="font-semibold text-wine-light">Massoterapeutas de Elite</span> do Brasil
              </h1>

              {/* Subtítulo */}
              <p className="text-sm sm:text-base text-gray-300 font-light leading-relaxed">
                Conexão direta com as melhores profissionais. 100% dos perfis com selfie e identidade auditadas para sua total segurança e discrição.
              </p>

              {/* Métricas / Prova Social */}
              <div className="pt-2 flex flex-wrap justify-center lg:justify-start items-center gap-4 sm:gap-7 border-t border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-gold-primary/10 text-gold-primary">
                    <Users className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm sm:text-lg font-extrabold text-white block leading-none">+50K</span>
                    <span className="text-[10.5px] sm:text-xs text-gray-300 font-semibold uppercase tracking-wider">Clientes Atendidos</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <ShieldCheck className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm sm:text-lg font-extrabold text-white block leading-none">100%</span>
                    <span className="text-[10.5px] sm:text-xs text-gray-300 font-semibold uppercase tracking-wider">Perfis Auditados</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Star className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-amber-400" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm sm:text-lg font-extrabold text-white block leading-none">4.9 ★</span>
                    <span className="text-[10.5px] sm:text-xs text-gray-300 font-semibold uppercase tracking-wider">Satisfação VIP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lado Direito: Card CTA de Cadastro de Profissionais */}
            <div className="w-full lg:w-80 bg-black/60 border border-gold-primary/30 rounded-2xl p-4.5 sm:p-6 shadow-xl flex flex-col items-center text-center space-y-3.5 sm:space-y-4 shrink-0 backdrop-blur-md">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gold-primary/10 border border-gold-primary/20 flex items-center justify-center text-gold-primary">
                <Sparkles className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
              </div>

              <div>
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">Crie seu Perfil de Anúncio</h3>
                <p className="text-xs sm:text-sm text-gray-300 font-light mt-1 leading-relaxed">
                  Cadastre-se super rápido e atenda clientes de alto padrão no portal mais exclusivo.
                </p>
              </div>

              <Link href="/cadastro" className="w-full">
                <button className="w-full py-3 px-4 rounded-xl bg-linear-to-r from-gold-primary to-gold-dark text-dark-bg font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-md hover:scale-[1.02] transition-all flex items-center justify-center gap-2 cursor-pointer">
                  <span>Anunciar Meu Perfil</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>

              <div className="text-xs sm:text-sm text-gray-400 font-light">
                Já possui uma conta? <Link href="/login" className="text-gold-light underline font-medium">Faça login</Link>
              </div>
            </div>

          </div>
        )}

        {/* Versão Minimizada (Sem sobreposição no mobile) */}
        {isCollapsed && (
          <div className="flex items-center justify-between gap-2 py-0.5 text-xs text-gray-300 pr-12 sm:pr-20">
            <div className="flex items-center gap-2 truncate">
              <Sparkles className="w-3.5 h-3.5 text-gold-primary shrink-0" />
              <span className="font-semibold text-white text-xs truncate">Relaxe e Goze</span>
              <span className="hidden md:inline text-gray-500">• Portal de Acompanhantes de Luxo & Massagens de Elite</span>
            </div>
            <Link href="/cadastro" className="shrink-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-gold-primary hover:underline cursor-pointer">
                Anunciar Perfil →
              </span>
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
