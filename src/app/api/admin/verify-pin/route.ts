import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { pin } = await req.json();

    if (!pin) {
      return NextResponse.json({ error: 'PIN de Segurança é obrigatório.' }, { status: 400 });
    }

    // 1. Validar a sessão do usuário via token Bearer ou Cookie do Supabase
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Sessão não informada. Faça login novamente.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseServer = getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Sessão expirada ou usuário não autenticado.' }, { status: 401 });
    }

    // 2. Verificar se o usuário possui papel de 'admin' no banco
    const supabaseService = getSupabaseServiceClient();
    const { data: adminProfile, error: profileError } = await supabaseService
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso Proibido. Esta conta não possui privilégios de Administrador.' }, { status: 403 });
    }

    // 3. Validar o PIN de Segurança estritamente contra a variável de ambiente (sem códigos fixos)
    const cleanPin = pin.trim();
    const envPin = (process.env.ADMIN_SECURITY_PIN || '').trim();

    if (!envPin) {
      return NextResponse.json({ error: 'PIN de Segurança não configurado no servidor (ADMIN_SECURITY_PIN).' }, { status: 500 });
    }

    const isValidPin = cleanPin === envPin;

    if (!isValidPin) {
      return NextResponse.json({ error: 'PIN de Segurança Admin incorreto.' }, { status: 403 });
    }

    // 4. Criar Cookie HTTP-Only de Sessão Administrativa Autorizada
    const response = NextResponse.json({ 
      success: true, 
      message: 'PIN validado e sessão administrativa autorizada.' 
    });

    const isProduction = process.env.NODE_ENV === 'production';
    
    response.cookies.set('admin_session_auth', 'true', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 60 * 60 * 8, // Válido por 8 horas
      path: '/'
    });

    return response;

  } catch (err: any) {
    console.error('Erro na verificação de PIN de Admin:', err);
    return NextResponse.json({ error: err.message || 'Erro interno ao validar PIN.' }, { status: 500 });
  }
}
