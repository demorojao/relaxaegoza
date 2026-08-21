import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 
  process.env.NEXT_PUBLIC_SUPABASE_URL || 
  process.env.SUPABASE_URL || 
  'https://ivlaeilkomqhqwerojny.supabase.co';

const supabaseAnonKey = 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2bGFlaWxrb21xaHF3ZXJvam55Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMTYxMzcsImV4cCI6MjA5NjY5MjEzN30.lgm3_aYPhsCD0jv0oD4sjNMfosCR7Zs1JZwt7A_zXt0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  }
});

