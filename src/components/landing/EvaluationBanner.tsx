'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

/**
 * Banda CTA a sangre completa "¿No sabes por dónde empezar?" (propuesta 2026).
 * Foto de naturaleza/persona con degradado oscuro a la izquierda y CTA al quiz.
 */
export function EvaluationBanner() {
  return (
    <section className="relative w-full overflow-hidden">
      {/* Imagen de fondo (fallback: teal oscuro) */}
      <div
        className="absolute inset-0 bg-[#2f5165] bg-cover bg-center"
        style={{ backgroundImage: "url('/images/landing/evaluacion-bg.webp')" }}
      />
      {/* Degradado oscuro para legibilidad del texto a la izquierda */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#1e3a4a]/90 via-[#1e3a4a]/55 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-xl text-white">
          <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
            ¿No sabes por dónde empezar?
          </h2>
          <p className="mt-4 text-base text-white/85 sm:text-lg">
            Nuestra evaluación de salud te ayudará a identificar qué productos son ideales
            para ti basándose en tus necesidades específicas de salud y bienestar.
          </p>
          <div className="mt-8">
            <Link href="/quiz">
              <Button size="lg">
                Iniciar mi Evaluación
                <ArrowRightIcon className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
