import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabaseServer';
import { headers } from 'next/headers';
import { getPushinPayPixStatus } from '@/lib/pushinpay';
import { fulfillPayment } from '@/lib/paymentFulfillment';

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
      .select('*')
      .eq('id', id)
      .single();

    if (error || !payment) {
      return NextResponse.json({ error: 'Pagamento não encontrado.' }, { status: 404 });
    }

    let currentStatus = payment.status;

    // Se o banco indicar 'pending', consultar status na PushinPay para resposta instantânea
    if (currentStatus === 'pending' && payment.txid) {
      const pushinData = await getPushinPayPixStatus(payment.txid);
      if (pushinData && pushinData.status === 'paid') {
        await fulfillPayment(payment);
        currentStatus = 'paid';
      }
    }

    return NextResponse.json({
      status: currentStatus,
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
