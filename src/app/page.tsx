import React from 'react';
import { cacheLife } from 'next/cache';
import { supabase } from '../lib/supabase';
import VitrineClient from '../components/VitrineClient';
import { Profile } from '../types';

export const metadata = {
  title: 'Relaxa & Goza | Vitrine Premium',
  description: 'O portal de encontros mais exclusivo do Brasil. Encontre acompanhantes e massagistas de luxo.',
};

export default async function Home() {
  'use cache';
  cacheLife('minutes');
  
  // 1. Fetch Profiles para SSR usando RPC altamente otimizado
  const { data: profilesData, error: profilesError } = await supabase.rpc('get_premium_profiles');

  if (profilesError) {
    console.error('Erro ao buscar perfis iniciais via RPC:', profilesError);
  }

  const initialProfiles = (profilesData as unknown as Profile[]) || [];

  // 2. Fetch Profiles com Stories Ativos para SSR
  const { data: activeStories } = await supabase.from('stories')
    .select(`
      profile_id,
      profiles:profiles(
        id, name, avatar_url, subscription_tier, is_available_now, whatsapp, category,
        ads:ads(is_active)
      )
    `)
    .gt('expires_at', new Date().toISOString());

  const profileMap = new Map<string, Profile>();
  activeStories?.forEach((item: any) => {
    if (item.profiles && item.profiles.avatar_url) {
      const ads = (item.profiles as any).ads;
      const isActive = Array.isArray(ads)
        ? ads.some((a: any) => a.is_active)
        : ads?.is_active;

      if (isActive) {
        profileMap.set(item.profiles.id, item.profiles as Profile);
      }
    }
  });
  
  let initialStories = Array.from(profileMap.values());
  initialStories.sort((a, b) => {
    const getScore = (p: Profile) => (p.subscription_tier === 'gold' ? 2 : p.subscription_tier === 'pro' ? 1 : 0);
    return getScore(b) - getScore(a);
  });

  return (
    <VitrineClient 
      initialProfiles={initialProfiles} 
      initialStories={initialStories} 
    />
  );
}
