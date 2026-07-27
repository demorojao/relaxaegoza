'use client';

import React from 'react';
import { 
  Sparkles, 
  MessageCircle, 
  Crown, 
  MapPin, 
  CheckCircle, 
  ShieldCheck, 
  Star, 
  ExternalLink, 
  Calendar, 
  Clock,
  Heart,
  Share2
} from 'lucide-react';
import Link from 'next/link';
import { getCDNUrl } from '@/lib/mediaHelper';

interface BioClientViewProps {
  profile: any;
  ad?: any;
  mediaCount?: number;
}

export default function BioClientView({ profile, ad, mediaCount = 0 }: BioClientViewProps) {
  const [copied, setCopied] = React.useState(false);

  const name = profile?.name || 'Profissional VIP';
  const avatarUrl = profile?.avatar_url ? getCDNUrl(profile.avatar_url) : '/placeholder-avatar.png';
  const bioText = profile?.bio || ad?.description || 'Atendimento exclusivo de alta qualidade com discrição, conforto e elegância.';
  const city = profile?.city || ad?.city || 'São Paulo';
  const neighborhood = profile?.neighborhood || ad?.neighborhood || '';
  const isAvailable = profile?.is_available || false;
  const whatsappNumber = profile?.whatsapp || ad?.whatsapp || '';

  const cleanWhatsapp = whatsappNumber.replace(/\D/g, '');
  const whatsappMessage = encodeURIComponent(`Olá ${name}! Vi seu cartão no Instagram/TikTok e gostaria de informações sobre horários de atendimento.`);
  const whatsappUrl = cleanWhatsapp ? `https://wa.me/55${cleanWhatsapp}?text=${whatsappMessage}` : '#';

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${name} | Perfil Oficial`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white flex flex-col items-center justify-between p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Dynamic Ambient Background Blur */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-gold-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-wine-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md mx-auto space-y-6 pt-6 relative z-10">
        
        {/* Share Button Header */}
        <div className="flex justify-end">
          <button
            onClick={handleShare}
            className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white transition-all cursor-pointer shadow-md"
            title="Compartilhar Cartão Digital"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Avatar & Badges */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative group">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-gradient-to-tr from-gold-primary via-gold-light to-wine-primary shadow-2xl shadow-gold-primary/20">
              <img
                src={avatarUrl}
                alt={name}
                className="w-full h-full object-cover rounded-full select-none"
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>

            {/* Status Live */}
            {isAvailable && (
              <span className="absolute bottom-1 right-1 bg-emerald-500 text-dark-bg text-[10px] font-extrabold px-2 py-0.5 rounded-full border-2 border-[#0B0B0E] flex items-center gap-1 shadow-lg animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-dark-bg" /> ON
              </span>
            )}
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
              {name}
              <ShieldCheck className="w-5 h-5 text-gold-primary shrink-0" />
            </h1>

            <p className="text-xs text-gold-light font-medium flex items-center justify-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-gold-primary" />
              {neighborhood ? `${neighborhood}, ${city}` : city}
            </p>
          </div>

          {/* Bio Snippet */}
          <p className="text-xs text-gray-400 font-light max-w-xs leading-relaxed line-clamp-3 bg-white/5 p-3 rounded-2xl border border-white/5">
            "{bioText}"
          </p>
        </div>

        {/* Action Buttons (Link-in-Bio style) */}
        <div className="space-y-3.5 pt-2">
          
          {/* Primary CTA: WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-dark-bg font-extrabold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/20 hover:scale-[1.02] cursor-pointer"
          >
            <MessageCircle className="w-5 h-5 fill-dark-bg" />
            Agendar no WhatsApp
          </a>

          {/* Secondary CTA: Clube VIP Exclusivo */}
          <Link href={`/perfil/${profile.id}`}>
            <div className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-gold-primary/20 via-black/80 to-gold-primary/10 border border-gold-primary/40 hover:border-gold-primary text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-between shadow-lg cursor-pointer group hover:scale-[1.01]">
              <span className="flex items-center gap-2 text-gold-light">
                <Crown className="w-4 h-4 text-gold-primary animate-pulse" />
                Clube VIP & Conteúdo Exclusivo
              </span>
              <span className="text-[10px] bg-gold-primary text-dark-bg px-2 py-0.5 rounded-full font-extrabold">
                {mediaCount} Mídias
              </span>
            </div>
          </Link>

          {/* Full Profile View */}
          <Link href={`/perfil/${profile.id}`}>
            <div className="w-full py-3.5 px-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 hover:text-white font-semibold text-xs transition-all flex items-center justify-between cursor-pointer">
              <span className="flex items-center gap-2">
                <Star className="w-4 h-4 text-gold-primary" />
                Ver Perfil Completo & Fotos HD
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
            </div>
          </Link>

        </div>

        {/* Security & Verification Footer */}
        <div className="pt-4 text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-gold-primary/10 border border-gold-primary/20 px-3 py-1 rounded-full text-[10px] text-gold-light font-bold">
            <CheckCircle className="w-3 h-3 text-gold-primary" />
            Perfil Verificado & Auditado
          </div>
        </div>

      </div>

      {/* Footer Powered By */}
      <footer className="py-6 text-center text-[10px] text-gray-600 font-light relative z-10">
        © {new Date().getFullYear()} Cartão VIP Digital • Atendimento Exclusivo
      </footer>
    </div>
  );
}
