'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

/**
 * Hero 2026: video de marca a SANGRE COMPLETA como fondo (estilo partner.co).
 * Vimeo en modo "background" (autoplay + loop + silenciado + sin controles) llena
 * el contenedor recortando lo necesario (cover). Video VERTICAL en móvil y
 * HORIZONTAL en escritorio. Sin audio, así el autoplay funciona en todos lados.
 */

// background=1 → loop, silenciado, sin controles y COVER dentro del iframe.
const VIMEO_PARAMS = 'background=1&autoplay=1&loop=1&muted=1&autopause=0';
const MOBILE_SRC = `https://player.vimeo.com/video/1205005210?${VIMEO_PARAMS}`; // vertical 9:16
const DESKTOP_SRC = `https://player.vimeo.com/video/1205005600?${VIMEO_PARAMS}`; // horizontal 4:3

export function HeroBanner() {
  return (
    <section className="relative w-full overflow-hidden bg-[#3E667D]">
      {/* Banda del hero (alta, a todo el ancho). El video la cubre por completo. */}
      <div className="relative h-[78vh] min-h-[460px] w-full sm:h-[82vh] lg:h-[88vh]">
        {/* Móvil: video vertical */}
        <iframe
          src={MOBILE_SRC}
          title="Tonic Life"
          className="pointer-events-none absolute inset-0 h-full w-full md:hidden"
          frameBorder={0}
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
        />
        {/* Escritorio: video horizontal */}
        <iframe
          src={DESKTOP_SRC}
          title="Tonic Life"
          className="pointer-events-none absolute inset-0 hidden h-full w-full md:block"
          frameBorder={0}
          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
        />

        {/* Velo inferior para legibilidad del CTA sobre el video */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/45 to-transparent" />

        {/* CTA a productos sobre el video */}
        <div className="absolute inset-x-0 bottom-8 flex justify-center sm:bottom-12">
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
