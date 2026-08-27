import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabaseServer';
import { requestPushinPayPixCashOut } from '@/lib/pushinpay';
import { isValidCPF } from '@/lib/utils';

const MIN_PAYOUT_CENTS = 5000; // R$ 50,00 valor mínimo por saque para evitar bloqueio da conta gateway

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
        error: 'Você precisa cadastrar seu CPF como chave PIX antes de solicitar o saque.'
      }, { status: 400 });
    }

    const cleanPixKey = profile.pix_key.trim().replace(/\D/g, '');
    if (!isValidCPF(cleanPixKey)) {
      return NextResponse.json({
        error: 'A chave PIX cadastrada deve ser obrigatoriamente o seu CPF (11 dígitos válidos) para prevenção de fraudes.'
      }, { status: 400 });
    }

    // 2. Buscar compras pendentes de repasse (sem payout_id e concluídas)
    const { data: purchases, error: purchasesError } = await supabaseService
      .from('content_purchases')
      .select('id, amount, net_amount, amount_cents, net_amount_cents, status')
      .eq('provider_id', user.id)
      .is('payout_id', null)
      .in('status', ['completed', 'paid']);

    if (purchasesError) {
      console.error('Erro ao consultar saldo para repasse:', purchasesError);
      return NextResponse.json({ error: 'Erro ao verificar saldo disponível para saque.' }, { status: 500 });
    }

    if (!purchases || purchases.length === 0) {
      return NextResponse.json({ error: 'Você não possui saldo disponível para saque no momento.' }, { status: 400 });
    }

    // Calcular valores acumulados em centavos (evitando erros de ponto flutuante)
    let totalGrossCents = 0;
    let totalNetCents = 0;

    purchases.forEach((p: any) => {
      const grossCents = p.amount_cents ?? Math.round((Number(p.amount) || 0) * 100);
      const netCents = p.net_amount_cents ?? Math.round((Number(p.net_amount) || ((grossCents / 100) * 0.9)) * 100);
      totalGrossCents += grossCents;
      totalNetCents += netCents;
    });

    if (totalNetCents < MIN_PAYOUT_CENTS) {
      return NextResponse.json({
        error: `O valor mínimo para solicitação de saque PIX é de R$ 50,00. Seu saldo disponível atual é R$ ${(totalNetCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
      }, { status: 400 });
    }

    // 3. Registrar o payout no estado 'processing'
    const { data: payoutRecord, error: insertError } = await supabaseService
      .from('payouts')
      .insert({
        provider_id: user.id,
        amount_cents: totalGrossCents,
        net_amount_cents: totalNetCents,
        pix_key: cleanPixKey,
        status: 'processing',
      })
      .select()
      .single();

    if (insertError || !payoutRecord) {
      console.error('Erro ao registrar solicitação de payout:', insertError);
      return NextResponse.json({ error: 'Erro ao iniciar o processo de saque no banco de dados.' }, { status: 500 });
    }

    // Vincular as compras ao payout de forma atômica (apenas se payout_id ainda for null)
    const purchaseIds = purchases.map((p: any) => p.id);
    const { data: updatedPurchases, error: lockError } = await supabaseService
      .from('content_purchases')
      .update({ payout_id: payoutRecord.id })
      .in('id', purchaseIds)
      .is('payout_id', null)
      .select('id');

    if (lockError || !updatedPurchases || updatedPurchases.length === 0) {
      await supabaseService
        .from('payouts')
        .update({ status: 'failed', error_message: 'Concorrência detectada. Saque duplicado impedido.' })
        .eq('id', payoutRecord.id);

      return NextResponse.json({ error: 'Já existe uma solicitação de saque em processamento para estas vendas.' }, { status: 400 });
    }

    // 4. Executar transferência PIX via PushinPay
    try {
      const pushinpayRes = await requestPushinPayPixCashOut({
        value: totalNetCents,
        pix_key: cleanPixKey,
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
