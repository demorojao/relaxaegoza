import React from 'react';
import { cacheLife } from 'next/cache';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, DollarSign, ShieldCheck, Sparkles, Building2, ChevronRight, Home as HomeIcon } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import { slugify, getStateFromCity } from '@/lib/slugify';
import { getOriginalLocationNames } from '@/lib/locationServer';
import { Profile } from '@/types';
import ProfileCard from '@/components/ProfileCard';
import Logo from '@/components/Logo';

export const unstable_instant = {
  prefetch: 'runtime',
  samples: [
    { params: { state: 'sp', city: 'sao-paulo' } }
  ]
}; // Garantir navegação instantânea para melhorar Core Web Vitals (INP)

interface Props {
  params: Promise<{ state: string; city: string }>;
}

export async function generateStaticParams() {
  const supabase = getSupabaseServerClient();
  const { data: profiles } = await supabase
    .from('profiles')
    .select('city')
    .eq('role', 'provider');

  if (!profiles) return [];
  
  const paths = profiles
    .filter(p => p.city)
    .map(p => {
      const citySlug = slugify(p.city);
      const stateSlug = getStateFromCity(p.city);
      return { state: stateSlug, city: citySlug };
    });

  // Remover caminhos duplicados
  const uniquePaths = paths.filter((value, index, self) =>
    index === self.findIndex((t) => t.state === value.state && t.city === value.city)
  );

  return uniquePaths;
}

export async function generateMetadata({ params }: Props) {
  const { state: stateSlug, city: citySlug } = await params;
  const { city: cityName } = await getOriginalLocationNames(citySlug);
  const stateFormated = stateSlug.toUpperCase();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://relaxe e goze.com.br';

  const title = `Acompanhantes, Garotas de Programa e Massagistas em ${cityName} - ${stateFormated} | Relaxe & Goze`;
  const description = `Encontre acompanhantes, garotas de programa independentes e massagistas sensuais em ${cityName} (${stateFormated}). Perfis de elite com fotos reais verificadas por selfie e WhatsApp direto.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
    alternates: {
      canonical: `${baseUrl}/${stateSlug}/${citySlug}`,
    },
    robots: {
      index: true,
      follow: true,
    }
  };
}

export default async function CityPage({ params }: Props) {
  'use cache';
  cacheLife('hours'); // Equivale ao revalidate = 3600 (ISR de 1 hora) no modelo Cache Components
  const { state: stateSlug, city: citySlug } = await params;
  const { city: cityName } = await getOriginalLocationNames(citySlug);

  const supabase = getSupabaseServerClient();

  // Buscar os perfis da cidade usando o RPC altamente otimizado get_premium_profiles
  const { data: profilesData, error: profilesError } = await supabase.rpc('get_premium_profiles', {
    p_city_slug: citySlug
  });

  if (profilesError) {
    console.error('Erro ao buscar perfis na cidade via RPC:', profilesError);
  }

  const cityProfiles = (profilesData as unknown as Profile[]) || [];

  // Se não existirem perfis na cidade e o slug não for um padrão, retornar 404
  if (cityProfiles.length === 0 && citySlug !== 'sao-paulo') {
    notFound();
  }

  // Agrupar bairros ativos nessa cidade
  const neighborhoodsMap = new Map<string, string>();
  cityProfiles.forEach(p => {
    if (p.neighborhood) {
      neighborhoodsMap.set(slugify(p.neighborhood), p.neighborhood);
    }
  });
  
  const neighborhoods = Array.from(neighborhoodsMap.entries()).map(([slug, name]) => ({
    name,
    slug
  }));

  // Calcular estatísticas para o EEAT
  const prices = cityProfiles.map(p => Number(p.price_per_hour)).filter(p => p > 0);
  const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  const verifiedCount = cityProfiles.filter(p => p.verification_status === 'verified').length;
  const spaceVerifiedCount = cityProfiles.filter(p => p.is_space_verified).length;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": `Portal Acompanhantes Premium ${cityName}`,
    "description": `Catálogo de profissionais independentes localizadas em ${cityName}, ${stateSlug.toUpperCase()}.`,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": cityName,
      "addressRegion": stateSlug.toUpperCase(),
      "addressCountry": "BR"
    },
    "priceRange": "$$"
  };

  return (
    <main className="min-h-screen w-full bg-dark-bg text-gray-100 pb-24 selection:bg-gold-primary selection:text-dark-bg relative overflow-hidden">
      {/* Schema.org JSON-LD microdata */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      {/* Ambient Aurora Glow Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[5%] left-[-15%] w-[600px] h-[600px] bg-wine-primary/10 blur-[140px] rounded-full" />
        <div className="absolute bottom-[10%] right-[-15%] w-[700px] h-[700px] bg-gold-primary/5 blur-[150px] rounded-full" />
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-black/60 backdrop-blur-lg border-b border-white/5 px-4 sm:px-6 py-4 flex items-center justify-between">
        <Logo />
        
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Link href="/" className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
            <HomeIcon className="w-4 h-4" />
            <span>Página Inicial</span>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 mt-8 relative z-10 space-y-12">
        {/* Breadcrumbs com o Estado */}
        <nav className="flex items-center gap-2 text-xs text-gray-500">
          <Link href="/" className="hover:text-white transition-colors">Relaxe & Goze</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-400 uppercase font-medium">{stateSlug}</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-300 font-medium">{cityName}</span>
        </nav>

        {/* Hero / Header SEO */}
        <div className="text-center sm:text-left space-y-4 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-semibold text-white tracking-tight leading-tight">
            Acompanhantes, Garotas de Programa e Massagistas em <span className="text-gold-primary font-serif font-normal">{cityName} - {stateSlug.toUpperCase()}</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed font-light font-sans">
            Encontre as melhores profissionais de elite e serviços de massagem luxo em {cityName} ({stateSlug.toUpperCase()}). 
            Navegue por perfis com fotos 100% reais e verificadas por selfie, agende atendimentos com total discrição e segurança direto pelo WhatsApp.
          </p>
        </div>

        {/* Silos de Bairros (Authority Distribution) */}
        {neighborhoods.length > 0 && (
          <section className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gold-primary" />
              Selecione o Bairro para Atendimento em {cityName}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {neighborhoods.map(n => (
                <Link 
                  key={n.slug} 
                  href={`/${stateSlug}/${citySlug}/${n.slug}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10 hover:border-gold-primary/40 hover:bg-gold-primary/5 transition-all text-xs text-gray-300 hover:text-white group"
                >
                  <span className="truncate">{n.name}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Vitrine Grid */}
        <section className="space-y-6">
          <div className="flex justify-between items-baseline border-b border-white/5 pb-3">
            <h2 className="text-lg font-medium text-white tracking-wide">
              Profissionais Disponíveis em {cityName}
            </h2>
            <span className="text-xs text-gray-500 font-light">{cityProfiles.length} resultados</span>
          </div>

          {cityProfiles.length === 0 ? (
            <div className="text-center py-20 bg-black/20 rounded-2xl border border-white/5">
              <p className="text-gray-500 text-sm">Nenhuma profissional cadastrada ativa nesta região no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
              {cityProfiles.map(profile => (
                <ProfileCard key={profile.id} profile={profile} />
              ))}
            </div>
          )}
        </section>

        {/* EEAT & Semantic Content block (Otimização para IA/SGE) */}
        <section className="border-t border-white/5 pt-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="space-y-6">
            <h2 className="text-2xl font-serif text-white tracking-wide">
              Informações sobre Atendimentos em {cityName}
            </h2>
            <p className="text-gray-400 text-xs leading-relaxed font-light">
              O mercado de serviços premium de bem-estar e entretenimento em {cityName} ({stateSlug.toUpperCase()}) destaca-se pela alta qualidade de suas profissionais e infraestruturas discretas. O Relaxe & Goze atua como o principal catálogo técnico e seguro da região, oferecendo transparência total para os clientes e segurança jurídica e física para os anunciantes.
            </p>
            
            {avgPrice > 0 && (
              <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-gold-primary/10 text-gold-light">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-semibold block">Preço Médio da Região</span>
                  <span className="text-sm font-bold text-white">R$ {avgPrice} / hora</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-black/35 border border-white/5 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                Segurança & Verificação
              </div>
              <p className="text-gray-400 text-[11px] leading-relaxed font-light">
                Com {verifiedCount} perfis com selo de identidade verificado, garantimos a você a tranquilidade de que a profissional condiz 100% com as fotos expostas na vitrine.
              </p>
            </div>

            <div className="bg-black/35 border border-white/5 rounded-2xl p-5 space-y-2">
              <div className="flex items-center gap-2 text-gold-light text-xs font-semibold uppercase tracking-wider">
                <Building2 className="w-4 h-4" />
                Locais Auditados
              </div>
              <p className="text-gray-400 text-[11px] leading-relaxed font-light">
                Contamos com {spaceVerifiedCount} espaços físicos com selo de Ambiente Auditado. Locais com garagem discreta, ar condicionado e chuveiro limpo.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
