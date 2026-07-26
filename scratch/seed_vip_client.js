import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      if (key && val) {
        process.env[key] = val;
      }
    }
  });
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('Seeding VIP Client Account & Exclusive Content...');

  // 1. Find or create a provider profile with subscription_price_cents
  let { data: provider } = await supabase
    .from('profiles')
    .select('id, name, subscription_price_cents')
    .eq('role', 'provider')
    .limit(1)
    .single();

  if (!provider) {
    console.error('No provider profile found in database!');
    process.exit(1);
  }

  console.log(`Using Provider: ${provider.name} (ID: ${provider.id})`);

  // Ensure provider has subscription price set (e.g. R$ 49,90 = 4990 cents)
  await supabase
    .from('profiles')
    .update({ subscription_price_cents: 4990 })
    .eq('id', provider.id);

  // 2. Create or get test client user in Supabase Auth
  const email = 'cliente.vip@test.com';
  const password = 'Password123!';

  let clientUserId = '';

  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const foundUser = existingUsers?.users?.find(u => u.email === email);

  if (foundUser) {
    clientUserId = foundUser.id;
    console.log(`Test client user already exists with ID: ${clientUserId}`);
    // Reset password to guarantee Password123!
    await supabase.auth.admin.updateUserById(clientUserId, { password });
  } else {
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: 'Cliente VIP (Assinante)' }
    });

    if (createErr || !newUser.user) {
      console.error('Error creating client user:', createErr);
      process.exit(1);
    }
    clientUserId = newUser.user.id;
    console.log(`Created new test client user with ID: ${clientUserId}`);
  }

  // 3. Ensure profile record for client user
  await supabase
    .from('profiles')
    .upsert({
      id: clientUserId,
      email,
      name: 'Cliente VIP (Assinante)',
      role: 'client',
      verification_status: 'verified'
    });

  // 4. Create active subscription record in premium_subscriptions and content_purchases
  const oneMonthFromNow = new Date();
  oneMonthFromNow.setDate(oneMonthFromNow.getDate() + 30);

  // Insert/Upsert premium_subscriptions
  const { error: subErr } = await supabase
    .from('premium_subscriptions')
    .upsert({
      client_id: clientUserId,
      provider_id: provider.id,
      status: 'active',
      price_cents: 4990,
      expires_at: oneMonthFromNow.toISOString()
    }, { onConflict: 'client_id,provider_id' });

  if (subErr) {
    console.warn('premium_subscriptions upsert notice:', subErr.message);
  }

  // Insert content_purchases record for payout tracking
  await supabase
    .from('content_purchases')
    .insert({
      client_id: clientUserId,
      provider_id: provider.id,
      amount_cents: 4990,
      net_amount_cents: 4491,
      purchase_type: 'subscription',
      status: 'paid',
      created_at: new Date().toISOString()
    });

  // 5. Ensure sample premium_media items exist for this provider
  const sampleMedia = [
    {
      profile_id: provider.id,
      title: 'Ensaio Exclusivo VIP - Edição Sensual 01',
      description: 'Sessão fotográfica privada em altíssima definição para assinantes.',
      media_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80',
      preview_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=50',
      media_type: 'photo',
      is_active: true
    },
    {
      profile_id: provider.id,
      title: 'Making Of Exclusivo nos Bastidores (Vídeo HD)',
      description: 'Vídeo dos bastidores e momentos de descontração.',
      media_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=80',
      preview_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=50',
      media_type: 'photo',
      is_active: true
    },
    {
      profile_id: provider.id,
      title: 'Galeria Especial de Verão (4K)',
      description: 'Coleção completa desbloqueada para membros do clube VIP.',
      media_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80',
      preview_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=50',
      media_type: 'photo',
      is_active: true
    }
  ];

  const { data: existingMedia } = await supabase
    .from('premium_media')
    .select('id')
    .eq('profile_id', provider.id);

  if (!existingMedia || existingMedia.length === 0) {
    const { error: mediaErr } = await supabase
      .from('premium_media')
      .insert(sampleMedia);
    if (mediaErr) console.warn('Error inserting sample media:', mediaErr.message);
    else console.log('Sample exclusive media inserted successfully!');
  }

  console.log('\n========================================');
  console.log('✅ DEMO CLIENT USER CREATED & SUBSCRIBED!');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Subscribed Provider: ${provider.name} (${provider.id})`);
  console.log(`Expires At: ${oneMonthFromNow.toLocaleDateString('pt-BR')}`);
  console.log('========================================\n');
}

main().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
