'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Sparkles, AlertCircle, Check, Camera, Video, HelpCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { getCDNUrl } from '../lib/mediaHelper';
import { triggerRevalidate } from '../lib/revalidate';

interface AdEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  onSaveSuccess?: () => void;
}

export default function AdEditorModal({ isOpen, onClose, profile, onSaveSuccess }: AdEditorModalProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingAd, setFetchingAd] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [gallery, setGallery] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Boost states
  const [boostTimeLeft, setBoostTimeLeft] = useState<string | null>(null);
  const [boostingCheckout, setBoostingCheckout] = useState(false);

  useEffect(() => {
    if (!profile?.boost_expires_at) {
      setBoostTimeLeft(null);
      return;
    }

    const updateCountdown = () => {
      const expireTime = new Date(profile.boost_expires_at).getTime();
      const now = Date.now();
      const diff = expireTime - now;

      if (diff <= 0) {
        setBoostTimeLeft(null);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        const hStr = hours > 0 ? `${hours}h ` : '';
        const mStr = minutes > 0 || hours > 0 ? `${minutes}m ` : '';
        setBoostTimeLeft(`${hStr}${mStr}${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [profile?.boost_expires_at]);

  const handleBuyBoost = async () => {
    setBoostingCheckout(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isBoost: true })
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao iniciar o checkout do Boost.');
    } finally {
      setBoostingCheckout(false);
    }
  };

  const tier = profile?.subscription_tier || 'free';
  const tierName = tier === 'free' ? 'Bronze (Grátis)' : tier === 'pro' ? 'Pro (Silver)' : 'Gold (Premium)';

  // Calculate limits based on tier
  const maxPhotos = tier === 'gold' ? 20 : tier === 'pro' ? 10 : 3;
  const maxVideos = tier === 'gold' ? 15 : tier === 'pro' ? 10 : 0;

  useEffect(() => {
    if (isOpen && profile?.id) {
      loadAdAndGallery();
    }
  }, [isOpen, profile?.id]);

  const loadAdAndGallery = async () => {
    setFetchingAd(true);
    setErrorMsg(null);
    try {
      // 1. Fetch current active ad if exists
      const { data: adData, error: adError } = await supabase
        .from('ads')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (adError) throw adError;

      if (adData) {
        setTitle(adData.title || '');
        setDescription(adData.description || '');
        setPrice(adData.price || 0);
        setSelectedPhotos(adData.photos || []);
        setSelectedVideos(adData.videos || []);
        setIsActive(adData.is_active ?? true);
      } else {
        // Fallbacks from profile
        setTitle(`Atendimento com ${profile.name}`);
        setDescription(profile.bio || '');
        setPrice(profile.price_per_hour || 0);
        setSelectedPhotos([]);
        setSelectedVideos([]);
        setIsActive(true);
      }

      // 2. Fetch all gallery photos and videos
      const { data: galleryData, error: galleryError } = await supabase
        .from('profile_photos')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false });

      if (galleryError) throw galleryError;
      setGallery(galleryData || []);

    } catch (err: any) {
      console.error('Erro ao carregar dados do anúncio:', err);
      setErrorMsg('Ocorreu um erro ao carregar as informações do seu anúncio.');
    } finally {
      setFetchingAd(false);
    }
  };

  const handleTogglePhoto = (url: string) => {
    setSelectedPhotos(prev => {
      if (prev.includes(url)) {
        return prev.filter(p => p !== url);
      }
      if (prev.length >= maxPhotos) {
        alert(`Seu plano ${tierName} permite adicionar no máximo ${maxPhotos} fotos ao anúncio.`);
        return prev;
      }
      return [...prev, url];
    });
  };

  const handleToggleVideo = (url: string) => {
    setSelectedVideos(prev => {
      if (prev.includes(url)) {
        return prev.filter(v => v !== url);
      }
      if (prev.length >= maxVideos) {
        alert(`Seu plano ${tierName} permite adicionar no máximo ${maxVideos} vídeos ao anúncio.`);
        return prev;
      }
      return [...prev, url];
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Por favor, informe um título chamativo para o seu anúncio.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const payload = {
        profile_id: profile.id,
        title,
        description,
        price: Number(price),
        photos: selectedPhotos,
        videos: selectedVideos,
        is_active: isActive,
      };

      const { error } = await supabase
        .from('ads')
        .upsert(payload, { onConflict: 'profile_id' });

      if (error) throw error;

      if (profile) {
        await triggerRevalidate(profile.city, profile.neighborhood);
      }

      alert('Anúncio atualizado com sucesso!');
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar anúncio:', err);
      setErrorMsg(err.message || 'Erro desconhecido ao salvar o anúncio.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const photosList = gallery.filter(item => item.media_type === 'photo' || !item.media_type);
  const videosList = gallery.filter(item => item.media_type === 'video');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-dark-bg border border-white/10 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gold-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-wine-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between relative z-10 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gold-primary animate-pulse" />
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Gerenciador de Anúncio</h2>
              <span className="text-[10px] text-gold-light uppercase tracking-wider font-semibold">Plano Atual: {tierName}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {fetchingAd ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-gray-400 gap-3">
            <div className="w-6 h-6 border-2 border-gold-primary/30 border-t-gold-primary rounded-full animate-spin" />
            <span className="text-xs">Carregando dados do anúncio...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10">
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-xs px-4 py-3.5 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Title / Price */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Título do Anúncio</label>
                <Input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="Ex: Massagem Relaxante Premium com Local Próprio"
                  maxLength={100}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Preço por Hora (R$)</label>
                <Input 
                  type="number" 
                  value={price} 
                  onChange={e => setPrice(Number(e.target.value))} 
                  placeholder="250"
                  min={0}
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Descrição Detalhada do Anúncio</label>
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Descreva aqui os seus diferenciais, os serviços incluídos e detalhes que atraiam os clientes..."
                className="w-full min-h-[100px] rounded-xl bg-black/40 border border-white/10 p-4 text-sm text-gray-200 placeholder:text-gray-600 focus:outline-none focus:border-gold-primary transition-all resize-none"
              />
            </div>

            {/* Photo Selection Grid */}
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-gold-primary" />
                  Selecione as Fotos do Anúncio
                </label>
                <span className="text-[10px] text-gray-500">
                  {selectedPhotos.length} / {maxPhotos} selecionadas
                </span>
              </div>

              {photosList.length === 0 ? (
                <div className="p-6 text-center bg-black/20 rounded-2xl border border-white/5 space-y-2">
                  <p className="text-xs text-gray-500">Nenhuma foto encontrada na sua galeria.</p>
                  <a href="/dashboard/midia" className="text-xs text-gold-primary hover:underline font-semibold block">Ir para a Galeria de Mídias ➜</a>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[180px] overflow-y-auto p-1 bg-black/20 rounded-2xl border border-white/5">
                  {photosList.map(item => {
                    const isSelected = selectedPhotos.includes(item.photo_url);
                    return (
                      <div 
                        key={item.id}
                        onClick={() => handleTogglePhoto(item.photo_url)}
                        className={`aspect-square rounded-xl overflow-hidden relative cursor-pointer border-2 transition-all ${
                          isSelected ? 'border-gold-primary shadow-lg shadow-gold-primary/10' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img 
                          src={getCDNUrl(item.photo_url)} 
                          alt="Galeria" 
                          className="w-full h-full object-cover select-none pointer-events-none" 
                        />
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-gold-primary rounded-full flex items-center justify-center text-dark-bg">
                            <Check className="w-3.5 h-3.5 stroke-[3px]" />
                          </div>
                        )}
                        {item.is_verified && (
                          <div className="absolute bottom-1 left-1 bg-emerald-500 text-white text-[8px] px-1 py-0.5 rounded font-bold uppercase tracking-wider">
                            Real
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Video Selection Grid */}
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-wine-light" />
                  Selecione os Vídeos do Anúncio
                </label>
                <span className="text-[10px] text-gray-500">
                  {selectedVideos.length} / {maxVideos} selecionados
                </span>
              </div>

              {maxVideos === 0 ? (
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    O plano **{tierName}** não permite adicionar vídeos aos anúncios. Faça upgrade para o plano **Silver Pro** ou **Gold Premium** para habilitar o upload e a exibição de vídeos na vitrine!
                  </p>
                </div>
              ) : videosList.length === 0 ? (
                <div className="p-6 text-center bg-black/20 rounded-2xl border border-white/5 space-y-2">
                  <p className="text-xs text-gray-500">Nenhum vídeo encontrado na sua galeria.</p>
                  <a href="/dashboard/midia" className="text-xs text-gold-primary hover:underline font-semibold block">Ir para a Galeria de Mídias ➜</a>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[180px] overflow-y-auto p-1 bg-black/20 rounded-2xl border border-white/5">
                  {videosList.map(item => {
                    const isSelected = selectedVideos.includes(item.photo_url);
                    return (
                      <div 
                        key={item.id}
                        onClick={() => handleToggleVideo(item.photo_url)}
                        className={`aspect-square rounded-xl overflow-hidden relative cursor-pointer border-2 transition-all ${
                          isSelected ? 'border-wine-primary shadow-lg shadow-wine-primary/10' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <video 
                          src={getCDNUrl(item.photo_url)} 
                          className="w-full h-full object-cover select-none pointer-events-none" 
                          muted 
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <Video className="w-6 h-6 text-white opacity-60" />
                        </div>
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-wine-primary rounded-full flex items-center justify-center text-white">
                            <Check className="w-3.5 h-3.5 stroke-[3px]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Boost Card */}
            <div className="p-4 bg-gradient-to-br from-gold-primary/[0.08] to-transparent border border-gold-primary/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-gold-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                  Destaque no Topo (Boost)
                </span>
                <p className="text-[10px] text-gray-400 leading-relaxed max-w-md">
                  Fique no topo absoluto das buscas e da vitrine por 2 horas. Atraia até 5x mais cliques e visualizações no seu anúncio.
                </p>
              </div>
              
              <div>
                {boostTimeLeft ? (
                  <div className="flex flex-col items-center sm:items-end gap-0.5 bg-gold-primary/10 border border-gold-primary/20 px-4 py-2 rounded-xl shrink-0">
                    <span className="text-[9px] text-gold-primary uppercase font-bold animate-pulse">🚀 Boost Ativo</span>
                    <span className="text-sm font-bold text-white font-mono">{boostTimeLeft}</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleBuyBoost}
                    disabled={boostingCheckout}
                    className="px-4 py-2.5 rounded-xl bg-gold-primary hover:bg-gold-light text-dark-bg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-gold-primary/20 disabled:opacity-50 flex items-center gap-1.5 hover:scale-[1.02] shrink-0"
                  >
                    {boostingCheckout ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-dark-bg/30 border-t-dark-bg rounded-full animate-spin" />
                        Aguarde...
                      </>
                    ) : (
                      <>
                        Impulsionar (R$ 15)
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Is Active Toggle */}
            <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
              <div>
                <span className="text-xs font-semibold text-white block">Status do Anúncio</span>
                <span className="text-[10px] text-gray-400 font-light">Se desativado, seu perfil não aparecerá na vitrine pública.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isActive} 
                  onChange={e => setIsActive(e.target.checked)} 
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-primary"></div>
              </label>
            </div>
          </form>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-5 border-t border-white/5 flex items-center justify-end gap-3 shrink-0 relative z-10 bg-black/20">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            variant="gold" 
            onClick={handleSave} 
            disabled={loading || fetchingAd}
          >
            {loading ? 'Salvando...' : 'Salvar e Publicar Anúncio'}
          </Button>
        </div>
      </div>
    </div>
  );
}
