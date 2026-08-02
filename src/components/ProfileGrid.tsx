import React from 'react';
import ProfileCard from './ProfileCard';
import { Profile } from '../types';
import { Search } from 'lucide-react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { ProfileCardSkeleton } from '@/components/ui/Skeleton';


const MapComponent = dynamic(() => import('./Map'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] flex items-center justify-center bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl">
      <div className="w-10 h-10 border-4 border-gold-primary/30 border-t-gold-primary rounded-full animate-spin" />
    </div>
  )
});

interface ProfileGridProps {
  loading: boolean;
  profiles: Profile[];
  viewMode: 'grid' | 'map';
  userCoords: [number, number] | null;
  showAdInfo?: boolean;
  onClearFilters?: () => void;
}

export default function ProfileGrid({ loading, profiles, viewMode, userCoords, showAdInfo = true, onClearFilters }: ProfileGridProps) {
  // Conversão de Profile[] para o mapa (filtrado estritamente pela mesma cidade para não misturar cidades distantes)
  const mapAdvertisers = React.useMemo(() => {
    const filteredWithCoords = profiles.filter(p => p.latitude && p.longitude);
    if (filteredWithCoords.length === 0) return [];

    // Determina a cidade principal em exibição (a do primeiro perfil da lista ordenada)
    const activeCityName = filteredWithCoords[0].city?.toLowerCase().trim();

    // Filtra estritamente apenas as profissionais localizadas na MESMA cidade
    const sameCityProfiles = filteredWithCoords.filter(p => 
      p.city && activeCityName && p.city.toLowerCase().trim() === activeCityName
    );

    const baseList = sameCityProfiles.length > 0 ? sameCityProfiles : filteredWithCoords;

    // Ordena priorizando Gold/Pro/Disponíveis
    const sorted = [...baseList].sort((a, b) => {
      if (a.subscription_tier === 'gold' && b.subscription_tier !== 'gold') return -1;
      if (b.subscription_tier === 'gold' && a.subscription_tier !== 'gold') return 1;
      if (a.is_available_now && !b.is_available_now) return -1;
      if (b.is_available_now && !a.is_available_now) return 1;
      return 0;
    });

    return sorted.slice(0, 60).map(p => ({
      id: p.id,
      stage_name: (showAdInfo && p.ad_title) ? p.ad_title : p.name,
      age: p.age,
      gender: 'Feminino',
      description: p.bio || '',
      whatsapp: p.whatsapp || '',
      is_only_massage: p.category === 'massage' || p.category === 'both',
      is_escort: p.category === 'escort' || p.category === 'both',
      is_verified: p.verification_status === 'verified',
      is_space_verified: p.is_space_verified || false,
      is_available_now: p.is_available_now || false,
      latitude: Number(p.latitude) || -23.5616,
      longitude: Number(p.longitude) || -46.6560,
      neighborhood: p.neighborhood || 'Jardins',
      city: p.city,
      rate: Number((showAdInfo && p.ad_price !== undefined && p.ad_price !== null) ? p.ad_price : p.price_per_hour) || 0,
      photos: [(showAdInfo && p.ad_photos && p.ad_photos.length > 0) ? p.ad_photos[0] : (p.avatar_url || '/avatar-placeholder.svg')],
      amenities: p.amenities || [],
      tier: p.subscription_tier || 'free',
      is_gold: p.subscription_tier === 'gold'
    }));
  }, [profiles, showAdInfo]);

  const mapCenter: [number, number] = userCoords
    ? userCoords
    : (mapAdvertisers.length > 0 
        ? [mapAdvertisers[0].latitude, mapAdvertisers[0].longitude] 
        : [-23.5616, -46.6560]);

  return (
    <div id="vitrine-grid" className="flex-1 w-full max-w-7xl mx-auto px-6 pb-24 relative z-10">
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProfileCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <div className="w-full h-[500px] flex items-center justify-center bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl">
                <div className="w-10 h-10 border-4 border-gold-primary/30 border-t-gold-primary rounded-full animate-spin" />
              </div>
            )}
          </motion.div>
        ) : profiles.length > 0 ? (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {profiles.map(profile => (
                  <ProfileCard key={profile.id} profile={profile} showAdInfo={showAdInfo} />
                ))}
              </div>
            ) : (
              <div className="w-full h-[550px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
                <MapComponent 
                  advertisers={mapAdvertisers} 
                  activeId={null} 
                  onSelectAdvertiser={() => {}} 
                  accentColor="gold"
                  center={mapCenter} 
                  userCoords={userCoords}
                />
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full flex flex-col items-center justify-center py-24 text-center bg-black/30 border border-white/5 rounded-3xl p-8 space-y-4"
          >
            <div className="w-14 h-14 rounded-2xl bg-gold-primary/10 border border-gold-primary/20 flex items-center justify-center">
              <Search className="w-7 h-7 text-gold-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">Nenhum anúncio encontrado</h3>
              <p className="text-gray-400 text-xs max-w-md font-light leading-relaxed">
                Não encontramos acompanhantes que correspondam aos filtros selecionados. Tente ajustar sua busca ou limpar os filtros.
              </p>
            </div>
            {onClearFilters && (
              <button
                type="button"
                onClick={onClearFilters}
                className="mt-2 px-5 py-2.5 rounded-xl bg-gold-primary hover:bg-gold-light text-dark-bg text-xs font-bold uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                🔄 Limpar Filtros de Busca
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
