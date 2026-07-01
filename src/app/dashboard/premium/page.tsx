'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { Lock, Upload, Trash2, Eye, EyeOff, ImagePlus, Video, RefreshCw, AlertCircle, CheckCircle, Sparkles, DollarSign } from 'lucide-react';
import { getCDNUrl } from '../../../lib/mediaHelper';

export default function PremiumPage() {
  const [profile, setProfile] = useState<any>(null);
  const [medias, setMedias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Upload form
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceCents, setPriceCents] = useState(''); // vazio = apenas via assinatura
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscription Settings Form
  const [subPrice, setSubPrice] = useState('');
  const [updatingPrice, setUpdatingPrice] = useState(false);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    return () => {
      if (filePreview?.startsWith('blob:')) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: p } = await supabase.from('profiles').select('id, name, subscription_tier, subscription_price_cents').eq('id', user.id).single();
      if (p) {
        setProfile(p);
        setSubPrice(p.subscription_price_cents ? (p.subscription_price_cents / 100).toFixed(2) : '');
      }

      const { data: m } = await supabase.from('premium_media').select('*').eq('profile_id', user.id).order('created_at', { ascending: false });
      if (m) setMedias(m);
    }
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (filePreview?.startsWith('blob:')) URL.revokeObjectURL(filePreview);

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    const maxSize = isVideo ? 100 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`Arquivo muito grande. Máximo: ${isVideo ? '100MB' : '15MB'}.`);
      return;
    }
    setSelectedFile(file);
    setMediaType(isVideo ? 'video' : 'photo');
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (ev) => setFilePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedFile) return;
    setSubmitting(true); setSuccessMsg(''); setErrorMsg('');

    try {
      const ext = selectedFile.name.split('.').pop() || (mediaType === 'photo' ? 'jpg' : 'mp4');
      const filePath = `${profile.id}/premium_${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('profile_media')
        .upload(filePath, selectedFile, { cacheControl: '3600', upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from('profile_media').getPublicUrl(filePath);

      const price = priceCents ? Math.round(parseFloat(priceCents) * 100) : null;

      const { data: row, error: insertErr } = await supabase.from('premium_media').insert({
        profile_id: profile.id,
        title: title.trim() || null,
        description: description.trim() || null,
        price_cents: price,
        media_url: filePath, // armazenar o path, não a URL pública
        preview_url: publicUrl, // preview (pode ser blur depois)
        media_type: mediaType,
      }).select().single();

      if (insertErr) throw insertErr;

      setMedias(prev => [row, ...prev]);
      setSuccessMsg('✅ Mídia premium publicada com sucesso!');
      setSelectedFile(null); setFilePreview(null); setTitle(''); setDescription(''); setPriceCents('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao publicar mídia.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSubPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setUpdatingPrice(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const priceCents = subPrice ? Math.round(parseFloat(subPrice) * 100) : 0;
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_price_cents: priceCents })
        .eq('id', profile.id);
      if (error) throw error;
      setSuccessMsg('✅ Preço da assinatura mensal atualizado!');
      setProfile((prev: any) => ({ ...prev, subscription_price_cents: priceCents }));
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao atualizar preço da assinatura.');
    } finally {
      setUpdatingPrice(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deletar esta mídia premium? Ação irreversível.')) return;
    const { error } = await supabase.from('premium_media').delete().eq('id', id);
    if (!error) setMedias(prev => prev.filter(m => m.id !== id));
  };

  const handleToggleActive = async (m: any) => {
    const { error } = await supabase.from('premium_media').update({ is_active: !m.is_active }).eq('id', m.id);
    if (!error) setMedias(prev => prev.map(x => x.id === m.id ? { ...x, is_active: !x.is_active } : x));
  };

  if (loading) return (
    <div className="w-full flex justify-center py-20">
      <div className="w-10 h-10 border-4 border-wine-primary/30 border-t-wine-primary rounded-full animate-spin" />
    </div>
  );

  const tier = profile?.subscription_tier || 'free';
  const isGold = tier === 'gold';

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 selection:bg-gold-primary selection:text-dark-bg">
      <div className="border-b border-dark-border/20 pb-5">
        <h1 className="text-2xl md:text-3xl font-light text-white tracking-tight flex items-center gap-2">
          <Lock className="w-6 h-6 text-gold-primary" />
          Conteúdo <span className="font-semibold text-gold-primary ml-1">Exclusivo</span>
        </h1>
        <p className="text-xs md:text-sm text-gray-400 font-light mt-1.5">
          Publique fotos e vídeos pagos. Clientes desbloqueiam com assinatura ou compra avulsa (PPV).
        </p>
      </div>

      {!isGold && (
        <div className="bg-wine-primary/10 border border-wine-primary/30 rounded-xl px-4 py-3 text-xs text-wine-light flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Conteúdo Exclusivo disponível apenas para <strong>Gold Premium</strong>. <a href="/planos" className="underline text-gold-light">Fazer upgrade →</a></span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
        </div>
      )}

      {/* Upload & Settings Forms */}
      {isGold && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Configurar Valor Assinatura */}
          <form onSubmit={handleUpdateSubPrice} className="glass-effect rounded-2xl border border-dark-border/60 p-6 space-y-4 md:col-span-1 h-fit">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-gold-primary" /> Valor da Assinatura
            </h3>
            <p className="text-[11px] text-gray-400 font-light leading-relaxed">
              Defina o preço mensal para os clientes assinarem seu canal e terem acesso a todas as suas mídias exclusivas (exceto PPVs avulsos).
            </p>
            <div className="space-y-3">
              <div>
                <label htmlFor="sub-price-input" className="text-[10px] text-gray-500 uppercase font-semibold block mb-1">Preço Mensal (R$)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <input 
                    id="sub-price-input" 
                    type="number" 
                    min="0" 
                    step="0.01" 
                    value={subPrice} 
                    onChange={e => setSubPrice(e.target.value)}
                    placeholder="Ex: 49.90"
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-black/60 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-gold-primary" 
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={updatingPrice}
                className="w-full py-2.5 rounded-xl bg-gold-primary hover:bg-gold-light text-dark-bg text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                {updatingPrice ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                Salvar Valor
              </button>
            </div>
          </form>

          {/* Upload Form */}
          <form onSubmit={handleUpload} className="glass-effect rounded-2xl border border-dark-border/60 p-6 space-y-5 md:col-span-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold-primary" /> Publicar Nova Mídia Premium
            </h3>

            {/* Tipo */}
            <div className="grid grid-cols-2 gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
              {(['photo', 'video'] as const).map(t => (
                <button key={t} type="button" onClick={() => setMediaType(t)}
                  className={`py-2 text-xs font-semibold rounded-lg tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer ${mediaType === t ? 'bg-gold-primary text-dark-bg font-bold' : 'text-gray-400 hover:text-white'}`}>
                  {t === 'photo' ? <ImagePlus className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                  {t === 'photo' ? 'Foto' : 'Vídeo'}
                </button>
              ))}
            </div>

            {/* File Upload */}
            <input id="premium-file-input" type="file" accept={mediaType === 'photo' ? 'image/*' : 'video/*'}
              ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            {filePreview ? (
              <div className="relative aspect-video rounded-xl overflow-hidden border border-gold-primary/30 bg-black max-w-sm mx-auto">
                {mediaType === 'photo'
                  ? <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                  : <video src={filePreview} autoPlay loop muted playsInline className="w-full h-full object-cover" />}
                <button type="button" onClick={() => { setSelectedFile(null); setFilePreview(null); }}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-600 rounded-full text-white transition-all cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-dark-border/40 hover:border-gold-primary/40 rounded-xl py-10 flex flex-col items-center gap-2 text-gray-500 hover:text-gold-primary transition-colors cursor-pointer">
                <Upload className="w-7 h-7" />
                <span className="text-xs">Clique para selecionar {mediaType === 'photo' ? 'foto' : 'vídeo'}</span>
              </button>
            )}

            {/* Metadata */}
            <div className="space-y-3">
              <div>
                <label htmlFor="premium-title" className="text-[10px] text-gray-500 uppercase font-semibold block mb-1">Título (opcional)</label>
                <input id="premium-title" type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={100}
                  placeholder="Ex: Ensaio Exclusivo de Verão..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-black/60 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-gold-primary" />
              </div>
              <div>
                <label htmlFor="premium-desc" className="text-[10px] text-gray-500 uppercase font-semibold block mb-1">Descrição</label>
                <textarea id="premium-desc" value={description} onChange={e => setDescription(e.target.value)} rows={2} maxLength={300}
                  placeholder="Descreva o que está nesta mídia..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-black/60 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-gold-primary resize-none" />
              </div>
              <div>
                <label htmlFor="premium-price" className="text-[10px] text-gray-500 uppercase font-semibold block mb-1">
                  Preço PPV em R$ (deixe vazio para disponibilizar apenas via assinatura)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <input id="premium-price" type="number" min="0" step="0.01" value={priceCents} onChange={e => setPriceCents(e.target.value)}
                    placeholder="Ex: 29.90"
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-black/60 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-gold-primary" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={submitting || !selectedFile}
              className="w-full py-3 rounded-xl bg-gold-primary hover:bg-gold-light text-dark-bg text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer">
              {submitting ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Publicando...</> : <><Lock className="w-3.5 h-3.5" /> Publicar Mídia Exclusiva</>}
            </button>
          </form>
        </div>
      )}

      {/* Grid de Mídias */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
          <Lock className="w-4 h-4 text-wine-light" /> Minhas Mídias Exclusivas ({medias.length})
        </h3>
        {medias.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-dark-border/40 rounded-2xl">
            <Lock className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <span className="text-xs text-gray-500">Nenhuma mídia exclusiva publicada ainda.</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {medias.map(m => (
              <div key={m.id} className={`relative aspect-[3/4] rounded-xl overflow-hidden border group bg-black/40 ${m.is_active ? 'border-gold-primary/20' : 'border-dark-border/40 opacity-60'}`}>
                {m.preview_url && (
                  <img src={getCDNUrl(m.preview_url)} alt={m.title || 'Mídia'} className={`w-full h-full object-cover transition-all ${!m.is_active ? 'grayscale' : ''}`} />
                )}
                {/* Blur overlay com ícone de cadeado */}
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1">
                  <Lock className="w-5 h-5 text-gold-primary" />
                  {m.price_cents ? (
                    <span className="text-[9px] bg-gold-primary/20 text-gold-light border border-gold-primary/30 px-2 py-0.5 rounded-full font-bold">
                      PPV R$ {(m.price_cents / 100).toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-[9px] bg-white/10 text-gray-300 border border-white/10 px-2 py-0.5 rounded-full">
                      Via assinatura
                    </span>
                  )}
                </div>
                {/* Actions on hover */}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
                  <button onClick={() => handleToggleActive(m)} title={m.is_active ? 'Desativar' : 'Ativar'}
                    className="p-2 bg-white/10 border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all cursor-pointer">
                    {m.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => handleDelete(m.id)} title="Deletar"
                    className="p-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Status tag */}
                <div className="absolute top-2 left-2">
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${m.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {m.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
