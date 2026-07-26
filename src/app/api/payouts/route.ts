import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabaseServer';
import { requestPushinPayPixCashOut } from '@/lib/pushinpay';

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const supabaseService = getSupabaseServiceClient();

    let user: any = null;

    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: authUser } } = await supabase.auth.getUser(token);
      user = authUser;
    }

    if (!user) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      user = authUser;
    }

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado. Faça login para continuar.' }, { status: 401 });
    }

    // 1. Buscar dados do perfil e chave PIX da profissional
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('id, pix_key, name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Perfil profissional não encontrado.' }, { status: 404 });
    }

    if (!profile.pix_key || !profile.pix_key.trim()) {
      return NextResponse.json({
        error: 'Você precisa cadastrar uma chave PIX antes de solicitar o saque.'
      }, { status: 400 });
    }

    // 2. Buscar compras pendentes de repasse (sem payout_id e concluídas)
    const { data: purchases, error: purchasesError } = await supabaseService
      .from('content_purchases')
      .select('id, amount, net_amount, status')
      .eq('provider_id', user.id)
      .is('payout_id', null)
      .eq('status', 'completed');

    if (purchasesError) {
      console.error('Erro ao consultar saldo para repasse:', purchasesError);
      return NextResponse.json({ error: 'Erro ao verificar saldo disponível para saque.' }, { status: 500 });
    }

    if (!purchases || purchases.length === 0) {
      return NextResponse.json({ error: 'Você não possui saldo disponível para saque no momento.' }, { status: 400 });
    }

    // Calcular valores acumulados
    let totalGrossReais = 0;
    let totalNetReais = 0;

    purchases.forEach((p: any) => {
      const gross = Number(p.amount) || 0;
      const net = Number(p.net_amount) || (gross * 0.9); // Taxa padrão 10% da plataforma
      totalGrossReais += gross;
      totalNetReais += net;
    });

    const totalGrossCents = Math.round(totalGrossReais * 100);
    const totalNetCents = Math.round(totalNetReais * 100);

    if (totalNetCents < 500) {
      return NextResponse.json({
        error: 'O valor mínimo para solicitação de saque PIX é R$ 5,00.'
      }, { status: 400 });
    }

    // 3. Registrar o payout no estado 'processing'
    const { data: payoutRecord, error: insertError } = await supabaseService
      .from('payouts')
      .insert({
        provider_id: user.id,
        amount_cents: totalGrossCents,
        net_amount_cents: totalNetCents,
        pix_key: profile.pix_key.trim(),
        status: 'processing',
      })
      .select()
      .single();

    if (insertError || !payoutRecord) {
      console.error('Erro ao registrar solicitação de payout:', insertError);
      return NextResponse.json({ error: 'Erro ao iniciar o processo de saque no banco de dados.' }, { status: 500 });
    }

    // Vincular as compras ao payout
    const purchaseIds = purchases.map((p: any) => p.id);
    await supabaseService
      .from('content_purchases')
      .update({ payout_id: payoutRecord.id })
      .in('id', purchaseIds);

    // 4. Executar transferência PIX via PushinPay
    try {
      const pushinpayRes = await requestPushinPayPixCashOut({
        value: totalNetCents,
        pix_key: profile.pix_key.trim(),
      });

      // Atualizar payout para completed
      await supabaseService
        .from('payouts')
        .update({
          status: 'completed',
          pushinpay_tx_id: pushinpayRes.id || null,
          processed_at: new Date().toISOString(),
        })
        .eq('id', payoutRecord.id);

      return NextResponse.json({
        success: true,
        message: `Transferência PIX de R$ ${(totalNetCents / 100).toFixed(2)} realizada com sucesso!`,
        payoutId: payoutRecord.id,
        pushinpayTxId: pushinpayRes.id,
        netAmount: totalNetCents / 100,
        receiptUrl: pushinpayRes.receipt_url || null,
      });

    } catch (cashOutError: any) {
      console.error('Erro na transferência PushinPay:', cashOutError);

      // Reverter vínculo das compras para que o saldo continue disponível
      await supabaseService
        .from('content_purchases')
        .update({ payout_id: null })
        .in('id', purchaseIds);

      // Marcar payout como failed
      await supabaseService
        .from('payouts')
        .update({
          status: 'failed',
          error_message: cashOutError.message || 'Falha no servidor da PushinPay',
        })
        .eq('id', payoutRecord.id);

      return NextResponse.json({
        error: `Falha ao processar transferência PIX: ${cashOutError.message || 'Tente novamente em instantes.'}`
      }, { status: 500 });
    }

  } catch (err: any) {
    console.error('Erro crítico na rota /api/payouts:', err);
    return NextResponse.json({ error: err.message || 'Erro interno no servidor.' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const supabaseService = getSupabaseServiceClient();

    let user: any = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: authUser } } = await supabase.auth.getUser(token);
      user = authUser;
    }

    if (!user) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      user = authUser;
    }

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data: payouts, error } = await supabaseService
      .from('payouts')
      .select('*')
      .eq('provider_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar histórico de saques.' }, { status: 500 });
    }

    return NextResponse.json({ payouts: payouts || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno no servidor.' }, { status: 500 });
  }
}
