import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabaseServer';
import { RekognitionClient, CompareFacesCommand } from '@aws-sdk/client-rekognition';

export async function POST(req: NextRequest) {
  try {
    // 1. Validar a sessão do usuário de forma segura
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Não autorizado. Faça login novamente.' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const supabaseServer = getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado.' }, { status: 401 });
    }

    // 2. Extrair URLs do corpo da requisição
    const { selfieUrl, documentUrl } = await req.json();
    if (!selfieUrl || !documentUrl) {
      return NextResponse.json({ error: 'URLs de selfie e documento são obrigatórias.' }, { status: 400 });
    }

    // 3. Download das imagens do Supabase Storage no servidor para converter em Buffer
    const downloadImage = async (url: string): Promise<Buffer> => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Falha ao baixar imagem para verificação: ${url}`);
      }
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    };

    let selfieBuffer: Buffer;
    let docBuffer: Buffer;
    try {
      selfieBuffer = await downloadImage(selfieUrl);
      docBuffer = await downloadImage(documentUrl);
    } catch (downloadErr: any) {
      console.error('Download error:', downloadErr);
      return NextResponse.json({ error: 'Erro ao processar imagens no servidor.' }, { status: 500 });
    }

    // 4. Configurar e invocar a AWS Rekognition
    const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const awsRegion = process.env.AWS_REGION || 'us-east-1';

    if (!awsAccessKey || !awsSecretKey) {
      console.error('AWS Credentials missing in server environment variables.');
      // Se não há chaves configuradas, faz fallback para análise manual
      const supabaseService = getSupabaseServiceClient();
      await supabaseService
        .from('profiles')
        .update({ verification_status: 'pending' })
        .eq('id', user.id);

      return NextResponse.json({
        success: true,
        isMatch: false,
        status: 'pending',
        error: 'Credenciais de biometria temporariamente indisponíveis. Seus documentos foram encaminhados para moderação manual.'
      });
    }

    const rekognition = new RekognitionClient({
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKey,
        secretAccessKey: awsSecretKey
      }
    });

    try {
      const command = new CompareFacesCommand({
        SourceImage: { Bytes: selfieBuffer },
        TargetImage: { Bytes: docBuffer },
        SimilarityThreshold: 80 // Exige no mínimo 80% de similaridade
      });

      const response = await rekognition.send(command);

      const match = response.FaceMatches?.[0];
      const isMatch = !!match && match.Similarity !== undefined && match.Similarity >= 80;
      const similarity = match?.Similarity ? Math.round(match.Similarity) : 0;

      // 5. Salvar resultado e definir status
      const finalStatus = isMatch ? 'verified' : 'pending';
      const supabaseService = getSupabaseServiceClient();
      
      const { error: updateError } = await supabaseService
        .from('profiles')
        .update({ verification_status: finalStatus })
        .eq('id', user.id);

      if (updateError) throw updateError;

      return NextResponse.json({
        success: true,
        isMatch,
        similarity,
        status: finalStatus
      });

    } catch (awsErr: any) {
      console.error('AWS Rekognition API Error:', awsErr);
      
      // Fallback para moderação manual em caso de erro da AWS (ex: fotos sem rosto detectado)
      const supabaseService = getSupabaseServiceClient();
      await supabaseService
        .from('profiles')
        .update({ verification_status: 'pending' })
        .eq('id', user.id);

      let userMsg = 'A IA da AWS não conseguiu analisar as fotos (certifique-se de que ambas possuem rostos claros e visíveis). Seus documentos foram enviados para moderação manual.';
      if (awsErr.name === 'InvalidParameterException' || awsErr.message?.includes('no faces')) {
        userMsg = 'Não detectamos rostos nítidos em uma ou ambas as fotos enviadas. Seus documentos foram enviados para moderação manual.';
      }

      return NextResponse.json({
        success: true,
        isMatch: false,
        status: 'pending',
        error: userMsg
      });
    }

  } catch (err: any) {
    console.error('API Verify Identity Error:', err);
    return NextResponse.json({ error: err.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
