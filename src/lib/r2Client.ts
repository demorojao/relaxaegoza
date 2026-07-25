import { supabase } from './supabase';

/**
 * Faz o upload de um arquivo para o Cloudflare R2 usando a API segura do servidor Next.js.
 * Envia o arquivo via FormData para o servidor que faz o upload de servidor para servidor no R2,
 * evitando problemas de CORS e falhas de presigned URL no navegador.
 */
export async function uploadToR2(file: File): Promise<string> {
  // 1. Obter a sessão atual para autenticar a requisição na API
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  // 2. Preparar FormData para envio
  const formData = new FormData();
  formData.append('file', file);

  // 3. Enviar para a API de upload do servidor
  const response = await fetch('/api/media/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Erro ao realizar upload do arquivo.');
  }

  const { publicUrl } = await response.json();
  if (!publicUrl) {
    throw new Error('Servidor não retornou uma URL válida para o arquivo.');
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
