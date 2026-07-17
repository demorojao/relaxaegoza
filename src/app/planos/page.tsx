'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Shield, Star, Award, Sparkles, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function PricingPage() {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [providerCount, setProviderCount] = useState<number>(0);
  const [loadingCount, setLoadingCount] = useState(true);

  React.useEffect(() => {
    async function fetchProviderCount() {
      try {
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'provider');
        if (!error && count !== null) {
          setProviderCount(count);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCount(false);
      }
    }
    fetchProviderCount();
  }, []);

  const handleCheckout = async (tier: 'pro' | 'gold') => {
    setLoadingTier(tier);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        window.location.href = `/login?redirectTo=/planos&tier=${tier}`;
        return;
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ tier })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao iniciar checkout.');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout inválida.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro de conexão com o Stripe.');
    } finally {
      setLoadingTier(null);
    }
  };

  const showDiscount = !loadingCount && providerCount < 100;
  const proPrice = showDiscount ? 'R$ 209,30' : 'R$ 299,00';
  const goldPrice = showDiscount ? 'R$ 315,00' : 'R$ 450,00';

  const plans = [
    {
      name: 'Basic (Bronze)',
      price: 'Grátis',
      tierKey: 'free',
      description: 'Ideal para iniciar na plataforma e experimentar a interface.',
      features: [
        'Até 3 fotos no perfil',
        'Exibição na busca padrão',
        'Contato via WhatsApp',
        'Perfil padrão (sem customização)',
        'Suporte por e-mail'
      ],
      highlight: false,
      buttonText: 'Cadastrar Anúncio Grátis',
      accentColor: 'border-gray-800 bg-dark-card hover:border-gray-700',
      badge: null
    },
    {
      name: 'Pro (Silver)',
      price: proPrice,
      tierKey: 'pro',
      period: '/mês',
      description: 'Perfeito para profissionais estabelecidos que buscam destaque comercial.',
      features: [
        'Até 10 fotos de alta resolução',
        'Selo de Perfil Verificado (por selfie)',
        'Prioridade média nas buscas do bairro',
        'Sem anúncios externos no seu perfil',
        'Suporte prioritário via WhatsApp',
        'Filtro exclusivo de comodidades'
      ],
      highlight: false,
      buttonText: 'Contratar Plano Pro',
      accentColor: 'border-wine-primary/45 bg-wine-primary/[0.02] shadow-[0_15px_40px_-15px_rgba(155,44,44,0.15)] hover:border-wine-primary/70',
      badge: showDiscount ? '30% DE DESCONTO ATIVO' : 'Recomendado para Destaque'
    },
    {
      name: 'Gold Premium',
      price: goldPrice,
      tierKey: 'gold',
      period: '/mês',
      description: 'O nível máximo de visibilidade, segurança e retenção de clientes do portal.',
      features: [
        '1 Boost de 6h grátis por semana (Não Acumulativo) 🚀',
        'Galeria de Fotos Ilimitada & Exclusividade de Vídeos',
        'Exclusividade de Vídeo nos Stories Efêmeros 🎥',
        'Prioridade máxima nas buscas da cidade',
        'Botão "Disponível Agora" ativo (Borda Neon)',
        'Selo de Espaço Validado via Vídeo (Online)',
        'Estatísticas avançadas de tráfego (Cliques / Views)',
        'Selo de Destaque Premium no mapa interativo',
        'Atendimento e assessoria de marketing dedicados'
      ],
      highlight: true,
      buttonText: 'Obter Visibilidade Máxima',
      accentColor: 'border-gold-primary/60 bg-gold-primary/[0.02] shadow-[0_15px_40px_-15px_rgba(197,168,128,0.2)]',
      badge: showDiscount ? '30% DE DESCONTO ATIVO' : 'Retorno Máximo Garantido'
    }
  ];

  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 py-16 px-4 md:px-8 relative overflow-hidden flex flex-col justify-between selection:bg-gold-primary selection:text-dark-bg">
      {/* Decorative background light */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gold-primary/5 blur-[140px] pointer-events-none" />

      {/* Top Header */}
      <div className="max-w-7xl mx-auto w-full mb-12">
        <Link href="/" className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar para a Home
        </Link>
      </div>

      <div className="max-w-5xl mx-auto w-full text-center mb-12 relative z-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-primary/10 border border-gold-primary/20 text-gold-light text-xs font-semibold tracking-wide mb-4">
          <Award className="w-3.5 h-3.5" />
          Planos de Visibilidade Relaxe & Goze
        </div>
        <h1 className="text-3xl md:text-5xl font-light tracking-tight text-white mb-4">
          Multiplique seus <span className="font-serif font-medium text-gold-primary italic">Contatos e Agendamentos</span>
        </h1>
        <p className="text-sm md:text-base text-gray-400 font-light max-w-xl mx-auto leading-relaxed">
          Escolha o nível ideal de presença digital para o seu anúncio no portal. Destaque-se na geolocalização e transmita total segurança com selos de verificação.
        </p>
      </div>

      {/* Promo Banner */}
      {showDiscount && (
        <div className="max-w-4xl mx-auto w-full mb-12 bg-gradient-to-r from-gold-primary/10 via-gold-primary/[0.03] to-transparent border border-gold-primary/20 rounded-2xl p-4.5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn relative z-10 text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gold-primary/10 rounded-xl text-gold-primary shrink-0 animate-pulse">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold block text-white text-sm">Desconto de Lançamento Ativo!</span>
              <p className="text-xs text-gray-400 font-light mt-0.5 leading-relaxed">
                As 100 primeiras anunciantes ganham **30% de desconto automático** na assinatura de qualquer plano. ({providerCount}/100 vagas ocupadas)
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-gold-primary bg-gold-primary/10 border border-gold-primary/20 px-3 py-1 rounded-full uppercase tracking-wider shrink-0">
            30% OFF aplicado
          </span>
        </div>
      )}

      {/* Grid containing plans */}
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch relative z-10 mb-16">
        {plans.map((plan) => {
          return (
            <div 
              key={plan.name}
              className={`glass-effect rounded-3xl p-6 md:p-8 flex flex-col justify-between border transition-all duration-300 ${plan.accentColor}`}
            >
              <div>
                {/* Header card info */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    {plan.badge && (
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full block w-fit mb-3 ${
                        plan.highlight 
                          ? 'bg-gold-primary text-dark-bg shadow-lg shadow-gold-primary/10' 
                          : 'bg-wine-primary/20 text-wine-light border border-wine-primary/30'
                      }`}>
                        {plan.badge}
                      </span>
                    )}
                    <h3 className="text-lg font-semibold text-white tracking-wide">{plan.name}</h3>
                  </div>
                  {plan.highlight && <Sparkles className="w-5 h-5 text-gold-primary animate-pulse" />}
                </div>

                <p className="text-xs text-gray-400 font-light mb-6 min-h-[32px] leading-relaxed">
                  {plan.description}
                </p>

                {/* Price */}
                <div className="flex items-baseline mb-8">
                  <span className="text-3xl md:text-4xl font-semibold tracking-tight text-white">{plan.price}</span>
                  {plan.period && <span className="text-sm text-gray-400 font-light ml-1">{plan.period}</span>}
                </div>

                {/* Features divider */}
                <div className="border-t border-dark-border/40 pt-6 mb-8">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-4">Incluso neste plano</div>
                  <ul className="space-y-3.5">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2.5 text-xs text-gray-300 font-light leading-relaxed">
                        <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          plan.tierKey === 'gold' 
                            ? 'text-gold-primary' 
                            : plan.tierKey === 'pro'
                              ? 'text-wine-light'
                              : 'text-emerald-400'
                        }`} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              {plan.tierKey === 'free' ? (
                <Link href="/cadastro" className="w-full">
                  <button className="w-full py-3.5 rounded-xl text-xs font-semibold tracking-wide bg-dark-bg/60 border border-gray-800 text-gray-300 hover:border-gray-500 hover:text-white transition-all duration-300 cursor-pointer">
                    {plan.buttonText}
                  </button>
                </Link>
              ) : (
                <button
                  onClick={() => handleCheckout(plan.tierKey as 'pro' | 'gold')}
                  disabled={loadingTier !== null}
                  className={`w-full py-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${
                    plan.tierKey === 'gold'
                      ? 'bg-gold-primary text-dark-bg hover:bg-gold-light hover:shadow-[0_8px_24px_rgba(197,168,128,0.3)] font-bold' 
                      : plan.tierKey === 'pro'
                        ? 'bg-wine-primary text-white hover:bg-wine-light hover:shadow-[0_8px_24px_rgba(155,44,44,0.3)] font-bold border border-wine-light/20'
                        : 'bg-dark-bg/60 border border-dark-border text-gray-300 hover:border-gray-600 hover:text-white'
                  } disabled:opacity-50`}
                >
                  {loadingTier === plan.tierKey ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    plan.buttonText
                  )}
                </button>
              )}

            </div>
          );
        })}
      </div>

      {/* Suporte Financeiro (Prevenção de MED) */}
      <div className="max-w-xl mx-auto w-full mb-10 bg-dark-card/40 border border-dark-border/40 rounded-2xl p-5 text-center relative z-10">
        <p className="text-xs text-gray-400 font-light mb-3">
          Dificuldades no pagamento ou precisa de liberação imediata? Fale diretamente com o nosso <strong>Departamento Financeiro</strong>.
        </p>
        <a 
          href={`https://wa.me/${process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '5500000000000'}?text=${encodeURIComponent('Olá! Preciso de suporte com o pagamento / liberação de plano no portal.')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-xs font-semibold text-gold-primary hover:text-gold-light transition-colors cursor-pointer"
        >
          Falar com o Suporte Financeiro via WhatsApp &rarr;
        </a>
      </div>

      {/* Footer warning */}
      <div className="max-w-3xl mx-auto w-full text-center relative z-10 text-[11px] text-gray-500 font-light leading-relaxed">
        <Shield className="w-5 h-5 text-gray-600 mx-auto mb-2" />
        Todas as transações são processadas de forma segura e discreta em nosso CNPJ de Publicidade e Tecnologia.
      </div>
      
    </div>
  );
}
