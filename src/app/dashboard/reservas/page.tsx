'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  Calendar, 
  Check, 
  X, 
  Clock, 
  Building2, 
  MessageSquare,
  DollarSign
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatWhatsAppLink } from '@/lib/utils';

export default function HostBookingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'cancelled'>('pending');

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Buscar perfil para verificar permissões e assinatura ativa
      const { data: profData } = await supabase
        .from('profiles')
        .select('role, subscription_tier, created_at')
        .eq('id', user.id)
        .single();

      if (profData) {
        if (profData.role !== 'host') {
          router.push('/dashboard');
          return;
        }

        // Verificar se é um dos 100 primeiros hosts por data de criação
        const { count: hostRank, error: countError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'host')
          .lte('created_at', profData.created_at);

        const isFreeLaunch = !countError && hostRank !== null && hostRank <= 100;

        if (profData.subscription_tier === 'free' && !isFreeLaunch) {
          router.push('/dashboard');
          return;
        }
      }

      // Buscar salas pertencentes ao host
      const { data: rooms } = await supabase
        .from('rooms')
        .select('id');

      const roomIds = rooms?.map(r => r.id) || [];

      if (roomIds.length > 0) {
        // Buscar todas as reservas correspondentes
        const { data: bData, error } = await supabase
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
            rooms (title, address, neighborhood),
            profiles:provider_id (name, avatar_url, whatsapp)
          `)
          .in('room_id', roomIds)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setBookings(bData || []);
      }
    } catch (err) {
      console.error(err);
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

      setBookings(prev => prev.map(b => {
        if (b.id === bookingId) {
          return { ...b, status };
        }
        return b;
      }));
    } catch (err: any) {
      alert('Erro ao atualizar status: ' + (err.message || err));
    } finally {
      setActionLoading(null);
    }
  };

  // Filtrar reservas por aba
  const filteredBookings = bookings.filter(b => b.status === activeTab);

  if (loading) {
    return (
      <div className="w-full flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-emerald-600/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-20 text-center space-y-4 animate-fadeIn">
      <Building2 className="w-12 h-12 text-gold-primary mx-auto" />
      <h2 className="text-xl font-bold text-white">Recurso de Locais Temporariamente Indisponível</h2>
      <p className="text-xs text-gray-400 font-light leading-relaxed">
        O cadastro e aluguel de espaços físicos está temporariamente ocultado para o lançamento do portal. Em breve você poderá gerenciar suas salas por aqui!
      </p>
    </div>
  );

  // O restante do componente é mantido abaixo mas inacessível para o build não quebrar
  const oldRender = (
    <div className="max-w-4xl mx-auto space-y-8 relative z-20 pb-16 selection:bg-emerald-500 selection:text-dark-bg">
      {/* Header */}
      <div className="border-b border-dark-border/20 pb-5">
        <h1 className="text-2xl md:text-3xl font-light text-white tracking-tight">
          Reservas <span className="font-semibold text-emerald-400">Recebidas</span>
        </h1>
        <p className="text-xs md:text-sm text-gray-400 font-light mt-1.5">
          Gerencie os pedidos de locação de salas feitos pelas profissionais anunciantes.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5 w-full sm:w-max">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg tracking-wide transition-all cursor-pointer ${
            activeTab === 'pending' 
              ? 'bg-emerald-600 text-white font-bold shadow' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Pendentes ({bookings.filter(b => b.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('confirmed')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg tracking-wide transition-all cursor-pointer ${
            activeTab === 'confirmed' 
              ? 'bg-emerald-600 text-white font-bold shadow' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Confirmadas ({bookings.filter(b => b.status === 'confirmed').length})
        </button>
        <button
          onClick={() => setActiveTab('cancelled')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg tracking-wide transition-all cursor-pointer ${
            activeTab === 'cancelled' 
              ? 'bg-emerald-600 text-white font-bold shadow' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Canceladas ({bookings.filter(b => b.status === 'cancelled').length})
        </button>
      </div>

      {/* Lista de Reservas */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="glass-effect rounded-2xl border border-dark-border/60 p-16 text-center">
            <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h4 className="text-xs font-semibold text-white">Nenhuma reserva encontrada</h4>
            <p className="text-[10px] text-gray-500 font-light max-w-sm mx-auto mt-1 leading-relaxed">
              Não há nenhuma solicitação de reserva na aba **{
                activeTab === 'pending' ? 'Pendentes' : activeTab === 'confirmed' ? 'Confirmadas' : 'Canceladas'
              }** no momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredBookings.map((booking) => {
              const profile = booking.profiles;
              const room = booking.rooms;
              const isPending = booking.status === 'pending';
              const isConfirmed = booking.status === 'confirmed';
              
              // Gerar link whatsapp
              const waLink = formatWhatsAppLink(
                profile?.whatsapp,
                `Olá ${profile?.name || ''}, vi sua solicitação de reserva da sala ${room?.title || ''} no Relaxa & Goza.`
              );

              return (
                <div key={booking.id} className="glass-effect rounded-2xl border border-dark-border/60 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 animate-fadeIn">
                  
                  {/* Perfil & Detalhes da Reserva */}
                  <div className="flex items-start gap-4">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/10 bg-black/40 shrink-0">
                      <img 
                        src={profile?.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2'}
                        alt={profile?.name || 'Profissional'} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5 flex-wrap">
                        {profile?.name || 'Anunciante'}
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.2 rounded border border-emerald-500/20 font-bold uppercase">
                          {room?.title || 'Sala'}
                        </span>
                      </h4>
                      
                      <div className="flex flex-col gap-0.5 text-xs text-gray-400">
                        <span className="flex items-center gap-1 font-light">
                          Data: <strong className="text-white">{new Date(booking.booking_date).toLocaleDateString('pt-BR')}</strong>
                          • Horário: <strong className="text-white">{booking.start_time} - {booking.end_time}</strong>
                        </span>
                        {room?.address && (
                          <span className="text-[10px] text-gray-500 font-light flex items-center gap-0.5 mt-0.5">
                            <Building2 className="w-3 h-3 text-gray-600" />
                            {room.neighborhood} - {room.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Valor, WhatsApp e Controles */}
                  <div className="flex flex-wrap items-center gap-5 justify-between w-full sm:w-auto border-t sm:border-t-0 border-dark-border/10 pt-4 sm:pt-0">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wider">Valor total</span>
                      <span className="text-sm font-bold text-white flex items-center gap-0.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                        R$ {Number(booking.total_price).toFixed(2)}
                      </span>
                    </div>

                    {/* WhatsApp button */}
                    {waLink && (
                      <a 
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all text-xs font-semibold cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                    )}

                    {/* Controles para solicitações pendentes */}
                    {isPending && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleBookingAction(booking.id, 'confirmed')}
                          disabled={actionLoading !== null}
                          className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-all text-xs font-bold cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Confirmar
                        </button>
                        <button
                          onClick={() => handleBookingAction(booking.id, 'cancelled')}
                          disabled={actionLoading !== null}
                          className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-all text-xs font-semibold cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Recusar
                        </button>
                      </div>
                    )}

                    {/* Cancelar reserva confirmada */}
                    {isConfirmed && (
                      <button
                        onClick={() => handleBookingAction(booking.id, 'cancelled')}
                        disabled={actionLoading !== null}
                        className="text-[10px] text-gray-500 hover:text-red-400 border-b border-dashed border-gray-600 hover:border-red-400/50 transition-colors cursor-pointer"
                      >
                        Cancelar Reserva
                      </button>
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
