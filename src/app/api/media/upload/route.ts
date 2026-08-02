import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME, buildR2PublicUrl } from '@/lib/r2Server';

export async function POST(req: NextRequest) {
  try {
    // 1. Validar autenticação do usuário
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

    // 2. Extrair arquivo do FormData
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    // 2.1 Validar limite de tamanho (Max 100MB)
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'O arquivo excede o limite máximo permitido de 100MB.' }, { status: 400 });
    }

    // 2.2 Validar extensão e tipo MIME
    const allowedMimeTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/quicktime', 'video/webm'
    ];
    if (file.type && !allowedMimeTypes.includes(file.type.toLowerCase())) {
      return NextResponse.json({ error: 'Formato de mídia não suportado. Envie imagens (JPG, PNG, WebP) ou vídeos (MP4, MOV).' }, { status: 400 });
    }

    // 3. Sanitizar e gerar chave única no subdiretório do usuário
    const originalName = file.name || 'file.jpg';
    const sanitizedFileName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `${user.id}/${Date.now()}_${sanitizedFileName}`;

    // 4. Converter arquivo para Buffer e fazer upload direto via S3 SDK no servidor
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: fileKey,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
    });

    await r2Client.send(command);

    // 5. Retornar a URL pública do Cloudflare R2
    const publicUrl = buildR2PublicUrl(fileKey);

    return NextResponse.json({
      success: true,
      publicUrl,
      fileKey,
    });

  } catch (err: any) {
    console.error('Erro na API /api/media/upload:', err);
    return NextResponse.json({ error: err.message || 'Erro interno ao realizar upload do arquivo.' }, { status: 500 });
  }
}
