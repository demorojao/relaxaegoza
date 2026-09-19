'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Sparkles, Mail, Lock, ChevronRight, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Logo from '@/components/Logo';

const loginSchema = z.object({
  email: z.string().email('Insira um e-mail válido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres')
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'client' | 'provider' | 'host'>('client');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Password Recovery States
  const [view, setView] = useState<'login' | 'forgot' | 'reset'>('login');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema)
  });  // Limpar sessão antiga ao carregar a página (com bypass se for redefinição de senha)
  // Verificar se o usuário já possui sessão ativa ou se foi redirecionado com código de OAuth
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profile?.role === 'admin') {
          router.replace('/acesso-restrito-portal-aura');
        } else if (profile?.role === 'provider' || profile?.role === 'host') {
          router.replace('/dashboard');
        } else {
          router.replace('/client-dashboard');
        }
      }
    }

    const search = window.location.search;
    const hash = window.location.hash;

    const isRecovery = search.includes('type=recovery') || hash.includes('type=recovery');

    // Se o usuário for redirecionado do Google Auth com um código (?code=...)
    const code = new URLSearchParams(search).get('code');
    if (code && !isRecovery) {
      const roleParam = new URLSearchParams(search).get('role') || 'client';
      router.push(`/auth/callback?code=${code}&role=${roleParam}`);
      return;
    }

    if (!isRecovery && !search.includes('registered=true') && !search.includes('error=')) {
      checkSession();
    }

    if (search.includes('registered=true')) {
      setSuccessMessage('Conta criada com sucesso! ✉️ Enviamos um e-mail de ativação. Por favor, acesse sua caixa de entrada (e pasta de spam) para ativar sua conta.');
    }

    if (search.includes('error=auth_failed')) {
      setErrorMessage('Erro ao realizar login com o Google. Por favor, tente novamente.');
    }

    if (isRecovery) {
      setView('reset');
    }
  }, [router]);

  // Ouvinte para capturar o evento de recuperação do Supabase Auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('reset');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail) {
      setErrorMessage('Por favor, informe seu e-mail.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    // Timeout de 15 segundos para evitar travamento infinito caso o servidor SMTP do Supabase não responda
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT_SMTP')), 15000)
    );

    try {
      const resetPromise = supabase.auth.resetPasswordForEmail(recoveryEmail.trim(), {
        redirectTo: `${window.location.origin}/login?type=recovery`,
      });

      const { error } = (await Promise.race([resetPromise, timeoutPromise])) as any;
      if (error) throw error;
      setSuccessMessage('E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.');
      setRecoveryEmail('');
    } catch (err: any) {
      let friendlyMessage = err.message || '';
      if (err.message === 'TIMEOUT_SMTP') {
        friendlyMessage = 'O servidor de e-mail demorou para responder. Verifique se as configurações de SMTP no Supabase estão corretas ou se o e-mail cadastrado existe.';
      } else if (err.message === 'Error sending recovery email' || err.message?.includes('sending recovery email')) {
        friendlyMessage = 'Falha ao enviar e-mail de recuperação. Verifique as configurações de SMTP no painel do Supabase.';
      } else if (friendlyMessage.includes('pattern') || friendlyMessage.includes('Unexpected')) {
        friendlyMessage = 'Erro na comunicação. Por favor, tente novamente em alguns instantes.';
      }
      setErrorMessage(friendlyMessage || 'Erro ao enviar e-mail de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setErrorMessage('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      setSuccessMessage('Senha redefinida com sucesso! Redirecionando para o login...');
      setTimeout(() => {
        setView('login');
        setSuccessMessage('');
        setNewPassword('');
        setConfirmPassword('');
      }, 3000);
    } catch (err: any) {
      let msg = err.message || '';
      if (msg.includes('pattern') || msg.includes('Unexpected') || msg.includes('fetch')) {
        msg = 'Sua sessão de redefinição expirou ou o link é inválido. Por favor, solicite um novo link de recuperação.';
      }
      setErrorMessage(msg || 'Erro ao redefinir a senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?role=${role}`,
          data: {
            role: role,
          },
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) throw error;
    } catch (err: any) {
      console.error('Erro ao autenticar com Google:', err);
      setErrorMessage(err.message || 'Erro ao conectar com o Google. Tente novamente.');
      setLoading(false);
    }
  };

  const onSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email.trim(),
        password: values.password,
      });

      if (error) throw error;

      if (data.user) {
        // Verificar o perfil e o role no banco de dados
        let { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        // Autocorreção (Self-healing): se a linha do perfil não existe (PGRST116), criamos usando os metadados do auth
        if (profileError && (profileError as any).code === 'PGRST116') {
          console.log('Login: Perfil não encontrado. Executando autocriação...');
          const userMeta = data.user.user_metadata || {};
          const { data: insertedProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              name: userMeta.name || 'Usuário',
              role: userMeta.role || role,
              age: Number(userMeta.age) || 18,
              city: userMeta.city || 'São Paulo',
              price_per_hour: Number(userMeta.price_per_hour) || 0,
              whatsapp: userMeta.whatsapp || '',
              neighborhood: userMeta.neighborhood || '',
              subscription_tier: 'free'
            })
            .select('role')
            .single();

          if (insertError) {
            console.error('Falha ao auto-criar perfil de segurança:', insertError);
            throw new Error('Perfil não encontrado no banco de dados e erro ao auto-criar.');
          }

          profile = insertedProfile;
          profileError = null;
        } else if (profileError || !profile) {
          throw new Error('Perfil não encontrado no banco de dados.');
        }

        // SE FOR ADMIN: Redireciona diretamente para a porta restrita de administração
        if (profile.role === 'admin') {
          router.push('/acesso-restrito-portal-aura');
          return;
        }

        // Validação de segurança: garantir que o papel real corresponda à seleção da interface
        if (profile.role !== role) {
          // Deslogar sessão criada para não deixar o usuário logado de forma inconsistente
          await supabase.auth.signOut();
          const roleLabel = profile.role === 'provider' ? 'Profissional' : profile.role === 'host' ? 'Dono de Sala' : 'Cliente';
          throw new Error(`Esta conta está cadastrada como ${roleLabel}. Por favor, selecione a aba correta acima para entrar.`);
        }

        // Redireciona de acordo com o papel real no banco
        if (profile.role === 'provider' || profile.role === 'host') {
          router.push('/dashboard');
        } else {
          router.push('/client-dashboard');
        }
      }
    } catch (err: any) {
      let friendlyMessage = err.message || '';
      if (err.message === 'Invalid login credentials') {
        friendlyMessage = 'E-mail ou senha incorretos. Por favor, verifique suas credenciais.';
      } else if (err.message === 'Email not confirmed' || err.message?.includes('not confirmed')) {
        friendlyMessage = 'E-mail ainda não confirmado. ✉️ Por favor, acesse sua caixa de entrada (e pasta de spam) e clique no link de ativação enviado pelo Supabase.';
      } else if (err.message === 'User not found') {
        friendlyMessage = 'Usuário não encontrado. Verifique seu e-mail.';
      } else if (friendlyMessage.includes('pattern') || friendlyMessage.includes('Unexpected')) {
        friendlyMessage = 'Falha na comunicação com o servidor de autenticação. Por favor, tente novamente.';
      }
      setErrorMessage(friendlyMessage || 'Erro ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-dark-bg flex items-center justify-center p-4 relative overflow-hidden selection:bg-gold-primary selection:text-dark-bg">
      {/* Background Lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-wine-primary/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gold-primary/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Logo Header */}
        <div className="flex flex-col items-center mb-8">
          <Logo />
          <p className="text-gray-500 text-xs uppercase tracking-widest">Acesso de segurança</p>
        </div>

        {/* Login Card */}
        <Card 
          variant={role === 'provider' ? 'glass-wine' : role === 'host' ? 'glass-gold' : 'glass-gold'}
          className="relative shadow-2xl overflow-visible border-none"
        >
          {/* Neon Top Line based on Selected Role */}
          <div className={`absolute top-0 left-6 right-6 h-[2px] transition-colors duration-500 rounded-full ${
            role === 'provider' ? 'bg-wine-primary shadow-[0_0_10px_rgba(155,44,44,0.8)]' : role === 'host' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-gold-primary shadow-[0_0_10px_rgba(197,168,128,0.8)]'
          }`} />

          <CardContent className="p-6 md:p-8">
            {/* Toggle Role Selector */}
            {view === 'login' && (
              <div className="grid grid-cols-3 gap-1.5 bg-black/40 p-1.5 rounded-xl border border-white/5 mb-8">
                <button
                  type="button"
                  onClick={() => setRole('client')}
                  className={`py-2 text-[10px] sm:text-xs font-semibold rounded-lg tracking-wide transition-all cursor-pointer ${
                    role === 'client' 
                      ? 'bg-gold-primary text-dark-bg font-bold shadow' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Cliente
                </button>
                <button
                  type="button"
                  onClick={() => setRole('provider')}
                  className={`py-2 text-[10px] sm:text-xs font-semibold rounded-lg tracking-wide transition-all cursor-pointer ${
                    role === 'provider' 
                      ? 'bg-wine-primary text-white font-bold shadow' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Profissional
                </button>
                <button
                  type="button"
                  onClick={() => setRole('host')}
                  className={`py-2 text-[10px] sm:text-xs font-semibold rounded-lg tracking-wide transition-all cursor-pointer ${
                    role === 'host' 
                      ? 'bg-emerald-500 text-dark-bg font-bold shadow' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Dono de Sala
                </button>
              </div>
            )}

            <h2 className="text-xl font-semibold text-white tracking-wide mb-6">
              {view === 'login' && `Entrar como ${role === 'client' ? 'Cliente' : role === 'provider' ? 'Profissional' : 'Dono de Sala'}`}
              {view === 'forgot' && 'Recuperar Senha'}
              {view === 'reset' && 'Nova Senha'}
            </h2>

            {errorMessage && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-200 text-xs p-3.5 rounded-xl mb-6">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-start gap-2.5 bg-green-500/10 border border-green-500/20 text-green-200 text-xs p-3.5 rounded-xl mb-6">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {view === 'login' && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Email */}
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="seu@email.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                  themeVariant={role === 'provider' ? 'wine' : 'gold'}
                  error={errors.email?.message}
                  {...register('email')}
                />

                {/* Senha */}
                <div className="relative">
                  <div className="absolute right-1 -top-6">
                    <button
                      type="button"
                      onClick={() => { setView('forgot'); setErrorMessage(''); setSuccessMessage(''); }}
                      className="text-[10px] text-gray-500 hover:text-white transition-colors cursor-pointer bg-transparent border-none"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <Input
                    label="Senha"
                    type="password"
                    placeholder="Sua senha secreta"
                    leftIcon={<Lock className="w-4 h-4" />}
                    themeVariant={role === 'provider' ? 'wine' : 'gold'}
                    error={errors.password?.message}
                    {...register('password')}
                  />
                </div>

                {/* Botão Ação */}
                <Button
                  type="submit"
                  isLoading={loading}
                  variant={role === 'provider' ? 'wine' : 'gold'}
                  className="w-full mt-2"
                >
                  Entrar no Portal
                  <ChevronRight className="w-4 h-4" />
                </Button>

                {/* Divisor "ou continue com" */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[#121214] px-3 text-gray-500 text-[10px]">ou continue com</span>
                  </div>
                </div>

                {/* Botão Google Auth com separação visual por perfil */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className={`w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border text-white text-xs font-semibold flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm hover:scale-[1.01] ${
                    role === 'provider' 
                      ? 'border-wine-primary/40 hover:border-wine-primary/80' 
                      : role === 'host' 
                        ? 'border-emerald-500/40 hover:border-emerald-500/80' 
                        : 'border-gold-primary/40 hover:border-gold-primary/80'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.8-.9-1.3-2.1-1.3-3.4z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                    />
                  </svg>
                  <span>
                    Entrar como <strong className={role === 'provider' ? 'text-wine-light' : role === 'host' ? 'text-emerald-400' : 'text-gold-primary'}>
                      {role === 'client' ? 'Cliente' : role === 'provider' ? 'Profissional' : 'Dono de Sala'}
                    </strong> com o Google
                  </span>
                </button>
              </form>
            )}

            {view === 'forgot' && (
              <div className="space-y-5">
                <p className="text-xs text-gray-400 font-light leading-relaxed">
                  Digite seu e-mail de cadastro. Enviaremos um link seguro para você redefinir sua senha.
                </p>

                <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
                  <Input
                    label="E-mail"
                    type="email"
                    placeholder="seu@email.com"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    leftIcon={<Mail className="w-4 h-4" />}
                    themeVariant={role === 'provider' ? 'wine' : 'gold'}
                    required
                  />

                  <Button
                    type="submit"
                    isLoading={loading}
                    variant={role === 'provider' ? 'wine' : 'gold'}
                    className="w-full mt-2"
                  >
                    Enviar Link de Recuperação
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </form>

                <button
                  type="button"
                  onClick={() => { setView('login'); setErrorMessage(''); setSuccessMessage(''); }}
                  className="flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors mt-4 mx-auto cursor-pointer bg-transparent border-none"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar para o Login
                </button>
              </div>
            )}

            {view === 'reset' && (
              <div className="space-y-5">
                <p className="text-xs text-gray-400 font-light leading-relaxed">
                  Escolha uma nova senha segura para acessar sua conta.
                </p>

                <form onSubmit={handleResetPasswordSubmit} className="space-y-5">
                  <Input
                    label="Nova Senha"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                    themeVariant={role === 'provider' ? 'wine' : 'gold'}
                    required
                  />

                  <Input
                    label="Confirmar Nova Senha"
                    type="password"
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    leftIcon={<Lock className="w-4 h-4" />}
                    themeVariant={role === 'provider' ? 'wine' : 'gold'}
                    required
                  />

                  <Button
                    type="submit"
                    isLoading={loading}
                    variant={role === 'provider' ? 'wine' : 'gold'}
                    className="w-full mt-2"
                  >
                    Salvar Nova Senha
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </form>

                <button
                  type="button"
                  onClick={() => { setView('login'); setErrorMessage(''); setSuccessMessage(''); }}
                  className="flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors mt-4 mx-auto cursor-pointer bg-transparent border-none"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Cancelar e ir para o Login
                </button>
              </div>
            )}

            {/* Footer Card */}
            <div className="mt-8 text-center text-xs text-gray-400 border-t border-white/5 pt-5">
              Não tem uma conta?{' '}
              <Link 
                href="/cadastro" 
                className={`font-semibold hover:underline ${
                  role === 'provider' ? 'text-wine-light' : 'text-gold-primary'
                }`}
              >
                Criar Conta Grátis
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Voltar para Home link */}
        <div className="text-center mt-6">
          <Link href="/" className="text-xs text-gray-500 hover:text-white transition-colors">
            ← Voltar para a Vitrine Principal
          </Link>
        </div>
      </div>
    </main>
  );
}
