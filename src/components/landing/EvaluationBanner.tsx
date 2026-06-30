'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

/**
 * Banda CTA a sangre completa "¿No sabes por dónde empezar?" (propuesta 2026).
 * Foto de naturaleza/persona y CTA al quiz. SIN degradado (se quitó a petición);
 * el texto usa una sombra sutil para legibilidad sobre la foto.
 */
export function EvaluationBanner() {
  const t = useTranslations('home.evaluation');
  return (
    <section className="relative w-full overflow-hidden">
      {/* Imagen de fondo (fallback: teal oscuro) */}
      <div
        className="absolute inset-0 bg-[#2f5165] bg-cover bg-center"
        style={{ backgroundImage: "url('/images/landing/evaluacion-bg.webp')" }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-xl text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.45)]">
          <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-base text-white/90 sm:text-lg">
            {t('subtitle')}
          </p>
          <div className="mt-8">
            <Link href="/quiz">
              <Button size="lg">
                {t('cta')}
                <ArrowRightIcon className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
