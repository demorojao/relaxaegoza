import React from 'react';
import Image from 'next/image';
import { Profile } from '../types';
import { getCDNUrl } from '../lib/mediaHelper';
import Link from 'next/link';

interface AuraStoriesProps {
  storiesProfiles: Profile[];
  handleOpenStory: (profile: Profile) => void;
  overlay?: boolean;
  canPost?: boolean; // somente providers logados podem criar stories
}

export default function AuraStories({ storiesProfiles, handleOpenStory, overlay = false, canPost = false }: AuraStoriesProps) {
  return (
    <div className={`w-full relative z-10 ${
      overlay 
        ? 'bg-gradient-to-b from-black/70 to-transparent px-3 pt-2 pb-3' 
        : 'max-w-7xl mx-auto px-6 pt-4 pb-2'
    }`}>
      {/* Label "Disponíveis Agora" */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gold-light/70">Stories — Disponíveis Agora</span>
      </div>

      {/* Scrollable row of story avatars OR empty state */}
      {storiesProfiles.length === 0 ? (
        /* Estado vazio */
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {canPost && (
            <Link href="/dashboard/stories" className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-gold-primary/40 flex items-center justify-center bg-gold-primary/5 group-hover:bg-gold-primary/10 transition-all">
                <span className="text-gold-primary text-xl font-light leading-none">+</span>
              </div>
              <span className="text-[9px] text-gray-500 group-hover:text-gold-light transition-colors max-w-[60px] truncate text-center">
                Criar Story
              </span>
            </Link>
          )}
          <span className="text-[10px] text-gray-600 italic">Nenhum story ativo no momento.</span>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden snap-x">
          {storiesProfiles.map((profile) => {
            const isPremium = profile.subscription_tier === 'gold';
            const isPro = profile.subscription_tier === 'pro';
            const avatarSize = overlay ? 'w-12 h-12 sm:w-14 sm:h-14' : 'w-14 h-14 sm:w-16 sm:h-16';
            return (
              <button
                key={profile.id}
                onClick={() => handleOpenStory(profile)}
                className="flex flex-col items-center gap-1 focus:outline-none cursor-pointer snap-start group shrink-0"
              >
                <div className={`relative p-[2px] rounded-full transition-all duration-300 group-hover:scale-105 ${
                  isPremium 
                    ? 'bg-gradient-to-tr from-gold-primary via-wine-primary to-gold-light shadow-lg shadow-gold-primary/20 ring-1 ring-gold-primary/30' 
                    : isPro 
                      ? 'bg-wine-primary shadow-md' 
                      : 'bg-white/20'
                }`}>
                  <div className={`${avatarSize} rounded-full border-2 border-dark-bg overflow-hidden relative`}>
                    <Image 
                      src={getCDNUrl(profile.avatar_url) || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400'} 
                      alt={profile.name}
                      fill
                      sizes="(max-width: 640px) 48px, 56px"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-dark-bg rounded-full animate-pulse" />
                </div>
                <span className="text-[9px] font-semibold text-gray-300 group-hover:text-gold-light transition-colors max-w-[60px] truncate drop-shadow-md">
                  {profile.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
