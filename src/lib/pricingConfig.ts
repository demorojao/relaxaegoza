/**
 * CONFIGURAÇÃO CENTRAL DE PREÇOS, PLANOS E PROMOÇÕES
 * 
 * Altere este arquivo para modificar preços, prazos, bônus e promoções de lançamento
 * de forma centralizada em todo o portal Relaxe & Goze.
 */

export interface PlanConfig {
  key: string;
  name: string;
  days: number;
  basePriceCents: number; // Valor em centavos (ex: 39900 = R$ 399,00)
  formattedBasePrice: string;
  periodLabel: string;
  dailyEquivalent: string;
  description: string;
  features: string[];
  badge: string;
  highlight: boolean;
  buttonText: string;
  accentColor: string;
}

export interface PromoConfig {
  active: boolean;
  maxProviderRank: number; // As X primeiras anunciantes elegíveis
  type: 'free_first_month' | 'percent_discount';
  discountPercent: number; // Caso o tipo seja 'percent_discount' (ex: 30)
  bannerTitle: string;
  bannerDescription: (count: number) => string;
  bannerBadge: string;
}

export const LAUNCH_PROMO: PromoConfig = {
  active: true,
  maxProviderRank: 100,
  type: 'free_first_month',
  discountPercent: 0,
  bannerTitle: '🔥 Oferta Especial de Lançamento!',
  bannerDescription: (count: number) => 
    `As 100 primeiras anunciantes ganham o 1º Mês (30 dias) 100% GRÁTIS no Plano Gold Premium! (${count}/100 vagas ocupadas)`,
  bannerBadge: '🎁 1º MÊS GRÁTIS ATIVO'
};

export const PLANS_CONFIG: Record<string, PlanConfig> = {
  gold_7d: {
    key: 'gold_7d',
    name: 'Gold (7 Dias)',
    days: 7,
    basePriceCents: 12900,
    formattedBasePrice: 'R$ 129,00',
    periodLabel: '/ 7 dias',
    dailyEquivalent: 'Apenas R$ 18,42 / dia',
    description: 'Perfeito para testar a vitrine e garantir um impulso rápido no topo com investimento mínimo.',
    badge: 'Ideal para Experimentar',
    highlight: false,
    buttonText: 'Assinar Gold (7 Dias)',
    accentColor: 'border-gold-primary/40 bg-gold-primary/[0.02] hover:border-gold-primary/70',
    features: [
      'Destaque Máximo Gold na busca e vitrine principal da cidade',
      '1 Boost de 6h GRÁTIS incluso para horários de pico (R$ 59,90 de bônus) 🚀',
      'Galeria HD de Fotos & Vídeos (Estilo Fatal Model / Alta Qualidade)',
      'Selo Gold VIP Reluzente com Anel Neon na foto de perfil',
      'Exclusividade de publicar Vídeos nos Stories Efêmeros 🎥',
      'Botão "Disponível Agora" com efeito neon ativo',
      'Marca D\'água personalizada nas fotos para proteção contra print/plágio',
      'Atendimento e Suporte prioritário via WhatsApp'
    ]
  },
  gold_14d: {
    key: 'gold_14d',
    name: 'Gold (14 Dias)',
    days: 14,
    basePriceCents: 22900,
    formattedBasePrice: 'R$ 229,00',
    periodLabel: '/ 14 dias (Quinzenal)',
    dailyEquivalent: 'Apenas R$ 16,35 / dia',
    description: 'O plano perfeito para quinzenas movimentadas com alto fluxo de chamadas e mensagens.',
    badge: 'Quinzenal Vantajoso',
    highlight: false,
    buttonText: 'Assinar Gold (14 Dias)',
    accentColor: 'border-gold-primary/60 bg-gold-primary/[0.03] hover:border-gold-primary/80',
    features: [
      'Destaque Máximo Gold na busca e vitrine principal da cidade',
      '2 Boosts de 6h GRÁTIS inclusos no período (R$ 119,80 em bônus) 🚀',
      'Galeria Ilimitada de Fotos & Vídeos HD com Alta Resolução',
      'Exclusividade de publicar Vídeos nos Stories Efêmeros 🎥',
      'Calculadora de Metas Financeiras & Progresso Diário 📊',
      'Botão "Disponível Agora" com borda neon vibrante',
      'Selo de Perfil Validado e Autêntico no portal',
      'Proteção de Mídia e Marca D\'água Anti-Cópia',
      'Suporte Prioritário VIP 24/7'
    ]
  },
  gold_30d: {
    key: 'gold_30d',
    name: 'Gold (30 Dias)',
    days: 30,
    basePriceCents: 39900,
    formattedBasePrice: 'R$ 399,00',
    periodLabel: '/ 30 dias (1 mês)',
    dailyEquivalent: 'Apenas R$ 13,30 / dia',
    description: 'O plano Campeão de Vendas! Presença digital contínua no topo com a máxima visibilidade.',
    badge: 'Mais Vendido ⭐',
    highlight: true,
    buttonText: 'Assinar Gold (30 Dias)',
    accentColor: 'border-gold-primary shadow-[0_15px_40px_-15px_rgba(197,168,128,0.35)] bg-gradient-to-b from-gold-primary/[0.12] via-gold-primary/[0.04] to-transparent',
    features: [
      'Destaque Máximo Gold Absoluto no topo da busca durante 1 mês inteiro',
      '4 Boosts de 6h GRÁTIS (1 por semana) inclusos (R$ 239,60 em bônus) 🚀',
      'Destaque Premium com Pin Dourado Neon no Mapa Interativo 📍',
      'Galeria Ilimitada de Fotos & Vídeos HD sem restrição',
      'Estatísticas avançadas de tráfego, cliques e visualizações no WhatsApp 📊',
      'Exclusividade de Vídeos em HD nos Stories Efêmeros 🎥',
      'Maior economia em relação aos planos semanal e quinzenal',
      'Assessoria VIP dedicada de posicionamento de anúncio'
    ]
  }
};

export const HOST_PLAN_CONFIG = {
  basePriceCents: 49900,
  formattedBasePrice: 'R$ 499,00 / mês',
  maxFreeHosts: 100
};

export const BOOST_PACKAGES_CONFIG = [
  { hours: 2, priceCents: 2990, formattedPrice: 'R$ 29,90', label: '2 horas', description: 'Impulso rápido para o horário de pico', icon: '⚡', highlight: false },
  { hours: 6, priceCents: 5990, formattedPrice: 'R$ 59,90', label: '6 horas', description: 'Meio dia no topo da vitrine', icon: '🔥', highlight: true },
  { hours: 12, priceCents: 9990, formattedPrice: 'R$ 99,90', label: '12 horas', description: 'Um dia inteiro em destaque', icon: '👑', highlight: false },
];

/**
 * Calcula o preço final em centavos considerando a promoção ativa para uma anunciante
 */
export function calculateTierPriceCents(tierKey: string, providerRank: number | null): { amountCents: number; isFreePromo: boolean } {
  const config = PLANS_CONFIG[tierKey] || (tierKey === 'gold' || tierKey === 'pro' ? PLANS_CONFIG.gold_30d : null);
  const baseAmount = config ? config.basePriceCents : 39900;

  const isEligible = LAUNCH_PROMO.active && providerRank !== null && providerRank <= LAUNCH_PROMO.maxProviderRank;

  if (isEligible) {
    if (LAUNCH_PROMO.type === 'free_first_month') {
      const isMonthly = ['pro', 'gold', 'gold_30d'].includes(tierKey);
      if (isMonthly) {
        return { amountCents: 0, isFreePromo: true };
      }
    } else if (LAUNCH_PROMO.type === 'percent_discount') {
      const factor = (100 - LAUNCH_PROMO.discountPercent) / 100;
      return { amountCents: Math.round(baseAmount * factor), isFreePromo: false };
    }
  }

  return { amountCents: baseAmount, isFreePromo: false };
}
