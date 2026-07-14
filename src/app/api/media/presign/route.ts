import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '@/lib/r2Server';

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
    const { fileName, contentType } = await req.json();
    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'fileName e contentType são obrigatórios.' }, { status: 400 });
    }

    // Forçar que o arquivo seja salvo no subdiretório do próprio usuário para segurança
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `${user.id}/${Date.now()}_${sanitizedFileName}`;

    // 3. Configurar comando PUT do S3
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
      ContentType: contentType,
    });

    // 4. Gerar a URL assinada (expira em 10 minutos / 600 segundos)
    const presignedUrl = await getSignedUrl(r2Client, command, { expiresIn: 600 });

    // 5. Construir a URL pública final que será salva no banco
    const publicUrl = `${R2_PUBLIC_URL}/${fileKey}`;

    return NextResponse.json({
      success: true,
      presignedUrl,
      publicUrl,
      fileKey,
    });

  } catch (err: any) {
    console.error('Erro na API /api/media/presign:', err);
    return NextResponse.json({ error: err.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
