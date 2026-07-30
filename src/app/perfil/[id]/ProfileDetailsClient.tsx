'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  MapPin, 
  DollarSign, 
  Star, 
  CheckCircle, 
  MessageCircle, 
  ShieldCheck, 
  Building2, 
  User, 
  UserCheck,
  Trophy,
  Wind,
  Wifi,
  Car,
  Coffee,
  Bath,
  Music,
  CreditCard,
  Sparkles,
  Lock,
  Unlock,
  Crown,
  X,
  Play,
  Video,
  Eye,
  AlertTriangle,
  Clock,
  FileImage,
  ChevronLeft,
  ChevronRight,
  Share2,
  Copy,
  Check
} from 'lucide-react';
import { formatWhatsAppLink, cleanDescription } from '@/lib/utils';
import { triggerRevalidate } from '@/lib/revalidate';
import { getCDNUrl } from '@/lib/mediaHelper';
import ReportModal from '@/components/ReportModal';
import Watermark from '@/components/Watermark';
import ImageLightboxModal from '@/components/ImageLightboxModal';

const AVAILABLE_TAGS = ['Educada', 'Simpática', 'Ambiente Cheiroso', 'Excelente Massagem', 'Fiel às Fotos', 'Higiene Nota 10', 'Ótimo Atendimento'];

const getStatusExpediente = (businessHours: any) => {
  if (!businessHours || typeof businessHours !== 'object' || Object.keys(businessHours).length === 0) {
    return { status: 'Indisponível', next: null };
  }

  // Obter hora atual em SP (UTC-3)
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const spTime = new Date(utc + (3600000 * -3));

  const daysMap: Record<number, string> = {
    0: 'Dom',
    1: 'Seg',
    2: 'Ter',
    3: 'Qua',
    4: 'Qui',
    5: 'Sex',
    6: 'Sab'
  };

  const currentDay = daysMap[spTime.getDay()];
  const currentHour = spTime.getHours();
  const currentMin = spTime.getMinutes();
  const currentMinutesTotal = currentHour * 60 + currentMin;

  const todayInfo = businessHours[currentDay];

  if (todayInfo && todayInfo.active) {
    const [startHour, startMin] = (todayInfo.start || '09:00').split(':').map(Number);
    const [endHour, endMin] = (todayInfo.end || '18:00').split(':').map(Number);

    const startTotal = startHour * 60 + startMin;
    const endTotal = endHour * 60 + endMin;

    if (endTotal < startTotal) {
      if (currentMinutesTotal >= startTotal || currentMinutesTotal < endTotal) {
        return { status: 'Em expediente', next: null };
      }
    } else {
      if (currentMinutesTotal >= startTotal && currentMinutesTotal < endTotal) {
        return { status: 'Em expediente', next: null };
      }
    }
  }

  const daysOfWeek = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];
  const dayIndexInWeek = spTime.getDay() === 0 ? 6 : spTime.getDay() - 1;

  for (let i = 0; i < 7; i++) {
    const checkIdx = (dayIndexInWeek + i) % 7;
    const checkDayName = daysOfWeek[checkIdx];
    const checkInfo = businessHours[checkDayName];

    if (checkInfo && checkInfo.active) {
      if (i === 0) {
        const [startHour, startMin] = (checkInfo.start || '09:00').split(':').map(Number);
        const startTotal = startHour * 60 + startMin;
        if (currentMinutesTotal < startTotal) {
          return { status: 'Indisponível', next: `${checkDayName} às ${checkInfo.start}` };
        }
      } else {
        return { status: 'Indisponível', next: `${checkDayName} às ${checkInfo.start}` };
      }
    }
  }

  return { status: 'Indisponível', next: null };
};

function formatScheduleGrouped(hours: Record<string, { active: boolean; start?: string; end?: string }>) {
  if (!hours || typeof hours !== 'object') return [];

  const days = [
    { key: 'Seg', label: 'Seg' },
    { key: 'Ter', label: 'Ter' },
    { key: 'Qua', label: 'Qua' },
    { key: 'Qui', label: 'Qui' },
    { key: 'Sex', label: 'Sex' },
    { key: 'Sab', label: 'Sáb' },
    { key: 'Dom', label: 'Dom' }
  ];

  const groups: Array<{ startDay: string; endDay: string; active: boolean; start?: string; end?: string }> = [];

  days.forEach((dayObj) => {
    const info = hours[dayObj.key] || { active: false };
    const lastGroup = groups[groups.length - 1];

    if (
      lastGroup &&
      lastGroup.active === info.active &&
      lastGroup.start === info.start &&
      lastGroup.end === info.end
    ) {
      lastGroup.endDay = dayObj.label;
    } else {
      groups.push({
        startDay: dayObj.label,
        endDay: dayObj.label,
        active: info.active,
        start: info.start,
        end: info.end
      });
    }
  });

  return groups.map((g) => {
    const dayText = g.startDay === g.endDay ? g.startDay : `${g.startDay} a ${g.endDay}`;
    const timeText = g.active && g.start && g.end ? `${g.start} às ${g.end}` : 'Folga';
    return { dayText, timeText, active: g.active };
  });
}

// Componente de Conteúdo Exclusivo para o perfil público
// Componente de Conteúdo Exclusivo (Clube VIP) para o perfil público
function PremiumSection({ providerId, providerName, subscriptionPriceCents, currentUser, whatsapp }: { providerId: string; providerName: string; subscriptionPriceCents?: number; currentUser?: any; whatsapp?: string }) {
  const [medias, setMedias] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  const [subExpiresAt, setSubExpiresAt] = React.useState<string | null>(null);
  const [subscribing, setSubscribing] = React.useState(false);
  const [activeMediaPreview, setActiveMediaPreview] = React.useState<{ url: string; type: 'photo' | 'video' } | null>(null);

  const priceFormatted = subscriptionPriceCents 
    ? `R$ ${(subscriptionPriceCents / 100).toFixed(2)}/mês` 
    : 'R$ 49,90/mês';

  React.useEffect(() => {
    const fetchPremiumAndSub = async () => {
      setLoading(true);
      try {
        // 1. Fetch public exclusive medias
        const { data: mediaData } = await supabase
          .from('premium_media')
          .select('*')
          .eq('profile_id', providerId)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (mediaData) setMedias(mediaData);

        // 2. Check if logged user has active subscription
        if (currentUser?.id) {
          const { data: subData } = await supabase
            .from('premium_subscriptions')
            .select('expires_at, status')
            .eq('client_id', currentUser.id)
            .eq('provider_id', providerId)
            .eq('status', 'active')
            .maybeSingle();

          if (subData) {
            setIsSubscribed(true);
            setSubExpiresAt(subData.expires_at);
          }
        }
      } catch (err) {
        console.error('Error loading premium section:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPremiumAndSub();
  }, [providerId, currentUser]);

  const handleSubscribePix = async () => {
    if (!currentUser) {
      alert('Por favor, faça login ou crie sua conta de cliente para assinar este conteúdo.');
      window.location.href = `/login?redirect=/perfil/${providerId}`;
      return;
    }

    setSubscribing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          isExclusiveContent: true,
          targetProfileId: providerId
        })
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err: any) {
      console.error('Error starting subscription checkout:', err);
      alert('Erro ao iniciar assinatura VIP: ' + (err.message || err));
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <div className="py-6 flex justify-center">
        <div className="w-6 h-6 border-2 border-gold-primary/30 border-t-gold-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div id="clube-vip-section" className="space-y-5 pt-6 border-t border-gold-primary/30 bg-gradient-to-b from-gold-primary/10 via-black/50 to-transparent p-5 sm:p-6 rounded-2xl border shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Crown className="w-5.5 h-5.5 text-gold-primary animate-pulse" />
            Clube VIP Exclusivo Relaxe & Goze
            <span className="text-[10px] bg-gold-primary/20 text-gold-light border border-gold-primary/30 px-2.5 py-0.5 rounded-full font-bold">
              {medias.length > 0 ? `${medias.length} ${medias.length === 1 ? 'Mídia' : 'Mídias'}` : 'Acervo VIP'}
            </span>
          </h3>
          <p className="text-xs text-gray-300 font-light mt-1 leading-relaxed">
            {isSubscribed 
              ? `Você é um assinante VIP ativo de ${providerName}!` 
              : `Assine o Clube VIP de ${providerName} para desbloquear fotos em alta definição, vídeos inéditos e conteúdos exclusivos com total sigilo.`}
          </p>
        </div>

        {isSubscribed && subExpiresAt && (
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5 shrink-0">
            <Unlock className="w-3.5 h-3.5" /> Assinatura Ativa até {new Date(subExpiresAt).toLocaleDateString('pt-BR')}
          </span>
        )}
      </div>

      {/* Grid de Mídias ou Mock Preview Teaser quando medias.length === 0 */}
      {medias.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {medias.map((m) => {
            const isVideo = m.media_type === 'video' || m.media_url?.includes('.mp4') || m.media_url?.includes('.webm');
            return (
              <div 
                key={m.id} 
                className={`relative aspect-[3/4] rounded-xl overflow-hidden border ${isSubscribed ? 'border-emerald-500/40 hover:border-emerald-400 cursor-pointer' : 'border-gold-primary/20'} bg-black/60 group transition-all`}
                onClick={() => {
                  if (isSubscribed) {
                    setActiveMediaPreview({ url: getCDNUrl(m.media_url || m.preview_url), type: isVideo ? 'video' : 'photo' });
                  }
                }}
              >
                {isSubscribed ? (
                  <>
                    <img
                      src={getCDNUrl(m.preview_url || m.media_url)}
                      alt={m.title || ''}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 select-none"
                      onContextMenu={(e) => e.preventDefault()}
                    />

                    {isVideo && (
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-gold-primary/90 text-dark-bg flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-dark-bg ml-0.5" />
                        </div>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-2.5 py-1 rounded-lg bg-gold-primary text-dark-bg text-[10px] font-bold flex items-center gap-1 shadow-md">
                        {isVideo ? <Play className="w-3 h-3 fill-dark-bg" /> : <Eye className="w-3 h-3" />}
                        {isVideo ? 'Assistir Vídeo HD' : 'Ampliar HD'}
                      </span>
                    </div>
                    <span className="absolute top-2 left-2 bg-emerald-500/90 backdrop-blur-xs text-dark-bg font-extrabold px-1.5 py-0.5 rounded text-[8px] flex items-center gap-1">
                      {isVideo ? <Video className="w-2.5 h-2.5" /> : null}
                      {isVideo ? 'VÍDEO VIP' : 'FOTO HD'}
                    </span>
                  </>
                ) : (
                  <>
                    {/* Thumbnail Borrada */}
                    {m.preview_url ? (
                      <img
                        src={getCDNUrl(m.preview_url)}
                        alt=""
                        className="w-full h-full object-cover blur-md scale-110 select-none pointer-events-none opacity-60"
                        onContextMenu={(e) => e.preventDefault()}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gold-primary/20 to-wine-primary/20" />
                    )}

                    {/* Lock overlay */}
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1.5 p-2 text-center">
                      <div className="w-9 h-9 rounded-full bg-black/70 border border-gold-primary/40 flex items-center justify-center shadow-lg">
                        <Lock className="w-4 h-4 text-gold-primary" />
                      </div>
                      <span className="text-[10px] text-gold-light font-medium max-w-full truncate">
                        {m.title || 'Conteúdo Privado'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Preview Teaser para Perfis sem mídias cadastradas na tabela */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-black/40 border border-gold-primary/20 rounded-xl p-4 flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gold-primary/10 border border-gold-primary/30 flex items-center justify-center text-gold-primary">
              <Eye className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Ensaio Fotográfico HD</span>
            <span className="text-[10px] text-gray-400 font-light">Fotos privativas em alta resolução liberadas para assinantes</span>
          </div>

          <div className="bg-black/40 border border-gold-primary/20 rounded-xl p-4 flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gold-primary/10 border border-gold-primary/30 flex items-center justify-center text-gold-primary">
              <Video className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Vídeos de Bastidores</span>
            <span className="text-[10px] text-gray-400 font-light">Vídeos inéditos de bastidores gravados com exclusividade</span>
          </div>

          <div className="bg-black/40 border border-gold-primary/20 rounded-xl p-4 flex flex-col items-center text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gold-primary/10 border border-gold-primary/30 flex items-center justify-center text-gold-primary">
              <Sparkles className="w-5 h-5 text-gold-primary animate-pulse" />
            </div>
            <span className="text-xs font-bold text-white">Acesso Imediato & Sigiloso</span>
            <span className="text-[10px] text-gray-400 font-light">Liberação instantânea após pagamento via Pix no site</span>
          </div>
        </div>
      )}

      {/* Call to Action Exclusivo da Plataforma (Pix / Checkout Oficial) */}
      {!isSubscribed && (
        <div className="bg-black/60 border border-gold-primary/40 p-4 sm:p-5 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gold-primary/20 border border-gold-primary/40 flex items-center justify-center text-gold-primary shrink-0 shadow-lg">
              <Crown className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Assinar o Clube Exclusivo de {providerName}</h4>
              <p className="text-xs text-gray-300 font-light mt-0.5">
                Desbloqueie todo o acervo privado por {priceFormatted} com pagamento 100% seguro via Pix.
              </p>
            </div>
          </div>

          <button
            onClick={handleSubscribePix}
            disabled={subscribing}
            className="w-full md:w-auto px-6 py-3.5 rounded-xl bg-gold-primary hover:bg-gold-light text-dark-bg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-gold-primary/20 shrink-0"
          >
            <Sparkles className="w-4 h-4" />
            {subscribing ? 'Gerando Pix...' : `Assinar Agora com Pix (${priceFormatted})`}
          </button>
        </div>
      )}

      {/* Modal Lightbox Viewer para assinantes */}
      {activeMediaPreview && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
          <button 
            onClick={() => setActiveMediaPreview(null)}
            className="absolute top-6 right-6 p-3 text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-gold-primary/30 shadow-2xl relative flex items-center justify-center">
            {activeMediaPreview.type === 'video' ? (
              <video 
                src={activeMediaPreview.url} 
                controls 
                autoPlay 
                controlsList="nodownload"
                className="max-w-full max-h-[85vh] rounded-xl shadow-2xl"
                onContextMenu={(e) => e.preventDefault()}
              />
            ) : (
              <img 
                src={activeMediaPreview.url} 
                alt="Mídia Ampliada" 
                className="max-w-full max-h-[85vh] object-contain rounded-xl select-none"
                onContextMenu={(e) => e.preventDefault()}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}


interface ProfileDetailsClientProps {
  id: string;
  initialProfile: any;
  initialPhotos: any[];
  initialReviews: any[];
  initialAd?: any;
}

export default function ProfileDetailsClient({
  id,
  initialProfile,
  initialPhotos,
  initialReviews,
  initialAd
}: ProfileDetailsClientProps) {
  const [profile, setProfile] = useState<any>(initialProfile);
  const [photos, setPhotos] = useState<any[]>(initialPhotos);
  const [reviews, setReviews] = useState<any[]>(initialReviews);
  const [ad, setAd] = useState<any>(initialAd);

  const [checkoutStatus, setCheckoutStatus] = useState<string | null>(null);
  const [giftingCheckout, setGiftingCheckout] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const status = params.get('checkout_status');
      if (status) {
        setCheckoutStatus(status);
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  }, []);

  const handleGiftBoost = async () => {
    setGiftingCheckout(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          isBoost: true,
          isGift: true,
          targetProfileId: id
        })
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao iniciar o checkout do presente.');
    } finally {
      setGiftingCheckout(false);
    }
  };

  // Auth States for leaving reviews
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Review Form States
  const [ratingMassage, setRatingMassage] = useState(5);
  const [ratingService, setRatingService] = useState(5);
  const [ratingEnvironment, setRatingEnvironment] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const parseBio = (bioText: string) => {
    if (!bioText) return { specialties: '', included: '', rules: '', raw: '' };
    if (bioText.includes('=== ESPECIALIDADES ===')) {
      const parts = bioText.split('\n\n=== ');
      const specialties = parts.find((p: string) => p.startsWith('ESPECIALIDADES ==='))?.replace('ESPECIALIDADES ===\n', '') || '';
      const included = parts.find((p: string) => p.startsWith('INCLUSO ==='))?.replace('INCLUSO ===\n', '') || '';
      const rules = parts.find((p: string) => p.startsWith('REGRAS ==='))?.replace('REGRAS ===\n', '') || '';
      return { specialties, included, rules, raw: bioText };
    }
    return { specialties: bioText, included: '', rules: '', raw: bioText };
  };

  const getAmenityIcon = (name: string) => {
    switch (name) {
      case 'Maca Profissional':
      case 'Óleos Essenciais Importados':
        return <Sparkles className="w-4 h-4 text-gold-primary" />;
      case 'Música de Relaxamento':
        return <Music className="w-4 h-4 text-gold-primary" />;
      case 'Chuveiro Aquecido':
        return <Bath className="w-4 h-4 text-gold-primary" />;
      case 'Ar Condicionado':
        return <Wind className="w-4 h-4 text-wine-light" />;
      case 'Estacionamento Discreto':
        return <Car className="w-4 h-4 text-wine-light" />;
      case 'Drinks Cortesia':
        return <Coffee className="w-4 h-4 text-wine-light" />;
      case 'Wi-Fi de Alta Velocidade':
        return <Wifi className="w-4 h-4 text-wine-light" />;
      case 'Local Próprio':
        return <Building2 className="w-4 h-4 text-gold-primary" />;
      case 'Aceita Cartão / Pix':
        return <CreditCard className="w-4 h-4 text-emerald-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-gold-primary" />;
    }
  };

  useEffect(() => {
    checkCurrentUser();
    logViewEvent();
  }, [id]);

  const checkCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('role, verification_status')
        .eq('id', user.id)
        .single();
      if (data) {
        setUserRole(data.role);
        setCurrentUser({ ...user, verification_status: data.verification_status });
      } else {
        setCurrentUser(user);
      }
    }
  };

  const logViewEvent = async () => {
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        provider_id: id,
        event_type: 'profile_view'
      });
    if (error) {
      console.error('Erro ao registrar visualização do perfil:', error);
    }
  };

  const logWhatsAppClick = async () => {
    const { error } = await supabase
      .from('analytics_events')
      .insert({
        provider_id: id,
        event_type: 'whatsapp_click'
      });
    if (error) {
      console.error('Erro ao registrar clique do WhatsApp:', error);
    }
  };

  const fetchReviews = async () => {
    const { data: pReviews, error } = await supabase
      .from('reviews')
      .select(`
        id, rating_massage, rating_service, rating_environment, comment, is_verified_interaction, created_at, tags,
        client:profiles!reviews_client_id_fkey(name, verification_status)
      `)
      .eq('provider_id', id);
    if (!error && pReviews) {
      setReviews(pReviews);
    }
  };

  const [copiedLink, setCopiedLink] = useState(false);

  const handleShareLink = async () => {
    const shareUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: profile?.name ? `Perfil de ${profile.name} - Relaxe & Goze` : 'Relaxe & Goze',
          url: shareUrl
        });
        return;
      } catch (err) {
        // Fallback para área de transferência se cancelar o dialog
      }
    }
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (currentUser.verification_status !== 'verified') {
      alert('Somente clientes verificados podem enviar avaliações.');
      return;
    }
    setSubmittingReview(true);

    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          provider_id: id,
          client_id: currentUser.id,
          rating_massage: ratingMassage,
          rating_service: ratingService,
          rating_environment: ratingEnvironment,
          comment,
          tags: selectedTags,
          is_verified_interaction: true
        });

      if (error) throw error;

      setReviewSuccess(true);
      setComment('');
      setSelectedTags([]);
      
      // Recarregar avaliações
      await fetchReviews();
      
      // Revalidar cache do Next.js no servidor
      await triggerRevalidate(profile.city, profile.neighborhood, id);
      
      setTimeout(() => setReviewSuccess(false), 3000);
    } catch (err) {
      alert('Erro ao enviar avaliação. Certifique-se de que é um cliente cadastrado.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const specialtyNames = profile.specialties?.map((s: any) => s.specialties?.name).filter(Boolean) || [];
  const isAvailable = profile.is_available_now && (!profile.available_until || new Date(profile.available_until) > new Date());

  // Calcular notas médias
  const count = reviews.length;
  const avgMassage = count > 0 ? (reviews.reduce((acc, curr) => acc + curr.rating_massage, 0) / count).toFixed(1) : '4.9';
  const avgService = count > 0 ? (reviews.reduce((acc, curr) => acc + curr.rating_service, 0) / count).toFixed(1) : '4.9';
  const avgEnvironment = count > 0 ? (reviews.reduce((acc, curr) => acc + curr.rating_environment, 0) / count).toFixed(1) : '4.8';

  // Contar frequências das tags das avaliações
  const tagCounts: Record<string, number> = {};
  reviews.forEach(rev => {
    if (Array.isArray(rev.tags)) {
      rev.tags.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });
  // Ordenar tags por frequência
  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // top 5 tags

  // Ad-specific details resolver
  const adTitle = ad?.title || `Atendimento com ${profile.name}`;
  const adDescription = ad?.description || profile.bio || '';
  const adPrice = ad ? ad.price : (profile.price_per_hour || 0);

  const computedSpecialties = React.useMemo(() => {
    const list: string[] = [];

    if (Array.isArray(profile?.specialties)) {
      profile.specialties.forEach((s: any) => {
        const name = typeof s === 'string' ? s : s?.specialties?.name || s?.name;
        if (name && !list.includes(name)) list.push(name);
      });
    }

    const rawBio = ad?.description || profile?.bio || '';
    if (rawBio.includes('=== ESPECIALIDADES ===')) {
      const parts = rawBio.split('=== ');
      const specPart = parts.find((p: string) => p.startsWith('ESPECIALIDADES ==='))?.replace('ESPECIALIDADES ===\n', '').trim();
      if (specPart) {
        specPart.split(/[,;\n]/).map((s: string) => s.trim()).filter(Boolean).forEach((s: string) => {
          if (!list.includes(s) && s.length > 2 && !s.startsWith('===') && !s.includes('INCLUSO') && !s.includes('REGRAS')) {
            list.push(s);
          }
        });
      }
    }

    return list;
  }, [profile, ad]);

  const parseProfileBio = React.useCallback((raw: string) => {
    if (!raw) return { bioText: '', included: '', rules: '' };

    let bioText = raw;
    let included = '';
    let rules = '';

    if (raw.includes('=== ')) {
      const parts = raw.split('\n\n=== ');
      
      parts.forEach(part => {
        if (part.startsWith('ESPECIALIDADES ===')) {
          // Processed in specialties list
        } else if (part.startsWith('INCLUSO ===') || part.includes('INCLUSO ===')) {
          included = part.replace(/^.*INCLUSO ===\n?/, '').trim();
        } else if (part.startsWith('REGRAS ===') || part.includes('REGRAS ===')) {
          rules = part.replace(/^.*REGRAS ===\n?/, '').trim();
        } else {
          const cleanPart = part
            .replace(/ESPECIALIDADES ===[\s\S]*?(?=\n\n|$)/, '')
            .replace(/INCLUSO ===[\s\S]*?(?=\n\n|$)/, '')
            .replace(/REGRAS ===[\s\S]*?(?=\n\n|$)/, '')
            .replace(/(?:={2,}|-{2,}|#{2,})\s*[A-ZÀ-Ú\s_]+?\s*(?:={2,}|-{2,}|#{2,})/gi, '')
            .trim();
          if (cleanPart) bioText = cleanPart;
        }
      });
    }

    bioText = cleanDescription(bioText);
    included = cleanDescription(included);
    rules = cleanDescription(rules);

    return { bioText, included, rules };
  }, []);

  // Compilação de fotos do anúncio com suporte a navegação
  const adPhotosList: string[] = React.useMemo(() => {
    let list: string[] = [];
    if (ad && Array.isArray(ad.photos) && ad.photos.length > 0) {
      list = [...ad.photos];
    }
    if (photos && photos.length > 0) {
      photos.forEach((p: any) => {
        if (p.photo_url && !list.includes(p.photo_url)) {
          list.push(p.photo_url);
        }
      });
    }
    if (list.length === 0 && profile.avatar_url) {
      list = [profile.avatar_url];
    }
    return list;
  }, [ad, photos, profile.avatar_url]);

  const [activePhotoIdx, setActivePhotoIdx] = React.useState(0);
  const [heroTouchStartX, setHeroTouchStartX] = React.useState<number | null>(null);

  const handleNextHeroPhoto = () => {
    setActivePhotoIdx((prev) => (prev + 1) % adPhotosList.length);
  };

  const handlePrevHeroPhoto = () => {
    setActivePhotoIdx((prev) => (prev - 1 + adPhotosList.length) % adPhotosList.length);
  };

  const handleHeroTouchStart = (e: React.TouchEvent) => {
    setHeroTouchStartX(e.touches[0].clientX);
  };

  const handleHeroTouchEnd = (e: React.TouchEvent) => {
    if (heroTouchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diffX = heroTouchStartX - touchEndX;

    if (Math.abs(diffX) > 30) {
      if (diffX > 0) {
        setActivePhotoIdx((prev) => (prev + 1) % adPhotosList.length);
      } else {
        setActivePhotoIdx((prev) => (prev - 1 + adPhotosList.length) % adPhotosList.length);
      }
    }
    setHeroTouchStartX(null);
  };

  const mediaToRender = React.useMemo(() => {
    const list: any[] = [];
    const addedUrls = new Set<string>();

    if (ad && Array.isArray(ad.photos)) {
      ad.photos.forEach((url: string) => {
        if (url && !addedUrls.has(url)) {
          addedUrls.add(url);
          list.push({ url, type: 'photo', is_verified: true });
        }
      });
    }

    if (photos && photos.length > 0) {
      photos.forEach(p => {
        if (p.photo_url && !addedUrls.has(p.photo_url)) {
          addedUrls.add(p.photo_url);
          list.push({
            url: p.photo_url,
            type: p.media_type || 'photo',
            is_verified: p.is_verified
          });
        }
      });
    }

    return list;
  }, [ad, photos]);

  const isOwner = currentUser?.id === profile.id;

  // If there is no active ad, block public visitors but let the owner/admin preview
  if (!ad || !ad.is_active) {
    if (!isOwner && userRole !== 'admin') {
      return (
        <div className="w-full flex flex-col items-center justify-center py-20 text-center space-y-4 bg-black/40 border border-white/5 rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-wine-primary/10 blur-[50px] pointer-events-none" />
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
            <span className="text-3xl">📴</span>
          </div>
          <h2 className="text-xl font-bold text-white">Anúncio Indisponível</h2>
          <p className="text-gray-400 text-sm max-w-md font-light leading-relaxed">
            Esta profissional está temporariamente indisponível no momento. Por favor, volte mais tarde ou visite outros perfis ativos na nossa vitrine.
          </p>
          <Link href="/" className="mt-4 px-6 py-2.5 bg-wine-primary text-white text-xs font-semibold rounded-xl hover:bg-wine-primary/90 transition-colors uppercase tracking-wider">
            Ver Outros Perfis
          </Link>
        </div>
      );
    }
  }

  const currentHeroPhoto = adPhotosList[activePhotoIdx] || profile.avatar_url || '/avatar-placeholder.svg';

  return (
    <div className="w-full space-y-6">
      {checkoutStatus === 'success_gift_boost' && (
        <div className="w-full bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 text-emerald-300 text-xs px-4 py-3.5 rounded-2xl flex items-center gap-3 mb-6 animate-fadeIn">
          <span className="text-lg animate-bounce">🎁🚀</span>
          <div className="space-y-0.5">
            <span className="font-bold block">Presente Enviado com Sucesso!</span>
            <span className="text-gray-400 font-light">Seu presente foi creditado. O perfil de **{profile.name}** foi impulsionado para o topo da vitrine por 6 horas! Obrigado pelo seu apoio.</span>
          </div>
        </div>
      )}

      {checkoutStatus === 'cancelled_gift_boost' && (
        <div className="w-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-4 py-3 rounded-2xl flex items-center gap-2 mb-6">
          <span className="text-base">❌</span>
          <span>O envio do presente foi cancelado. Nenhuma cobrança foi realizada.</span>
        </div>
      )}

      {isOwner && (!ad || !ad.is_active) && (
        <div className="w-full bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs px-4 py-3 rounded-2xl flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-base animate-bounce">📢</span>
            <span>Seu perfil não tem um anúncio ativo no momento. Use o Painel para criar ou reativar seu anúncio.</span>
          </div>
          <Link href="/dashboard" className="px-3.5 py-1.5 bg-gold-primary text-dark-bg text-[10px] font-bold rounded-lg hover:bg-gold-light transition-colors uppercase tracking-wider">
            Painel
          </Link>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8 items-start">
      {/* Avatar Principal com Carrossel e Deslize (Swipe) */}
      <div 
        className={`w-full md:w-1/3 aspect-4/5 sm:aspect-3/4 max-h-90 md:max-h-none rounded-2xl overflow-hidden shadow-2xl relative shrink-0 border-2 protected-media touch-pan-y group ${
          isAvailable ? 'border-emerald-500 neon-ring-active' : profile.subscription_tier === 'gold' ? 'border-gold-primary' : 'border-white/5'
        }`}
        onTouchStart={handleHeroTouchStart}
        onTouchEnd={handleHeroTouchEnd}
      >
        {/* Overlay shield para impedir clique e salvamento direto da imagem */}
        <div className="protected-overlay" onContextMenu={(e) => e.preventDefault()} />
        <Image 
          key={currentHeroPhoto}
          src={getCDNUrl(currentHeroPhoto) || '/avatar-placeholder.svg'} 
          alt={profile.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover select-none pointer-events-none transition-transform duration-500"
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          priority
        />
        {/* Tag Foto 100% */}
        {profile.verification_status === 'verified' && (
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 z-10">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-semibold tracking-wide uppercase text-white">Foto Real</span>
          </div>
        )}

        {/* Botão Expandir HD (Lightbox) */}
        <button
          type="button"
          onClick={() => {
            setLightboxIndex(activePhotoIdx);
            setIsLightboxOpen(true);
          }}
          className="absolute bottom-4 left-4 z-20 bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md"
        >
          <Eye className="w-3.5 h-3.5 text-gold-primary" />
          <span>Ver Fotos em HD</span>
        </button>

        {/* Controles do Carrossel */}
        {adPhotosList.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevHeroPhoto}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-gold-primary hover:text-dark-bg cursor-pointer"
              title="Foto anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={handleNextHeroPhoto}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity z-20 hover:bg-gold-primary hover:text-dark-bg cursor-pointer"
              title="Próxima foto"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Indicadores de Paginação */}
            <div className="absolute bottom-3 inset-x-0 flex flex-col items-center gap-1 z-20 pointer-events-none">
              <div className="flex items-center justify-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                {adPhotosList.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === activePhotoIdx 
                        ? 'bg-gold-primary w-4' 
                        : 'bg-white/40 w-1.5'
                    }`}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Dados */}
      <div className="flex-1 w-full space-y-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight flex items-center gap-2">
              {profile.name}
              {profile.subscription_tier === 'gold' && (
                <span className="text-2xl animate-bounce" title="Gold VIP">👑</span>
              )}
              , <span className="font-light text-gray-400">{profile.age}</span>
            </h1>
            
            {profile.verification_status === 'verified' && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1" title={profile.verification_title || 'Identidade Verificada'}>
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{profile.verification_title || 'Verificado'}</span>
              </div>
            )}
            {profile.is_space_verified && (
              <div className="bg-gold-primary/10 border border-gold-primary/20 text-gold-light p-1.5 rounded-full" title="Espaço Auditado e Validado">
                <Building2 className="w-5 h-5" />
              </div>
            )}

            {/* Botão de Compartilhar/Copiar Link */}
            <button
              type="button"
              onClick={handleShareLink}
              title="Compartilhar Perfil"
              className="sm:ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-all cursor-pointer shadow-sm"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copiado!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-gold-primary" />
                  <span>Compartilhar</span>
                </>
              )}
            </button>
          </div>

          {adTitle && (
            <h2 className="text-base sm:text-lg font-medium text-gold-light tracking-wide mt-1.5">
              {adTitle}
            </h2>
          )}

          <div className="flex flex-col gap-2.5 mt-2">
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <MapPin className="w-4 h-4 text-wine-light/80" />
              <span>{profile.neighborhood || 'Bairro não informado'}, {profile.city}</span>
            </div>

            {/* Privacy Protection Badge */}
            <div className="bg-black/40 border border-gold-primary/20 p-2.5 rounded-xl flex items-center gap-2 text-[11px] text-gray-300">
              <ShieldCheck className="w-4 h-4 text-gold-primary shrink-0 animate-pulse" />
              <span>Endereço exato e sala são informados no WhatsApp após agendamento prévio.</span>
            </div>
            
            {/* Badges de Destaque do Perfil */}
            <div className="flex flex-wrap gap-2 mt-1">
              {isAvailable && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
                  Disponível Agora
                </span>
              )}
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 text-[10px] font-bold uppercase tracking-wider">
                {profile.category === 'massage' ? '🧘 Massagens' : profile.category === 'escort' ? '🔥 Acompanhante' : '✨ Terapias & Acompanhante'}
              </span>
              {profile.amenities?.includes('Local Próprio') ? (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold-primary/10 border border-gold-primary/20 text-gold-light text-[10px] font-bold uppercase tracking-wider">
                  🏠 Local Próprio
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                  🚗 Delivery / À Combinar
                </span>
              )}
              {profile.verification_status === 'verified' && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" /> {profile.verification_title || 'Identidade Verificada'}
                </span>
              )}
              {profile.is_space_verified && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold-primary/10 border border-gold-primary/20 text-gold-light text-[10px] font-bold uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5" /> Espaço Auditado
                </span>
              )}
              <span 
                onClick={() => {
                  const el = document.getElementById('clube-vip-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                title="Clique para ver o Clube VIP e Conteúdos Exclusivos"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold-primary/20 border border-gold-primary/40 text-gold-light text-[10px] font-bold uppercase tracking-wider shadow-sm animate-pulse cursor-pointer hover:bg-gold-primary/30 transition-all"
              >
                <Crown className="w-3.5 h-3.5 text-gold-primary" /> Clube VIP Exclusivo
              </span>
            </div>

            {/* Opções de Atendimento (Público-alvo) */}
            {profile.target_audience && profile.target_audience.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-gray-400 mt-2 bg-white/2 border border-white/5 p-3 rounded-xl w-fit">
                <span className="font-semibold text-gray-300">Atende:</span>
                <div className="flex flex-wrap gap-1.5">
                  {profile.target_audience.map((audience: string) => (
                    <span key={audience} className="px-2.5 py-0.5 rounded-md bg-wine-primary/10 border border-wine-primary/20 text-wine-light text-[10px] font-semibold">
                      {audience}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Especialidades e Atendimentos prestados */}
        {computedSpecialties.length > 0 && (
          <div className="space-y-2.5 bg-black/40 border border-white/5 rounded-2xl p-4 sm:p-5">
            <span className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold-primary" />
              Especialidades & Atendimentos
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {computedSpecialties.map((spec: string) => (
                <span 
                  key={spec} 
                  className="px-3.5 py-1.5 rounded-xl border border-gold-primary/30 bg-gold-primary/10 text-gold-light text-xs font-semibold tracking-wide shadow-xs flex items-center gap-1.5"
                >
                  ✨ {spec}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Média de Avaliações Detalhada */}
        <div className="grid grid-cols-3 gap-3 bg-black/40 border border-white/5 rounded-2xl p-4 text-center">
          <div>
            <span className="text-[10px] text-gray-500 font-semibold block uppercase">Terapia</span>
            <span className="text-sm font-bold text-gold-primary flex items-center justify-center gap-1 mt-0.5">
              <Star className="w-3.5 h-3.5 fill-gold-primary text-gold-primary" /> {avgMassage}
            </span>
          </div>
          <div className="border-l border-r border-white/5">
            <span className="text-[10px] text-gray-500 font-semibold block uppercase">Atendimento</span>
            <span className="text-sm font-bold text-gold-primary flex items-center justify-center gap-1 mt-0.5">
              <Star className="w-3.5 h-3.5 fill-gold-primary text-gold-primary" /> {avgService}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-semibold block uppercase">Espaço</span>
            <span className="text-sm font-bold text-gold-primary flex items-center justify-center gap-1 mt-0.5">
              <Star className="w-3.5 h-3.5 fill-gold-primary text-gold-primary" /> {avgEnvironment}
            </span>
          </div>
        </div>

        {/* Preço e Botão */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {(!adPrice || Number(adPrice) < 300) ? (
            <div className="flex flex-col justify-center items-start">
              <span className="text-[10px] sm:text-xs text-gray-400 uppercase font-semibold">Valor da Hora</span>
              <span className="text-xl sm:text-2xl font-bold text-gold-light uppercase tracking-wide">
                Consultar valor
              </span>
            </div>
          ) : (
            <div className="flex sm:flex-col justify-between sm:justify-start items-center sm:items-start w-full sm:w-auto">
              <span className="text-xs text-gray-500 uppercase font-semibold">Valor da Hora</span>
              <div className="flex items-center gap-1.5 text-gold-light">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 -mr-1" />
                <span className="text-2xl sm:text-3xl font-bold">{adPrice}</span>
                <span className="text-gray-500 text-xs font-light">/ hr</span>
              </div>
            </div>
          )}
          
          {(() => {
            const whatsappMessage = profile.whatsapp_custom_message
              || `Olá ${profile.name}! Vi seu anúncio no Relaxe & Goze e gostaria de agendar um horário.`;
            const whatsappLink = formatWhatsAppLink(profile.whatsapp, whatsappMessage) || '#';
            return (
              <a 
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={logWhatsAppClick}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wide transition-all shadow-[0_0_20px_rgba(37,211,102,0.2)]"
              >
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                WhatsApp
              </a>
            );
          })()}
        </div>

        {/* Tabela de Investimento / Preços por Duração */}
        {(() => {
          const ratesObj = profile.rates || profile.business_hours?.rates || {};
          const isConsult = !adPrice || Number(adPrice) < 300;

          const renderRateCard = (label: string, value?: number | string) => {
            const num = Number(value);
            if (!num || num <= 0) return null;
            return (
              <div key={label} className="bg-white/5 border border-white/10 hover:border-gold-primary/40 rounded-xl p-3 flex flex-col justify-between transition-all group">
                <span className="text-[10px] text-gray-400 uppercase font-semibold block truncate">{label}</span>
                <div className="flex items-baseline gap-1 mt-1 text-gold-light">
                  <span className="text-xs font-bold">R$</span>
                  <span className="text-base sm:text-lg font-bold text-white group-hover:text-gold-light transition-colors">{num}</span>
                </div>
              </div>
            );
          };

          const items = [
            renderRateCard('15 Minutos', ratesObj.min15),
            renderRateCard('30 Minutos', ratesObj.min30),
            renderRateCard('45 Minutos', ratesObj.min45),
            renderRateCard('1 Hora (Padrão)', ratesObj.hour1 || (adPrice >= 300 ? adPrice : undefined)),
            renderRateCard('2 Horas', ratesObj.hour2),
            renderRateCard('Pernoite', ratesObj.overnight),
          ].filter(Boolean);

          if (isConsult) {
            return (
              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-white uppercase tracking-widest flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gold-primary" />
                    Investimento por Duração
                  </h3>
                  <span className="text-[9px] text-gold-light font-bold uppercase tracking-wider bg-gold-primary/10 border border-gold-primary/20 px-2 py-0.5 rounded-full">
                    Valores Sob Consulta
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 font-light leading-relaxed">
                  Valores sob consulta. Entre em contato pelo WhatsApp para verificar as opções de tempo e investimentos.
                </p>
              </div>
            );
          }

          if (items.length === 0) return null;

          return (
            <div className="bg-black/40 border border-white/5 rounded-2xl p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-white uppercase tracking-widest flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gold-primary" />
                  Investimento por Duração
                </h3>
                <span className="text-[9px] text-gold-light font-bold uppercase tracking-wider bg-gold-primary/10 border border-gold-primary/20 px-2 py-0.5 rounded-full">
                  Elite
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {items}
              </div>
            </div>
          );
        })()}

        {/* Presentear com Boost de Destaque */}
        <div className="relative overflow-hidden bg-gradient-to-br from-gold-primary/10 via-black/40 to-wine-primary/10 border border-gold-primary/20 rounded-2xl p-5 md:p-6 space-y-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold-primary/5 blur-2xl rounded-full pointer-events-none" />
          
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gold-primary/10 border border-gold-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-gold-primary animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                Presentear com Destaque (Boost) 🎁
              </h4>
              <p className="text-[11px] text-gray-400 font-light leading-relaxed">
                Gostou do atendimento de {profile.name}? Dê um **Super Destaque** de presente para colocar o perfil dela no topo da vitrine de buscas por **6 horas**.
              </p>
            </div>
          </div>
          
          <div className="pt-2 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold">Valor do Presente</span>
              <span className="text-lg font-bold text-gold-light">R$ 50,00</span>
            </div>
            <button
              onClick={handleGiftBoost}
              disabled={giftingCheckout}
              className="w-full sm:w-auto px-6 py-3 bg-gold-primary hover:bg-gold-light text-dark-bg font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(212,175,55,0.15)] hover:shadow-[0_0_25px_rgba(212,175,55,0.3)] disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {giftingCheckout ? 'Carregando...' : 'Dar Boost de Presente 🚀'}
            </button>
          </div>
        </div>

        <button
          onClick={() => setIsReportModalOpen(true)}
          className="w-full text-center text-xs text-red-400/50 hover:text-red-400 transition-colors flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-red-500/10 hover:border-red-500/30 rounded-xl cursor-pointer"
        >
          <AlertTriangle className="w-3.5 h-3.5" /> Denunciar este anúncio
        </button>

        {/* Horários de Expediente */}
        {profile.business_hours && typeof profile.business_hours === 'object' && Object.keys(profile.business_hours).length > 0 && (
          <div className="bg-black/40 border border-white/5 rounded-2xl p-4 sm:p-5 space-y-3.5 pt-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-semibold text-white uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-4 h-4 text-gold-primary" />
                Horário de Atendimento
              </h3>
              {(() => {
                const isFlex = profile.business_hours?.consult_whatsapp || profile.is_consult_schedule;
                if (isFlex) {
                  return (
                    <span className="inline-flex items-center gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Sob Consulta
                    </span>
                  );
                }
                const { status, next } = getStatusExpediente(profile.business_hours);
                if (status === 'Em expediente') {
                  return (
                    <span className="inline-flex items-center gap-1.5 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Em expediente
                    </span>
                  );
                } else {
                  return (
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="inline-flex items-center gap-1.5 text-[10px] bg-white/5 text-gray-400 border border-white/10 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                        Indisponível
                      </span>
                      {next && (
                        <span className="text-[9px] text-gray-500 font-light">
                          Abre {next}
                        </span>
                      )}
                    </div>
                  );
                }
              })()}
            </div>

            {profile.business_hours?.consult_whatsapp || profile.is_consult_schedule ? (
              <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 p-3.5 rounded-xl text-xs text-gray-300">
                <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Atendimento sem horário fixo. Consulte a disponibilidade diretamente no WhatsApp.</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {formatScheduleGrouped(profile.business_hours).map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs border ${
                      item.active 
                        ? 'bg-white/5 border-white/10 text-gray-200' 
                        : 'bg-black/20 border-white/5 text-gray-500'
                    }`}
                  >
                    <span className="font-semibold text-white">{item.dayText}:</span>
                    <span className={item.active ? 'text-gold-light font-medium' : 'text-gray-500 italic'}>
                      {item.timeText}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Comodidades & Infraestrutura */}
        {profile.amenities && profile.amenities.length > 0 && (
          <div className="pt-6 border-t border-white/10 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-widest flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gold-primary" />
              Comodidades & Infraestrutura
            </h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {profile.amenities.map((ame: string) => (
                <div key={ame} className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-xl p-2.5 sm:p-3 text-[10px] sm:text-xs text-gray-300 font-light truncate" title={ame}>
                  <div className="shrink-0">{getAmenityIcon(ame)}</div>
                  <span className="truncate">{ame}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Seção de Conteúdo Exclusivo (Clube VIP) */}
        <PremiumSection 
          providerId={profile.id} 
          providerName={profile.name} 
          subscriptionPriceCents={profile.subscription_price_cents} 
          currentUser={currentUser} 
          whatsapp={profile.whatsapp}
        />

        {/* Bio & Apresentação Profissional — Destaque sobre as avaliações */}
        {(() => {
          const rawBio = initialAd?.description || profile.bio || '';
          const { bioText, included, rules } = parseProfileBio(rawBio);
          
          if (!bioText && !included && !rules) return null;

          return (
            <div className="bg-linear-to-br from-black/60 via-black/40 to-wine-primary/10 border border-white/10 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl pt-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-gold-primary" />
                  Sobre Mim — Apresentação Profissional
                </h3>
                <span className="text-[10px] text-gold-light bg-gold-primary/10 border border-gold-primary/20 px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider">
                  Perfil Oficial
                </span>
              </div>

              {/* Texto de apresentação principal */}
              {bioText && (
                <div className="text-gray-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-light">
                  {bioText}
                </div>
              )}

              {/* Grid de Informações Adicionais (Incluso & Regras) */}
              {(included || rules) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {included && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-400" /> Incluso no Atendimento
                      </h4>
                      <p className="text-gray-300 text-xs leading-relaxed font-light whitespace-pre-wrap">{included}</p>
                    </div>
                  )}
                  {rules && (
                    <div className="bg-wine-primary/10 border border-wine-primary/20 rounded-xl p-4 space-y-2">
                      <h4 className="text-xs font-bold text-wine-light uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-wine-light" /> Regras & Restrições
                      </h4>
                      <p className="text-gray-300 text-xs leading-relaxed font-light whitespace-pre-wrap">{rules}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        <div className="space-y-6 pt-6 border-t border-white/5">
          <h3 className="text-sm font-semibold text-white uppercase tracking-widest flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gold-primary" />
            Opinião dos Clientes ({count})
          </h3>

          {sortedTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 bg-black/30 border border-white/5 p-3 rounded-xl">
              <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mr-1">Mais comentados:</span>
              {sortedTags.map(([tag, count]) => (
                <span key={tag} className="text-[10px] px-2.5 py-1 rounded-full bg-gold-primary/10 border border-gold-primary/20 text-gold-light font-medium">
                  {tag} ({count})
                </span>
              ))}
            </div>
          )}

          {/* Form para Deixar Avaliação */}
          {currentUser && userRole === 'client' ? (
            currentUser.verification_status === 'verified' ? (
              <form onSubmit={handleSubmitReview} className="bg-white/2 border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-semibold text-white">Deixar minha Avaliação de Segurança</h4>
              
              {reviewSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 animate-fadeIn">
                  <CheckCircle className="w-4 h-4 text-emerald-400" /> Avaliação publicada com sucesso!
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label htmlFor="rating-massage-select" className="text-[10px] text-gray-500 uppercase font-medium">Nota Terapia (1-5)</label>
                  <select 
                    id="rating-massage-select"
                    value={ratingMassage} 
                    onChange={(e) => setRatingMassage(Number(e.target.value))}
                    title="Nota da Terapia"
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white"
                  >
                    <option value={5}>5 ★ - Excelente</option>
                    <option value={4}>4 ★ - Muito Bom</option>
                    <option value={3}>3 ★ - Regular</option>
                    <option value={2}>2 ★ - Ruim</option>
                    <option value={1}>1 ★ - Péssimo</option>
                  </select>
                </div>
                
                <div className="space-y-1">
                  <label htmlFor="rating-service-select" className="text-[10px] text-gray-500 uppercase font-medium">Nota Atendimento (1-5)</label>
                  <select 
                    id="rating-service-select"
                    value={ratingService} 
                    onChange={(e) => setRatingService(Number(e.target.value))}
                    title="Nota do Atendimento"
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white"
                  >
                    <option value={5}>5 ★ - Excelente</option>
                    <option value={4}>4 ★ - Muito Bom</option>
                    <option value={3}>3 ★ - Regular</option>
                    <option value={2}>2 ★ - Ruim</option>
                    <option value={1}>1 ★ - Péssimo</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="rating-environment-select" className="text-[10px] text-gray-500 uppercase font-medium">Nota Espaço (1-5)</label>
                  <select 
                    id="rating-environment-select"
                    value={ratingEnvironment} 
                    onChange={(e) => setRatingEnvironment(Number(e.target.value))}
                    title="Nota do Espaço/Ambiente"
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white"
                  >
                    <option value={5}>5 ★ - Excelente</option>
                    <option value={4}>4 ★ - Muito Bom</option>
                    <option value={3}>3 ★ - Regular</option>
                    <option value={2}>2 ★ - Ruim</option>
                    <option value={1}>1 ★ - Péssimo</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase font-medium">Comentário descritivo</label>
                <textarea 
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Descreva brevemente sua experiência..."
                  rows={2}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-gold-primary/40"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase font-medium">Tags de Avaliação Rápida</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {AVAILABLE_TAGS.map(tag => {
                    const isSel = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setSelectedTags(prev =>
                            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                          );
                        }}
                        className={`text-[10px] px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          isSel
                            ? 'bg-gold-primary/20 border-gold-primary text-gold-light font-medium'
                            : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/30'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button 
                type="submit"
                disabled={submittingReview}
                className="px-6 py-2.5 rounded-xl bg-gold-primary text-dark-bg hover:bg-gold-light text-xs font-semibold tracking-wide transition-all disabled:opacity-50"
              >
                {submittingReview ? 'Enviando...' : 'Publicar Avaliação'}
              </button>
              </form>
            ) : (
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4.5 text-center">
                <p className="text-xs text-amber-300/90 leading-relaxed font-light">
                  Sua conta de cliente ainda não foi verificada. 
                  Apenas <strong>clientes verificados por selfie</strong> podem deixar avaliações para evitar avaliações falsas e fraudes. 
                  Acesse o seu <Link href="/dashboard" className="text-gold-primary hover:underline font-semibold mx-1">Painel de Cliente</Link> para enviar sua selfie de verificação.
                </p>
              </div>
            )
          ) : !currentUser ? (
            <div className="bg-black/30 border border-white/5 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500">
                Somente clientes logados e verificados podem deixar avaliações no portal. 
                <Link href="/login" className="text-gold-primary hover:underline ml-1 font-semibold">Fazer Login</Link>
              </p>
            </div>
          ) : null}

          {/* Listagem de Reviews */}
          {reviews.length === 0 ? (
            <p className="text-gray-500 text-xs font-light">Nenhum feedback deixado ainda. Seja o primeiro a avaliar!</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev: any) => {
                const clientName = rev.client?.name || 'Cliente Secreto';
                const isClientVerified = rev.client?.verification_status === 'verified';
                const averageScore = ((rev.rating_massage + rev.rating_service + rev.rating_environment) / 3).toFixed(1);

                return (
                  <div key={rev.id} className="glass-effect rounded-xl border border-white/5 p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                            {clientName}
                            {isClientVerified && (
                              <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                                <ShieldCheck className="w-2.5 h-2.5" /> Verificado
                              </span>
                            )}
                          </h4>
                          <span className="text-[9px] text-gray-500 font-light block">
                            {new Date(rev.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Nota Geral da Review */}
                      <div className="flex items-center gap-1 text-gold-light">
                        <Star className="w-3.5 h-3.5 fill-gold-light" />
                        <span className="text-xs font-bold">{averageScore}</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed font-light pl-1">
                      {rev.comment}
                    </p>

                    {Array.isArray(rev.tags) && rev.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pl-1 pt-1">
                        {rev.tags.map((tag: string) => (
                          <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400 font-light">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Notas individuais menores */}
                    <div className="flex gap-4 pl-1 text-[9px] text-gray-500 font-medium">
                      <span>Massagem: <strong className="text-gray-400">{rev.rating_massage}★</strong></span>
                      <span>Atendimento: <strong className="text-gray-400">{rev.rating_service}★</strong></span>
                      <span>Ambiente: <strong className="text-gray-400">{rev.rating_environment}★</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        reportedProfileId={id}
        reportedProfileName={profile.name}
      />

      <ImageLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        images={mediaToRender.length > 0 ? mediaToRender : [{ url: profile.avatar_url || '/avatar-placeholder.svg', media_type: 'photo' }]}
        currentIndex={lightboxIndex}
        onIndexChange={(newIdx) => setLightboxIndex(newIdx)}
        profileName={profile.name}
      />
    </div>
    </div>
  );
}
