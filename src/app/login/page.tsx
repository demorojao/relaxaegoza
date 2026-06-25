'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Sparkles, Mail, Lock, ChevronRight, AlertCircle } from 'lucide-react';
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
  const [role, setRole] = useState<'client' | 'provider'>('client');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema)
  });

  // Limpar sessão antiga ao carregar a página para evitar race conditions no submit
  useEffect(() => {
    supabase.auth.signOut().catch((err) => console.error('Erro ao deslogar no carregamento:', err));
  }, []);

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

        // Validação de segurança: garantir que o papel real corresponda à seleção da interface
        if (profile.role !== role) {
          // Deslogar sessão criada para não deixar o usuário logado de forma inconsistente
          await supabase.auth.signOut();
          throw new Error(`Esta conta está cadastrada como ${
            profile.role === 'provider' ? 'Profissional' : 'Cliente'
          }. Por favor, selecione a aba correta acima para entrar.`);
        }

        // Redireciona de acordo com o papel real no banco
        if (profile.role === 'provider') {
          router.push('/dashboard');
        } else {
          router.push('/client-dashboard');
        }
      }
    } catch (err: any) {
      let friendlyMessage = err.message;
      if (err.message === 'Invalid login credentials') {
        friendlyMessage = 'E-mail ou senha incorretos. Por favor, verifique suas credenciais.';
      } else if (err.message === 'Email not confirmed') {
        friendlyMessage = 'Por favor, confirme seu e-mail de cadastro para continuar.';
      } else if (err.message === 'User not found') {
        friendlyMessage = 'Usuário não encontrado. Verifique seu e-mail.';
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
          variant={role === 'provider' ? 'glass-wine' : 'glass-gold'}
          className="relative shadow-2xl overflow-visible border-none"
        >
          {/* Neon Top Line based on Selected Role */}
          <div className={`absolute top-0 left-6 right-6 h-[2px] transition-colors duration-500 rounded-full ${
            role === 'provider' ? 'bg-wine-primary shadow-[0_0_10px_rgba(155,44,44,0.8)]' : 'bg-gold-primary shadow-[0_0_10px_rgba(197,168,128,0.8)]'
          }`} />

          <CardContent className="p-6 md:p-8">
            {/* Toggle Role Selector */}
            <div className="grid grid-cols-2 gap-2 bg-black/40 p-1.5 rounded-xl border border-white/5 mb-8">
              <button
                type="button"
                onClick={() => setRole('client')}
                className={`py-2 text-xs font-semibold rounded-lg tracking-wide transition-all cursor-pointer ${
                  role === 'client' 
                    ? 'bg-gold-primary text-dark-bg font-bold shadow' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Sou Cliente
              </button>
              <button
                type="button"
                onClick={() => setRole('provider')}
                className={`py-2 text-xs font-semibold rounded-lg tracking-wide transition-all cursor-pointer ${
                  role === 'provider' 
                    ? 'bg-wine-primary text-white font-bold shadow' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Sou Profissional
              </button>
            </div>

            <h2 className="text-xl font-semibold text-white tracking-wide mb-6">
              Entrar como {role === 'client' ? 'Cliente' : 'Profissional'}
            </h2>

            {errorMessage && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-200 text-xs p-3.5 rounded-xl mb-6">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

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
                  <a href="#" className="text-[10px] text-gray-500 hover:text-white transition-colors">Esqueceu a senha?</a>
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
            </form>

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
