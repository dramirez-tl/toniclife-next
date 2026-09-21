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
}

export function ProductFilters({
  categories,
  selectedCategory,
  onCategoryChange
}: ProductFiltersProps) {
  const t = useTranslations('products.filters');
  // Los filtros de precio y de beneficios eran decorativos (no filtraban nada) y se
  // retiraron; vuelven con el catálogo nuevo, ya conectados al API.
  const [expandedSections, setExpandedSections] = useState({
    categories: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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

      {/* Reset Filters */}
      <button
        onClick={() => onCategoryChange('all')}
        className="w-full py-2 text-sm text-gray-500 hover:text-[#3E667D] transition-colors"
      >
        {t('reset')}
      </button>
    </div>
  );
}
