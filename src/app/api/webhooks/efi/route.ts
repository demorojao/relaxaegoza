import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabaseServer';
import { revalidatePath, revalidateTag } from 'next/cache';
import { slugify, getStateFromCity } from '@/lib/slugify';

// Função utilitária para invalidação direta de cache no servidor
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
      revalidateTag(`profile-${profileId}`, { expire: 0 });
    }
  } catch (err) {
    console.error('Server revalidation error:', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Validar handshake inicial ou requisições de teste da Efí
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      // Corpo vazio ou inválido (comum em testes simples de ping/handshake da Efí)
      return new Response('OK', { status: 200 });
    }

    const pixList = body.pix;

    // Se não for uma confirmação de pagamento Pix ativa, responde 200 OK
    if (!pixList || !Array.isArray(pixList) || pixList.length === 0) {
      return new Response('OK', { status: 200 });
    }

    const supabaseService = getSupabaseServiceClient();

    // 2. Processar a lista de pagamentos Pix recebidos
    for (const pix of pixList) {
      const { txid } = pix;

      if (!txid) continue;

      // Buscar a intenção de pagamento correspondente na tabela payments
      const { data: payment, error: fetchError } = await supabaseService
        .from('payments')
        .select('*')
        .eq('txid', txid)
        .single();

      if (fetchError || !payment) {
        console.warn(`Payment with txid ${txid} not found.`);
        continue;
      }

      // Se já foi processado anteriormente, pula para evitar duplicados
      if (payment.status === 'paid') {
        continue;
      }

      // 3. Atualizar o status do pagamento para 'paid'
      const { error: updatePaymentError } = await supabaseService
        .from('payments')
        .update({ status: 'paid' })
        .eq('txid', txid);

      if (updatePaymentError) {
        console.error(`Error updating payment ${txid}:`, updatePaymentError);
        continue;
      }

      // 4. Aplicar o produto comprado (Boost ou Assinatura)
      const { user_id, tier, is_boost, is_gift, target_profile_id } = payment;
      const targetUserId = is_gift ? target_profile_id : user_id;

      if (!targetUserId) continue;

      // Buscar dados de localização da profissional para revalidação de cache posterior
      const { data: profile } = await supabaseService
        .from('profiles')
        .select('city, neighborhood')
        .eq('id', targetUserId)
        .single();

      if (is_boost) {
        let durationHours = 2;
        if (tier === 'boost_6h') durationHours = 6;
        else if (tier === 'boost_12h') durationHours = 12;
        else if (tier === 'boost_2h') durationHours = 2;
        else if (is_gift) durationHours = 6;

        const { data: currentProfile } = await supabaseService
          .from('profiles')
          .select('boost_expires_at')
          .eq('id', targetUserId)
          .single();

        const currentBoostExpires = currentProfile?.boost_expires_at
          ? new Date(currentProfile.boost_expires_at)
          : new Date();

        const baseDate = currentBoostExpires > new Date() ? currentBoostExpires : new Date();
        const newExpires = new Date(baseDate.getTime() + durationHours * 60 * 60 * 1000);

        await supabaseService
          .from('profiles')
          .update({ boost_expires_at: newExpires.toISOString() })
          .eq('id', targetUserId);
      } else if (tier && ['pro', 'gold'].includes(tier)) {
        await supabaseService
          .from('profiles')
          .update({ subscription_tier: tier })
          .eq('id', targetUserId);
      }

      // 5. Acionar revalidação de cache em segundo plano
      if (profile) {
        // Envolve em Promise assíncrona para retornar o 200 OK sem atrasos (MED prevention timeout)
        Promise.resolve().then(() => {
          serverRevalidate(profile.city, profile.neighborhood, targetUserId);
        }).catch(err => console.error('Background revalidation error:', err));
      }
    }

    return new Response('OK', { status: 200 });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    // Sempre responder 200 para a Efí não reenviar o mesmo webhook em loop
    return new Response('OK', { status: 200 });
  }
}
