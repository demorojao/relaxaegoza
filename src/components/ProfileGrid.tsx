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
}

export default function ProfileGrid({ loading, profiles, viewMode, userCoords }: ProfileGridProps) {
  // Conversão de Profile[] para o formato esperado pelo componente Map
  const mapAdvertisers = profiles.map(p => ({
    id: p.id,
    stage_name: p.name,
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
    rate: Number(p.price_per_hour) || 0,
    photos: [p.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400'],
    amenities: p.amenities || []
  }));

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
                  <ProfileCard key={profile.id} profile={profile} />
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
            className="w-full flex flex-col items-center justify-center py-32 text-center"
          >
            <Search className="w-12 h-12 text-gray-600 mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">Nenhum perfil encontrado</h3>
            <p className="text-gray-500 text-sm max-w-md">
              Não encontramos garotas que correspondam a estes filtros. Tente remover alguns filtros ou buscar em outra cidade.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
