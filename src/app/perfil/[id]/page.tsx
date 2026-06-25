import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { cacheLife } from 'next/cache';
import { Suspense } from 'react';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { getStateFromCity } from '@/lib/slugify';
import ProfileDetailsClient from './ProfileDetailsClient';
import Logo from '@/components/Logo';

interface Props {
  params: Promise<{ id: string }>;
}

async function getCachedProfile(id: string) {
  'use cache';
  cacheLife('seconds');
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('profiles')
    .select(`
      *,
      specialties:profile_specialties(specialties(name))
    `)
    .eq('id', id)
    .single();
  return data;
}

async function getCachedPhotos(profileId: string) {
  'use cache';
  cacheLife('seconds');
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('profile_photos')
    .select('*')
    .eq('profile_id', profileId);
  return data || [];
}

async function getCachedReviews(providerId: string) {
  'use cache';
  cacheLife('seconds');
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from('reviews')
    .select(`
      id, rating_massage, rating_service, rating_environment, comment, is_verified_interaction, created_at,
      client:profiles!reviews_client_id_fkey(name, verification_status)
    `)
    .eq('provider_id', providerId);
  return data || [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const profile = await getCachedProfile(id);

  if (!profile) {
    return {
      title: 'Perfil Não Encontrado - Relaxa & Goza',
    };
  }

  const title = `${profile.name}, ${profile.age} anos - Relaxa & Goza`;
  const location = profile.neighborhood ? `${profile.neighborhood}, ${profile.city}` : profile.city;
  const description = `${profile.name} - Atendimento de luxo em ${location}. Veja fotos reais, comodidades, avaliações e entre em contato direto pelo WhatsApp.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: profile.avatar_url ? [{ url: profile.avatar_url }] : [],
    },
  };
}

async function ProfilePageContent({ params }: Props) {
  const { id } = await params;

  // 1. Buscar perfil no servidor
  const profile = await getCachedProfile(id);

  if (!profile) {
    notFound();
  }

  // 2. Buscar fotos da galeria no servidor
  const photos = await getCachedPhotos(id);

  // 3. Buscar avaliações no servidor
  const reviews = await getCachedReviews(id);

  const location = profile.neighborhood ? `${profile.neighborhood}, ${profile.city}` : profile.city;
  const description = `${profile.name} - Atendimento de luxo em ${location}. Veja fotos reais, comodidades, avaliações e entre em contato direto pelo WhatsApp.`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: profile.name,
    description: description,
    image: profile.avatar_url,
    address: {
      '@type': 'PostalAddress',
      addressLocality: profile.city,
      addressRegion: getStateFromCity(profile.city).toUpperCase(),
      addressCountry: 'BR',
      sublocality: profile.neighborhood || undefined,
    },
  };

  return (
    <>
      {/* Add JSON-LD dynamic structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      {/* Header Fixo */}
      <div className="sticky top-0 z-40 bg-black/60 backdrop-blur-lg border-b border-white/5 px-4 sm:px-6 py-3.5 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium hidden sm:inline">Voltar</span>
        </Link>
        <div className="font-semibold text-white tracking-wide truncate flex-1 text-center pr-6 sm:pr-0">
          {profile.name}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-8 space-y-12">
        <ProfileDetailsClient
          id={id}
          initialProfile={profile}
          initialPhotos={photos}
          initialReviews={reviews}
        />
      </div>

      <footer className="w-full bg-black/80 border-t border-white/5 py-12 px-6 mt-16 relative z-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-white/5">
            <Logo />
            <div className="flex flex-wrap gap-4 sm:gap-8 text-xs text-gray-400">
              <Link href="/termos-de-uso" className="hover:text-gold-light transition-colors">
                Termos de Uso
              </Link>
              <Link href="/cadastro" className="hover:text-gold-light transition-colors">
                Cadastrar Anúncio
              </Link>
              <Link href="/" className="hover:text-gold-light transition-colors">
                Voltar para Vitrine
              </Link>
            </div>
          </div>
          
          <div className="space-y-4 text-[11px] sm:text-xs text-gray-500 leading-relaxed">
            <p className="font-semibold text-gray-400">Aviso Legal:</p>
            <p>
              Este site é uma plataforma de classificados online destinada exclusivamente à veiculação de publicidade para maiores de 18 anos. Não agenciamos, não intermediamos e não participamos de qualquer transação financeira entre usuários e anunciantes. Em conformidade com a legislação brasileira, repudiamos e proibimos qualquer forma de exploração sexual ou cafetinagem.
            </p>
            <p>
              Os anunciantes utilizam a plataforma de forma autônoma na modalidade Software as a Service (SaaS) nos termos do Artigo 19 do Marco Civil da Internet (Lei 12.965/14). A responsabilidade pelas informações, imagens e serviços veiculados é integralmente da pessoa maior de idade que criou o anúncio.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}

const ProfileDetailsSkeleton = () => (
  <div className="w-full flex flex-col justify-start items-center pt-24 space-y-8">
    <div className="w-10 h-10 border-4 border-gold-primary/30 border-t-gold-primary rounded-full animate-spin" />
    <span className="text-xs text-gray-500 font-light">Carregando detalhes do perfil...</span>
  </div>
);

export default function ProfilePage({ params }: Props) {
  return (
    <main className="min-h-screen w-full bg-dark-bg text-gray-100 pb-20 selection:bg-gold-primary selection:text-dark-bg">
      <Suspense fallback={<ProfileDetailsSkeleton />}>
        <ProfilePageContent params={params} />
      </Suspense>
    </main>
  );
}
