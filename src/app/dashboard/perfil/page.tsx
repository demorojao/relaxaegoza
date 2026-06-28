'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  UserSquare2, 
  MapPin, 
  Phone, 
  CheckSquare, 
  FileText, 
  Sparkles,
  ShieldAlert,
  Save,
  Check,
  Upload,
  Camera,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Play,
  Video,
  FileImage
} from 'lucide-react';
import ImageBlurSelector from '@/components/ImageBlurSelector';
import { getCDNUrl } from '@/lib/mediaHelper';
import { Badge } from '@/components/ui/Badge';

export default function ProfileEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  // Tabs state
  const [activeTab, setActiveTab] = useState<'profile' | 'ad'>('profile');

  // Estados do Formulário do Perfil
  const [stageName, setStageName] = useState('');
  const [age, setAge] = useState(18);
  const [whatsapp, setWhatsapp] = useState('');
  const [whatsappCustomMessage, setWhatsappCustomMessage] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [rate, setRate] = useState(0);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Avatar states
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [blurImageSrc, setBlurImageSrc] = useState<string | null>(null);

  // Segmentação por Categoria Principal e Gênero
  const [category, setCategory] = useState<'massage' | 'escort' | 'both'>('massage');
  const [targetAudience, setTargetAudience] = useState<string[]>([]);
  const [gender, setGender] = useState<'Feminino' | 'Masculino' | 'Trans'>('Feminino');

  // Blocos Estruturados de Copywriting
  const [specialties, setSpecialties] = useState('');
  const [whatsIncluded, setWhatsIncluded] = useState('');
  const [rules, setRules] = useState('');

  // Comodidades selecionadas
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // Estados do Anúncio
  const [ad, setAd] = useState<any>(null);
  const [adTitle, setAdTitle] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [adPrice, setAdPrice] = useState(0);
  const [adPhotos, setAdPhotos] = useState<string[]>([]);
  const [adVideos, setAdVideos] = useState<string[]>([]);
  const [adIsActive, setAdIsActive] = useState(true);
  const [profilePhotosList, setProfilePhotosList] = useState<any[]>([]);
  const [uploadingAdMedia, setUploadingAdMedia] = useState(false);

  const massageAmenities = ['Maca Profissional', 'Óleos Essenciais Importados', 'Música de Relaxamento', 'Chuveiro Aquecido'];
  const escortAmenities = ['Ar Condicionado', 'Estacionamento Discreto', 'Drinks Cortesia', 'Wi-Fi de Alta Velocidade'];
  const generalAmenities = ['Local Próprio', 'Aceita Cartão / Pix'];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      
      // 1. Buscar Perfil
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setProfile(data);
        setStageName(data.name || '');
        setAge(data.age || 18);
        setWhatsapp(data.whatsapp || '');
        setWhatsappCustomMessage(data.whatsapp_custom_message || '');
        setNeighborhood(data.neighborhood || '');
        setCity(data.city || '');
        setRate(Number(data.price_per_hour) || 0);
        setCategory(data.category || 'massage');
        setTargetAudience(data.target_audience || []);
        setGender(data.gender || 'Feminino');
        setSelectedAmenities(data.amenities || []);
        setLatitude(data.latitude ? Number(data.latitude) : null);
        setLongitude(data.longitude ? Number(data.longitude) : null);
        setAvatarUrl(data.avatar_url || '');
        setAvatarPreview(data.avatar_url || null);
        
        // Parsing bio
        const bioText = data.bio || '';
        if (bioText.includes('=== ESPECIALIDADES ===')) {
          const parts = bioText.split('\n\n=== ');
          const specPart = parts.find((p: string) => p.startsWith('ESPECIALIDADES ==='))?.replace('ESPECIALIDADES ===\n', '') || '';
          const inclPart = parts.find((p: string) => p.startsWith('INCLUSO ==='))?.replace('INCLUSO ===\n', '') || '';
          const rulePart = parts.find((p: string) => p.startsWith('REGRAS ==='))?.replace('REGRAS ===\n', '') || '';
          setSpecialties(specPart);
          setWhatsIncluded(inclPart);
          setRules(rulePart);
        } else {
          setSpecialties(bioText);
        }

        // 2. Buscar Anúncio
        const { data: adData } = await supabase
          .from('ads')
          .select('*')
          .eq('profile_id', user.id)
          .maybeSingle();

        if (adData) {
          setAd(adData);
          setAdTitle(adData.title || '');
          setAdDescription(adData.description || '');
          setAdPrice(Number(adData.price) || 0);
          setAdPhotos(adData.photos || []);
          setAdVideos(adData.videos || []);
          setAdIsActive(adData.is_active ?? true);
        } else {
          // Valores padrão baseados no perfil
          setAdTitle(`Atendimento com ${data.name || ''}`);
          setAdDescription(data.bio || '');
          setAdPrice(Number(data.price_per_hour) || 0);
          setAdPhotos(data.avatar_url ? [data.avatar_url] : []);
          setAdVideos([]);
          setAdIsActive(true);
        }
      }

      // 3. Buscar fotos da galeria para seleção
      const { data: mediaData } = await supabase
        .from('profile_photos')
        .select('*')
        .eq('profile_id', user.id);
      
      if (mediaData) {
        setProfilePhotosList(mediaData);
      }
    }
    setLoading(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (confirm('Deseja borrar o rosto na foto de perfil para proteger sua privacidade?')) {
        setBlurImageSrc(result);
      } else {
        setAvatarFile(file);
        setAvatarPreview(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBlurConfirm = (processedDataUrl: string) => {
    setBlurImageSrc(null);
    setAvatarPreview(processedDataUrl);

    // Converter base64 para File
    const arr = processedDataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const file = new File([u8arr], 'avatar_borrado.jpg', { type: mime });
    setAvatarFile(file);
  };

  const toggleAmenity = (name: string) => {
    setSelectedAmenities(prev => 
      prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]
    );
  };

  const handleCategoryChange = (cat: 'massage' | 'escort' | 'both') => {
    setCategory(cat);
    if (cat === 'massage') {
      setSelectedAmenities(prev => prev.filter(ame => !escortAmenities.includes(ame)));
    } else if (cat === 'escort') {
      setSelectedAmenities(prev => prev.filter(ame => !massageAmenities.includes(ame)));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSuccess(false);

    // Helper para normalizar cidades e bairros para Title Case e unificar acentuações
    const normalizeLocationName = (str: string) => {
      if (!str) return '';
      let clean = str.trim().replace(/\s+/g, ' '); // remove espaços duplos
      
      // Capitalização de Title Case básica:
      clean = clean.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      
      // Dicionário de substituições comuns de cidades brasileiras para unificar acentuação
      const cityReplacements: Record<string, string> = {
        'Sao Paulo': 'São Paulo',
        'Sao Bernardo Do Campo': 'São Bernardo do Campo',
        'Sao Jose Dos Campos': 'São José dos Campos',
        'Sao Jose Do Rio Preto': 'São José do Rio Preto',
        'Sao Luis': 'São Luís',
        'Ribeirao Preto': 'Ribeirão Preto',
        'Florianopolis': 'Florianópolis',
        'Belem': 'Belém',
        'Goiania': 'Goiânia',
        'Brasilia': 'Brasília',
        'Maceio': 'Maceió',
        'Aracaju': 'Aracaju',
        'Joao Pessoa': 'João Pessoa',
        'Vitoria': 'Vitória',
        'Niteroi': 'Niterói',
        'Petropolis': 'Petrópolis',
        'Teresopolis': 'Teresópolis',
        'Sao Goncalo': 'São Gonçalo',
        'Sao Joao De Meriti': 'São João de Meriti',
      };

      // Preposições em minúsculas (de, do, da, dos, das, e)
      clean = clean.replace(/\b(De|Do|Da|Dos|Das|E)\b/g, (m) => m.toLowerCase());

      const key = clean.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove acentos para comparação
      
      for (const [k, v] of Object.entries(cityReplacements)) {
        if (k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === key.toLowerCase()) {
          return v;
        }
      }

      return clean;
    };

    const cleanCity = normalizeLocationName(city);
    const cleanNeighborhood = normalizeLocationName(neighborhood);

    setCity(cleanCity);
    setNeighborhood(cleanNeighborhood);

    // Formatar biografia estruturada
    const formattedBio = `=== ESPECIALIDADES ===\n${specialties}\n\n=== INCLUSO ===\n${whatsIncluded}\n\n=== REGRAS ===\n${rules}`;

    // Geocodificação automática via Nominatim API
    let lat = latitude;
    let lon = longitude;
    try {
      const queryStr = `${cleanNeighborhood}, ${cleanCity}, Brazil`;
      const geocodeRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryStr)}&format=json&limit=1`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'AuraPortal/1.0'
        }
      });
      const geocodeData = await geocodeRes.json();
      if (geocodeData && geocodeData.length > 0) {
        lat = parseFloat(geocodeData[0].lat);
        lon = parseFloat(geocodeData[0].lon);
      } else {
        // Fallback para buscar apenas por cidade
        const cityQueryStr = `${cleanCity}, Brazil`;
        const cityRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityQueryStr)}&format=json&limit=1`, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'AuraPortal/1.0'
          }
        });
        const cityData = await cityRes.json();
        if (cityData && cityData.length > 0) {
          lat = parseFloat(cityData[0].lat);
          lon = parseFloat(cityData[0].lon);
        }
      }
    } catch (e) {
      console.error("Erro ao geocodificar ao salvar perfil:", e);
    }

    try {
      let finalAvatarUrl = avatarUrl;

      // Se selecionou uma nova foto de perfil, faz upload
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}/avatar_${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('profile_media')
          .upload(fileName, avatarFile, {
            cacheControl: '3600',
            upsert: true
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('profile_media')
          .getPublicUrl(fileName);

        finalAvatarUrl = publicUrl;
        setAvatarUrl(publicUrl);
      }

      const updatePayload: any = {
        name: stageName,
        age: Number(age),
        whatsapp,
        neighborhood: cleanNeighborhood,
        city: cleanCity,
        price_per_hour: Number(rate),
        bio: formattedBio,
        category,
        target_audience: targetAudience,
        amenities: selectedAmenities,
        latitude: lat,
        longitude: lon,
        avatar_url: finalAvatarUrl
      };

      // Tenta atualizar com o campo de gênero e a mensagem personalizada de whatsapp; se falhar porque as colunas não existem (code 42703), salva com fallbacks adequados.
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ ...updatePayload, gender, whatsapp_custom_message: whatsappCustomMessage })
          .eq('id', user.id);
        
        if (error) {
          if (error.code === '42703') {
            const { error: fallbackError1 } = await supabase
              .from('profiles')
              .update({ ...updatePayload, gender })
              .eq('id', user.id);
            if (fallbackError1) {
              if (fallbackError1.code === '42703') {
                const { error: fallbackError2 } = await supabase
                  .from('profiles')
                  .update(updatePayload)
                  .eq('id', user.id);
                if (fallbackError2) throw fallbackError2;
              } else {
                throw fallbackError1;
              }
            }
          } else {
            throw error;
          }
        }
      } catch (e: any) {
        if (e.code === '42703') {
          const { error: fallbackError1 } = await supabase
            .from('profiles')
            .update({ ...updatePayload, gender })
            .eq('id', user.id);
          if (fallbackError1) {
            if (fallbackError1.code === '42703') {
              const { error: fallbackError2 } = await supabase
                .from('profiles')
                .update(updatePayload)
                .eq('id', user.id);
              if (fallbackError2) throw fallbackError2;
            } else {
              throw fallbackError1;
            }
          }
        } else {
          throw e;
        }
      }


      if (lat !== null) setLatitude(lat);
      if (lon !== null) setLongitude(lon);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert('Erro ao salvar alterações do perfil: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSuccess(false);

    try {
      const tier = profile?.subscription_tier || 'free';
      const limitPhotos = tier === 'free' ? 3 : tier === 'pro' ? 10 : 20;
      const limitVideos = tier === 'free' ? 0 : tier === 'pro' ? 10 : 15;

      if (adPhotos.length > limitPhotos) {
        alert(`Seu plano ${tier.toUpperCase()} permite selecionar no máximo ${limitPhotos} fotos no anúncio.`);
        setSaving(false);
        return;
      }
      if (adVideos.length > limitVideos) {
        alert(`Seu plano ${tier.toUpperCase()} permite selecionar no máximo ${limitVideos} vídeos no anúncio.`);
        setSaving(false);
        return;
      }

      // 1. Salvar ou atualizar na tabela ads
      const { error: adError } = await supabase
        .from('ads')
        .upsert({
          profile_id: user.id,
          title: adTitle,
          description: adDescription,
          price: Number(adPrice),
          photos: adPhotos,
          videos: adVideos,
          is_active: adIsActive
        }, { onConflict: 'profile_id' });

      if (adError) throw adError;

      // 2. Sincronizar categoria e target_audience na tabela profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          category,
          target_audience: targetAudience
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Atualizar estado local do profile
      setProfile((prev: any) => ({ ...prev, category, target_audience: targetAudience }));

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert('Erro ao salvar anúncio: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAdMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const typeKey = isImage ? 'photo' : 'video';
    const maxSize = isImage ? 5 * 1024 * 1024 : 15 * 1024 * 1024;

    if (file.size > maxSize) {
      alert(`O arquivo é muito grande. O limite máximo é ${isImage ? '5MB' : '15MB'}.`);
      return;
    }

    const tier = profile?.subscription_tier || 'free';
    const limitPhotos = tier === 'free' ? 3 : tier === 'pro' ? 10 : 20;
    const limitVideos = tier === 'free' ? 0 : tier === 'pro' ? 10 : 15;

    if (typeKey === 'photo' && adPhotos.length >= limitPhotos) {
      alert(`Limite atingido! Seu plano ${tier.toUpperCase()} permite apenas ${limitPhotos} fotos.`);
      return;
    }
    if (typeKey === 'video' && adVideos.length >= limitVideos) {
      alert(`Limite atingido! Seu plano ${tier.toUpperCase()} permite apenas ${limitVideos} vídeos.`);
      return;
    }

    setUploadingAdMedia(true);

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${Date.now()}_ad_media.${fileExt}`;
      
      let fileToUpload = file;
      if (isImage) {
        try {
          const { applyWatermark } = await import('@/lib/watermark');
          const watermarkText = `Relaxa & Goza - ${stageName || ''}`;
          fileToUpload = await applyWatermark(file, watermarkText);
        } catch (watermarkErr) {
          console.error("Erro ao aplicar marca d'água:", watermarkErr);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('profile_media')
        .upload(fileName, fileToUpload, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile_media')
        .getPublicUrl(fileName);

      // Inserir no banco de dados profile_photos
      const { data: dbData, error: dbError } = await supabase
        .from('profile_photos')
        .insert({
          profile_id: user.id,
          photo_url: publicUrl,
          media_type: typeKey,
          is_verified: false
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Adicionar no array do anúncio
      if (typeKey === 'photo') {
        setAdPhotos(prev => [...prev, publicUrl]);
      } else {
        // Disparar transcodificação
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          fetch('/api/media/transcode', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              videoUrl: publicUrl,
              photoId: dbData.id,
              tableType: 'profile_photos'
            })
          }).catch(e => console.error('Erro ao transcodificar:', e));
        }
        setAdVideos(prev => [...prev, publicUrl]);
      }

      // Adicionar na lista local
      setProfilePhotosList(prev => [...prev, dbData]);
    } catch (err: any) {
      alert('Erro ao carregar mídia do anúncio: ' + (err?.message || err));
    } finally {
      setUploadingAdMedia(false);
    }
  };

  const toggleAdPhoto = (photoUrl: string) => {
    const tier = profile?.subscription_tier || 'free';
    const limitPhotos = tier === 'free' ? 3 : tier === 'pro' ? 10 : 20;

    if (adPhotos.includes(photoUrl)) {
      setAdPhotos(prev => prev.filter(p => p !== photoUrl));
    } else {
      if (adPhotos.length >= limitPhotos) {
        alert(`Seu plano ${tier.toUpperCase()} permite selecionar no máximo ${limitPhotos} fotos.`);
        return;
      }
      setAdPhotos(prev => [...prev, photoUrl]);
    }
  };

  const toggleAdVideo = (videoUrl: string) => {
    const tier = profile?.subscription_tier || 'free';
    const limitVideos = tier === 'free' ? 0 : tier === 'pro' ? 10 : 15;

    if (limitVideos === 0) {
      alert('Seu plano Bronze não permite vídeos no anúncio.');
      return;
    }

    if (adVideos.includes(videoUrl)) {
      setAdVideos(prev => prev.filter(v => v !== videoUrl));
    } else {
      if (adVideos.length >= limitVideos) {
        alert(`Seu plano ${tier.toUpperCase()} permite selecionar no máximo ${limitVideos} vídeos.`);
        return;
      }
      setAdVideos(prev => [...prev, videoUrl]);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-wine-primary/30 border-t-wine-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 relative z-20 pb-16 selection:bg-gold-primary selection:text-dark-bg">
      
      {/* Header */}
      <div className="border-b border-dark-border/20 pb-5 flex justify-between items-end">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-white tracking-tight">
            Estruturador de <span className="font-semibold text-gold-primary">Perfil & Anúncio</span>
          </h1>
          <p className="text-xs md:text-sm text-gray-400 font-light mt-1.5">
            Configure seu perfil de profissional e gerencie seu anúncio ativo na vitrine do portal.
          </p>
        </div>

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-400" /> Salvo com sucesso!
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-dark-border/20 pb-0.5">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`pb-3 text-sm font-semibold tracking-wide transition-all border-b-2 cursor-pointer ${
            activeTab === 'profile'
              ? 'border-gold-primary text-gold-light'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Dados do Perfil
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ad')}
          className={`pb-3 text-sm font-semibold tracking-wide transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'ad'
              ? 'border-gold-primary text-gold-light'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 text-gold-primary" />
          Configuração de Anúncio
        </button>
      </div>

      {activeTab === 'profile' ? (
        <form onSubmit={handleSave} className="space-y-8">
        
        {/* Bloco 0: Foto de Perfil (Avatar) com Borrão Opcional */}
        <div className="glass-effect rounded-2xl border border-dark-border/60 p-5 md:p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-28 h-28 rounded-full border border-dark-border overflow-hidden bg-black/40 flex items-center justify-center group shrink-0 shadow-[0_0_15px_rgba(197,168,128,0.1)]">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <UserSquare2 className="w-12 h-12 text-gray-600" />
            )}
            
            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 cursor-pointer">
              <Camera className="w-5 h-5 text-gold-primary" />
              <span className="text-[9px] text-white uppercase font-bold tracking-wider">Alterar</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange} 
                className="hidden" 
              />
            </label>
          </div>

          <div className="space-y-2 flex-grow text-center sm:text-left">
            <h3 className="text-sm font-semibold text-white flex items-center justify-center sm:justify-start gap-1.5">
              <Sparkles className="w-4 h-4 text-gold-primary animate-pulse" />
              Foto Principal do Anúncio (Capa)
            </h3>
            <p className="text-xs text-gray-400 font-light leading-relaxed max-w-xl">
              Esta é a primeira foto que os clientes verão ao navegar pela vitrine principal. Recomendamos uma foto nítida e profissional. Se você deseja proteger sua identidade, clique no botão e ative o **Seletor de Borrão** para embaçar apenas o seu rosto.
            </p>
            <div className="flex justify-center sm:justify-start gap-2 pt-1">
              <label className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-white hover:bg-white/10 cursor-pointer transition-all flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-gold-primary" />
                Carregar Imagem
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarChange} 
                  className="hidden" 
                />
              </label>
            </div>
          </div>
        </div>
        
        {/* Bloco 1: Categoria da Vitrine */}
        <div className="glass-effect rounded-2xl border border-dark-border/60 p-5 md:p-6 space-y-5">
          <div className="flex items-center gap-2 text-white font-medium text-sm">
            <ShieldAlert className="w-4 h-4 text-gold-primary" />
            <span>Categoria Principal do Anúncio (Vitrine Única)</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Escolha Massagem */}
            <div 
              onClick={() => handleCategoryChange('massage')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                category === 'massage' 
                  ? 'border-gold-primary bg-gold-primary/[0.02]' 
                  : 'border-dark-border hover:border-gray-700 bg-dark-bg/60'
              }`}
            >
              <h3 className="text-sm font-semibold text-white mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-gold-primary" />
                Massagens & Terapias
              </h3>
              <p className="text-[11px] text-gray-500 font-light leading-relaxed">
                Destinado a terapeutas corporais, massagem tântrica e relaxamento.
              </p>
            </div>

            {/* Escolha Acompanhante */}
            <div 
              onClick={() => handleCategoryChange('escort')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                category === 'escort' 
                  ? 'border-wine-primary bg-wine-primary/[0.02]' 
                  : 'border-dark-border hover:border-gray-700 bg-dark-bg/60'
              }`}
            >
              <h3 className="text-sm font-semibold text-white mb-1.5 flex items-center gap-1.5">
                <UserSquare2 className="w-4 h-4 text-wine-light" />
                Acompanhante Adulto
              </h3>
              <p className="text-[11px] text-gray-500 font-light leading-relaxed">
                Destinado a acompanhantes de luxo e entretenimento adulto.
              </p>
            </div>

            {/* Escolha Ambos */}
            <div 
              onClick={() => handleCategoryChange('both')}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                category === 'both' 
                  ? 'border-gold-primary/70 bg-gradient-to-br from-gold-primary/[0.03] to-wine-primary/[0.03]' 
                  : 'border-dark-border hover:border-gray-700 bg-dark-bg/60'
              }`}
            >
              <h3 className="text-sm font-semibold text-white mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-gold-primary" />
                Ambos os Serviços
              </h3>
              <p className="text-[11px] text-gray-500 font-light leading-relaxed">
                Anuncie nas duas categorias. Recomendado para profissionais de alto nível.
              </p>
            </div>
          </div>

          <div className="text-[10px] text-gray-500 font-light leading-relaxed bg-dark-bg/40 p-3 rounded-lg border border-dark-border/40">
            <strong>Como funciona:</strong> A plataforma opera como uma vitrine única. Seus clientes filtram os perfis diretamente na página inicial escolhendo a categoria desejada. Ao escolher "Ambos os Serviços", seu card aparecerá em todas as buscas correspondentes.
          </div>

          {/* Público Alvo */}
          <div className="border-t border-dark-border/20 pt-4 space-y-3">
            <div className="flex items-center gap-2 text-white font-medium text-xs">
              <UserSquare2 className="w-4 h-4 text-gold-primary" />
              <span>Público-Alvo do Anúncio (Selecione um ou mais)</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {['Homens', 'Mulheres', 'Casais', 'Trans'].map(aud => {
                const isSelected = targetAudience.includes(aud);
                return (
                  <button
                    key={aud}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setTargetAudience(prev => prev.filter(a => a !== aud));
                      } else {
                        setTargetAudience(prev => [...prev, aud]);
                      }
                    }}
                    className={`text-xs px-4 py-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-gold-primary/20 border-gold-primary text-gold-light font-medium' 
                        : 'bg-dark-bg/60 border-dark-border text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {aud}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Identidade de Gênero do Profissional */}
          <div className="border-t border-dark-border/20 pt-4 space-y-3">
            <div className="flex items-center gap-2 text-white font-medium text-xs">
              <UserSquare2 className="w-4 h-4 text-gold-primary" />
              <span>Sua Identidade de Gênero</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'Feminino', label: 'Feminino (Mulher)' },
                { value: 'Masculino', label: 'Masculino (Homem)' },
                { value: 'Trans', label: 'Trans / Travesti' }
              ].map(gen => {
                const isSelected = gender === gen.value;
                return (
                  <button
                    key={gen.value}
                    type="button"
                    onClick={() => setGender(gen.value as any)}
                    className={`text-xs px-4 py-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-gold-primary/20 border-gold-primary text-gold-light font-medium' 
                        : 'bg-dark-bg/60 border-dark-border text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    {gen.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bloco 2: Informações Básicas */}
        <div className="glass-effect rounded-2xl border border-dark-border/60 p-5 md:p-6 space-y-5">
          <div className="flex items-center gap-2 text-white font-medium text-sm">
            <UserSquare2 className="w-4 h-4 text-gold-primary" />
            <span>Dados de Identidade do Anúncio</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Nome Artístico */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">Nome Artístico</label>
              <input 
                type="text" 
                value={stageName} 
                onChange={(e) => setStageName(e.target.value)} 
                className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white px-4 py-3 rounded-xl focus:border-gold-primary/50 focus:outline-none transition-colors"
                required
              />
            </div>

            {/* Idade */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">Idade (Exibida no perfil)</label>
              <input 
                type="number" 
                value={age} 
                onChange={(e) => setAge(Number(e.target.value))} 
                className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white px-4 py-3 rounded-xl focus:border-gold-primary/50 focus:outline-none transition-colors"
                required
              />
            </div>

            {/* Cidade */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">Cidade</label>
              <input 
                type="text" 
                value={city} 
                onChange={(e) => setCity(e.target.value)} 
                className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white px-4 py-3 rounded-xl focus:border-gold-primary/50 focus:outline-none transition-colors"
                required
              />
            </div>

            {/* WhatsApp */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">WhatsApp de Contato (Com DDD)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 w-3.5 h-3.5 text-gray-500" />
                <input 
                  type="text" 
                  value={whatsapp} 
                  onChange={(e) => setWhatsapp(e.target.value)} 
                  className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white pl-10 pr-4 py-3 rounded-xl focus:border-gold-primary/50 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* Bairro */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">Bairro de Atendimento</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 w-3.5 h-3.5 text-gray-500" />
                <input 
                  type="text" 
                  value={neighborhood} 
                  onChange={(e) => setNeighborhood(e.target.value)} 
                  className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white pl-10 pr-4 py-3 rounded-xl focus:border-gold-primary/50 focus:outline-none transition-colors"
                  required
                />
              </div>
            </div>

            {/* Valor da Sessão */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">Valor da Sessão / Hora (R$)</label>
              <input 
                type="number" 
                value={rate} 
                onChange={(e) => setRate(Number(e.target.value))} 
                className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white px-4 py-3 rounded-xl focus:border-gold-primary/50 focus:outline-none transition-colors"
                required
              />
            </div>

            {/* Mensagem Customizada do WhatsApp */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs text-gray-400 font-medium flex items-center gap-1">
                <span>Mensagem Personalizada do WhatsApp</span>
                <span className="text-[10px] text-gray-500 font-light">(Opcional)</span>
              </label>
              <textarea 
                value={whatsappCustomMessage} 
                onChange={(e) => setWhatsappCustomMessage(e.target.value)} 
                placeholder="Ex: Olá! Vi seu anúncio no Relaxa & Goza e gostaria de agendar um horário com você."
                rows={2}
                className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white px-4 py-3 rounded-xl focus:border-gold-primary/50 focus:outline-none transition-colors resize-none leading-relaxed"
              />
              <p className="text-[10px] text-gray-500 font-light">
                Esta é a mensagem que o cliente enviará quando clicar no botão do seu WhatsApp. Se deixar em branco, usaremos a mensagem padrão do site.
              </p>
            </div>

            {/* Mapeamento em tempo real */}
            <div className="col-span-1 sm:col-span-2 bg-black/40 border border-white/5 rounded-2xl p-4 flex items-start gap-3 mt-2 animate-fadeIn">
              <MapPin className="w-5 h-5 text-gold-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-gold-light tracking-wider block">Localização do Mapa Interativo</span>
                <p className="text-[11px] text-gray-400 font-light leading-relaxed">
                  Para que os clientes te encontrem no mapa, o portal geocodifica automaticamente suas coordenadas a partir do Bairro e da Cidade fornecidos.
                </p>
                {latitude && longitude ? (
                  <span className="inline-block text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded font-mono mt-1.5 animate-pulse">
                    Status: Mapeamento Ativo ({latitude.toFixed(5)}, {longitude.toFixed(5)})
                  </span>
                ) : (
                  <span className="inline-block text-[9px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2.5 py-0.5 rounded font-mono mt-1.5">
                    Status: Sem coordenadas (será geocodificado ao salvar)
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Bloco 3: Especialidades e Comodidades */}
        <div className="glass-effect rounded-2xl border border-dark-border/60 p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2 text-white font-medium text-sm">
            <CheckSquare className="w-4 h-4 text-gold-primary" />
            <span>Lista de Comodidades e Infraestrutura</span>
          </div>

          <div className="space-y-4">
            {(category === 'massage' || category === 'both') && (
              <div>
                <div className="text-[10px] uppercase font-bold text-gray-500 mb-2">Comodidades de Massagem</div>
                <div className="flex flex-wrap gap-2">
                  {massageAmenities.map(ame => {
                    const isSelected = selectedAmenities.includes(ame);
                    return (
                      <button
                        type="button"
                        key={ame}
                        onClick={() => toggleAmenity(ame)}
                        className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                          isSelected 
                            ? 'bg-gold-primary/20 border-gold-primary text-gold-light' 
                            : 'bg-dark-bg/60 border-dark-border text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        {ame}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {(category === 'escort' || category === 'both') && (
              <div>
                <div className="text-[10px] uppercase font-bold text-gray-500 mb-2">Comodidades Adulto</div>
                <div className="flex flex-wrap gap-2">
                  {escortAmenities.map(ame => {
                    const isSelected = selectedAmenities.includes(ame);
                    return (
                      <button
                        type="button"
                        key={ame}
                        onClick={() => toggleAmenity(ame)}
                        className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                          isSelected 
                            ? 'bg-wine-primary/20 border-wine-primary text-white' 
                            : 'bg-dark-bg/60 border-dark-border text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        {ame}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Comodidades Gerais */}
            <div>
              <div className="text-[10px] uppercase font-bold text-gray-500 mb-2">Comodidades Gerais</div>
              <div className="flex flex-wrap gap-2">
                {generalAmenities.map(ame => {
                  const isSelected = selectedAmenities.includes(ame);
                  return (
                    <button
                      type="button"
                      key={ame}
                      onClick={() => toggleAmenity(ame)}
                      className={`text-xs px-3 py-1.5 rounded-xl border transition-all ${
                        isSelected 
                          ? (category === 'massage' || category === 'both') 
                            ? 'bg-gold-primary/20 border-gold-primary text-gold-light'
                            : 'bg-wine-primary/20 border-wine-primary text-white'
                          : 'bg-dark-bg/60 border-dark-border text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      {ame}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Bloco 4: Estruturador de Copywriting (Alta Conversão) */}
        <div className="glass-effect rounded-2xl border border-dark-border/60 p-5 md:p-6 space-y-6">
          <div className="flex items-center gap-2 text-white font-medium text-sm border-b border-dark-border/20 pb-3">
            <FileText className="w-4 h-4 text-gold-primary" />
            <span>Estruturador de Copy (Evite Textos Livres Genéricos)</span>
          </div>

          <div className="space-y-5">
            {/* Minhas Especialidades */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">Minhas Especialidades e Formação</label>
              <textarea 
                value={specialties} 
                onChange={(e) => setSpecialties(e.target.value)} 
                rows={3}
                className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white px-4 py-3 rounded-xl focus:border-gold-primary/50 focus:outline-none transition-colors leading-relaxed"
                placeholder="Ex: Formada em terapias corporais na Índia, focada no alinhamento..."
                required
              />
              <span className="text-[10px] text-gray-500 font-light block">Foque nas suas habilidades e técnicas corporais de destaque.</span>
            </div>

            {/* O que está Incluso na Sessão */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">O que está Incluso no Atendimento</label>
              <textarea 
                value={whatsIncluded} 
                onChange={(e) => setWhatsIncluded(e.target.value)} 
                rows={3}
                className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white px-4 py-3 rounded-xl focus:border-gold-primary/50 focus:outline-none transition-colors leading-relaxed"
                placeholder="Ex: Toalhas limpas, óleos essenciais orgânicos..."
                required
              />
              <span className="text-[10px] text-gray-500 font-light block">Liste toda a infraestrutura e materiais descartáveis para passar segurança.</span>
            </div>

            {/* Regras de Atendimento */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">Regras, Horários e Restrições de Atendimento</label>
              <textarea 
                value={rules} 
                onChange={(e) => setRules(e.target.value)} 
                rows={3}
                className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white px-4 py-3 rounded-xl focus:border-gold-primary/50 focus:outline-none transition-colors leading-relaxed"
                placeholder="Ex: Somente com agendamento prévio de no mínimo 1 hora. Não realizo..."
                required
              />
              <span className="text-[10px] text-gray-500 font-light block">Defina limites claros de comportamento e etiqueta para blindar seu tempo.</span>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <button 
            type="submit" 
            disabled={saving}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gold-primary text-dark-bg hover:bg-gold-light text-xs font-semibold tracking-wide transition-all shadow-[0_4px_12px_rgba(197,168,128,0.2)] disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Dados do Perfil'}
          </button>
        </div>
      </form>
    ) : (
      <form onSubmit={handleSaveAd} className="space-y-8">
        {/* Bloco 0: Placa do Plano & Ativação do Anúncio */}
        <div className="glass-effect rounded-2xl border border-dark-border/60 p-5 md:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Seu Plano de Divulgação</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={profile?.subscription_tier === 'gold' ? 'gold' : profile?.subscription_tier === 'pro' ? 'wine' : 'outline'}>
                  {profile?.subscription_tier?.toUpperCase() || 'BRONZE'}
                </Badge>
                <span className="text-xs text-gray-400">
                  Mídias permitidas: {profile?.subscription_tier === 'gold' ? '25 Fotos & 15 Vídeos' : profile?.subscription_tier === 'pro' ? '10 Fotos & 10 Vídeos' : '3 Fotos & 0 Vídeos'}
                </span>
              </div>
            </div>
            
            {/* Status do Anúncio */}
            <div className="flex items-center gap-3 bg-black/40 border border-white/5 p-3 rounded-xl">
              <span className="text-xs text-gray-400 font-medium">Status do Anúncio:</span>
              <button
                type="button"
                onClick={() => setAdIsActive(!adIsActive)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                  adIsActive 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}
              >
                {adIsActive ? (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    Ativo
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    Inativo (Pausado)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Bloco 1: Textos do Anúncio */}
        <div className="glass-effect rounded-2xl border border-dark-border/60 p-5 md:p-6 space-y-5">
          <div className="flex items-center gap-2 text-white font-medium text-sm">
            <FileText className="w-4 h-4 text-gold-primary" />
            <span>Textos de Atração do Anúncio</span>
          </div>

          <div className="space-y-4">
            {/* Título */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">Título Curto do Anúncio (Tagline)</label>
              <input
                type="text"
                value={adTitle}
                onChange={(e) => setAdTitle(e.target.value)}
                className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white px-4 py-3 rounded-xl focus:border-gold-primary/50 focus:outline-none transition-colors"
                placeholder="Ex: Massagem Sensorial Exclusiva com Óleos Essenciais"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Preço do anúncio */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Valor do Atendimento do Anúncio (R$ / Hora)</label>
                <input
                  type="number"
                  value={adPrice}
                  onChange={(e) => setAdPrice(Number(e.target.value))}
                  className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white px-4 py-3 rounded-xl focus:border-gold-primary/50 focus:outline-none transition-colors"
                  required
                />
              </div>

              {/* Opção de Trabalho */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-medium">Opção de Trabalho (Categoria)</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white px-4 py-3 rounded-xl focus:border-gold-primary/50 focus:outline-none transition-colors"
                >
                  <option value="massage">Massagem & Terapias</option>
                  <option value="escort">Acompanhante Adulto</option>
                  <option value="both">Ambos os Serviços</option>
                </select>
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-medium">Descrição Personalizada para Divulgação</label>
              <textarea
                value={adDescription}
                onChange={(e) => setAdDescription(e.target.value)}
                rows={4}
                className="w-full bg-dark-bg/60 border border-dark-border text-xs text-white px-4 py-3 rounded-xl focus:border-gold-primary/50 focus:outline-none transition-colors resize-none leading-relaxed"
                placeholder="Descreva seu serviço de forma atraente para os clientes. Evite clichês."
                required
              />
            </div>
          </div>
        </div>

        {/* Bloco 2: Público-Alvo do Anúncio */}
        <div className="glass-effect rounded-2xl border border-dark-border/60 p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2 text-white font-medium text-sm">
            <UserSquare2 className="w-4 h-4 text-gold-primary" />
            <span>Público para Quem Você Trabalha (Atendo a)</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {['Homens', 'Mulheres', 'Casais', 'Trans'].map(aud => {
              const isSelected = targetAudience.includes(aud);
              return (
                <button
                  key={aud}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setTargetAudience(prev => prev.filter(a => a !== aud));
                    } else {
                      setTargetAudience(prev => [...prev, aud]);
                    }
                  }}
                  className={`text-xs px-4 py-2 rounded-xl border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-gold-primary/20 border-gold-primary text-gold-light font-medium' 
                      : 'bg-dark-bg/60 border-dark-border text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {aud}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bloco 3: Mídias do Anúncio (Seleção e Upload Rápido) */}
        <div className="glass-effect rounded-2xl border border-dark-border/60 p-5 md:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-border/20 pb-4">
            <div className="flex items-center gap-2 text-white font-medium text-sm">
              <Camera className="w-4 h-4 text-gold-primary" />
              <span>Fotos e Vídeos em Destaque do Anúncio</span>
            </div>

            {/* Direct Media Upload */}
            <label className="px-4 py-2 rounded-xl bg-gold-primary text-dark-bg hover:bg-gold-light text-xs font-bold uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5 shadow-[0_4px_12px_rgba(197,168,128,0.2)]">
              <Upload className="w-3.5 h-3.5" />
              {uploadingAdMedia ? 'Fazendo Upload...' : 'Carregar Nova Foto / Vídeo'}
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleUploadAdMedia}
                disabled={uploadingAdMedia}
                className="hidden"
              />
            </label>
          </div>

          <div className="space-y-6">
            {/* Photos selection section */}
            <div>
              <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                <span>Fotos Selecionadas para o Anúncio ({adPhotos.length})</span>
                <span className="text-[10px] text-gray-500 font-normal normal-case">
                  Limite: {profile?.subscription_tier === 'gold' ? '20' : profile?.subscription_tier === 'pro' ? '10' : '3'} fotos
                </span>
              </div>

              {profilePhotosList.filter(m => m.media_type === 'photo' || !m.media_type).length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-500 font-light border border-dashed border-dark-border/40 rounded-xl">
                  Nenhuma foto na sua galeria. Clique em "Carregar Nova Foto / Vídeo" acima para enviar.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {profilePhotosList.filter(m => m.media_type === 'photo' || !m.media_type).map(photo => {
                    const isSelected = adPhotos.includes(photo.photo_url);
                    return (
                      <div 
                        key={photo.id}
                        className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all group ${
                          isSelected ? 'border-gold-primary shadow-[0_0_15px_rgba(197,168,128,0.2)]' : 'border-dark-border hover:border-gray-700'
                        }`}
                      >
                        <img 
                          src={getCDNUrl(photo.photo_url)} 
                          alt="Galeria" 
                          className="w-full h-full object-cover" 
                        />
                        
                        {/* Toggle overlay click */}
                        <div 
                          onClick={() => toggleAdPhoto(photo.photo_url)}
                          className="absolute inset-0 bg-black/45 hover:bg-black/15 transition-colors cursor-pointer flex items-center justify-center"
                        >
                          {isSelected ? (
                            <span className="bg-gold-primary text-dark-bg text-[10px] font-bold px-2 py-0.5 rounded-full">
                              No Anúncio
                            </span>
                          ) : (
                            <span className="bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
                              Adicionar
                            </span>
                          )}
                        </div>

                        {/* Permanent deletion */}
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm('Tem certeza de que deseja apagar permanentemente esta foto da sua galeria e do servidor?')) {
                              try {
                                const { error } = await supabase.from('profile_photos').delete().eq('id', photo.id);
                                if (error) throw error;

                                const urlParts = photo.photo_url.split('/profile_media/');
                                if (urlParts.length > 1) {
                                  const storagePath = decodeURIComponent(urlParts[1]);
                                  await supabase.storage.from('profile_media').remove([storagePath]);
                                }

                                setAdPhotos(prev => prev.filter(p => p !== photo.photo_url));
                                setProfilePhotosList(prev => prev.filter(p => p.id !== photo.id));
                              } catch (err) {
                                alert('Erro ao excluir foto permanentemente.');
                              }
                            }
                          }}
                          className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 p-1.5 rounded-lg text-white transition-colors shadow z-10 opacity-0 group-hover:opacity-100"
                          title="Apagar permanentemente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Videos selection section */}
            <div className="pt-4 border-t border-dark-border/20">
              <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                <span>Vídeos Selecionados para o Anúncio ({adVideos.length})</span>
                <span className="text-[10px] text-gray-500 font-normal normal-case">
                  Limite: {profile?.subscription_tier === 'gold' ? '15' : profile?.subscription_tier === 'pro' ? '10' : '0'} vídeos
                </span>
              </div>

              {profile?.subscription_tier === 'free' || !profile?.subscription_tier ? (
                <div className="text-center py-6 text-xs text-gray-500 font-light border border-dashed border-dark-border/40 rounded-xl bg-black/20">
                  Seu plano Bronze não permite vídeos. Faça upgrade para <span className="text-wine-light font-bold">PRO</span> ou <span className="text-gold-primary font-bold">GOLD</span> para postar vídeos.
                </div>
              ) : profilePhotosList.filter(m => m.media_type === 'video').length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-500 font-light border border-dashed border-dark-border/40 rounded-xl">
                  Nenhum vídeo na sua galeria. Clique em "Carregar Nova Foto / Vídeo" acima para enviar.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {profilePhotosList.filter(m => m.media_type === 'video').map(video => {
                    const isSelected = adVideos.includes(video.photo_url);
                    return (
                      <div 
                        key={video.id}
                        className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 bg-black/60 flex flex-col justify-center items-center group transition-all ${
                          isSelected ? 'border-gold-primary shadow-[0_0_15px_rgba(197,168,128,0.2)]' : 'border-dark-border hover:border-gray-700'
                        }`}
                      >
                        <Video className="w-10 h-10 text-gray-500 animate-pulse" />
                        <span className="text-[9px] text-gray-400 mt-2 font-mono truncate max-w-[80%]">
                          Vídeo Galeria
                        </span>
                        
                        {/* Toggle overlay click */}
                        <div 
                          onClick={() => toggleAdVideo(video.photo_url)}
                          className="absolute inset-0 bg-black/45 hover:bg-black/15 transition-colors cursor-pointer flex items-center justify-center"
                        >
                          {isSelected ? (
                            <span className="bg-gold-primary text-dark-bg text-[10px] font-bold px-2 py-0.5 rounded-full">
                              No Anúncio
                            </span>
                          ) : (
                            <span className="bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full">
                              Adicionar
                            </span>
                          )}
                        </div>

                        {/* Permanent deletion */}
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm('Tem certeza de que deseja apagar permanentemente este vídeo da sua galeria e do servidor?')) {
                              try {
                                const { error } = await supabase.from('profile_photos').delete().eq('id', video.id);
                                if (error) throw error;

                                const urlParts = video.photo_url.split('/profile_media/');
                                if (urlParts.length > 1) {
                                  const storagePath = decodeURIComponent(urlParts[1]);
                                  await supabase.storage.from('profile_media').remove([storagePath]);
                                }

                                setAdVideos(prev => prev.filter(v => v !== video.photo_url));
                                setProfilePhotosList(prev => prev.filter(v => v.id !== video.id));
                              } catch (err) {
                                alert('Erro ao excluir vídeo permanentemente.');
                              }
                            }
                          }}
                          className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 p-1.5 rounded-lg text-white transition-colors shadow z-10 opacity-0 group-hover:opacity-100"
                          title="Apagar permanentemente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <button 
            type="submit" 
            disabled={saving}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gold-primary text-dark-bg hover:bg-gold-light text-xs font-semibold tracking-wide transition-all shadow-[0_4px_12px_rgba(197,168,128,0.2)] disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando Anúncio...' : 'Salvar Configurações de Anúncio'}
          </button>
        </div>
      </form>
    )}

    {blurImageSrc && (
      <ImageBlurSelector
        imageSrc={blurImageSrc}
        onConfirm={handleBlurConfirm}
        onCancel={() => setBlurImageSrc(null)}
      />
    )}
  </div>
);
}
