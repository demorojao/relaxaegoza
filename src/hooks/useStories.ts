import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { getEffectiveTier } from '@/lib/utils';

export function useStories(categoryFilter: string) {
  const [storiesProfiles, setStoriesProfiles] = useState<Profile[]>([]);
  const [isStoryLoading, setIsStoryLoading] = useState(false);

  useEffect(() => {
    const fetchStories = async () => {
      setIsStoryLoading(true);
      let query = supabase.from('profiles')
        .select('id, name, avatar_url, subscription_tier, subscription_expires_at, is_available_now, whatsapp, category')
        .eq('is_available_now', true)
        .in('subscription_tier', ['pro', 'gold']);
        
      if (categoryFilter) {
        if (categoryFilter === 'massage') {
          query = query.in('category', ['massage', 'both']);
        } else if (categoryFilter === 'escort') {
          query = query.in('category', ['escort', 'both']);
        }
      }
      
      const { data } = await query;
      if (data) {
        const sorted = (data as unknown as Profile[])
          .filter(p => getEffectiveTier(p) !== 'free')
          .sort((a, b) => {
            const getScore = (p: Profile) => {
              const tier = getEffectiveTier(p);
              return tier === 'gold' ? 2 : tier === 'pro' ? 1 : 0;
            };
            return getScore(b) - getScore(a);
          });
        setStoriesProfiles(sorted);
      }
      setIsStoryLoading(false);
    };

    fetchStories();
  }, [categoryFilter]);

  return { storiesProfiles, isStoryLoading };
}
