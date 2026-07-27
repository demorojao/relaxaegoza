'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Advertiser } from '@/lib/mockData';

// Correção para os ícones padrão do Leaflet que costumam falhar no Next.js
// Mas como vamos usar um ícone personalizado (com a foto do anunciante ou uma bola neon), criamos um gerador de pins customizados.

interface MapProps {
  advertisers: Advertiser[];
  activeId: string | null;
  onSelectAdvertiser: (id: string) => void;
  accentColor: 'gold' | 'wine';
  center: [number, number];
  userCoords?: [number, number] | null;
}

// Subcomponente para escutar mudanças no centro e reposicionar o mapa de forma fluida
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function Map({ advertisers, activeId, onSelectAdvertiser, accentColor, center, userCoords }: MapProps) {
  
  // Ícone especial para a localização do usuário
  const createUserIcon = () => {
    return L.divIcon({
      html: `
        <div class="relative w-6 h-6 flex items-center justify-center">
          <div class="absolute w-5 h-5 bg-blue-500 rounded-full animate-ping opacity-70"></div>
          <div class="relative w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
        </div>
      `,
      className: 'user-location-marker',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
  };

  // Função para gerar um marcador em formato HTML premium
  const createCustomIcon = (adv: Advertiser) => {
    const isSelected = activeId === adv.id;
    const isGold = adv.tier === 'gold' || adv.is_gold;
    const colorClass = accentColor === 'gold' ? 'border-gold-primary' : 'border-wine-primary';
    
    // Borda neon piscante se estiver disponível agora
    const availabilityClass = adv.is_available_now 
      ? 'ring-2 ring-emerald-500 animate-pulse' 
      : 'ring-1 ring-white/20';

    if (isGold) {
      // ESTILO GOLD PREMIUM EXTRAORDINÁRIO
      const goldSizeClass = isSelected ? 'w-14 h-14 scale-110' : 'w-12 h-12';
      return L.divIcon({
        html: `
          <div class="relative ${goldSizeClass} transition-all duration-300">
            {/* Halo Dourado Pulsante de Fundo */}
            <div class="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 animate-ping opacity-60 blur-xs"></div>
            
            {/* Círculo Principal com Borda Metálica Dourada */}
            <div class="relative w-full h-full rounded-full p-[2.5px] bg-gradient-to-tr from-yellow-600 via-amber-200 to-yellow-500 shadow-[0_0_18px_rgba(234,179,8,0.9)] overflow-hidden">
              <img src="${adv.photos[0]}" class="w-full h-full object-cover rounded-full" alt="${adv.stage_name}" />
            </div>

            {/* Coroa Dourada Flutuante */}
            <div class="absolute -top-2 -right-1 bg-yellow-400 text-black text-[9px] font-extrabold px-1 py-0.5 rounded-full shadow-lg border border-yellow-200 flex items-center justify-center">
              👑
            </div>

            {/* Status Online Verde */}
            ${adv.is_available_now ? '<div class="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-dark-bg animate-pulse"></div>' : ''}
          </div>
        `,
        className: 'custom-leaflet-marker gold-premium-marker',
        iconSize: [48, 48],
        iconAnchor: [24, 24]
      });
    }

    const borderStyle = isSelected 
      ? `border-[3px] scale-125 z-[999] ${colorClass}` 
      : `border-2 ${colorClass}`;

    return L.divIcon({
      html: `
        <div class="relative w-10 h-10 rounded-full overflow-hidden transition-all duration-300 ${borderStyle} ${availabilityClass}">
          <img src="${adv.photos[0]}" class="w-full h-full object-cover" alt="${adv.stage_name}" />
          ${adv.is_available_now ? '<div class="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-dark-bg"></div>' : ''}
        </div>
      `,
      className: 'custom-leaflet-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  };

  return (
    <div className="w-full h-full relative min-h-[350px] md:min-h-0">
      <MapContainer 
        center={center} 
        zoom={14} 
        scrollWheelZoom={true}
        className="w-full h-full"
        style={{ minHeight: "100%" }}
      >
        <ChangeView center={center} />
        
        {/* Camada de Tiles Dark Premium do CartoDB */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={20}
        />

        {/* Marcador do Usuário */}
        {userCoords && (
          <Marker position={userCoords} icon={createUserIcon()}>
            <Popup className="premium-map-popup">
              <div className="p-1 text-center">
                <span className="text-xs font-semibold text-white">Você está aqui</span>
              </div>
            </Popup>
          </Marker>
        )}

        {advertisers.map((adv) => {
          const isGold = adv.tier === 'gold' || adv.is_gold;
          return (
            <Marker 
              key={adv.id} 
              position={[adv.latitude, adv.longitude]}
              icon={createCustomIcon(adv)}
              eventHandlers={{
                click: () => onSelectAdvertiser(adv.id)
              }}
            >
              <Popup className="premium-map-popup">
                <div className={`p-1 flex flex-col items-center text-center ${isGold ? 'bg-gradient-to-b from-amber-500/10 to-transparent rounded-xl' : ''}`}>
                  {isGold && (
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-300 bg-amber-500/20 border border-amber-400/40 px-2 py-0.5 rounded-full mb-1.5 flex items-center gap-1">
                      👑 Destaque Gold Premium
                    </span>
                  )}
                  <div className={`w-12 h-12 rounded-full overflow-hidden mb-2 relative ${isGold ? 'border-2 border-amber-400 shadow-md shadow-amber-400/30' : 'border border-gray-700'}`}>
                    <Image src={adv.photos[0]} alt={adv.stage_name} fill sizes="48px" className="object-cover" />
                  </div>
                  <h4 className="text-sm font-semibold text-white mb-0.5">{adv.stage_name}</h4>
                  <p className="text-xs text-gray-400 mb-2">{adv.neighborhood}</p>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 mb-2">
                    {adv.is_verified && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20 font-medium">
                        Verificada
                      </span>
                    )}
                    {adv.is_available_now && (
                      <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded font-medium animate-pulse">
                        Disponível
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-white mb-2.5">
                    R$ {adv.rate}/h
                  </p>
                  <a 
                    href={`/perfil/${adv.id}`} 
                    className={`w-full text-center px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all block ${
                      isGold
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-dark-bg font-extrabold shadow-md hover:scale-105'
                        : accentColor === 'gold' 
                          ? 'bg-gold-primary hover:bg-gold-light text-dark-bg' 
                          : 'bg-wine-primary hover:bg-wine-light text-white'
                    }`}
                  >
                    Ver Perfil
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
