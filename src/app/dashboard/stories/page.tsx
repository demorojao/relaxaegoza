'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { Camera, Video, Trash2, Clock, Sparkles, Upload, ShieldCheck, AlertCircle, X, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { getCDNUrl } from '../../../lib/mediaHelper';
import { applyWatermark } from '@/lib/watermark';

export default function StoriesManager() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload states
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Text Overlay States
  const [textContent, setTextContent] = useState('');
  const [textPosition, setTextPosition] = useState<'top' | 'center' | 'bottom'>('center');
  const [textColor, setTextColor] = useState<'white' | 'gold' | 'wine'>('white');
  const [textBg, setTextBg] = useState<'black-blur' | 'wine-solid' | 'none'>('black-blur');
  
  // Camera Refs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Limit States
  const [storiesInLast24h, setStoriesInLast24h] = useState(0);

  // Auto-open logic
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    fetchStoriesData();
  }, []);

  useEffect(() => {
    if (profile && !autoOpenedRef.current) {
      const tier = profile.subscription_tier || 'free';
      if (tier === 'pro' || tier === 'gold') {
        autoOpenedRef.current = true;
        // Pequeno delay para garantir que o contêiner esteja renderizado
        setTimeout(() => {
          startCamera();
        }, 500);
      }
    }
  }, [profile]);



  const fetchStoriesData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);

      // 1. Buscar Perfil (para saber o plano)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }

      // 2. Buscar Stories Ativos (não expirados)
      const { data: storiesData } = await supabase
        .from('stories')
        .select('*')
        .eq('profile_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (storiesData) {
        setStories(storiesData);
      }

      // 3. Buscar contagem de stories nas últimas 24h
      const { data: last24hData } = await supabase
        .from('stories')
        .select('id')
        .eq('profile_id', user.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (last24hData) {
        setStoriesInLast24h(last24hData.length);
      }
    }
    setLoading(false);
  };

  const startCamera = () => {
    cameraInputRef.current?.click();
  };

  const stopCamera = () => {
    // No-op
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset text overlay when selecting a new file
    setTextContent('');
    setTextPosition('center');
    setTextColor('white');
    setTextBg('black-blur');

    // Detectar e atualizar o tipo de mídia automaticamente
    if (file.type.startsWith('video/')) {
      setMediaType('video');
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.onloadedmetadata = () => {
        window.URL.revokeObjectURL(videoElement.src);
        if (videoElement.duration > 16) {
          alert('O vídeo de story deve ter no máximo 15 segundos.');
          setSelectedFile(null);
          setFilePreview(null);
          e.target.value = ''; // Permite selecionar o mesmo arquivo corrigido
        }
      };
      videoElement.src = URL.createObjectURL(file);
    } else if (file.type.startsWith('image/')) {
      setMediaType('photo');
    }

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFilePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza de que deseja deletar este story? Ele desaparecerá imediatamente da vitrine.')) return;

    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setStories(prev => prev.filter(s => s.id !== id));
      // Re-atualiza a contagem das últimas 24h
      setStoriesInLast24h(prev => Math.max(0, prev - 1));
    } catch (err) {
      alert('Erro ao excluir story.');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    if (!selectedFile) {
      alert('Selecione um arquivo ou capture um novo arquivo com a câmera.');
      return;
    }

    const tier = profile.subscription_tier || 'free';

    // Enforced Bronze check
    if (tier === 'free') {
      alert('Seu plano Bronze (Grátis) não permite postar Stories. Faça upgrade para Pro ou Gold Premium.');
      return;
    }

    // Enforced Pro check
    if (tier === 'pro' && mediaType === 'video') {
      alert('Recurso exclusivo! Apenas anunciantes GOLD Premium podem publicar vídeos nos stories.');
      return;
    }

    if (tier === 'pro' && storiesInLast24h >= 3) {
      alert('Limite atingido! Profissionais no plano Pro podem postar no máximo 3 stories a cada 24 horas.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Upload do Arquivo para o Supabase Storage Bucket `profile_media`
      const fileExt = selectedFile.name.split('.').pop() || (mediaType === 'photo' ? 'jpg' : 'mp4');
      const fileName = `${user.id}/story_${Date.now()}_media.${fileExt}`;
      
      let fileToUpload = selectedFile;
      if (mediaType === 'photo') {
        try {
          const watermarkText = `Relaxa & Goza - ${profile?.name || ''}`;
          fileToUpload = await applyWatermark(selectedFile, watermarkText);
        } catch (watermarkErr) {
          console.error("Erro ao aplicar marca d'água:", watermarkErr);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('profile_media')
        .upload(fileName, fileToUpload, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile_media')
        .getPublicUrl(fileName);

      // 2. Inserir registro na tabela `stories`
      const { data: storyRow, error: insertError } = await supabase
        .from('stories')
        .insert({
          profile_id: user.id,
          media_url: publicUrl,
          media_type: mediaType,
          text_content: textContent ? textContent.trim() : null,
          text_style: textContent ? { position: textPosition, color: textColor, bg: textBg } : null
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(insertError.message || JSON.stringify(insertError));
      }

      if (storyRow) {
        // Se for vídeo, dispara a transcodificação de forma assíncrona
        if (mediaType === 'video') {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            fetch('/api/media/transcode', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                videoUrl: publicUrl,
                photoId: storyRow.id,
                tableType: 'stories'
              })
            }).catch(e => console.error('Erro ao disparar transcodificação:', e));
          }
        }

        setStories(prev => [storyRow, ...prev]);
        setStoriesInLast24h(prev => prev + 1);
        setSelectedFile(null);
        setFilePreview(null);
        setTextContent('');
      }
    } catch (err: any) {
      alert('Erro ao publicar story: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  // Componente interno para mostrar o contador de tempo restante
  function TimeRemaining({ expiresAt }: { expiresAt: string }) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
      const calculateTimeLeft = () => {
        const diff = new Date(expiresAt).getTime() - new Date().getTime();
        if (diff <= 0) return 'Expirado';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        return `${hours}h ${minutes}m restando`;
      };

      setTimeLeft(calculateTimeLeft());
      const interval = setInterval(() => {
        setTimeLeft(calculateTimeLeft());
      }, 60000); // Atualiza a cada minuto

      return () => clearInterval(interval);
    }, [expiresAt]);

    return (
      <span className="text-[10px] bg-black/60 backdrop-blur-md text-gold-light border border-gold-primary/20 px-2 py-0.5 rounded-full flex items-center gap-1">
        <Clock className="w-3 h-3 text-gold-primary" /> {timeLeft}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="w-full flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-wine-primary/30 border-t-wine-primary rounded-full animate-spin" />
      </div>
    );
  }

  const tier = profile?.subscription_tier || 'free';
  const isBronze = tier === 'free';
  const isPro = tier === 'pro';
  const isGold = tier === 'gold';

  const limitText = isBronze 
    ? 'Bloqueado no Bronze' 
    : isPro 
      ? `${storiesInLast24h} / 3 postados (últimas 24h)` 
      : 'Ilimitado (Gold Premium)';

  return (
    <div className="max-w-4xl mx-auto space-y-8 relative z-20 pb-16 selection:bg-gold-primary selection:text-dark-bg">
      {/* Header */}
      <div className="border-b border-dark-border/20 pb-5">
        <h1 className="text-2xl md:text-3xl font-light text-white tracking-tight">
          Gerenciador de <span className="font-semibold text-gold-primary">Stories Efêmeros</span>
        </h1>
        <p className="text-xs md:text-sm text-gray-400 font-light mt-1.5">
          Publique fotos ou vídeos curtos de 24h na vitrine principal para alavancar sua visibilidade imediata.
        </p>
      </div>

      {/* Info Card de Limites */}
      <div className="glass-effect rounded-2xl border border-dark-border/60 p-5 grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
        <div>
          <span className="text-[10px] text-gray-500 uppercase font-semibold">Plano Ativo</span>
          <h3 className="text-base font-bold text-gold-primary uppercase tracking-wider mt-0.5">
            {isBronze ? 'Bronze (Grátis)' : isPro ? 'Silver (Pro)' : 'Gold Premium'}
          </h3>
        </div>

        <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 text-center sm:text-right">
          <span className="text-[10px] text-gray-500 uppercase block">Stories Enviados (24h)</span>
          <span className={`text-sm font-bold mt-1 block ${isPro && storiesInLast24h >= 3 ? 'text-red-400' : 'text-white'}`}>
            {limitText}
          </span>
        </div>
      </div>

      {/* Seção principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        
        {/* Upload e Webcam */}
        <div className="md:col-span-2 glass-effect rounded-2xl border border-dark-border/60 p-6 space-y-6">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Camera className="w-4 h-4 text-gold-primary" /> Publicar Novo Story
          </h3>

          {isBronze ? (
            <div className="bg-gradient-to-br from-wine-primary/20 to-transparent border border-wine-primary/40 rounded-xl p-5 text-center space-y-4">
              <AlertCircle className="w-8 h-8 text-wine-light mx-auto animate-pulse" />
              <h4 className="text-sm font-bold text-white">Recurso Indisponível no Plano Bronze</h4>
              <p className="text-xs text-gray-400 font-light leading-relaxed max-w-md mx-auto">
                Para postar Stories efêmeros na página principal do Relaxa & Goza, você deve contratar o plano **Pro (Silver)** ou **Gold Premium**.
              </p>
              <a href="/planos" className="inline-block px-5 py-2.5 rounded-xl bg-gold-primary hover:bg-gold-light text-dark-bg text-xs font-bold uppercase transition-all shadow-[0_4px_12px_rgba(197,168,128,0.2)] cursor-pointer">
                Ver Planos de Upgrade
              </a>
            </div>
          ) : (
            <form onSubmit={handleUpload} className="space-y-5">
              
              {/* Seletor de Tipo de Story */}
              <div className="grid grid-cols-2 gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => { setMediaType('photo'); setSelectedFile(null); setFilePreview(null); stopCamera(); }}
                  className={`py-2 text-xs font-semibold rounded-lg tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mediaType === 'photo' 
                      ? 'bg-gold-primary text-dark-bg font-bold' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" /> Foto
                </button>
                <button
                  type="button"
                  onClick={() => { setMediaType('video'); setSelectedFile(null); setFilePreview(null); stopCamera(); }}
                  className={`py-2 text-xs font-semibold rounded-lg tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mediaType === 'video' 
                      ? 'bg-gold-primary text-dark-bg font-bold' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" /> Vídeo Curto
                </button>
              </div>

              {/* Upload Área / Câmera Nativa */}
              <div className="space-y-4">
                {/* Hidden Native Capture and Gallery Inputs */}
                <input 
                  type="file"
                  accept={mediaType === 'photo' ? "image/*" : "video/*"}
                  capture="user"
                  ref={cameraInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input 
                  type="file"
                  accept={mediaType === 'photo' ? "image/*" : "video/*"}
                  ref={galleryInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                {filePreview ? (
                  <div className="space-y-4">
                    {/* Visualização do arquivo selecionado Estilo Instagram */}
                    <div className="relative rounded-2xl overflow-hidden bg-black border border-gold-primary/30 aspect-[3/4] max-w-sm mx-auto flex flex-col items-center justify-center group shadow-2xl">
                      {mediaType === 'photo' ? (
                        <img src={filePreview} alt="Story Preview" className="w-full h-full object-cover animate-fadeIn" />
                      ) : (
                        <video src={filePreview} autoPlay loop muted playsInline className="w-full h-full object-cover animate-fadeIn" />
                      )}
                      
                      {/* Live Instagram Text Preview Overlay */}
                      {textContent && (
                        <div 
                          className={`absolute left-1/2 -translate-x-1/2 max-w-[85%] text-center text-xs sm:text-sm font-semibold pointer-events-none z-10 transition-all duration-200 break-words ${
                            textPosition === 'top' ? 'top-[20%]' : textPosition === 'center' ? 'top-1/2 -translate-y-1/2' : 'bottom-[20%]'
                          } ${
                            textColor === 'white' ? 'text-white' : textColor === 'gold' ? 'text-gold-light' : 'text-red-400'
                          } ${
                            textBg === 'black-blur' ? 'bg-black/60 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10' :
                            textBg === 'wine-solid' ? 'bg-wine-primary/95 px-3 py-1 rounded-xl border border-wine-light/20 shadow-lg' : 'px-2 py-0.5'
                          }`}
                        >
                          {textContent}
                        </div>
                      )}
                      
                      {/* Top overlay: Discard button */}
                      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                        <span className="text-[10px] bg-black/60 backdrop-blur-md text-white border border-white/10 px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold">
                          Pré-visualização
                        </span>
                        <button
                          type="button"
                          onClick={() => { setSelectedFile(null); setFilePreview(null); setTextContent(''); }}
                          className="p-2 bg-black/60 hover:bg-red-600 border border-white/10 rounded-full text-white transition-all active:scale-90 cursor-pointer"
                          title="Descartar e tirar outra"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Controles de Customização do Texto (Instagram Style) */}
                    <div className="bg-black/35 p-4 rounded-xl border border-white/5 space-y-3 max-w-sm mx-auto">
                      <h4 className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                        <Sparkles className="w-3.5 h-3.5 text-gold-primary animate-pulse" /> Adicionar Texto no Story (Opcional)
                      </h4>
                      
                      <div className="space-y-2">
                        <div>
                          <input 
                            type="text"
                            value={textContent}
                            onChange={(e) => setTextContent(e.target.value.slice(0, 80))}
                            placeholder="Escreva algo sobre você ou serviço..."
                            className="w-full px-3 py-2 text-xs rounded-lg bg-black/60 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-gold-primary transition-colors"
                          />
                          <span className="text-[8px] text-gray-500 mt-1 block text-right">
                            {textContent.length}/80 caracteres
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[8px] text-gray-400 block mb-0.5">Posição</span>
                            <select
                              value={textPosition}
                              onChange={(e) => setTextPosition(e.target.value as any)}
                              className="w-full px-1.5 py-1 text-[10px] rounded bg-black/80 border border-white/10 text-white focus:outline-none focus:border-gold-primary cursor-pointer"
                            >
                              <option value="top">Topo</option>
                              <option value="center">Centro</option>
                              <option value="bottom">Baixo</option>
                            </select>
                          </div>

                          <div>
                            <span className="text-[8px] text-gray-400 block mb-0.5">Cor Texto</span>
                            <select
                              value={textColor}
                              onChange={(e) => setTextColor(e.target.value as any)}
                              className="w-full px-1.5 py-1 text-[10px] rounded bg-black/80 border border-white/10 text-white focus:outline-none focus:border-gold-primary cursor-pointer"
                            >
                              <option value="white">Branco</option>
                              <option value="gold">Dourado</option>
                              <option value="wine">Vinho</option>
                            </select>
                          </div>

                          <div>
                            <span className="text-[8px] text-gray-400 block mb-0.5">Estilo</span>
                            <select
                              value={textBg}
                              onChange={(e) => setTextBg(e.target.value as any)}
                              className="w-full px-1.5 py-1 text-[10px] rounded bg-black/80 border border-white/10 text-white focus:outline-none focus:border-gold-primary cursor-pointer"
                            >
                              <option value="black-blur">Escuro</option>
                              <option value="wine-solid">Vinho</option>
                              <option value="none">Sem Fundo</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom overlay: Instagram Style Send bar */}
                    <div className="bg-black/65 backdrop-blur-md border border-white/10 p-3 rounded-xl flex items-center justify-between max-w-sm mx-auto">
                      <div className="flex items-center gap-2">
                        {profile?.avatar_url ? (
                          <div className="w-8 h-8 rounded-full border border-gold-primary overflow-hidden relative">
                            <img src={getCDNUrl(profile.avatar_url)} alt="Avatar" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gold-primary/20 flex items-center justify-center text-gold-primary font-bold text-xs">
                            R
                          </div>
                        )}
                        <div className="flex flex-col text-left">
                          <span className="text-[10px] text-white font-bold">Seu Story</span>
                          <span className="text-[8px] text-gray-400">Relaxa & Goza</span>
                        </div>
                      </div>
                      
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-4 py-2 rounded-lg bg-gold-primary hover:bg-gold-light text-dark-bg text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {submitting ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            Enviar <Sparkles className="w-3.5 h-3.5 text-dark-bg" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Opções de Câmera ou Galeria */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Tirar Selfie / Gravar Vídeo (Câmera Nativa do Celular) */}
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex flex-col items-center justify-center border border-dashed border-dark-border/40 hover:border-gold-primary/40 hover:bg-gold-primary/[0.02] bg-black/30 rounded-xl p-5 transition-colors cursor-pointer min-h-[140px] text-center gap-2 group animate-fadeIn"
                    >
                      <Camera className="w-6 h-6 text-gray-500 group-hover:text-gold-primary transition-colors animate-pulse" />
                      <span className="text-xs text-white font-semibold">
                        {mediaType === 'photo' ? 'Tirar Foto (Câmera do Celular)' : 'Gravar Vídeo na Hora'}
                      </span>
                      <span className="text-[9px] text-gray-500">
                        {mediaType === 'photo' ? 'Abre a câmera frontal do celular' : 'Grave um vídeo curto de até 15 segundos'}
                      </span>
                    </button>

                    {/* Escolher da Galeria do Dispositivo */}
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="flex flex-col items-center justify-center border border-dashed border-dark-border/40 hover:border-gold-primary/40 hover:bg-gold-primary/[0.02] bg-black/30 rounded-xl p-5 transition-colors cursor-pointer min-h-[140px] text-center gap-2 group animate-fadeIn"
                    >
                      <Upload className="w-6 h-6 text-gray-500 group-hover:text-gold-primary transition-colors" />
                      <span className="text-xs text-white font-semibold">
                        Escolher da Galeria
                      </span>
                      <span className="text-[9px] text-gray-500">
                        Selecione um arquivo de foto ou vídeo salvo
                      </span>
                    </button>

                  </div>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Quadro Lateral explicativo */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-gold-primary/[0.04] to-transparent rounded-2xl border border-gold-primary/20 p-5 space-y-4">
            <div className="p-2 bg-gold-primary/10 text-gold-primary rounded-xl w-fit">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Como funcionam os Stories?</h4>
              <p className="text-[11px] text-gray-400 font-light leading-relaxed mt-1.5 space-y-2">
                Os Stories são anexados ao seu avatar nos círculos do topo da página inicial e contam com o distintivo verde de "Disponível Agora".
                <br /><br />
                <strong>Expiração:</strong> Após 24h da postagem, eles são removidos automaticamente da vitrine.
                <br /><br />
                <strong>Vídeos Curtos:</strong> Dê preferência a pequenos vídeos com áudio mostrando seu ambiente ou simpatia para maximizar seus contatos.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Grid de Stories Atuais do Usuário */}
      <div className="space-y-4 pt-6 border-t border-dark-border/20">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
          <Camera className="w-4 h-4 text-wine-light" /> Meus Stories Ativos ({stories.length})
        </h3>

        {stories.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-dark-border/40 rounded-2xl">
            <span className="text-xs text-gray-500 font-light">Você não tem stories ativos rodando na vitrine no momento.</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {stories.map(s => {
              const isVideo = s.media_type === 'video';
              return (
                <div key={s.id} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-dark-border group bg-black/40 flex flex-col justify-between p-3.5">
                  
                  {/* Header do card com o tempo */}
                  <div className="flex justify-between items-start z-10">
                    <TimeRemaining expiresAt={s.expires_at} />
                  </div>

                  {isVideo ? (
                    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center text-center p-4 z-0">
                      <Video className="w-8 h-8 text-gold-primary mb-2" />
                      <span className="text-[9px] text-gray-400 truncate w-full">{s.media_url}</span>
                    </div>
                  ) : (
                    <div 
                      className="absolute inset-0 bg-cover bg-center z-0"
                      style={{ backgroundImage: `url('${s.media_url}')` }}
                    />
                  )}

                  {/* Overlay Hover para excluir */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 z-20">
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-2.5 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all cursor-pointer"
                      title="Deletar Story"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
