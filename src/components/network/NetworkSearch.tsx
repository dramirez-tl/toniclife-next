// components/network/NetworkSearch.tsx - Barra de búsqueda de distribuidores
'use client';

import { useState, useRef, useEffect } from 'react';
import { useNetworkSearch } from '@/hooks/useNetwork';
import { RANK_COLORS, RANK_LABELS } from '@/constants/ranks';
import { RankType, NetworkSearchResult } from '@/types/network';
import { MagnifyingGlassIcon, XMarkIcon, UserIcon } from '@heroicons/react/24/outline';
import { TrophyIcon } from '@heroicons/react/24/solid';

interface NetworkSearchProps {
  onSelectResult?: (result: NetworkSearchResult) => void;
  placeholder?: string;
  className?: string;
}

export function NetworkSearch({
  onSelectResult,
  placeholder = 'Buscar por nombre o código...',
  className = '',
}: NetworkSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: results, isLoading } = useNetworkSearch(query);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result: NetworkSearchResult) => {
    onSelectResult?.(result);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      {/* Input de búsqueda */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
          >
            <XMarkIcon className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {isOpen && query.length >= 2 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
        >
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#3E667D] mx-auto mb-2"></div>
              Buscando...
            </div>
          ) : results && results.length > 0 ? (
            <ul className="py-2">
              {results.map((result) => {
                const rank = result.rank as RankType;
                const rankColor = RANK_COLORS[rank] || RANK_COLORS.distribuidor;
                const rankLabel = RANK_LABELS[rank] || 'Distribuidor';

                return (
                  <li key={result.id}>
                    <button
                      onClick={() => handleSelect(result)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0"
                        style={{ backgroundColor: rankColor }}
                      >
                        {result.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{result.name}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500">{result.code}</span>
                          <span className="flex items-center gap-0.5 text-gray-600">
                            <TrophyIcon className="h-3 w-3" style={{ color: rankColor }} />
                            {rankLabel}
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-4 text-center text-gray-500">
              <UserIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              No se encontraron resultados para &quot;{query}&quot;
            </div>
          )}
        </div>
      )}

      {/* Indicador de caracteres mínimos */}
      {isOpen && query.length > 0 && query.length < 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-center text-sm text-gray-500">
          Escribe al menos 2 caracteres para buscar
        </div>
      )}
    </div>
  );
}
