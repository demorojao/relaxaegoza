import { MetadataRoute } from 'next';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { slugify, getStateFromCity } from '@/lib/slugify';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://relaxe e goze.com.br';

  // 1. Páginas estáticas do portal
  const staticPages = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/cadastro`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/planos`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/rankings`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
  ];

  // Buscar todos os provedores ativos no Supabase
  const supabase = getSupabaseServerClient();
  let profiles: any[] = [];
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id, city, neighborhood, created_at')
      .eq('role', 'provider');
    if (data) {
      profiles = data;
    }
  } catch (error) {
    console.error('Erro ao buscar perfis para o sitemap:', error);
  }

  // 2. Páginas de detalhes de perfil individual (/perfil/[id])
  const profileUrls = profiles.map((profile) => ({
    url: `${baseUrl}/perfil/${profile.id}`,
    lastModified: profile.created_at ? new Date(profile.created_at) : new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  // 3. Páginas dinâmicas de localização (Cidades e Bairros)
  const citiesMap = new Map<string, { city: string; state: string; lastModified: Date }>();
  const neighborhoodsMap = new Map<string, { city: string; state: string; neighborhood: string; lastModified: Date }>();

  profiles.forEach((profile) => {
    if (!profile.city) return;
    
    const citySlug = slugify(profile.city);
    const stateSlug = getStateFromCity(profile.city);
    const profileDate = profile.created_at ? new Date(profile.created_at) : new Date();

    // Agrupar por Cidade (ex: sp/sao-paulo)
    const cityKey = `${stateSlug}/${citySlug}`;
    const existingCity = citiesMap.get(cityKey);
    if (!existingCity || profileDate > existingCity.lastModified) {
      citiesMap.set(cityKey, {
        city: citySlug,
        state: stateSlug,
        lastModified: profileDate,
      });
    }

    // Agrupar por Bairro (ex: sp/sao-paulo/jardins)
    if (profile.neighborhood) {
      const neighborhoodSlug = slugify(profile.neighborhood);
      const neighborhoodKey = `${stateSlug}/${citySlug}/${neighborhoodSlug}`;
      
      const existingNeighborhood = neighborhoodsMap.get(neighborhoodKey);
      if (!existingNeighborhood || profileDate > existingNeighborhood.lastModified) {
        neighborhoodsMap.set(neighborhoodKey, {
          city: citySlug,
          state: stateSlug,
          neighborhood: neighborhoodSlug,
          lastModified: profileDate,
        });
      }
    }
  });

  const cityUrls = Array.from(citiesMap.values()).map((c) => ({
    url: `${baseUrl}/${c.state}/${c.city}`,
    lastModified: c.lastModified,
    changeFrequency: 'daily' as const,
    priority: 0.9,
  }));

  const neighborhoodUrls = Array.from(neighborhoodsMap.values()).map((n) => ({
    url: `${baseUrl}/${n.state}/${n.city}/${n.neighborhood}`,
    lastModified: n.lastModified,
    changeFrequency: 'daily' as const,
    priority: 0.85,
  }));

  return [
    ...staticPages,
    ...cityUrls,
    ...neighborhoodUrls,
    ...profileUrls,
  ];
}
