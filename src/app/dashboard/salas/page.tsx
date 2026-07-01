'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Upload, 
  Check, 
  AlertCircle,
  Clock,
  Sparkles,
  MapPin,
  DollarSign
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const AMENITIES_LIST = [
  { id: 'ar_condicionado', name: 'Ar Condicionado' },
  { id: 'chuveiro', name: 'Chuveiro Privativo' },
  { id: 'maca', name: 'Maca de Massagem' },
  { id: 'toalhas', name: 'Toalhas Limpas' },
  { id: 'ring_light', name: 'Ring Light / Iluminação' },
  { id: 'wifi', name: 'Wi-Fi de Alta Velocidade' },
  { id: 'estacionamento', name: 'Estacionamento' },
  { id: 'som', name: 'Caixa de Som Bluetooth' },
  { id: 'bebidas', name: 'Água & Bebidas inclusas' }
];

export default function HostRoomsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pricePerHour, setPricePerHour] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  useEffect(() => {
    fetchProfileAndRooms();
  }, []);

  const fetchProfileAndRooms = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Buscar perfil para confirmar role = host
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profData) {
        setProfile(profData);
        if (profData.role !== 'host') {
          router.push('/dashboard');
          return;
        }

        // Verificar se é um dos 100 primeiros hosts por data de criação
        const { count: hostRank, error: countError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'host')
          .lte('created_at', profData.created_at);

        const isFreeLaunch = !countError && hostRank !== null && hostRank <= 100;

        if (profData.subscription_tier === 'free' && !isFreeLaunch) {
          router.push('/dashboard');
          return;
        }

        // Buscar salas do host
        const { data: roomData } = await supabase
          .from('rooms')
          .select('*')
          .eq('host_id', user.id)
          .order('created_at', { ascending: false });

        setRooms(roomData || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAmenityToggle = (amenityId: string) => {
    setSelectedAmenities(prev => 
      prev.includes(amenityId)
        ? prev.filter(a => a !== amenityId)
        : [...prev, amenityId]
    );
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedPhotos(prev => [...prev, ...filesArray]);
      
      const previewsArray = filesArray.map(file => URL.createObjectURL(file));
      setPhotoPreviews(prev => [...prev, ...previewsArray]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (selectedPhotos.length === 0) {
      alert('Por favor, adicione pelo menos uma foto da sua sala.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload das fotos para o storage
      const uploadedUrls: string[] = [];
      for (let i = 0; i < selectedPhotos.length; i++) {
        const file = selectedPhotos[i];
        const ext = file.name.split('.').pop() || 'jpg';
        const fileName = `${profile.id}/room_${Date.now()}_${i}.${ext}`;
        
        const { error: uploadError } = await supabase.storage
          .from('profile_media')
          .upload(fileName, file, { cacheControl: '3600', upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('profile_media')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      // 2. Inserir sala no banco
      const { data: newRoom, error: insertError } = await supabase
        .from('rooms')
        .insert({
          host_id: profile.id,
          title,
          description,
          price_per_hour: Number(pricePerHour),
          city: profile.city || 'São Paulo',
          neighborhood,
          address,
          photos: uploadedUrls,
          amenities: selectedAmenities,
          is_available: true,
          is_verified: false // Precisa de moderação
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 3. Atualizar estados
      setRooms(prev => [newRoom, ...prev]);
      setShowAddForm(false);
      
      // Reset form fields
      setTitle('');
      setDescription('');
      setPricePerHour('');
      setNeighborhood('');
      setAddress('');
      setSelectedAmenities([]);
      setSelectedPhotos([]);
      setPhotoPreviews([]);

      alert('Sala adicionada com sucesso! Ela ficará disponível para as anunciantes assim que for validada pelo moderador.');
    } catch (err: any) {
      alert('Erro ao cadastrar sala: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta sala? Esta ação é irreversível.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId);

      if (error) throw error;
      setRooms(prev => prev.filter(r => r.id !== roomId));
    } catch (err: any) {
      alert('Erro ao excluir sala: ' + (err.message || err));
    }
  };

  if (loading) {
    return (
      <div className="w-full flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-emerald-600/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-20 text-center space-y-4 animate-fadeIn">
      <Building2 className="w-12 h-12 text-gold-primary mx-auto" />
      <h2 className="text-xl font-bold text-white">Recurso de Locais Temporariamente Indisponível</h2>
      <p className="text-xs text-gray-400 font-light leading-relaxed">
        O cadastro e aluguel de espaços físicos está temporariamente ocultado para o lançamento do portal. Em breve você poderá gerenciar suas salas por aqui!
      </p>
    </div>
  );

  // O restante do componente é mantido abaixo mas inacessível para o build não quebrar
  const oldRender = (
    <div className="max-w-4xl mx-auto space-y-8 relative z-20 pb-16 selection:bg-emerald-500 selection:text-dark-bg">
      {/* Header */}
      <div className="border-b border-dark-border/20 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-white tracking-tight">
            Gerenciar <span className="font-semibold text-emerald-400">Minhas Salas</span>
          </h1>
          <p className="text-xs md:text-sm text-gray-400 font-light mt-1.5">
            Cadastre salas premium de trabalho e disponibilize-as para as anunciantes reservarem no portal.
          </p>
        </div>
        
        {!showAddForm && (
          <button 
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Nova Sala
          </button>
        )}
      </div>

      {/* Formulário de Cadastro */}
      {showAddForm && (
        <div className="glass-effect rounded-2xl border border-emerald-500/20 p-6 md:p-8 space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-dark-border/20 pb-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              Detalhes da Nova Sala
            </h3>
            <button 
              onClick={() => setShowAddForm(false)}
              className="text-xs text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Título */}
              <div className="space-y-1.5">
                <label htmlFor="room-title-input" className="text-xs text-gray-400 font-medium">Nome / Título da Sala</label>
                <input 
                  id="room-title-input"
                  type="text"
                  title="Nome / Título da Sala"
                  placeholder="Ex: Sala Luxo com Hidro e Maca"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white px-4 py-3 rounded-xl focus:border-emerald-500/50 focus:outline-none transition-colors"
                  required
                />
              </div>

              {/* Preço */}
              <div className="space-y-1.5">
                <label htmlFor="room-price-input" className="text-xs text-gray-400 font-medium">Preço por Hora (R$)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
                  <input 
                    id="room-price-input"
                    type="number"
                    title="Preço por Hora"
                    placeholder="Ex: 80"
                    value={pricePerHour}
                    onChange={(e) => setPricePerHour(e.target.value)}
                    className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white pl-10 pr-4 py-3 rounded-xl focus:border-emerald-500/50 focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Endereço */}
              <div className="space-y-1.5">
                <label htmlFor="room-address-input" className="text-xs text-gray-400 font-medium">Endereço Completo</label>
                <input 
                  id="room-address-input"
                  type="text"
                  title="Endereço Completo"
                  placeholder="Rua/Av, número, complemento"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white px-4 py-3 rounded-xl focus:border-emerald-500/50 focus:outline-none transition-colors"
                  required
                />
              </div>

              {/* Bairro */}
              <div className="space-y-1.5">
                <label htmlFor="room-neighborhood-input" className="text-xs text-gray-400 font-medium">Bairro</label>
                <input 
                  id="room-neighborhood-input"
                  type="text"
                  title="Bairro"
                  placeholder="Ex: Jardins"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white px-4 py-3 rounded-xl focus:border-emerald-500/50 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <label htmlFor="room-description-input" className="text-xs text-gray-400 font-medium">Descrição da Infraestrutura e Regras</label>
              <textarea 
                id="room-description-input"
                title="Descrição da Infraestrutura e Regras"
                placeholder="Descreva o espaço, conforto, privacidade, regras de uso, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white px-4 py-3 rounded-xl focus:border-emerald-500/50 focus:outline-none transition-colors resize-none"
                required
              />
            </div>

            {/* Comodidades (Checkboxes) */}
            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-medium block">Facilidades inclusas</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {AMENITIES_LIST.map((amenity) => {
                  const isChecked = selectedAmenities.includes(amenity.id);
                  return (
                    <button
                      key={amenity.id}
                      type="button"
                      onClick={() => handleAmenityToggle(amenity.id)}
                      className={`px-3 py-2 text-[10px] sm:text-xs font-semibold rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isChecked 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                          : 'bg-black/35 border-dark-border/60 text-gray-400 hover:text-white hover:border-white/10'
                      }`}
                    >
                      {amenity.name}
                      {isChecked && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fotos da Sala */}
            <div className="space-y-2">
              <label htmlFor="room-photos-upload" className="text-xs text-gray-400 font-medium block cursor-pointer">Fotos da Sala (Mínimo 1)</label>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Upload Button */}
                <div className="relative border border-dashed border-dark-border hover:border-emerald-500/50 transition-colors rounded-xl p-4 bg-dark-bg/40 flex flex-col items-center justify-center gap-2 aspect-video cursor-pointer min-h-[90px]">
                  <input 
                    id="room-photos-upload"
                    type="file" 
                    title="Fotos da Sala"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="w-5 h-5 text-gray-500" />
                  <span className="text-[10px] text-gray-400 text-center">Adicionar Fotos</span>
                </div>

                {/* Previews */}
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-black/40 group">
                    <img src={preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(index)}
                      title="Remover Foto"
                      className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-red-600/90 text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button 
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_4px_12px_rgba(16,185,129,0.2)] disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Cadastrando Sala...' : 'Cadastrar Sala'}
            </button>
          </form>
        </div>
      )}

      {/* Lista de Salas */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-white">Minhas Salas Cadastradas ({rooms.length})</h3>

        {rooms.length === 0 ? (
          <div className="glass-effect rounded-2xl border border-dark-border/60 p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <h4 className="text-xs font-semibold text-white">Nenhuma sala cadastrada</h4>
            <p className="text-[10px] text-gray-500 font-light max-w-sm mx-auto mt-1 leading-relaxed">
              Você ainda não cadastrou nenhuma sala de trabalho para alugar. Clique em "Cadastrar Nova Sala" no topo para começar.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rooms.map((room) => {
              const isVerified = room.is_verified;
              return (
                <div key={room.id} className="glass-effect rounded-2xl border border-dark-border/60 overflow-hidden flex flex-col justify-between">
                  {/* Carrossel de fotos (estático na primeira foto por simplificação) */}
                  <div className="relative aspect-video w-full bg-black/40">
                    <img 
                      src={room.photos?.[0] || 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6'} 
                      alt={room.title} 
                      className="w-full h-full object-cover"
                    />

                    {/* Badge de Verificação */}
                    <div className="absolute top-3 left-3">
                      {isVerified ? (
                        <span className="text-[9px] bg-emerald-500/90 text-white px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
                          <Check className="w-3 h-3" /> Listada / Ativa
                        </span>
                      ) : (
                        <span className="text-[9px] bg-amber-500/90 text-white px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
                          <Clock className="w-3 h-3 animate-pulse" /> Em Validação
                        </span>
                      )}
                    </div>

                    {/* Preço Overlay */}
                    <div className="absolute bottom-3 right-3 bg-black/75 px-3 py-1.5 rounded-lg border border-white/5">
                      <span className="text-[10px] text-emerald-400 font-bold">R$ {Number(room.price_per_hour).toFixed(2)}/h</span>
                    </div>
                  </div>

                  {/* Detalhes */}
                  <div className="p-5 space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white tracking-wide truncate">{room.title}</h4>
                      <p className="text-[10px] text-gray-400 font-light flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-500" />
                        {room.neighborhood}, {room.city}
                      </p>
                    </div>

                    <p className="text-[11px] text-gray-500 font-light leading-relaxed line-clamp-2">
                      {room.description}
                    </p>

                    {/* Comodidades */}
                    <div className="flex flex-wrap gap-1.5">
                      {room.amenities?.map((amenity: string) => {
                        const name = AMENITIES_LIST.find(a => a.id === amenity)?.name || amenity;
                        return (
                          <span key={amenity} className="text-[8px] bg-white/5 text-gray-400 px-2 py-0.5 rounded border border-white/5 font-semibold">
                            {name}
                          </span>
                        );
                      })}
                    </div>

                    {/* Ações */}
                    <div className="border-t border-dark-border/20 pt-4 flex justify-between items-center">
                      {!isVerified && (
                        <span className="text-[9px] text-gray-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Aguardando moderação
                        </span>
                      )}
                      {isVerified && <div />}
                      
                      <button
                        onClick={() => handleDeleteRoom(room.id)}
                        className="flex items-center gap-1 text-[10px] font-semibold text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Excluir Sala
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
