import React from 'react';
import { Grid, Map, MapPin, SlidersHorizontal, Play } from 'lucide-react';

interface FilterBarProps {
  categoryFilter: string;
  setCategoryFilter: (v: string) => void;
  spaceFilter: boolean;
  setSpaceFilter: (v: boolean) => void;
  viewMode: 'reels' | 'grid' | 'map';
  setViewMode: (v: 'reels' | 'grid' | 'map') => void;
  cityFilter: string;
  setCityFilter: (v: string) => void;
  neighborhoodFilter: string;
  setNeighborhoodFilter: (v: string) => void;
  availableLocations: Record<string, string[]>;
  getActiveFilterCount: () => number;
  onOpenFilters: () => void;
}

export default function FilterBar({
  categoryFilter,
  setCategoryFilter,
  spaceFilter,
  setSpaceFilter,
  viewMode,
  setViewMode,
  cityFilter,
  setCityFilter,
  neighborhoodFilter,
  setNeighborhoodFilter,
  availableLocations,
  getActiveFilterCount,
  onOpenFilters
}: FilterBarProps) {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 relative z-10 space-y-3">
      {/* Abas de Categoria (Flex-wrap para evitar corte em qualquer tela) */}
      <div className="w-full">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <button
            onClick={() => { setCategoryFilter(''); setSpaceFilter(false); }}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold tracking-wider uppercase transition-all whitespace-nowrap border ${
              categoryFilter === '' && !spaceFilter
                ? 'bg-gradient-to-r from-gold-primary to-gold-dark border-gold-primary text-dark-bg shadow-md shadow-gold-primary/10'
                : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => { setCategoryFilter('escort'); setSpaceFilter(false); }}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold tracking-wider uppercase transition-all whitespace-nowrap border ${
              categoryFilter === 'escort' && !spaceFilter
                ? 'bg-gradient-to-r from-wine-primary to-wine-dark border-wine-primary text-white shadow-md shadow-wine-primary/10'
                : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            🔥 Acompanhantes
          </button>
          <button
            onClick={() => { setCategoryFilter('massage'); setSpaceFilter(false); }}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold tracking-wider uppercase transition-all whitespace-nowrap border ${
              categoryFilter === 'massage' && !spaceFilter
                ? 'bg-gradient-to-r from-gold-primary to-gold-dark border-gold-primary text-dark-bg shadow-md shadow-gold-primary/10'
                : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            🧘 Massagens
          </button>
          <button
            onClick={() => { setSpaceFilter(true); }}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold tracking-wider uppercase transition-all whitespace-nowrap border ${
              spaceFilter
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-800 border-emerald-600 text-white shadow-md shadow-emerald-600/10'
                : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            🏠 Com Espaço
          </button>
        </div>
      </div>

      {/* Controles: Pesquisa, Seleção de Modo e Filtros Avançados */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center w-full">
        {/* Seletores de Localização */}
        <div className="flex flex-col sm:flex-row gap-2 flex-1 min-w-0">
          {/* Seletor de Cidade */}
          <div className="relative flex-1 min-w-0">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <select 
              value={cityFilter}
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
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Seletor de Bairro */}
          {cityFilter && availableLocations[cityFilter] && availableLocations[cityFilter].length > 0 && (
            <div className="relative flex-1 min-w-0 animate-fadeIn">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              <select 
                value={neighborhoodFilter}
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
          {/* Selector Drops vs Grid vs Map */}
          <div className="flex flex-1 sm:flex-initial bg-black/40 border border-white/5 rounded-xl p-1 justify-around sm:justify-start">
            <button
              onClick={() => setViewMode('reels')}
              className={`md:hidden flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                viewMode === 'reels' 
                  ? 'bg-gold-primary text-dark-bg font-bold shadow-sm' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Drops</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-gold-primary text-dark-bg font-bold shadow-sm' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex-1 sm:flex-initial px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                viewMode === 'map' 
                  ? 'bg-gold-primary text-dark-bg font-bold shadow-sm' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mapa</span>
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
