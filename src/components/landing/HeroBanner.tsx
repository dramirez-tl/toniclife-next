'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

/**
 * Hero a sangre completa de la propuesta 2026.
 * Imagen de estilo de vida con texto "Bienestar natural / Vida plena" y CTA a productos.
 * La foto vive como background para permitir un fallback de color si aún no se sube el asset.
 */
export function HeroBanner() {
  return (
    <section className="relative w-full overflow-hidden">
      {/* Imagen de fondo (fallback: teal de marca) */}
      <div
        className="absolute inset-0 bg-[#3E667D] bg-cover bg-center"
        style={{ backgroundImage: "url('/images/landing/hero-bienestar.jpg')" }}
      />
      {/* Velo claro hacia la derecha para legibilidad del texto oscuro */}
      <div className="absolute inset-0 bg-gradient-to-l from-white/70 via-white/15 to-transparent" />

      <div className="relative mx-auto flex min-h-[520px] max-w-7xl items-center px-4 py-20 sm:px-6 lg:min-h-[640px] lg:px-8">
        <div className="ml-auto max-w-md text-right">
          <p className="text-lg font-medium text-[#3E667D] sm:text-xl">Bienestar natural</p>
          <h1 className="mt-1 text-5xl font-bold leading-none text-[#3E667D] sm:text-6xl lg:text-7xl">
            Vida <span className="font-serif italic">plena</span>
          </h1>
          <div className="mt-8 flex justify-end">
            <Link href="/productos">
              <Button size="xl" rightIcon={<ArrowRightIcon className="h-5 w-5" />}>
                Productos
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
