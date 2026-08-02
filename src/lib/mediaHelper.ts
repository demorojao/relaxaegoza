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

  // Normalizar proxy local/Vercel do Supabase se presente
  if (normalizedUrl.includes('/api/supabase-proxy/storage/v1/object/public/profile_media/')) {
    const parts = normalizedUrl.split('/api/supabase-proxy/storage/v1/object/public/profile_media/');
    normalizedUrl = `${supabaseStoragePrefix}/${parts[1]}`;
  }

  // Se já for uma URL completa HTTP/HTTPS (Supabase, R2, ou externa), retorna diretamente
  if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
    return normalizedUrl;
  }

  // Se for um caminho relativo estático (ex: "/avatar-placeholder.svg")
  if (normalizedUrl.startsWith('/')) {
    return normalizedUrl;
  }

  // Para caminhos salvos relativamente no banco (ex: "user_id/123.jpg"), construir URL do Supabase Storage
  return `${supabaseStoragePrefix}/${normalizedUrl}`;
}
