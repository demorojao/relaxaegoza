'use client';

import React from 'react';
import { ShieldAlert, AlertOctagon, HelpCircle } from 'lucide-react';
import Logo from '@/components/Logo';

export default function BannedPage() {
  return (
    <div className="min-h-screen w-full bg-dark-bg text-gray-100 flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-red-500 selection:text-white">
      {/* Background glow effects */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-red-600/5 blur-[120px] pointer-events-none -top-40 -left-40" />
      <div className="absolute w-[500px] h-[500px] rounded-full bg-wine-primary/5 blur-[120px] pointer-events-none -bottom-40 -right-40" />

      {/* Main glass box */}
      <div className="max-w-md w-full glass-effect border border-red-500/20 rounded-3xl p-8 text-center space-y-6 relative z-10 shadow-[0_20px_50px_rgba(239,68,68,0.1)]">
        
        {/* Logo container */}
        <div className="flex justify-center mb-2">
          <Logo />
        </div>

        {/* Warning Icon with pulse */}
        <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-500 animate-pulse">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
            <AlertOctagon className="w-5 h-5 text-red-400 shrink-0" />
            Acesso Restrito
          </h1>
          <p className="text-sm font-light text-red-300">
            Seu endereço de IP foi banido desta plataforma.
          </p>
        </div>

        <div className="text-xs text-gray-400 font-light leading-relaxed bg-black/45 p-4 rounded-xl border border-white/5 text-left space-y-2.5">
          <p>
            Para manter a integridade, segurança e legalidade da nossa comunidade, aplicamos políticas rígidas de conformidade.
          </p>
          <p>
            <strong>Motivos comuns de bloqueio:</strong>
          </p>
          <ul className="list-disc pl-4 space-y-1 text-gray-500">
            <li>Tentativa de anúncio por menor de idade.</li>
            <li>Uso de fotos falsas ou roubadas de terceiros.</li>
            <li>Spam, assédio ou comportamento fraudulento.</li>
            <li>Tentativa de burlar as regras do portal.</li>
          </ul>
        </div>

        {/* Appeal section */}
        <div className="pt-2 border-t border-white/5 space-y-3.5">
          <p className="text-[11px] text-gray-500 font-light">
            Se você acredita que isto foi um engano ou deseja solicitar uma revisão, entre em contato com o nosso suporte de auditoria.
          </p>
          
          <a
            href="https://wa.me/5500000000000?text=Olá!%20Meu%20acesso%20ao%20portal%20foi%20bloqueado%20por%20IP%20e%20gostaria%20de%20solicitar%20uma%20revisão."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider transition-all block cursor-pointer shadow-lg shadow-red-500/20 active:scale-[0.98]"
          >
            Contatar Suporte Aura
          </a>
        </div>
      </div>
      
      <div className="mt-8 text-center text-[10px] text-gray-600 flex items-center gap-1">
        <HelpCircle className="w-3.5 h-3.5" /> ID do IP registrado nos nossos logs de segurança.
      </div>
    </div>
  );
}
