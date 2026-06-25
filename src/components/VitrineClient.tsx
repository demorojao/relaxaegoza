'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { Sparkles, LogOut, LayoutDashboard, LogIn, Trophy, Heart, X, User, SlidersHorizontal, Play, Grid, Map as MapIcon } from 'lucide-react';
import Link from 'next/link';
import ProfileGrid from '../components/ProfileGrid';
import ProfileReels from '../components/ProfileReels';
import AuraStories from '../components/AuraStories';
import MatchmakerQuiz from '../components/MatchmakerQuiz';
import FilterBar from '../components/FilterBar';
import { getCDNUrl } from '../lib/mediaHelper';
import { slugify } from '../lib/slugify';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { cn, formatWhatsAppLink } from '@/lib/utils';
import Logo from './Logo';


// Removido MapComponent dinâmico que agora está em ProfileGrid

const MASSAGE_SPECIALTIES = [
  'Massagem Tântrica', 'Nuru', 'Relaxante', 'Massagem Nuru', 'Massagem Relaxante',
  'Tailandesa', 'Shiatsu', 'G-Spot', 'Massagem Tantra', 'Massagem Erótica',
  'Massagem G-Spot', 'Massagem Ananda', 'Massagem Sueca', 'Reflexologia',
  'Drenagem Linfática', 'Massagem Desportiva', 'Massagem Quatro Mãos'
];

const ESCORT_SPECIALTIES = [
  'Acompanhante', 'Namorada Fake', 'Acompanhante Trans', 'Acompanhante Masculino',
  'Namorada de Aluguel', 'Acompanhante Luxo', 'BDSM / Dominação', 'Fetiches',
  'Cosplay / Roleplay', 'Jantar & Eventos', 'Viagens'
];

function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function VitrineClient({ 
  initialProfiles, 
  initialStories 
}: { 
  initialProfiles: Profile[]; 
  initialStories: Profile[]; 
}) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'reels' | 'grid' | 'map'>('reels');
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [detectedCity, setDetectedCity] = useState('');
  const [reelsPhotos, setReelsPhotos] = useState<Record<string, { url: string; type: 'photo' | 'video' }[]>>({});
  const [loadingReelsPhotos, setLoadingReelsPhotos] = useState(false);

  // Buscar fotos para a galeria do Reels
  useEffect(() => {
    if (viewMode !== 'reels' || profiles.length === 0) return;

    const fetchReelsPhotos = async () => {
      setLoadingReelsPhotos(true);
      try {
        const profileIds = profiles.map(p => p.id);
        const { data } = await supabase
          .from('profile_photos')
          .select('profile_id, photo_url, media_type')
          .in('profile_id', profileIds)
          .order('created_at', { ascending: true });

        if (data) {
          const photosMap: Record<string, { url: string; type: 'photo' | 'video' }[]> = {};

          profiles.forEach(p => {
            photosMap[p.id] = [];
            if (p.avatar_url) {
              photosMap[p.id].push({ url: p.avatar_url, type: 'photo' });
            }
          });

          data.forEach(item => {
            if (photosMap[item.profile_id]) {
              photosMap[item.profile_id].push({
                url: item.photo_url,
                type: (item.media_type || 'photo') as 'photo' | 'video'
              });
            }
          });

          setReelsPhotos(photosMap);
        }
      } catch (err) {
        console.error('Erro ao buscar fotos dos reels:', err);
      } finally {
        setLoadingReelsPhotos(false);
      }
    };

    fetchReelsPhotos();
  }, [viewMode, profiles]);
  
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Filtros
  const [cityFilter, setCityFilter] = useState('');
  const [neighborhoodFilter, setNeighborhoodFilter] = useState('');
  const [availableLocations, setAvailableLocations] = useState<Record<string, string[]>>({});
  const [showLocationFallbackWarning, setShowLocationFallbackWarning] = useState(false);
  const [fallbackCityName, setFallbackCityName] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [ageFilter, setAgeFilter] = useState('');
  const [priceFilter, setPriceFilter] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [isSpecialtyDropdownOpen, setIsSpecialtyDropdownOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [spaceFilter, setSpaceFilter] = useState<boolean>(false);
  const [genderFilter, setGenderFilter] = useState<'Feminino' | 'Masculino' | 'Trans' | ''>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // States do Matchmaker Quiz
  const [isQuizOpen, setIsQuizOpen] = useState(false);

  const [specialtiesList, setSpecialtiesList] = useState<{name: string}[]>([]);

  // States do Aura Stories
  const [storiesProfiles, setStoriesProfiles] = useState<Profile[]>(initialStories);
  const [activeStoryProfile, setActiveStoryProfile] = useState<Profile | null>(null);
  const [activeStoryPhotos, setActiveStoryPhotos] = useState<{ url: string; type: 'photo' | 'video' }[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isStoryLoading, setIsStoryLoading] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);

  useEffect(() => {
    checkUser();
    fetchSpecialties();
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setUserCoords([lat, lon]);
          
          // Reverse geocoding do OpenStreetMap Nominatim
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`)
            .then(res => res.json())
            .then(data => {
              const city = data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || data.address?.state_district;
              if (city) {
                setDetectedCity(city);
              }
            })
            .catch(err => console.error("Erro no reverse geocoding da cidade:", err));
        },
        (error) => {
          console.log("Erro ao obter localização do usuário:", error);
        }
      );
    }
  }, []);

  // Helper: normaliza texto para Title Case com acentuação padrão de cidades brasileiras
  const toTitleCase = (str: string) => {
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

  // Carrega cidades e bairros dos profissionais cadastrados no banco
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('city, neighborhood')
          .eq('role', 'provider');
        
        if (data) {
          const locs: Record<string, Set<string>> = {};
          data.forEach(p => {
            if (p.city) {
              // Normaliza capitalização para evitar duplicatas ("São Paulo" vs "São paulo")
              const cityKey = toTitleCase(p.city);
              if (!locs[cityKey]) {
                locs[cityKey] = new Set<string>();
              }
              if (p.neighborhood) {
                locs[cityKey].add(toTitleCase(p.neighborhood));
              }
            }
          });
          
          const finalLocs: Record<string, string[]> = {};
          Object.keys(locs).forEach(city => {
            finalLocs[city] = Array.from(locs[city]).sort();
          });
          setAvailableLocations(finalLocs);
        }
      } catch (err) {
        console.error('Erro ao buscar localizações cadastradas:', err);
      }
    };
    
    fetchLocations();
  }, []);

  // Fallback baseado nos perfis iniciais se falhar
  useEffect(() => {
    if (Object.keys(availableLocations).length === 0 && initialProfiles.length > 0) {
      const locs: Record<string, Set<string>> = {};
      initialProfiles.forEach(p => {
        if (p.city) {
          const cityKey = toTitleCase(p.city);
          if (!locs[cityKey]) {
            locs[cityKey] = new Set<string>();
          }
          if (p.neighborhood) {
            locs[cityKey].add(toTitleCase(p.neighborhood));
          }
        }
      });
      const finalLocs: Record<string, string[]> = {};
      Object.keys(locs).forEach(city => {
        finalLocs[city] = Array.from(locs[city]).sort();
      });
      setAvailableLocations(finalLocs);
    }
  }, [initialProfiles, availableLocations]);

  useEffect(() => {
    if (!detectedCity || Object.keys(availableLocations).length === 0) return;
    
    // Procura por correspondência case-insensitive nas cidades disponíveis no banco
    const matchedCity = Object.keys(availableLocations).find(
      c => c.toLowerCase() === detectedCity.toLowerCase()
    );
    
    if (matchedCity) {
      setCityFilter(prev => prev ? prev : matchedCity);
    }
  }, [detectedCity, availableLocations]);

  useEffect(() => {
    // Quando a categoria mudar, remove especialidades que não pertencem a ela
    if (categoryFilter === 'massage') {
      setSelectedSpecialties(prev => prev.filter(spec => MASSAGE_SPECIALTIES.includes(spec)));
    } else if (categoryFilter === 'escort') {
      setSelectedSpecialties(prev => prev.filter(spec => ESCORT_SPECIALTIES.includes(spec)));
    }
  }, [categoryFilter]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSpecialtyDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Busca os stories sempre que a categoria ou a cidade mudar
    fetchStories();
  }, [categoryFilter, cityFilter]);

  const isVideo = activeStoryPhotos[activeSlideIndex]?.type === 'video';

  // Progress bar filling effect for photos
  useEffect(() => {
    if (!activeStoryProfile || isStoryLoading || isVideo || !mediaReady) {
      return;
    }
    
    const interval = setInterval(() => {
      setStoryProgress(prev => {
        if (prev >= 100) {
          return 100;
        }
        return prev + 1;
      });
    }, 50); // 50ms * 100 = 5000ms (5 segundos)
    
    return () => clearInterval(interval);
  }, [activeStoryProfile, activeSlideIndex, isStoryLoading, isVideo, mediaReady]);

  // Handle slide transition when progress reaches 100 (only for photos)
  useEffect(() => {
    if (storyProgress >= 100 && !isVideo) {
      handleNextSlide();
    }
  }, [storyProgress, isVideo]);

  // Helper: ordena perfis dando peso absoluto para tiers e proximidade se userCoords estiver ativo
  const sortProfiles = (profilesList: Profile[], coords: [number, number] | null) => {
    const dataWithDistance = coords 
      ? profilesList.map(p => {
          if (p.latitude && p.longitude) {
            const distance = getHaversineDistance(
              coords[0],
              coords[1],
              Number(p.latitude),
              Number(p.longitude)
            );
            return { ...p, distance };
          }
          return p;
        })
      : profilesList;

    return [...dataWithDistance].sort((a, b) => {
      // 1. Categoria de Assinatura (Gold > Pro > Free)
      const tierOrder: Record<string, number> = { gold: 3, pro: 2, free: 1 };
      const tierA = tierOrder[a.subscription_tier || 'free'] || 1;
      const tierB = tierOrder[b.subscription_tier || 'free'] || 1;
      if (tierA !== tierB) return tierB - tierA;

      // 2. Status Boost Ativo (Com boost > Sem boost)
      const isBoostedA = a.boost_expires_at && new Date(a.boost_expires_at) > new Date() ? 1 : 0;
      const isBoostedB = b.boost_expires_at && new Date(b.boost_expires_at) > new Date() ? 1 : 0;
      if (isBoostedA !== isBoostedB) return isBoostedB - isBoostedA;

      // 3. Se ambas possuem Boost, ordenar pela recência (quem expira mais tarde = pagou por último)
      if (isBoostedA && isBoostedB) {
        const timeA = new Date(a.boost_expires_at!).getTime();
        const timeB = new Date(b.boost_expires_at!).getTime();
        if (timeA !== timeB) return timeB - timeA;
      }

      // 4. Proximidade (Mais perto > Mais longe)
      const distA = (a as any).distance !== undefined ? (a as any).distance : Infinity;
      const distB = (b as any).distance !== undefined ? (b as any).distance : Infinity;
      if (distA !== distB) return distA - distB;

      // 5. Disponibilidade ("Disponível Agora" primeiro)
      const availA = a.is_available_now && (!a.available_until || new Date(a.available_until) > new Date()) ? 1 : 0;
      const availB = b.is_available_now && (!b.available_until || new Date(b.available_until) > new Date()) ? 1 : 0;
      if (availA !== availB) return availB - availA;

      // 6. Recência (Mais novo primeiro)
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
  };

  useEffect(() => {
    const hasActiveFilters = cityFilter || neighborhoodFilter || categoryFilter || ageFilter || priceFilter || selectedSpecialties.length > 0 || spaceFilter || genderFilter;
    if (hasActiveFilters) {
      fetchProfiles();
    } else {
      setProfiles(sortProfiles(initialProfiles, userCoords));
    }
  }, [cityFilter, neighborhoodFilter, categoryFilter, ageFilter, priceFilter, selectedSpecialties, spaceFilter, genderFilter, initialProfiles, userCoords]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
  };

  const fetchSpecialties = async () => {
    const { data } = await supabase.from('specialties').select('name');
    if (data) setSpecialtiesList(data);
  };

  const fetchStories = async () => {
    let query = supabase.from('stories')
      .select('profile_id, profiles:profiles(id, name, avatar_url, subscription_tier, is_available_now, whatsapp, category, city)')
      .gt('expires_at', new Date().toISOString());
      
    const { data } = await query;
    if (data) {
      const profileMap = new Map<string, Profile>();
      data.forEach((item: any) => {
        if (item.profiles) {
          const p = item.profiles as Profile;
          if (categoryFilter) {
            const cat = p.category;
            if (categoryFilter === 'massage' && cat !== 'massage' && cat !== 'both') return;
            if (categoryFilter === 'escort' && cat !== 'escort' && cat !== 'both') return;
          }
          if (cityFilter) {
            if (!p.city || toTitleCase(p.city) !== toTitleCase(cityFilter)) return;
          }
          profileMap.set(p.id, p);
        }
      });
      const sorted = Array.from(profileMap.values()).sort((a, b) => {
        const getScore = (p: Profile) => (p.subscription_tier === 'gold' ? 2 : p.subscription_tier === 'pro' ? 1 : 0);
        return getScore(b) - getScore(a);
      });
      setStoriesProfiles(sorted);
    }
  };

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const citySlug = cityFilter ? slugify(cityFilter) : null;
      const neighborhoodSlug = neighborhoodFilter ? slugify(neighborhoodFilter) : null;

      // 1. Chamar o RPC otimizado get_premium_profiles para carregar os registros da localização
      const { data, error } = await supabase.rpc('get_premium_profiles', {
        p_city_slug: citySlug,
        p_neighborhood_slug: neighborhoodSlug
      });

      if (error) {
        console.error("Erro ao carregar perfis via RPC:", error);
        setLoading(false);
        return;
      }

      let filteredData = (data as unknown as Profile[]) || [];

      // 2. Se o usuário buscou por uma cidade e não encontramos resultados,
      // realizamos uma busca de proximidade/geral como fallback (exibindo aviso de fallback)
      if (cityFilter && filteredData.length === 0) {
        const { data: fallbackData } = await supabase.rpc('get_premium_profiles');
        filteredData = (fallbackData as unknown as Profile[]) || [];
        setShowLocationFallbackWarning(true);
        setFallbackCityName(cityFilter);
      } else {
        setShowLocationFallbackWarning(false);
      }

      // 3. Aplicar filtros locais na memória (altamente eficiente para conjuntos reduzidos de dados)
      
      // Filtro de Categoria
      if (categoryFilter) {
        filteredData = filteredData.filter(p => {
          if (categoryFilter === 'massage') return p.category === 'massage' || p.category === 'both';
          if (categoryFilter === 'escort') return p.category === 'escort' || p.category === 'both';
          return true;
        });
      }

      // Filtro de Preço Máximo
      if (priceFilter) {
        const maxPrice = Number(priceFilter);
        if (maxPrice) {
          filteredData = filteredData.filter(p => Number(p.price_per_hour) <= maxPrice);
        }
      }

      // Filtro de Idade
      if (ageFilter) {
        filteredData = filteredData.filter(p => {
          if (ageFilter === '18-25') return p.age >= 18 && p.age <= 25;
          if (ageFilter === '26-35') return p.age >= 26 && p.age <= 35;
          if (ageFilter === '36+') return p.age >= 36;
          return true;
        });
      }

      // Filtro de Especialidade (tabela N:N pré-agrupada no specialties do RPC)
      if (selectedSpecialties.length > 0) {
        filteredData = filteredData.filter(p => 
          p.specialties?.some(s => selectedSpecialties.includes(s.specialties?.name || ''))
        );
      }

      // Filtro de Ambiente (Local Próprio)
      if (spaceFilter) {
        filteredData = filteredData.filter(p => 
          p.amenities?.includes('Local Próprio')
        );
      }

      // Filtro de Gênero
      if (genderFilter) {
        filteredData = filteredData.filter(p => p.gender === genderFilter);
      }

      // 4. Calcular distância se as coordenadas do usuário estiverem ativas
      if (userCoords) {
        filteredData = filteredData.map(p => {
          if (p.latitude && p.longitude) {
            const distance = getHaversineDistance(
              userCoords[0],
              userCoords[1],
              Number(p.latitude),
              Number(p.longitude)
            );
            return { ...p, distance };
          }
          return p;
        });

        // Reordenar por proximidade como critério secundário
        filteredData = sortProfiles(filteredData, userCoords);
      }

      setProfiles(filteredData);
    } catch (e) {
      console.error("Erro ao buscar perfis na vitrine:", e);
      setShowLocationFallbackWarning(false);
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = () => {
    setIsQuizOpen(true);
  };

  const handleQuizComplete = (answers: { vibe: string; budget: string; space: string }) => {
    setIsQuizOpen(false);
    setCategoryFilter(answers.vibe);
    setPriceFilter(answers.budget);
    setSpaceFilter(answers.space === 'local');
    
    // Scroll suave até os resultados
    setTimeout(() => {
      const gridElement = document.getElementById('vitrine-grid');
      if (gridElement) {
        gridElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 300);
  };

  const handleToggleSpecialty = (name: string) => {
    setSelectedSpecialties(prev => 
      prev.includes(name) 
        ? prev.filter(s => s !== name) 
        : [...prev, name]
    );
  };

  const renderSpecialtyCheckbox = (name: string) => {
    const isChecked = selectedSpecialties.includes(name);
    return (
      <label 
        key={name} 
        className={`flex items-center gap-3 px-3 py-3 text-sm rounded-lg cursor-pointer transition-all select-none ${
          isChecked 
            ? 'text-gold-light bg-gold-primary/10 font-semibold' 
            : 'text-gray-300 hover:text-white hover:bg-white/5'
        }`}
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => handleToggleSpecialty(name)}
          className="rounded border-white/20 text-gold-primary focus:ring-0 focus:ring-offset-0 bg-black/40 accent-gold-primary w-5 h-5 cursor-pointer"
        />
        <span>{name}</span>
      </label>
    );
  };

  const handleOpenStory = async (profile: Profile) => {
    setActiveStoryProfile(profile);
    setActiveSlideIndex(0);
    setStoryProgress(0);
    setIsStoryLoading(true);
    setMediaReady(false);
    setActiveStoryPhotos([]);

    try {
      const { data, error } = await supabase
        .from('stories')
        .select('media_url, media_type')
        .eq('profile_id', profile.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (data && data.length > 0) {
        const slides = data.map((s: any) => ({
          url: s.media_url,
          type: (s.media_type || 'photo') as 'photo' | 'video'
        }));
        setActiveStoryPhotos(slides);
      } else {
        setActiveStoryPhotos([{
          url: profile.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400',
          type: 'photo'
        }]);
      }
    } catch (err) {
      console.error('Erro ao buscar stories efêmeros:', err);
      setActiveStoryPhotos([{
        url: profile.avatar_url || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400',
        type: 'photo'
      }]);
    } finally {
      setIsStoryLoading(false);
    }
  };

  const handleNextSlide = () => {
    if (!activeStoryProfile) return;

    setMediaReady(false);
    setStoryProgress(0);
    if (activeSlideIndex < activeStoryPhotos.length - 1) {
      setActiveSlideIndex(activeSlideIndex + 1);
    } else {
      // Encontra o próximo perfil de story
      const currentIndex = storiesProfiles.findIndex(p => p.id === activeStoryProfile.id);
      if (currentIndex !== -1 && currentIndex < storiesProfiles.length - 1) {
        handleOpenStory(storiesProfiles[currentIndex + 1]);
      } else {
        handleCloseStory();
      }
    }
  };

  const handlePrevSlide = () => {
    if (!activeStoryProfile) return;

    setMediaReady(false);
    setStoryProgress(0);
    if (activeSlideIndex > 0) {
      setActiveSlideIndex(activeSlideIndex - 1);
    } else {
      const currentIndex = storiesProfiles.findIndex(p => p.id === activeStoryProfile.id);
      if (currentIndex > 0) {
        handleOpenStory(storiesProfiles[currentIndex - 1]);
      } else {
        setStoryProgress(0);
        setMediaReady(true);
      }
    }
  };

  const handleCloseStory = () => {
    setActiveStoryProfile(null);
    setActiveStoryPhotos([]);
    setActiveSlideIndex(0);
    setStoryProgress(0);
    setMediaReady(false);
  };

  // mapAdvertisers and mapCenter moved to ProfileGrid

  const getActiveFilterCount = () => {
    let count = 0;
    if (ageFilter) count++;
    if (priceFilter) count++;
    if (selectedSpecialties.length > 0) count++;
    if (cityFilter) count++;
    if (neighborhoodFilter) count++;
    if (spaceFilter) count++;
    if (genderFilter) count++;
    return count;
  };

  return (
    <main className={`w-full bg-dark-bg flex flex-col relative overflow-hidden selection:bg-gold-primary selection:text-dark-bg ${viewMode === 'reels' ? "h-[100dvh]" : "min-h-screen pb-24 md:pb-0"}`}>
      {/* Ambient Aurora Glow Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[5%] left-[-15%] w-[600px] h-[600px] bg-wine-primary/15 blur-[140px] rounded-full animate-float-1" />
        <div className="absolute bottom-[5%] right-[-15%] w-[700px] h-[700px] bg-gold-primary/8 blur-[150px] rounded-full animate-float-2" />
        <div className="absolute top-[35%] left-[25%] w-[500px] h-[500px] bg-purple-900/10 blur-[130px] rounded-full animate-float-3" />
      </div>

      {/* Navigation Header */}
      <header className={cn(
        "z-40 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between transition-all duration-300",
        viewMode === 'reels' 
          ? "absolute top-0 inset-x-0 bg-gradient-to-b from-black/90 to-transparent border-none" 
          : "sticky top-0 bg-black/60 backdrop-blur-lg border-b border-white/5"
      )}>
        <Logo />
        
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Link href="/rankings" className="flex items-center gap-1 text-xs text-gold-light hover:text-white transition-colors font-semibold" title="Rankings">
            <Trophy className="w-4 h-4 text-gold-primary" />
            <span className="hidden sm:inline">Rankings</span>
          </Link>
          
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link href={userRole === 'provider' ? '/dashboard' : '/client-dashboard'}>
                <Button variant="dark" size="sm">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Meu Painel</span>
                </Button>
              </Link>
              <button 
                onClick={handleLogout}
                className="p-2 rounded-xl text-gray-400 hover:text-red-400 hover:bg-white/5 transition-all cursor-pointer"
                title="Sair da Conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" title="Entrar">
                  <LogIn className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Entrar</span>
                </Button>
              </Link>
              <Link href="/cadastro">
                <Button variant="gold" size="sm">
                  <span className="sm:hidden">+ Anunciar</span>
                  <span className="hidden sm:inline">Anunciar / Cadastrar</span>
                </Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Stories Section - Em Grid/Mapa ficam abaixo do header */}
      {viewMode !== 'reels' && (
        <AuraStories 
          storiesProfiles={storiesProfiles} 
          handleOpenStory={handleOpenStory}
          canPost={!!user && userRole === 'provider'}
        />
      )}

      {/* Barra de Filtros e Controles compactos — Oculta no mobile em modo Reels */}
      <div className={cn(viewMode === 'reels' && "hidden md:block")}>
        <FilterBar
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          spaceFilter={spaceFilter}
          setSpaceFilter={setSpaceFilter}
          viewMode={viewMode}
          setViewMode={setViewMode}
          cityFilter={cityFilter}
          setCityFilter={setCityFilter}
          neighborhoodFilter={neighborhoodFilter}
          setNeighborhoodFilter={setNeighborhoodFilter}
          availableLocations={availableLocations}
          getActiveFilterCount={getActiveFilterCount}
          onOpenFilters={() => setIsFilterDrawerOpen(true)}
        />
      </div>

      {/* Em Reels: Stories ficam ENTRE a FilterBar e o player de Reels — Oculto no mobile */}
      {viewMode === 'reels' && (
        <div className="hidden md:block">
          <AuraStories 
            storiesProfiles={storiesProfiles} 
            handleOpenStory={handleOpenStory} 
            overlay={true}
            canPost={!!user && userRole === 'provider'}
          />
        </div>
      )}

      {/* Vitrine / Grid de Perfis, Mapa ou Reels */}
      {viewMode === 'reels' ? (
        <div className="flex-1 min-h-0 w-full max-w-7xl mx-auto md:px-4 md:pb-2 relative z-10 overflow-hidden flex justify-center items-center">
          <ProfileReels 
            profiles={profiles} 
            photos={reelsPhotos} 
            loading={loading || loadingReelsPhotos} 
            setViewMode={setViewMode}
            onOpenFilters={() => setIsFilterDrawerOpen(true)}
            activeFiltersCount={getActiveFilterCount()}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            spaceFilter={spaceFilter}
            setSpaceFilter={setSpaceFilter}
          />
        </div>
      ) : (
        <>
          {showLocationFallbackWarning && (
            <div className="max-w-7xl mx-auto px-6 mb-6">
              <div className="bg-gradient-to-r from-wine-dark/20 to-black/40 border border-wine-primary/20 rounded-2xl p-4 flex items-center gap-3.5 shadow-lg backdrop-blur-md">
                <div className="p-2 bg-wine-primary/10 rounded-full text-wine-light shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-200">
                    Nenhuma profissional encontrada em <strong className="text-wine-light">{fallbackCityName}</strong>.
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                    Mostrando as profissionais ativas mais próximas de você no momento.
                  </p>
                </div>
              </div>
            </div>
          )}
          <ProfileGrid 
            loading={loading} 
            profiles={profiles} 
            viewMode={viewMode === 'map' ? 'map' : 'grid'} 
            userCoords={userCoords} 
          />
        </>
      )}

      {/* Aura Matchmaker Quiz Modal */}
      <MatchmakerQuiz 
        isOpen={isQuizOpen} 
        onClose={() => setIsQuizOpen(false)} 
        onComplete={handleQuizComplete} 
      />

      {/* Visualizador de Stories Modal */}
      <AnimatePresence>
        {activeStoryProfile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 50, opacity: 0 }}
              className="w-full max-w-lg h-full max-h-[100dvh] md:max-h-[85vh] md:aspect-[9/16] bg-black md:rounded-3xl shadow-2xl relative overflow-hidden flex flex-col justify-between"
            >
              
              {/* Top Bar with Progress Indicators */}
              <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent z-20 flex flex-col gap-3">
              {/* Progress segments */}
              <div className="flex gap-1.5 w-full">
                {activeStoryPhotos.map((_, idx) => {
                  let width = '0%';
                  if (idx < activeSlideIndex) width = '100%';
                  if (idx === activeSlideIndex) width = `${storyProgress}%`;
                  return (
                    <div key={idx} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-gold-primary rounded-full ${
                          width === '0%' ? 'transition-none' : 'transition-all duration-[50ms] ease-linear'
                        }`}
                        style={{ width }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Header profile info */}
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full border border-gold-primary overflow-hidden relative">
                    <Image 
                      src={getCDNUrl(activeStoryProfile.avatar_url) || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400'} 
                      alt={activeStoryProfile.name}
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white tracking-wide flex items-center gap-1">
                      {activeStoryProfile.name}
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    </span>
                    <span className="text-[9px] text-gray-400 capitalize">
                      {activeStoryProfile.category === 'massage' 
                        ? '🧘 Massagens' 
                        : activeStoryProfile.category === 'escort' 
                          ? '🔥 Acompanhante' 
                          : '✨ Massagens & Acompanhante'}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={handleCloseStory}
                  className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Media Content Body (Photos/Videos) */}
            <div className="absolute inset-0 w-full h-full z-0 bg-neutral-950 flex items-center justify-center">
              {isStoryLoading ? (
                <div className="w-10 h-10 border-4 border-gold-primary/30 border-t-gold-primary rounded-full animate-spin" />
              ) : activeStoryPhotos[activeSlideIndex] ? (
                <div className="relative w-full h-full">
                  {activeStoryPhotos[activeSlideIndex].type === 'video' ? (
                    <video 
                      src={getCDNUrl(activeStoryPhotos[activeSlideIndex].url)} 
                      autoPlay 
                      playsInline 
                      controls={false}
                      className="w-full h-full object-contain select-none pointer-events-none"
                      onContextMenu={(e) => e.preventDefault()}
                      controlsList="nodownload"
                      onCanPlay={() => setMediaReady(true)}
                      onTimeUpdate={(e) => {
                        if (!mediaReady) return;
                        const video = e.currentTarget;
                        if (video.duration) {
                          setStoryProgress((video.currentTime / video.duration) * 100);
                        }
                      }}
                      onEnded={handleNextSlide}
                    />
                  ) : (
                    <Image 
                      src={getCDNUrl(activeStoryPhotos[activeSlideIndex].url) || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400'} 
                      alt="Story content" 
                      fill
                      className="object-contain pointer-events-none select-none"
                      priority
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                      onLoad={() => setMediaReady(true)}
                    />
                  )}
                </div>
              ) : (
                <div className="text-gray-500 text-xs">Carregando mídia...</div>
              )}

              {/* Left/Right Tap Areas (Hidden Controls) */}
              <button 
                type="button" 
                onClick={handlePrevSlide} 
                className="absolute left-0 top-0 bottom-0 w-[30%] z-10 cursor-w-resize" 
                aria-label="Previous slide"
              />
              <button 
                type="button" 
                onClick={handleNextSlide} 
                className="absolute right-0 top-0 bottom-0 w-[70%] z-10 cursor-e-resize"
                aria-label="Next slide"
              />
            </div>

            {/* Bottom Call to Actions */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/95 via-black/80 to-transparent z-20 flex gap-3">
              <Link 
                href={`/perfil/${activeStoryProfile.id}`}
                onClick={handleCloseStory}
                className="flex-1"
              >
                <button className="w-full py-3.5 px-4 rounded-xl border border-white/10 hover:border-gold-primary bg-white/10 hover:bg-gold-primary/20 text-xs font-bold uppercase tracking-wider text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer backdrop-blur-md">
                  <User className="w-4 h-4 text-gold-primary" />
                  Ver Perfil
                </button>
              </Link>
              
              {activeStoryProfile.whatsapp && (
                <a 
                  href={formatWhatsAppLink(activeStoryProfile.whatsapp, `Olá ${activeStoryProfile.name}, vi seu Stories disponível agora no Relaxa & Goza! Tudo bem?`) || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <button className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold uppercase tracking-wider text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/20">
                    <span className="text-sm font-sans">💬</span>
                    WhatsApp
                  </button>
                </a>
              )}
            </div>

          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Sliding Filter Drawer */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-fadeIn">
          {/* Backdrop click to close */}
          <div className="absolute inset-0 z-0" onClick={() => setIsFilterDrawerOpen(false)} />
          
          <div className="w-full max-w-md h-full bg-dark-card border-l border-white/10 p-6 shadow-2xl relative z-10 flex flex-col justify-between animate-slideLeft">
            <div>
              {/* Header */}
              <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-gold-primary" />
                  <h3 className="text-base font-semibold text-white tracking-wide">Filtros Avançados</h3>
                </div>
                <button 
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-180px)] pr-2">
                {/* Gênero */}
                <Select
                  label="Gênero"
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value as any)}
                  options={[
                    { value: '', label: 'Todos' },
                    { value: 'Feminino', label: 'Apenas mulheres' },
                    { value: 'Masculino', label: 'Apenas homens' },
                    { value: 'Trans', label: 'Apenas trans' },
                  ]}
                  themeVariant={categoryFilter === 'escort' ? 'wine' : 'gold'}
                />

                {/* Idade */}
                <Select
                  label="Idade"
                  value={ageFilter}
                  onChange={(e) => setAgeFilter(e.target.value)}
                  options={[
                    { value: '', label: 'Qualquer idade' },
                    { value: '18-25', label: '18 a 25 anos' },
                    { value: '26-35', label: '26 a 35 anos' },
                    { value: '36+', label: '36+ anos' },
                  ]}
                  themeVariant={categoryFilter === 'escort' ? 'wine' : 'gold'}
                />

                {/* Preço Máximo */}
                <Select
                  label="Preço Máximo (Hora)"
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value)}
                  options={[
                    { value: '', label: 'Qualquer valor' },
                    { value: '200', label: 'Até R$ 200' },
                    { value: '400', label: 'Até R$ 400' },
                    { value: '600', label: 'Até R$ 600' },
                    { value: '1000', label: 'Até R$ 1.000' },
                  ]}
                  themeVariant={categoryFilter === 'escort' ? 'wine' : 'gold'}
                />

                {/* Especialidades */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">Especialidades</label>
                  <div className="bg-black/40 border border-white/10 rounded-xl max-h-64 overflow-y-auto p-2">
                    {categoryFilter === 'massage' && (
                      <div className="flex flex-col gap-1">
                        {specialtiesList
                          .filter(s => MASSAGE_SPECIALTIES.includes(s.name))
                          .map(spec => renderSpecialtyCheckbox(spec.name))}
                      </div>
                    )}
                    
                    {categoryFilter === 'escort' && (
                      <div className="flex flex-col gap-1">
                        {specialtiesList
                          .filter(s => ESCORT_SPECIALTIES.includes(s.name))
                          .map(spec => renderSpecialtyCheckbox(spec.name))}
                      </div>
                    )}
                    
                    {(categoryFilter === '' || categoryFilter === 'both') && (
                      <div className="flex flex-col gap-1">
                        <div className="text-[10px] font-bold text-gold-primary tracking-wider uppercase px-2.5 py-1.5 border-b border-white/5 bg-white/5 rounded-t-lg">
                          Massagens & Terapias
                        </div>
                        {specialtiesList
                          .filter(s => MASSAGE_SPECIALTIES.includes(s.name))
                          .map(spec => renderSpecialtyCheckbox(spec.name))}
                        
                        <div className="text-[10px] font-bold text-wine-light tracking-wider uppercase px-2.5 py-1.5 border-b border-white/5 bg-white/5 mt-2">
                          Acompanhante Adulto
                        </div>
                        {specialtiesList
                          .filter(s => ESCORT_SPECIALTIES.includes(s.name))
                          .map(spec => renderSpecialtyCheckbox(spec.name))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Reset & Apply buttons */}
            <div className="border-t border-white/5 pt-4 flex gap-3">
              <Button
                type="button"
                onClick={() => {
                  setAgeFilter('');
                  setPriceFilter('');
                  setSelectedSpecialties([]);
                  setGenderFilter('');
                }}
                variant="dark"
                className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white"
              >
                Limpar
              </Button>
              <Button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                variant={categoryFilter === 'escort' ? 'wine' : 'gold'}
                className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Legal Footer for Grid/Map mode */}
      {viewMode !== 'reels' && (
        <footer className="w-full bg-black/80 border-t border-white/5 py-12 px-6 mt-12 relative z-10">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-8 border-b border-white/5">
                <Logo />
              <div className="flex flex-wrap gap-4 sm:gap-8 text-xs text-gray-400">
                <Link href="/termos-de-uso" className="hover:text-gold-light transition-colors">
                  Termos de Uso
                </Link>
                <Link href="/cadastro" className="hover:text-gold-light transition-colors">
                  Cadastrar Anúncio
                </Link>
                <Link href="/login" className="hover:text-gold-light transition-colors">
                  Área de Login
                </Link>
              </div>
            </div>
            
            <div className="space-y-4 text-[11px] sm:text-xs text-gray-500 leading-relaxed max-w-4xl">
              <p className="font-semibold text-gray-400">Aviso Legal:</p>
              <p>
                Este site é uma plataforma de classificados online destinada exclusivamente à veiculação de publicidade para maiores de 18 anos. Não agenciamos, não intermediamos e não participamos de qualquer transação financeira entre usuários e anunciantes. Em conformidade com a legislação brasileira, repudiamos e proibimos qualquer forma de exploração sexual ou cafetinagem.
              </p>
              <p>
                Os anunciantes utilizam a plataforma de forma autônoma na modalidade Software as a Service (SaaS) nos termos do Artigo 19 do Marco Civil da Internet (Lei 12.965/14). A responsabilidade pelas informações, imagens e serviços veiculados é integralmente da pessoa maior de idade que criou o anúncio.
              </p>
            </div>
          </div>
        </footer>
      )}

      {/* Mobile Floating Bottom Navigation Bar */}
      <div className="fixed bottom-5 inset-x-4 z-40 md:hidden flex justify-center">
        <div className="w-full max-w-sm glass-effect rounded-2xl border border-white/10 p-2 flex items-center justify-around shadow-2xl bg-black/85 backdrop-blur-md">
          {/* Reels Tab */}
          <button
            onClick={() => setViewMode('reels')}
            className={cn(
              "flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer",
              viewMode === 'reels' ? "text-gold-primary font-bold scale-105" : "text-gray-400"
            )}
          >
            <Play className={cn("w-5 h-5", viewMode === 'reels' ? "fill-gold-primary" : "")} />
            <span className="text-[9px] uppercase tracking-wider">Reels</span>
          </button>

          {/* Vitrine (Grid) Tab */}
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              "flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer",
              viewMode === 'grid' ? "text-gold-primary font-bold scale-105" : "text-gray-400"
            )}
          >
            <Grid className="w-5 h-5" />
            <span className="text-[9px] uppercase tracking-wider">Vitrine</span>
          </button>

          {/* Map Tab */}
          <button
            onClick={() => setViewMode('map')}
            className={cn(
              "flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all cursor-pointer",
              viewMode === 'map' ? "text-gold-primary font-bold scale-105" : "text-gray-400"
            )}
          >
            <MapIcon className="w-5 h-5" />
            <span className="text-[9px] uppercase tracking-wider">Mapa</span>
          </button>

          {/* Anunciar / Painel Tab */}
          {user ? (
            <Link
              href={userRole === 'provider' ? '/dashboard' : '/client-dashboard'}
              className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-gray-400 hover:text-white transition-all cursor-pointer"
            >
              <LayoutDashboard className="w-5 h-5 text-gold-light" />
              <span className="text-[9px] uppercase tracking-wider">Meu Painel</span>
            </Link>
          ) : (
            <Link
              href="/cadastro"
              className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-gold-light hover:text-white transition-all cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-gold-primary to-gold-dark flex items-center justify-center text-dark-bg font-extrabold text-xs shadow-md shadow-gold-primary/20">
                +
              </div>
              <span className="text-[9px] uppercase tracking-wider font-semibold">Anunciar</span>
            </Link>
          )}
        </div>
      </div>

    </main>
  );
}
