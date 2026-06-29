'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, DollarSign, Star, ShieldCheck, Building2, Sparkles } from 'lucide-react';
import { Profile } from '../types';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

import { getCDNUrl } from '../lib/mediaHelper';

interface ProfileCardProps {
  profile: Profile;
  showAdInfo?: boolean;
}

export default function ProfileCard({ profile, showAdInfo = true }: ProfileCardProps) {
  const specialtyNames = profile.specialties?.map(s => s.specialties?.name).filter(Boolean) || [];

  const isGold = profile.subscription_tier === 'gold';
  const isPro = profile.subscription_tier === 'pro';
  const isAvailable = profile.is_available_now && (!profile.available_until || new Date(profile.available_until) > new Date());

  const displayName = (showAdInfo && profile.ad_title) ? profile.ad_title : profile.name;
  const displayPrice = (showAdInfo && profile.ad_price !== undefined && profile.ad_price !== null) ? profile.ad_price : profile.price_per_hour;
  const displayAvatar = (showAdInfo && profile.ad_photos && profile.ad_photos.length > 0) ? profile.ad_photos[0] : profile.avatar_url;

  return (
    <Link href={`/perfil/${profile.id}`} className="block w-full">
      <Card
        isInteractive
        variant={isGold ? 'glass-gold' : isPro ? 'glass-wine' : 'glass'}
        className={cn(
          "relative w-full aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300",
          isGold 
            ? 'border-[2px] border-gold-primary/70 gold-ring-active' 
            : isAvailable 
              ? 'border-[2px] border-emerald-500/80 neon-ring-active' 
              : ''
        )}
      >
        {/* Imagem de Fundo com next/image */}
        <Image
          src={getCDNUrl(displayAvatar) || '/avatar-placeholder.svg'}
          alt={displayName}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105 select-none pointer-events-none"
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        />
        
        {/* Overlay Degradê escuro */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent opacity-85 group-hover:opacity-100 transition-opacity" />

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

          {/* Selos de Confiança (Dupla Verificação) */}
          <div className="flex gap-1">
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

        {/* Informações na Base (Bloco de Vidro Flutuante Inset) */}
        <div className="absolute bottom-3 left-3 right-3 p-3 bg-black/70 backdrop-blur-md border border-white/5 rounded-xl flex flex-col gap-1 sm:gap-1.5 z-10 group-hover:bg-black/80 transition-colors">
          
          {/* Nome / Título do Anúncio (Ocupa a linha inteira, permitindo até 2 linhas para títulos longos de anúncios) */}
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight drop-shadow-md line-clamp-2 leading-tight flex items-center gap-1 flex-wrap">
              <span>{displayName}</span>
              {isGold && (
                <span className="text-[10px] sm:text-xs text-gold-primary shrink-0 inline-block animate-bounce" title="Gold VIP">👑</span>
              )}
            </h3>
          </div>
          
          {/* Idade e Preço (Alinhados na mesma linha abaixo do nome) */}
          <div className="flex items-center justify-between text-xs font-semibold mt-0.5 border-b border-white/5 pb-1">
            {/* Idade */}
            <span className="font-light text-white/70 text-[10px] sm:text-xs">
              {profile.age} anos
            </span>
            
            {/* Preço */}
            <div className="flex items-center text-gold-light">
              <DollarSign className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 -mr-0.5 shrink-0" />
              <span className="text-xs sm:text-sm">{displayPrice}</span>
              <span className="text-[9px] text-white/50 font-normal ml-0.5">/h</span>
            </div>
          </div>

          {/* Cidade e Especialidades */}
          <div className="flex items-center text-[9px] sm:text-xs text-gray-300 justify-between">
            <div className="flex items-center gap-0.5 sm:gap-1 truncate max-w-[70%]">
              <MapPin className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 text-wine-light/90 shrink-0" />
              <span className="truncate">
                {profile.city}
                {(profile as any).distance !== undefined && (
                  <span className="text-[8px] text-emerald-400 font-bold ml-1">
                    ({(profile as any).distance.toFixed(1)} km)
                  </span>
                )}
              </span>
            </div>
            
            {/* Avaliação mockada/calculada */}
            <div className="flex items-center gap-0.5 text-gold-primary shrink-0">
              <Star className="w-2.5 sm:w-3 h-2.5 sm:h-3 fill-gold-primary" />
              <span className="font-medium text-[9px] sm:text-[11px]">4.9</span>
            </div>
          </div>

          {/* Categoria e Público Alvo */}
          {(profile.target_audience || profile.category) && (
            <div className="flex items-center justify-between border-t border-white/5 pt-1.5 mt-0.5 text-[8px] sm:text-[9px] text-gray-400 font-medium font-sans">
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
          )}

          {/* Descrição / Biografia do Anúncio */}
          {(showAdInfo ? (profile.ad_description || profile.bio) : (profile.bio || profile.ad_description)) && (
            <p className="text-[10px] sm:text-xs text-gray-400 line-clamp-2 leading-relaxed pt-1.5 border-t border-white/5 font-light">
              {showAdInfo ? (profile.ad_description || profile.bio) : (profile.bio || profile.ad_description)}
            </p>
          )}

        </div>
      </Card>
    </Link>
  );
}

