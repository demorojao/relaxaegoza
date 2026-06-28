'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  TrendingUp, 
  Eye, 
  MessageSquare, 
  Percent, 
  Clock, 
  ShieldCheck, 
  ShieldAlert,
  Sparkles,
  ChevronRight,
  Award,
  Lock,
  Building2,
  Camera,
  Upload
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import HostDashboardView from '@/components/HostDashboardView';
import AdEditorModal from '@/components/AdEditorModal';

export default function DashboardMetrics() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [boostingCheckout, setBoostingCheckout] = useState(false);
  const [boostTimeLeft, setBoostTimeLeft] = useState<string | null>(null);
  const [realTrafficData, setRealTrafficData] = useState<any[]>([
    { day: 'Dom', views: 0, clicks: 0 },
    { day: 'Seg', views: 0, clicks: 0 },
    { day: 'Ter', views: 0, clicks: 0 },
    { day: 'Qua', views: 0, clicks: 0 },
    { day: 'Qui', views: 0, clicks: 0 },
    { day: 'Sex', views: 0, clicks: 0 },
    { day: 'Sáb', views: 0, clicks: 0 }
  ]);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile || !profile) return;
    setUploading(true);

    try {
      const fileExt = avatarFile.name.split('.').pop() || 'jpg';
      const fileName = `${profile.id}/avatar_${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile_media')
        .upload(fileName, avatarFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile_media')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setProfile((prev: any) => ({ ...prev, avatar_url: publicUrl }));
      alert('Foto de perfil salva com sucesso! Agora, por favor, envie seus documentos para verificação de identidade.');
    } catch (err: any) {
      alert('Erro ao enviar foto: ' + (err.message || err));
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const status = params.get('checkout_status');
      if (status) {
        setCheckoutStatus(status);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, []);

  useEffect(() => {
    if (!profile?.boost_expires_at) {
      setBoostTimeLeft(null);
      return;
    }

    const updateCountdown = () => {
      const expireTime = new Date(profile.boost_expires_at).getTime();
      const now = Date.now();
      const diff = expireTime - now;

      if (diff <= 0) {
        setBoostTimeLeft(null);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        const hStr = hours > 0 ? `${hours}h ` : '';
        const mStr = minutes > 0 || hours > 0 ? `${minutes}m ` : '';
        setBoostTimeLeft(`${hStr}${mStr}${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [profile?.boost_expires_at]);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Registrar IP de forma assíncrona
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        fetch('/api/log-ip', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          }
        }).catch(err => console.error('Erro ao logar IP:', err));
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setProfile(data);
        setIsAvailable(data.is_available_now || false);

        // Buscar dados reais de tráfego do Supabase (últimos 7 dias)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const { data: events } = await supabase
          .from('analytics_events')
          .select('event_type, created_at')
          .eq('provider_id', user.id)
          .gte('created_at', sevenDaysAgo.toISOString());

        if (events) {
          const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
          const last7Days: any[] = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last7Days.push({
              dateStr: d.toISOString().split('T')[0],
              dayLabel: daysOfWeek[d.getDay()],
              views: 0,
              clicks: 0
            });
          }

          events.forEach((evt: any) => {
            const dateOnly = evt.created_at.split('T')[0];
            const dayObj = last7Days.find(d => d.dateStr === dateOnly);
            if (dayObj) {
              if (evt.event_type === 'profile_view') dayObj.views += 1;
              else if (evt.event_type === 'whatsapp_click') dayObj.clicks += 1;
            }
          });

          setRealTrafficData(last7Days.map(d => ({
            day: d.dayLabel,
            views: d.views,
            clicks: d.clicks
          })));
        }
      } else {
        router.push('/login');
      }
    } else {
      router.push('/login');
    }
    setLoading(false);
  };

  const handleToggleAvailability = async () => {
    if (!profile) return;

    // Apenas assinantes Pro ou Gold podem usar o "Disponível Agora"
    const tier = profile.subscription_tier || 'free';
    if (tier === 'free') {
      setShowUpgradePrompt(true);
      return;
    }

    const nextState = !isAvailable;
    setIsAvailable(nextState);

    try {
      const updateData: any = { is_available_now: nextState };
      if (nextState) {
        updateData.available_until = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      } else {
        updateData.available_until = null;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', profile.id);
      
      if (error) throw error;
    } catch (err: any) {
      alert('Erro ao atualizar status de disponibilidade: ' + (err?.message || err));
      setIsAvailable(!nextState); // Reverte
    }
  };

  const handleBuyBoost = async () => {
    setBoostingCheckout(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isBoost: true })
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao iniciar o checkout do Boost.');
    } finally {
      setBoostingCheckout(false);
    }
  };

  const displayTrafficData = !profile || profile.subscription_tier === 'free'
    ? [
        { day: 'Seg', views: 120, clicks: 35 },
        { day: 'Ter', views: 145, clicks: 42 },
        { day: 'Qua', views: 180, clicks: 50 },
        { day: 'Qui', views: 210, clicks: 58 },
        { day: 'Sex', views: 280, clicks: 75 },
        { day: 'Sáb', views: 320, clicks: 88 },
        { day: 'Dom', views: 260, clicks: 68 }
      ]
    : realTrafficData;

  const totalViews = displayTrafficData.reduce((acc, curr) => acc + curr.views, 0);
  const totalClicks = displayTrafficData.reduce((acc, curr) => acc + curr.clicks, 0);
  const conversionRate = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0';

  if (loading) {
    return (
      <div className="w-full flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-wine-primary/30 border-t-wine-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (profile?.role === 'host') {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4 animate-fadeIn">
        <Building2 className="w-12 h-12 text-gold-primary mx-auto" />
        <h2 className="text-xl font-bold text-white">Recurso de Locais Temporariamente Indisponível</h2>
        <p className="text-xs text-gray-400 font-light leading-relaxed">
          O cadastro e aluguel de espaços físicos está temporariamente ocultado para o lançamento do portal. Em breve você poderá gerenciar suas salas por aqui!
        </p>
      </div>
    );
  }

  if (profile && !profile.avatar_url) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 relative z-20 selection:bg-gold-primary selection:text-dark-bg animate-fadeIn">
        <div className="glass-effect rounded-3xl border border-dark-border/80 p-8 text-center space-y-6 bg-gradient-to-b from-dark-bg via-dark-bg/95 to-dark-bg/90 relative overflow-hidden shadow-2xl">
          {/* Luz de fundo dourada sutil */}
          <div className="absolute -right-16 -top-16 w-36 h-36 bg-gold-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-36 h-36 bg-wine-primary/15 rounded-full blur-3xl pointer-events-none" />

          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-primary/20 to-wine-primary/20 border border-gold-primary/30 flex items-center justify-center text-gold-primary animate-pulse">
            <Camera className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white tracking-wide">
              Foto de Capa Obrigatória
            </h2>
            <p className="text-xs text-gray-400 font-light leading-relaxed text-left">
              Para ativar o seu anúncio e começar a usar o portal, você precisa enviar uma **Foto de Capa Real** (de rosto ou corpo). 
              Esta imagem será a primeira impressão dos clientes na vitrine pública.
            </p>
          </div>

          {/* Área de Visualização e Upload */}
          <div className="space-y-4 pt-2">
            <div className="relative mx-auto w-40 h-40 rounded-full border border-dark-border overflow-hidden bg-black/40 flex items-center justify-center group shrink-0 shadow-[0_0_20px_rgba(197,168,128,0.08)]">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview do Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="text-gray-600 flex flex-col items-center gap-1">
                  <Upload className="w-8 h-8 opacity-40" />
                  <span className="text-[10px] uppercase tracking-wider font-semibold opacity-50">Sem Imagem</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              <label className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-white hover:bg-white/10 hover:border-gold-primary/40 cursor-pointer transition-all flex items-center justify-center gap-2">
                <Upload className="w-4 h-4 text-gold-primary" />
                {avatarPreview ? 'Substituir Imagem' : 'Selecionar Foto'}
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarChange} 
                  className="hidden" 
                />
              </label>

              {avatarPreview && (
                <button
                  onClick={handleUploadAvatar}
                  disabled={uploading}
                  className="w-full py-3 rounded-xl bg-gold-primary hover:bg-gold-light text-dark-bg font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-gold-primary/20"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-dark-bg/30 border-t-dark-bg rounded-full animate-spin" />
                      Salvando foto...
                    </>
                  ) : (
                    'Confirmar e Salvar Foto'
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Alerta de Verificação Crucial */}
          <div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-4 text-left">
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5 mb-1">
              <ShieldAlert className="w-4 h-4" /> Passo Seguinte: Verificação de Identidade
            </span>
            <p className="text-[10px] text-gray-400 font-light leading-relaxed">
              Após salvar sua foto de capa, você será alertada a realizar a verificação de identidade enviando seus documentos (selfie + documento). A verificação é **crucial e obrigatória** para que o seu anúncio seja ativado e exibido na vitrine pública.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const name = profile?.name || 'Profissional';
  const tier = profile?.subscription_tier || 'free';
  const profileIdShort = profile?.id ? `#${profile.id.slice(0, 6)}` : '#---';

  const planText = tier === 'free' ? 'Bronze (Grátis)' : tier === 'pro' ? 'Silver Pro' : 'Gold Premium';
  const isPaid = tier === 'pro' || tier === 'gold';

  return (
    <div className="max-w-5xl mx-auto space-y-8 relative z-20 selection:bg-gold-primary selection:text-dark-bg">
      
      {/* Alertas Críticos de Ativação do Anúncio (Foto e Verificação) */}
      {profile && (!profile.avatar_url || profile.verification_status !== 'verified') && (
        <div className="space-y-4">
          {/* Alerta de Foto de Capa Ausente */}
          {!profile.avatar_url && (
            <div className="bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/20 text-red-200 text-xs px-4 py-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fadeIn">
              <div className="space-y-1">
                <span className="font-semibold block text-white text-sm flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
                  Perfil Inativo / Ocultado da Vitrine
                </span>
                <p className="text-gray-400 font-light leading-relaxed">
                  Seu perfil está oculto e não aparecerá nas buscas públicas porque você ainda não enviou uma **Foto de Capa Real**. É obrigatório enviar uma imagem real de rosto ou corpo no seu perfil para que seu anúncio seja ativado no portal.
                </p>
              </div>
              <Link href="/dashboard/perfil">
                <button className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all flex-shrink-0 cursor-pointer shadow-lg shadow-red-600/15">
                  Enviar Foto de Capa
                </button>
              </Link>
            </div>
          )}

          {/* Alerta de Verificação de Identidade Obrigatória */}
          {profile.avatar_url && profile.verification_status !== 'verified' && (
            <div className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 text-amber-200 text-xs px-4 py-4 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fadeIn">
              <div className="space-y-1">
                <span className="font-semibold block text-white text-sm flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
                  Verificação de Identidade Crucial
                </span>
                <p className="text-gray-400 font-light leading-relaxed">
                  {profile.verification_status === 'pending' ? (
                    'Seus documentos de identificação foram enviados e estão sob análise manual da nossa equipe. Em breve seu perfil será ativado com o selo verificado.'
                  ) : (
                    'Para a segurança do portal e para começar a anunciar, você precisa verificar sua identidade. Envie uma foto do seu documento de identidade e uma selfie rápida para validar sua conta.'
                  )}
                </p>
              </div>
              {profile.verification_status !== 'pending' && (
                <Link href="/dashboard/verificacao">
                  <button className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-dark-bg text-xs font-bold transition-all flex-shrink-0 cursor-pointer shadow-lg shadow-amber-500/15">
                    Verificar Identidade
                  </button>
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {checkoutStatus === 'success' && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs px-4 py-3.5 rounded-2xl flex items-center gap-3.5 animate-fadeIn">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 animate-pulse" />
          <div>
            <span className="font-semibold block text-white text-sm">Assinatura Ativada!</span>
            Seu upgrade de plano foi processado com sucesso. Todos os novos recursos, limites ampliados e prioridades de destaque orgânico já estão ativos no seu anúncio.
          </div>
        </div>
      )}

      {checkoutStatus === 'success_boost' && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs px-4 py-3.5 rounded-2xl flex items-center gap-3.5 animate-fadeIn">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 animate-pulse" />
          <div>
            <span className="font-semibold block text-white text-sm">Turbo Boost Ativado! 🚀</span>
            Seu perfil agora está em destaque absoluto no topo de sua categoria pelos próximos 120 minutos. Aproveite o aumento nos contatos!
          </div>
        </div>
      )}

      {checkoutStatus === 'cancelled' && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-xs px-4 py-3.5 rounded-2xl flex items-center gap-3.5 animate-fadeIn">
          <Sparkles className="w-5 h-5 text-yellow-400 shrink-0" />
          <div>
            <span className="font-semibold block text-white text-sm">Processo Cancelado</span>
            O checkout de upgrade foi interrompido. Você pode tentar novamente a qualquer momento para impulsionar seus agendamentos.
          </div>
        </div>
      )}

      {checkoutStatus === 'cancelled_boost' && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-xs px-4 py-3.5 rounded-2xl flex items-center gap-3.5 animate-fadeIn">
          <Sparkles className="w-5 h-5 text-yellow-400 shrink-0" />
          <div>
            <span className="font-semibold block text-white text-sm">Boost Cancelado</span>
            O checkout de ativação do Turbo Boost foi interrompido. Você pode ativá-lo a qualquer momento para ficar no topo.
          </div>
        </div>
      )}

      {/* Upper header summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-dark-border/20 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-white tracking-tight">
            Olá, <span className="font-semibold text-white">{name}</span>
          </h1>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
            <span className="flex items-center gap-1 text-gold-primary font-medium">
              <Award className="w-3.5 h-3.5" />
              Anunciante {planText}
            </span>
            {tier !== 'gold' && (
              <Link href="/planos" className="text-[10px] uppercase font-bold text-gold-light hover:text-white border-b border-dashed border-gold-light/40 hover:border-white transition-colors ml-2">
                Fazer Upgrade
              </Link>
            )}
            <span>•</span>
            <span>ID do Perfil: {profileIdShort}</span>
          </div>
        </div>

        {/* Live Availability Toggle Button */}
        <div className="glass-effect rounded-2xl border border-dark-border/60 p-3 flex items-center gap-4 relative">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 flex items-center gap-1">
              Status Real-Time
              {!isPaid && <Lock className="w-3 h-3 text-gold-primary" />}
            </span>
            <span className="text-xs font-semibold text-white">
              {isAvailable ? 'Disponível Agora' : 'Offline / Indisponível'}
            </span>
          </div>
          <button 
            onClick={handleToggleAvailability}
            className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${
              isAvailable ? 'bg-emerald-500' : 'bg-gray-700'
            } ${!isPaid ? 'opacity-50 cursor-pointer' : 'cursor-pointer'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${
              isAvailable ? 'translate-x-6' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      {/* Alerta de bloqueio do status */}
      {showUpgradePrompt && (
        <div className="bg-gradient-to-r from-wine-primary/20 to-transparent border border-wine-primary/40 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fadeIn">
          <div>
            <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-gold-primary" /> Recurso Bloqueado no Plano Bronze
            </h4>
            <p className="text-xs text-gray-400 font-light leading-relaxed mt-1">
              O seletor **"Disponível Agora"** que deixa seu card piscando em neon verde e te prioriza nas buscas exige assinatura **Pro** ou **Gold**.
            </p>
          </div>
          <Link href="/planos">
            <button className="px-5 py-2.5 rounded-xl bg-gold-primary text-dark-bg text-xs font-bold hover:bg-gold-light transition-all flex-shrink-0 cursor-pointer">
              Ver Planos de Destaque
            </button>
          </Link>
        </div>
      )}

      {/* Seção Turbo Boost */}
      <div className="glass-effect rounded-2xl border border-gold-primary/30 p-6 bg-gradient-to-r from-gold-primary/[0.03] to-transparent relative overflow-hidden">
        {/* Decorative subtle background pattern */}
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gold-primary/5 blur-3xl rounded-full pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-xl">
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-extrabold text-gold-primary bg-gold-primary/10 px-2.5 py-1 rounded-full border border-gold-primary/20">
              <TrendingUp className="w-3.5 h-3.5" /> Turbo Boost
            </span>
            <h3 className="text-lg font-bold text-white tracking-wide">Fique no Topo dos Resultados por 2h</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-light font-sans">
              Destaque seu anúncio acima de todas as outras profissionais da sua categoria (Gold ou Pro) na sua cidade e bairro por 2 horas inteiras por apenas **R$ 15,00**.
            </p>
          </div>

          <div className="flex-shrink-0 flex items-center">
            {tier === 'free' ? (
              <div className="flex flex-col items-end gap-2">
                <span className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                  <Lock className="w-3 h-3 text-gold-primary" /> Apenas para planos Gold / Pro
                </span>
                <Link href="/planos">
                  <button className="px-5 py-2.5 rounded-xl bg-gray-800 text-gray-400 hover:text-white border border-white/5 hover:border-gold-primary/40 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer">
                    Upgrade de Plano
                  </button>
                </Link>
              </div>
            ) : boostTimeLeft ? (
              <div className="flex flex-col items-center md:items-end gap-1 bg-gold-primary/10 border border-gold-primary/20 px-5 py-3 rounded-2xl">
                <span className="text-[10px] text-gold-primary uppercase tracking-wider font-bold animate-pulse">🚀 Boost Ativo</span>
                <span className="text-xl font-bold text-white font-mono">{boostTimeLeft}</span>
                <span className="text-[9px] text-gray-500 font-light">tempo restante de destaque</span>
              </div>
            ) : (
              <button 
                onClick={handleBuyBoost}
                disabled={boostingCheckout}
                className="px-6 py-3 rounded-xl bg-gold-primary hover:bg-gold-light text-dark-bg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-gold-primary/25 disabled:opacity-50 flex items-center gap-2 hover:scale-[1.02]"
              >
                {boostingCheckout ? (
                  <>
                    <div className="w-4 h-4 border-2 border-dark-bg/30 border-t-dark-bg rounded-full animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    Ativar Destaque (R$ 15)
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Seção de Estatísticas e Tráfego */}
      <div className="relative">
        {tier !== 'gold' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[5px] rounded-2xl z-30 flex flex-col items-center justify-center p-6 text-center border border-white/5 shadow-2xl animate-fadeIn">
            <div className="p-3 bg-gold-primary/10 rounded-full text-gold-primary mb-3">
              <Lock className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-white tracking-wide">Estatísticas de Tráfego Bloqueadas</h3>
            <p className="text-[11px] text-gray-400 font-light max-w-sm mt-1.5 leading-relaxed mb-5">
              Descubra quantas pessoas visualizaram seu anúncio e clicaram no seu WhatsApp em tempo real. Recurso disponível exclusivamente no plano **Gold Premium**.
            </p>
            <Link href="/planos">
              <button className="px-6 py-2.5 rounded-xl bg-gold-primary hover:bg-gold-light text-dark-bg font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-gold-primary/20">
                Fazer Upgrade para Gold
              </button>
            </Link>
          </div>
        )}

        <div className={`space-y-8 ${tier !== 'gold' ? 'select-none pointer-events-none' : ''}`}>
          {/* Grid containing Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Views */}
            <div className="glass-effect rounded-2xl border border-dark-border/60 p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-gray-400 font-light block">Visualizações (7 dias)</span>
                <span className="text-2xl font-semibold text-white">{totalViews}</span>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
                <Eye className="w-5 h-5" />
              </div>
            </div>

            {/* Clicks */}
            <div className="glass-effect rounded-2xl border border-dark-border/60 p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-gray-400 font-light block">Cliques no WhatsApp</span>
                <span className="text-2xl font-semibold text-gold-primary">{totalClicks}</span>
              </div>
              <div className="w-12 h-12 bg-gold-primary/10 rounded-xl flex items-center justify-center text-gold-primary">
                <MessageSquare className="w-5 h-5" />
              </div>
            </div>

            {/* Conversion Rate */}
            <div className="glass-effect rounded-2xl border border-dark-border/60 p-5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs text-gray-400 font-light block">Taxa de Conversão</span>
                <span className="text-2xl font-semibold text-emerald-400">{conversionRate}%</span>
              </div>
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                <Percent className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Conversion Chart Section in Pure CSS */}
          <div className="glass-effect rounded-2xl border border-dark-border/60 p-6 md:p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-base font-semibold text-white tracking-wide">Volume de Tráfego Diário</h3>
                <p className="text-xs text-gray-400 font-light">Comparativo de acessos e contatos gerados</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-gray-400">
                  <span className="w-2.5 h-2.5 bg-gray-700 rounded-sm block animate-pulse"></span>
                  Visualizações
                </span>
                <span className="flex items-center gap-1.5 text-gold-primary font-medium">
                  <span className="w-2.5 h-2.5 bg-gold-primary rounded-sm block"></span>
                  WhatsApp
                </span>
              </div>
            </div>

            {/* Pure HTML/CSS Bar Chart Grid */}
            <div className="h-64 flex items-end justify-between gap-2 md:gap-4 border-b border-dark-border/20 pb-4">
              {displayTrafficData.map((data) => {
                const maxViews = 350;
                const viewHeightPercent = (data.views / maxViews) * 100;
                const clickHeightPercent = ((data.clicks * 3.5) / maxViews) * 100;

                return (
                  <div key={data.day} className="flex-1 flex flex-col items-center group h-full justify-end relative">
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-12 bg-dark-card border border-dark-border text-[10px] rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-2xl flex flex-col z-30 min-w-[80px] text-center">
                      <span className="text-white font-semibold">Views: {data.views}</span>
                      <span className="text-gold-primary">WhatsApp: {data.clicks}</span>
                    </div>

                    {/* Bars Container */}
                    <div className="w-full flex items-end justify-center gap-1 h-full max-h-[85%]">
                      <div 
                        style={{ height: `${viewHeightPercent}%` }} 
                        className="w-1/3 bg-gray-800 group-hover:bg-gray-700 rounded-t-sm transition-all duration-500" 
                      />
                      <div 
                        style={{ height: `${clickHeightPercent}%` }} 
                        className="w-1/3 bg-gold-primary group-hover:bg-gold-light rounded-t-sm transition-all duration-500" 
                      />
                    </div>

                    <span className="text-[10px] text-gray-500 font-medium mt-3 block">{data.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Actionable Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Verification Alert Box */}
        <div className="bg-gradient-to-r from-gold-primary/[0.04] to-transparent rounded-2xl border border-gold-primary/20 p-5 flex items-start gap-4">
          <div className="p-2 rounded-xl bg-gold-primary/10 text-gold-primary mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-white">Impulsione seus Resultados</h4>
            <p className="text-xs text-gray-400 font-light leading-relaxed mb-3.5">
              Seu perfil possui o selo de Perfil Verificado por selfie, mas você ainda não ativou o **Selo de Ambiente Validado**. Perfis com espaço físico auditado geram até **40% mais agendamentos**.
            </p>
            <Link href="/dashboard/verificacao">
              <span className="text-xs font-semibold text-gold-primary hover:text-gold-light flex items-center gap-1 transition-colors cursor-pointer">
                Validar Sala de Atendimento
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>

        {/* Visibility Boost Promotion */}
        <div className="bg-gradient-to-r from-emerald-500/[0.03] to-transparent rounded-2xl border border-emerald-500/10 p-5 flex items-start gap-4">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 mt-0.5 animate-pulse">
            <Clock className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-white">Status "Disponível Agora"</h4>
            <p className="text-xs text-gray-400 font-light leading-relaxed mb-3.5">
              Ao ativar este status, seu card de perfil receberá o contorno neon verde na busca principal e será priorizado no topo dos resultados orgânicos nas próximas **2 horas**.
            </p>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20 rounded-full font-medium">
              Sua visibilidade atual está multiplicada por 2.5x
            </span>
          </div>
        </div>

      </div>

      {/* Floating Quick Action Button for Ads */}
      {profile && profile.role === 'provider' && (
        <>
          <button
            onClick={() => setIsAdModalOpen(true)}
            className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-gold-primary to-gold-light text-dark-bg font-bold py-3.5 px-6 rounded-full shadow-[0_4px_20px_rgba(197,168,128,0.3)] hover:shadow-[0_4px_25px_rgba(197,168,128,0.5)] hover:scale-105 transition-all flex items-center gap-2 group cursor-pointer border border-gold-light/20"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-dark-bg opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-dark-bg"></span>
            </span>
            <span className="text-xs uppercase tracking-wider">📢 Gerenciar Anúncio</span>
          </button>
          
          <AdEditorModal
            isOpen={isAdModalOpen}
            onClose={() => setIsAdModalOpen(false)}
            profile={profile}
            onSaveSuccess={fetchProfile}
          />
        </>
      )}

    </div>
  );
}
