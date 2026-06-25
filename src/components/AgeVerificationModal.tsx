'use client';

import { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';

export default function AgeVerificationModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isVerified = localStorage.getItem('ageVerified');
    if (!isVerified) {
      setIsOpen(true);
      document.body.style.overflow = 'hidden';
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('ageVerified', 'true');
    setIsOpen(false);
    document.body.style.overflow = 'unset';
  };

  const handleReject = () => {
    // Redireciona para um site seguro se a pessoa for menor de idade
    window.location.href = 'https://www.google.com';
  };

  if (!mounted || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="bg-dark-bg border border-dark-border max-w-md w-full rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-wine-primary/20 blur-[50px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-wine-primary/10 flex items-center justify-center mb-6">
            <ShieldAlert className="w-8 h-8 text-wine-light" />
          </div>
          
          <h2 className="text-2xl font-semibold text-white mb-2 tracking-tight">Aviso de Conteúdo +18</h2>
          
          <p className="text-gray-400 text-sm leading-relaxed mb-8">
            Este site contém material adulto destinado estritamente a maiores de 18 anos. 
            Ao clicar em "Sou maior de idade", você confirma que tem pelo menos 18 anos completos.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button 
              onClick={handleReject}
              className="flex-1 py-3 px-4 rounded-xl border border-dark-border text-gray-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
            >
              Sou menor de idade
            </button>
            <button 
              onClick={handleAccept}
              className="flex-1 py-3 px-4 rounded-xl bg-wine-primary text-white hover:bg-wine-primary/90 shadow-[0_0_20px_rgba(155,44,44,0.3)] hover:shadow-[0_0_30px_rgba(155,44,44,0.5)] transition-all text-sm font-medium"
            >
              Sou maior de idade
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
