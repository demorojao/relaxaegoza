'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    async function handleCallback() {
      try {
        const code = searchParams.get('code');
        const roleParam = searchParams.get('role') as 'client' | 'provider' | 'host' | null;

        // 1. Se houver um código de OAuth, efetuar a troca no cliente (salva no localStorage do navegador)
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.warn('Callback: Aviso na troca de código PKCE (pode ter sido processado automaticamente):', exchangeError);
          }
        }

        // 2. Obter a sessão ativa no cliente (getSession com fallback para getUser)
        const { data: { session } } = await supabase.auth.getSession();
        let user: any = session?.user ?? null;

        if (!user) {
          const { data: { user: fetchedUser } } = await supabase.auth.getUser();
          user = fetchedUser;
        }

        if (!user) {
          throw new Error('Sessão não encontrada após autenticação com o Google.');
        }

        const targetRole = roleParam || user.user_metadata?.role || 'client';

        // 3. Verificar se o perfil já existe no banco
        let { data: profile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', user.id)
          .maybeSingle();

        // 4. Se o perfil existir, porém o papel for diferente do selecionado na tela de login, sincronizar
        if (profile) {
          if (roleParam && profile.role !== roleParam) {
            console.log(`Callback: Atualizando papel do perfil de ${profile.role} para ${roleParam}`);
            const { data: updatedProf } = await supabase
              .from('profiles')
              .update({ role: roleParam })
              .eq('id', user.id)
              .select('id, role')
              .maybeSingle();
            if (updatedProf) {
              profile = updatedProf;
            }
          }
        } else {
          // 5. Se o perfil não existir (criação via Google), criar linha em profiles
          const userMeta = user.user_metadata || {};
          const userName = userMeta.full_name || userMeta.name || user.email?.split('@')[0] || 'Usuário Google';
          const userAvatar = userMeta.avatar_url || userMeta.picture || null;

          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              name: userName,
              role: targetRole,
              age: 18,
              city: 'São Paulo',
              price_per_hour: 0,
              avatar_url: userAvatar,
              whatsapp: '',
              neighborhood: '',
              subscription_tier: 'free',
              verification_status: 'none'
            })
            .select('id, role')
            .maybeSingle();

          if (insertError) {
            console.error('Callback: Erro ao criar perfil do usuário Google:', insertError);
          } else if (newProfile) {
            profile = newProfile;
          }
        }

        let userRole = profile?.role || targetRole;

        if (!isSubscribed) return;

        // 6. Redirecionar para o painel correspondente ao papel do usuário
        if (userRole === 'admin') {
          router.replace('/acesso-restrito-portal-aura');
        } else if (userRole === 'provider' || userRole === 'host') {
          router.replace('/dashboard');
        } else {
          router.replace('/client-dashboard');
        }
      } catch (err: any) {
        console.error('Erro no callback de autenticação:', err);
        if (isSubscribed) {
          setError(err.message || 'Erro ao concluir o login.');
          setTimeout(() => {
            router.replace('/login?error=auth_failed');
          }, 2000);
        }
      }
    }

    handleCallback();

    return () => {
      isSubscribed = false;
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen w-full bg-[#0a0a0c] flex flex-col items-center justify-center p-4 text-white">
      {error ? (
        <div className="text-center space-y-3">
          <p className="text-red-400 text-sm font-semibold">{error}</p>
          <p className="text-gray-400 text-xs">Redirecionando para a página de login...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-gold-primary animate-spin" />
          <p className="text-sm font-medium text-gray-300">Conectando sua conta Google...</p>
        </div>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full bg-[#0a0a0c] flex items-center justify-center p-4 text-white">
        <Loader2 className="w-8 h-8 text-gold-primary animate-spin" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
