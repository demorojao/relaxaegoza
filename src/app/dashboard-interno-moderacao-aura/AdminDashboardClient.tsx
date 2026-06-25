'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ShieldCheck, 
  Clock, 
  Check, 
  X, 
  Search, 
  Building2, 
  User, 
  Eye, 
  ChevronRight,
  Sparkles,
  ChevronDown,
  Settings,
  DollarSign,
  Image as ImageIcon,
  Trash2,
  ShieldAlert,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

interface AdminDashboardClientProps {
  initialProfiles: any[];
  initialRooms: any[];
  initialPhotos: any[];
  adminSecret: string;
}

export default function AdminDashboardClient({
  initialProfiles,
  initialRooms,
  initialPhotos,
  adminSecret
}: AdminDashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pending' | 'rooms' | 'all' | 'photos'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'provider' | 'client' | 'host'>('all');
  const [profiles, setProfiles] = useState<any[]>(initialProfiles);
  const [rooms, setRooms] = useState<any[]>(initialRooms);
  const [photos, setPhotos] = useState<any[]>(initialPhotos);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<any>({});

  const handleRoomModeration = async (roomId: string, status: 'verified' | 'rejected') => {
    setActionLoading(`${roomId}-room`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/internal-ops/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-admin-secret': adminSecret
        },
        body: JSON.stringify({ roomId, status, isRoom: true })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro na moderação da sala.');

      // Atualizar localmente
      setRooms(prev => prev.map(r => {
        if (r.id === roomId) {
          return { ...r, is_verified: status === 'verified' };
        }
        return r;
      }));
    } catch (err: any) {
      alert(err.message || 'Erro ao realizar ação.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleModeration = async (profileId: string, status: 'verified' | 'rejected' | 'none', isSpace = false) => {
    setActionLoading(`${profileId}-${isSpace ? 'space' : 'identity'}`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/internal-ops/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-admin-secret': adminSecret
        },
        body: JSON.stringify({ profileId, status, isSpace })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro na moderação.');

      // Atualizar localmente
      setProfiles(prev => prev.map(p => {
        if (p.id === profileId) {
          if (isSpace) {
            return { 
              ...p, 
              is_space_verified: status === 'verified',
              space_verification_file: status === 'rejected' ? null : p.space_verification_file
            };
          } else {
            return { ...p, verification_status: status };
          }
        }
        return p;
      }));
    } catch (err: any) {
      alert(err.message || 'Erro ao realizar ação.');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePhotoModeration = async (photoId: string, status: 'verified' | 'rejected') => {
    setActionLoading(`${photoId}-photo`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/internal-ops/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-admin-secret': adminSecret
        },
        body: JSON.stringify({ photoId, status, isPhoto: true })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro na moderação da foto.');

      // Atualizar localmente
      if (status === 'rejected') {
        setPhotos(prev => prev.filter(p => p.id !== photoId));
      } else {
        setPhotos(prev => prev.map(p => {
          if (p.id === photoId) {
            return { ...p, is_verified: true };
          }
          return p;
        }));
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao realizar ação.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleProfileUpdate = async (profileId: string, fields: any) => {
    setActionLoading(`${profileId}-update`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/internal-ops/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'x-admin-secret': adminSecret
        },
        body: JSON.stringify({ profileId, isProfileUpdate: true, updateFields: fields })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Erro ao atualizar perfil.');

      // Atualizar localmente
      setProfiles(prev => prev.map(p => {
        if (p.id === profileId) {
          return { ...p, ...fields };
        }
        return p;
      }));
      alert('Perfil atualizado com sucesso!');
    } catch (err: any) {
      alert(err.message || 'Erro ao realizar ação.');
    } finally {
      setActionLoading(null);
    }
  };

  // Filtragem dos dados
  const pendingProfiles = profiles.filter(p => 
    p.verification_status === 'pending' || 
    (p.space_verification_file && !p.is_space_verified)
  );
  
  const pendingFiltered = pendingProfiles.filter(p => {
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.city && p.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          p.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const filteredProfiles = profiles.filter(p => {
    const matchesRole = roleFilter === 'all' || p.role === roleFilter;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.city && p.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          p.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="space-y-8 relative z-10">
      
      {/* Header */}
      <div className="border-b border-dark-border/20 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-light text-white tracking-tight flex items-center gap-2">
            Painel de <span className="font-semibold text-gold-primary">Moderação & Selos</span>
            <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/25 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Admin</span>
          </h1>
          <p className="text-xs text-gray-400 font-light mt-1.5">
            Revise as selfies de identidade (provedores e clientes) e ative os selos de conforto físico nos perfis.
          </p>
        </div>
        
        <Button 
          variant="dark"
          onClick={() => router.push('/dashboard')}
          className="text-xs"
        >
          Ir para Dashboard Profissional
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <Card variant="glass" className="p-5 flex items-center justify-between border-white/5 bg-black/20">
          <div>
            <span className="text-[10px] text-gray-500 uppercase block font-bold">IDs Pendentes</span>
            <span className="text-2xl font-bold text-gold-primary mt-1 block">{pendingProfiles.length}</span>
          </div>
          <div className="w-10 h-10 bg-gold-primary/10 rounded-xl flex items-center justify-center text-gold-primary">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
        </Card>

        <Card variant="glass" className="p-5 flex items-center justify-between border-white/5 bg-black/20">
          <div>
            <span className="text-[10px] text-gray-500 uppercase block font-bold">Fotos Galeria Pendentes</span>
            <span className="text-2xl font-bold text-wine-light mt-1 block">
              {photos.filter(p => !p.is_verified).length}
            </span>
          </div>
          <div className="w-10 h-10 bg-wine-primary/10 rounded-xl flex items-center justify-center text-wine-light">
            <ImageIcon className="w-5 h-5 animate-pulse" />
          </div>
        </Card>

        <Card variant="glass" className="p-5 flex items-center justify-between border-white/5 bg-black/20">
          <div>
            <span className="text-[10px] text-gray-500 uppercase block font-bold">Total Usuários</span>
            <span className="text-2xl font-bold text-white mt-1 block">{profiles.length}</span>
          </div>
          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-gray-300">
            <User className="w-5 h-5" />
          </div>
        </Card>

        <Card variant="glass" className="p-5 flex items-center justify-between border-white/5 bg-black/20">
          <div>
            <span className="text-[10px] text-gray-500 uppercase block font-bold">Espaços Validados</span>
            <span className="text-2xl font-bold text-emerald-400 mt-1 block">
              {profiles.filter(p => p.is_space_verified).length}
            </span>
          </div>
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
            <Building2 className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Navegação de Abas, Filtros e Busca */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-black/40 p-3 rounded-2xl border border-white/5">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex gap-1 bg-black/45 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg tracking-wide transition-all cursor-pointer ${
                activeTab === 'pending' 
                  ? 'bg-gold-primary text-dark-bg font-bold shadow' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Fila de Pendências ({pendingProfiles.length})
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg tracking-wide transition-all cursor-pointer ${
                activeTab === 'photos' 
                  ? 'bg-gold-primary text-dark-bg font-bold shadow' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Moderar Fotos ({photos.filter(p => !p.is_verified).length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg tracking-wide transition-all cursor-pointer ${
                activeTab === 'all' 
                  ? 'bg-gold-primary text-dark-bg font-bold shadow' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Gerenciar Todos ({profiles.length})
            </button>
          </div>

          <div className="flex bg-black/45 p-1 rounded-xl border border-white/5">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                roleFilter === 'all' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setRoleFilter('provider')}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                roleFilter === 'provider' ? 'bg-gold-primary/20 text-gold-light' : 'text-gray-400 hover:text-white'
              }`}
            >
              Provedores
            </button>
            <button
              onClick={() => setRoleFilter('client')}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                roleFilter === 'client' ? 'bg-cyan-500/20 text-cyan-300' : 'text-gray-400 hover:text-white'
              }`}
            >
              Clientes
            </button>
          </div>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nome, cidade ou ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white pl-10 pr-4 py-2.5 rounded-xl focus:border-gold-primary/50 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Conteúdo da Aba */}
      {activeTab === 'pending' ? (
        pendingFiltered.length === 0 ? (
          <Card variant="glass" className="p-16 border-dashed border-white/10 text-center bg-black/10">
            <ShieldCheck className="w-12 h-12 text-emerald-500/80 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white">Fila vazia!</h3>
            <p className="text-xs text-gray-500 font-light mt-1 max-w-sm mx-auto">
              Não há nenhuma selfie ou documento correspondente aguardando análise de verificação de identidade no momento.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {pendingFiltered.map((p) => {
              const isClient = p.role === 'client';
              return (
                <Card key={p.id} variant="glass-gold" className="border-gold-primary/20 bg-black/35 shadow-xl overflow-hidden flex flex-col md:flex-row gap-6 p-6">
                  {/* Avatar */}
                  <div className="relative w-24 h-32 md:w-32 md:h-44 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-black/40">
                    <Image 
                      src={p.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2'}
                      alt={p.name}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  </div>

                  {/* Detalhes e Imagens de Validação */}
                  <div className="flex-1 flex flex-col justify-between gap-6">
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                        {p.name}
                        {p.age && <span className="text-xs text-gray-500 font-light">({p.age} anos)</span>}
                        {isClient ? (
                          <span className="text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Cliente</span>
                        ) : (
                          <span className="text-[9px] bg-gold-primary/10 text-gold-primary border border-gold-primary/25 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Provedor</span>
                        )}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                        {p.city && <span>Local: <strong className="text-white">{p.city}</strong></span>}
                        {!isClient && p.category && (
                          <span>Categoria: <strong className="text-gold-light uppercase">{p.category === 'massage' ? 'Massagem' : p.category === 'escort' ? 'Acompanhante' : 'Ambos'}</strong></span>
                        )}
                        {p.whatsapp && <span>WhatsApp: <strong className="text-white">{p.whatsapp}</strong></span>}
                      </div>
                    </div>

                    {/* Mídias de Validação */}
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                      {p.verification_status === 'pending' && (
                        <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex flex-col gap-2 relative">
                          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Selfie de Validação</span>
                          <div 
                            className="relative aspect-video rounded-lg overflow-hidden border border-white/10 cursor-zoom-in group"
                            onClick={() => setSelectedImage(p.verification_selfie || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2')}
                          >
                            <Image 
                              src={p.verification_selfie || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2'}
                              alt="Selfie"
                              fill
                              sizes="(max-width: 768px) 100vw, 300px"
                              className="object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        </div>
                      )}

                      {p.verification_status === 'pending' && !isClient && (
                        <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex flex-col gap-2 relative">
                          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">RG / CNH Digital</span>
                          <div 
                            className="relative aspect-video rounded-lg overflow-hidden border border-white/10 cursor-zoom-in group"
                            onClick={() => setSelectedImage(p.verification_document || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d')}
                          >
                            <Image 
                              src={p.verification_document || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d'}
                              alt="Documento"
                              fill
                              sizes="(max-width: 768px) 100vw, 300px"
                              className="object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        </div>
                      )}

                      {p.space_verification_file && !p.is_space_verified && (
                        <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex flex-col gap-2 relative col-span-full">
                          <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Mídia do Espaço (Vídeo/Foto)</span>
                          <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/40">
                            {p.space_verification_file.match(/\.(mp4|webm|ogg|mov)$/i) || p.space_verification_file.includes('video') ? (
                              <video src={p.space_verification_file} className="w-full max-h-60 object-contain rounded-lg" controls />
                            ) : (
                              <div 
                                className="relative aspect-video w-full rounded-lg overflow-hidden cursor-zoom-in group min-h-[180px]"
                                onClick={() => setSelectedImage(p.space_verification_file)}
                              >
                                <Image 
                                  src={p.space_verification_file}
                                  alt="Mídia do Espaço"
                                  fill
                                  sizes="(max-width: 768px) 100vw, 600px"
                                  className="object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                  <Eye className="w-5 h-5 text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações Moderativas */}
                  <div className="flex md:flex-col justify-end gap-3 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-white/5 md:pl-6 w-full md:w-auto min-w-[150px]">
                    {p.verification_status === 'pending' && (
                      <>
                        <Button
                          variant="gold"
                          onClick={() => handleModeration(p.id, 'verified')}
                          disabled={actionLoading !== null}
                          isLoading={actionLoading === `${p.id}-identity`}
                          className="flex-1 md:flex-none py-3"
                        >
                          <Check className="w-4 h-4 mr-1.5" />
                          Aprovar ID
                        </Button>
                        <Button
                          variant="dark"
                          onClick={() => handleModeration(p.id, 'rejected')}
                          disabled={actionLoading !== null}
                          className="flex-1 md:flex-none border border-red-500/30 hover:bg-red-500/10 text-red-400 py-3"
                        >
                          <X className="w-4 h-4 mr-1.5 text-red-500" />
                          Recusar ID
                        </Button>
                      </>
                    )}
                    {p.space_verification_file && !p.is_space_verified && (
                      <>
                        <Button
                          variant="gold"
                          onClick={() => handleModeration(p.id, 'verified', true)}
                          disabled={actionLoading !== null}
                          isLoading={actionLoading === `${p.id}-space`}
                          className="flex-1 md:flex-none py-3 bg-emerald-600 hover:bg-emerald-500 text-white border-none"
                        >
                          <Check className="w-4 h-4 mr-1.5" />
                          Aprovar Espaço
                        </Button>
                        <Button
                          variant="dark"
                          onClick={() => handleModeration(p.id, 'rejected', true)}
                          disabled={actionLoading !== null}
                          className="flex-1 md:flex-none border border-red-500/30 hover:bg-red-500/10 text-red-400 py-3"
                        >
                          <X className="w-4 h-4 mr-1.5 text-red-500" />
                          Recusar Espaço
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : activeTab === 'rooms' ? (
        rooms.filter(r => !r.is_verified).length === 0 ? (
          <Card variant="glass" className="p-16 border-dashed border-white/10 text-center bg-black/10">
            <Building2 className="w-12 h-12 text-emerald-500/80 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-white">Nenhuma sala aguardando validação!</h3>
            <p className="text-xs text-gray-500 font-light mt-1 max-w-sm mx-auto">
              Todas as salas cadastradas pelos hosts já foram moderadas ou não há novos cadastros de salas.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {rooms.filter(r => !r.is_verified).map((room) => {
              return (
                <Card key={room.id} variant="glass-gold" className="border-gold-primary/20 bg-black/35 shadow-xl overflow-hidden flex flex-col md:flex-row gap-6 p-6">
                  {/* Primeira Foto da Sala */}
                  <div className="relative w-full md:w-52 h-44 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-black/40">
                    <img 
                      src={room.photos?.[0] || 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6'}
                      alt={room.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Detalhes da Sala */}
                  <div className="flex-1 flex flex-col justify-between gap-4">
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                        {room.title}
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          Proprietário: {room.host?.name || 'Local'}
                        </span>
                      </h3>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                        <span>Preço: <strong className="text-emerald-400 font-bold">R$ {Number(room.price_per_hour).toFixed(2)}/h</strong></span>
                        <span>Cidade/Bairro: <strong className="text-white">{room.city} - {room.neighborhood}</strong></span>
                        <span>Endereço: <strong className="text-white">{room.address}</strong></span>
                      </div>
                      <p className="text-xs text-gray-400 font-light leading-relaxed mt-2">{room.description}</p>
                    </div>

                    {/* Fotos Adicionais da Sala */}
                    {room.photos && room.photos.length > 1 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Outras Fotos</span>
                        <div className="flex gap-2 overflow-x-auto pb-1.5">
                          {room.photos.slice(1).map((photo: string, index: number) => (
                            <div 
                              key={index}
                              className="relative w-24 h-16 rounded-lg overflow-hidden border border-white/10 cursor-zoom-in shrink-0 group"
                              onClick={() => setSelectedImage(photo)}
                            >
                              <img src={photo} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex md:flex-col justify-end gap-3 shrink-0 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-white/5 md:pl-6 w-full md:w-auto min-w-[150px]">
                    <Button
                      variant="gold"
                      onClick={() => handleRoomModeration(room.id, 'verified')}
                      disabled={actionLoading !== null}
                      isLoading={actionLoading === `${room.id}-room`}
                      className="flex-1 md:flex-none py-3"
                    >
                      <Check className="w-4 h-4 mr-1.5" />
                      Aprovar Sala
                    </Button>
                    <button
                      onClick={() => handleRoomModeration(room.id, 'rejected')}
                      disabled={actionLoading !== null}
                      className="flex-1 md:flex-none border border-red-500/30 hover:bg-red-500/10 text-red-400 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all"
                    >
                      <X className="w-4 h-4 mr-1.5 text-red-500 inline-block align-middle" />
                      Rejeitar
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : activeTab === 'photos' ? (
        (() => {
          const unverifiedPhotos = photos.filter(photo => !photo.is_verified);
          return unverifiedPhotos.length === 0 ? (
            <Card variant="glass" className="p-16 border-dashed border-white/10 text-center bg-black/10">
              <ImageIcon className="w-12 h-12 text-emerald-500/80 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white">Nenhuma foto pendente!</h3>
              <p className="text-xs text-gray-500 font-light mt-1 max-w-sm mx-auto">
                Todas as fotos da galeria enviadas pelos anunciantes já foram moderadas e aprovadas.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {unverifiedPhotos.map((photo) => {
                const profileName = photo.profiles?.name || 'Anunciante';
                const profileRole = photo.profiles?.role === 'client' ? 'Cliente' : 'Provedor';
                
                return (
                  <Card key={photo.id} variant="glass" className="overflow-hidden border-white/5 bg-black/35 shadow-xl flex flex-col justify-between">
                    <div className="relative aspect-[3/4] w-full bg-black/40 border-b border-white/5 group">
                      <img 
                        src={photo.photo_url}
                        alt={`Foto de ${profileName}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div 
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-zoom-in"
                        onClick={() => setSelectedImage(photo.photo_url)}
                      >
                        <Eye className="w-6 h-6 text-white" />
                      </div>
                      {photo.media_type === 'video' && (
                        <div className="absolute top-2 left-2 bg-red-500/80 text-white text-[9px] font-bold px-2 py-0.5 rounded uppercase">
                          Vídeo
                        </div>
                      )}
                    </div>
                    
                    <div className="p-4 space-y-3">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-white truncate">{profileName}</h4>
                        <p className="text-[9px] text-gray-500 font-light uppercase tracking-wider">{profileRole}</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="gold"
                          onClick={() => handlePhotoModeration(photo.id, 'verified')}
                          disabled={actionLoading !== null}
                          isLoading={actionLoading === `${photo.id}-photo`}
                          className="flex-1 py-2 text-[10px]"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          Aprovar
                        </Button>
                        <Button
                          variant="dark"
                          onClick={() => handlePhotoModeration(photo.id, 'rejected')}
                          disabled={actionLoading !== null}
                          className="flex-1 border border-red-500/30 hover:bg-red-500/10 text-red-400 py-2 text-[10px]"
                        >
                          <X className="w-3.5 h-3.5 mr-1 text-red-500" />
                          Recusar
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          );
        })()
      ) : (
        /* Gerenciar Todos os Anunciantes/Clientes/Hosts */
        <div className="grid grid-cols-1 gap-4">
          {filteredProfiles.map(p => {
            const hasPending = p.verification_status === 'pending';
            const isVerified = p.verification_status === 'verified';
            const isRejected = p.verification_status === 'rejected';
            const isClient = p.role === 'client';
            const isExpanded = expandedProfileId === p.id;

            return (
              <div key={p.id} className="space-y-2">
                <Card variant={isExpanded ? "glass-gold" : "glass"} className={`p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-white/5 bg-black/25 transition-all ${isExpanded ? 'border-gold-primary/30 ring-1 ring-gold-primary/10' : ''}`}>
                  <div className="flex items-center gap-3.5 w-full sm:w-auto">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border border-white/10 shrink-0 bg-black/40">
                      <Image 
                        src={p.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2'}
                        alt={p.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div className="space-y-0.5 truncate">
                      <h4 className="text-sm font-bold text-white truncate flex items-center gap-1.5 flex-wrap">
                        {p.name}
                        {isVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
                        {!isClient && p.is_space_verified && <Building2 className="w-3.5 h-3.5 text-gold-primary" />}
                        <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          isClient ? 'bg-cyan-500/10 text-cyan-400' : 'bg-gold-primary/10 text-gold-primary'
                        }`}>
                          {isClient ? 'Cliente' : 'Provedor'}
                        </span>
                        {p.subscription_tier && p.subscription_tier !== 'free' && (
                          <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold uppercase border ${
                            p.subscription_tier === 'gold' 
                              ? 'bg-gold-primary/20 border-gold-primary/35 text-gold-light' 
                              : 'bg-purple-500/20 border-purple-500/35 text-purple-300'
                          }`}>
                            {p.subscription_tier}
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-gray-500 truncate font-mono">ID: {p.id}</p>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <span className={`text-[9px] px-2.5 py-0.5 border rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${
                      isVerified 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : hasPending
                          ? 'bg-gold-primary/10 border-gold-primary/20 text-gold-light'
                          : isRejected
                            ? 'bg-red-500/10 border-red-500/20 text-red-400'
                            : 'bg-white/5 border-white/10 text-gray-400'
                    }`}>
                      Identidade:{' '}
                      {isVerified ? 'Ativa' : hasPending ? 'Análise' : isRejected ? 'Recusada' : 'Nenhuma'}
                    </span>

                    {!isClient && (
                      <span className={`text-[9px] px-2.5 py-0.5 border rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${
                        p.is_space_verified 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-white/5 border-white/10 text-gray-400'
                      }`}>
                        Ambiente: {p.is_space_verified ? 'Auditado' : 'Sem Selo'}
                      </span>
                    )}
                  </div>

                  {/* Botões de Ação para Administrador */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedProfileId(null);
                        } else {
                          setExpandedProfileId(p.id);
                          setEditFields({
                            subscription_tier: p.subscription_tier || 'free',
                            verification_status: p.verification_status || 'none',
                            is_space_verified: p.is_space_verified || false,
                            price_per_hour: p.price_per_hour || 0,
                            category: p.category || 'massage',
                            gender: p.gender || 'Feminino',
                            is_available_now: p.is_available_now || false
                          });
                        }
                      }}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-gold-primary" />
                      Ações
                      <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </Card>

                {/* Collapsible Panel */}
                {isExpanded && (
                  <Card variant="glass" className="p-5 border-gold-primary/20 bg-black/45 space-y-4 rounded-xl animate-fadeIn">
                    <div className="border-b border-white/5 pb-2.5 flex items-center justify-between">
                      <span className="text-xs font-bold text-gold-light uppercase tracking-wider flex items-center gap-1.5">
                        <Settings className="w-4 h-4 text-gold-primary" />
                        Configurações Administrativas do Perfil
                      </span>
                      <span className="text-[10px] text-gray-500">Exclusivo Admin</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {/* Subscription Tier */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-400 font-bold uppercase block">Plano de Assinatura (Upgrade/Downgrade)</label>
                        <select
                          value={editFields.subscription_tier}
                          onChange={(e) => setEditFields({ ...editFields, subscription_tier: e.target.value })}
                          className="w-full bg-dark-bg/85 border border-white/10 text-xs text-white rounded-lg px-3 py-2.5 focus:border-gold-primary/50 focus:outline-none transition-colors"
                        >
                          <option value="free">Bronze (Grátis)</option>
                          <option value="pro">Prata (Pro)</option>
                          <option value="gold">Ouro (Gold)</option>
                        </select>
                      </div>

                      {/* Verification Status */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-400 font-bold uppercase block">Status de Verificação de Identidade</label>
                        <select
                          value={editFields.verification_status}
                          onChange={(e) => setEditFields({ ...editFields, verification_status: e.target.value })}
                          className="w-full bg-dark-bg/85 border border-white/10 text-xs text-white rounded-lg px-3 py-2.5 focus:border-gold-primary/50 focus:outline-none transition-colors"
                        >
                          <option value="none">Nenhum (Não Iniciado)</option>
                          <option value="pending">Pendente (Em Análise)</option>
                          <option value="verified">Verificado (Aprovado)</option>
                          <option value="rejected">Rejeitado (Recusado)</option>
                        </select>
                      </div>

                      {/* Space Verification */}
                      {!isClient && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400 font-bold uppercase block">Selo de Espaço Físico / Ambiente</label>
                          <select
                            value={editFields.is_space_verified ? "true" : "false"}
                            onChange={(e) => setEditFields({ ...editFields, is_space_verified: e.target.value === "true" })}
                            className="w-full bg-dark-bg/85 border border-white/10 text-xs text-white rounded-lg px-3 py-2.5 focus:border-gold-primary/50 focus:outline-none transition-colors"
                          >
                            <option value="false">Sem Selo (Não Auditado)</option>
                            <option value="true">Selo Espaço Auditado</option>
                          </select>
                        </div>
                      )}

                      {/* Category */}
                      {!isClient && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400 font-bold uppercase block">Categoria de Atendimento</label>
                          <select
                            value={editFields.category}
                            onChange={(e) => setEditFields({ ...editFields, category: e.target.value })}
                            className="w-full bg-dark-bg/85 border border-white/10 text-xs text-white rounded-lg px-3 py-2.5 focus:border-gold-primary/50 focus:outline-none transition-colors"
                          >
                            <option value="massage">Apenas Massagem</option>
                            <option value="escort">Apenas Acompanhante</option>
                            <option value="both">Ambos (Massagem e Acompanhante)</option>
                          </select>
                        </div>
                      )}

                      {/* Gender */}
                      {!isClient && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400 font-bold uppercase block">Gênero</label>
                          <select
                            value={editFields.gender}
                            onChange={(e) => setEditFields({ ...editFields, gender: e.target.value })}
                            className="w-full bg-dark-bg/85 border border-white/10 text-xs text-white rounded-lg px-3 py-2.5 focus:border-gold-primary/50 focus:outline-none transition-colors"
                          >
                            <option value="Feminino">Feminino</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Trans">Trans</option>
                          </select>
                        </div>
                      )}

                      {/* Price Per Hour */}
                      {!isClient && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-gray-400 font-bold uppercase block">Valor da Hora (R$)</label>
                          <input
                            type="number"
                            value={editFields.price_per_hour}
                            onChange={(e) => setEditFields({ ...editFields, price_per_hour: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-dark-bg/85 border border-white/10 text-xs text-white rounded-lg px-3 py-2 focus:border-gold-primary/50 focus:outline-none transition-colors"
                          />
                        </div>
                      )}

                      {/* Availability (Boost) */}
                      {!isClient && (
                        <div className="space-y-1.5 col-span-full">
                          <label className="text-[10px] text-gray-400 font-bold uppercase block">Status Disponível Agora / Destaque</label>
                          <div className="flex items-center gap-4 bg-dark-bg/40 border border-white/5 p-3 rounded-lg">
                            <input
                              type="checkbox"
                              id={`available-${p.id}`}
                              checked={editFields.is_available_now}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                const expDate = isChecked ? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() : null;
                                setEditFields({
                                  ...editFields,
                                  is_available_now: isChecked,
                                  available_until: expDate
                                });
                              }}
                              className="w-4 h-4 rounded text-gold-primary bg-black border-white/20 focus:ring-gold-primary/50 focus:ring-offset-black cursor-pointer"
                            />
                            <label htmlFor={`available-${p.id}`} className="text-xs text-gray-300 cursor-pointer font-light select-none">
                              Ativar "Disponível Agora" (Força visibilidade no topo da vitrine pelas próximas 2 horas)
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-white/5">
                      <Button
                        variant="dark"
                        onClick={() => setExpandedProfileId(null)}
                        className="py-2 text-[11px] px-4 border border-white/10 hover:bg-white/5"
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="gold"
                        onClick={() => {
                          handleProfileUpdate(p.id, editFields);
                          setExpandedProfileId(null);
                        }}
                        disabled={actionLoading !== null}
                        isLoading={actionLoading === `${p.id}-update`}
                        className="py-2 text-[11px] px-5"
                      >
                        <Check className="w-4 h-4 mr-1.5" />
                        Salvar Alterações
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal para visualizar imagens grandes */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 cursor-zoom-out animate-fadeIn"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative w-full max-w-4xl h-full max-h-[85vh]">
            <Image 
              src={selectedImage}
              alt="Ampliada"
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
          <button 
            className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 border border-white/10 text-white cursor-pointer hover:bg-white/10"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

    </div>
  );
}
