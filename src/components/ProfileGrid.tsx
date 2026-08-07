import React from 'react';
import ProfileCard from './ProfileCard';
import { Profile } from '../types';
import { Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProfileCardSkeleton } from '@/components/ui/Skeleton';

interface ProfileGridProps {
  loading: boolean;
  profiles: Profile[];
  userCoords?: [number, number] | null;
  viewMode?: string;
  showAdInfo?: boolean;
  onClearFilters?: () => void;
  favorites?: string[];
  onToggleFavorite?: (id: string) => void;
}

export default function ProfileGrid({ 
  loading, 
  profiles, 
  showAdInfo = true, 
  onClearFilters,
  favorites = [],
  onToggleFavorite
}: ProfileGridProps) {
  return (
    <div id="vitrine-grid" className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pb-24 relative z-10">
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProfileCardSkeleton key={i} />
              ))}
            </div>
          </motion.div>
        ) : profiles.length > 0 ? (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full"
          >
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
              {profiles.map(profile => (
                <ProfileCard 
                  key={profile.id} 
                  profile={profile} 
                  showAdInfo={showAdInfo} 
                  isFavorite={favorites.includes(profile.id)}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
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
