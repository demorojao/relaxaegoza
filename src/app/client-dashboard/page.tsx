'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Shield, ShieldCheck, Sparkles, User, LogOut, Heart, Star, Check, PhoneCall, History, Upload, Crown, Play, Eye, Calendar, X, ExternalLink, Image as ImageIcon, Video, Lock, Unlock } from 'lucide-react';
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

  // Exclusivos / Subscriptions State
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [activeSubModal, setActiveSubModal] = useState<any | null>(null);
  const [subMedias, setSubMedias] = useState<any[]>([]);
  const [loadingMedias, setLoadingMedias] = useState(false);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);

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
        fetchClientSubscriptions(user.id);
      }
    } else {
      router.push('/login');
    }
    setLoading(false);
  };

  const fetchClientSubscriptions = async (clientId: string) => {
    setLoadingSubs(true);
    try {
      const { data: subsData, error: subsErr } = await supabase
        .from('premium_subscriptions')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'active');

      if (subsErr) {
        console.warn('Err fetching subs:', subsErr);
        setLoadingSubs(false);
        return;
      }

      if (subsData && subsData.length > 0) {
        const providerIds = subsData.map(s => s.provider_id);
        const { data: providersData } = await supabase
          .from('profiles')
          .select('id, name, city, state, subscription_price_cents, profile_photo')
          .in('id', providerIds);

        const joined = subsData.map(s => ({
          ...s,
          provider: providersData?.find(p => p.id === s.provider_id) || { name: 'Profissional', id: s.provider_id }
        }));
        setSubscriptions(joined);
      } else {
        setSubscriptions([]);
      }
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoadingSubs(false);
    }
  };

  const handleOpenVipFeed = async (sub: any) => {
    setActiveSubModal(sub);
    setLoadingMedias(true);
    setSubMedias([]);

    try {
      const { data: medias } = await supabase
        .from('premium_media')
        .select('*')
        .eq('profile_id', sub.provider_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (medias) {
        setSubMedias(medias);
      }
    } catch (err) {
      console.error('Error loading sub medias:', err);
    } finally {
      setLoadingMedias(false);
    }
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

      const selfiePublicUrl = await uploadToR2(selfieFile);

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
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold-primary/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-wine-primary/5 blur-[150px] rounded-full pointer-events-none" />

      <header className="sticky top-0 z-40 bg-black/70 backdrop-blur-lg border-b border-white/5 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Link href="/" className="text-xs text-gray-400 hover:text-white transition-colors hidden sm:block">
            Ir para a Vitrine
          </Link>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="text-xs">Sair</span>
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 mt-10 space-y-10">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            
            <div className="glass-effect rounded-2xl border border-gold-primary/20 p-6 space-y-6 bg-gradient-to-br from-gold-primary/5 to-transparent relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gold-primary/10 text-gold-primary rounded-xl">
                    <Crown className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Minhas Assinaturas VIP & Conteúdos Exclusivos</h3>
                    <p className="text-xs text-gray-400 font-light">
                      Canais VIP de acompanhantes e massagistas com acesso completo liberado.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] bg-gold-primary/20 text-gold-primary border border-gold-primary/30 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                  {subscriptions.length} {subscriptions.length === 1 ? 'Canal Ativo' : 'Canais Ativos'}
                </span>
              </div>

              {loadingSubs ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 border-2 border-gold-primary/30 border-t-gold-primary rounded-full animate-spin" />
                </div>
              ) : subscriptions.length === 0 ? (
                <div className="bg-black/30 border border-white/5 rounded-xl p-6 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white">Nenhuma assinatura VIP ativa</h4>
                    <p className="text-[11px] text-gray-400 font-light mt-1 max-w-md mx-auto leading-relaxed">
                      Você ainda não assinou o clube exclusivo de nenhuma profissional. Navegue pelos perfis na vitrine e assine com Pix Instantâneo para liberar fotos e vídeos inéditos.
                    </p>
                  </div>
                  <Link href="/" className="inline-block pt-2">
                    <button className="px-4 py-2 rounded-xl bg-gold-primary hover:bg-gold-light text-dark-bg text-xs font-bold transition-all shadow-md">
                      Explorar Perfis na Vitrine
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {subscriptions.map(sub => (
                    <div 
                      key={sub.id} 
                      className="bg-black/40 border border-gold-primary/30 rounded-xl p-4 space-y-4 hover:border-gold-primary transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-gold-primary/40 bg-dark-bg shrink-0">
                          {sub.provider?.profile_photo ? (
                            <img src={sub.provider.profile_photo} alt={sub.provider.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gold-primary font-bold">
                              {sub.provider.name?.charAt(0) || 'P'}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-white truncate group-hover:text-gold-primary transition-colors">
                            {sub.provider.name}
                          </h4>
                          <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                            <Unlock className="w-3 h-3" /> Acesso VIP Ativo
                          </span>
                        </div>
                      </div>

                      <div className="bg-black/30 p-2.5 rounded-lg border border-white/5 text-[10px] space-y-1 text-gray-400">
                        <div className="flex justify-between items-center">
                          <span>Válido até:</span>
                          <span className="text-white font-medium">
                            {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString('pt-BR') : '30 dias'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenVipFeed(sub)}
                        className="w-full py-2 rounded-lg bg-gold-primary hover:bg-gold-light text-dark-bg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-gold-primary/10"
                      >
                        <Eye className="w-3.5 h-3.5" /> Ver Fotos & Vídeos VIP
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

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

            <div className="glass-effect rounded-2xl border border-white/5 p-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <History className="w-4 h-4 text-gold-primary" /> Histórico de Agendamentos & Avaliações
              </h3>
              
              <div className="text-center py-8 border-2 border-dashed border-dark-border/40 rounded-xl">
                <span className="text-xs text-gray-500 font-light">Nenhuma atividade recente registrada. Suas avaliações aparecerão aqui.</span>
              </div>
            </div>
          </div>

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

      {activeSubModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121214] border border-gold-primary/30 rounded-3xl max-w-3xl w-full p-6 md:p-8 space-y-6 shadow-2xl relative animate-scaleUp">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gold-primary/10 border border-gold-primary/30 flex items-center justify-center text-gold-primary font-bold">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Canal Exclusivo VIP: {activeSubModal.provider?.name}
                  </h3>
                  <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                    <Unlock className="w-3 h-3" /> Acesso Total Desbloqueado para Assinante
                  </span>
                </div>
              </div>
              <button
                onClick={() => { setActiveSubModal(null); setPreviewMediaUrl(null); }}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingMedias ? (
              <div className="py-20 flex justify-center">
                <div className="w-8 h-8 border-2 border-gold-primary/30 border-t-gold-primary rounded-full animate-spin" />
              </div>
            ) : subMedias.length === 0 ? (
              <div className="py-16 text-center border-2 border-dashed border-white/10 rounded-2xl space-y-2">
                <ImageIcon className="w-8 h-8 text-gray-500 mx-auto" />
                <p className="text-xs text-gray-400 font-light">Nenhuma foto ou vídeo exclusivo publicado recentemente neste canal.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-gold-primary" /> Mídias Exclusivas do Clube ({subMedias.length})
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-1">
                  {subMedias.map(media => {
                    const isVideo = media.media_type === 'video';
                    return (
                      <div 
                        key={media.id}
                        className="bg-black/60 border border-white/10 rounded-2xl overflow-hidden group hover:border-gold-primary/50 transition-all flex flex-col justify-between"
                      >
                        <div className="relative aspect-[3/4] bg-dark-bg overflow-hidden cursor-pointer" onClick={() => setPreviewMediaUrl(media.media_url)}>
                          <img 
                            src={media.media_url || media.preview_url} 
                            alt={media.title || 'Mídia Exclusiva'} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="px-3 py-1.5 rounded-xl bg-gold-primary text-dark-bg font-bold text-xs flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5" /> Ampliar em HD
                            </span>
                          </div>
                          <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-gold-primary px-2 py-0.5 rounded text-[9px] font-bold border border-gold-primary/30">
                            {isVideo ? 'VÍDEO VIP' : 'FOTO HD'}
                          </span>
                        </div>
                        
                        <div className="p-3 space-y-1 bg-black/40 border-t border-white/5">
                          <h5 className="text-xs font-semibold text-white truncate">{media.title || 'Conteúdo Exclusivo'}</h5>
                          {media.description && (
                            <p className="text-[10px] text-gray-400 font-light line-clamp-2">{media.description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                onClick={() => { setActiveSubModal(null); setPreviewMediaUrl(null); }}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Fechar Canal
              </button>
            </div>
          </div>
        </div>
      )}

      {previewMediaUrl && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
          <button 
            onClick={() => setPreviewMediaUrl(null)}
            className="absolute top-6 right-6 p-3 text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-gold-primary/30 shadow-2xl relative flex items-center justify-center">
            <img src={previewMediaUrl} alt="Mídia Ampliada" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
