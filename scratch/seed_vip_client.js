import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      if (key && val) process.env[key] = val;
    }
  });
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function main() {
  console.log('Connecting to Supabase:', supabaseUrl);

  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, name, role');

  if (profErr) {
    console.error('Error fetching profiles:', profErr);
    return;
  }

  console.log(`Found ${profiles?.length || 0} profiles in database.`);
  if (profiles && profiles.length > 0) {
    console.log('Sample profiles:', profiles.slice(0, 3));
  }

  let provider = profiles?.find(p => p.role === 'provider' || p.role === 'host' || p.role === 'anunciante');
  if (!provider && profiles && profiles.length > 0) {
    provider = profiles[0];
  }

  if (!provider) {
    console.error('No profiles found in database to attach subscription to!');
    return;
  }

  console.log(`Target provider: ${provider.name} (${provider.id})`);

  // 1. Ensure client user
  const email = 'cliente.vip@test.com';
  const password = 'Password123!';
  let clientUserId = '';

  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const foundUser = existingUsers?.users?.find(u => u.email === email);

  if (foundUser) {
    clientUserId = foundUser.id;
    console.log(`Updating password for existing test user: ${clientUserId}`);
    await supabase.auth.admin.updateUserById(clientUserId, { password });
  } else {
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: 'Cliente VIP (Assinante)' }
    });
    if (createErr || !newUser.user) {
      console.error('Error creating auth user:', createErr);
      return;
    }
    clientUserId = newUser.user.id;
    console.log(`Created new auth user: ${clientUserId}`);
  }

  // 2. Upsert client profile
  const { error: profileUpsertErr } = await supabase
    .from('profiles')
    .upsert({
      id: clientUserId,
      email,
      name: 'Cliente VIP (Assinante)',
      role: 'client',
      verification_status: 'verified'
    });

  if (profileUpsertErr) {
    console.error('Profile upsert error:', profileUpsertErr);
  }

  // 3. Upsert active subscription
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const { error: subErr } = await supabase
    .from('premium_subscriptions')
    .upsert({
      client_id: clientUserId,
      provider_id: provider.id,
      status: 'active',
      price_cents: 4990,
      expires_at: expiresAt.toISOString()
    }, { onConflict: 'client_id,provider_id' });

  if (subErr) {
    console.error('Subscription error:', subErr.message);
  } else {
    console.log(`✅ Subscription created: Client (${clientUserId}) -> Provider ${provider.name} (${provider.id})`);
  }

  // 4. Ensure premium media for provider
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
    }
  ];

  const { error: mediaErr } = await supabase
    .from('premium_media')
    .insert(sampleMedia);

  if (mediaErr) {
    console.log('Media insert note (may already exist):', mediaErr.message);
  } else {
    console.log('✅ Premium media inserted for provider');
  }
}

main().catch(console.error);
