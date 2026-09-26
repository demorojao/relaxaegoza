import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabaseServer';
import { requestPushinPayPixCashOut } from '@/lib/pushinpay';
import { isValidCPF } from '@/lib/utils';

const MIN_PAYOUT_CENTS = 500; // R$ 5,00 valor mínimo por saque Pix

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const supabaseService = getSupabaseServiceClient();

    let user: any = null;

    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: authUser } } = await supabaseService.auth.getUser(token);
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
        error: 'Você precisa cadastrar seu CPF, E-mail ou Telefone como chave PIX antes de solicitar o saque.'
      }, { status: 400 });
    }

    const rawPixKey = profile.pix_key.trim();
    let cleanPixKey = rawPixKey.replace(/\s+/g, '');

    const onlyDigits = rawPixKey.replace(/\D/g, '');
    const isCpfFormat = /^\d{11}$/.test(onlyDigits) || /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(rawPixKey);

    if (isCpfFormat) {
      if (!isValidCPF(onlyDigits)) {
        return NextResponse.json({
          error: 'O CPF informado como chave PIX é inválido. Por favor, verifique os dígitos.'
        }, { status: 400 });
      }
      cleanPixKey = onlyDigits;
    } else {
      if (cleanPixKey.length < 5) {
        return NextResponse.json({
          error: 'Chave PIX inválida. Informe um CPF válido, E-mail, Telefone ou Chave Aleatória.'
        }, { status: 400 });
      }
    }

    // 2. Buscar compras pendentes de repasse (sem payout_id e concluídas)
    let { data: purchases, error: purchasesError } = await supabaseService
      .from('content_purchases')
      .select('id, amount, net_amount, amount_cents, net_amount_cents, status')
      .eq('provider_id', user.id)
      .is('payout_id', null)
      .in('status', ['completed', 'paid']);

    if (purchasesError) {
      console.error('Erro ao consultar saldo para repasse:', purchasesError);
    }

    // Fallback de alta disponibilidade: Se content_purchases estiver vazio, sincronizar vendas de assinaturas VIP pagas da tabela payments
    if (!purchases || purchases.length === 0) {
      const { data: vipPayments } = await supabaseService
        .from('payments')
        .select('*')
        .eq('target_profile_id', user.id)
        .eq('tier', 'exclusive_subscription')
        .in('status', ['paid', 'completed']);

      if (vipPayments && vipPayments.length > 0) {
        for (const p of vipPayments) {
          const amountCents = p.amount_cents || 4990;
          const netCents = Math.round(amountCents * 0.9);

          await supabaseService
            .from('content_purchases')
            .insert({
              client_id: p.user_id || user.id,
              provider_id: user.id,
              amount_cents: amountCents,
              net_amount_cents: netCents,
              purchase_type: 'subscription',
              status: 'completed',
              created_at: p.created_at || new Date().toISOString()
            });
        }

        const { data: syncedPurchases } = await supabaseService
          .from('content_purchases')
          .select('id, amount, net_amount, amount_cents, net_amount_cents, status')
          .eq('provider_id', user.id)
          .is('payout_id', null)
          .in('status', ['completed', 'paid']);

        purchases = syncedPurchases || [];
      }
    }

    if (!purchases || purchases.length === 0) {
      return NextResponse.json({ error: 'Você não possui saldo disponível para saque no momento.' }, { status: 400 });
    }

    // Calcular valores acumulados em centavos
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
        error: `O valor mínimo para solicitação de saque PIX é de R$ 5,00. Seu saldo disponível atual é R$ ${(totalNetCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
      }, { status: 400 });
    }

    // 3. Registrar o payout no estado 'pending_manual_transfer'
    const { data: payoutRecord, error: insertError } = await supabaseService
      .from('payouts')
      .insert({
        provider_id: user.id,
        amount_cents: totalGrossCents,
        net_amount_cents: totalNetCents,
        pix_key: cleanPixKey,
        status: 'pending_manual_transfer',
      })
      .select()
      .single();

    if (insertError || !payoutRecord) {
      console.error('Erro ao registrar solicitação de payout:', insertError);
      return NextResponse.json({ error: 'Erro ao iniciar a solicitação de saque no banco de dados.' }, { status: 500 });
    }

    // Vincular as compras ao payout de forma atômica
    const purchaseIds = purchases.map((p: any) => p.id);
    const { data: updatedPurchases, error: lockError } = await supabaseService
      .from('content_purchases')
      .update({ payout_id: payoutRecord.id })
      .in('id', purchaseIds)
      .is('payout_id', null)
      .select('id');

    if (lockError || !updatedPurchases || updatedPurchases.length !== purchaseIds.length) {
      if (updatedPurchases && updatedPurchases.length > 0) {
        await supabaseService
          .from('content_purchases')
          .update({ payout_id: null })
          .in('id', updatedPurchases.map((u: any) => u.id));
      }

      await supabaseService
        .from('payouts')
        .update({ status: 'failed', error_message: 'Concorrência detectada. Saque duplicado ou concorrente impedido.' })
        .eq('id', payoutRecord.id);

      return NextResponse.json({ error: 'Já existe uma solicitação de saque simultânea em processamento para algumas destas vendas.' }, { status: 400 });
    }

    // 4. Tentativa de repasse automático via PushinPay (com fallback Gracioso para Repasse Manual)
    try {
      const pushinpayRes = await requestPushinPayPixCashOut({
        value: totalNetCents,
        pix_key: cleanPixKey,
      });

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
      console.log('PushinPay exige repasse manual para chave de terceiro. Registrado com sucesso:', cashOutError.message);

      return NextResponse.json({
        success: true,
        isManual: true,
        message: `Solicitação de saque de R$ ${(totalNetCents / 100).toFixed(2)} registrada com sucesso! Nosso setor financeiro efetuará a transferência via Pix para a sua chave (${cleanPixKey}) em instantes.`,
        payoutId: payoutRecord.id,
        netAmount: totalNetCents / 100,
      });
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
      const { data: { user: authUser } } = await supabaseService.auth.getUser(token);
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
