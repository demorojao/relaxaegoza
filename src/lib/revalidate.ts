import { slugify, getStateFromCity } from './slugify';

export async function triggerRevalidate(city?: string, neighborhood?: string, profileId?: string) {
  try {
    const paths = ['/'];
    const tags: string[] = [];
    if (city) {
      const citySlug = slugify(city);
      const stateSlug = getStateFromCity(city);
      paths.push(`/${stateSlug}/${citySlug}`);
      if (neighborhood) {
        const neighborhoodSlug = slugify(neighborhood);
        paths.push(`/${stateSlug}/${citySlug}/${neighborhoodSlug}`);
      }
    }
    if (profileId) {
      tags.push(`profile-${profileId}`);
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const secret = process.env.NEXT_PUBLIC_REVALIDATE_SECRET || 'aura_revalidate_secret_key';
    headers['x-revalidate-secret'] = secret;

    await fetch('/api/revalidate', {
      method: 'POST',
      headers,
      body: JSON.stringify({ paths, tags })
    });
  } catch (e) {
    console.error('Erro ao acionar revalidação de cache:', e);
  }
}
