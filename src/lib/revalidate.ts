import { slugify, getStateFromCity } from './slugify';

export async function triggerRevalidate(city?: string, neighborhood?: string) {
  try {
    const paths = ['/'];
    if (city) {
      const citySlug = slugify(city);
      const stateSlug = getStateFromCity(city);
      paths.push(`/${stateSlug}/${citySlug}`);
      if (neighborhood) {
        const neighborhoodSlug = slugify(neighborhood);
        paths.push(`/${stateSlug}/${citySlug}/${neighborhoodSlug}`);
      }
    }
    await fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths })
    });
  } catch (e) {
    console.error('Erro ao acionar revalidação de cache:', e);
  }
}
