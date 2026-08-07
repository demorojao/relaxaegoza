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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 relative z-10 space-y-2.5">
      {/* Linha 1: Abas de Tipo (Anúncios vs Profissionais) + Filtros de Categoria Principais */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Alternador de Conteúdo: Anúncios vs Profissionais */}
        <div className="inline-flex bg-black/60 border border-white/10 p-1 rounded-xl gap-1 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setCurrentTab('ads')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-1.5 cursor-pointer ${
              currentTab === 'ads'
                ? 'bg-linear-to-r from-gold-primary to-gold-dark text-dark-bg shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>📢 Anúncios</span>
          </button>
          <button
            onClick={() => setCurrentTab('models')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-1.5 cursor-pointer ${
              currentTab === 'models'
                ? 'bg-linear-to-r from-gold-primary to-gold-dark text-dark-bg shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>👤 Profissionais</span>
          </button>
        </div>

        {/* Chips de Categoria Principais (Limpos e Diretos) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => { setCategoryFilter(''); setSpaceFilter(false); if (setAvailableFilter) setAvailableFilter(false); }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all whitespace-nowrap border cursor-pointer ${
              categoryFilter === '' && !spaceFilter && !availableFilter && !verifiedFilter
                ? 'bg-gold-primary border-gold-primary text-dark-bg shadow-sm'
                : 'bg-black/40 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => { setCategoryFilter('escort'); setSpaceFilter(false); }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all whitespace-nowrap border cursor-pointer ${
              categoryFilter === 'escort' && !spaceFilter
                ? 'bg-wine-primary border-wine-primary text-white shadow-sm'
                : 'bg-black/40 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            🔥 Acompanhantes
          </button>
          <button
            onClick={() => { setCategoryFilter('massage'); setSpaceFilter(false); }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all whitespace-nowrap border cursor-pointer ${
              categoryFilter === 'massage' && !spaceFilter
                ? 'bg-gold-primary border-gold-primary text-dark-bg shadow-sm'
                : 'bg-black/40 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            🧘 Massagens
          </button>
          <button
            onClick={() => { setSpaceFilter(!spaceFilter); }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all whitespace-nowrap border cursor-pointer ${
              spaceFilter
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                : 'bg-black/40 border-white/10 text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            🏠 Com Espaço
          </button>
        </div>
      </div>

      {/* Linha 2: Cidade/Bairro, Modo de Exibição e Botão de Filtros */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full">
        {/* Seletores de Localização */}
        <div className="flex flex-col sm:flex-row gap-2 flex-1 min-w-0">
          {/* Seletor de Cidade */}
          <div className="relative flex-1 min-w-0">
            <label htmlFor="city-filter-select" className="sr-only">Filtrar por Cidade</label>
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select 
              id="city-filter-select"
              value={cityFilter}
              title="Filtrar por Cidade"
              onChange={(e) => {
                setCityFilter(e.target.value);
                setNeighborhoodFilter('');
              }}
              className="w-full bg-black/40 border border-white/10 focus:border-gold-primary/40 rounded-xl py-2 pl-9 pr-8 text-xs text-white focus:outline-none transition-colors appearance-none cursor-pointer"
            >
              <option value="" className="bg-dark-bg text-gray-400">Qualquer cidade...</option>
              {Object.keys(availableLocations).sort().map(city => (
                <option key={city} value={city} className="bg-dark-bg text-white">{city}</option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10 pointer-events-none text-gray-400 text-[10px]">
              {onRecalculateLocation && (
                <button
                  type="button"
                  onClick={onRecalculateLocation}
                  className="text-gray-400 hover:text-gold-primary p-0.5 transition-colors cursor-pointer pointer-events-auto"
                  title="Recalcular localização GPS"
                >
                  <Navigation className="w-3.5 h-3.5" />
                </button>
              )}
              <span>▼</span>
            </div>
          </div>

          {/* Seletor de Bairro */}
          {cityFilter && availableLocations[cityFilter] && availableLocations[cityFilter].length > 0 && (
            <div className="relative flex-1 min-w-0 animate-fadeIn">
              <label htmlFor="neighborhood-filter-select" className="sr-only">Filtrar por Bairro</label>
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select 
                id="neighborhood-filter-select"
                value={neighborhoodFilter}
                title="Filtrar por Bairro"
                onChange={(e) => setNeighborhoodFilter(e.target.value)}
                className="w-full bg-black/40 border border-white/10 focus:border-gold-primary/40 rounded-xl py-2 pl-9 pr-8 text-xs text-white focus:outline-none transition-colors appearance-none cursor-pointer"
              >
                <option value="" className="bg-dark-bg text-gray-400">Qualquer bairro...</option>
                {availableLocations[cityFilter].map(neigh => (
                  <option key={neigh} value={neigh} className="bg-dark-bg text-white">{neigh}</option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-[10px]">
                ▼
              </div>
            </div>
          )}
        </div>

        {/* Alternador Drops/Lista & Botão Todos os Filtros */}
        <div className="flex gap-2 items-center w-full sm:w-auto">
          <div className="flex flex-1 sm:flex-initial bg-black/40 border border-white/10 rounded-xl p-0.5 justify-around sm:justify-start">
            <button
              onClick={() => setViewMode('reels')}
              className={`md:hidden flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                viewMode === 'reels' 
                  ? 'bg-gold-primary text-dark-bg font-bold' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Drops</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-gold-primary text-dark-bg font-bold' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

          <button
            onClick={onOpenFilters}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold text-white transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-gold-primary" />
            <span>Filtros</span>
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
