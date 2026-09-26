import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabaseServer';

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();
    const { data: payouts, error } = await supabase
      .from('payouts')
      .select('*, provider:profiles(id, name, pix_key, email, phone)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar saques no admin:', error);
      return NextResponse.json({ error: 'Erro ao buscar saques.' }, { status: 500 });
    }

    return NextResponse.json({ payouts: payouts || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { payoutId, status, notes } = body;

    if (!payoutId || !status) {
      return NextResponse.json({ error: 'ID do saque e novo status são obrigatórios.' }, { status: 400 });
    }

    const supabase = getSupabaseServiceClient();

    const updatePayload: any = {
      status,
      processed_at: status === 'completed' ? new Date().toISOString() : null,
    };

    if (notes) {
      updatePayload.error_message = notes;
    }

    const { data: updatedPayout, error } = await supabase
      .from('payouts')
      .update(updatePayload)
      .eq('id', payoutId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar status do saque:', error);
      return NextResponse.json({ error: 'Falha ao atualizar status no banco de dados.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Status do saque atualizado para ${status}!`,
      payout: updatedPayout,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno.' }, { status: 500 });
  }
}
