import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
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

    const ip = (req as any).ip || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const normalizedIp = ip.split(',')[0].trim();

    const supabaseService = getSupabaseServiceClient();
    const { error } = await supabaseService
      .from('profiles')
      .update({ last_ip: normalizedIp })
      .eq('id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true, ip: normalizedIp });
  } catch (err: any) {
    console.error('Erro ao registrar IP:', err);
    return NextResponse.json({ error: err.message || 'Erro ao registrar IP.' }, { status: 500 });
  }
}
