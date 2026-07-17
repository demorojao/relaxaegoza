'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Sparkles, Mail, Lock, User, Phone, MapPin, DollarSign, Calendar, ChevronRight, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Logo from '@/components/Logo';

const clientSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  age: z.coerce.number().min(18, 'Você deve ter pelo menos 18 anos'),
  city: z.string().min(2, 'A cidade deve ter pelo menos 2 caracteres'),
});

const providerSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  name: z.string().min(2, 'O nome artístico deve ter pelo menos 2 caracteres'),
  age: z.coerce.number().min(18, 'Você deve ter pelo menos 18 anos'),
});

const hostSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  name: z.string().min(2, 'O nome do local ou proprietário deve ter pelo menos 2 caracteres'),
  age: z.coerce.number().min(18, 'Você deve ter pelo menos 18 anos'),
  city: z.string().min(2, 'A cidade deve ter pelo menos 2 caracteres'),
});

interface RegisterFormValues {
  email: string;
  password: string;
  name: string;
  age: number;
  city?: string;
  neighborhood?: string;
  pricePerHour?: number;
  whatsapp?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<'client' | 'provider' | 'host'>('client');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const activeSchema = role === 'provider' ? providerSchema : role === 'host' ? hostSchema : clientSchema;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<RegisterFormValues>({
    resolver: zodResolver(activeSchema) as any
  });

  // Reset do formulário ao alternar abas
  useEffect(() => {
    reset();
    setAcceptedTerms(false);
  }, [role, reset]);

  // Limpar qualquer sessão ativa anterior antes de cadastrar para evitar race conditions
  useEffect(() => {
    supabase.auth.signOut().catch((err) => console.error('Erro ao deslogar no carregamento do cadastro:', err));
  }, []);

  const onSubmit = async (values: any) => {
    if (!acceptedTerms) {
      setErrorMessage('Você deve aceitar os Termos de Uso e Consentimento de Imagem para prosseguir.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // 1. Criar usuário no Supabase Auth com metadados para que o trigger crie o perfil de forma segura
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: values.email.trim(),
        password: values.password,
        options: {
          data: {
            name: values.name,
            role,
            age: Number(values.age),
            city: role === 'provider' ? '' : values.city,
            neighborhood: '',
            whatsapp: '',
            price_per_hour: 0,
            latitude: null,
            longitude: null,
            category: role === 'provider' ? 'massage' : null,
            target_audience: []
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        setSuccessMessage('Cadastro realizado com sucesso! Redirecionando...');
        
        setTimeout(() => {
          if (role === 'provider' || role === 'host') {
            router.push('/dashboard');
          } else {
            router.push('/client-dashboard');
          }
        }, 1500);
      }
    } catch (err: any) {
      let friendlyMessage = err.message;
      if (err.message === 'User already registered') {
        friendlyMessage = 'Este e-mail já está cadastrado no portal. Tente fazer login.';
      } else if (err.message === 'Password should be at least 6 characters') {
        friendlyMessage = 'A senha deve conter pelo menos 6 caracteres.';
      }
      setErrorMessage(friendlyMessage || 'Ocorreu um erro ao realizar seu cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-dark-bg flex items-center justify-center p-4 py-16 relative overflow-hidden selection:bg-gold-primary selection:text-dark-bg">
      {/* Background Lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-wine-primary/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gold-primary/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <Logo />
          <p className="text-gray-500 text-xs uppercase tracking-widest">Criação de conta de segurança</p>
        </div>

        {/* Card */}
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
                onClick={() => setRole('client')}
                type="button"
                className={`py-2 text-[10px] sm:text-xs font-semibold rounded-lg tracking-wide transition-all cursor-pointer ${
                  role === 'client' 
                    ? 'bg-gold-primary text-dark-bg font-bold shadow' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Cliente
              </button>
              <button
                onClick={() => setRole('provider')}
                type="button"
                className={`py-2 text-[10px] sm:text-xs font-semibold rounded-lg tracking-wide transition-all cursor-pointer ${
                  role === 'provider' 
                    ? 'bg-wine-primary text-white font-bold shadow' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Anunciante
              </button>
            </div>

            <h2 className="text-xl font-semibold text-white tracking-wide mb-6">
              Cadastro de {role === 'client' ? 'Cliente' : role === 'provider' ? 'Anunciante' : 'Local de Atendimento'}
            </h2>

            {role === 'client' && (
              <div className="bg-gold-primary/10 border border-gold-primary/20 text-gold-light text-xs p-4 rounded-2xl mb-6 flex gap-3 items-start animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-gold-primary shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-white">Privacidade & Segurança</p>
                  <p className="text-gray-400 font-light leading-relaxed">
                    Você <span className="text-gold-primary font-medium">não precisa utilizar seu nome verdadeiro</span> para se cadastrar (pode utilizar um apelido/pseudônimo). No entanto, para a segurança das acompanhantes e massagistas, é de <span className="text-gold-primary font-medium">suma importância verificar seus dados</span> posteriormente no seu painel de controle.
                  </p>
                </div>
              </div>
            )}

            {role === 'provider' && (
              <div className="bg-wine-primary/15 border border-wine-primary/30 text-wine-light text-xs p-4 rounded-2xl mb-6 flex gap-3 items-start animate-fadeIn">
                <Sparkles className="w-5 h-5 text-gold-primary shrink-0 mt-0.5 animate-pulse" />
                <div className="space-y-1">
                  <p className="font-semibold text-white">Portal de Alto Padrão & Luxo</p>
                  <p className="text-gray-400 font-light leading-relaxed">
                    O Relaxe & Goze é uma vitrine exclusiva para acompanhantes de luxo e massoterapeutas de elite. Para preservar o padrão premium do portal, <span className="text-gold-primary font-medium">exigimos o valor mínimo de R$ 300,00 por hora</span> em todos os anúncios publicados.
                  </p>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-200 text-xs p-3.5 rounded-xl mb-6">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs p-3.5 rounded-xl mb-6 animate-pulse">
                <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              
              {/* Informações de Login Comuns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="seu@email.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                  themeVariant={role === 'provider' ? 'wine' : 'gold'}
                  error={errors.email?.message}
                  {...register('email')}
                />

                <Input
                  label="Senha"
                  type="password"
                  placeholder="Crie uma senha forte"
                  leftIcon={<Lock className="w-4 h-4" />}
                  themeVariant={role === 'provider' ? 'wine' : 'gold'}
                  error={errors.password?.message}
                  {...register('password')}
                />
              </div>

              {/* Informações de Perfil */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label={role === 'client' ? 'Nome Completo / Apelido' : 'Nome Artístico'}
                  type="text"
                  placeholder={role === 'client' ? 'Seu Nome' : 'Ex: Helena Souza'}
                  leftIcon={<User className="w-4 h-4" />}
                  themeVariant={role === 'provider' ? 'wine' : 'gold'}
                  error={errors.name?.message}
                  {...register('name')}
                />

                <Input
                  label="Idade (Mínimo 18)"
                  type="number"
                  placeholder="Ex: 24"
                  leftIcon={<Calendar className="w-4 h-4" />}
                  themeVariant={role === 'provider' ? 'wine' : 'gold'}
                  error={errors.age?.message}
                  {...register('age')}
                />
              </div>

              {(role === 'client' || role === 'host') && (
                <Input
                  label="Cidade"
                  type="text"
                  placeholder="Ex: São Paulo"
                  leftIcon={<MapPin className="w-4 h-4" />}
                  themeVariant={role === 'host' ? 'wine' : 'gold'}
                  error={errors.city?.message}
                  {...register('city')}
                />
              )}

              {/* Checkbox Termos de Uso */}
              <div className="flex items-start gap-3 mt-4 mb-2 select-none">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="rounded border-white/20 text-gold-primary focus:ring-0 focus:ring-offset-0 bg-black/40 accent-gold-primary w-5 h-5 cursor-pointer mt-0.5"
                  required
                />
                <label htmlFor="acceptTerms" className="text-[11px] text-gray-400 leading-relaxed cursor-pointer">
                  Declaro ter mais de 18 anos de idade e que li e concordo plenamente com os{' '}
                  <a 
                    href="/termos-de-uso" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-gold-primary hover:underline font-semibold"
                  >
                    Termos de Uso e Termo de Consentimento de Imagem
                  </a>
                  .
                </label>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                isLoading={loading}
                variant={role === 'provider' ? 'wine' : 'gold'}
                className="w-full mt-2"
              >
                Criar minha Conta Segura
                <ChevronRight className="w-4 h-4" />
              </Button>
            </form>

            {/* Footer Card */}
            <div className="mt-8 text-center text-xs text-gray-400 border-t border-white/5 pt-5">
              Já possui uma conta?{' '}
              <Link 
                href="/login" 
                className={`font-semibold hover:underline ${
                  role === 'provider' ? 'text-wine-light' : role === 'host' ? 'text-emerald-400' : 'text-gold-primary'
                }`}
              >
                Fazer Login
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Voltar link */}
        <div className="text-center mt-6">
          <Link href="/" className="text-xs text-gray-500 hover:text-white transition-colors">
            ← Voltar para a Vitrine Principal
          </Link>
        </div>
      </div>
    </main>
  );
}
