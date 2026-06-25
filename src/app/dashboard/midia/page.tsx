'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Image as ImageIcon, Video, Trash2, Sparkles, Upload, Lock, AlertTriangle, ArrowRight, ShieldCheck, FileImage } from 'lucide-react';
import Link from 'next/link';
import ImageBlurSelector from '@/components/ImageBlurSelector';
import { applyWatermark } from '@/lib/watermark';

export default function MediaManager() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [submitting, setSubmitting] = useState(false);

  // Local File and Blur States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [blurImageSrc, setBlurImageSrc] = useState<string | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchMediaData();
  }, []);

  const fetchMediaData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      
      // Fetch profile for subscription tier
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }

      // Fetch uploaded media
      const { data: mediaData } = await supabase
        .from('profile_photos')
        .select('*')
        .eq('profile_id', user.id);
      
      if (mediaData) {
        setMedia(mediaData);
      }
    }
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar limites de tamanho do arquivo
    const isImage = file.type.startsWith('image/');
    const maxPhotoSize = 5 * 1024 * 1024; // 5MB
    const maxVideoSize = 15 * 1024 * 1024; // 15MB

    if (isImage && file.size > maxPhotoSize) {
      alert('A foto selecionada é muito grande. O limite máximo permitido é 5MB.');
      e.target.value = '';
      return;
    }

    if (!isImage && file.size > maxVideoSize) {
      alert('O vídeo selecionado é muito grande. O limite máximo permitido é 15MB.');
      e.target.value = '';
      return;
    }

    if (isImage) {
      setMediaType('photo');
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (confirm('Deseja borrar o rosto nesta foto para proteger sua privacidade?')) {
          setBlurImageSrc(result);
        } else {
          setSelectedFile(file);
          setFilePreview(result);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setMediaType('video');
      // Validar duração de no máximo 15 segundos para vídeos
      const videoElement = document.createElement('video');
      videoElement.preload = 'metadata';
      videoElement.onloadedmetadata = () => {
        window.URL.revokeObjectURL(videoElement.src);
        if (videoElement.duration > 16) {
          alert('O vídeo da galeria deve ter no máximo 15 segundos.');
          e.target.value = '';
          setSelectedFile(null);
          setFilePreview(null);
        } else {
          setSelectedFile(file);
          setFilePreview(null);
        }
      };
      videoElement.src = URL.createObjectURL(file);
    }
  };

  const handleBlurConfirm = (processedDataUrl: string) => {
    setBlurImageSrc(null);
    setFilePreview(processedDataUrl);

    // Converter base64 para arquivo File
    const arr = processedDataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const file = new File([u8arr], 'foto_borrada.jpg', { type: mime });
    setSelectedFile(file);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza de que deseja deletar este arquivo de mídia?')) return;

    try {
      const { error } = await supabase
        .from('profile_photos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMedia(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      alert('Erro ao excluir mídia.');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    if (!selectedFile) {
      alert('Por favor, selecione um arquivo local para fazer o upload.');
      return;
    }

    // Enforcamento de Limites de Mídia baseados no Plano
    const tier = profile.subscription_tier || 'free';
    const photosList = media.filter(m => m.media_type === 'photo' || !m.media_type);
    const videosList = media.filter(m => m.media_type === 'video');

    if (mediaType === 'photo') {
      const photoLimit = tier === 'free' ? 3 : tier === 'pro' ? 10 : 9999;
      if (photosList.length >= photoLimit) {
        alert(`Limite atingido! O plano ${tier.toUpperCase()} permite no máximo ${photoLimit} fotos.`);
        return;
      }
    } else {
      const videoLimit = tier === 'free' ? 0 : tier === 'pro' ? 10 : 9999;
      if (videosList.length >= videoLimit) {
        alert(`Limite atingido! O plano ${tier.toUpperCase()} permite no máximo ${videoLimit} vídeos.`);
        return;
      }
    }

    setSubmitting(true);

    try {
      let finalMediaUrl = '';

      // Upload para o Supabase Storage
      const fileExt = selectedFile.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${Date.now()}_media.${fileExt}`;
      
      let fileToUpload = selectedFile;
      if (mediaType === 'photo') {
        try {
          const watermarkText = `Relaxa & Goza - ${profile?.name || ''}`;
          fileToUpload = await applyWatermark(selectedFile, watermarkText);
        } catch (watermarkErr) {
          console.error("Erro ao aplicar marca d'água:", watermarkErr);
        }
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile_media')
        .upload(fileName, fileToUpload, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile_media')
        .getPublicUrl(fileName);

      finalMediaUrl = publicUrl;

      // Importante: is_verified começa como FALSE. Só é verificado após moderação ou biometria Rekognition.
      const { data, error } = await supabase
        .from('profile_photos')
        .insert({
          profile_id: user.id,
          photo_url: finalMediaUrl,
          media_type: mediaType,
          is_verified: false
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
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
                videoUrl: finalMediaUrl,
                photoId: data.id,
                tableType: 'profile_photos'
              })
            }).catch(e => console.error('Erro ao disparar transcodificação:', e));
          }
        }

        setMedia(prev => [...prev, data]);
        setSelectedFile(null);
        setFilePreview(null);
      }
    } catch (err: any) {
      alert('Erro ao registrar mídia: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-wine-primary/30 border-t-wine-primary rounded-full animate-spin" />
      </div>
    );
  }

  const tier = profile?.subscription_tier || 'free';
  const photos = media.filter(m => m.media_type === 'photo' || !m.media_type);
  const videos = media.filter(m => m.media_type === 'video');

  // Configurações de limite
  const photoLimitText = tier === 'free' ? '3' : tier === 'pro' ? '10' : 'Ilimitado';
  const videoLimitText = tier === 'free' ? 'Bloqueado (0)' : tier === 'pro' ? '10' : 'Ilimitado';
  
  const canUploadPhoto = tier === 'gold' || (tier === 'pro' && photos.length < 10) || (tier === 'free' && photos.length < 3);
  const canUploadVideo = tier === 'gold' || (tier === 'pro' && videos.length < 10);

  return (
    <div className="max-w-4xl mx-auto space-y-8 relative z-20 pb-16 selection:bg-gold-primary selection:text-dark-bg">
      {/* Header */}
      <div className="border-b border-dark-border/20 pb-5">
        <h1 className="text-2xl md:text-3xl font-light text-white tracking-tight">
          Gerenciador de <span className="font-semibold text-gold-primary">Fotos & Vídeos</span>
        </h1>
        <p className="text-xs md:text-sm text-gray-400 font-light mt-1.5">
          Faça upload de seu material de vitrine. O limite de fotos e vídeos depende do seu plano contratado.
        </p>
      </div>

      {/* Box de Info de Limites */}
      <div className="glass-effect rounded-2xl border border-dark-border/60 p-5 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
        <div>
          <span className="text-[10px] text-gray-500 uppercase font-semibold">Plano Ativo</span>
          <h3 className="text-base font-bold text-gold-primary uppercase tracking-wider mt-0.5">{tier === 'free' ? 'Bronze (Grátis)' : tier === 'pro' ? 'Silver (Pro)' : 'Gold Premium'}</h3>
        </div>

        <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 text-center">
          <span className="text-[10px] text-gray-500 uppercase block">Fotos Publicadas</span>
          <span className="text-sm font-bold text-white mt-1 block">
            {photos.length} <span className="text-xs text-gray-500">/ {photoLimitText}</span>
          </span>
        </div>

        <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 text-center">
          <span className="text-[10px] text-gray-500 uppercase block">Vídeos Publicados</span>
          <span className="text-sm font-bold text-white mt-1 block">
            {videos.length} <span className="text-xs text-gray-500">/ {videoLimitText}</span>
          </span>
        </div>
      </div>

      {/* Alertas de Upgrade e Form de Envio */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        
        {/* Upload Form */}
        <div className="md:col-span-2 glass-effect rounded-2xl border border-dark-border/60 p-6 space-y-6">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-gold-primary" /> Enviar Novo Arquivo
          </h3>

          <form onSubmit={handleUpload} className="space-y-4">
            
            {/* Seletor Tipo Mídia */}
            <div className="grid grid-cols-2 gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => { setMediaType('photo'); setSelectedFile(null); setFilePreview(null); }}
                className={`py-2 text-xs font-semibold rounded-lg tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mediaType === 'photo' 
                    ? 'bg-gold-primary text-dark-bg font-bold' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" /> Foto
              </button>
              <button
                type="button"
                onClick={() => { setMediaType('video'); setSelectedFile(null); setFilePreview(null); }}
                disabled={tier === 'free'}
                className={`py-2 text-xs font-semibold rounded-lg tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mediaType === 'video' 
                    ? 'bg-gold-primary text-dark-bg font-bold' 
                    : 'text-gray-400 hover:text-white'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                <Video className="w-3.5 h-3.5" /> Vídeo
                {tier === 'free' && <Lock className="w-3 h-3 text-gray-500" />}
              </button>
            </div>

            {/* Input de Arquivo Local */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium block">Selecionar Arquivo Local</label>
              
              <div className="flex flex-col items-center justify-center border border-dashed border-dark-border/40 hover:border-gold-primary/40 bg-black/30 rounded-xl p-5 transition-colors cursor-pointer relative group min-h-[120px]">
                <input 
                  type="file"
                  accept={mediaType === 'photo' ? "image/*" : "video/*"}
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  id="media-file-input"
                />
                
                {filePreview ? (
                  <div className="relative w-20 aspect-[3/4] rounded-lg overflow-hidden border border-gold-primary/30">
                    <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                ) : selectedFile ? (
                  <div className="flex flex-col items-center gap-1.5 text-gold-light">
                    <FileImage className="w-6 h-6 text-gold-primary" />
                    <span className="text-xs font-semibold truncate max-w-[200px]">{selectedFile.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center gap-1.5">
                    <Upload className="w-5 h-5 text-gray-500 group-hover:text-gold-primary transition-colors" />
                    <span className="text-xs text-gray-400">Clique para selecionar do dispositivo</span>
                    <span className="text-[9px] text-gray-600">Suporta JPG, PNG, WEBP, MP4</span>
                  </div>
                )}
              </div>
            </div>



            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || (mediaType === 'photo' && !canUploadPhoto) || (mediaType === 'video' && !canUploadVideo)}
              className="w-full py-3.5 rounded-xl bg-gold-primary hover:bg-gold-light text-dark-bg text-xs font-bold tracking-wide transition-all disabled:opacity-50 cursor-pointer shadow-[0_4px_12px_rgba(197,168,128,0.2)]"
            >
              {submitting ? 'Registrando...' : 'Publicar na Vitrine'}
            </button>
          </form>
        </div>

        {/* Upgrade Box Column */}
        <div className="space-y-4">
          {tier !== 'gold' && (
            <div className="bg-gradient-to-br from-gold-primary/[0.04] to-transparent rounded-2xl border border-gold-primary/20 p-5 space-y-4">
              <div className="p-2 bg-gold-primary/10 text-gold-primary rounded-xl w-fit">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Gold Premium</h4>
                <p className="text-[11px] text-gray-400 font-light leading-relaxed mt-1.5">
                  Remova todas as barreiras! Publique fotos e vídeos em **resolução máxima ilimitados** e apareça no topo absoluto das pesquisas.
                </p>
              </div>
              <Link href="/planos" className="block">
                <button className="w-full py-2.5 rounded-xl bg-gold-primary hover:bg-gold-light text-dark-bg text-xs font-bold tracking-wide flex items-center justify-center gap-1 transition-all">
                  Fazer Upgrade
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </Link>
            </div>
          )}
        </div>

      </div>

      {/* Grid de Visualização da Mídia */}
      <div className="space-y-4 pt-6 border-t border-dark-border/20">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-wine-light" /> Galeria Publicada ({media.length} arquivos)
        </h3>

        {media.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-dark-border/40 rounded-2xl">
            <span className="text-xs text-gray-500 font-light">Nenhuma foto ou vídeo cadastrado para exibição na vitrine.</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {media.map(m => {
              const isVideo = m.media_type === 'video';
              return (
                <div key={m.id} className="relative aspect-[3/4] rounded-xl overflow-hidden border border-dark-border group bg-black/40">
                  {isVideo ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                      <Video className="w-8 h-8 text-gold-primary mb-2" />
                      <span className="text-[9px] text-gray-400 truncate w-full">{m.photo_url}</span>
                    </div>
                  ) : (
                    <div 
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url('${m.photo_url}')` }}
                    />
                  )}

                  {/* Overlay Hover para excluir */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    {m.is_verified && (
                      <span className="absolute top-2 left-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[8px] font-bold flex items-center gap-0.5">
                        <ShieldCheck className="w-2.5 h-2.5" /> Real
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-2.5 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all cursor-pointer"
                      title="Deletar Mídia"
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

      {blurImageSrc && (
        <ImageBlurSelector
          imageSrc={blurImageSrc}
          onConfirm={handleBlurConfirm}
          onCancel={() => setBlurImageSrc(null)}
        />
      )}

    </div>
  );
}
