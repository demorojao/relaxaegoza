'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, ShieldCheck, Sparkles, User, LogOut, Heart, Star, Check, PhoneCall, History, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { uploadToR2 } from '@/lib/r2Client';

export default function ClientDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyingSuccess, setVerifyingSuccess] = useState(false);

  useEffect(() => {
    fetchClientProfile();
  }, []);

  const fetchClientProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data) {
        if (data.role === 'provider' || data.role === 'host') {
          router.push('/dashboard');
          return;
        }
        setProfile(data);
      }
    } else {
      router.push('/login');
    }
    setLoading(false);
  };

  const handleVerifyClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!selfieFile) {
      alert('Por favor, selecione uma foto de selfie.');
      return;
    }
    setVerifying(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Upload the Selfie file to Cloudflare R2
      const selfiePublicUrl = await uploadToR2(selfieFile);

      // 2. Update verification status in profiles table
      const { error } = await supabase
        .from('profiles')
        .update({
          verification_status: 'pending',
          verification_selfie: selfiePublicUrl
        })
        .eq('id', profile.id);

      if (error) throw error;

      setVerifyingSuccess(true);
      setProfile((prev: any) => ({
        ...prev,
        verification_status: 'pending',
        verification_selfie: selfiePublicUrl
      }));
    } catch (err: any) {
      console.error('Erro na verificação do cliente:', err);
      alert('Erro ao processar verificação: ' + (err.message || err));
    } finally {
      setVerifying(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-dark-bg flex justify-center py-40">
        <div className="w-10 h-10 border-4 border-gold-primary/30 border-t-gold-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Círculo de Confiança Score
  const trustLevel = 
    profile?.verification_status === 'verified' 
      ? 'Ouro (Máximo)' 
      : profile?.verification_status === 'pending'
        ? 'Bronze (Em Análise)'
        : profile?.verification_status === 'rejected'
          ? 'Bronze (Recusado)'
          : 'Bronze (Básico)';

  const trustScore = 
    profile?.verification_status === 'verified' 
      ? '98%' 
      : profile?.verification_status === 'pending'
        ? '60%'
        : profile?.verification_status === 'rejected'
          ? '30%'
          : '45%';

  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 selection:bg-gold-primary selection:text-dark-bg relative overflow-hidden pb-16">
      {/* Background Lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold-primary/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-wine-primary/5 blur-[150px] rounded-full pointer-events-none" />


      {/* Header Fixo */}
      <header className="sticky top-0 z-40 bg-black/60 backdrop-blur-lg border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-4">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-400 transition-colors font-medium cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 mt-10 space-y-10">
        {/* Welcome Block */}
        <div className="glass-effect rounded-3xl p-6 md:p-8 border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gold-primary/10 border border-gold-primary/20 flex items-center justify-center text-gold-primary">
              <User className="w-7 h-7" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold block mb-0.5">Painel do Cliente</span>
              <h1 className="text-xl md:text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
                {profile?.name}
                {profile?.verification_status === 'verified' && (
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                )}
              </h1>
            </div>
          </div>

          {/* Círculo de Confiança Score Badge */}
          <div className="bg-black/40 border border-white/5 rounded-2xl p-4 flex gap-6 items-center">
            <div className="text-center">
              <span className="text-[10px] uppercase text-gray-500 font-semibold block mb-1">Nível de Confiança</span>
              <span className="text-sm font-bold text-gold-primary">{trustLevel}</span>
            </div>
            <div className="w-px h-8 bg-white/5" />
            <div className="text-center">
              <span className="text-[10px] uppercase text-gray-500 font-semibold block mb-1">Taxa de Segurança</span>
              <span className="text-sm font-bold text-emerald-400">{trustScore}</span>
            </div>
          </div>
        </div>

        {/* Duas Seções Principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Coluna 1 & 2: Ações / Histórico */}
          <div className="md:col-span-2 space-y-8">
            
            {/* Bloco: Círculo de Confiança Explicação & Ativação */}
            <div className="glass-effect rounded-2xl border border-white/5 p-6 space-y-6">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl mt-0.5">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white mb-1">Selo "Cliente de Confiança"</h3>
                  <p className="text-xs text-gray-400 font-light leading-relaxed">
                    O Círculo de Confiança é nossa maior inovação de segurança. Ao verificar sua selfie, as profissionais sabem que estão lidando com uma pessoa de verdade. Perfis verificados evitam trotes e ganham prioridade absoluta de resposta das garotas.
                  </p>
                </div>
              </div>

              <div className="bg-gold-primary/5 border border-gold-primary/20 text-xs p-4 rounded-xl flex gap-3 items-start animate-fadeIn">
                <Shield className="w-5 h-5 text-gold-primary shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <p className="font-semibold text-white">Aviso de Privacidade & Segurança</p>
                  <p className="text-gray-400 font-light leading-relaxed">
                    Sua privacidade é nossa prioridade: <span className="text-gold-light font-medium">você não precisa usar seu nome verdadeiro</span> (pode usar um apelido). Contudo, a <span className="text-gold-light font-medium">verificação de dados (selfie) é de suma importância</span> para garantir a segurança das acompanhantes e massagistas. Clientes verificados têm total preferência e credibilidade no portal.
                  </p>
                </div>
              </div>

              {profile?.verification_status === 'verified' ? (
                <div className="bg-emerald-500/2 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3 animate-fadeIn">
                  <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-semibold text-white">Selo Ouro de Segurança Ativo!</h4>
                    <p className="text-[10px] text-gray-500 font-light leading-relaxed">
                      Seu selo é anexado às suas interações e avaliações. As profissionais veram que você é um cliente verificado e idôneo.
                    </p>
                  </div>
                </div>
              ) : profile?.verification_status === 'pending' ? (
                <div className="bg-gold-primary/2 border border-gold-primary/20 rounded-xl p-4 flex items-center gap-3 animate-fadeIn">
                  <div className="w-8 h-8 rounded-full border border-gold-primary/30 border-t-gold-primary animate-spin shrink-0" />
                  <div>
                    <h4 className="text-xs font-semibold text-white">Selo de Segurança em Análise</h4>
                    <p className="text-[10px] text-gray-400 font-light leading-relaxed">
                      Sua selfie foi enviada e está aguardando revisão pela equipe de moderação. A validação é realizada manualmente por humanos e pode levar até 72 horas.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-fadeIn">
                  {profile?.verification_status === 'rejected' && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-xs p-3.5 rounded-xl">
                      <p className="font-semibold text-red-400 mb-0.5">Selfie de Verificação Recusada</p>
                      <p className="text-gray-400 font-light leading-relaxed">
                        Sua selfie anterior não pôde ser aprovada (ex: imagem borrada ou inválida). Por favor, envie uma nova foto nítida abaixo.
                      </p>
                    </div>
                  )}
                  <form onSubmit={handleVerifyClient} className="bg-black/30 border border-white/5 rounded-xl p-4 space-y-4">
                    <h4 className="text-xs font-semibold text-white">Ativar meu Selo Ouro de Segurança</h4>
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-400 uppercase font-medium">Sua foto (Selfie rápida)</label>
                      <div className="relative border border-dashed border-dark-border hover:border-gold-primary/50 transition-colors rounded-xl p-4 bg-dark-bg/40 flex flex-col items-center justify-center gap-2 min-h-24">
                        <input 
                          type="file" 
                          accept="image/*"
                          title="Foto de selfie para verificação"
                          placeholder="Envie sua foto de selfie"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setSelfieFile(file);
                            if (file) {
                              setSelfiePreview(URL.createObjectURL(file));
                            } else {
                              setSelfiePreview(null);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          required
                        />
                        {selfiePreview ? (
                          <div className="flex flex-col items-center gap-2">
                            <img src={selfiePreview} alt="Selfie Preview" className="w-24 h-24 object-cover rounded-lg border border-gold-primary/30" />
                            <span className="text-[10px] text-gray-400">Clique para alterar a foto</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-gray-500" />
                            <span className="text-xs text-gray-400 text-center">Clique ou arraste para enviar sua selfie</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={verifying}
                      className="w-full px-6 py-2.5 rounded-xl bg-gold-primary text-dark-bg hover:bg-gold-light text-xs font-semibold tracking-wide transition-all shadow-[0_4px_12px_rgba(197,168,128,0.2)] disabled:opacity-50 cursor-pointer"
                    >
                      {verifying ? 'Enviando selfie...' : 'Ativar Selo com Selfie'}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Favoritas / Atividades */}
            <div className="glass-effect rounded-2xl border border-white/5 p-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <History className="w-4 h-4 text-gold-primary" /> Histórico de Agendamentos & Avaliações
              </h3>
              
              <div className="text-center py-8 border-2 border-dashed border-dark-border/40 rounded-xl">
                <span className="text-xs text-gray-500 font-light">Nenhuma atividade recente registrada. Suas avaliações aparecerão aqui.</span>
              </div>
            </div>

          </div>

          {/* Coluna 3: Benefícios / Menu Lateral */}
          <div className="space-y-6">
            <div className="glass-effect rounded-2xl border border-white/5 p-5 space-y-4">
              <h4 className="text-xs font-semibold text-gold-primary uppercase tracking-wider">Regras de Convivência</h4>
              <ul className="space-y-3 text-xs text-gray-400 font-light leading-relaxed">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gold-primary mt-0.5 shrink-0" />
                  <span>Seja sempre educado e respeitoso com as profissionais.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gold-primary mt-0.5 shrink-0" />
                  <span>Respeite as regras estruturadas de cada perfil.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-gold-primary mt-0.5 shrink-0" />
                  <span>Avaliações inverídicas acarretarão perda do selo de confiança.</span>
                </li>
              </ul>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
