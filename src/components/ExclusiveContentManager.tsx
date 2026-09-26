'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadToR2 } from '@/lib/r2Client';
import { getCDNUrl } from '@/lib/mediaHelper';
import { Crown, Sparkles, Upload, Lock, Trash2, Eye, Video, Image as ImageIcon, DollarSign, Check, Plus, AlertCircle } from 'lucide-react';

interface ExclusiveContentManagerProps {
  profile: any;
  onSave?: () => void;
}

export default function ExclusiveContentManager({ profile, onSave }: ExclusiveContentManagerProps) {
  const [subscriptionPrice, setSubscriptionPrice] = useState<string>(
    profile?.subscription_price_cents ? (profile.subscription_price_cents / 100).toString() : '49.90'
  );
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceSuccess, setPriceSuccess] = useState(false);

  // Mídias VIP
  const [medias, setMedias] = useState<any[]>([]);
  const [loadingMedias, setLoadingMedias] = useState(true);

  // Modal / Form de nova mídia
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Estatísticas de Assinantes & Finanças VIP
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [totalNetRevenueCents, setTotalNetRevenueCents] = useState(0);
  const [pixKey, setPixKey] = useState(profile?.pix_key || '');
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutFeedback, setPayoutFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [payoutsHistory, setPayoutsHistory] = useState<any[]>([]);

  const handleRequestPayout = async () => {
    setPayoutFeedback(null);
    if (!pixKey.trim()) {
      const msg = 'Informe seu CPF, E-mail, Telefone ou Chave Pix para receber a transferência.';
      setPayoutFeedback({ text: msg, type: 'error' });
      return;
    }

    if (totalNetRevenueCents < 500) {
      const msg = `Seu saldo disponível para saque no momento é R$ ${(totalNetRevenueCents / 100).toFixed(2)}. O valor mínimo para solicitar saque Pix é de R$ 5,00.`;
      setPayoutFeedback({ text: msg, type: 'error' });
      return;
    }

    setRequestingPayout(true);
    try {
      if (pixKey.trim() !== profile?.pix_key) {
        await supabase
          .from('profiles')
          .update({ pix_key: pixKey.trim() })
          .eq('id', profile.id);
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/payouts', {
        method: 'POST',
        headers,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao realizar solicitação de saque.');
      }

      const successMsg = `🎉 SUCESSO! ${data.message || 'Solicitação de saque Pix registrada com sucesso!'}`;
      setPayoutFeedback({ text: successMsg, type: 'success' });
      fetchVipData();
    } catch (err: any) {
      const errMsg = err.message || 'Erro ao processar saque Pix.';
      setPayoutFeedback({ text: errMsg, type: 'error' });
    } finally {
      setRequestingPayout(false);
    }
  };

  useEffect(() => {
    if (profile?.id) {
      fetchVipData();
    }
  }, [profile?.id]);

  const fetchVipData = async () => {
    setLoadingMedias(true);
    try {
      // 1. Mídias
      const { data: mediaData } = await supabase
        .from('premium_media')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false });

      if (mediaData) setMedias(mediaData);

      // 2. Contagem de Assinantes ativos
      const { count: subCount } = await supabase
        .from('premium_subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('provider_id', profile.id)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString());

      setSubscriberCount(subCount || 0);

      // 3. Receita total líquida (compras sem payout_id atribuído)
      const { data: purchases } = await supabase
        .from('content_purchases')
        .select('net_amount_cents, amount_cents')
        .eq('provider_id', profile.id)
        .is('payout_id', null)
        .in('status', ['completed', 'paid']);

      let total = 0;
      if (purchases && purchases.length > 0) {
        total = purchases.reduce((acc, p) => acc + (p.net_amount_cents || Math.round((p.amount_cents || 0) * 0.9)), 0);
      }

      // Se content_purchases não trouxe compras sem payout, verificar a tabela payments para vendas VIP pagas
      if (total === 0) {
        const { data: vipPayments } = await supabase
          .from('payments')
          .select('amount_cents')
          .eq('target_profile_id', profile.id)
          .eq('tier', 'exclusive_subscription')
          .in('status', ['paid', 'completed']);

        if (vipPayments && vipPayments.length > 0) {
          total = vipPayments.reduce((acc, p) => acc + Math.round((p.amount_cents || 4990) * 0.9), 0);
        }
      }

      setTotalNetRevenueCents(total);

      // 4. Histórico de saques
      const { data: payouts } = await supabase
        .from('payouts')
        .select('*')
        .eq('provider_id', profile.id)
        .order('created_at', { ascending: false });

      if (payouts) setPayoutsHistory(payouts);
    } catch (err) {
      console.error('Erro ao carregar dados VIP:', err);
    } finally {
      setLoadingMedias(false);
    }
  };

  const handleSavePrice = async () => {
    setSavingPrice(true);
    setPriceSuccess(false);
    try {
      const priceCents = Math.round(parseFloat(subscriptionPrice.replace(',', '.')) * 100);
      if (isNaN(priceCents) || priceCents < 1000) {
        alert('O valor mínimo de assinatura é R$ 10,00.');
        setSavingPrice(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ subscription_price_cents: priceCents })
        .eq('id', profile.id);

      if (error) throw error;
      setPriceSuccess(true);
      if (onSave) onSave();
      setTimeout(() => setPriceSuccess(false), 3000);
    } catch (err: any) {
      alert('Erro ao salvar valor da assinatura: ' + (err.message || err));
    } finally {
      setSavingPrice(false);
    }
  };

  const handleUploadMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaFile) {
      alert('Selecione uma foto ou vídeo para enviar.');
      return;
    }

    setUploading(true);
    try {
      // Upload para R2
      const mediaUrl = await uploadToR2(mediaFile);
      if (!mediaUrl) throw new Error('Falha no upload do arquivo.');

      // Inserir registro na premium_media
      const { error } = await supabase
        .from('premium_media')
        .insert({
          profile_id: profile.id,
          title: title || (mediaType === 'video' ? 'Vídeo Exclusivo VIP' : 'Foto Exclusiva VIP'),
          description,
          media_type: mediaType,
          media_url: mediaUrl,
          preview_url: mediaUrl, // CDN preview
          is_active: true
        });

      if (error) throw error;

      alert('Mídia exclusiva publicada com sucesso!');
      setShowUploadModal(false);
      setTitle('');
      setDescription('');
      setMediaFile(null);
      fetchVipData();
    } catch (err: any) {
      console.error('Erro no upload de mídia VIP:', err);
      alert('Erro ao publicar mídia: ' + (err.message || err));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (mediaId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta mídia exclusiva? Assinantes deixarão de vê-la.')) return;

    try {
      const { error } = await supabase
        .from('premium_media')
        .delete()
        .eq('id', mediaId)
        .eq('profile_id', profile.id);

      if (error) throw error;
      setMedias(prev => prev.filter(m => m.id !== mediaId));
    } catch (err: any) {
      alert('Erro ao excluir mídia: ' + err.message);
    }
  };

  return (
    <div className="glass-effect rounded-3xl border border-gold-primary/30 p-6 md:p-8 space-y-8 bg-gradient-to-br from-gold-primary/5 via-dark-bg/80 to-transparent relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gold-primary/10 text-gold-primary rounded-xl">
              <Crown className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-wide">
              Gerenciar Meu Clube VIP & Conteúdos Exclusivos
            </h2>
          </div>
          <p className="text-xs text-gray-400 font-light max-w-2xl leading-relaxed">
            Publique fotos e vídeos inéditos e defina a mensalidade do seu canal privado. Você recebe **90% líquidos** de cada assinatura realizada via Pix Instantâneo.
          </p>
        </div>

        {/* Resumo Financeiro VIP */}
        <div className="flex items-center gap-4 bg-black/40 border border-white/10 p-4 rounded-2xl shrink-0">
          <div className="text-center px-2">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">Assinantes VIP</span>
            <span className="text-lg font-bold text-emerald-400">{subscriberCount}</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center px-2">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">Ganhos Acumulados</span>
            <span className="text-lg font-bold text-gold-primary">
              R$ {(totalNetRevenueCents / 100).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Configuração de Valor da Assinatura Mensal */}
      <div className="bg-black/40 border border-white/5 p-5 rounded-2xl space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-gold-primary" />
          Preço da Sua Assinatura Mensal (Pix)
        </h3>

        <div className="flex flex-col sm:flex-row items-center gap-3 max-w-md">
          <div className="relative w-full">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">R$</span>
            <input
              type="number"
              step="0.01"
              value={subscriptionPrice}
              onChange={(e) => setSubscriptionPrice(e.target.value)}
              placeholder="49.90"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-bold focus:outline-none focus:border-gold-primary/60"
            />
          </div>

          <button
            onClick={handleSavePrice}
            disabled={savingPrice}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gold-primary hover:bg-gold-light text-dark-bg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md"
          >
            {savingPrice ? (
              'Salvando...'
            ) : priceSuccess ? (
              <>
                <Check className="w-4 h-4 text-dark-bg" /> Preço Salvo!
              </>
            ) : (
              'Atualizar Preço'
            )}
          </button>
        </div>
        <p className="text-[11px] text-gray-500 font-light">
          Este é o valor mensal que os clientes pagarão via Pix para desbloquear todas as fotos e vídeos do seu canal VIP.
        </p>
      </div>

      {/* Solicitar Saque Pix dos Ganhos VIP */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-black/40 to-transparent border border-emerald-500/30 p-5 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4.5 h-4.5 text-emerald-400" />
              Saque Pix dos Ganhos VIP
            </h3>
            <p className="text-[11px] text-gray-400 font-light mt-0.5">
              Solicite a transferência imediata dos seus ganhos para a sua chave Pix (Mínimo R$ 5,00).
            </p>
          </div>
          <span className="text-sm font-extrabold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/30 shrink-0">
            Saldo Disponível: R$ {(totalNetRevenueCents / 100).toFixed(2)}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full flex-1">
            <input
              type="text"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder="Digite seu CPF, E-mail, Telefone ou Chave Pix"
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          <button
            onClick={handleRequestPayout}
            disabled={requestingPayout}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-bg font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shrink-0 disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            {requestingPayout ? (
              <>
                <div className="w-4 h-4 border-2 border-dark-bg/30 border-t-dark-bg rounded-full animate-spin" />
                Transferindo...
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4" /> Solicitar Saque Pix Agora
              </>
            )}
          </button>
        </div>

        {payoutFeedback && (
          <div className={`p-4 rounded-xl text-xs font-semibold flex items-start gap-2 border animate-fadeIn ${
            payoutFeedback.type === 'success' 
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' 
              : 'bg-red-500/20 border-red-500/50 text-red-300'
          }`}>
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{payoutFeedback.text}</span>
          </div>
        )}

        {/* Histórico de Saques do Provedor */}
        {payoutsHistory.length > 0 && (
          <div className="pt-3 border-t border-white/10 space-y-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Histórico de Solicitações de Saque
            </span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {payoutsHistory.map((p) => {
                const isDone = p.status === 'completed';
                const isPending = p.status === 'pending_manual_transfer' || p.status === 'processing' || p.status === 'pending';
                const statusLabel = isDone ? 'Repassado (Concluído)' : isPending ? 'Aguardando Repasse Pix' : 'Erro no Saque';
                const statusColor = isDone ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : isPending ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30';
                
                return (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs">
                    <div className="space-y-0.5">
                      <span className="font-bold text-white block">
                        R$ {((p.net_amount_cents || p.amount_cents) / 100).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-gray-400 font-light block">
                        Chave: {p.pix_key} • {new Date(p.created_at).toLocaleDateString('pt-BR')} às {new Date(p.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold shrink-0 ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Mídias Exclusivas Publicadas */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-gold-primary" />
            Mídias Publicadas no Canal ({medias.length})
          </h3>

          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 rounded-xl bg-gold-primary hover:bg-gold-light text-dark-bg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Postar Foto/Vídeo VIP
          </button>
        </div>

        {loadingMedias ? (
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-gold-primary/30 border-t-gold-primary rounded-full animate-spin" />
          </div>
        ) : medias.length === 0 ? (
          <div className="bg-black/30 border border-white/5 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Você ainda não enviou mídias VIP</h4>
              <p className="text-[11px] text-gray-400 font-light mt-1 max-w-sm mx-auto">
                Poste suas primeiras fotos e vídeos exclusivos para atrair assinantes pagantes.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {medias.map((m) => {
              const isVideo = m.media_type === 'video';
              const mediaSrc = getCDNUrl(m.preview_url || m.media_url);

              return (
                <div key={m.id} className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 bg-black/60 group">
                  {isVideo ? (
                    <video
                      src={mediaSrc}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      muted
                      loop
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={mediaSrc}
                      alt={m.title || ''}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-between p-3">
                    <span className="self-start bg-black/60 backdrop-blur-xs text-gold-primary text-[9px] font-bold px-2 py-0.5 rounded border border-gold-primary/30 flex items-center gap-1">
                      {isVideo ? <Video className="w-3 h-3 text-gold-primary" /> : <ImageIcon className="w-3 h-3 text-gold-primary" />}
                      {isVideo ? 'VÍDEO' : 'FOTO'}
                    </span>

                    <div className="space-y-1">
                      <h5 className="text-xs font-bold text-white truncate">{m.title || 'Mídia VIP'}</h5>
                      <button
                        onClick={() => handleDeleteMedia(m.id)}
                        className="w-full py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 text-red-300 text-[10px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" /> Excluir Mídia
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Envio de Nova Mídia VIP */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121214] border border-gold-primary/40 rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Crown className="w-5 h-5 text-gold-primary" /> Postar Novo Conteúdo VIP
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-white text-xs font-bold"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={handleUploadMedia} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-300 uppercase block mb-1.5">Tipo de Mídia</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMediaType('photo')}
                    className={`py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
                      mediaType === 'photo'
                        ? 'bg-gold-primary/20 border-gold-primary text-gold-light'
                        : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" /> Foto HD
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaType('video')}
                    className={`py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
                      mediaType === 'video'
                        ? 'bg-gold-primary/20 border-gold-primary text-gold-light'
                        : 'bg-white/5 border-white/10 text-gray-400'
                    }`}
                  >
                    <Video className="w-4 h-4" /> Vídeo HD
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 uppercase block mb-1">Título do Conteúdo</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Ensaio Exclusivo VIP - Bastidores"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-gold-primary/60"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 uppercase block mb-1">Descrição (Opcional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Descreva detalhes deste conteúdo..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-medium focus:outline-none focus:border-gold-primary/60 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 uppercase block mb-1">Selecione o Arquivo ({mediaType === 'video' ? 'Vídeo MP4/WebM' : 'Foto JPG/PNG'})</label>
                <input
                  type="file"
                  accept={mediaType === 'video' ? 'video/*' : 'image/*'}
                  onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-gold-primary file:text-dark-bg cursor-pointer"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading || !mediaFile}
                  className="px-6 py-2.5 rounded-xl bg-gold-primary hover:bg-gold-light text-dark-bg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-dark-bg/30 border-t-dark-bg rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" /> Publicar no Canal VIP
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
