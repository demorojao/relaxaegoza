'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Profile } from '../types';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  User, 
  MapPin, 
  DollarSign, 
  Sparkles, 
  ShieldCheck, 
  Building2,
  ChevronLeft,
  ChevronRight,
  X,
  Grid,
  Map,
  SlidersHorizontal
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatWhatsAppLink } from '@/lib/utils';
import { supabase } from '../lib/supabase';
import { getCDNUrl } from '../lib/mediaHelper';

interface ProfileReelsProps {
  profiles: Profile[];
  photos: Record<string, { url: string; type: 'photo' | 'video' }[]>;
  loading: boolean;
  setViewMode?: (v: 'reels' | 'grid' | 'map') => void;
  onOpenFilters?: () => void;
  activeFiltersCount?: number;
  categoryFilter?: string;
  setCategoryFilter?: (v: string) => void;
  spaceFilter?: boolean;
  setSpaceFilter?: (v: boolean) => void;
}

export default function ProfileReels({ 
  profiles, 
  photos, 
  loading,
  setViewMode,
  onOpenFilters,
  activeFiltersCount,
  categoryFilter,
  setCategoryFilter,
  spaceFilter,
  setSpaceFilter
}: ProfileReelsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [mediaIndexes, setMediaIndexes] = useState<Record<string, number>>({});
  
  const [lastTap, setLastTap] = useState<number>(0);
  const [heartAnimations, setHeartAnimations] = useState<{ id: number; x: number; y: number }[]>([]);
  const [showReviewsDrawer, setShowReviewsDrawer] = useState(false);
  const [activeReviews, setActiveReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  // Carregar favoritos do localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const favs = localStorage.getItem('aura_favorites');
      if (favs) {
        try {
          setFavorites(JSON.parse(favs));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  // Monitorar scroll para atualizar o perfil ativo
  const handleScroll = () => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const clientHeight = container.clientHeight;
    
    // Calcula o índice do item centralizado
    const index = Math.round(scrollTop / clientHeight);
    if (index !== activeIndex && index >= 0 && index < profiles.length) {
      setActiveIndex(index);
      setIsPlaying(true); // Auto play ao rolar
      setShowReviewsDrawer(false); // Fecha a gaveta de comentários ao rolar
    }
  };

  const fetchActiveReviews = async (profileId: string) => {
    setLoadingReviews(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id, rating_massage, rating_service, rating_environment, comment, created_at,
          client:profiles!reviews_client_id_fkey(name, avatar_url)
        `)
        .eq('provider_id', profileId)
        .order('created_at', { ascending: false });

      if (data) {
        setActiveReviews(data);
      }
    } catch (e) {
      console.error("Erro ao buscar avaliações no Reels:", e);
    } finally {
      setLoadingReviews(false);
    }
  };

  // Buscar avaliações quando o perfil ativo muda ou a gaveta abre
  useEffect(() => {
    const activeProfile = profiles[activeIndex];
    if (activeProfile && showReviewsDrawer) {
      fetchActiveReviews(activeProfile.id);
    }
  }, [activeIndex, showReviewsDrawer, profiles]);

  const handleDoubleTap = (e: React.MouseEvent, profileId: string) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    if (now - lastTap < DOUBLE_PRESS_DELAY) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (!favorites.includes(profileId)) {
        toggleFavorite(profileId);
      }

      const newAnim = { id: Date.now(), x, y };
      setHeartAnimations(prev => [...prev, newAnim]);
    } else {
      setLastTap(now);
    }
  };

  // Lidar com play/pause e mute/unmute quando o perfil ativo muda ou a mídia muda
  useEffect(() => {
    // Pausar todos os vídeos primeiro
    Object.keys(videoRefs.current).forEach(id => {
      const video = videoRefs.current[id];
      if (video) {
        video.pause();
      }
    });

    // Tocar o vídeo ativo se houver
    const activeProfile = profiles[activeIndex];
    if (activeProfile) {
      const video = videoRefs.current[activeProfile.id];
      if (video) {
        video.muted = isMuted;
        if (isPlaying) {
          video.play().catch(err => console.log('Erro auto-play vídeo:', err));
        } else {
          video.pause();
        }
      }
    }
  }, [activeIndex, isPlaying, profiles, mediaIndexes, isMuted]);

  // Atualizar volume em todos os vídeos quando o estado de mute muda
  useEffect(() => {
    Object.keys(videoRefs.current).forEach(id => {
      const video = videoRefs.current[id];
      if (video) {
        video.muted = isMuted;
      }
    });
  }, [isMuted]);

  // Reset active index and scroll position when profiles change
  useEffect(() => {
    setActiveIndex(0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [profiles]);

  const toggleFavorite = (profileId: string) => {
    let newFavs = [...favorites];
    if (newFavs.includes(profileId)) {
      newFavs = newFavs.filter(id => id !== profileId);
    } else {
      newFavs.push(profileId);
    }
    setFavorites(newFavs);
    localStorage.setItem('aura_favorites', JSON.stringify(newFavs));
  };

  const handleShare = (profile: Profile) => {
    const url = `${window.location.origin}/perfil/${profile.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    }
  };

  const handlePrevMedia = (profileId: string, totalMedia: number) => {
    setMediaIndexes(prev => {
      const current = prev[profileId] || 0;
      const next = current > 0 ? current - 1 : totalMedia - 1;
      return { ...prev, [profileId]: next };
    });
  };

  const handleNextMedia = (profileId: string, totalMedia: number) => {
    setMediaIndexes(prev => {
      const current = prev[profileId] || 0;
      const next = current < totalMedia - 1 ? current + 1 : 0;
      return { ...prev, [profileId]: next };
    });
  };

  if (loading) {
    return (
      <div className="w-full h-[65vh] flex items-center justify-center bg-black/10 backdrop-blur-md rounded-3xl">
        <div className="w-10 h-10 border-4 border-gold-primary/30 border-t-gold-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="w-full text-center py-20 text-gray-500">
        Nenhum perfil disponível no momento para exibição em Reels.
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex justify-center items-center overflow-hidden">
      {/* Toast de compartilhamento */}
      <AnimatePresence>
        {showCopiedToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gold-primary text-dark-bg px-4 py-2 rounded-full text-xs font-bold shadow-lg z-50 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Link copiado para a área de transferência!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Category Filters for Mobile Reels */}
      {setCategoryFilter && setSpaceFilter && (
        <div className="absolute top-14 inset-x-0 z-30 pt-2 pb-6 px-4 flex items-center gap-2 md:hidden">
          {onOpenFilters && (
            <button
              onClick={onOpenFilters}
              className="p-2 rounded-xl bg-black/35 backdrop-blur-sm border border-white/5 text-gray-300 hover:text-white relative active:scale-95 transition-transform flex-shrink-0"
              title="Abrir Filtros"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-gold-primary" />
              {activeFiltersCount !== undefined && activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gold-primary text-dark-bg text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          )}

          <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-0.5 flex-1">
            <button
              onClick={() => { setCategoryFilter(''); setSpaceFilter(false); }}
              className={`px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                categoryFilter === '' && !spaceFilter
                  ? 'bg-gradient-to-r from-gold-primary/80 to-gold-dark/80 border-gold-primary/20 text-dark-bg shadow-md'
                  : 'bg-black/35 border-white/5 text-gray-400 backdrop-blur-sm'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => { setCategoryFilter('escort'); setSpaceFilter(false); }}
              className={`px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                categoryFilter === 'escort' && !spaceFilter
                  ? 'bg-gradient-to-r from-wine-primary/80 to-wine-dark/80 border-wine-primary/20 text-white shadow-md'
                  : 'bg-black/35 border-white/5 text-gray-400 backdrop-blur-sm'
              }`}
            >
              Acompanhantes
            </button>
            <button
              onClick={() => { setCategoryFilter('massage'); setSpaceFilter(false); }}
              className={`px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                categoryFilter === 'massage' && !spaceFilter
                  ? 'bg-gradient-to-r from-gold-primary/80 to-gold-dark/80 border-gold-primary/20 text-dark-bg shadow-md'
                  : 'bg-black/35 border-white/5 text-gray-400 backdrop-blur-sm'
              }`}
            >
              Massagens
            </button>
            <button
              onClick={() => { setSpaceFilter(true); }}
              className={`px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                spaceFilter
                  ? 'bg-gradient-to-r from-emerald-600/80 to-emerald-800/80 border-emerald-600/20 text-white shadow-md'
                  : 'bg-black/35 border-white/5 text-gray-400 backdrop-blur-sm'
              }`}
            >
              Com Espaço
            </button>
          </div>
        </div>
      )}

      {/* Container Principal */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full max-w-md h-full md:max-h-[75vh] md:aspect-[9/16] bg-black md:rounded-3xl md:border md:border-white/10 shadow-2xl relative overflow-y-scroll snap-y snap-mandatory scrollbar-none"
      >
        {profiles.map((profile, index) => {
          const profileMedia = photos[profile.id] || [];
          // Garante que se não houver fotos na galeria, pelo menos o avatar seja exibido
          const mediaList = profileMedia.length > 0 
            ? profileMedia 
            : (profile.avatar_url ? [{ url: profile.avatar_url, type: 'photo' as const }] : []);
          
          const currentMediaIndex = mediaIndexes[profile.id] || 0;
          const currentMedia = mediaList[currentMediaIndex];
          const isActive = index === activeIndex;
          const isFavorited = favorites.includes(profile.id);

          const isGold = profile.subscription_tier === 'gold';
          const isPro = profile.subscription_tier === 'pro';

          return (
            <div 
              key={profile.id}
              className="w-full h-full relative snap-start snap-always bg-neutral-950 flex flex-col justify-end overflow-hidden"
            >
              {/* Media Display (Photo or Video) */}
              <div className="absolute inset-0 w-full h-full z-0 flex items-center justify-center select-none">
                {currentMedia ? (
                  currentMedia.type === 'video' ? (
                    <video
                      ref={el => { videoRefs.current[profile.id] = el; }}
                      src={getCDNUrl(currentMedia.url)}
                      autoPlay={isActive}
                      loop
                      muted={isMuted}
                      playsInline
                      className="w-full h-full object-cover pointer-events-none select-none"
                      onContextMenu={(e) => e.preventDefault()}
                      controlsList="nodownload"
                      preload={isActive ? "auto" : "metadata"}
                      onClick={() => setIsPlaying(!isPlaying)}
                    />
                  ) : (
                    <Image
                      src={getCDNUrl(currentMedia.url)}
                      alt={profile.name}
                      fill
                      priority={isActive}
                      sizes="(max-width: 640px) 100vw, 450px"
                      className="object-cover select-none pointer-events-none"
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                      onClick={() => setIsPlaying(!isPlaying)}
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-gray-500">
                    Sem mídia disponível
                  </div>
                )}

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
              </div>

              {/* Top Stories-like Progress Indicators */}
              {mediaList.length > 1 && (
                <div className="absolute top-28 md:top-3 left-4 right-4 z-20 flex gap-1">
                  {mediaList.map((_, idx) => (
                    <div 
                      key={idx} 
                      className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden"
                    >
                      <div 
                        className={cn(
                          "h-full bg-gold-primary transition-all duration-300 rounded-full",
                          idx === currentMediaIndex ? 'w-full' : idx < currentMediaIndex ? 'w-full bg-white/60' : 'w-0'
                        )}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Floating Hearts for Double-Tap Likes */}
              {heartAnimations.map(anim => (
                <motion.div
                  key={anim.id}
                  initial={{ scale: 0, opacity: 0, y: anim.y }}
                  animate={{ 
                    scale: [1, 1.5, 1], 
                    opacity: [0, 1, 1, 0],
                    y: anim.y - 100 
                  }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  onAnimationComplete={() => {
                    setHeartAnimations(prev => prev.filter(a => a.id !== anim.id));
                  }}
                  className="absolute pointer-events-none text-red-500 z-30"
                  style={{ left: anim.x - 24, top: anim.y - 24 }}
                >
                  <Heart className="w-12 h-12 fill-red-500 stroke-white stroke-2 drop-shadow-lg" />
                </motion.div>
              ))}

              {/* Left/Right arrows for photo navigation - aparecem ao hover/tap */}
              {mediaList.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevMedia(profile.id, mediaList.length);
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-90 backdrop-blur-sm"
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextMedia(profile.id, mediaList.length);
                    }}
                    className="absolute right-20 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all active:scale-90 backdrop-blur-sm"
                    aria-label="Próxima foto"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Central tap zone for play/pause and double-tap like */}
              <div 
                className="absolute inset-0 z-10"
                onClick={(e) => {
                  // Ignora cliques nos botões de navegação lateral
                  const target = e.target as HTMLElement;
                  if (target.closest('button') || target.closest('a')) return;
                  const now = Date.now();
                  if (now - lastTap < 300) {
                    handleDoubleTap(e, profile.id);
                  } else {
                    setLastTap(now);
                    if (currentMedia?.type === 'video') {
                      setIsPlaying(!isPlaying);
                    }
                  }
                }}
              />

              {/* Play/Pause indicator overlay */}
              <AnimatePresence>
                {!isPlaying && currentMedia?.type === 'video' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center z-20 pointer-events-none"
                  >
                    <Play className="w-8 h-8 text-white fill-white ml-1" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Right Side Action Menu — Unificado e Centralizado para evitar sobreposição */}
              <div className="absolute right-3.5 top-[45%] -translate-y-1/2 z-20 flex flex-col items-center gap-3.5">
                {/* Avatar do perfil integrado à coluna */}
                <Link 
                  href={`/perfil/${profile.id}`} 
                  className="flex flex-col items-center group mb-1"
                >
                  <div className="w-11 h-11 rounded-full border-[2px] border-gold-primary overflow-hidden relative shadow-lg shadow-gold-primary/20 group-hover:scale-105 transition-transform duration-300">
                    <Image
                      src={getCDNUrl(profile.avatar_url) || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400'}
                      alt={profile.name}
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  </div>
                  <span className="text-[9px] text-gold-primary mt-1 font-bold tracking-wider">Perfil</span>
                </Link>

                {/* WhatsApp Quick CTA Button */}
                {profile.whatsapp && (
                  <a
                    href={formatWhatsAppLink(profile.whatsapp, `Olá ${profile.name}, te vi no Drops do Relaxa & Goza e gostei muito do seu perfil! Está disponível?`) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center group"
                  >
                    <button className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 active:scale-95 transition-all duration-300">
                      <span className="text-lg font-sans">💬</span>
                    </button>
                    <span className="text-[9px] text-gray-300 mt-1 font-semibold tracking-wider font-sans group-hover:text-white">Whats</span>
                  </a>
                )}

                {/* Reviews/Comments Button */}
                <button
                  onClick={() => setShowReviewsDrawer(true)}
                  className="flex flex-col items-center group"
                >
                  <div className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 flex items-center justify-center text-white shadow-lg active:scale-90 transition-all duration-300">
                    <MessageCircle className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-[9px] text-gray-300 mt-1 font-semibold tracking-wider">Avaliações</span>
                </button>

                {/* Favorite Heart Button */}
                <button
                  onClick={() => toggleFavorite(profile.id)}
                  className="flex flex-col items-center group"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 flex items-center justify-center shadow-lg active:scale-90 transition-all duration-300",
                    isFavorited ? 'text-red-500 border-red-500/30' : 'text-white'
                  )}>
                    <Heart className={cn("w-4.5 h-4.5", isFavorited ? 'fill-red-500' : '')} />
                  </div>
                  <span className="text-[9px] text-gray-300 mt-1 font-semibold tracking-wider">Favoritar</span>
                </button>

                {/* Share Button */}
                <button
                  onClick={() => handleShare(profile)}
                  className="flex flex-col items-center group"
                >
                  <div className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 flex items-center justify-center text-white shadow-lg active:scale-90 transition-all duration-300">
                    <Share2 className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-[9px] text-gray-300 mt-1 font-semibold tracking-wider">Partilhar</span>
                </button>

                {/* Video Sound Toggle (Global) */}
                {currentMedia?.type === 'video' && (
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="flex flex-col items-center group"
                  >
                    <div className="w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 flex items-center justify-center text-white shadow-lg active:scale-90 transition-all duration-300">
                      {isMuted ? <VolumeX className="w-4.5 h-4.5" /> : <Volume2 className="w-4.5 h-4.5" />}
                    </div>
                    <span className="text-[9px] text-gray-300 mt-1 font-semibold tracking-wider">Som</span>
                  </button>
                )}
              </div>

              {/* Bottom Info Overlay */}
              <div className="absolute left-4 bottom-24 md:bottom-5 right-20 z-20 flex flex-col gap-2.5">
                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  {profile.is_available_now && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500 text-dark-bg animate-pulse">
                      Disponível
                    </span>
                  )}
                  {isGold ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-gold-primary text-dark-bg">
                      <Sparkles className="w-2.5 h-2.5" /> Gold
                    </span>
                  ) : isPro ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-wine-primary text-white">
                      Pro
                    </span>
                  ) : null}

                  {profile.verification_status === 'verified' && (
                    <span className="inline-flex items-center p-1 rounded-full bg-black/60 border border-emerald-500/20 text-emerald-400" title="Selfie Verificada">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </span>
                  )}

                  {profile.is_space_verified && (
                    <span className="inline-flex items-center p-1 rounded-full bg-black/60 border border-gold-primary/20 text-gold-light" title="Espaço Auditado">
                      <Building2 className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>

                {/* Name, Age and Price */}
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight drop-shadow flex items-baseline gap-1.5">
                    {profile.name}
                    <span className="text-sm font-normal text-gray-300">{profile.age} anos</span>
                  </h2>
                  <div className="flex items-center text-gold-light font-bold text-sm mt-0.5">
                    <DollarSign className="w-3.5 h-3.5 -mr-0.5 shrink-0" />
                    <span>{profile.price_per_hour}</span>
                    <span className="text-[10px] text-gray-400 font-normal ml-0.5">/h</span>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-1 text-xs text-gray-300 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-wine-light shrink-0" />
                  <span className="truncate">{profile.neighborhood ? `${profile.neighborhood}, ${profile.city}` : profile.city}</span>
                </div>

                {/* Specialties or Bio snippet */}
                {profile.bio && (
                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed font-light drop-shadow-sm">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reviews Drawer */}
      <AnimatePresence>
        {showReviewsDrawer && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="absolute inset-x-0 bottom-0 h-[60%] bg-black/95 backdrop-blur-md rounded-t-3xl border-t border-white/10 z-30 flex flex-col p-5 shadow-2xl max-w-md mx-auto"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3.5 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-gold-primary" />
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Avaliações ({activeReviews.length})
                </h3>
              </div>
              <button 
                onClick={() => setShowReviewsDrawer(false)}
                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Reviews List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 scrollbar-thin">
              {loadingReviews ? (
                <div className="h-full flex items-center justify-center">
                  <div className="w-8 h-8 border-3 border-gold-primary/30 border-t-gold-primary rounded-full animate-spin" />
                </div>
              ) : activeReviews.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 py-10">
                  <span className="text-3xl mb-2">⭐</span>
                  <p className="text-xs font-light">Ainda não há avaliações para este perfil.</p>
                </div>
              ) : (
                activeReviews.map((rev) => {
                  const avgRating = ((rev.rating_massage + rev.rating_service + rev.rating_environment) / 3).toFixed(1);
                  return (
                    <div key={rev.id} className="bg-white/5 border border-white/5 rounded-2xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden relative bg-black/20 shrink-0">
                            <img 
                              src={getCDNUrl(rev.client?.avatar_url) || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400'} 
                              alt="Cliente"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="truncate max-w-[120px]">
                            <span className="text-xs font-semibold text-white block truncate">{rev.client?.name || 'Cliente'}</span>
                            <span className="text-[9px] text-gray-400">{new Date(rev.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-gold-primary bg-gold-primary/10 border border-gold-primary/20 px-2.5 py-0.5 rounded-full shrink-0">
                          ⭐ {avgRating}
                        </span>
                      </div>
                      {rev.comment && (
                        <p className="text-xs text-gray-300 font-light leading-relaxed">
                          {rev.comment}
                        </p>
                      )}
                      {/* Multicriterial Ratings Detail */}
                      <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-white/5 text-[9px] text-gray-500 font-medium">
                        <div>💆 Massagem: <span className="text-gold-light">{rev.rating_massage}★</span></div>
                        <div>🤝 Atendimento: <span className="text-gold-light">{rev.rating_service}★</span></div>
                        <div>✨ Ambiente: <span className="text-gold-light">{rev.rating_environment}★</span></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
