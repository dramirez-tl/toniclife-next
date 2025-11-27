'use client';

import Link from 'next/link';
import { Card } from '@/components/ui';
import { productCategories } from '@/lib/mock-data';
import {
  BoltIcon,
  SparklesIcon,
  HeartIcon,
  MoonIcon,
  ShieldCheckIcon,
  ScaleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const categoryIcons: Record<string, React.ReactNode> = {
  energia: <BoltIcon className="h-8 w-8" />,
  detox: <SparklesIcon className="h-8 w-8" />,
  belleza: <SparklesIcon className="h-8 w-8" />,
  estres: <MoonIcon className="h-8 w-8" />,
  hormonal: <HeartIcon className="h-8 w-8" />,
  masculino: <ShieldCheckIcon className="h-8 w-8" />,
  inmune: <ShieldCheckIcon className="h-8 w-8" />,
  circulacion: <ArrowPathIcon className="h-8 w-8" />,
  peso: <ScaleIcon className="h-8 w-8" />
};

const categoryColors: Record<string, { bg: string; text: string; hover: string }> = {
  energia: { bg: 'bg-amber-50', text: 'text-amber-600', hover: 'hover:bg-amber-100' },
  detox: { bg: 'bg-emerald-50', text: 'text-emerald-600', hover: 'hover:bg-emerald-100' },
  belleza: { bg: 'bg-pink-50', text: 'text-pink-600', hover: 'hover:bg-pink-100' },
  estres: { bg: 'bg-indigo-50', text: 'text-indigo-600', hover: 'hover:bg-indigo-100' },
  hormonal: { bg: 'bg-rose-50', text: 'text-rose-600', hover: 'hover:bg-rose-100' },
  masculino: { bg: 'bg-blue-50', text: 'text-blue-600', hover: 'hover:bg-blue-100' },
  inmune: { bg: 'bg-green-50', text: 'text-green-600', hover: 'hover:bg-green-100' },
  circulacion: { bg: 'bg-red-50', text: 'text-red-600', hover: 'hover:bg-red-100' },
  peso: { bg: 'bg-purple-50', text: 'text-purple-600', hover: 'hover:bg-purple-100' }
};

export function CategoriesSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#003B7A]">
            Explora por Categoría
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Encuentra los productos perfectos según tu objetivo de bienestar.
            Cada categoría está diseñada para atender necesidades específicas.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
          {productCategories.map((category) => {
            const colors = categoryColors[category.id] || categoryColors.energia;
            return (
              <Link
                key={category.id}
                href={`/productos/${category.id}`}
                className="group"
              >
                <Card
                  hover
                  className={`text-center ${colors.bg} ${colors.hover} border-0 transition-all duration-300`}
                  padding="md"
                >
                  {/* Icon */}
                  <div className={`w-16 h-16 mx-auto rounded-2xl ${colors.bg} flex items-center justify-center ${colors.text} group-hover:scale-110 transition-transform duration-300`}>
                    {categoryIcons[category.id]}
                  </div>

                  {/* Name */}
                  <h3 className={`mt-4 font-bold ${colors.text}`}>
                    {category.name}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-gray-500 mt-1">
                    {category.description}
                  </p>

                  {/* Arrow indicator */}
                  <div className={`mt-3 ${colors.text} opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <svg className="h-5 w-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Feature Highlight */}
        <div className="mt-16 bg-white rounded-3xl p-8 lg:p-12 shadow-lg">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl lg:text-3xl font-bold text-[#003B7A]">
                ¿No sabes por dónde empezar?
              </h3>
              <p className="mt-4 text-gray-600">
                Nuestro Health Quiz te ayudará a identificar qué productos son ideales
                para ti basándose en tus necesidades específicas de salud y bienestar.
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <svg className="h-5 w-5 text-[#7AB82E]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">10 preguntas simples</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <svg className="h-5 w-5 text-[#7AB82E]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">Resultados instantáneos</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <svg className="h-5 w-5 text-[#7AB82E]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">Combos con descuento</span>
                </div>
              </div>
              <div className="mt-8">
                <Link
                  href="/quiz"
                  className="inline-flex items-center gap-2 bg-[#7AB82E] hover:bg-[#6aa025] text-white font-semibold px-6 py-3 rounded-full transition-colors"
                >
                  Hacer el Health Quiz
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Visual */}
            <div className="relative">
              <div className="bg-gradient-to-br from-[#003B7A]/5 to-[#7AB82E]/10 rounded-2xl p-8">
                <div className="grid grid-cols-3 gap-3">
                  {productCategories.slice(0, 6).map((cat) => {
                    const colors = categoryColors[cat.id] || categoryColors.energia;
                    return (
                      <div
                        key={cat.id}
                        className={`aspect-square ${colors.bg} rounded-xl flex items-center justify-center ${colors.text}`}
                      >
                        {categoryIcons[cat.id]}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
