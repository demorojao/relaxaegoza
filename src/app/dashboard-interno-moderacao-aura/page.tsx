import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getSupabaseServiceClient } from '@/lib/supabaseServer';
import AdminDashboardClient from './AdminDashboardClient';

interface PageProps {
  searchParams: Promise<{ key?: string }>;
}

async function AdminDashboardPageContent({ searchParams }: PageProps) {
  const { key } = await searchParams;
  const secret = process.env.ADMIN_ACCESS_SECRET || 'aura-master-secure-2026';

  // Se a chave na URL (?key=...) não corresponder ao segredo do ambiente, retorna 404 (Not Found)
  // Fazendo com que a rota pareça completamente inexistente para hackers
  if (key !== secret) {
    notFound();
  }

  const supabase = getSupabaseServiceClient();
  
  // Buscar os provedores, clientes e hosts diretamente no servidor para carregamento instantâneo
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['provider', 'client', 'host'])
    .order('created_at', { ascending: false });

  // Buscar todas as salas para moderação
  const { data: rooms } = await supabase
    .from('rooms')
    .select('*, host:profiles(name)')
    .order('created_at', { ascending: false });

  // Buscar todas as fotos da galeria para moderação
  const { data: photos } = await supabase
    .from('profile_photos')
    .select('*, profiles(name, role)')
    .order('created_at', { ascending: false });

  // Buscar todos os IPs banidos
  const { data: bannedIps } = await supabase
    .from('ip_bans')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <AdminDashboardClient 
      initialProfiles={profiles || []} 
      initialRooms={rooms || []}
      initialPhotos={photos || []}
      initialBannedIps={bannedIps || []}
      adminSecret={secret}
    />
  );
}

const AdminDashboardSkeleton = () => (
  <div className="w-full h-[400px] flex flex-col items-center justify-center space-y-4">
    <div className="w-10 h-10 border-4 border-gold-primary/30 border-t-gold-primary rounded-full animate-spin" />
    <span className="text-xs text-gray-500 font-light">Carregando painel de moderação...</span>
  </div>
);

export default function AdminDashboardPage({ searchParams }: PageProps) {
  return (
    <main className="min-h-screen w-full bg-dark-bg text-gray-100 p-6 md:p-12 relative overflow-hidden selection:bg-gold-primary selection:text-dark-bg">
      {/* Decorative Lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-wine-primary/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gold-primary/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        <Suspense fallback={<AdminDashboardSkeleton />}>
          <AdminDashboardPageContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
