import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reported_profile_id, reason, description } = body;

    if (!reported_profile_id || !reason) {
      return NextResponse.json({ error: 'Perfil denunciado e motivo são obrigatórios.' }, { status: 400 });
    }

    // Tentar obter usuário autenticado, mas permitir denúncia anônima
    let reporterId: string | null = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const supabaseServer = getSupabaseServerClient();
      const { data: { user } } = await supabaseServer.auth.getUser(token);
      if (user) {
        reporterId = user.id;
      }
    }

    // Instancia o cliente administrativo (service_role) para salvar independente de RLS
    const supabaseService = getSupabaseServiceClient();
    const { data, error } = await supabaseService
      .from('reports')
      .insert({
        reporter_id: reporterId,
        reported_profile_id,
        reason,
        description,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, report: data });
  } catch (err: any) {
    console.error('Erro ao enviar denúncia:', err);
    return NextResponse.json({ error: err.message || 'Erro ao registrar denúncia.' }, { status: 500 });
  }
}
