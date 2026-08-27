'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, DollarSign, Star, ShieldCheck, Building2, Sparkles, ChevronLeft, ChevronRight, Video, Heart } from 'lucide-react';
import { Profile } from '../types';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { cn, cleanDescription, formatWhatsAppLink } from '@/lib/utils';

import { getCDNUrl } from '../lib/mediaHelper';

interface ProfileCardProps {
  profile: Profile;
  showAdInfo?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

function ProfessionalCatalogCard({ profile, isFavorite, onToggleFavorite }: { profile: Profile; isFavorite?: boolean; onToggleFavorite?: (id: string) => void }) {
  const isSubscriptionActive = !profile.subscription_expires_at || new Date(profile.subscription_expires_at) >= new Date();
  const isGold = profile.subscription_tier === 'gold' && isSubscriptionActive;
  const isPro = profile.subscription_tier === 'pro' && isSubscriptionActive;
  const specialtyNames = profile.specialties?.map(s => s.specialties?.name).filter(Boolean) || [];

  const rawBio = profile.bio || '';
  const cleanBio = cleanDescription(rawBio);

  return (
    <div className="block w-full h-full">
      <Card
        isInteractive
        variant={isGold ? 'glass-gold' : isPro ? 'glass-wine' : 'glass'}
        className={cn(
          "flex flex-col justify-between w-full h-full rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 border border-white/10 group shadow-xl bg-black/60 p-4 sm:p-5 relative min-h-[360px]",
          isGold ? 'border-2 border-amber-400/80 shadow-[0_0_20px_rgba(234,179,8,0.25)]' : 'hover:border-white/20'
        )}
      >
        {/* Tag de Assinante Gold / Verificada no topo */}
        {isGold && (
          <div className="absolute top-0 inset-x-0 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black py-0.5 px-3 text-[9px] font-black uppercase tracking-widest flex items-center justify-between z-20 shadow-sm">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-black fill-black" />
              PROFISSIONAL GOLD VIP
            </span>
          </div>
        )}

        {/* Favoritar (Topo Direito) */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (onToggleFavorite) onToggleFavorite(profile.id);
          }}
          className={cn(
            "absolute right-3 p-1.5 rounded-lg transition-all cursor-pointer shadow-md z-20 active:scale-90",
            isGold ? "top-4" : "top-3",
            isFavorite
              ? "bg-red-500/20 text-red-500 border border-red-500/40"
              : "bg-black/60 text-gray-400 border border-white/10 hover:text-white"
          )}
          title={isFavorite ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
        >
          <Heart className={cn("w-4 h-4", isFavorite && "fill-red-500")} />
        </button>

        <Link href={`/perfil/${profile.id}`} className={cn("space-y-3 block text-center flex-1 flex flex-col justify-center", isGold && "pt-3")}>
          {/* Avatar Circular Limpo */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full p-1 bg-gradient-to-b from-white/20 to-white/5 shrink-0">
            <div className={cn(
              "w-full h-full rounded-full overflow-hidden relative border-2",
              isGold ? "border-amber-400 gold-ring-active" : "border-white/20"
            )}>
              <Image
                src={getCDNUrl(profile.avatar_url) || '/avatar-placeholder.svg'}
                alt={profile.name}
                fill
                sizes="112px"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            {profile.verification_status === 'verified' && (
              <div className="absolute bottom-0 right-0 bg-emerald-500 text-dark-bg p-1 rounded-full border-2 border-black shadow-md" title="Perfil Verificado">
                <ShieldCheck className="w-3.5 h-3.5 fill-dark-bg text-emerald-400" />
              </div>
            )}
          </div>

          {/* Nome & Idade */}
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight group-hover:text-gold-light transition-colors">
                {profile.name}
              </h3>
              {profile.age && (
                <span className="text-sm font-light text-gray-400">, {profile.age}</span>
              )}
            </div>

            {/* Localidade Simples */}
            <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
              <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="truncate">{profile.neighborhood ? `${profile.neighborhood}, ${profile.city}` : profile.city}</span>
            </div>
          </div>

          {/* Bio Simples (Apenas 2 Linhas Limpas) */}
          <p className="text-xs text-gray-300 font-light leading-relaxed line-clamp-2 px-1">
            {cleanBio || 'Profissional cadastrada no portal. Confira fotos do perfil, especialidades e entre em contato.'}
          </p>

          {/* Especialidades Principais */}
          {specialtyNames.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-1 pt-1">
              {specialtyNames.slice(0, 3).map((spec: string) => (
                <span key={spec} className="text-[10px] bg-white/5 border border-white/10 text-gray-300 px-2 py-0.5 rounded-full font-medium">
                  {spec}
                </span>
              ))}
            </div>
          )}
        </Link>

        {/* Botões de Ação na Parte Inferior */}
        <div className="pt-3 mt-3 border-t border-white/10 flex items-center gap-2">
          {profile.whatsapp ? (
            <a
              href={formatWhatsAppLink(profile.whatsapp, `Olá ${profile.name}, vi seu perfil no Relaxe & Goze!`) || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <button className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer">
                <span>💬 WhatsApp</span>
              </button>
            </a>
          ) : (
            <Link href={`/perfil/${profile.id}`} className="flex-1">
              <button className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer">
                <span>💬 WhatsApp</span>
              </button>
            </Link>
          )}

          <Link href={`/perfil/${profile.id}`} className="flex-1">
            <button className="w-full py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider rounded-xl border border-white/10 transition-all cursor-pointer">
              <span>👤 Ver Perfil</span>
            </button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default function ProfileCard({ profile, showAdInfo = true, isFavorite = false, onToggleFavorite }: ProfileCardProps) {
  if (!showAdInfo) {
    return (
      <ProfessionalCatalogCard 
        profile={profile} 
        isFavorite={isFavorite} 
        onToggleFavorite={onToggleFavorite} 
      />
    );
  }
  const specialtyNames = profile.specialties?.map(s => s.specialties?.name).filter(Boolean) || [];

  const isSubscriptionActive = !profile.subscription_expires_at || new Date(profile.subscription_expires_at) >= new Date();
  const isGold = profile.subscription_tier === 'gold' && isSubscriptionActive;
  const isPro = profile.subscription_tier === 'pro' && isSubscriptionActive;
  
  const [isAvailable, setIsAvailable] = React.useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  React.useEffect(() => {
    const available = !!(profile.is_available_now && (!profile.available_until || new Date(profile.available_until) > new Date()));
    setIsAvailable(available);
  }, [profile.is_available_now, profile.available_until]);

  const displayName = (showAdInfo && profile.ad_title) ? profile.ad_title : profile.name;
  const displayPrice = (showAdInfo && profile.ad_price !== undefined && profile.ad_price !== null) ? profile.ad_price : profile.price_per_hour;
  
  // Compilar lista completa de fotos do anúncio ou do perfil
  const photosList: string[] = useMemo(() => {
    let list: string[] = [];
    if (showAdInfo && profile.ad_photos && profile.ad_photos.length > 0) {
      list = profile.ad_photos;
    } else if (profile.photos && profile.photos.length > 0) {
      list = profile.photos.map((p: any) => typeof p === 'string' ? p : p.photo_url).filter(Boolean);
    }
    if (list.length === 0 && profile.avatar_url) {
      list = [profile.avatar_url];
    }
    return list;
  }, [showAdInfo, profile.ad_photos, profile.photos, profile.avatar_url]);

  const [imgError, setImgError] = useState(false);
  const currentPhoto = photosList[currentPhotoIndex] || profile.avatar_url || '/avatar-placeholder.svg';

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImgError(false);
    setCurrentPhotoIndex((prev) => (prev + 1) % photosList.length);
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImgError(false);
    setCurrentPhotoIndex((prev) => (prev - 1 + photosList.length) % photosList.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY !== null ? touchStartY - touchEndY : 0;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 20 && photosList.length > 1) {
      setImgError(false);
      if (diffX > 0) {
        // Swipe Esquerda -> Próxima foto
        setCurrentPhotoIndex((prev) => (prev + 1) % photosList.length);
      } else {
        // Swipe Direita -> Foto anterior
        setCurrentPhotoIndex((prev) => (prev - 1 + photosList.length) % photosList.length);
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  const rawDesc = showAdInfo ? (profile.ad_description || profile.bio) : (profile.bio || profile.ad_description);
  const cleanDesc = cleanDescription(rawDesc);

  return (
    <div className="block w-full h-full">
      <Card
        isInteractive
        variant={isGold ? 'glass-gold' : isPro ? 'glass-wine' : 'glass'}
        className={cn(
          "flex flex-col w-full h-full rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 border border-white/10 group shadow-xl bg-black/40",
          isGold 
            ? 'border-2 border-amber-400 gold-ring-active shadow-[0_0_25px_rgba(234,179,8,0.4)]' 
            : isAvailable 
              ? 'border-2 border-emerald-500/80 neon-ring-active' 
              : ''
        )}
      >
        {/* Container da Imagem com Carrossel e Deslize (Swipe) */}
        <div 
          className="relative w-full aspect-[3/3.8] overflow-hidden shrink-0 protected-media touch-pan-y bg-neutral-950"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Indicadores de Mídias (Estilo Stories) */}
          {photosList.length > 1 && (
            <div className={cn(
              "absolute left-3 right-3 z-30 flex gap-1 pointer-events-none",
              isGold ? "top-4" : "top-1.5"
            )}>
              {photosList.map((_, idx) => (
                <div key={idx} className="flex-1 h-0.5 bg-black/40 rounded-full overflow-hidden backdrop-blur-xs">
                  <div className={cn(
                    "h-full bg-gold-primary transition-all duration-200 rounded-full",
                    idx === currentPhotoIndex ? "w-full" : idx < currentPhotoIndex ? "w-full bg-white/70" : "w-0"
                  )} />
                </div>
              ))}
            </div>
          )}

          {/* Tarja Superior de Destaque Gold VIP */}
          {isGold && (
            <div className="absolute top-0 inset-x-0 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black py-0.5 px-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-between z-30 shadow-md">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-black fill-black animate-spin" /> 
                CLUBE VIP GOLD
              </span>
              <span className="font-extrabold text-[9px] text-black/80">DESTAQUE MÁXIMO</span>
            </div>
          )}

          <Link href={`/perfil/${profile.id}`} className="absolute inset-0 z-0">
            <div className="protected-overlay" onContextMenu={(e) => e.preventDefault()} />
            
            <Image
              key={`${currentPhoto}-${imgError}`}
              src={imgError ? '/avatar-placeholder.svg' : (getCDNUrl(currentPhoto) || '/avatar-placeholder.svg')}
              alt={displayName}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105 select-none pointer-events-none"
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
              onError={() => setImgError(true)}
              priority={currentPhotoIndex === 0}
            />
          </Link>

          {/* Zonas de Toque Mobile (Esquerda 33% = Foto Anterior | Direita 33% = Próxima Foto) */}
          {photosList.length > 1 && (
            <div className="absolute inset-x-0 top-10 bottom-14 z-20 flex justify-between pointer-events-auto">
              <div 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setImgError(false);
                  setCurrentPhotoIndex((prev) => (prev - 1 + photosList.length) % photosList.length);
                }}
                className="w-1/3 h-full cursor-pointer"
                title="Foto anterior"
              />
              <div 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setImgError(false);
                  setCurrentPhotoIndex((prev) => (prev + 1) % photosList.length);
                }}
                className="w-1/3 h-full cursor-pointer"
                title="Próxima foto"
              />
            </div>
          )}
          
          {/* Overlay Degradê Escuro na Base da Foto */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-10" />

          {/* Badges do Topo da Foto */}
          <div className={cn(
            "absolute left-2.5 right-2.5 flex justify-between items-center z-20 pointer-events-none",
            isGold ? "top-6" : "top-2.5"
          )}>
            {/* Tag Avaliações Liberadas / Disponível */}
            <div className="bg-black/85 px-2.5 py-1 rounded-lg border border-white/15 text-white text-[10px] sm:text-xs font-semibold flex items-center gap-1.5 shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isAvailable ? 'Disponível agora' : 'Avaliações liberadas'}</span>
            </div>

            {/* Selos & Favoritar */}
            <div className="flex items-center gap-1 pointer-events-auto">
              {profile.verification_status === 'verified' && (
                <div className="bg-black/85 p-1 rounded-lg border border-emerald-500/30 text-emerald-400" title="Perfil Verificado">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
              )}
              {profile.is_video_verified && (
                <div className="bg-black/85 px-1.5 py-0.5 rounded-lg border border-purple-500/30 text-purple-300 text-[10px] font-bold flex items-center gap-0.5" title="Foto 100% Real Verificada em Vídeo">
                  <Video className="w-3 h-3 text-purple-400" />
                </div>
              )}

              {/* Botão de Favoritar */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onToggleFavorite) onToggleFavorite(profile.id);
                }}
                className={cn(
                  "p-1.5 rounded-lg transition-all cursor-pointer shadow-md active:scale-90 ml-0.5",
                  isFavorite
                    ? "bg-red-500/20 text-red-500 border border-red-500/40"
                    : "bg-black/85 text-gray-300 border border-white/10 hover:text-red-400"
                )}
                title={isFavorite ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}
              >
                <Heart className={cn("w-3.5 h-3.5", isFavorite && "fill-red-500")} />
              </button>
            </div>
          </div>

          {/* Botão Flutuante Direita '>' de Próxima Foto (Igual à Referência) */}
          {photosList.length > 1 && (
            <button
              type="button"
              onClick={handleNextPhoto}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white text-black font-extrabold flex items-center justify-center shadow-2xl z-20 hover:scale-110 active:scale-95 transition-all cursor-pointer border border-black/20"
              title="Ver próxima foto"
            >
              <ChevronRight className="w-5 h-5 text-black stroke-[3]" />
            </button>
          )}

          {/* Dados Sobrepostos na Base da Foto (Igual à Referência) */}
          <Link href={`/perfil/${profile.id}`} className="absolute bottom-2.5 left-3 right-3 z-20 space-y-1 text-white block">
            {/* Linha 1: Nome + Ícones + Valor | Hora */}
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate drop-shadow-md">
                  {displayName}
                </h3>
                {isGold && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[9px] font-black tracking-wider uppercase shrink-0 shadow-md" title="Assinante Gold VIP">
                    <Sparkles className="w-2.5 h-2.5 fill-black" />
                    <span>GOLD</span>
                  </span>
                )}
              </div>

              <div className="shrink-0 text-xs sm:text-sm font-extrabold text-white flex items-center gap-1 drop-shadow-md">
                {(!displayPrice || Number(displayPrice) < 300) ? (
                  <span className="text-[11px] font-bold text-gold-light">Consultar</span>
                ) : (
                  <>
                    <span>R$ {displayPrice}</span>
                    <span className="text-[10px] font-normal text-gray-300">| 1 hora ∨</span>
                  </>
                )}
              </div>
            </div>

            {/* Linha 2: Cidade / Bairro + Tag Com Local */}
            <div className="flex items-center justify-between text-[11px] text-gray-200">
              <div className="flex items-center gap-1 truncate font-medium">
                <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                <span className="truncate">{profile.neighborhood ? `${profile.neighborhood}, ${profile.city}` : profile.city}</span>
              </div>

              {(profile.is_space_verified || profile.category === 'massage' || profile.category === 'both') && (
                <div className="bg-black/85 px-2 py-0.5 rounded-lg border border-white/20 text-white text-[10px] font-bold flex items-center gap-1 shrink-0">
                  <span>🏠 Com local</span>
                </div>
              )}
            </div>
          </Link>
        </div>

        {/* Bloco Inferior de Botões de Ação (Estilo Exato da Referência) */}
        <div className="flex flex-col w-full z-20 bg-black">
          {/* Botão de Conteúdo VIP / FatalFans (Crimson Bar) */}
          <Link href={`/perfil/${profile.id}#clube-vip-section`}>
            <div className="w-full py-2 px-3 bg-gradient-to-r from-wine-primary via-wine-dark to-wine-primary hover:from-wine-light hover:to-wine-primary text-white text-xs font-extrabold uppercase tracking-wide flex items-center justify-center gap-1.5 border-t border-white/10 transition-all cursor-pointer">
              <span className="text-sm">🦋</span>
              <span>Ver Conteúdo VIP</span>
            </div>
          </Link>

          {/* Linha Divisória de Botões 50/50: Ver Telefone (Verde) | Ver Mais (Branco) */}
          <div className="flex items-stretch w-full border-t border-white/10">
            {profile.whatsapp ? (
              <a 
                href={formatWhatsAppLink(profile.whatsapp, `Olá ${displayName}, vi seu anúncio no Relaxe & Goze! Podemos conversar?`) || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <button className="w-full py-2.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border-r border-black/30">
                  <span className="text-sm">💬</span>
                  <span>Ver telefone</span>
                </button>
              </a>
            ) : (
              <Link href={`/perfil/${profile.id}`} className="flex-1">
                <button className="w-full py-2.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border-r border-black/30">
                  <span className="text-sm">💬</span>
                  <span>Ver telefone</span>
                </button>
              </Link>
            )}

            <Link href={`/perfil/${profile.id}`} className="flex-1">
              <button className="w-full py-2.5 px-2 bg-white hover:bg-gray-100 text-dark-bg text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                <span className="text-sm text-wine-primary">🎯</span>
                <span>Ver mais</span>
              </button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
