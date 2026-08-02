import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    // 1. Validar a sessão do usuário
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

    // 3. Salvar documento e atualizar status do perfil para moderação pendente
    const supabaseService = getSupabaseServiceClient();
    const { error: updateError } = await supabaseService
      .from('profiles')
      .update({
        verification_status: 'pending',
        selfie_url: selfieUrl,
        document_url: documentUrl,
      })
      .eq('id', user.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      status: 'pending',
      message: 'Seus documentos foram recebidos com sucesso e estão em análise pela nossa equipe de moderação.'
    });

  } catch (err: any) {
    console.error('API Verify Identity Error:', err);
    return NextResponse.json({ error: err.message || 'Erro interno do servidor.' }, { status: 500 });
  }
}
