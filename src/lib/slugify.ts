export const CITY_TO_STATE_MAP: Record<string, string> = {
  'sao-paulo': 'sp',
  'curitiba': 'pr',
  'rio-de-janeiro': 'rj',
  'belo-horizonte': 'mg',
  'brasilia': 'df'
};

/**
 * Returns the state abbreviation slug for a given city name.
 */
export function getStateFromCity(city: string): string {
  if (!city) return 'sp';
  const citySlug = slugify(city);
  return CITY_TO_STATE_MAP[citySlug] || 'sp';
}

/**
 * Normalizes text to a clean slug format (lowercase, no accents, no special characters, separated by hyphens).
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD') // decompose accents
    .replace(/[\u0300-\u036f]/g, '') // remove accent markings
    .replace(/[^\w\s-]/g, '') // remove symbols
    .trim()
    .replace(/\s+/g, '-') // spaces to hyphens
    .replace(/-+/g, '-'); // collapse duplicate hyphens
}

/**
 * fallback capitalizing function if match in DB is not found
 */
export function formatLocationName(slug: string): string {
  if (!slug) return '';
  return slug
    .split('-')
    .map(word => {
      const lower = word.toLowerCase();
      if (['de', 'do', 'da', 'e', 'em'].includes(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}
