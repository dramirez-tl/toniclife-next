'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

/**
 * Hero de la propuesta 2026: video de marca reproducido en modo "background" de
 * Vimeo (autoplay + loop infinito + silenciado + sin controles). Se muestra el
 * video VERTICAL en móvil y el HORIZONTAL en escritorio. Los videos no tienen
 * audio, así que el autoplay silenciado funciona en todos los navegadores.
 */

// background=1 → Vimeo reproduce en bucle, en silencio, sin controles ni UI.
const VIMEO_PARAMS = 'background=1&autoplay=1&loop=1&muted=1&autopause=0';
const MOBILE_SRC = `https://player.vimeo.com/video/1205005210?${VIMEO_PARAMS}`; // vertical 9:16
const DESKTOP_SRC = `https://player.vimeo.com/video/1205005600?${VIMEO_PARAMS}`; // horizontal 4:3

export function HeroBanner() {
  return (
    <section className="w-full bg-white">
      <div className="mx-auto max-w-6xl px-0 py-0 sm:px-6 sm:py-8 lg:px-8">
        {/* Móvil: video vertical (9:16) a sangre completa */}
        <div className="md:hidden">
          <div className="relative" style={{ paddingTop: '177.78%' }}>
            <iframe
              src={MOBILE_SRC}
              title="Tonic Life"
              className="absolute inset-0 h-full w-full"
              frameBorder={0}
              allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>

        {/* Escritorio: video horizontal (4:3) centrado */}
        <div className="mx-auto hidden max-w-4xl md:block">
          <div
            className="relative overflow-hidden rounded-2xl shadow-sm"
            style={{ paddingTop: '75%' }}
          >
            <iframe
              src={DESKTOP_SRC}
              title="Tonic Life"
              className="absolute inset-0 h-full w-full"
              frameBorder={0}
              allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>

        {/* CTA a productos (se conserva la entrada a la tienda del hero anterior) */}
        <div className="flex justify-center px-4 py-6 sm:px-0">
          <Link href="/productos">
            <Button size="xl">
              Productos
              <ArrowRightIcon className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
