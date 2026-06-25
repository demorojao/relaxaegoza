import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

interface UseProfilesOptions {
  cityFilter: string;
  categoryFilter: string;
  ageFilter: string;
  priceFilter: string;
  selectedSpecialties: string[];
  spaceFilter: boolean;
}

export function useProfiles(options: UseProfilesOptions) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      let query = supabase.from('profiles').select(`
        id, name, age, city, price_per_hour, avatar_url, subscription_tier, is_available_now, is_space_verified, verification_status, neighborhood, latitude, longitude, category, amenities, target_audience,
        specialties:profile_specialties(specialties(name))
      `);

      if (options.cityFilter) query = query.ilike('city', `%${options.cityFilter}%`);
      if (options.priceFilter) {
        const maxPrice = Number(options.priceFilter);
        if (maxPrice) query = query.lte('price_per_hour', maxPrice);
      }
      if (options.categoryFilter) {
        if (options.categoryFilter === 'massage') {
          query = query.in('category', ['massage', 'both']);
        } else if (options.categoryFilter === 'escort') {
          query = query.in('category', ['escort', 'both']);
        }
      }

      const { data, error } = await query;
      
      if (data) {
        let filteredData = data as unknown as Profile[];
        
        // Filtro de Idade (Local)
        if (options.ageFilter) {
          filteredData = filteredData.filter(p => {
            if (options.ageFilter === '18-25') return p.age >= 18 && p.age <= 25;
            if (options.ageFilter === '26-35') return p.age >= 26 && p.age <= 35;
            if (options.ageFilter === '36+') return p.age >= 36;
            return true;
          });
        }

        // Filtro de Especialidade (Local)
        if (options.selectedSpecialties.length > 0) {
          filteredData = filteredData.filter(p => 
            p.specialties?.some(s => options.selectedSpecialties.includes((s.specialties as any)?.name || ''))
          );
        }

        // Filtro de Ambiente Local Próprio (Local)
        if (options.spaceFilter) {
          filteredData = filteredData.filter(p => 
            p.amenities?.includes('Local Próprio')
          );
        }

        // Algoritmo de Destaque (Boosting)
        const getPriorityScore = (p: Profile) => {
          let score = 0;
          if (p.subscription_tier === 'gold') score += 1000;
          if (p.subscription_tier === 'pro') score += 500;
          if (p.is_available_now) score += 250;
          return score;
        };

        filteredData.sort((a, b) => getPriorityScore(b) - getPriorityScore(a));

        setProfiles(filteredData);
      }
      setLoading(false);
    };

    fetchProfiles();
  }, [
    options.cityFilter, 
    options.categoryFilter, 
    options.ageFilter, 
    options.priceFilter, 
    options.selectedSpecialties, 
    options.spaceFilter
  ]);

  return { profiles, loading };
}
