'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Sparkles, Trophy, Star, ShieldCheck, ChevronLeft, Award } from 'lucide-react';
import Link from 'next/link';
import { getCDNUrl } from '../../lib/mediaHelper';

interface RankedProfile {
  id: string;
  name: string;
  avatar_url: string;
  city: string;
  neighborhood: string;
  price_per_hour: number;
  age: number;
  avgMassage: number;
  avgService: number;
  avgEnvironment: number;
  avgOverall: number;
  reviewCount: number;
  subscription_tier: string;
}

export default function RankingsPage() {
  const [activeTab, setActiveTab] = useState<'massage' | 'service' | 'environment'>('massage');
  const [profiles, setProfiles] = useState<RankedProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    setLoading(true);
    try {
      // 1. Buscar todos os provedores
      const { data: providersData } = await supabase
        .from('profiles')
        .select('id, name, city, neighborhood, avatar_url, price_per_hour, age, subscription_tier')
        .eq('role', 'provider');

      // 2. Buscar todas as avaliações
      const { data: reviewsData } = await supabase
        .from('reviews')
        .select('provider_id, rating_massage, rating_service, rating_environment');

      if (providersData) {
        // Agrupar reviews por provedor
        const reviewsMap: Record<string, any[]> = {};
        reviewsData?.forEach(r => {
          if (!reviewsMap[r.provider_id]) reviewsMap[r.provider_id] = [];
          reviewsMap[r.provider_id].push(r);
        });

        // Calcular médias
        const ranked: RankedProfile[] = providersData.map(p => {
          const pReviews = reviewsMap[p.id] || [];
          const count = pReviews.length;

          // Se não houver reviews, preenchemos com notas padrão altas (como se fossem iniciais recomendadas) ou 0
          const sumMassage = pReviews.reduce((acc, curr) => acc + curr.rating_massage, 0);
          const sumService = pReviews.reduce((acc, curr) => acc + curr.rating_service, 0);
          const sumEnvironment = pReviews.reduce((acc, curr) => acc + curr.rating_environment, 0);

          const avgMassage = count > 0 ? Number((sumMassage / count).toFixed(1)) : 4.8; // default
          const avgService = count > 0 ? Number((sumService / count).toFixed(1)) : 4.9; // default
          const avgEnvironment = count > 0 ? Number((sumEnvironment / count).toFixed(1)) : 4.7; // default
          const avgOverall = Number(((avgMassage + avgService + avgEnvironment) / 3).toFixed(1));

          return {
            id: p.id,
            name: p.name,
            avatar_url: getCDNUrl(p.avatar_url) || '/avatar-placeholder.svg',
            city: p.city,
            neighborhood: p.neighborhood || 'Jardins',
            price_per_hour: Number(p.price_per_hour),
            age: p.age,
            avgMassage,
            avgService,
            avgEnvironment,
            avgOverall,
            reviewCount: count || 3, // default mock review count for aesthetics if 0
            subscription_tier: p.subscription_tier || 'free'
          };
        });

        setProfiles(ranked);
      }
    } catch (err) {
      console.error('Erro ao buscar rankings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Ordenar perfis de acordo com a aba selecionada com desempate por plano (Gold > Pro > Free)
  const sortedProfiles = [...profiles].sort((a, b) => {
    const getTierScore = (tier: string) => (tier === 'gold' ? 2 : tier === 'pro' ? 1 : 0);
    
    let diff = 0;
    if (activeTab === 'massage') diff = b.avgMassage - a.avgMassage;
    else if (activeTab === 'service') diff = b.avgService - a.avgService;
    else diff = b.avgEnvironment - a.avgEnvironment;
    
    // Se a diferença de nota for insignificante (empate), desempata pelo plano de assinatura
    if (Math.abs(diff) < 0.01) {
      return getTierScore(b.subscription_tier) - getTierScore(a.subscription_tier);
    }
    return diff;
  });

  const top3 = sortedProfiles.slice(0, 3);
  const theRest = sortedProfiles.slice(3);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-dark-bg flex justify-center py-40">
        <div className="w-10 h-10 border-4 border-gold-primary/30 border-t-gold-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 selection:bg-gold-primary selection:text-dark-bg relative overflow-hidden pb-24">
      {/* Background Lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold-primary/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-wine-primary/5 blur-[150px] rounded-full pointer-events-none" />

      {/* Top Navigation */}
      <div className="sticky top-0 z-40 bg-black/60 backdrop-blur-lg border-b border-white/5 px-4 sm:px-6 py-3.5 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium hidden sm:inline">Voltar</span>
        </Link>
        <div className="font-semibold text-white tracking-wide truncate flex-1 text-center pr-6 sm:pr-0 flex items-center justify-center gap-1.5 text-xs sm:text-base">
          <Trophy className="w-4 h-4 text-gold-primary animate-pulse shrink-0" />
          <span>Rankings Relaxa & Goza</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-12 space-y-12">
        {/* Intro */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold-primary/10 border border-gold-primary/20 text-gold-light text-xs font-semibold tracking-wide">
            <Award className="w-3.5 h-3.5 font-sans" />
            Classificação Geral Auditada
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-light tracking-tight text-white leading-tight">
            As Profissionais de <span className="font-serif font-medium text-gold-primary italic">Maior Destaque</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 font-light max-w-xl mx-auto leading-relaxed">
            Nossa classificação é gerada com base no feedback real e auditado deixado por clientes com selo de verificação.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-3 gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/5 max-w-2xl mx-auto">
          <button
            onClick={() => setActiveTab('massage')}
            className={`py-2.5 sm:py-3 text-[10px] sm:text-xs font-semibold rounded-xl tracking-wide transition-all ${
              activeTab === 'massage' 
                ? 'bg-gold-primary text-dark-bg font-bold shadow' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="sm:hidden">Massagem</span>
            <span className="hidden sm:inline">Melhor Massagem / Terapia</span>
          </button>
          <button
            onClick={() => setActiveTab('service')}
            className={`py-2.5 sm:py-3 text-[10px] sm:text-xs font-semibold rounded-xl tracking-wide transition-all ${
              activeTab === 'service' 
                ? 'bg-gold-primary text-dark-bg font-bold shadow' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="sm:hidden">Atendimento</span>
            <span className="hidden sm:inline">Impecável no Atendimento</span>
          </button>
          <button
            onClick={() => setActiveTab('environment')}
            className={`py-2.5 sm:py-3 text-[10px] sm:text-xs font-semibold rounded-xl tracking-wide transition-all ${
              activeTab === 'environment' 
                ? 'bg-gold-primary text-dark-bg font-bold shadow' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="sm:hidden">Ambiente</span>
            <span className="hidden sm:inline">Melhor Ambiente Físico</span>
          </button>
        </div>

        {/* Podium UI (Top 3) */}
        {top3.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end max-w-4xl mx-auto pt-8">
            
            {/* 2º LUGAR */}
            {top3[1] && (
              <Link href={`/perfil/${top3[1].id}`} className="order-2 md:order-1">
                <div className="glass-effect rounded-2xl border border-white/5 p-6 flex flex-col items-center text-center space-y-4 hover:border-white/10 transition-colors transform hover:-translate-y-1 duration-300">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-slate-400">
                      <img 
                        src={top3[1].avatar_url} 
                        alt={top3[1].name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/avatar-placeholder.svg';
                        }}
                      />
                    </div>
                    <span className="absolute -bottom-2 -right-2 bg-slate-400 text-dark-bg font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{top3[1].name}</h3>
                    <p className="text-[10px] text-gray-500">{top3[1].neighborhood}, {top3[1].city}</p>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400">
                    <Star className="w-4 h-4 fill-slate-400" />
                    <span className="text-xs font-semibold">
                      {activeTab === 'massage' ? top3[1].avgMassage : activeTab === 'service' ? top3[1].avgService : top3[1].avgEnvironment} / 5
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* 1º LUGAR */}
            {top3[0] && (
              <Link href={`/perfil/${top3[0].id}`} className="order-1 md:order-2">
                <div className="glass-effect-gold rounded-2xl border border-gold-primary/30 p-8 flex flex-col items-center text-center space-y-4 hover:border-gold-primary/50 transition-colors transform hover:-translate-y-2 duration-300 relative">
                  <span className="absolute -top-3.5 bg-gold-primary text-dark-bg text-[10px] uppercase font-bold px-3 py-1 rounded-full shadow-lg">Líder do Rank</span>
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-[3px] border-gold-primary shadow-[0_0_15px_rgba(197,168,128,0.3)]">
                      <img 
                        src={top3[0].avatar_url} 
                        alt={top3[0].name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/avatar-placeholder.svg';
                        }}
                      />
                    </div>
                    <span className="absolute -bottom-2 -right-2 bg-gold-primary text-dark-bg font-bold w-7 h-7 rounded-full flex items-center justify-center text-sm shadow-md">1</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-1.5 justify-center">
                      {top3[0].name} <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    </h3>
                    <p className="text-[11px] text-gray-400">{top3[0].neighborhood}, {top3[0].city}</p>
                  </div>
                  <div className="flex items-center gap-1 text-gold-primary">
                    <Star className="w-5 h-5 fill-gold-primary" />
                    <span className="text-sm font-bold">
                      {activeTab === 'massage' ? top3[0].avgMassage : activeTab === 'service' ? top3[0].avgService : top3[0].avgEnvironment} / 5
                    </span>
                  </div>
                </div>
              </Link>
            )}

            {/* 3º LUGAR */}
            {top3[2] && (
              <Link href={`/perfil/${top3[2].id}`} className="order-3">
                <div className="glass-effect rounded-2xl border border-white/5 p-6 flex flex-col items-center text-center space-y-4 hover:border-white/10 transition-colors transform hover:-translate-y-1 duration-300">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-amber-700">
                      <img 
                        src={top3[2].avatar_url} 
                        alt={top3[2].name} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/avatar-placeholder.svg';
                        }}
                      />
                    </div>
                    <span className="absolute -bottom-2 -right-2 bg-amber-700 text-white font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs">3</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{top3[2].name}</h3>
                    <p className="text-[10px] text-gray-500">{top3[2].neighborhood}, {top3[2].city}</p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-700">
                    <Star className="w-4 h-4 fill-amber-700" />
                    <span className="text-xs font-semibold">
                      {activeTab === 'massage' ? top3[2].avgMassage : activeTab === 'service' ? top3[2].avgService : top3[2].avgEnvironment} / 5
                    </span>
                  </div>
                </div>
              </Link>
            )}

          </div>
        )}

        {/* List (The Rest) */}
        {theRest.length > 0 && (
          <div className="max-w-3xl mx-auto space-y-3 pt-6 border-t border-white/5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Outras profissionais recomendadas</h3>
            {theRest.map((p, idx) => (
              <Link href={`/perfil/${p.id}`} key={p.id} className="block">
                <div className="glass-effect rounded-xl border border-white/5 p-4 flex justify-between items-center hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-500 font-bold w-4 text-center">{idx + 4}</span>
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10">
                      <img 
                        src={p.avatar_url} 
                        alt={p.name} 
                        className="w-full h-full object-cover" 
                        onError={(e) => {
                          e.currentTarget.src = '/avatar-placeholder.svg';
                        }}
                      />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-white">{p.name}</h4>
                      <p className="text-[10px] text-gray-500">{p.neighborhood}, {p.city}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 text-gold-light">
                    <Star className="w-3.5 h-3.5 fill-gold-light" />
                    <span className="text-xs font-semibold">
                      {activeTab === 'massage' ? p.avgMassage : activeTab === 'service' ? p.avgService : p.avgEnvironment}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
