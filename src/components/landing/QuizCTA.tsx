'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import {
  ArrowRightIcon,
  ClipboardDocumentListIcon,
  SparklesIcon,
  ShoppingBagIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const steps = [
  {
    icon: <ClipboardDocumentListIcon className="h-8 w-8" />,
    title: 'Responde el Quiz',
    description: 'Contesta 10 preguntas simples sobre tu salud y bienestar'
  },
  {
    icon: <SparklesIcon className="h-8 w-8" />,
    title: 'Obtén tu Fórmula',
    description: 'Descubre qué productos son ideales para tus necesidades'
  },
  {
    icon: <ShoppingBagIcon className="h-8 w-8" />,
    title: 'Recibe tu Kit',
    description: 'Compra tu combo personalizado con descuento especial'
  }
];

export function QuizCTA() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#003B7A] via-[#003B7A] to-[#002d5c]">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#7AB82E]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#7AB82E]/10 rounded-full blur-3xl" />

        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="quiz-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#quiz-pattern)" />
          </svg>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-[#7AB82E]/20 text-[#7AB82E] px-4 py-2 rounded-full text-sm font-medium mb-6">
              <SparklesIcon className="h-4 w-4" />
              Quiz Personalizado
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
              Encuentra tu{' '}
              <span className="text-[#7AB82E] font-serif italic">fórmula ideal</span>{' '}
              de bienestar
            </h2>

            <p className="mt-6 text-lg text-white/80">
              Tu bienestar empieza con conocerte. Responde unas simples preguntas y
              descubre qué fórmula natural es ideal para ti.
            </p>

            {/* Benefits List */}
            <ul className="mt-8 space-y-3">
              {[
                'Recomendaciones 100% personalizadas',
                'Basado en tus metas de salud',
                'Descuentos exclusivos en combos',
                'Solo toma 2 minutos'
              ].map((benefit, index) => (
                <li key={index} className="flex items-center gap-3 text-white/90">
                  <CheckCircleIcon className="h-5 w-5 text-[#7AB82E] flex-shrink-0" />
                  {benefit}
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <Link href="/quiz">
                <Button
                  size="xl"
                  className="bg-[#7AB82E] hover:bg-[#6aa025] text-white shadow-lg shadow-[#7AB82E]/30"
                  rightIcon={<ArrowRightIcon className="h-5 w-5" />}
                >
                  Comenzar Health Quiz
                </Button>
              </Link>
              <p className="mt-4 text-sm text-white/60">
                Gratis • Sin registro • Resultados instantáneos
              </p>
            </div>
          </div>

          {/* Steps Visual */}
          <div className="relative">
            {/* Connecting Line - Behind the cards */}
            <div className="absolute left-[28px] top-[70px] bottom-[70px] w-[2px] bg-gradient-to-b from-[#7AB82E] via-[#7AB82E]/50 to-[#7AB82E] -z-10" />

            {/* Steps Cards */}
            <div className="space-y-4 relative">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="group bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/15 transition-all duration-300 border border-white/10"
                >
                  <div className="flex items-start gap-4">
                    {/* Step Number */}
                    <div className="flex-shrink-0 relative z-10">
                      <div className="w-14 h-14 bg-[#7AB82E] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#7AB82E]/30 group-hover:scale-110 transition-transform">
                        {step.icon}
                      </div>
                    </div>

                    {/* Step Content */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[#7AB82E] text-sm font-medium">
                          Paso {index + 1}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-white">
                        {step.title}
                      </h3>
                      <p className="text-white/70 mt-1">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Floating Stats */}
            <div className="absolute -top-8 -right-8 bg-white rounded-2xl shadow-xl px-6 py-5 hidden lg:block">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#7AB82E]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-bold text-[#7AB82E]">98%</span>
                </div>
                <div>
                  <p className="font-semibold text-[#003B7A]">Satisfacción</p>
                  <p className="text-xs text-gray-500">Con sus recomendaciones</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
