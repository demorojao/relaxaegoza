'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, DollarSign, ShieldCheck, Building2, Sparkles, ChevronLeft, ChevronRight, MessageCircle, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn, formatWhatsAppLink } from '@/lib/utils';
import { getCDNUrl } from '@/lib/mediaHelper';

interface RoomCardProps {
  room: {
    id: string;
    title: string;
    description?: string;
    price_per_hour?: number;
    photos?: string[];
    city: string;
    neighborhood?: string;
    amenities?: string[];
    is_verified?: boolean;
    host?: {
      name?: string;
      whatsapp?: string;
    };
  };
}

export default function RoomCard({ room }: RoomCardProps) {
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(0);

  const photosList = room.photos && room.photos.length > 0 
    ? room.photos 
    : ['/avatar-placeholder.svg'];

  const coverPhoto = photosList[currentPhotoIdx] || '/avatar-placeholder.svg';
  const priceFormatted = room.price_per_hour ? `R$ ${room.price_per_hour}` : 'Consultar';
  const locationText = room.neighborhood ? `${room.neighborhood}, ${room.city}` : room.city || 'São Paulo';

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentPhotoIdx((prev) => (prev + 1) % photosList.length);
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentPhotoIdx((prev) => (prev - 1 + photosList.length) % photosList.length);
  };

  const whatsappMessage = `Olá! Vi sua sala "${room.title}" anunciada no portal Relaxe & Goze e gostaria de consultar disponibilidade para locação.`;
  const whatsappLink = formatWhatsAppLink(room.host?.whatsapp, whatsappMessage);

  return (
    <div className="block w-full h-full">
      <Card
        isInteractive
        variant="glass"
        className="flex flex-col w-full h-full rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 border border-white/10 hover:border-emerald-500/50 group shadow-xl bg-black/40"
      >
        {/* Container da Foto com Carrossel */}
        <div className="relative w-full aspect-[3/3.8] overflow-hidden shrink-0 protected-media bg-neutral-950">
          {/* Indicadores de Mídia */}
          {photosList.length > 1 && (
            <div className="absolute top-2 left-3 right-3 z-30 flex gap-1 pointer-events-none">
              {photosList.map((_, idx) => (
                <div key={idx} className="flex-1 h-0.5 bg-black/40 rounded-full overflow-hidden backdrop-blur-xs">
                  <div 
                    className={cn(
                      "h-full bg-emerald-400 transition-all duration-200 rounded-full",
                      idx === currentPhotoIdx ? "w-full" : idx < currentPhotoIdx ? "w-full bg-white/70" : "w-0"
                    )} 
                  />
                </div>
              ))}
            </div>
          )}

          <Link href="/dashboard/aluguel-salas" className="absolute inset-0 z-0">
            <img
              src={getCDNUrl(coverPhoto)}
              alt={room.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 select-none"
            />
          </Link>

          {/* Zonas de Toque para trocar fotos */}
          {photosList.length > 1 && (
            <div className="absolute inset-x-0 top-10 bottom-14 z-20 flex justify-between pointer-events-auto">
              <div 
                onClick={handlePrevPhoto}
                className="w-1/3 h-full cursor-pointer"
                title="Foto anterior"
              />
              <div 
                onClick={handleNextPhoto}
                className="w-1/3 h-full cursor-pointer"
                title="Próxima foto"
              />
            </div>
          )}

          {/* Overlay Degradê Escuro Suave na Base */}
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none z-10" />

          {/* Badges de Destaque no Topo da Foto */}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-20 pointer-events-none">
            <div className="bg-emerald-500/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-emerald-400/40 text-dark-bg font-extrabold text-[10px] sm:text-xs flex items-center gap-1.5 shadow-lg uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5" />
              <span>Sala de Atendimento</span>
            </div>

            {room.is_verified && (
              <div className="bg-black/75 backdrop-blur-md p-1 rounded-full border border-emerald-500/40 text-emerald-400" title="Espaço Verificado & Auditado">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          {/* Controles de navegação flutuantes */}
          {photosList.length > 1 && (
            <button
              type="button"
              onClick={handleNextPhoto}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center shadow-2xl z-20 hover:scale-110 active:scale-95 transition-all cursor-pointer border border-white/20"
            >
              <ChevronRight className="w-4 h-4 text-white stroke-[3]" />
            </button>
          )}

          {/* Dados Sobrepostos na Base da Foto */}
          <Link href="/dashboard/aluguel-salas" className="absolute bottom-2.5 left-3 right-3 z-20 space-y-1 text-white block">
            {/* Título da Sala + Valor por Hora */}
            <div className="flex items-center justify-between gap-1">
              <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight truncate drop-shadow-md">
                {room.title}
              </h3>

              <div className="shrink-0 text-xs sm:text-sm font-extrabold text-emerald-300 flex items-center gap-1 drop-shadow-md">
                <span>{priceFormatted}</span>
                <span className="text-[10px] font-normal text-gray-300">/h</span>
              </div>
            </div>

            {/* Localização */}
            <div className="flex items-center justify-between text-[11px] text-gray-200">
              <div className="flex items-center gap-1 truncate font-medium">
                <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="truncate">{locationText}</span>
              </div>

              <span className="bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/20 text-emerald-300 text-[10px] font-semibold">
                🏠 Aluguel por Hora
              </span>
            </div>
          </Link>
        </div>

        {/* Bloco Inferior com Descrição e Ações 50/50 igual às Profissionais */}
        <div className="flex flex-col w-full z-20 bg-black flex-1 justify-between">
          {/* Descrição Curta / Comodidades */}
          <div className="bg-gradient-to-r from-emerald-500/10 via-black to-emerald-500/10 border-t border-b border-white/10 px-3 py-2 text-[11px] text-gray-300 font-medium leading-snug space-y-1">
            <p className="line-clamp-2 text-gray-300 font-light">
              {room.description || "Espaço privativo equipado para massagem e atendimentos profissionais."}
            </p>
            {room.amenities && room.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {room.amenities.slice(0, 3).map((amenity) => (
                  <span key={amenity} className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-medium">
                    ✨ {amenity}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Botões de Ação 50/50: Falar com Host (Verde) | Reservar Sala (Emerald) */}
          <div className="flex items-stretch w-full border-t border-white/10">
            {whatsappLink ? (
              <a 
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <button className="w-full py-2.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border-r border-black/30">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp Host</span>
                </button>
              </a>
            ) : (
              <Link href="/dashboard/aluguel-salas" className="flex-1">
                <button className="w-full py-2.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border-r border-black/30">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp Host</span>
                </button>
              </Link>
            )}

            <Link href="/dashboard/aluguel-salas" className="flex-1">
              <button className="w-full py-2.5 px-2 bg-emerald-500/20 hover:bg-emerald-500 hover:text-dark-bg text-emerald-300 text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border-t border-emerald-500/30">
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Reservar Sala</span>
              </button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
