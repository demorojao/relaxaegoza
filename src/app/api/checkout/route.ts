import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-05-27.dahlia',
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tier, isBoost, isGift, targetProfileId } = body;

    const supabase = getSupabaseServerClient();
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
          .select('role, created_at, subscription_tier')
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

      const amount = 5000; // R$ 50,00
      const planName = `Super Destaque de Presente para ${targetProfile.name}`;
      const planDescription = `Coloque ${targetProfile.name} no topo da vitrine por 6 horas como um presente especial.`;

      const origin = req.headers.get('origin') || 'http://localhost:3000';

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: planName,
                description: planDescription,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        metadata: {
          userId: user?.id || 'guest_buyer',
          targetProfileId: targetProfileId,
          type: 'boost',
          durationHours: '6',
          isGift: 'true'
        },
        success_url: `${origin}/perfil/${targetProfileId}?checkout_status=success_gift_boost`,
        cancel_url: `${origin}/perfil/${targetProfileId}?checkout_status=cancelled_gift_boost`,
      });

      return NextResponse.json({ url: session.url });
    }

    if (isBoost) {
      if (!profile.subscription_tier || !['pro', 'gold'].includes(profile.subscription_tier)) {
        return NextResponse.json({ error: 'Você precisa ter uma assinatura ativa (Pro ou Gold) para comprar um Boost.' }, { status: 400 });
      }

      const amount = 1500; // R$ 15,00
      const planName = `Destaque Especial (Boost - 2 Horas)`;
      const planDescription = `Fique no topo da lista das ${profile.subscription_tier === 'gold' ? 'Gold' : 'Pro'} por 2 horas.`;

      const origin = req.headers.get('origin') || 'http://localhost:3000';

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: planName,
                description: planDescription,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        metadata: {
          userId: user.id,
          type: 'boost',
          durationHours: '2',
        },
        success_url: `${origin}/dashboard?checkout_status=success_boost&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/dashboard?checkout_status=cancelled_boost`,
      });

      return NextResponse.json({ url: session.url });
    }

    if (!tier || !['pro', 'gold'].includes(tier)) {
      return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 });
    }

    const isHost = profile.role === 'host';
    let amount = 0;
    let planName = '';
    let planDescription = '';

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

      planName = 'Assinatura do Local - Cadastro de Salas';
      amount = 39900; // R$ 399,00 / mês
      planDescription = 'Assinatura de salas no Relaxe & Goze (Locais de Atendimento).';
    } else {
      // Provedora (garota)
      // Verificar rank de provedora por data de criação
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
      amount = isPromoEligible ? Math.round(baseAmount * 0.7) : baseAmount;
      planName = tier === 'pro' ? 'Plano Pro (Silver)' : 'Plano Gold Premium';
      planDescription = `Assinatura de visibilidade e recursos ${tier.toUpperCase()} no Relaxe & Goze.`;
    }

    const origin = req.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: planName,
              description: planDescription,
            },
            unit_amount: amount,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      subscription_data: {
        metadata: {
          userId: user.id,
          tier: tier,
        }
      },
      metadata: {
        userId: user.id,
        tier: tier,
      },
      success_url: `${origin}/dashboard?checkout_status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/planos?checkout_status=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Checkout error:', err);
    return NextResponse.json({ error: err.message || 'Erro ao criar sessão de pagamento.' }, { status: 500 });
  }
}
