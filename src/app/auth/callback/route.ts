import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient, getSupabaseServerClient } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const roleParam = searchParams.get('role') as 'client' | 'provider' | 'host' | null;
  const next = searchParams.get('next') ?? '/client-dashboard';

  if (!code) {
    console.warn('OAuth Callback: Nenhum código de autorização fornecido.');
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  try {
    const supabase = getSupabaseServerClient();
    const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code);

    if (authError || !authData.user) {
      console.error('OAuth Callback: Erro ao trocar código por sessão:', authError);
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }

    const user = authData.user;
    const supabaseService = getSupabaseServiceClient();

    // 1. Verificar se o perfil já existe no banco de dados
    let { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle();

    let userRole = profile?.role;

    // 2. Se não existir perfil (Primeiro login com Google), criar automaticamente
    if (!profile) {
      const selectedRole = roleParam || user.user_metadata?.role || 'client';
      const userMeta = user.user_metadata || {};
      const userName = userMeta.full_name || userMeta.name || user.email?.split('@')[0] || 'Usuário Google';
      const userAvatar = userMeta.avatar_url || userMeta.picture || null;

      const { data: newProfile, error: insertError } = await supabaseService
        .from('profiles')
        .insert({
          id: user.id,
          name: userName,
          role: selectedRole,
          age: 18,
          city: 'São Paulo',
          price_per_hour: 0,
          avatar_url: userAvatar,
          whatsapp: '',
          neighborhood: '',
          subscription_tier: 'free',
          verification_status: 'none',
          created_at: new Date().toISOString()
        })
        .select('role')
        .single();

      if (insertError) {
        console.error('OAuth Callback: Erro ao criar perfil do usuário Google:', insertError);
      } else if (newProfile) {
        userRole = newProfile.role;
      }
    }

    // 3. Redirecionar conforme a role real do usuário e gravar os cookies de sessão no navegador
    let targetPath = '/client-dashboard';
    if (userRole === 'admin') {
      targetPath = '/acesso-restrito-portal-aura';
    } else if (userRole === 'provider' || userRole === 'host') {
      targetPath = '/dashboard';
    } else if (next && next.startsWith('/')) {
      targetPath = next;
    }

    const response = NextResponse.redirect(`${origin}${targetPath}`);

    // Gravar o cookie nativo do Supabase no navegador para o cliente ficar logado instantaneamente
    if (authData.session) {
      const projectRef = 'ivlaeilkomqhqwerojny';
      const cookieName = `sb-${projectRef}-auth-token`;
      const cookieValue = JSON.stringify([
        authData.session.access_token,
        authData.session.refresh_token,
        null,
        null,
        null
      ]);
      
      response.cookies.set(cookieName, cookieValue, {
        path: '/',
        maxAge: authData.session.expires_in || 604800,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    return response;
  } catch (err) {
    console.error('OAuth Callback: Erro inesperado:', err);
    return NextResponse.redirect(`${origin}/login?error=unexpected`);
  }
}
