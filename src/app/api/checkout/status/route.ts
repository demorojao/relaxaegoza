import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabaseServer';
import { headers } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    // Forçar comportamento dinâmico compatível com cacheComponents
    await headers();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do pagamento não informado.' }, { status: 400 });
    }

    const supabaseService = getSupabaseServiceClient();

    // Buscar o status do pagamento pelo UUID
    const { data: payment, error } = await supabaseService
      .from('payments')
      .select('status, amount_cents, pix_copia_e_cola, pix_qr_code, is_gift, target_profile_id')
      .eq('id', id)
      .single();

    if (error || !payment) {
      return NextResponse.json({ error: 'Pagamento não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({
      status: payment.status,
      amountCents: payment.amount_cents,
      pixCopiaECola: payment.pix_copia_e_cola,
      pixQrCode: payment.pix_qr_code,
      isGift: payment.is_gift,
      targetProfileId: payment.target_profile_id
    });
  } catch (err: any) {
    // Re-lançar erros de bail-out do Next.js para que ele saiba que a rota é dinâmica
    if (
      err && 
      (err.digest === 'NEXT_PRERENDER_INTERRUPTED' || 
       err.digest === 'HANGING_PROMISE_REJECTION' || 
       err.message?.includes('Dynamic server usage'))
    ) {
      throw err;
    }
    console.error('Status check error:', err);
    return NextResponse.json({ error: 'Erro ao consultar status.' }, { status: 500 });
  }
}
