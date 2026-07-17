'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Zap, Clock, TrendingUp, Sparkles, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

const BOOST_PACKAGES = [
  { hours: 2, label: '2 horas', description: 'Impulso rápido para o horário de pico', icon: '⚡', price: 'R$ 15', highlight: false },
  { hours: 6, label: '6 horas', description: 'Meio dia no topo da vitrine', icon: '🔥', price: 'R$ 35', highlight: true },
  { hours: 12, label: '12 horas', description: 'Um dia inteiro em destaque', icon: '👑', price: 'R$ 60', highlight: false },
];

function TimeCountdown({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const calc = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Expirado'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    calc();
    const iv = setInterval(calc, 1000);
    return () => clearInterval(iv);
  }, [expiresAt]);
  return <span className="font-mono text-gold-primary font-bold">{timeLeft}</span>;
}

export default function BoostPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [boosting, setBoosting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, subscription_tier, boost_expires_at, last_free_boost_at')
        .eq('id', user.id).single();
      if (data) setProfile(data);
    }
    setLoading(false);
  };

  const handleBoost = async (hours: number) => {
    if (!profile) return;
    if ((profile.subscription_tier || 'free') === 'free') {
      setErrorMsg('Boost disponível apenas para planos Pro e Gold. Faça upgrade.');
      return;
    }
    setBoosting(true); setSuccessMsg(''); setErrorMsg('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isBoost: true, boostHours: hours })
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        setErrorMsg(data.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao iniciar o checkout do Boost.');
    } finally {
      setBoosting(false);
    }
  };

  const lastFreeBoost = profile?.last_free_boost_at;
  const isGold = (profile?.subscription_tier || 'free') === 'gold';
  const isFreeBoostAvailable = isGold && (!lastFreeBoost || new Date(lastFreeBoost).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000);

  const handleClaimFreeBoost = async () => {
    if (!profile || !isFreeBoostAvailable) return;
    setBoosting(true); setSuccessMsg(''); setErrorMsg('');
    try {
      const { data, error } = await supabase.rpc('claim_free_boost');
      if (error) {
        setErrorMsg(error.message);
      } else if (data?.success) {
        setSuccessMsg('Boost semanal gratuito de 6 horas ativado com sucesso!');
        // Atualizar perfil localmente com o novo boost
        setProfile((prev: any) => ({
          ...prev,
          boost_expires_at: data.boost_expires_at,
          last_free_boost_at: new Date().toISOString()
        }));
      } else if (data?.error) {
        setErrorMsg(data.error);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao ativar o Boost gratuito.');
    } finally {
      setBoosting(false);
    }
  };

  if (loading) return (
    <div className="w-full flex justify-center py-20">
      <div className="w-10 h-10 border-4 border-wine-primary/30 border-t-wine-primary rounded-full animate-spin" />
    </div>
  );

  const tier = profile?.subscription_tier || 'free';
  const isFree = tier === 'free';
  const isBoostActive = profile?.boost_expires_at && new Date(profile.boost_expires_at) > new Date();

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16 selection:bg-gold-primary selection:text-dark-bg">
      <div className="border-b border-dark-border/20 pb-5">
        <h1 className="text-2xl md:text-3xl font-light text-white tracking-tight flex items-center gap-2">
          <Zap className="w-7 h-7 text-gold-primary animate-pulse" />
          Impulsionar <span className="font-semibold text-gold-primary ml-1">Anúncio</span>
        </h1>
        <p className="text-xs md:text-sm text-gray-400 font-light mt-1.5">
          Suba para o topo da vitrine e seja vista antes das outras profissionais.
        </p>
      </div>

      {/* Status Boost */}
      <div className={`glass-effect rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isBoostActive ? 'border-gold-primary/40 bg-gold-primary/5' : 'border-dark-border/60'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isBoostActive ? 'bg-gold-primary/20' : 'bg-white/5'}`}>
            <TrendingUp className={`w-5 h-5 ${isBoostActive ? 'text-gold-primary' : 'text-gray-500'}`} />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-semibold block">Status do Boost</span>
            <span className={`text-sm font-bold mt-0.5 block ${isBoostActive ? 'text-gold-light' : 'text-gray-400'}`}>
              {isBoostActive ? '🔥 Boost Ativo' : 'Sem boost ativo'}
            </span>
          </div>
        </div>
        {isBoostActive && (
          <div className="bg-black/40 border border-gold-primary/20 px-4 py-3 rounded-xl text-center">
            <span className="text-[10px] text-gray-500 block uppercase">Expira em</span>
            <TimeCountdown expiresAt={profile.boost_expires_at} />
          </div>
        )}
      </div>

      {isGold && (
        <div className="bg-gold-primary/5 border border-gold-primary/20 rounded-2xl p-6 space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[9px] bg-gold-primary/20 text-gold-light border border-gold-primary/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Benefício Gold Premium
                </span>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Semanal e Não Acumulativo
                </span>
              </div>
              <h3 className="text-sm font-semibold text-white mt-1">Meu Boost Semanal Grátis (6 Horas)</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-light">
                Você tem direito a <strong>1 Boost de 6 horas gratuito por semana</strong> para subir ao topo. Ele expira ao final de 7 dias se não for utilizado e não acumula.
              </p>
            </div>
            
            <button
              onClick={handleClaimFreeBoost}
              disabled={boosting || !isFreeBoostAvailable}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                isFreeBoostAvailable
                  ? 'bg-gold-primary text-dark-bg hover:bg-gold-light shadow-[0_4px_12px_rgba(197,168,128,0.2)]'
                  : 'bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed font-medium'
              }`}
            >
              {boosting ? 'Ativando...' : isFreeBoostAvailable ? 'Ativar Boost Grátis' : 'Já Utilizado'}
            </button>
          </div>

          {!isFreeBoostAvailable && lastFreeBoost && (
            <div className="text-[10px] text-gray-500 flex items-center gap-1.5 pt-1 border-t border-white/5">
              <Clock className="w-3.5 h-3.5 text-gray-600" />
              <span>
                Último resgate em: <strong>{new Date(lastFreeBoost).toLocaleString('pt-BR')}</strong>. 
                Próxima ativação disponível a partir de: <strong>{new Date(new Date(lastFreeBoost).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleString('pt-BR')}</strong>.
              </span>
            </div>
          )}
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
        </div>
      )}

      {/* Pacotes */}
      <div>
        <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-gold-primary" /> Escolha a Duração do Boost
        </h3>
        {isFree && (
          <div className="bg-wine-primary/10 border border-wine-primary/30 rounded-xl px-4 py-3 text-xs text-wine-light mb-5 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Boost disponível apenas para planos <strong>Pro</strong> e <strong>Gold Premium</strong>. <a href="/planos" className="underline text-gold-light">Ver planos →</a></span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {BOOST_PACKAGES.map((pkg) => (
            <div key={pkg.hours} className={`relative glass-effect rounded-2xl border p-5 flex flex-col items-center text-center gap-3 transition-all ${pkg.highlight ? 'border-gold-primary/50 shadow-[0_0_20px_rgba(197,168,128,0.08)]' : 'border-dark-border/60'}`}>
              {pkg.highlight && (
                <span className="absolute -top-3 bg-gold-primary text-dark-bg text-[9px] font-bold uppercase px-3 py-0.5 rounded-full tracking-wider">Mais Popular</span>
              )}
              <span className="text-3xl">{pkg.icon}</span>
              <div>
                <h4 className="text-sm font-bold text-white">{pkg.label}</h4>
                <p className="text-[10px] text-gray-500 mt-0.5 font-light">{pkg.description}</p>
              </div>
              <span className="text-[11px] bg-gold-primary/10 text-gold-light border border-gold-primary/30 px-3 py-1 rounded-full font-bold">{pkg.price}</span>
              <button
                onClick={() => handleBoost(pkg.hours)}
                disabled={boosting || isFree}
                className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 ${pkg.highlight ? 'bg-gold-primary hover:bg-gold-light text-dark-bg' : 'bg-white/10 hover:bg-white/20 text-white'}`}
              >
                {boosting ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processando...</> : <><Zap className="w-3.5 h-3.5" /> Adquirir {pkg.label}</>}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Como funciona */}
      <div className="bg-gradient-to-br from-gold-primary/5 to-transparent border border-gold-primary/15 rounded-2xl p-5 space-y-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-gold-primary" /> Como funciona o Boost?
        </h4>
        <ul className="space-y-2 text-[11px] text-gray-400 font-light leading-relaxed">
          <li className="flex items-start gap-2"><span className="text-gold-primary mt-0.5">→</span> Seu anúncio sobe para o topo durante toda a duração contratada.</li>
          <li className="flex items-start gap-2"><span className="text-gold-primary mt-0.5">→</span> Se você já possui um boost ativo, a nova duração é somada ao tempo restante.</li>
          <li className="flex items-start gap-2"><span className="text-gold-primary mt-0.5">→</span> Anúncios Gold Premium sempre têm prioridade sobre anúncios Pro na listagem.</li>
          <li className="flex items-start gap-2"><span className="text-gold-primary mt-0.5">→</span> <strong>Sistema de Leilão:</strong> A última profissional a realizar o pagamento do Boost fica no topo de sua região.</li>
          <li className="flex items-start gap-2"><span className="text-gold-primary mt-0.5">→</span> <strong>Destaque por Avaliações:</strong> Os pontos de avaliação dos clientes (nota média das avaliações) são utilizados como critério de classificação e desempate. Profissionais com melhores avaliações ganham prioridade no ranking da vitrine e na página de anúncios dentro do seu respectivo nível de destaque atual.</li>
        </ul>
      </div>
    </div>
  );
}
