'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { PlayIcon, PauseIcon } from '@heroicons/react/24/solid';

/**
 * Hero 2026: video de marca a SANGRE COMPLETA como fondo (estilo partner.co).
 * Vimeo en modo "background" (autoplay + loop + silenciado + sin controles).
 *
 * COVER real: el iframe toma el aspect-ratio del video y se escala para llenar
 * todo el ancho (sobrante recortado con overflow-hidden). Mientras carga se ve el
 * PÓSTER (frame del propio video). Botón sutil de pausa/reproducir (abajo a la
 * derecha) que controla el video vía la Player API de Vimeo.
 */

// background=1 → loop, silenciado, sin controles.
const VIMEO_PARAMS = 'background=1&autoplay=1&loop=1&muted=1&autopause=0';
const MOBILE_SRC = `https://player.vimeo.com/video/1205005210?${VIMEO_PARAMS}`; // vertical 9:16
const DESKTOP_SRC = `https://player.vimeo.com/video/1205005600?${VIMEO_PARAMS}`; // horizontal 4:3

const MOBILE_POSTER = '/images/landing/hero-mobile-poster.jpg';
const DESKTOP_POSTER = '/images/landing/hero-desktop-poster.jpg';

const VIMEO_API = 'https://player.vimeo.com/api/player.js';

interface VimeoPlayer {
  play: () => Promise<void>;
  pause: () => Promise<void>;
}
declare global {
  interface Window {
    Vimeo?: { Player: new (el: HTMLIFrameElement) => VimeoPlayer };
  }
}

/** Carga (una sola vez) el script de la Player API de Vimeo. */
function loadVimeoApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    if (window.Vimeo?.Player) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${VIMEO_API}"]`,
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('vimeo api')));
      return;
    }
    const s = document.createElement('script');
    s.src = VIMEO_API;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('vimeo api'));
    document.head.appendChild(s);
  });
}

// Centrado + escalado para cubrir: ancho llena el contenedor (100% = 100vw a
// sangre completa) y el alto se calcula con el aspect-ratio del video.
const coverStyle = (heightVw: string): CSSProperties => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '100%',
  height: heightVw,
});

export function HeroBanner() {
  const t = useTranslations('home');
  const mobileRef = useRef<HTMLIFrameElement>(null);
  const desktopRef = useRef<HTMLIFrameElement>(null);
  const playersRef = useRef<VimeoPlayer[]>([]);
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadVimeoApi()
      .then(() => {
        if (cancelled || !window.Vimeo) return;
        const players: VimeoPlayer[] = [];
        [mobileRef.current, desktopRef.current].forEach((el) => {
          if (!el) return;
          try {
            players.push(new window.Vimeo!.Player(el));
          } catch {
            /* iframe aún no listo: se ignora */
          }
        });
        playersRef.current = players;
        setReady(true);
      })
      .catch(() => {
        /* sin API no mostramos el botón; el video sigue en autoplay */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = () => {
    const next = !paused;
    setPaused(next);
    playersRef.current.forEach((p) => {
      void (next ? p.pause() : p.play()).catch(() => {});
    });
  };

  return (
    <section className="relative w-full overflow-hidden">
      <div className="relative h-[78vh] min-h-[460px] w-full overflow-hidden sm:h-[82vh] lg:h-[88vh]">
        {/* Móvil: póster de fondo + video vertical (cover) */}
        <div
          className="absolute inset-0 overflow-hidden bg-cover bg-center md:hidden"
          style={{ backgroundImage: `url('${MOBILE_POSTER}')` }}
        >
          <iframe
            ref={mobileRef}
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
            ref={desktopRef}
            src={DESKTOP_SRC}
            title="Tonic Life"
            className="pointer-events-none"
            style={coverStyle('75vw')}
            frameBorder={0}
            allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>

        {/* Botón sutil de pausa / reproducir */}
        {ready && (
          <button
            type="button"
            onClick={toggle}
            aria-label={paused ? t('playVideo') : t('pauseVideo')}
            className="absolute bottom-5 right-5 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-black/20 text-white backdrop-blur-sm transition hover:bg-black/40 sm:bottom-6 sm:right-6"
          >
            {paused ? (
              <PlayIcon className="h-5 w-5" />
            ) : (
              <PauseIcon className="h-5 w-5" />
            )}
          </button>
        )}
      </div>
    </section>
  );
}
