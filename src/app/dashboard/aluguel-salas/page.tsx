'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  Building2, 
  MapPin, 
  Clock, 
  DollarSign, 
  Calendar, 
  Check, 
  Search,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Info,
  ChevronRight,
  X
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatWhatsAppLink } from '@/lib/utils';

const AMENITIES_LIST = [
  { id: 'ar_condicionado', name: 'Ar Condicionado' },
  { id: 'chuveiro', name: 'Chuveiro Privativo' },
  { id: 'maca', name: 'Maca de Massagem' },
  { id: 'toalhas', name: 'Toalhas Limpas' },
  { id: 'ring_light', name: 'Ring Light / Iluminação' },
  { id: 'wifi', name: 'Wi-Fi' },
  { id: 'estacionamento', name: 'Estacionamento' },
  { id: 'som', name: 'Som Bluetooth' },
  { id: 'bebidas', name: 'Água / Café' }
];

export default function ProviderRentingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  
  // Marketplace rooms
  const [rooms, setRooms] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<any | null>(null);

  // Booking form state
  const [bookingDate, setBookingDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [totalPrice, setTotalPrice] = useState(0);

  useEffect(() => {
    fetchProfileAndData();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      calculateTotal();
    }
  }, [startTime, endTime, selectedRoom]);

  const fetchProfileAndData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Buscar perfil
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profData) {
        setProfile(profData);
        if (profData.role !== 'provider') {
          router.push('/dashboard');
          return;
        }

        // Buscar salas verificadas
        setRoomsLoading(true);
        const { data: roomsData } = await supabase
          .from('rooms')
          .select('*, host:profiles(name, whatsapp)')
          .eq('is_verified', true);
        setRooms(roomsData || []);
        setRoomsLoading(false);

        // Buscar reservas da anunciante
        const { data: bookingsData } = await supabase
          .from('room_bookings')
          .select(`
            id,
            booking_date,
            start_time,
            end_time,
            status,
            total_price,
            room_id,
            rooms (title, address, neighborhood, photos, host:profiles(name, whatsapp))
          `)
          .eq('provider_id', user.id)
          .order('created_at', { ascending: false });

        setMyBookings(bookingsData || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    if (!selectedRoom) return;
    const startHour = Number(startTime.split(':')[0]);
    const startMin = Number(startTime.split(':')[1]);
    const endHour = Number(endTime.split(':')[0]);
    const endMin = Number(endTime.split(':')[1]);

    const totalHours = (endHour + endMin / 60) - (startHour + startMin / 60);
    if (totalHours > 0) {
      setTotalPrice(totalHours * Number(selectedRoom.price_per_hour));
    } else {
      setTotalPrice(0);
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedRoom) return;

    if (!bookingDate) {
      alert('Selecione uma data para a reserva.');
      return;
    }

    const startVal = Number(startTime.replace(':', ''));
    const endVal = Number(endTime.replace(':', ''));
    if (startVal >= endVal) {
      alert('O horário de término deve ser posterior ao horário de início.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: newBooking, error } = await supabase
        .from('room_bookings')
        .insert({
          room_id: selectedRoom.id,
          provider_id: profile.id,
          booking_date: bookingDate,
          start_time: startTime,
          end_time: endTime,
          total_price: totalPrice,
          status: 'pending'
        })
        .select(`
          id,
          booking_date,
          start_time,
          end_time,
          status,
          total_price,
          room_id,
          rooms (title, address, neighborhood, photos, host:profiles(name, whatsapp))
        `)
        .single();

      if (error) throw error;

      setMyBookings(prev => [newBooking, ...prev]);
      setSelectedRoom(null);
      
      // Reset form states
      setBookingDate('');
      setStartTime('09:00');
      setEndTime('11:00');
      
      alert('Solicitação de reserva enviada ao proprietário da sala! Você receberá uma notificação quando ela for aceita.');
    } catch (err: any) {
      alert('Erro ao reservar sala: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  // Filtragem local de salas por busca
  const filteredRooms = rooms.filter(room => 
    room.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.neighborhood?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <div className="max-w-5xl mx-auto space-y-8 relative z-20 pb-16 selection:bg-emerald-500 selection:text-dark-bg">
      
      {/* Header */}
      <div className="border-b border-dark-border/20 pb-5">
        <h1 className="text-2xl md:text-3xl font-light text-white tracking-tight">
          Aluguel de Salas <span className="font-semibold text-emerald-400">de Atendimento</span>
        </h1>
        <p className="text-xs md:text-sm text-gray-400 font-light mt-1.5">
          Busque por salas de atendimento premium prontas para trabalhar, próximas a você, com total privacidade e infraestrutura.
        </p>
      </div>

      {/* Grid: Lado Esquerdo - Salas / Lado Direito - Minhas Reservas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Lado Esquerdo: Navegação de Salas */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-gray-500" />
            <input 
              type="text"
              placeholder="Pesquisar por bairro, cidade ou nome da sala..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white pl-11 pr-4 py-3.5 rounded-xl focus:border-emerald-500/50 focus:outline-none transition-colors"
            />
          </div>

          {roomsLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-emerald-600/20 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : filteredRooms.length === 0 ? (
            <div className="glass-effect rounded-2xl border border-dark-border/60 p-12 text-center">
              <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <h4 className="text-xs font-semibold text-white">Nenhuma sala ativa encontrada</h4>
              <p className="text-[10px] text-gray-500 font-light max-w-sm mx-auto mt-1 leading-relaxed">
                Não há salas cadastradas que correspondam ao termo digitado ou não há salas validadas disponíveis na sua região no momento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredRooms.map((room) => (
                <div key={room.id} className="glass-effect rounded-2xl border border-dark-border/60 overflow-hidden flex flex-col justify-between group">
                  <div className="relative aspect-video bg-black/40 overflow-hidden">
                    <img 
                      src={room.photos?.[0] || 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6'} 
                      alt={room.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute bottom-3 right-3 bg-black/70 border border-white/5 px-2.5 py-1 rounded-lg text-emerald-400 font-bold text-xs">
                      R$ {Number(room.price_per_hour).toFixed(2)}/h
                    </div>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white tracking-wide truncate">{room.title}</h4>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1 font-light">
                        <MapPin className="w-3.5 h-3.5 text-gray-500" />
                        {room.neighborhood}, {room.city}
                      </span>
                    </div>

                    <p className="text-[10px] text-gray-500 font-light leading-relaxed line-clamp-2">
                      {room.description}
                    </p>

                    {/* Comodidades rápidas */}
                    <div className="flex flex-wrap gap-1">
                      {room.amenities?.slice(0, 4).map((amenity: string) => {
                        const name = AMENITIES_LIST.find(a => a.id === amenity)?.name || amenity;
                        return (
                          <span key={amenity} className="text-[8px] bg-white/5 text-gray-400 px-2 py-0.5 rounded font-semibold border border-white/5">
                            {name}
                          </span>
                        );
                      })}
                      {room.amenities?.length > 4 && (
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-semibold">
                          +{room.amenities.length - 4} comodidades
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedRoom(room)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      Reservar Espaço
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lado Direito: Minhas Reservas Realizadas */}
        <div className="glass-effect rounded-2xl border border-dark-border/60 p-5 space-y-6 h-max">
          <div>
            <h3 className="text-sm font-semibold text-white">Minhas Reservas</h3>
            <p className="text-[10px] text-gray-500 font-light">Acompanhe seus pedidos e contate os locais</p>
          </div>

          {myBookings.length === 0 ? (
            <div className="py-8 border border-dashed border-dark-border/40 rounded-xl text-center bg-black/15">
              <Calendar className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <h4 className="text-[11px] font-semibold text-white">Nenhuma reserva ativa</h4>
              <p className="text-[9px] text-gray-500 max-w-[150px] mx-auto mt-1 leading-relaxed">
                Suas solicitações de salas reservadas aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {myBookings.map((booking) => {
                const room = booking.rooms;
                const isPending = booking.status === 'pending';
                const isConfirmed = booking.status === 'confirmed';
                const isCancelled = booking.status === 'cancelled';
                const host = room?.host;

                // WhatsApp link
                const waLink = formatWhatsAppLink(
                  host?.whatsapp,
                  `Olá, tenho uma reserva confirmada da sala ${room?.title || ''} para o dia ${new Date(booking.booking_date).toLocaleDateString('pt-BR')}.`
                );

                return (
                  <div key={booking.id} className="bg-black/35 rounded-xl border border-white/5 p-3.5 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-white/5 bg-black/20">
                        <img src={room?.photos?.[0] || 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6'} className="w-full h-full object-cover" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{room?.title || 'Sala'}</h4>
                        <p className="text-[9px] text-gray-400 font-light truncate">{room?.neighborhood}</p>
                      </div>
                    </div>

                    <div className="text-[10px] text-gray-400 flex flex-col gap-0.5 font-light">
                      <span>Data: <strong className="text-white">{new Date(booking.booking_date).toLocaleDateString('pt-BR')}</strong></span>
                      <span>Horário: <strong className="text-white">{booking.start_time} - {booking.end_time}</strong></span>
                      <span>Preço: <strong className="text-emerald-400">R$ {Number(booking.total_price).toFixed(2)}</strong></span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-dark-border/20">
                      {/* Status */}
                      <div>
                        {isPending && (
                          <span className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase">Aguardando</span>
                        )}
                        {isConfirmed && (
                          <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold uppercase">Confirmada</span>
                        )}
                        {isCancelled && (
                          <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-bold uppercase">Recusada</span>
                        )}
                      </div>

                      {/* Contato Host se confirmado */}
                      {isConfirmed && waLink && (
                        <a 
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[9px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" /> Contato
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Lightbox / Modal de Reserva */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-[4px] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-dark-card border border-dark-border/60 rounded-2xl max-w-2xl w-full p-6 md:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto animate-scaleUp">
            
            {/* Fechar */}
            <button 
              onClick={() => setSelectedRoom(null)}
              className="absolute top-6 right-6 p-1.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            {/* Imagem principal */}
            <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/5 bg-black/40">
              <img src={selectedRoom.photos?.[0]} className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3 bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-1 rounded uppercase tracking-wider">
                Verificada
              </div>
            </div>

            {/* Título & Detalhes */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="space-y-0.5">
                  <h3 className="text-lg font-bold text-white tracking-wide">{selectedRoom.title}</h3>
                  <p className="text-xs text-gray-400 flex items-center gap-1 font-light">
                    <MapPin className="w-3.5 h-3.5 text-gray-500" />
                    {selectedRoom.address}, {selectedRoom.neighborhood}, {selectedRoom.city}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-gray-500 block uppercase font-bold">Valor por Hora</span>
                  <span className="text-lg font-bold text-emerald-400">R$ {Number(selectedRoom.price_per_hour).toFixed(2)}/h</span>
                </div>
              </div>

              <p className="text-xs text-gray-400 font-light leading-relaxed">
                {selectedRoom.description}
              </p>

              {/* Comodidades detalhadas */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-white block">Comodidades Inclusas</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selectedRoom.amenities?.map((amenity: string) => {
                    const name = AMENITIES_LIST.find(a => a.id === amenity)?.name || amenity;
                    return (
                      <span key={amenity} className="text-[10px] bg-white/5 border border-white/5 rounded px-2.5 py-1 font-medium text-gray-400 flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        {name}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Formulário de Reserva */}
              <form onSubmit={handleCreateBooking} className="border-t border-dark-border/20 pt-6 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Solicitar Período de Aluguel</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Data */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-400 font-semibold block uppercase">Escolher Data</label>
                    <input 
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white px-3 py-2.5 rounded-xl focus:border-emerald-500/50 focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  {/* Hora Início */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-400 font-semibold block uppercase">Hora de Entrada</label>
                    <input 
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white px-3 py-2.5 rounded-xl focus:border-emerald-500/50 focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  {/* Hora Fim */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-gray-400 font-semibold block uppercase">Hora de Saída</label>
                    <input 
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white px-3 py-2.5 rounded-xl focus:border-emerald-500/50 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-dark-border/10">
                  <div className="text-left">
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Custo total da reserva</span>
                    <span className="text-lg font-bold text-white">R$ {totalPrice.toFixed(2)}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || totalPrice <= 0}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
                  >
                    {submitting ? 'Reservando...' : 'Solicitar Aluguel'}
                  </button>
                </div>
              </form>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
