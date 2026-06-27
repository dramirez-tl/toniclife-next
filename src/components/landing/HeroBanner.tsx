'use client';

/**
 * Hero 2026: video de marca a SANGRE COMPLETA como fondo (estilo partner.co).
 * Vimeo en modo "background" (autoplay + loop + silenciado + sin controles) llena
 * el contenedor recortando lo necesario (cover). Video VERTICAL en móvil y
 * HORIZONTAL en escritorio. Sin audio, así el autoplay funciona en todos lados.
 *
 * Mientras el video carga se muestra el PÓSTER (primer frame del propio video),
 * no un fondo plano, para que la transición sea fluida y nunca se vea en blanco.
 */

// background=1 → loop, silenciado, sin controles y COVER dentro del iframe.
const VIMEO_PARAMS = 'background=1&autoplay=1&loop=1&muted=1&autopause=0';
const MOBILE_SRC = `https://player.vimeo.com/video/1205005210?${VIMEO_PARAMS}`; // vertical 9:16
const DESKTOP_SRC = `https://player.vimeo.com/video/1205005600?${VIMEO_PARAMS}`; // horizontal 4:3

const MOBILE_POSTER = '/images/landing/hero-mobile-poster.jpg';
const DESKTOP_POSTER = '/images/landing/hero-desktop-poster.jpg';

export function HeroBanner() {
  return (
    <section className="relative w-full overflow-hidden">
      {/* Banda del hero (alta, a todo el ancho). El video la cubre por completo. */}
      <div className="relative h-[78vh] min-h-[460px] w-full sm:h-[82vh] lg:h-[88vh]">
        {/* Móvil: póster de fondo + video vertical encima */}
        <div
          className="absolute inset-0 bg-cover bg-center md:hidden"
          style={{ backgroundImage: `url('${MOBILE_POSTER}')` }}
        >
          <iframe
            src={MOBILE_SRC}
            title="Tonic Life"
            className="pointer-events-none absolute inset-0 h-full w-full"
            frameBorder={0}
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>

        {/* Escritorio: póster de fondo + video horizontal encima */}
        <div
          className="absolute inset-0 hidden bg-cover bg-center md:block"
          style={{ backgroundImage: `url('${DESKTOP_POSTER}')` }}
        >
          <iframe
            src={DESKTOP_SRC}
            title="Tonic Life"
            className="pointer-events-none absolute inset-0 h-full w-full"
            frameBorder={0}
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    </section>
  );
}
