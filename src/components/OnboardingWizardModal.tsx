'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadToR2 } from '@/lib/r2Client';
import { 
  Sparkles, 
  User, 
  MapPin, 
  DollarSign, 
  Phone, 
  Send, 
  Globe, 
  Video, 
  Camera, 
  Upload, 
  CheckCircle, 
  ChevronRight, 
  ChevronLeft, 
  X,
  ShieldCheck,
  Award
} from 'lucide-react';
import { Profile } from '@/types';

interface OnboardingWizardModalProps {
  profile: Profile;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (updatedProfile: any) => void;
}

export default function OnboardingWizardModal({
  profile,
  isOpen,
  onClose,
  onComplete
}: OnboardingWizardModalProps) {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);

  // Step 1: Dados Básicos
  const [name, setName] = useState(profile.name || '');
  const [age, setAge] = useState(profile.age || 18);
  const [category, setCategory] = useState(profile.category || 'Acompanhantes');
  const [gender, setGender] = useState(profile.gender || 'Feminino');
  const [city, setCity] = useState(profile.city || 'São Paulo');
  const [neighborhood, setNeighborhood] = useState(profile.neighborhood || 'Jardins');

  // Step 2: Valores & Contato
  const [pricePerHour, setPricePerHour] = useState(profile.price_per_hour || 250);
  const [whatsapp, setWhatsapp] = useState(profile.whatsapp || '');
  const [bio, setBio] = useState(profile.bio || '');

  // Step 3: Redes Sociais
  const [instagram, setInstagram] = useState(profile.instagram || '');
  const [telegram, setTelegram] = useState(profile.telegram || '');
  const [xTwitter, setXTwitter] = useState(profile.x_twitter || '');
  const [tiktok, setTiktok] = useState(profile.tiktok || '');

  // Step 4: Foto de Capa
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url || null);

  if (!isOpen) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAndFinish = async () => {
    setLoading(true);
    try {
      let avatarUrl = profile.avatar_url;

      // Se selecionou uma nova foto, faz upload para o R2
      if (avatarFile) {
        avatarUrl = await uploadToR2(avatarFile);
      }

      const updateData: any = {
        name: name.trim() || profile.name,
        age: Number(age) || 18,
        category,
        gender,
        city: city.trim() || 'São Paulo',
        neighborhood: neighborhood.trim() || 'Jardins',
        price_per_hour: Number(pricePerHour) || 0,
        whatsapp: whatsapp.replace(/\D/g, ''),
        bio: bio.trim(),
        instagram: instagram.trim(),
        telegram: telegram.trim(),
        x_twitter: xTwitter.trim(),
        tiktok: tiktok.trim(),
        has_completed_onboarding: true,
      };

      if (avatarUrl) {
        updateData.avatar_url = avatarUrl;
      }

      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id)
        .select('*')
        .single();

      if (error) throw error;

      onComplete(updatedProfile || { ...profile, ...updateData });
      onClose();
    } catch (err: any) {
      alert('Erro ao salvar configurações do perfil: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto selection:bg-gold-primary selection:text-dark-bg">
      <div className="relative w-full max-w-xl bg-linear-to-b from-dark-bg via-dark-bg/95 to-black border border-gold-primary/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 my-8 overflow-hidden">
        
        {/* Glow ambient de fundo */}
        <div className="absolute top-[-15%] right-[-15%] w-[50%] h-[50%] bg-gold-primary/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-15%] left-[-15%] w-[50%] h-[50%] bg-wine-primary/15 blur-[100px] rounded-full pointer-events-none" />

        {/* Header do Modal */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 relative z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gold-primary/10 border border-gold-primary/30 text-gold-light">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Configuração Rápida do Perfil
              </h2>
              <span className="text-[11px] text-gray-400 font-light">
                Passo {step} de 4 — Personalize seu anúncio para começar a receber contatos
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden relative z-10">
          <div
            className="bg-gold-primary h-full transition-all duration-300 rounded-full"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* FORM STEPS */}
        <div className="relative z-10 space-y-4">
          
          {/* PASSO 1: DADOS BÁSICOS */}
          {step === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-xs text-gold-light uppercase font-bold tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-gold-primary" />
                Passo 1: Identidade & Localização
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-300 font-medium">Nome Artístico / Exibição</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Gabriela VIP"
                    className="w-full bg-black/60 border border-white/15 focus:border-gold-primary rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-300 font-medium">Idade</label>
                  <input
                    type="number"
                    min={18}
                    max={65}
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full bg-black/60 border border-white/15 focus:border-gold-primary rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-300 font-medium">Categoria do Anúncio</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 focus:border-gold-primary rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
                  >
                    <option value="Acompanhantes">Acompanhantes</option>
                    <option value="Massagistas">Massagistas</option>
                    <option value="Massoterapeutas">Massoterapeutas</option>
                    <option value="Trans">Trans / Travestis</option>
                    <option value="Homens">Homens / Acompanhantes Masculinos</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-300 font-medium">Gênero</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 focus:border-gold-primary rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
                  >
                    <option value="Feminino">Feminino</option>
                    <option value="Trans">Trans</option>
                    <option value="Masculino">Masculino</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-300 font-medium">Cidade de Atendimento</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: São Paulo"
                    className="w-full bg-black/60 border border-white/15 focus:border-gold-primary rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-300 font-medium">Bairro Principal</label>
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Ex: Jardins"
                    className="w-full bg-black/60 border border-white/15 focus:border-gold-primary rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PASSO 2: VALORES & CONTATO */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-xs text-gold-light uppercase font-bold tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-gold-primary" />
                Passo 2: Valores & Atendimento
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-300 font-medium">Valor por Hora (R$)</label>
                  <input
                    type="number"
                    value={pricePerHour}
                    onChange={(e) => setPricePerHour(Number(e.target.value))}
                    placeholder="250"
                    className="w-full bg-black/60 border border-white/15 focus:border-gold-primary rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-300 font-medium">WhatsApp de Atendimento</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="11999999999 (com DDD)"
                    className="w-full bg-black/60 border border-white/15 focus:border-gold-primary rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-300 font-medium">Apresentação / Descrição da Bio</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Escreva um breve resumo dos seus serviços, estilo de atendimento e diferenciais..."
                  className="w-full bg-black/60 border border-white/15 focus:border-gold-primary rounded-xl p-3 text-xs text-white outline-none transition-colors resize-none leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* PASSO 3: REDES SOCIAIS */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-xs text-gold-light uppercase font-bold tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-gold-primary" />
                Passo 3: Redes Sociais & Divulgação
              </div>
              <p className="text-[11px] text-gray-400 font-light">
                Adicione suas redes oficiais para passar mais autoridade aos clientes na vitrine pública.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-300 font-medium flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-pink-400" />
                    Instagram (@usuario)
                  </label>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="@gabrielavip"
                    className="w-full bg-black/60 border border-white/15 focus:border-gold-primary rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-300 font-medium flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-sky-400" />
                    Telegram (@usuario ou link)
                  </label>
                  <input
                    type="text"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    placeholder="@gabrielacanal"
                    className="w-full bg-black/60 border border-white/15 focus:border-gold-primary rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-300 font-medium flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-gray-300" />
                    X (Twitter)
                  </label>
                  <input
                    type="text"
                    value={xTwitter}
                    onChange={(e) => setXTwitter(e.target.value)}
                    placeholder="@gabrielavip"
                    className="w-full bg-black/60 border border-white/15 focus:border-gold-primary rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-gray-300 font-medium flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-red-400" />
                    TikTok (@usuario)
                  </label>
                  <input
                    type="text"
                    value={tiktok}
                    onChange={(e) => setTiktok(e.target.value)}
                    placeholder="@gabrielavip"
                    className="w-full bg-black/60 border border-white/15 focus:border-gold-primary rounded-xl px-3.5 py-2.5 text-xs text-white outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* PASSO 4: FOTO DE CAPA */}
          {step === 4 && (
            <div className="space-y-4 animate-fadeIn text-center">
              <div className="text-xs text-gold-light uppercase font-bold tracking-wider flex items-center justify-center gap-1.5">
                <Camera className="w-4 h-4 text-gold-primary" />
                Passo 4: Foto de Capa do Anúncio
              </div>
              <p className="text-[11px] text-gray-400 font-light max-w-md mx-auto">
                Selecione uma foto bonita (rosto ou corpo) para ser a imagem principal do seu perfil na vitrine.
              </p>

              <div className="relative mx-auto w-36 h-36 rounded-full border border-gold-primary/30 overflow-hidden bg-black/60 flex items-center justify-center group shadow-xl">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-gray-500 flex flex-col items-center gap-1">
                    <Upload className="w-7 h-7 opacity-50" />
                    <span className="text-[9px] uppercase font-bold opacity-60">Sem foto</span>
                  </div>
                )}
              </div>

              <label htmlFor="wizard-avatar-input" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/15 hover:border-gold-primary text-xs font-bold text-gray-200 hover:text-white cursor-pointer transition-all">
                <Upload className="w-4 h-4 text-gold-primary" />
                {avatarPreview ? 'Substituir Foto' : 'Selecionar Imagem de Capa'}
                <input
                  id="wizard-avatar-input"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Footer com botões de navegação */}
        <div className="flex items-center justify-between border-t border-white/10 pt-5 relative z-10">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors"
            >
              Configurar depois
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="px-6 py-2.5 rounded-xl bg-gold-primary hover:bg-gold-light text-dark-bg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shadow-lg shadow-gold-primary/20"
            >
              Avançar
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveAndFinish}
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-bg text-xs font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-dark-bg/30 border-t-dark-bg rounded-full animate-spin" />
                  Salvando Perfil...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Concluir Perfil
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
