import { cacheLife } from 'next/cache';
import { getSupabaseServerClient } from './supabaseServer';
import { slugify, formatLocationName } from './slugify';

export async function getOriginalLocationNames(citySlug: string, neighborhoodSlug?: string) {
  'use cache';
  cacheLife('minutes');
  const supabase = getSupabaseServerClient();
  
  const { data, error } = await supabase.rpc('resolve_location_names', {
    p_city_slug: citySlug,
    p_neighborhood_slug: neighborhoodSlug || null
  });

  if (error || !data || data.length === 0) {
    return {
      city: formatLocationName(citySlug),
      neighborhood: neighborhoodSlug ? formatLocationName(neighborhoodSlug) : undefined
    };
  }

  const match = data[0];
  return {
    city: match.city || formatLocationName(citySlug),
    neighborhood: neighborhoodSlug ? (match.neighborhood || formatLocationName(neighborhoodSlug)) : undefined
  };
}
