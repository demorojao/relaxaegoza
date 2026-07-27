'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Target, TrendingUp, Sparkles, CheckCircle2, DollarSign, Award, Trophy } from 'lucide-react';

interface FinancialGoalsCalculatorProps {
  profile: any;
  onSave?: () => void;
}

export default function FinancialGoalsCalculator({ profile, onSave }: FinancialGoalsCalculatorProps) {
  const [goalAmount, setGoalAmount] = useState<string>(
    profile?.monthly_revenue_goal_cents ? (profile.monthly_revenue_goal_cents / 100).toString() : '5000'
  );
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalSaved, setGoalSaved] = useState(false);

  // Realized Earnings this month
  const [currentEarningsCents, setCurrentEarningsCents] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchMonthlyEarnings();
    }
  }, [profile?.id]);

  const fetchMonthlyEarnings = async () => {
    setLoading(true);
    try {
      // Primeiros momentos do mês atual
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // 1. Ganhos do Clube VIP
      const { data: vipPurchases } = await supabase
        .from('content_purchases')
        .select('net_amount_cents')
        .eq('provider_id', profile.id)
        .gte('created_at', startOfMonth);

      const vipTotal = (vipPurchases || []).reduce((acc, p) => acc + (p.net_amount_cents || 0), 0);

      // 2. Ganhos de Mimos/Presentes
      const { data: giftPurchases } = await supabase
        .from('gift_purchases')
        .select('net_amount_cents')
        .eq('provider_id', profile.id)
        .gte('created_at', startOfMonth);

      const giftTotal = (giftPurchases || []).reduce((acc, p) => acc + (p.net_amount_cents || 0), 0);

      setCurrentEarningsCents(vipTotal + giftTotal);
    } catch (err) {
      console.error('Erro ao calcular receita do mês:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoal = async () => {
    setSavingGoal(true);
    setGoalSaved(false);
    try {
      const goalCents = Math.round(parseFloat(goalAmount.replace(',', '.')) * 100);
      if (isNaN(goalCents) || goalCents <= 0) {
        alert('Digite uma meta financeira válida.');
        setSavingGoal(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ monthly_revenue_goal_cents: goalCents })
        .eq('id', profile.id);

      if (error) throw error;
      setGoalSaved(true);
      if (onSave) onSave();
      setTimeout(() => setGoalSaved(false), 3000);
    } catch (err: any) {
      alert('Erro ao salvar meta: ' + (err.message || err));
    } finally {
      setSavingGoal(false);
    }
  };

  const targetCents = profile?.monthly_revenue_goal_cents || parseFloat(goalAmount) * 100 || 500000;
  const progressPercent = Math.min(100, Math.round((currentEarningsCents / targetCents) * 100));
  const remainingCents = Math.max(0, targetCents - currentEarningsCents);

  return (
    <div className="glass-effect rounded-2xl border border-gold-primary/30 p-6 space-y-6 bg-gradient-to-r from-gold-primary/5 via-dark-bg/60 to-transparent">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
            <Target className="w-5 h-5 text-gold-primary animate-pulse" />
            Meta Financeira Mensal & Progresso
          </h3>
          <p className="text-xs text-gray-400 font-light mt-0.5">
            Defina sua meta de faturamento e acompanhe a receita acumulada do mês em tempo real.
          </p>
        </div>

        {/* Form para alterar a meta */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">R$</span>
            <input
              type="number"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              placeholder="5000"
              className="w-28 pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold focus:outline-none focus:border-gold-primary/60"
            />
          </div>
          <button
            onClick={handleSaveGoal}
            disabled={savingGoal}
            className="px-3 py-1.5 rounded-xl bg-gold-primary hover:bg-gold-light text-dark-bg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
          >
            {savingGoal ? '...' : goalSaved ? 'Salvo!' : 'Salvar Meta'}
          </button>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400 block">Acumulado do Mês</span>
            <span className="text-2xl font-extrabold text-emerald-400 font-mono">
              R$ {(currentEarningsCents / 100).toFixed(2)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-gold-primary block">Meta Mensal</span>
            <span className="text-xl font-bold text-gold-light font-mono">
              R$ {(targetCents / 100).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full h-4 bg-black/60 border border-white/10 rounded-full overflow-hidden p-0.5 relative">
          <div
            className="h-full bg-gradient-to-r from-gold-primary via-gold-light to-emerald-400 rounded-full transition-all duration-1000 relative"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>

        {/* Status Messages */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400 font-light flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-gold-primary" />
            <strong className="text-white font-bold">{progressPercent}%</strong> da meta alcançada!
          </span>

          {remainingCents > 0 ? (
            <span className="text-gold-light font-medium">
              Faltam apenas <strong className="text-white">R$ {(remainingCents / 100).toFixed(2)}</strong> este mês
            </span>
          ) : (
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <Trophy className="w-4 h-4 text-emerald-400" /> Meta Concluída! Parabéns! 🎉
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
