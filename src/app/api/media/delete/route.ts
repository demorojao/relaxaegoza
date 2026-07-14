import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME } from '@/lib/r2Server';

export async function POST(req: NextRequest) {
  try {
    // 1. Validar a sessão do usuário de forma segura
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const supabaseServer = getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }

    // 2. Extrair dados da requisição
    const { fileUrl } = await req.json();
    if (!fileUrl) {
      return NextResponse.json({ error: 'fileUrl é obrigatório.' }, { status: 400 });
    }

    // Extrair a key do arquivo a partir da URL
    // URL format: https://public-url.dev/user-id/123456_file.jpg
    const urlParts = fileUrl.split(`${user.id}/`);
    if (urlParts.length < 2) {
      return NextResponse.json({ error: 'Acesso negado. Você só pode excluir seus próprios arquivos.' }, { status: 403 });
    }

    const fileKey = `${user.id}/${decodeURIComponent(urlParts[1])}`;

    // 3. Excluir do Cloudflare R2
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
    });

    await r2Client.send(command);

    return NextResponse.json({
      success: true,
      message: 'Arquivo excluído com sucesso do R2.',
    });

  } catch (err: any) {
    console.error('Erro na API /api/media/delete:', err);
    return NextResponse.json({ error: err.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
