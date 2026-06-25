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
  Trophy,
  Wind,
  Wifi,
  Car,
  Coffee,
  Bath,
  Music,
  CreditCard,
  Sparkles
} from 'lucide-react';
import { formatWhatsAppLink } from '@/lib/utils';


interface ProfileDetailsClientProps {
  id: string;
  initialProfile: any;
  initialPhotos: any[];
  initialReviews: any[];
}

export default function ProfileDetailsClient({
  id,
  initialProfile,
  initialPhotos,
  initialReviews
}: ProfileDetailsClientProps) {
  const [profile, setProfile] = useState<any>(initialProfile);
  const [photos, setPhotos] = useState<any[]>(initialPhotos);
  const [reviews, setReviews] = useState<any[]>(initialReviews);

  // Auth States for leaving reviews
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Review Form States
  const [ratingMassage, setRatingMassage] = useState(5);
  const [ratingService, setRatingService] = useState(5);
  const [ratingEnvironment, setRatingEnvironment] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

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
      setCurrentUser(user);
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (data) {
        setUserRole(data.role);
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
        id, rating_massage, rating_service, rating_environment, comment, is_verified_interaction, created_at,
        client:profiles!reviews_client_id_fkey(name, verification_status)
      `)
      .eq('provider_id', id);
    if (!error && pReviews) {
      setReviews(pReviews);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
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
          is_verified_interaction: true
        });

      if (error) throw error;

      setReviewSuccess(true);
      setComment('');
      
      // Recarregar avaliações
      await fetchReviews();
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

  return (
    <div className="flex flex-col md:flex-row gap-8 items-start">
      {/* Avatar Principal */}
      <div className={`w-full md:w-1/3 aspect-[4/5] sm:aspect-[3/4] max-h-[360px] md:max-h-none rounded-2xl overflow-hidden shadow-2xl relative flex-shrink-0 border-2 ${
        isAvailable ? 'border-emerald-500 neon-ring-active' : profile.subscription_tier === 'gold' ? 'border-gold-primary' : 'border-white/5'
      }`}>
        <Image 
          src={profile.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400'} 
          alt={profile.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover select-none pointer-events-none"
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          priority
        />
        {/* Tag Foto 100% */}
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 z-10">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] font-semibold tracking-wide uppercase text-white">Foto Real</span>
        </div>
      </div>

      {/* Dados */}
      <div className="flex-1 w-full space-y-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
              {profile.name}, <span className="font-light text-gray-400">{profile.age}</span>
            </h1>
            
            {profile.verification_status === 'verified' && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-1.5 rounded-full" title="Identidade Verificada">
                <ShieldCheck className="w-5 h-5" />
              </div>
            )}
            {profile.is_space_verified && (
              <div className="bg-gold-primary/10 border border-gold-primary/20 text-gold-light p-1.5 rounded-full" title="Espaço Auditado e Validado">
                <Building2 className="w-5 h-5" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2.5 mt-2">
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <MapPin className="w-4 h-4 text-wine-light/80" />
              <span>{profile.neighborhood || 'Bairro não informado'}, {profile.city}</span>
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
                  <ShieldCheck className="w-3.5 h-3.5" /> Identidade Verificada
                </span>
              )}
              {profile.is_space_verified && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold-primary/10 border border-gold-primary/20 text-gold-light text-[10px] font-bold uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5" /> Espaço Auditado
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Especialidades */}
        {specialtyNames.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {specialtyNames.map((spec: string) => (
              <span key={spec} className="px-3 py-1 rounded-full border border-gold-primary/30 bg-gold-primary/10 text-gold-light text-xs font-medium tracking-wide">
                {spec}
              </span>
            ))}
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
          <div className="flex sm:flex-col justify-between sm:justify-start items-center sm:items-start w-full sm:w-auto">
            <span className="text-xs text-gray-500 uppercase font-semibold">Valor da Hora</span>
            <div className="flex items-center gap-1.5 text-gold-light">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 -mr-1" />
              <span className="text-2xl sm:text-3xl font-bold">{profile.price_per_hour}</span>
              <span className="text-gray-500 text-xs font-light">/ hr</span>
            </div>
          </div>
          
          {(() => {
            const whatsappMessage = profile.whatsapp_custom_message
              || `Olá ${profile.name}! Vi seu anúncio no Relaxa & Goza e gostaria de agendar um horário.`;
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

        {/* Descrição / Bio Estruturada */}
        {profile.bio && (
          <div className="pt-6 border-t border-white/10 space-y-6">
            {(() => {
              const parsed = parseBio(profile.bio);
              if (parsed.included || parsed.rules) {
                return (
                  <div className="space-y-6">
                    {parsed.specialties && (
                      <div className="space-y-2.5">
                        <h4 className="text-xs font-bold text-gold-light uppercase tracking-wider">Especialidades e Experiência</h4>
                        <p className="text-gray-400 text-xs leading-relaxed font-light whitespace-pre-wrap">{parsed.specialties}</p>
                      </div>
                    )}
                    {parsed.included && (
                      <div className="space-y-2.5 bg-white/[0.01] border border-white/5 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-gold-primary" /> Incluso no Atendimento
                        </h4>
                        <p className="text-gray-400 text-xs leading-relaxed font-light whitespace-pre-wrap">{parsed.included}</p>
                      </div>
                    )}
                    {parsed.rules && (
                      <div className="space-y-2.5 bg-wine-primary/[0.02] border border-wine-primary/10 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-wine-light uppercase tracking-wider">Regras & Restrições</h4>
                        <p className="text-gray-400 text-xs leading-relaxed font-light whitespace-pre-wrap">{parsed.rules}</p>
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <div className="space-y-2.5">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-widest">Sobre Mim</h3>
                  <div className="text-gray-400 text-xs leading-relaxed whitespace-pre-wrap font-light">
                    {profile.bio}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Galeria de Fotos */}
        <div className="space-y-4 pt-6 border-t border-white/5">
          <h3 className="text-sm font-semibold text-white uppercase tracking-widest flex items-center gap-2">
            <Star className="w-4 h-4 text-wine-light" />
            Galeria de Fotos
          </h3>
          
          {photos.length === 0 ? (
            <p className="text-gray-500 text-xs font-light">Nenhuma foto adicional cadastrada.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map(photo => (
                <div key={photo.id} className="relative aspect-[3/4] rounded-xl overflow-hidden group cursor-pointer border border-white/5">
                  <Image 
                    src={photo.photo_url} 
                    alt="Galeria" 
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105 select-none pointer-events-none"
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                  />
                  {photo.is_verified && (
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-emerald-500/20 text-emerald-400 z-10">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Avaliações do Círculo de Confiança */}
        <div className="space-y-6 pt-6 border-t border-white/5">
          <h3 className="text-sm font-semibold text-white uppercase tracking-widest flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gold-primary" />
            Opinião dos Clientes ({count})
          </h3>

          {/* Form para Deixar Avaliação */}
          {currentUser && userRole === 'client' ? (
            <form onSubmit={handleSubmitReview} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-semibold text-white">Deixar minha Avaliação de Segurança</h4>
              
              {reviewSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 animate-fadeIn">
                  <CheckCircle className="w-4 h-4 text-emerald-400" /> Avaliação publicada com sucesso!
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase font-medium">Nota Terapia (1-5)</label>
                  <select 
                    value={ratingMassage} 
                    onChange={(e) => setRatingMassage(Number(e.target.value))}
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
                  <label className="text-[10px] text-gray-500 uppercase font-medium">Nota Atendimento (1-5)</label>
                  <select 
                    value={ratingService} 
                    onChange={(e) => setRatingService(Number(e.target.value))}
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
                  <label className="text-[10px] text-gray-500 uppercase font-medium">Nota Espaço (1-5)</label>
                  <select 
                    value={ratingEnvironment} 
                    onChange={(e) => setRatingEnvironment(Number(e.target.value))}
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

              <button 
                type="submit"
                disabled={submittingReview}
                className="px-6 py-2.5 rounded-xl bg-gold-primary text-dark-bg hover:bg-gold-light text-xs font-semibold tracking-wide transition-all disabled:opacity-50"
              >
                {submittingReview ? 'Enviando...' : 'Publicar Avaliação'}
              </button>
            </form>
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
    </div>
  );
}
