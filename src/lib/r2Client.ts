import { supabase } from './supabase';

/**
 * Faz o upload de um arquivo para o Cloudflare R2 usando uma URL assinada.
 * Bypassa os limites de tamanho do servidor Next.js enviando direto do navegador do cliente.
 */
export async function uploadToR2(file: File): Promise<string> {
  // 1. Obter a sessão atual para autenticar a requisição na API
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  // 2. Solicitar URL assinada para a API
  const response = await fetch('/api/media/presign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
    }),
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error || 'Erro ao gerar link de upload assinado.');
  }

  const { presignedUrl, publicUrl } = await response.json();

  // 3. Fazer o upload do arquivo diretamente para o Cloudflare R2 usando PUT
  const uploadResponse = await fetch(presignedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error('Erro ao enviar o arquivo para o servidor de armazenamento R2.');
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
    const errData = await response.json();
    throw new Error(errData.error || 'Erro ao deletar o arquivo do armazenamento R2.');
  }
}
