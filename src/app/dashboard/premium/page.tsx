'use client';

import React from 'react';
import { Lock } from 'lucide-react';

export default function PremiumPage() {
  return (
    <div className="max-w-xl mx-auto py-20 px-6 text-center space-y-4">
      <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto text-gray-400">
        <Lock className="w-6 h-6" />
      </div>
      <h2 className="text-lg font-bold text-white">Módulo de Conteúdo Exclusivo Temporariamente Indisponível</h2>
      <p className="text-xs text-gray-400 font-light leading-relaxed">
        A funcionalidade de venda de conteúdos exclusivos e assinaturas está desativada no momento. Utilize o painel para gerenciar suas fotos públicas e anúncios.
      </p>
    </div>
  );
}
