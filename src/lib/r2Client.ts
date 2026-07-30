import { supabase } from './supabase';

/**
 * Faz o upload de um arquivo para o Cloudflare R2.
 * Para arquivos maiores (como vídeos HD), gera uma URL assinada (Presigned URL)
 * e faz o upload direto do navegador para o Cloudflare R2 via HTTP PUT,
 * evitando a limitação de payload da Vercel/Next.js (4.5MB).
 */
export async function uploadToR2(file: File): Promise<string> {
  // 1. Obter a sessão atual para autenticar a requisição na API
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  // Para arquivos maiores que 3MB (como vídeos ou fotos de altíssima resolução),
  // faz o upload direto via Presigned URL para não estourar os limites de tamanho de API da Vercel
  if (file.size > 3 * 1024 * 1024) {
    return uploadViaPresignedUrl(file, session.access_token);
  }

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/media/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData,
    });

    if (response.status === 413 || !response.ok) {
      return uploadViaPresignedUrl(file, session.access_token);
    }

    const { publicUrl } = await response.json();
    if (!publicUrl) {
      throw new Error('Servidor não retornou uma URL válida para o arquivo.');
    }

    return publicUrl;
  } catch (err) {
    return uploadViaPresignedUrl(file, session.access_token);
  }
}

async function uploadViaPresignedUrl(file: File, token: string): Promise<string> {
  // 1. Solicitar presigned URL para o servidor Next.js
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

  // 2. Upload direto via PUT do navegador para o Cloudflare R2
  const uploadRes = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  });

  if (!uploadRes.ok) {
    throw new Error(`Falha no upload direto para o servidor de mídias (${uploadRes.status}).`);
  }

  return publicUrl;
}

/**
 * Exclui um arquivo do Cloudflare R2 de forma segura via API do servidor.
 */
export async function deleteFromR2(fileUrl: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const response = await fetch('/api/media/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ fileUrl }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Erro ao deletar o arquivo do armazenamento R2.');
  }
}

