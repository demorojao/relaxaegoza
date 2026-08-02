'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, DollarSign, Star, ShieldCheck, Building2, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { Profile } from '../types';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { cn, cleanDescription } from '@/lib/utils';

import { getCDNUrl } from '../lib/mediaHelper';

interface ProfileCardProps {
  profile: Profile;
  showAdInfo?: boolean;
}

export default function ProfileCard({ profile, showAdInfo = true }: ProfileCardProps) {
  const specialtyNames = profile.specialties?.map(s => s.specialties?.name).filter(Boolean) || [];

  const isGold = profile.subscription_tier === 'gold';
  const isPro = profile.subscription_tier === 'pro';
  
  const [isAvailable, setIsAvailable] = React.useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

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

  const currentPhoto = photosList[currentPhotoIndex] || profile.avatar_url || '/avatar-placeholder.svg';

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev + 1) % photosList.length);
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev - 1 + photosList.length) % photosList.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = touchStartX - touchEndX;

    if (Math.abs(diffX) > 30) {
      if (diffX > 0) {
        // Swipe Esquerda -> Próxima foto
        setCurrentPhotoIndex((prev) => (prev + 1) % photosList.length);
      } else {
        // Swipe Direita -> Foto anterior
        setCurrentPhotoIndex((prev) => (prev - 1 + photosList.length) % photosList.length);
      }
    }
    setTouchStartX(null);
  };

  const rawDesc = showAdInfo ? (profile.ad_description || profile.bio) : (profile.bio || profile.ad_description);
  const cleanDesc = cleanDescription(rawDesc);

  return (
    <Link href={`/perfil/${profile.id}`} className="block w-full h-full">
      <Card
        isInteractive
        variant={isGold ? 'glass-gold' : isPro ? 'glass-wine' : 'glass'}
        className={cn(
          "flex flex-col w-full h-full rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 border border-white/5 group",
          isGold 
            ? 'border-2 border-gold-primary/70 gold-ring-active' 
            : isAvailable 
              ? 'border-2 border-emerald-500/80 neon-ring-active' 
              : ''
        )}
      >
        {/* Container da Imagem com Carrossel e Deslize (Swipe) */}
        <div 
          className="relative w-full aspect-[3/3.8] overflow-hidden shrink-0 protected-media touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="protected-overlay" onContextMenu={(e) => e.preventDefault()} />
          
          <Image
            key={currentPhoto}
            src={getCDNUrl(currentPhoto) || '/avatar-placeholder.svg'}
            alt={displayName}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105 select-none pointer-events-none"
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
            priority={currentPhotoIndex === 0}
          />
          
          {/* Overlay Degradê escuro sutil na base da imagem */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/70 to-transparent opacity-90 pointer-events-none" />

          {/* Badges do Topo */}
          <div className="absolute top-3.5 left-3.5 right-3.5 flex justify-between items-center z-10 pointer-events-none">
            {/* Tag Disponível Agora */}
            {isAvailable ? (
              <Badge variant="emerald" isPulsing>
                Disponível
              </Badge>
            ) : isGold ? (
              <Badge variant="gold">
                <Sparkles className="w-2.5 h-2.5" /> Gold
              </Badge>
            ) : isPro ? (
              <Badge variant="wine">
                Pro
              </Badge>
            ) : (
              <div />
            )}

            {/* Selos de Confiança (Dupla Verificação & Top Avaliada) */}
            <div className="flex items-center gap-1">
              {profile.avg_rating && Number(profile.avg_rating) >= 4.8 && (profile.reviews_count || 0) >= 1 && (
                <div className="bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-full border border-gold-primary/40 text-gold-light text-[10px] font-bold flex items-center gap-1 shadow-md" title="Top Avaliada pelos Clientes">
                  <Star className="w-3 h-3 fill-gold-primary text-gold-primary" />
                  <span>{Number(profile.avg_rating).toFixed(1)}</span>
                </div>
              )}
              {profile.verification_status === 'verified' && (
                <div className="bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-emerald-500/20 text-emerald-400" title="Perfil Verificado por Selfie">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
              )}
              {profile.is_space_verified && (
                <div className="bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-gold-primary/20 text-gold-light" title="Espaço Auditado e Validado">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          </div>

          {/* Botões de Navegação de Fotos (Setas Esquerda / Direita) */}
          {photosList.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrevPhoto}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-gold-primary hover:text-dark-bg cursor-pointer"
                title="Foto anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleNextPhoto}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-gold-primary hover:text-dark-bg cursor-pointer"
                title="Próxima foto"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Bolinhas de Paginação e Contador de Fotos */}
              <div className="absolute bottom-2.5 inset-x-0 flex flex-col items-center gap-1 z-20 pointer-events-none">
                <div className="flex items-center justify-center gap-1 bg-black/50 backdrop-blur-xs px-2 py-0.5 rounded-full border border-white/10">
                  {photosList.map((_, idx) => (
                    <span
                      key={idx}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === currentPhotoIndex 
                          ? 'bg-gold-primary w-4' 
                          : 'bg-white/40 w-1.5'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

        </div>

        {/* Informações Abaixo da Foto (Bloco Não-Sobreposto) */}
        <div className="p-3 bg-black/40 flex-1 flex flex-col justify-between gap-1 sm:gap-1.5 z-10 group-hover:bg-black/60 transition-colors border-t border-white/5">
          <div className="flex flex-col gap-1 sm:gap-1.5">
            {/* Nome / Título do Anúncio */}
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight drop-shadow-md line-clamp-2 leading-tight flex items-center gap-1 flex-wrap">
                <span>{displayName}</span>
                {isGold && (
                  <span className="text-[10px] sm:text-xs text-gold-primary shrink-0 inline-block animate-bounce" title="Gold VIP">👑</span>
                )}
              </h3>
            </div>
            
            {/* Idade e Preço */}
            <div className="flex items-center justify-between text-xs font-semibold mt-0.5 border-b border-white/5 pb-1">
              <span className="font-light text-white/70 text-[10px] sm:text-xs">
                {profile.age} anos
              </span>
              
              {(!displayPrice || Number(displayPrice) < 300) ? (
                <span className="text-[10px] sm:text-xs font-bold text-gold-light uppercase tracking-wide">
                  Consultar valor
                </span>
              ) : (
                <div className="flex items-center text-gold-light">
                  <DollarSign className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 -mr-0.5 shrink-0" />
                  <span className="text-xs sm:text-sm">{displayPrice}</span>
                  <span className="text-[9px] text-white/50 font-normal ml-0.5">/h</span>
                </div>
              )}
            </div>

            {/* Cidade e Avaliação */}
            <div className="flex items-center text-[9px] sm:text-xs text-gray-300 justify-between">
              <div className="flex items-center gap-0.5 sm:gap-1 truncate max-w-[75%]">
                <MapPin className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 text-wine-light/90 shrink-0" />
                <span className="truncate">
                  {profile.city}
                  {(profile as any).distance !== undefined && (
                    <span className="text-[8px] text-emerald-400 font-bold ml-1 shrink-0">
                      ({(profile as any).distance.toFixed(1)} km)
                    </span>
                  )}
                </span>
              </div>
              
              <div className="flex items-center gap-0.5 text-gold-primary shrink-0">
                <Star className="w-2.5 sm:w-3 h-2.5 sm:h-3 fill-gold-primary" />
                <span className="font-medium text-[9px] sm:text-[11px]">
                  {profile.avg_rating && profile.avg_rating > 0 
                    ? Number(profile.avg_rating).toFixed(1) 
                    : '4.9'}
                </span>
                {profile.reviews_count !== undefined && profile.reviews_count > 0 && (
                  <span className="text-[8px] sm:text-[10px] text-gray-400 font-light ml-0.5">
                    ({profile.reviews_count})
                  </span>
                )}
              </div>
            </div>

            {/* Categoria e Especialidades (Tags Limpas) */}
            <div className="flex flex-col gap-1 border-t border-white/5 pt-1.5 mt-0.5">
              <div className="flex items-center justify-between text-[8px] sm:text-[9px] text-gray-400 font-medium font-sans">
                <span className="truncate text-gray-300">
                  {profile.category === 'massage' 
                    ? '🧘 Massagens' 
                    : profile.category === 'escort' 
                      ? '🔥 Acompanhante' 
                      : '✨ Ambos'}
                </span>
                {profile.target_audience && profile.target_audience.length > 0 && (
                  <span className="text-[8px] bg-wine-primary/20 border border-wine-primary/30 text-wine-light px-1 py-0.2 rounded shrink-0">
                    👥 {profile.target_audience.join(', ')}
                  </span>
                )}
              </div>

              {/* Tags de Especialidades em destaque no Card */}
              {specialtyNames.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {specialtyNames.slice(0, 2).map((spec) => (
                    <span key={spec} className="text-[8px] bg-gold-primary/10 border border-gold-primary/20 text-gold-light px-1.5 py-0.5 rounded-md font-medium truncate max-w-[120px]">
                      ✨ {spec}
                    </span>
                  ))}
                  {specialtyNames.length > 2 && (
                    <span className="text-[8px] text-gray-400 font-light self-center">
                      +{specialtyNames.length - 2}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Descrição / Biografia do Anúncio */}
          {cleanDesc && (
            <p className="text-[10px] sm:text-xs text-gray-400 line-clamp-2 leading-relaxed pt-1.5 border-t border-white/5 font-light">
              {cleanDesc}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
