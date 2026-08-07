import React from 'react';
import { Grid, Map, MapPin, SlidersHorizontal, Play, Navigation } from 'lucide-react';

interface FilterBarProps {
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  spaceFilter: boolean;
  setSpaceFilter: (v: boolean) => void;
  verifiedFilter: boolean;
  setVerifiedFilter: (v: boolean) => void;
  availableFilter?: boolean;
  setAvailableFilter?: (v: boolean) => void;
  distanceFilter?: number;
  setDistanceFilter?: (v: number) => void;
  viewMode: 'reels' | 'grid';
  setViewMode: (v: 'reels' | 'grid') => void;
  cityFilter: string;
  setCityFilter: (v: string) => void;
  neighborhoodFilter: string;
  setNeighborhoodFilter: (v: string) => void;
  availableLocations: Record<string, string[]>;
  getActiveFilterCount: () => number;
  onOpenFilters: () => void;
  onRecalculateLocation?: () => void;
  currentTab: 'ads' | 'models';
  setCurrentTab: (v: 'ads' | 'models') => void;
}

export default function FilterBar({
  categoryFilter,
  setCategoryFilter,
  spaceFilter,
  setSpaceFilter,
  verifiedFilter,
  setVerifiedFilter,
  availableFilter,
  setAvailableFilter,
  distanceFilter,
  setDistanceFilter,
  viewMode,
  setViewMode,
  cityFilter,
  setCityFilter,
  neighborhoodFilter,
  setNeighborhoodFilter,
  availableLocations,
  getActiveFilterCount,
  onOpenFilters,
  onRecalculateLocation,
  currentTab,
  setCurrentTab
}: FilterBarProps) {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 relative z-10 space-y-3">
      {/* Luxury Badging Line */}
      <div className="flex justify-center md:justify-start items-center gap-1.5 px-1 py-0.5 text-xs sm:text-xs text-gray-400 font-normal tracking-wide">
        <span className="w-1.5 h-1.5 rounded-full bg-gold-primary shrink-0 animate-pulse" />
        <span>Vitrine de alto padrão para acompanhantes de luxo e massoterapeutas de elite</span>
      </div>

      {/* Abas Principais: Anúncios vs Profissionais */}
      <div className="w-full border-b border-white/5 pb-2 mb-1">
        <div className="inline-flex bg-black/50 border border-white/5 p-1 rounded-xl gap-1">
          <button
            onClick={() => setCurrentTab('ads')}
            className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              currentTab === 'ads'
                ? 'bg-linear-to-r from-gold-primary to-gold-dark text-dark-bg shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>📢 Anúncios</span>
          </button>
          <button
            onClick={() => setCurrentTab('models')}
            className={`px-4 py-2.5 rounded-lg text-xs sm:text-sm font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              currentTab === 'models'
                ? 'bg-linear-to-r from-gold-primary to-gold-dark text-dark-bg shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>👤 Profissionais</span>
          </button>
        </div>
      </div>

      {/* Abas de Categoria e Filtros Rápidos (Flex-wrap) */}
      <div className="w-full">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <button
            onClick={() => { setCategoryFilter(''); setSpaceFilter(false); if (setAvailableFilter) setAvailableFilter(false); }}
            className={`px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase transition-all whitespace-nowrap border ${
              categoryFilter === '' && !spaceFilter && !availableFilter && !verifiedFilter
                ? 'bg-linear-to-r from-gold-primary to-gold-dark border-gold-primary text-dark-bg shadow-md shadow-gold-primary/10'
                : 'bg-white/5 border-white/5 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Todos
          </button>
          {setAvailableFilter && (
            <button
              onClick={() => { setAvailableFilter(!availableFilter); }}
              className={`px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase transition-all whitespace-nowrap border flex items-center gap-1.5 ${
                availableFilter
                  ? 'bg-emerald-500 border-emerald-400 text-dark-bg shadow-md shadow-emerald-500/20'
                  : 'bg-white/5 border-white/5 text-gray-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${availableFilter ? 'bg-dark-bg' : 'bg-emerald-400 animate-pulse'}`} />
              Online Agora
            </button>
          )}
          <button
            onClick={() => { setCategoryFilter('escort'); setSpaceFilter(false); }}
            className={`px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase transition-all whitespace-nowrap border ${
              categoryFilter === 'escort' && !spaceFilter
                ? 'bg-linear-to-r from-wine-primary to-wine-dark border-wine-primary text-white shadow-md shadow-wine-primary/10'
                : 'bg-white/5 border-white/5 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            🔥 Acompanhantes
          </button>
          <button
            onClick={() => { setCategoryFilter('massage'); setSpaceFilter(false); }}
            className={`px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase transition-all whitespace-nowrap border ${
              categoryFilter === 'massage' && !spaceFilter
                ? 'bg-linear-to-r from-gold-primary to-gold-dark border-gold-primary text-dark-bg shadow-md shadow-gold-primary/10'
                : 'bg-white/5 border-white/5 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            🧘 Massagens
          </button>
          <button
            onClick={() => { setSpaceFilter(!spaceFilter); }}
            className={`px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase transition-all whitespace-nowrap border ${
              spaceFilter
                ? 'bg-linear-to-r from-emerald-600 to-emerald-800 border-emerald-600 text-white shadow-md shadow-emerald-600/10'
                : 'bg-white/5 border-white/5 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            🏠 Com Espaço
          </button>
          <button
            onClick={() => { setVerifiedFilter(!verifiedFilter); }}
            className={`px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase transition-all whitespace-nowrap border ${
              verifiedFilter
                ? 'bg-linear-to-r from-emerald-500 to-emerald-700 border-emerald-500 text-white shadow-md shadow-emerald-500/10'
                : 'bg-white/5 border-white/5 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            🛡️ Verificados
          </button>
          {setDistanceFilter && (
            <div className="relative">
              <select
                value={distanceFilter || 0}
                title="Filtrar por Distância"
                onChange={(e) => setDistanceFilter(Number(e.target.value))}
                className={`px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold tracking-wider uppercase transition-all whitespace-nowrap border appearance-none cursor-pointer pr-7 ${
                  distanceFilter && distanceFilter > 0
                    ? 'bg-linear-to-r from-blue-600 to-indigo-700 border-blue-500 text-white shadow-md shadow-blue-500/10'
                    : 'bg-white/5 border-white/5 text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <option value={0} className="bg-dark-bg text-gray-400">📍 Qualquer Distância</option>
                <option value={2} className="bg-dark-bg text-white">📍 Até 2 km de mim</option>
                <option value={5} className="bg-dark-bg text-white">📍 Até 5 km de mim</option>
                <option value={10} className="bg-dark-bg text-white">📍 Até 10 km de mim</option>
                <option value={25} className="bg-dark-bg text-white">📍 Até 25 km de mim</option>
                <option value={50} className="bg-dark-bg text-white">📍 Até 50 km de mim</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">
                ▼
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controles: Pesquisa, Seleção de Modo e Filtros Avançados */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center w-full">
        {/* Seletores de Localização */}
        <div className="flex flex-col sm:flex-row gap-2 flex-1 min-w-0">
          {/* Seletor de Cidade */}
          <div className="relative flex-1 min-w-0">
            <label htmlFor="city-filter-select" className="sr-only">Filtrar por Cidade</label>
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <select 
              id="city-filter-select"
              value={cityFilter}
              title="Filtrar por Cidade"
              onChange={(e) => {
                setCityFilter(e.target.value);
                setNeighborhoodFilter('');
              }}
              className="w-full bg-black/40 border border-white/5 focus:border-gold-primary/30 rounded-xl py-2.5 pl-9 pr-10 text-xs sm:text-sm text-white focus:outline-none transition-colors appearance-none cursor-pointer"
            >
              <option value="" className="bg-dark-bg text-gray-400">Qualquer cidade...</option>
              {Object.keys(availableLocations).sort().map(city => (
                <option key={city} value={city} className="bg-dark-bg text-white">{city}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
              {onRecalculateLocation && (
                <button
                  type="button"
                  onClick={onRecalculateLocation}
                  className="text-gray-400 hover:text-gold-primary p-0.5 transition-colors cursor-pointer"
                  title="Recalcular minha localização atual por GPS"
                >
                  <Navigation className="w-3.5 h-3.5" />
                </button>
              )}
              <svg className="w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Seletor de Bairro */}
          {cityFilter && availableLocations[cityFilter] && availableLocations[cityFilter].length > 0 && (
            <div className="relative flex-1 min-w-0 animate-fadeIn">
              <label htmlFor="neighborhood-filter-select" className="sr-only">Filtrar por Bairro</label>
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              <select 
                id="neighborhood-filter-select"
                value={neighborhoodFilter}
                title="Filtrar por Bairro"
                onChange={(e) => setNeighborhoodFilter(e.target.value)}
                className="w-full bg-black/40 border border-white/5 focus:border-gold-primary/30 rounded-xl py-2.5 pl-9 pr-10 text-xs sm:text-sm text-white focus:outline-none transition-colors appearance-none cursor-pointer"
              >
                <option value="" className="bg-dark-bg text-gray-400">Qualquer bairro...</option>
                {availableLocations[cityFilter].map(neigh => (
                  <option key={neigh} value={neigh} className="bg-dark-bg text-white">{neigh}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Linha secundária de controles no mobile, inline no desktop */}
        <div className="flex gap-2 items-center w-full sm:w-auto">
          {/* Selector Drops vs Grid */}
          <div className="flex flex-1 sm:flex-initial bg-black/40 border border-white/5 rounded-xl p-1 justify-around sm:justify-start">
            <button
              onClick={() => setViewMode('reels')}
              className={`md:hidden flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'reels' 
                  ? 'bg-gold-primary text-dark-bg font-bold shadow-sm' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Drops</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-gold-primary text-dark-bg font-bold shadow-sm' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

          {/* Filtros */}
          <button
            onClick={onOpenFilters}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:px-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-xs sm:text-sm font-semibold text-white transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-gold-primary" />
            <span className="text-xs sm:text-sm">Filtros</span>
            {getActiveFilterCount() > 0 && (
              <span className="bg-gold-primary text-dark-bg text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shrink-0">
                {getActiveFilterCount()}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
