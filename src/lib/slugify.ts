export const CITY_TO_STATE_MAP: Record<string, string> = {
  // SP
  'sao-paulo': 'sp',
  'campinas': 'sp',
  'santos': 'sp',
  'ribeirao-preto': 'sp',
  'sao-jose-dos-campos': 'sp',
  'sorocaba': 'sp',
  'barueri': 'sp',
  'barueri-alphaville': 'sp',
  'alphaville': 'sp',
  'bauru': 'sp',
  'piracicaba': 'sp',
  'sao-bernardo-do-campo': 'sp',
  'sao-caetano-do-sul': 'sp',
  'santo-andre': 'sp',
  'osasco': 'sp',
  'jundiai': 'sp',

  // RJ
  'rio-de-janeiro': 'rj',
  'niteroi': 'rj',
  'petropolis': 'rj',
  'teresopolis': 'rj',
  'duque-de-caxias': 'rj',
  'nova-iguacu': 'rj',
  'sao-goncalo': 'rj',
  'buzios': 'rj',
  'cabo-frio': 'rj',

  // MG
  'belo-horizonte': 'mg',
  'uberlandia': 'mg',
  'juiz-de-fora': 'mg',
  'contagem': 'mg',
  'betim': 'mg',

  // PR
  'curitiba': 'pr',
  'londrina': 'pr',
  'maringa': 'pr',
  'ponta-grossa': 'pr',
  'foz-do-iguacu': 'pr',

  // SC
  'florianopolis': 'sc',
  'joinville': 'sc',
  'blumenau': 'sc',
  'balneario-camboriu': 'sc',
  'chapeco': 'sc',
  'criciuma': 'sc',

  // RS
  'porto-alegre': 'rs',
  'caxias-do-sul': 'rs',
  'canoas': 'rs',
  'pelotas': 'rs',
  'santa-maria': 'rs',

  // DF
  'brasilia': 'df',

  // GO
  'goiania': 'go',
  'aparecida-de-goiania': 'go',
  'anapolis': 'go',

  // BA
  'salvador': 'ba',
  'feira-de-santana': 'ba',
  'vitoria-da-conquista': 'ba',

  // PE
  'recife': 'pe',
  'jaboatao-dos-guararapes': 'pe',
  'olinda': 'pe',

  // CE
  'fortaleza': 'ce',
  'caucaia': 'ce',
  'juazeiro-do-norte': 'ce',

  // ES
  'vitoria': 'es',
  'vila-velha': 'es',
  'serra': 'es',

  // PA
  'belem': 'pa',
  'anandindeua': 'pa',

  // MA
  'sao-luis': 'ma',

  // PB
  'joao-pessoa': 'pb',
  'campina-grande': 'pb',

  // RN
  'natal': 'rn',
  'mossoro': 'rn',

  // AL
  'maceio': 'al',

  // SE
  'aracaju': 'se',

  // MT
  'cuiaba': 'mt',
  'varzea-grande': 'mt',

  // MS
  'campo-grande': 'ms',
  'dourados': 'ms',

  // AM
  'manaus': 'am',

  // PI
  'teresina': 'pi',

  // RO
  'porto-velho': 'ro',

  // AP
  'macapa': 'ap',

  // RR
  'boa-vista': 'rr',

  // AC
  'rio-branco': 'ac',

  // TO
  'palmas': 'to'
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
