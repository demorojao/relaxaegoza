import React from 'react';
import { cacheLife } from 'next/cache';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
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
    { params: { state: 'sp', city: 'sao-paulo', neighborhood: 'jardins' } }
  ]
}; // Garantir navegação instantânea para melhorar Core Web Vitals (INP)

interface Props {
  params: Promise<{ state: string; city: string; neighborhood: string }>;
}

export async function generateStaticParams() {
  const supabase = getSupabaseServerClient();
  const { data: profiles } = await supabase
    .from('profiles')
    .select('city, neighborhood')
    .eq('role', 'provider');

  if (!profiles) return [];
  
  const paths: { state: string; city: string; neighborhood: string }[] = [];
  profiles.forEach(p => {
    if (p.city && p.neighborhood) {
      const citySlug = slugify(p.city);
      const stateSlug = getStateFromCity(p.city);
      const neighborhoodSlug = slugify(p.neighborhood);
      paths.push({
        state: stateSlug,
        city: citySlug,
        neighborhood: neighborhoodSlug
      });
    }
  });

  // Remover duplicados
  const uniquePaths = paths.filter((value, index, self) =>
    index === self.findIndex((t) => t.state === value.state && t.city === value.city && t.neighborhood === value.neighborhood)
  );

  return uniquePaths;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state, city, neighborhood } = await params;
  const neighborhoodFormated = neighborhood.replace('-', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase());
  const cityFormated = city.replace('-', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase());
  const stateFormated = state.toUpperCase();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://relaxe e goze.com.br';

  return {
    title: `Acompanhantes de Luxo e Massagistas de Elite no ${neighborhoodFormated} - ${cityFormated} ${stateFormated} | Relaxe & Goze`,
    description: `Conecte-se com acompanhantes de luxo, massoterapeutas de elite e profissionais VIP de alto padrão no bairro ${neighborhoodFormated} em ${cityFormated} (${stateFormated}). Fotos 100% reais, discrição absoluta e atendimento exclusivo.`,
    alternates: {
      canonical: `${baseUrl}/${state}/${city}/${neighborhood}`,
    },
    robots: {
      index: true,
      follow: true,
    }
  };
}

export default async function NeighborhoodPage({ params }: Props) {
  'use cache';
  cacheLife('hours'); // Equivale ao revalidate = 3600 (ISR de 1 hora) no modelo Cache Components
  const { state: stateSlug, city: citySlug, neighborhood: neighborhoodSlug } = await params;
  const { city: cityName, neighborhood: neighborhoodName } = await getOriginalLocationNames(citySlug, neighborhoodSlug);

  const supabase = getSupabaseServerClient();

  // Buscar os perfis filtrados pelo bairro e cidade usando o RPC altamente otimizado get_premium_profiles
  const { data: profilesData, error: profilesError } = await supabase.rpc('get_premium_profiles', {
    p_city_slug: citySlug,
    p_neighborhood_slug: neighborhoodSlug
  });

  if (profilesError) {
    console.error('Erro ao buscar perfis no bairro via RPC:', profilesError);
  }

  const filteredProfiles = (profilesData as unknown as Profile[]) || [];

  // Retornar 404 se não houver perfis correspondentes
  if (filteredProfiles.length === 0) {
    notFound();
  }

  // Buscar apenas cidade e bairro de forma otimizada para os links semânticos (bairros irmãos)
  const { data: siblingsData } = await supabase
    .from('profiles')
    .select('city, neighborhood')
    .eq('role', 'provider');

  const siblingsList = siblingsData || [];

  // Agrupar bairros irmãos/ativos na MESMA cidade (silo semântico rígido)
  const siblingNeighborhoodsMap = new Map<string, string>();
  siblingsList.forEach(p => {
    if (p.city && slugify(p.city) === citySlug && p.neighborhood && slugify(p.neighborhood) !== neighborhoodSlug) {
      siblingNeighborhoodsMap.set(slugify(p.neighborhood), p.neighborhood);
    }
  });
  
  const siblingNeighborhoods = Array.from(siblingNeighborhoodsMap.entries()).map(([slug, name]) => ({
    name,
    slug
  }));

  // Estatísticas locais para o bloco EEAT
  const prices = filteredProfiles.map(p => Number(p.price_per_hour)).filter(p => p > 0);
  const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  const verifiedCount = filteredProfiles.filter(p => p.verification_status === 'verified').length;
  const hasLocalSpace = filteredProfiles.some(p => p.amenities?.includes('Local Próprio'));

  const cityFormated = citySlug.replace('-', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase());
  const neighborhoodFormated = neighborhoodSlug.replace('-', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase());

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": `Portal Acompanhantes Premium ${neighborhoodFormated}`,
    "description": `Catálogo de profissionais independentes localizadas no quadrante de ${neighborhoodFormated}, ${cityFormated}.`,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": cityFormated,
      "addressRegion": stateSlug.toUpperCase(),
      "addressCountry": "BR",
      "sublocality": neighborhoodFormated
    },
    "priceRange": "$$"
  };

  return (
    <main className="min-h-screen w-full bg-dark-bg text-gray-100 pb-24 selection:bg-gold-primary selection:text-dark-bg relative overflow-hidden">
      {/* Schema.org JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      {/* Ambient Aurora Glow Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[-15%] w-[500px] h-[500px] bg-wine-primary/10 blur-[130px] rounded-full" />
        <div className="absolute bottom-[5%] right-[-10%] w-[600px] h-[600px] bg-gold-primary/5 blur-[140px] rounded-full" />
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-black/60 backdrop-blur-lg border-b border-white/5 px-4 sm:px-6 py-4 flex items-center justify-between">
        <Logo />
        
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Link href={`/${stateSlug}/${citySlug}`} className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors">
            <MapPin className="w-4 h-4 text-gold-primary" />
            <span>Ver em {cityName}</span>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 mt-8 relative z-10 space-y-12">
        {/* Breadcrumbs - Crucial para navegação semântica de silos */}
        <nav className="flex items-center gap-2 text-xs text-gray-500">
          <Link href="/" className="hover:text-white transition-colors">Relaxe & Goze</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-400 uppercase font-medium">{stateSlug}</span>
          <ChevronRight className="w-3 h-3" />
          <Link href={`/${stateSlug}/${citySlug}`} className="hover:text-white transition-colors">{cityName}</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-300 font-medium">{neighborhoodName}</span>
        </nav>

        {/* Hero / Header SEO */}
        <div className="text-center sm:text-left space-y-4 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-semibold text-white tracking-tight leading-tight">
            Acompanhantes de Luxo e Massagistas de Elite no <span className="text-gold-primary font-serif font-normal">{neighborhoodFormated}</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed font-light font-sans">
            Encontre acompanhantes de luxo, profissionais VIP e terapias exclusivas que atendem diretamente no bairro {neighborhoodName} ({cityName}). 
            Exibimos apenas perfis de alto padrão com galeria de fotos autêntica, garantindo discrição total e facilidade de agendamento pelo WhatsApp.
          </p>
        </div>

        {/* Vitrine Grid - Exclusivamente restrita ao Bairro */}
        <section className="space-y-6">
          <div className="flex justify-between items-baseline border-b border-white/5 pb-3">
            <h2 className="text-lg font-medium text-white tracking-wide">
              Anúncios Ativos em {neighborhoodName}
            </h2>
            <span className="text-xs text-gray-500 font-light">{filteredProfiles.length} resultados</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
            {filteredProfiles.map(profile => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </div>
        </section>

        {/* EEAT Block (Otimização Semântica baseada nas intenções de busca locais) */}
        <section className="border-t border-white/5 pt-12 space-y-8">
          <div className="max-w-3xl space-y-4">
            <h3 className="text-2xl font-serif text-white tracking-wide">
              Guia de Atendimentos no {neighborhoodName}
            </h3>
            <p className="text-gray-400 text-xs leading-relaxed font-light">
              O bairro {neighborhoodName} é um dos polos mais sofisticados de {cityName}, conhecido por abrigar hotéis de alto padrão, centros corporativos e residências discretas. Para clientes que buscam facilidade de deslocamento e máxima privacidade, planejar seu agendamento nesta região traz benefícios únicos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Preços Médios */}
            <div className="bg-black/35 border border-white/5 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-gold-light text-xs font-semibold uppercase tracking-wider">
                <DollarSign className="w-4.5 h-4.5" />
                Valores de Referência
              </div>
              <p className="text-gray-400 text-[11px] leading-relaxed font-light">
                {avgPrice > 0 ? (
                  <>O preço médio para sessões e atendimentos de luxo no {neighborhoodName} está em torno de <strong>R$ {avgPrice}/hora</strong>, alinhado ao padrão de exclusividade da região.</>
                ) : (
                  <>Os valores variam conforme a experiência e os diferenciais de cada profissional, mantendo o padrão premium.</>
                )}
              </p>
            </div>

            {/* 2. Privacidade e Acesso */}
            <div className="bg-black/35 border border-white/5 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-wine-light text-xs font-semibold uppercase tracking-wider">
                <Building2 className="w-4.5 h-4.5" />
                Privacidade & Infraestrutura
              </div>
              <p className="text-gray-400 text-[11px] leading-relaxed font-light font-sans">
                {hasLocalSpace ? (
                  <>Diversos profissionais no {neighborhoodName} possuem local próprio luxuoso equipado com itens como ar condicionado, aromatização especial e estacionamento discreto.</>
                ) : (
                  <>Os atendimentos na região são efetuados em local a combinar ou via delivery de forma totalmente discreta e com segurança profissional.</>
                )}
              </p>
            </div>

            {/* 3. Confiança e Qualidade */}
            <div className="bg-black/35 border border-white/5 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                <ShieldCheck className="w-4.5 h-4.5" />
                Fotos 100% Verificadas
              </div>
              <p className="text-gray-400 text-[11px] leading-relaxed font-light">
                Contamos com {verifiedCount} profissionais com foto verificada no {neighborhoodName}, garantindo segurança técnica absoluta nas interações.
              </p>
            </div>
          </div>

          {/* SGE & EEAT Semantics Showcase */}
          <div className="bg-black/20 border border-white/5 rounded-2xl p-6 space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Garantias Relaxe & Goze para {neighborhoodName}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl text-[10px] font-semibold text-gold-light">
                Fotos 100% Verificadas
              </div>
              <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl text-[10px] font-semibold text-wine-light">
                Atendimento Independente
              </div>
              <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl text-[10px] font-semibold text-emerald-400">
                Discrição Garantida
              </div>
              <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl text-[10px] font-semibold text-white">
                Painel em Tempo Real
              </div>
            </div>
          </div>

          {/* Sibling Silo footer links - Restringido apenas à mesma Cidade */}
          {siblingNeighborhoods.length > 0 && (
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 space-y-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gold-primary" />
                Outros Bairros em {cityName}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {siblingNeighborhoods.map(sn => (
                  <Link 
                    key={sn.slug} 
                    href={`/${stateSlug}/${citySlug}/${sn.slug}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10 hover:border-gold-primary/40 hover:bg-gold-primary/5 transition-all text-xs text-gray-300 hover:text-white group"
                  >
                    <span className="truncate">{sn.name}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Breadcrumb de volta para silo mãe */}
          <div className="flex justify-center pt-8">
            <Link 
              href={`/${stateSlug}/${citySlug}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:border-gold-primary bg-white/5 hover:bg-gold-primary/10 text-xs font-bold uppercase tracking-wider text-white transition-all"
            >
              Ver todas as modelos de {cityName}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
