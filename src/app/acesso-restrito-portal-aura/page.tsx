'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, Lock, KeyRound, Mail, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';

export default function AdminRestrictedLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!email || !password || !pin) {
      setErrorMessage('Por favor, preencha o E-mail, a Senha e o PIN de Segurança.');
      setLoading(false);
      return;
    }

    try {
      // 1. Tentar autenticação via Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('Falha na autenticação do usuário.');
      }

      // 2. Confirmar que o usuário possui perfil com role === 'admin'
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile || profile.role !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Acesso negado: Esta conta não possui privilégios de Administrador.');
      }

      setSuccessMessage('Credenciais de Administrador validadas! Redirecionando...');

      // 3. Redirecionar para o painel de moderação
      setTimeout(() => {
        const adminSecret = process.env.NEXT_PUBLIC_ADMIN_ACCESS_SECRET || '';
        router.push(`/dashboard-interno-moderacao-aura?key=${adminSecret}`);
      }, 1000);

    } catch (err: any) {
      let friendlyMessage = err.message;
      if (err.message === 'Invalid login credentials') {
        friendlyMessage = 'E-mail ou senha incorretos.';
      }
      setErrorMessage(friendlyMessage || 'Erro ao realizar login administrativo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-dark-bg flex items-center justify-center p-4 relative overflow-hidden selection:bg-gold-primary selection:text-dark-bg">
      {/* Dynamic Background Lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-500/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gold-primary/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <Logo />
          <div className="flex items-center gap-1.5 mt-2 bg-red-500/10 border border-red-500/25 px-3 py-1 rounded-full text-red-400 text-[10px] font-bold uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5" />
            Portal Restrito Master Admin
          </div>
        </div>

        {/* Secret Login Card */}
        <Card variant="glass-gold" className="relative shadow-2xl overflow-visible border-gold-primary/30">
          <div className="absolute top-0 left-6 right-6 h-[2px] bg-gold-primary shadow-[0_0_10px_rgba(197,168,128,0.8)] rounded-full" />

          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-white tracking-wide">Acesso Administrativo</h2>
              <p className="text-xs text-gray-400 font-light">
                Digite suas credenciais de super-administrador e o PIN de segurança.
              </p>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-200 text-xs p-3.5 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs p-3.5 rounded-xl">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <Input
                label="E-mail Administrativo"
                type="email"
                placeholder="admin@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                themeVariant="gold"
                required
              />

              {/* Senha */}
              <Input
                label="Senha de Acesso"
                type="password"
                placeholder="Sua senha secreta"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                themeVariant="gold"
                required
              />

              {/* PIN de Segurança Admin */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-gold-light font-bold uppercase tracking-wider block">
                  PIN de Segurança Admin (4 dígitos)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gold-primary absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="****"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    required
                    className="w-full bg-black/60 border border-gold-primary/30 text-white text-sm pl-10 pr-4 py-3 rounded-xl focus:border-gold-primary focus:outline-none tracking-widest font-mono transition-colors"
                  />
                </div>
              </div>

              {/* Botão de Entrar */}
              <Button
                type="submit"
                isLoading={loading}
                variant="gold"
                className="w-full mt-4 py-3 text-xs font-bold uppercase tracking-wider"
              >
                Autenticar & Entrar no Painel
                <ChevronRight className="w-4 h-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
