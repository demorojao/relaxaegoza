import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  try {
    const adminCookie = req.cookies.get('admin_session_auth')?.value;
    const authHeader = req.headers.get('authorization');
    const isCookieValid = adminCookie === 'true';

    if (!authHeader && !isCookieValid) {
      return NextResponse.json({ error: 'Acesso Proibido. Autentique-se como Administrador.' }, { status: 401 });
    }

    const token = authHeader ? authHeader.replace('Bearer ', '') : '';
    const supabaseServer = getSupabaseServerClient();
    const { data: { user }, error: authError } = token 
      ? await supabaseServer.auth.getUser(token)
      : await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });
    }

    const supabaseService = getSupabaseServiceClient();
    const { data: adminProfile } = await supabaseService
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!adminProfile || adminProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso Restrito a Administradores.' }, { status: 403 });
    }

    // Buscar histórico de audit logs com dados do Admin e Perfil Alvo
    const { data: logs, error: logsError } = await supabaseService
      .from('admin_audit_logs')
      .select(`
        id,
        action,
        details,
        ip_address,
        created_at,
        admin:profiles!admin_audit_logs_admin_id_fkey(id, name, avatar_url),
        target:profiles!admin_audit_logs_target_profile_id_fkey(id, name)
      `)
      .order('created_at', { ascending: false })
      .limit(300);

    if (logsError) throw logsError;

    return NextResponse.json({ success: true, logs: logs || [] });

  } catch (err: any) {
    console.error('Erro ao buscar logs de auditoria:', err);
    return NextResponse.json({ error: err.message || 'Erro ao carregar logs de auditoria.' }, { status: 500 });
  }
}
