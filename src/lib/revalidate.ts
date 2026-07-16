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
    await fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths, tags })
    });
  } catch (e) {
    console.error('Erro ao acionar revalidação de cache:', e);
  }
}
