import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

// GET: Buscar chamados (Se for Admin, traz todos; Se for usuário comum, traz apenas os dele)
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const adminCookie = req.cookies.get('admin_session_auth')?.value;
    const isCookieValid = adminCookie === 'true';

    if (!authHeader && !isCookieValid) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
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
    const { data: profile } = await supabaseService
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';

    let query = supabaseService
      .from('support_tickets')
      .select(`
        id,
        subject,
        category,
        priority,
        status,
        created_at,
        updated_at,
        profile:profiles(id, name, avatar_url, role, whatsapp, city),
        messages:support_messages(
          id,
          sender_id,
          sender_type,
          message,
          attachments,
          created_at,
          sender:profiles(name, avatar_url)
        )
      `)
      .order('updated_at', { ascending: false });

    if (!isAdmin) {
      query = query.eq('profile_id', user.id);
    }

    const { data: tickets, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    return NextResponse.json({ success: true, tickets: tickets || [], isAdmin });

  } catch (err: any) {
    console.error('Erro ao buscar chamados de suporte:', err);
    return NextResponse.json({ error: err.message || 'Erro ao carregar chamados.' }, { status: 500 });
  }
}

// POST: Criar novo chamado de suporte
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
      return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });
    }

    const { subject, category, priority, message } = await req.json();

    if (!subject || !message) {
      return NextResponse.json({ error: 'Assunto e mensagem são obrigatórios.' }, { status: 400 });
    }

    const supabaseService = getSupabaseServiceClient();

    // 1. Inserir Ticket
    const { data: ticket, error: ticketError } = await supabaseService
      .from('support_tickets')
      .insert({
        profile_id: user.id,
        subject: subject.trim(),
        category: category || 'duvida',
        priority: priority || 'medium',
        status: 'open'
      })
      .select('id')
      .single();

    if (ticketError) throw ticketError;

    // 2. Inserir primeira mensagem do chamado
    const { error: msgError } = await supabaseService
      .from('support_messages')
      .insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        sender_type: 'user',
        message: message.trim()
      });

    if (msgError) throw msgError;

    return NextResponse.json({ success: true, ticketId: ticket.id, message: 'Chamado aberto com sucesso!' });

  } catch (err: any) {
    console.error('Erro ao criar chamado de suporte:', err);
    return NextResponse.json({ error: err.message || 'Erro ao abrir chamado.' }, { status: 500 });
  }
}

// PUT: Responder chamado ou atualizar status (Admin ou Usuário)
export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const adminCookie = req.cookies.get('admin_session_auth')?.value;
    const isCookieValid = adminCookie === 'true';

    if (!authHeader && !isCookieValid) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const token = authHeader ? authHeader.replace('Bearer ', '') : '';
    const supabaseServer = getSupabaseServerClient();
    const { data: { user }, error: authError } = token 
      ? await supabaseServer.auth.getUser(token)
      : await supabaseServer.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });
    }

    const { ticketId, message, status } = await req.json();

    if (!ticketId) {
      return NextResponse.json({ error: 'ID do chamado é obrigatório.' }, { status: 400 });
    }

    const supabaseService = getSupabaseServiceClient();
    const { data: profile } = await supabaseService
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';

    // Se houver nova mensagem
    if (message && message.trim()) {
      const { error: msgError } = await supabaseService
        .from('support_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: user.id,
          sender_type: isAdmin ? 'admin' : 'user',
          message: message.trim()
        });

      if (msgError) throw msgError;

      // Se o admin responder, notificar o usuário automaticamente no painel dele
      if (isAdmin) {
        const { data: ticketData } = await supabaseService
          .from('support_tickets')
          .select('profile_id, subject')
          .eq('id', ticketId)
          .single();

        if (ticketData) {
          await supabaseService.from('profile_notifications').insert({
            profile_id: ticketData.profile_id,
            title: '🎧 Resposta do Suporte',
            content: `A equipe de suporte respondeu ao seu chamado "${ticketData.subject}". Acesse o painel para conferir.`,
            type: 'system_update',
            is_read: false
          });
        }
      }
    }

    // Atualizar status do ticket e timestamp
    const updateData: any = { updated_at: new Date().toISOString() };
    if (status) {
      updateData.status = status;
    } else if (isAdmin) {
      updateData.status = 'in_progress';
    }

    const { error: updateError } = await supabaseService
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: 'Chamado atualizado com sucesso!' });

  } catch (err: any) {
    console.error('Erro ao atualizar chamado:', err);
    return NextResponse.json({ error: err.message || 'Erro ao atualizar chamado.' }, { status: 500 });
  }
}
