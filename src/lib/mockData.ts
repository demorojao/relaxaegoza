export interface Review {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  is_verified_interaction: boolean;
  created_at: string;
}

export interface Amenity {
  id: string;
  name: string;
  slug: string;
  category: 'massage' | 'escort' | 'general';
}

export interface Advertiser {
  id: string;
  stage_name: string;
  age: number;
  gender: string;
  description: string;
  whatsapp: string;
  is_only_massage: boolean;
  is_escort: boolean;
  is_verified: boolean;
  is_space_verified: boolean;
  is_available_now: boolean;
  available_until?: string;
  latitude: number;
  longitude: number;
  neighborhood: string;
  city: string;
  rate: number; // Valor por hora
  photos: string[];
  amenities: string[];
}

export const MOCK_AMENITIES: Amenity[] = [
  // Massagens
  { id: '1', name: 'Maca Profissional', slug: 'maca-profissional', category: 'massage' },
  { id: '2', name: 'Óleos Essenciais Importados', slug: 'oleos-essenciais', category: 'massage' },
  { id: '3', name: 'Música de Relaxamento', slug: 'musica-relaxamento', category: 'massage' },
  { id: '4', name: 'Chuveiro Aquecido', slug: 'chuveiro-aquecido', category: 'massage' },
  // Acompanhantes
  { id: '5', name: 'Ar Condicionado', slug: 'ar-condicionado', category: 'escort' },
  { id: '6', name: 'Estacionamento Discreto', slug: 'estacionamento-discreto', category: 'escort' },
  { id: '7', name: 'Drinks Cortesia', slug: 'drinks', category: 'escort' },
  { id: '8', name: 'Wi-Fi de Alta Velocidade', slug: 'wifi', category: 'escort' },
  { id: '9', name: 'Aceita Cartão / Pix', slug: 'pagamento', category: 'general' },
  { id: '10', name: 'Local Próprio', slug: 'local-proprio', category: 'general' }
];

export const MOCK_ADVERTISERS: Advertiser[] = [
  // PORTA 1: Terapeutas de Massagem / Tantra (is_only_massage = true, is_escort = false)
  {
    id: 'm1',
    stage_name: 'Helena Souza',
    age: 28,
    gender: 'Feminino',
    description: 'Especialista em Massagem Tântrica e Terapia Integrativa. Formada na Índia, trago um ambiente focado no relaxamento profundo, alinhamento energético e bem-estar físico e mental. Atendimento exclusivo em sala clínica premium climatizada.',
    whatsapp: '5511999991111',
    is_only_massage: true,
    is_escort: false,
    is_verified: true,
    is_space_verified: true,
    is_available_now: true,
    latitude: -23.5616,
    longitude: -46.6560,
    neighborhood: 'Jardins',
    city: 'São Paulo',
    rate: 350,
    photos: [
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&q=80&w=600'
    ],
    amenities: ['Maca Profissional', 'Óleos Essenciais Importados', 'Música de Relaxamento', 'Chuveiro Aquecido', 'Local Próprio']
  },
  {
    id: 'm2',
    stage_name: 'Camila Brandão',
    age: 31,
    gender: 'Feminino',
    description: 'Terapia Sensual e Massagem Relaxante Nuru. Meu foco é proporcionar uma experiência sensorial única que desmistifica as tensões do dia a dia. Espaço extremamente discreto e silencioso.',
    whatsapp: '5511999992222',
    is_only_massage: true,
    is_escort: false,
    is_verified: true,
    is_space_verified: false,
    is_available_now: false,
    latitude: -23.5854,
    longitude: -46.6784,
    neighborhood: 'Itaim Bibi',
    city: 'São Paulo',
    rate: 400,
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=600'
    ],
    amenities: ['Maca Profissional', 'Óleos Essenciais Importados', 'Chuveiro Aquecido', 'Aceita Cartão / Pix']
  },
  {
    id: 'm3',
    stage_name: 'Lucas Nogueira',
    age: 26,
    gender: 'Masculino',
    description: 'Terapeuta corporal especializado em Massagem Tântrica Masculina e Massagem Desportiva Avançada. Promovo o relaxamento muscular profundo e a expansão da consciência corporal em um espaço neutro e acolhedor.',
    whatsapp: '5511999993333',
    is_only_massage: true,
    is_escort: false,
    is_verified: true,
    is_space_verified: true,
    is_available_now: true,
    latitude: -23.5489,
    longitude: -46.6388,
    neighborhood: 'Centro',
    city: 'São Paulo',
    rate: 280,
    photos: [
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=600'
    ],
    amenities: ['Maca Profissional', 'Óleos Essenciais Importados', 'Música de Relaxamento', 'Chuveiro Aquecido', 'Local Próprio', 'Aceita Cartão / Pix']
  },

  // PORTA 2: Acompanhantes / Programas (is_only_massage = false, is_escort = true)
  {
    id: 'e1',
    stage_name: 'Gabriela Prado',
    age: 23,
    gender: 'Feminino',
    description: 'Acompanhante de luxo premium para homens de negócios exigentes. Fotos 100% reais, atendimento exclusivo em local próprio de alto padrão nos Jardins. Sigilo absoluto, inteligência e companhia impecável.',
    whatsapp: '5511999994444',
    is_only_massage: false,
    is_escort: true,
    is_verified: true,
    is_space_verified: true,
    is_available_now: true,
    latitude: -23.5629,
    longitude: -46.6620,
    neighborhood: 'Jardins',
    city: 'São Paulo',
    rate: 600,
    photos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&q=80&w=600'
    ],
    amenities: ['Ar Condicionado', 'Estacionamento Discreto', 'Drinks Cortesia', 'Local Próprio', 'Aceita Cartão / Pix']
  },
  {
    id: 'e2',
    stage_name: 'Mariana Fontes',
    age: 25,
    gender: 'Feminino',
    description: 'Acompanhante liberal de alto nível. Uma combinação de charme, sensualidade e discrição. Disponível para viagens, jantares e momentos inesquecíveis. Atendo também em hotéis credenciados.',
    whatsapp: '5511999995555',
    is_only_massage: false,
    is_escort: true,
    is_verified: true,
    is_space_verified: false,
    is_available_now: true,
    latitude: -23.5902,
    longitude: -46.6710,
    neighborhood: 'Vila Olímpia',
    city: 'São Paulo',
    rate: 500,
    photos: [
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=600'
    ],
    amenities: ['Ar Condicionado', 'Estacionamento Discreto', 'Aceita Cartão / Pix']
  },
  {
    id: 'e3',
    stage_name: 'Yasmin Alencar',
    age: 22,
    gender: 'Feminino',
    description: 'Doce, carinhosa e extremamente dedicada aos desejos do meu cliente. Atendimento exclusivo em minha residência climatizada na Zona Sul. Venha relaxar com total discrição e conforto.',
    whatsapp: '5511999996666',
    is_only_massage: false,
    is_escort: true,
    is_verified: false,
    is_space_verified: true,
    is_available_now: false,
    latitude: -23.6182,
    longitude: -46.6974,
    neighborhood: 'Brooklin',
    city: 'São Paulo',
    rate: 450,
    photos: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&q=80&w=600'
    ],
    amenities: ['Ar Condicionado', 'Estacionamento Discreto', 'Drinks Cortesia', 'Local Próprio', 'Wi-Fi de Alta Velocidade', 'Aceita Cartão / Pix']
  }
];

export const MOCK_REVIEWS: Record<string, Review[]> = {
  m1: [
    {
      id: 'rev-m1-1',
      reviewer_name: 'Carlos M.',
      rating: 5,
      comment: 'Uma experiência de massagem tântrica verdadeiramente transformadora. O espaço é impecável e a Helena transmite muita seriedade e profissionalismo.',
      is_verified_interaction: true,
      created_at: '2026-05-15T18:30:00Z'
    },
    {
      id: 'rev-m1-2',
      reviewer_name: 'Arthur G.',
      rating: 5,
      comment: 'Terapeuta extremamente técnica e qualificada. Ambiente muito limpo e climatizado.',
      is_verified_interaction: false,
      created_at: '2026-05-10T14:20:00Z'
    }
  ],
  e1: [
    {
      id: 'rev-e1-1',
      reviewer_name: 'Roberto S.',
      rating: 5,
      comment: 'Excelente companhia, extremamente educada e com uma conversa inteligente maravilhosa. Recomendo sem sombra de dúvidas.',
      is_verified_interaction: true,
      created_at: '2026-05-28T22:00:00Z'
    }
  ]
};

// Funções Utilitárias para Simular a Camada de Serviço do Supabase (com isolamento estrito)
export const getAdvertisersForMassage = (): Advertiser[] => {
  // STRICT MODE: Apenas perfis onde is_only_massage = true
  return MOCK_ADVERTISERS.filter(adv => adv.is_only_massage === true);
};

export const getAdvertisersForEscorts = (): Advertiser[] => {
  // STRICT MODE: Apenas perfis onde is_escort = true e is_only_massage = false
  return MOCK_ADVERTISERS.filter(adv => adv.is_escort === true && adv.is_only_massage === false);
};

export const getAdvertiserById = (id: string, segment: 'massage' | 'escort'): Advertiser | undefined => {
  const adv = MOCK_ADVERTISERS.find(a => a.id === id);
  if (!adv) return undefined;

  // STRICT CHECK: Bloqueia perfis que não pertencem ao segmento consultado
  if (segment === 'massage' && !adv.is_only_massage) return undefined;
  if (segment === 'escort' && (!adv.is_escort || adv.is_only_massage)) return undefined;

  return adv;
};
