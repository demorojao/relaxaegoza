import { supabase } from './supabase';

/**
 * Faz o upload de um arquivo para o Cloudflare R2 com fallback automático para o Supabase Storage.
 * Garante que NENHUM UPLOAD de foto ou vídeo falhe no painel de anúncios ou mídias.
 */
export async function uploadToR2(file: File): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  try {
    // 1. Para arquivos maiores que 3MB, utilizar Presigned URL do R2
    if (file.size > 3 * 1024 * 1024) {
      return await uploadViaPresignedUrl(file, session.access_token);
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/media/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    if (response.ok) {
      const { publicUrl } = await response.json();
      if (publicUrl) return publicUrl;
    }

    // Se a rota padrão falhou, tenta presigned URL
    return await uploadViaPresignedUrl(file, session.access_token);
  } catch (r2Error) {
    console.warn('Upload via Cloudflare R2 indisponível. Utilizando fallback direto do Supabase Storage:', r2Error);
    // Fallback de alta disponibilidade para Supabase Storage
    return await uploadToSupabaseStorage(file, session.user);
  }
}

async function uploadViaPresignedUrl(file: File, token: string): Promise<string> {
  const presignRes = await fetch('/api/media/presign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || 'application/octet-stream',
    }),
  });

  if (!presignRes.ok) {
    const errData = await presignRes.json().catch(() => ({}));
    throw new Error(errData.error || 'Erro ao obter autorização de upload.');
  }

  const { presignedUrl, publicUrl } = await presignRes.json();
  if (!presignedUrl || !publicUrl) {
    throw new Error('Servidor não retornou a URL de upload esperada.');
  }

  const uploadRes = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error(`Falha no upload direto R2 (${uploadRes.status}).`);
  }

  return publicUrl;
}

async function uploadToSupabaseStorage(file: File, user: any): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('profile_media')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    throw new Error('Erro ao salvar arquivo no Supabase Storage: ' + error.message);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('profile_media')
    .getPublicUrl(fileName);

  return publicUrl;
}

/**
 * Exclui um arquivo do Cloudflare R2 / Supabase Storage de forma segura.
 */
export async function deleteFromR2(fileUrl: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  try {
    const response = await fetch('/api/media/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ fileUrl }),
    });

    if (!response.ok) {
      throw new Error('Falha no delete do R2');
    }
  } catch (err) {
    // Se a URL for do Supabase Storage
    if (fileUrl.includes('supabase.co')) {
      const parts = fileUrl.split('/profile_media/');
      if (parts[1]) {
        await supabase.storage.from('profile_media').remove([parts[1]]);
      }
    }
  }
}
