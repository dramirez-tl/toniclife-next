'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface Category {
  id: string;
  name: string;
  description?: string;
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
  const t = useTranslations('products.filters');
  const tb = useTranslations('products.benefits');
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

  const benefitKeys = [
    'energy',
    'digestion',
    'immunity',
    'skin',
    'sleep',
    'weight',
    'hormones',
    'circulation',
  ] as const;

  return (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <button
          onClick={() => toggleSection('categories')}
          className="w-full flex items-center justify-between text-left font-bold text-[#3E667D] mb-3"
        >
          {t('categories')}
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
                className="w-4 h-4 text-[#3E667D] border-gray-300 focus:ring-[#a7c1e2]"
              />
              <span className="text-gray-700 group-hover:text-[#3E667D] transition-colors">
                {t('allProducts')}
              </span>
            </label>

            {categories.map((category) => (
              <label key={category.id} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="category"
                  checked={selectedCategory === category.id}
                  onChange={() => onCategoryChange(category.id)}
                  className="w-4 h-4 text-[#3E667D] border-gray-300 focus:ring-[#a7c1e2]"
                />
                <span className="text-gray-700 group-hover:text-[#3E667D] transition-colors">
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
          className="w-full flex items-center justify-between text-left font-bold text-[#3E667D] mb-3"
        >
          {t('price')}
          <ChevronDownIcon
            className={`h-5 w-5 transition-transform ${expandedSections.price ? 'rotate-180' : ''}`}
          />
        </button>

        {expandedSections.price && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">{t('min')}</label>
                <input
                  type="number"
                  min={0}
                  max={priceRange[1]}
                  value={priceRange[0]}
                  onChange={(e) => onPriceRangeChange([Number(e.target.value), priceRange[1]])}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a7c1e2]"
                />
              </div>
              <span className="text-gray-400 mt-4">-</span>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">{t('max')}</label>
                <input
                  type="number"
                  min={priceRange[0]}
                  max={100}
                  value={priceRange[1]}
                  onChange={(e) => onPriceRangeChange([priceRange[0], Number(e.target.value)])}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#a7c1e2]"
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
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#C8DDF2]"
              />
            </div>

            {/* Quick Price Buttons */}
            <div className="flex flex-wrap gap-2">
              {[
                { label: t('priceUnder30'), range: [0, 30] as [number, number] },
                { label: t('price30to50'), range: [30, 50] as [number, number] },
                { label: t('priceOver50'), range: [50, 100] as [number, number] }
              ].map((option) => (
                <button
                  key={option.label}
                  onClick={() => onPriceRangeChange(option.range)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    priceRange[0] === option.range[0] && priceRange[1] === option.range[1]
                      ? 'bg-[#3E667D] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-[#C8DDF2]/10'
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
          className="w-full flex items-center justify-between text-left font-bold text-[#3E667D] mb-3"
        >
          {t('benefits')}
          <ChevronDownIcon
            className={`h-5 w-5 transition-transform ${expandedSections.benefits ? 'rotate-180' : ''}`}
          />
        </button>

        {expandedSections.benefits && (
          <div className="space-y-2">
            {benefitKeys.map((benefit) => (
              <label key={benefit} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-[#3E667D] border-gray-300 rounded focus:ring-[#a7c1e2]"
                />
                <span className="text-gray-700 group-hover:text-[#3E667D] transition-colors">
                  {tb(benefit)}
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
        className="w-full py-2 text-sm text-gray-500 hover:text-[#3E667D] transition-colors"
      >
        {t('reset')}
      </button>
    </div>
  );
}
