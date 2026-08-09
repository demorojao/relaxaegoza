import { getSupabaseServiceClient } from '@/lib/supabaseServer';
import { revalidatePath, revalidateTag } from 'next/cache';
import { slugify, getStateFromCity } from '@/lib/slugify';

function serverRevalidate(city?: string, neighborhood?: string, profileId?: string) {
  try {
    revalidatePath('/');
    if (city) {
      const citySlug = slugify(city);
      const stateSlug = getStateFromCity(city);
      revalidatePath(`/${stateSlug}/${citySlug}`);
      if (neighborhood) {
        const neighborhoodSlug = slugify(neighborhood);
        revalidatePath(`/${stateSlug}/${citySlug}/${neighborhoodSlug}`);
      }
    }
    if (profileId) {
      (revalidateTag as any)(`profile-${profileId}`);
    }
  } catch (err) {
    console.error('Server revalidation error:', err);
  }
}

/**
 * Processa a entrega/ativação de um pagamento confirmado (Assinaturas Pro/Gold ou Boosts)
 * @param paymentRecordOrTxid UUID do registro na tabela 'payments' OU objeto da linha de 'payments'
 */
export async function fulfillPayment(paymentRecordOrTxid: string | any): Promise<boolean> {
  const supabaseService = getSupabaseServiceClient();

  let payment: any = null;

  if (typeof paymentRecordOrTxid === 'string') {
    // Buscar o registro pelo txid ou id
    const { data: byId } = await supabaseService
      .from('payments')
      .select('*')
      .eq('id', paymentRecordOrTxid)
      .maybeSingle();

    if (byId) {
      payment = byId;
    } else {
      const { data: byTxId } = await supabaseService
        .from('payments')
        .select('*')
        .eq('txid', paymentRecordOrTxid)
        .maybeSingle();
      payment = byTxId;
    }
  } else {
    payment = paymentRecordOrTxid;
  }

  if (!payment) {
    console.error('fulfillPayment: Pagamento não encontrado:', paymentRecordOrTxid);
    return false;
  }

  // Se já foi pago/cumprido, evitar duplicidades
  if (payment.status === 'paid' || payment.status === 'completed') {
    return true;
  }

  // 1. Atualizar o status da transação na tabela 'payments' para 'paid'
  const { error: updateError } = await supabaseService
    .from('payments')
    .update({ status: 'paid' })
    .eq('id', payment.id);

  if (updateError) {
    console.error('Erro ao atualizar status do pagamento para paid:', updateError);
    return false;
  }

  // 2. Identificar o usuário de destino (caso de presente ou próprio perfil)
  const { user_id, tier, is_boost, is_gift, target_profile_id } = payment;
  const targetUserId = is_gift ? target_profile_id : user_id;

  if (!targetUserId) {
    console.log(`Pagamento ${payment.id} concluído sem perfil de destino.`);
    return true;
  }

  // 3. Buscar dados de localização para revalidação do cache
  const { data: targetProfile } = await supabaseService
    .from('profiles')
    .select('city, neighborhood, boost_expires_at')
    .eq('id', targetUserId)
    .single();

  // 4. Aplicar produto: Boost ou Assinatura
  if (is_boost) {
    let durationHours = 2;
    if (tier === 'boost_6h') durationHours = 6;
    else if (tier === 'boost_12h') durationHours = 12;
    else if (tier === 'boost_2h') durationHours = 2;
    else if (is_gift) durationHours = 6;

    const currentBoostExpires = targetProfile?.boost_expires_at
      ? new Date(targetProfile.boost_expires_at)
      : new Date();

    const baseDate = currentBoostExpires > new Date() ? currentBoostExpires : new Date();
    const newExpires = new Date(baseDate.getTime() + durationHours * 60 * 60 * 1000);

    await supabaseService
      .from('profiles')
      .update({ boost_expires_at: newExpires.toISOString() })
      .eq('id', targetUserId);

    console.log(`Boost ativado com sucesso para ${targetUserId}. Expira em: ${newExpires.toISOString()}`);
  } else if (tier === 'exclusive_subscription') {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    if (user_id && target_profile_id) {
      await supabaseService
        .from('premium_subscriptions')
        .upsert({
          client_id: user_id,
          provider_id: target_profile_id,
          status: 'active',
          price_cents: payment.amount_cents || 4990,
          expires_at: expiresAt.toISOString()
        }, { onConflict: 'client_id,provider_id' });

      await supabaseService
        .from('content_purchases')
        .insert({
          client_id: user_id,
          provider_id: target_profile_id,
          amount_cents: payment.amount_cents || 4990,
          net_amount_cents: Math.round((payment.amount_cents || 4990) * 0.9),
          purchase_type: 'subscription',
          status: 'completed',
          created_at: new Date().toISOString()
        });

      console.log(`Assinatura Clube Exclusivo ativada com sucesso: Cliente ${user_id} -> Profissional ${target_profile_id}`);
    }
  } else if (tier && ['pro', 'gold'].includes(tier)) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await supabaseService
      .from('profiles')
      .update({ 
        subscription_tier: tier,
        subscription_expires_at: expiresAt.toISOString()
      })
      .eq('id', targetUserId);

    console.log(`Plano ${tier.toUpperCase()} ativado com sucesso para ${targetUserId}. Expira em: ${expiresAt.toISOString()}`);
  }

  // 5. Revalidar cache das páginas envolvidas
  if (targetProfile) {
    Promise.resolve().then(() => {
      serverRevalidate(targetProfile.city, targetProfile.neighborhood, targetUserId);
    }).catch(err => console.error('Background revalidation error:', err));
  }

  return true;
}
