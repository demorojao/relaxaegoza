import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient, getSupabaseServiceClient } from '@/lib/supabaseServer';
import { createEfiPixCharge } from '@/lib/efi';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tier, isBoost, isGift, targetProfileId, boostHours } = body;

    const supabase = getSupabaseServerClient();
    const supabaseService = getSupabaseServiceClient();
    let user: any = null;
    let profile: any = null;

    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: authUser } } = await supabase.auth.getUser(token);
      user = authUser;
      if (user) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('role, created_at, subscription_tier, name')
          .eq('id', user.id)
          .single();
        profile = userProfile;
      }
    }

    if (!isGift) {
      if (!user || !profile) {
        return NextResponse.json({ error: 'Não autorizado. Faça login novamente.' }, { status: 401 });
      }
    }

    let amountCents = 0;
    let description = '';
    let isBoostFlag = false;
    let isGiftFlag = false;
    let targetProfileIdValue = null;
    let tierValue = null;

    // 1. Caso: Super Destaque de Presente (Gift Boost)
    if (isGift && isBoost) {
      if (!targetProfileId) {
        return NextResponse.json({ error: 'Perfil de destino nao informado.' }, { status: 400 });
      }

      const { data: targetProfile, error: targetError } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', targetProfileId)
        .single();

      if (targetError || !targetProfile || targetProfile.role !== 'provider') {
        return NextResponse.json({ error: 'Profissional de destino nao encontrada.' }, { status: 404 });
      }

      amountCents = 5000; // R$ 50,00
      isBoostFlag = true;
      isGiftFlag = true;
      targetProfileIdValue = targetProfileId;
      tierValue = 'boost';
      // Regra do Payload: Descrição puramente corporativa/técnica para a API do banco
      description = `Servicos de Publicidade Digital - ID ${user?.id || 'GUEST'}`;
    }
    // 2. Caso: Boost comum (2, 6 ou 12 Horas)
    else if (isBoost) {
      if (!profile.subscription_tier || !['pro', 'gold'].includes(profile.subscription_tier)) {
        return NextResponse.json({ error: 'Você precisa ter uma assinatura ativa (Pro ou Gold) para comprar um Boost.' }, { status: 400 });
      }

      const hours = Number(boostHours || 2);
      if (hours === 2) {
        amountCents = 1500; // R$ 15,00
      } else if (hours === 6) {
        amountCents = 3500; // R$ 35,00
      } else if (hours === 12) {
        amountCents = 6000; // R$ 60,00
      } else {
        return NextResponse.json({ error: 'Duração de Boost inválida.' }, { status: 400 });
      }

      isBoostFlag = true;
      tierValue = `boost_${hours}h`;
      description = `Servicos de Publicidade Digital - ID ${user.id}`;
    }
    // 3. Caso: Assinatura de Planos (Pro/Gold)
    else {
      if (!tier || !['pro', 'gold'].includes(tier)) {
        return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 });
      }

      const isHost = profile.role === 'host';

      if (isHost) {
        // Verificar rank do host por data de criação
        const { count: hostRank, error: hostRankError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'host')
          .lte('created_at', profile.created_at);

        const isFreeLaunch = !hostRankError && hostRank !== null && hostRank <= 100;

        if (isFreeLaunch) {
          return NextResponse.json({ error: 'Você é um dos 100 primeiros parceiros! Seu plano de salas é 100% gratuito.' }, { status: 400 });
        }

        amountCents = 39900; // R$ 399,00
        tierValue = tier;
        description = `Hospedagem de Classificado Online - ID ${user.id}`;
      } else {
        // Provedora (garota)
        const { count: providerRank, error: providerRankError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'provider')
          .lte('created_at', profile.created_at);

        const isPromoEligible = !providerRankError && providerRank !== null && providerRank <= 100;

        const baseAmount = {
          pro: 19900,
          gold: 39900
        }[tier as 'pro' | 'gold'];

        // Aplicar 30% de desconto para as 100 primeiras
        amountCents = isPromoEligible ? Math.round(baseAmount * 0.7) : baseAmount;
        tierValue = tier;
        description = `Servicos de Publicidade Digital - Ref: ${tier.toUpperCase()}`;
      }
    }

    // 4. Criação da cobrança Pix na Efí
    const pixData = await createEfiPixCharge(amountCents, description);

    // 5. Inserir registro na tabela 'payments' usando a service role (bypassa RLS)
    const { data: paymentRecord, error: insertError } = await supabaseService
      .from('payments')
      .insert({
        user_id: user?.id || null,
        txid: pixData.txid,
        amount_cents: amountCents,
        status: 'pending',
        tier: tierValue,
        is_boost: isBoostFlag,
        is_gift: isGiftFlag,
        target_profile_id: targetProfileIdValue,
        pix_copia_e_cola: pixData.pixCopiaECola,
        pix_qr_code: pixData.qrcodeImage
      })
      .select('id')
      .single();

    if (insertError || !paymentRecord) {
      console.error('Insert payment error:', insertError);
      return NextResponse.json({ error: 'Erro ao registrar intenção de pagamento no banco de dados.' }, { status: 500 });
    }

    const origin = req.headers.get('origin') || 'http://localhost:3000';

    // Retorna o link para a página interna de checkout
    return NextResponse.json({ url: `/checkout/${paymentRecord.id}` });
  } catch (err: any) {
    console.error('Checkout error:', err);
    return NextResponse.json({ error: err.message || 'Erro ao criar sessão de pagamento.' }, { status: 500 });
  }
}
