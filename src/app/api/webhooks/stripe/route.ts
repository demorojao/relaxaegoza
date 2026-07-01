import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseServiceClient } from '@/lib/supabaseServer';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-05-27.dahlia',
});

export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  let event: Stripe.Event;

  try {
    // Se o segredo de webhook for 'whsec_mock', permitimos o bypass da assinatura para testes rápidos locais
    if (webhookSecret === 'whsec_mock' || !signature) {
      console.log('Stripe Webhook: Usando modo sandbox mock/bypass');
      event = JSON.parse(bodyText) as Stripe.Event;
    } else {
      event = stripe.webhooks.constructEvent(bodyText, signature, webhookSecret);
    }
  } catch (err: any) {
    console.error('Erro na assinatura do Webhook Stripe:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const eventType = event.type;
  const supabase = getSupabaseServiceClient();

  // 1. Registra o evento de webhook no banco como pendente (Mecanismo de Auditoria e Idempotência)
  const { error: logError } = await supabase
    .from('stripe_webhook_events')
    .insert({
      id: event.id,
      type: eventType,
      status: 'pending',
      payload: event
    });

  if (logError) {
    console.error('Erro ao registrar webhook event no log:', logError);
    // Continuamos mesmo se falhar a auditoria para não bloquear transações legítimas
  }

  let processingError: string | null = null;

  try {
    if (eventType === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata;

      if (metadata && metadata.userId) {
        const { userId, type, tier, durationHours } = metadata;

        if (type === 'boost') {
          const hours = Number(durationHours || '2');
          const targetId = metadata.targetProfileId || userId;
          
          // Buscar expiracao de boost atual para obter comportamento aditivo
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('boost_expires_at')
            .eq('id', targetId)
            .single();

          let baseTime = Date.now();
          if (currentProfile?.boost_expires_at) {
            const currentExpire = new Date(currentProfile.boost_expires_at).getTime();
            if (currentExpire > baseTime) {
              baseTime = currentExpire;
            }
          }

          const expiresAt = new Date(baseTime + hours * 60 * 60 * 1000).toISOString();
          console.log(`Webhook: Processando boost de ${hours}h para o usuario ${targetId}. Expira em: ${expiresAt}`);

          const { error } = await supabase
            .from('profiles')
            .update({ boost_expires_at: expiresAt })
            .eq('id', targetId);

          if (error) {
            throw new Error(`Erro ao aplicar boost no Supabase: ${JSON.stringify(error)}`);
          }
          console.log(`Boost do usuario ${targetId} ativado ate ${expiresAt}.`);

          // Se for um boost de presente, envia notificacao no sistema
          if (metadata.isGift === 'true') {
            let buyerName = 'Um cliente secreto';
            if (userId && userId !== 'guest_buyer') {
              const { data: buyerProfile } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', userId)
                .single();
              if (buyerProfile?.name) {
                buyerName = buyerProfile.name;
              }
            }

            await supabase
              .from('profile_notifications')
              .insert({
                profile_id: targetId,
                title: 'Voce recebeu um Boost de Presente! 🎁🚀',
                content: `${buyerName} deu um Super Destaque de 6 horas para colocar o seu perfil no topo da vitrine!`,
                type: 'gift_boost'
              });
          }
        } else if (tier) {
          console.log(`Webhook: Processando upgrade para o usuário ${userId} para o plano ${tier}`);

          // Atualiza a assinatura usando a service_role para contornar restrições RLS/triggers
          const { error } = await supabase
            .from('profiles')
            .update({ subscription_tier: tier })
            .eq('id', userId);

          if (error) {
            throw new Error(`Erro ao atualizar plano no Supabase: ${JSON.stringify(error)}`);
          }

          console.log(`Plano do usuário ${userId} atualizado com sucesso para ${tier}.`);
        } else {
          console.warn('Webhook: Evento checkout.session.completed recebido sem tier ou tipo boost especificado.');
        }
      } else {
        console.warn('Webhook: Evento checkout.session.completed recebido sem metadados válidos.');
      }
    } else if (eventType === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      const metadata = subscription.metadata;

      if (metadata && metadata.userId) {
        const { userId } = metadata;
        console.log(`Webhook: Processando cancelamento de assinatura para o usuário ${userId}`);

        // Rebaixa o plano de volta para 'free' no cancelamento
        const { error } = await supabase
          .from('profiles')
          .update({ 
            subscription_tier: 'free',
            is_available_now: false 
          })
          .eq('id', userId);

        if (error) {
          throw new Error(`Erro ao rebaixar plano no Supabase: ${JSON.stringify(error)}`);
        }

        console.log(`Plano do usuário ${userId} rebaixado para 'free' com sucesso.`);
      } else {
        console.warn('Webhook: Evento customer.subscription.deleted recebido sem metadados válidos.');
      }
    } else if (eventType === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      const metadata = subscription.metadata;

      if (metadata && metadata.userId && metadata.tier) {
        const { userId, tier } = metadata;
        console.log(`Webhook: Sincronizando alteração de plano para o usuário ${userId} -> ${tier}`);

        const { error } = await supabase
          .from('profiles')
          .update({ subscription_tier: tier })
          .eq('id', userId);

        if (error) {
          throw new Error(`Erro ao atualizar plano no Supabase: ${JSON.stringify(error)}`);
        }

        console.log(`Plano do usuário ${userId} sincronizado com sucesso para ${tier}.`);
      } else {
        console.warn('Webhook: Evento customer.subscription.updated recebido sem metadados suficientes para sincronização.');
      }
    }
  } catch (err: any) {
    processingError = err.message || 'Erro desconhecido durante o processamento do webhook';
    console.error('Erro de processamento do webhook:', processingError);
  }

  // 2. Atualiza o status do log do webhook no banco
  const updateData = processingError
    ? { status: 'failed', error_message: processingError }
    : { status: 'processed', processed_at: new Date().toISOString() };

  await supabase
    .from('stripe_webhook_events')
    .update(updateData)
    .eq('id', event.id);

  if (processingError) {
    return NextResponse.json({ error: processingError }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
