import { NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabaseServer';
import { slugify, getStateFromCity } from '@/lib/slugify';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://relaxegoze.com';

  const staticPages = [
    { url: `${baseUrl}`, priority: '1.0', changefreq: 'daily' },
    { url: `${baseUrl}/cadastro`, priority: '0.8', changefreq: 'monthly' },
    { url: `${baseUrl}/login`, priority: '0.5', changefreq: 'monthly' },
    { url: `${baseUrl}/espacos`, priority: '0.9', changefreq: 'daily' },
    { url: `${baseUrl}/termos-de-uso`, priority: '0.5', changefreq: 'monthly' },
    { url: `${baseUrl}/planos`, priority: '0.8', changefreq: 'weekly' },
    { url: `${baseUrl}/rankings`, priority: '0.9', changefreq: 'daily' },
  ];

  let profiles: any[] = [];
  try {
    const supabase = getSupabaseServiceClient();
    const { data } = await supabase
      .from('profiles')
      .select('id, city, neighborhood, created_at')
      .eq('role', 'provider');
    if (data) profiles = data;
  } catch (error) {
    console.error('Erro ao buscar perfis para o sitemap:', error);
  }

  const citiesMap = new Map<string, { city: string; state: string; lastModified: Date }>();
  const neighborhoodsMap = new Map<string, { city: string; state: string; neighborhood: string; lastModified: Date }>();

  profiles.forEach((profile) => {
    if (!profile.city) return;
    
    const citySlug = slugify(profile.city);
    const stateSlug = getStateFromCity(profile.city);
    const profileDate = profile.created_at ? new Date(profile.created_at) : new Date();

    const cityKey = `${stateSlug}/${citySlug}`;
    const existingCity = citiesMap.get(cityKey);
    if (!existingCity || profileDate > existingCity.lastModified) {
      citiesMap.set(cityKey, {
        city: citySlug,
        state: stateSlug,
        lastModified: profileDate,
      });
    }

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

  const nowIso = new Date().toISOString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  staticPages.forEach((p) => {
    xml += `  <url>\n    <loc>${p.url}</loc>\n    <lastmod>${nowIso}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>\n`;
  });

  Array.from(citiesMap.values()).forEach((c) => {
    xml += `  <url>\n    <loc>${baseUrl}/${c.state}/${c.city}</loc>\n    <lastmod>${c.lastModified.toISOString()}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  });

  Array.from(neighborhoodsMap.values()).forEach((n) => {
    xml += `  <url>\n    <loc>${baseUrl}/${n.state}/${n.city}/${n.neighborhood}</loc>\n    <lastmod>${n.lastModified.toISOString()}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.85</priority>\n  </url>\n`;
  });

  profiles.forEach((profile) => {
    const modDate = profile.created_at ? new Date(profile.created_at).toISOString() : nowIso;
    xml += `  <url>\n    <loc>${baseUrl}/perfil/${profile.id}</loc>\n    <lastmod>${modDate}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  });

  xml += `</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
