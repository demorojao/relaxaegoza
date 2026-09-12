import { Metadata } from 'next';
import { cacheLife } from 'next/cache';
import Link from 'next/link';
import { Building2, ChevronLeft, MapPin, DollarSign, Sparkles, ShieldCheck, Calendar, Clock, SlidersHorizontal } from 'lucide-react';
import { getSupabaseServiceClient } from '@/lib/supabaseServer';
import Logo from '@/components/Logo';
import RoomCard from '@/components/RoomCard';

export const metadata: Metadata = {
  title: 'Salas & Espaços de Atendimento para Aluguel | Relaxe & Goze',
  description: 'Marketplace exclusivo de salas de massagem, consultórios privativos e locais de atendimento para aluguel por hora ou período. Espaços auditados e equipados.',
};

export default async function EspacosPage() {
  'use cache';
  cacheLife('minutes');
  const supabase = getSupabaseServiceClient();

  const { data: rooms } = await supabase
    .from('rooms')
    .select('*, host:profiles(name, whatsapp, city, neighborhood)')
    .order('created_at', { ascending: false });

  const verifiedRoomsCount = rooms ? rooms.filter(r => r.is_verified).length : 0;

  return (
    <main className="min-h-screen w-full bg-dark-bg text-gray-100 pb-24 selection:bg-gold-primary selection:text-dark-bg relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gold-primary/10 blur-[160px] rounded-full pointer-events-none" />

      {/* Header Fixo */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-4 flex items-center justify-between">
        <Logo />
        
        <div className="font-semibold text-white tracking-wide text-xs sm:text-sm flex items-center gap-2">
          <Building2 className="w-4 h-4 text-emerald-400" />
          <span>Catálogo de Espaços & Salas</span>
        </div>

        <Link 
          href="/cadastro" 
          className="text-xs font-bold text-emerald-400 hover:underline bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Anunciar Meu Espaço</span>
        </Link>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 sm:mt-12 space-y-8 relative z-10">
        
        {/* Banner Superior & Filtros */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Marketplace Oficial de Salas</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Salas de Massagem & <span className="text-emerald-400 font-serif font-normal">Locais de Atendimento</span>
            </h1>

            <p className="text-xs sm:text-sm text-gray-400 font-light leading-relaxed">
              Consulte salas privativas e consultórios por hora para seus atendimentos. Espaços higienizados, com maca profissional, chuveiro aquecido e privacidade total.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-black/60 border border-white/10 p-3.5 rounded-2xl flex items-center gap-3 text-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div className="space-y-0.5">
                <span className="font-bold text-white block">{verifiedRoomsCount} Espaços Auditados</span>
                <span className="text-gray-400 text-[10px]">Isenção de taxa para os 100 primeiros Hosts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lista / Grid de Salas (Visual idêntico ao catálogo de profissionais) */}
        {(!rooms || rooms.length === 0) ? (
          <div className="bg-black/40 border border-white/10 rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto shadow-2xl my-12">
            <Building2 className="w-12 h-12 text-emerald-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Nenhum Espaço Cadastrado Ainda</h3>
            <p className="text-xs text-gray-400 font-light leading-relaxed">
              Seja o primeiro proprietário a cadastrar sua sala de atendimento em nossa vitrine e aproveite a isenção total de mensalidade!
            </p>
            <Link
              href="/cadastro"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-dark-bg font-extrabold text-xs uppercase tracking-wider hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
            >
              <Sparkles className="w-4 h-4" />
              Cadastrar Meu Espaço Grátis
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-400 pb-2">
              <span className="font-semibold text-white">Exibindo {rooms.length} salas ativas</span>
              <span className="text-[11px] text-emerald-400 font-medium">✨ Atualizado em tempo real</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          </div>
        )}

        {/* Call to Action Final para Donos de Salas */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-black/80 to-gold-primary/10 border border-emerald-500/30 p-8 rounded-3xl text-center space-y-4 shadow-2xl">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
            Quer listar suas salas e receber agendamentos por hora?
          </h2>
          <p className="text-xs sm:text-sm text-gray-300 max-w-xl mx-auto font-light leading-relaxed">
            Divulgue seu espaço para centenas de profissionais ativas da sua região. Gerencie reservas por hora, acompanhe seus ganhos e tenha isenção total na taxa de cadastro.
          </p>
          <Link
            href="/cadastro"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-bg font-extrabold text-xs uppercase tracking-wider transition-all shadow-xl shadow-emerald-500/20"
          >
            <Sparkles className="w-4 h-4" />
            Cadastrar Meu Espaço Agora (100% Grátis)
          </Link>
        </div>

      </div>
    </main>
  );
}
