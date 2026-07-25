'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Sparkles, X, ChevronRight, Gem, Lock } from 'lucide-react';
import Logo from './Logo';

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const checkAndShow = () => {
      const hasSeenWelcome = localStorage.getItem('rg_welcome_seen');
      const isAgeVerified = sessionStorage.getItem('ageVerified');
      
      if (isAgeVerified && !hasSeenWelcome) {
        setTimeout(() => {
          setIsOpen(true);
        }, 300);
      }
    };

    checkAndShow();

    const handleAgeSuccess = () => {
      checkAndShow();
    };

    window.addEventListener('ageVerifiedSuccess', handleAgeSuccess);
    return () => window.removeEventListener('ageVerifiedSuccess', handleAgeSuccess);
  }, []);

  const handleClose = () => {
    localStorage.setItem('rg_welcome_seen', 'true');
    setIsOpen(false);
  };

  if (!mounted || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-dark-card/95 border border-gold-primary/30 max-w-lg w-full rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(212,175,55,0.15)] relative overflow-hidden text-gray-100">
        
        {/* Glow de fundo */}
        <div className="absolute top-[-20%] left-[20%] w-[60%] h-[50%] bg-gold-primary/10 blur-[90px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[40%] bg-wine-primary/10 blur-[80px] rounded-full pointer-events-none" />

        {/* Botão de Fechar */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer z-20"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
          {/* Logo do Portal */}
          <div className="scale-110 mb-1">
            <Logo />
          </div>

          {/* Badge de Boas-Vindas */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-primary/10 border border-gold-primary/25 text-gold-light text-[10px] font-bold uppercase tracking-widest">
            <Sparkles className="w-3 h-3 text-gold-primary animate-pulse" />
            Curadoria Exclusiva de Elite
          </div>

          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-light tracking-tight text-white">
              Bem-vindo ao <span className="font-semibold text-gold-primary">Relaxe e Goze</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 font-light leading-relaxed max-w-sm mx-auto">
              O portal de referência para acompanhantes e massoterapeutas de prestígio.
            </p>
          </div>

          {/* 3 Pilares de Exclusividade */}
          <div className="w-full space-y-3 text-left pt-2">
            <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-black/40 border border-white/5">
              <div className="p-2 rounded-xl bg-gold-primary/10 text-gold-primary shrink-0 mt-0.5">
                <Gem className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Profissionais de Alto Padrão</h4>
                <p className="text-[11px] text-gray-400 font-light leading-snug">
                  Anúncios selecionados com galeria de fotos e vídeos em alta definição.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-black/40 border border-white/5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Identidades & Fotos Auditadas</h4>
                <p className="text-[11px] text-gray-400 font-light leading-snug">
                  Validação com selfie e documento para garantir fotos 100% reais sem surpresas.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-black/40 border border-white/5">
              <div className="p-2 rounded-xl bg-wine-primary/20 text-wine-light shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Privacidade & Contato Direto</h4>
                <p className="text-[11px] text-gray-400 font-light leading-snug">
                  Fale direto pelo WhatsApp da profissional com total sigilo e discrição.
                </p>
              </div>
            </div>
          </div>

          {/* Botão de Entrada */}
          <button
            onClick={handleClose}
            className="w-full py-3.5 px-6 rounded-2xl bg-linear-to-r from-gold-primary via-gold-light to-gold-dark text-dark-bg font-bold text-xs uppercase tracking-wider shadow-[0_4px_20px_rgba(212,175,55,0.25)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <span>Explorar Experiência VIP</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
