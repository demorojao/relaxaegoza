import { createClient } from '@supabase/supabase-js';

const isServer = typeof window === 'undefined';

// No servidor, usamos as variáveis de ambiente normais (não expostas). 
// No cliente, passamos pelo proxy local /api/supabase-proxy para ocultar as credenciais.
const supabaseUrl = isServer
  ? (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '')
  : (typeof window !== 'undefined' ? `${window.location.origin}/api/supabase-proxy` : '');

const supabaseAnonKey = isServer
  ? (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
  : 'dummy-anon-key-to-be-replaced-on-server';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
