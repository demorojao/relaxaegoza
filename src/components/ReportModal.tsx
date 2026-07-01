'use client';

import React, { useState } from 'react';
import { X, ShieldAlert, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from './ui/Button';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedProfileId: string;
  reportedProfileName: string;
}

const REPORT_REASONS = [
  'Fotos Falsas / Desatualizadas',
  'Idade Incorreta / Menor de Idade',
  'Valores / Serviços Incorretos',
  'Comportamento Inadequado / Agressivo',
  'Golpe / Perfil Inexistente',
  'Outros'
];

export default function ReportModal({ isOpen, onClose, reportedProfileId, reportedProfileName }: ReportModalProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setError('Por favor, selecione um motivo.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/reports', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          reported_profile_id: reportedProfileId,
          reason,
          description
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao enviar a denúncia.');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao enviar sua denúncia.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-dark-bg border border-white/10 max-w-md w-full rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-24 bg-red-500/10 blur-[40px] pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Denúncia Enviada</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Obrigado por ajudar a manter a comunidade segura. A equipe administrativa revisará esta denúncia sobre <strong>{reportedProfileName}</strong> o mais rápido possível.
            </p>
            <Button variant="gold" onClick={onClose} className="w-full mt-4">
              Ok, Fechar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 mb-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-lg font-semibold text-white">Denunciar Perfil</h3>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Você está denunciando o perfil de <strong>{reportedProfileName}</strong>. Esta ação é confidencial e ajuda na moderação do portal.
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-3 py-2 rounded-xl">
                {error}
              </div>
            )}

            {/* Motivo */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-400">Selecione o Motivo</label>
              <select
                value={reason}
                title="Motivo da denúncia"
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-black/40 border border-white/5 focus:border-gold-primary/30 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none transition-colors appearance-none cursor-pointer"
              >
                <option value="" className="bg-dark-bg text-gray-500">Escolha o motivo principal...</option>
                {REPORT_REASONS.map(r => (
                  <option key={r} value={r} className="bg-dark-bg text-white">{r}</option>
                ))}
              </select>
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-gray-400">Detalhes Adicionais (Opcional)</label>
              <textarea
                value={description}
                title="Detalhes da denúncia"
                placeholder="Descreva o que aconteceu de forma resumida..."
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full bg-black/40 border border-white/5 focus:border-gold-primary/30 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none transition-colors resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="dark"
                onClick={onClose}
                className="flex-1 py-3"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="gold"
                disabled={loading}
                isLoading={loading}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white border-none"
              >
                Enviar Denúncia
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
