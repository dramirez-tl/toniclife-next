'use client';

import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface Category {
  id: string;
  name: string;
  description: string;
}

interface ProductFiltersProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
}

export function ProductFilters({
  categories,
  selectedCategory,
  onCategoryChange,
  priceRange,
  onPriceRangeChange
}: ProductFiltersProps) {
  const [expandedSections, setExpandedSections] = useState({
    categories: true,
    price: true,
    benefits: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const benefits = [
    'Energía',
    'Digestión',
    'Inmunidad',
    'Piel',
    'Sueño',
    'Peso',
    'Hormonas',
    'Circulación'
  ];

  return (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <button
          onClick={() => toggleSection('categories')}
          className="w-full flex items-center justify-between text-left font-bold text-[#003B7A] mb-3"
        >
          Categorías
          <ChevronDownIcon
            className={`h-5 w-5 transition-transform ${expandedSections.categories ? 'rotate-180' : ''}`}
          />
        </button>

        {expandedSections.categories && (
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="category"
                checked={selectedCategory === 'all'}
                onChange={() => onCategoryChange('all')}
                className="w-4 h-4 text-[#7AB82E] border-gray-300 focus:ring-[#7AB82E]"
              />
              <span className="text-gray-700 group-hover:text-[#7AB82E] transition-colors">
                Todos los productos
              </span>
            </label>

            {categories.map((category) => (
              <label key={category.id} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="category"
                  checked={selectedCategory === category.id}
                  onChange={() => onCategoryChange(category.id)}
                  className="w-4 h-4 text-[#7AB82E] border-gray-300 focus:ring-[#7AB82E]"
                />
                <span className="text-gray-700 group-hover:text-[#7AB82E] transition-colors">
                  {category.name}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <hr className="border-gray-200" />

      {/* Price Range */}
      <div>
        <button
          onClick={() => toggleSection('price')}
          className="w-full flex items-center justify-between text-left font-bold text-[#003B7A] mb-3"
        >
          Precio
          <ChevronDownIcon
            className={`h-5 w-5 transition-transform ${expandedSections.price ? 'rotate-180' : ''}`}
          />
        </button>

        {expandedSections.price && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Mínimo</label>
                <input
                  type="number"
                  min={0}
                  max={priceRange[1]}
                  value={priceRange[0]}
                  onChange={(e) => onPriceRangeChange([Number(e.target.value), priceRange[1]])}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7AB82E]"
                />
              </div>
              <span className="text-gray-400 mt-4">-</span>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Máximo</label>
                <input
                  type="number"
                  min={priceRange[0]}
                  max={100}
                  value={priceRange[1]}
                  onChange={(e) => onPriceRangeChange([priceRange[0], Number(e.target.value)])}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7AB82E]"
                />
              </div>
            </div>

            {/* Price Range Slider */}
            <div className="relative pt-2">
              <input
                type="range"
                min={0}
                max={100}
                value={priceRange[1]}
                onChange={(e) => onPriceRangeChange([priceRange[0], Number(e.target.value)])}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#7AB82E]"
              />
            </div>

            {/* Quick Price Buttons */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Menos de $30', range: [0, 30] as [number, number] },
                { label: '$30 - $50', range: [30, 50] as [number, number] },
                { label: 'Más de $50', range: [50, 100] as [number, number] }
              ].map((option) => (
                <button
                  key={option.label}
                  onClick={() => onPriceRangeChange(option.range)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    priceRange[0] === option.range[0] && priceRange[1] === option.range[1]
                      ? 'bg-[#7AB82E] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-[#7AB82E]/10'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <hr className="border-gray-200" />

      {/* Benefits */}
      <div>
        <button
          onClick={() => toggleSection('benefits')}
          className="w-full flex items-center justify-between text-left font-bold text-[#003B7A] mb-3"
        >
          Beneficios
          <ChevronDownIcon
            className={`h-5 w-5 transition-transform ${expandedSections.benefits ? 'rotate-180' : ''}`}
          />
        </button>

        {expandedSections.benefits && (
          <div className="space-y-2">
            {benefits.map((benefit) => (
              <label key={benefit} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-[#7AB82E] border-gray-300 rounded focus:ring-[#7AB82E]"
                />
                <span className="text-gray-700 group-hover:text-[#7AB82E] transition-colors">
                  {benefit}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Reset Filters */}
      <button
        onClick={() => {
          onCategoryChange('all');
          onPriceRangeChange([0, 100]);
        }}
        className="w-full py-2 text-sm text-gray-500 hover:text-[#7AB82E] transition-colors"
      >
        Limpiar filtros
      </button>
    </div>
  );
}
