'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Building2, 
  Calendar, 
  DollarSign, 
  Check, 
  X, 
  Clock, 
  ShieldCheck, 
  ShieldAlert, 
  ArrowRight,
  Sparkles,
  Award
} from 'lucide-react';
import Link from 'next/link';

interface HostDashboardViewProps {
  profile: any;
}

export default function HostDashboardView({ profile }: HostDashboardViewProps) {
  const [loading, setLoading] = useState(true);
  const [submittingCheckout, setSubmittingCheckout] = useState(false);
  const [isFreeLaunch, setIsFreeLaunch] = useState(false);
  const [stats, setStats] = useState({
    totalRooms: 0,
    totalBookings: 0,
    totalRevenue: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    async function checkHostPromoAndFetch() {
      setLoading(true);
      let isFree = false;
      try {
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'host')
          .lte('created_at', profile.created_at);
        
        if (!error && count !== null && count <= 100) {
          isFree = true;
          setIsFreeLaunch(true);
        }
      } catch (err) {
        console.error('Erro ao verificar promo de host:', err);
      }

      if (profile.subscription_tier !== 'free' || isFree) {
        await fetchHostData();
      } else {
        setLoading(false);
      }
    }
    
    checkHostPromoAndFetch();
  }, [profile.id, profile.created_at, profile.subscription_tier]);

  const handleHostSubscribe = async () => {
    setSubmittingCheckout(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ tier: 'pro' }) // Repassa 'pro' que o checkout adaptado do host irá ignorar para cobrar o valor de host
      });
      
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Erro ao iniciar checkout.');
      }
    } catch (err) {
      alert('Erro ao conectar com o gateway de pagamento.');
    } finally {
      setSubmittingCheckout(false);
    }
  };

  const fetchHostData = async () => {
    setLoading(true);
    try {
      // 1. Buscar salas
      const { data: rooms, error: roomsError } = await supabase
        .from('rooms')
        .select('id, title');

      if (roomsError) throw roomsError;
      const roomIds = rooms?.map(r => r.id) || [];

      // 2. Buscar reservas relacionando com a sala e a profissional
      let bookings: any[] = [];
      if (roomIds.length > 0) {
        const { data: bData, error: bookingsError } = await supabase
          .from('room_bookings')
          .select(`
            id,
            booking_date,
            start_time,
            end_time,
            status,
            total_price,
            room_id,
            provider_id,
            rooms (title),
            profiles:provider_id (name, avatar_url, whatsapp)
          `)
          .in('room_id', roomIds)
          .order('created_at', { ascending: false });

        if (bookingsError) throw bookingsError;
        bookings = bData || [];
      }

      // 3. Calcular métricas
      const totalRooms = roomIds.length;
      const totalBookings = bookings.length;
      const totalRevenue = bookings
        .filter(b => b.status === 'confirmed')
        .reduce((acc, curr) => acc + Number(curr.total_price), 0);

      setStats({
        totalRooms,
        totalBookings,
        totalRevenue,
      });
      setRecentBookings(bookings);
    } catch (err) {
      console.error('Erro ao carregar dados do local:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingAction = async (bookingId: string, status: 'confirmed' | 'cancelled') => {
    setActionLoading(bookingId);
    try {
      const { error } = await supabase
        .from('room_bookings')
        .update({ status })
        .eq('id', bookingId);

      if (error) throw error;

      // Atualizar lista local
      setRecentBookings(prev => prev.map(b => {
        if (b.id === bookingId) {
          return { ...b, status };
        }
        return b;
      }));

      // Recalcular faturamento
      setStats(prev => {
        const b = recentBookings.find(x => x.id === bookingId);
        if (!b) return prev;
        let diff = 0;
        if (status === 'confirmed' && b.status !== 'confirmed') {
          diff = Number(b.total_price);
        } else if (status === 'cancelled' && b.status === 'confirmed') {
          diff = -Number(b.total_price);
        }
        return {
          ...prev,
          totalRevenue: prev.totalRevenue + diff
        };
      });
    } catch (err) {
      alert('Erro ao atualizar status da reserva.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-emerald-600/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (profile.subscription_tier === 'free' && !isFreeLaunch) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-6 relative z-20 animate-fadeIn selection:bg-emerald-500 selection:text-dark-bg">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-[0_0_15px_rgba(16,185,129,0.25)] animate-pulse">
          <Building2 className="w-7 h-7" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide">Assinatura do Local Requerida</h2>
          <p className="text-xs text-gray-400 font-light leading-relaxed max-w-sm mx-auto">
            Seja um parceiro de salas no Relaxe & Goze! Para cadastrar suas salas de atendimento e receber reservas das anunciantes da nossa vitrine, ative sua assinatura.
          </p>
        </div>

        <div className="bg-black/35 rounded-2xl border border-dark-border/60 p-6 space-y-4 text-left">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">O que está incluso:</h4>
          <ul className="text-xs text-gray-400 space-y-2.5 font-light">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              Cadastro ilimitado de salas de atendimento.
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              Exposição privilegiada para centenas de anunciantes ativas.
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              Negociação e contato direto via WhatsApp.
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              Moderação rápida e suporte prioritário.
            </li>
          </ul>

          <div className="border-t border-dark-border/20 pt-4 flex justify-between items-center">
            <div>
              <span className="text-[10px] text-gray-500 block uppercase font-bold">Valor da Assinatura</span>
              <span className="text-sm font-bold text-white">R$ 450,00 / mês</span>
            </div>
            <button
              onClick={handleHostSubscribe}
              disabled={submittingCheckout}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
            >
              {submittingCheckout ? 'Iniciando...' : 'Ativar Agora'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isVerified = profile.is_space_verified;
  const hasFile = !!profile.space_verification_file;

  return (
    <div className="space-y-8 relative z-20 pb-16 selection:bg-emerald-500 selection:text-dark-bg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-dark-border/20 pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-white tracking-tight">
            Painel do Local: <span className="font-semibold text-white">{profile.name}</span>
          </h1>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <Award className="w-3.5 h-3.5" />
              Parceiro de Espaço Relaxe & Goze
            </span>
            <span>•</span>
            <span>{profile.city}</span>
          </div>
        </div>

        {/* Verification Status Badge */}
        <div className="glass-effect rounded-2xl border border-dark-border/60 p-3 flex items-center gap-3">
          <div className="flex flex-col text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Status do Espaço</span>
            <span className="text-xs font-semibold text-white">
              {isVerified ? 'Local Verificado' : hasFile ? 'Sob Análise' : 'Não Verificado'}
            </span>
          </div>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            isVerified 
              ? 'bg-emerald-500/15 text-emerald-400' 
              : hasFile 
                ? 'bg-amber-500/15 text-amber-400' 
                : 'bg-red-500/15 text-red-400'
          }`}>
            {isVerified ? (
              <ShieldCheck className="w-4.5 h-4.5" />
            ) : (
              <ShieldAlert className="w-4.5 h-4.5" />
            )}
          </div>
        </div>
      </div>

      {/* Banner de Lançamento Gratuito */}
      {isFreeLaunch && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/[0.03] to-transparent border border-emerald-500/20 rounded-2xl p-4.5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn relative z-10 text-left">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0 animate-pulse">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold block text-white text-sm">Campanha de Lançamento Ativa!</span>
              <p className="text-xs text-gray-400 font-light mt-0.5 leading-relaxed">
                Você é um dos **100 primeiros parceiros** cadastrados! Seu acesso e listagem de salas são **100% gratuitos**.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full uppercase tracking-wider shrink-0">
            Acesso Grátis Ativo
          </span>
        </div>
      )}

      {/* Alerta de Verificação Pendente */}
      {!isVerified && (
        <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fadeIn">
          <div>
            <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-emerald-400" /> Valide o seu Espaço Físico
            </h4>
            <p className="text-xs text-gray-400 font-light leading-relaxed mt-1.5">
              {hasFile 
                ? 'Sua mídia de validação está em nossa fila de auditoria. Revisamos os dados em até 2 horas.'
                : 'Para que suas salas fiquem visíveis para as profissionais do portal Relaxe & Goze alugarem, você precisa enviar um curto vídeo ou foto de validação do local.'
              }
            </p>
          </div>
          {!hasFile && (
            <Link href="/dashboard/verificacao">
              <button className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-all flex-shrink-0 cursor-pointer shadow-[0_4px_12px_rgba(16,185,129,0.15)]">
                Enviar Validação via Mídia
              </button>
            </Link>
          )}
        </div>
      )}

      {/* Métricas do Local */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Salas Cadastradas */}
        <div className="glass-effect rounded-2xl border border-dark-border/60 p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-light block">Minhas Salas</span>
            <span className="text-2xl font-semibold text-white">{stats.totalRooms}</span>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Total Reservas */}
        <div className="glass-effect rounded-2xl border border-dark-border/60 p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-light block">Total de Reservas</span>
            <span className="text-2xl font-semibold text-white">{stats.totalBookings}</span>
          </div>
          <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Faturamento Confirmado */}
        <div className="glass-effect rounded-2xl border border-dark-border/60 p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-gray-400 font-light block">Faturamento (Confirmado)</span>
            <span className="text-2xl font-semibold text-emerald-400">
              R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Reservas Recentes */}
      <div className="glass-effect rounded-2xl border border-dark-border/60 p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-white tracking-wide">Pedidos de Reserva Recentes</h3>
            <p className="text-xs text-gray-400 font-light">Controle os agendamentos e solicitações das profissionais</p>
          </div>
          <Link href="/dashboard/reservas" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
            Ver todas as reservas
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentBookings.length === 0 ? (
          <div className="py-12 border border-dashed border-dark-border/40 rounded-xl text-center bg-black/10">
            <Calendar className="w-10 h-10 text-gray-600 mx-auto mb-2.5" />
            <h4 className="text-xs font-semibold text-white">Nenhuma reserva encontrada</h4>
            <p className="text-[10px] text-gray-500 font-light max-w-xs mx-auto mt-1 leading-relaxed">
              Quando anunciantes reservarem suas salas para trabalhar, os pedidos detalhados aparecerão aqui em tempo real.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-dark-border/20">
            {recentBookings.slice(0, 5).map((booking) => {
              const profile = booking.profiles;
              const room = booking.rooms;
              const isPending = booking.status === 'pending';
              const isConfirmed = booking.status === 'confirmed';
              const isCancelled = booking.status === 'cancelled';

              return (
                <div key={booking.id} className="py-4.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 first:pt-0 last:pb-0">
                  {/* Info Profissional & Sala */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden border border-white/5 bg-black/30 shrink-0">
                      <img 
                        src={profile?.avatar_url || '/avatar-placeholder.svg'}
                        alt={profile?.name || 'Profissional'} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        {profile?.name || 'Profissional'}
                        <span className="text-[9px] text-gray-500 font-normal">reservou {room?.title || 'Sala'}</span>
                      </h4>
                      <p className="text-[10px] text-gray-400 font-light">
                        Data: <strong className="text-white">{new Date(booking.booking_date).toLocaleDateString('pt-BR')}</strong> • Horário: <strong className="text-white">{booking.start_time} - {booking.end_time}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Preço e Status */}
                  <div className="flex flex-wrap items-center gap-4.5 justify-between w-full md:w-auto">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-gray-500 block uppercase font-semibold">Preço de Aluguel</span>
                      <span className="text-xs font-bold text-white">R$ {Number(booking.total_price).toFixed(2)}</span>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isPending && (
                        <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-3 h-3 animate-pulse" /> Pendente
                        </span>
                      )}
                      {isConfirmed && (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                          <Check className="w-3 h-3" /> Confirmada
                        </span>
                      )}
                      {isCancelled && (
                        <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                          <X className="w-3 h-3" /> Cancelada
                        </span>
                      )}
                    </div>

                    {/* Botões de Ação para Status Pendente */}
                    {isPending && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleBookingAction(booking.id, 'confirmed')}
                          disabled={actionLoading !== null}
                          className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                          title="Confirmar Reserva"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleBookingAction(booking.id, 'cancelled')}
                          disabled={actionLoading !== null}
                          className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-200 border border-red-500/30 transition-colors cursor-pointer"
                          title="Recusar Reserva"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
