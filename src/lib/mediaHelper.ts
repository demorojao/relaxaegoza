/**
 * Auxiliar para converter as URLs públicas de mídias (Supabase Storage / Cloudflare R2)
 * nas URLs públicas rápidas e válidas.
 */
export function getCDNUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  let normalizedUrl = url.trim();
  if (!normalizedUrl) return '';

  // Se for Data URL (base64) ou Blob URL do navegador, retorna diretamente
  if (normalizedUrl.startsWith('data:') || normalizedUrl.startsWith('blob:')) {
    return normalizedUrl;
  }

  // Prefixos conhecidos de storage
  const supabaseStoragePrefix = 'https://ivlaeilkomqhqwerojny.supabase.co/storage/v1/object/public/profile_media';
  const r2PublicDefault = 'https://pub-cb3abcfa6e1b4245be005a2dc81dd7d3.r2.dev';

  // Normalizar proxy local/Vercel do Supabase
  if (normalizedUrl.includes('/api/supabase-proxy/storage/v1/object/public/profile_media/')) {
    const parts = normalizedUrl.split('/api/supabase-proxy/storage/v1/object/public/profile_media/');
    normalizedUrl = `${supabaseStoragePrefix}/${parts[1]}`;
  }

  // Se for um caminho de arquivo relativo salvo no banco (ex: "avatars/123.jpg")
  if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
    if (normalizedUrl.startsWith('/')) {
      return normalizedUrl;
    }
    normalizedUrl = `${supabaseStoragePrefix}/${normalizedUrl}`;
  }

  const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL || r2PublicDefault;

  if (cdnUrl && normalizedUrl.startsWith(supabaseStoragePrefix)) {
    const cleanCdnUrl = cdnUrl.endsWith('/') ? cdnUrl.slice(0, -1) : cdnUrl;
    return normalizedUrl.replace(supabaseStoragePrefix, cleanCdnUrl);
  }
  
  return normalizedUrl;
}

