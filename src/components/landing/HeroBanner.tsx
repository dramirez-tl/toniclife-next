'use client';

import type { CSSProperties } from 'react';

/**
 * Hero 2026: video de marca a SANGRE COMPLETA como fondo (estilo partner.co).
 * Vimeo en modo "background" (autoplay + loop + silenciado + sin controles).
 *
 * COVER real: el iframe se dimensiona con el MISMO aspect-ratio del video y se
 * escala para llenar todo el ancho del hero (el sobrante se recorta con
 * overflow-hidden). Así el video abarca lo mismo que la imagen de fondo, sin
 * franjas a los lados. Video VERTICAL en móvil y HORIZONTAL en escritorio.
 *
 * Mientras carga, se ve el PÓSTER (frame del propio video), nunca un fondo plano.
 */

// background=1 → loop, silenciado, sin controles.
const VIMEO_PARAMS = 'background=1&autoplay=1&loop=1&muted=1&autopause=0';
const MOBILE_SRC = `https://player.vimeo.com/video/1205005210?${VIMEO_PARAMS}`; // vertical 9:16
const DESKTOP_SRC = `https://player.vimeo.com/video/1205005600?${VIMEO_PARAMS}`; // horizontal 4:3

const MOBILE_POSTER = '/images/landing/hero-mobile-poster.jpg';
const DESKTOP_POSTER = '/images/landing/hero-desktop-poster.jpg';

// Centrado + escalado para cubrir. El ancho llena el contenedor (100% = 100vw a
// sangre completa) y el alto se calcula con el aspect-ratio del video:
//   horizontal 4:3 → alto = ancho * 3/4 = 75vw
//   vertical   9:16 → alto = ancho * 16/9 = 177.78vw
const coverStyle = (heightVw: string): CSSProperties => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '100%',
  height: heightVw,
});

export function HeroBanner() {
  return (
    <section className="relative w-full overflow-hidden">
      <div className="relative h-[78vh] min-h-[460px] w-full overflow-hidden sm:h-[82vh] lg:h-[88vh]">
        {/* Móvil: póster de fondo + video vertical (cover) */}
        <div
          className="absolute inset-0 overflow-hidden bg-cover bg-center md:hidden"
          style={{ backgroundImage: `url('${MOBILE_POSTER}')` }}
        >
          <iframe
            src={MOBILE_SRC}
            title="Tonic Life"
            className="pointer-events-none"
            style={coverStyle('177.78vw')}
            frameBorder={0}
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>

        {/* Escritorio: póster de fondo + video horizontal (cover) */}
        <div
          className="absolute inset-0 hidden overflow-hidden bg-cover bg-center md:block"
          style={{ backgroundImage: `url('${DESKTOP_POSTER}')` }}
        >
          <iframe
            src={DESKTOP_SRC}
            title="Tonic Life"
            className="pointer-events-none"
            style={coverStyle('75vw')}
            frameBorder={0}
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    </section>
  );
}
