import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from '@/lib/r2Server';

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
    const publicUrl = `${R2_PUBLIC_URL}/${fileKey}`;

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
