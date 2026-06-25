/**
 * Auxiliar para converter as URLs públicas de Storage do Supabase
 * nas URLs rápidas da CDN do AWS CloudFront se configurada.
 */
export function getCDNUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  // URL base pública do bucket profile_media no Supabase
  const supabaseStoragePrefix = 'https://ivlaeilkomqhqwerojny.supabase.co/storage/v1/object/public/profile_media';
  
  // CDN URL definida nas variáveis de ambiente (ex: https://d12345.cloudfront.net)
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL;

  if (cdnUrl && url.startsWith(supabaseStoragePrefix)) {
    // Garante que a URL da CDN não termine com barra para evitar barras duplas
    const cleanCdnUrl = cdnUrl.endsWith('/') ? cdnUrl.slice(0, -1) : cdnUrl;
    return url.replace(supabaseStoragePrefix, cleanCdnUrl);
  }
  
  return url;
}
