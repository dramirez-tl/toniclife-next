'use client';

// Galería del detalle. UN solo carrusel `scroll-snap` (móvil: a todo el ancho con
// índice "2/5"; escritorio: miniaturas verticales a la izquierda). La primera
// imagen es el LCP (`priority`); el resto carga diferido. Teclado: ← → en el
// carrusel y en la ampliación; Esc cierra. Zoom = CSS en un Dialog (sin librerías).

import { useCallback, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassPlusIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { StorefrontProductImage } from '@/types/storefront';
import { ProductImage } from './ProductImage';

const MAIN_SIZES = '(min-width:1024px) 50vw, 100vw';
const NAV_BUTTON =
  'flex size-11 cursor-pointer items-center justify-center rounded-full text-[#2f5165] hover:bg-gray-100 disabled:invisible focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]';

interface ProductGalleryProps {
  images: StorefrontProductImage[];
  /** Nombre ya en formato título: alt de respaldo y monograma. */
  name: string;
  className?: string;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function ProductGallery({ images, name, className }: ProductGalleryProps) {
  const t = useTranslations('storefront.product.gallery');
  const trackRef = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');

  // Sin imágenes: una sola "lámina" con el monograma de marca.
  const slides: StorefrontProductImage[] = images.length > 0 ? images : [{ url: '', alt: null, isPrimary: true }];
  const total = slides.length;
  const current = Math.min(index, total - 1);
  const altFor = (image: StorefrontProductImage, position: number) =>
    image.alt || (total > 1 ? t('imageAlt', { name, n: position + 1, total }) : name);

  const scrollTo = useCallback(
    (next: number) => {
      const clamped = Math.min(total - 1, Math.max(0, next));
      setIndex(clamped);
      const track = trackRef.current;
      if (track) {
        track.scrollTo({ left: clamped * track.clientWidth, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      }
    },
    [total],
  );

  const onScroll = () => {
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const track = trackRef.current;
      if (!track || track.clientWidth === 0) return;
      setIndex(Math.round(track.scrollLeft / track.clientWidth));
    });
  };

  const onTrackKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollTo(current + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollTo(current - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      scrollTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      scrollTo(total - 1);
    }
  };

  const move = (delta: number) => {
    setZoomed(false);
    scrollTo((current + delta + total) % total);
  };

  const onZoomMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!zoomed) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
  };

  const canZoom = images.length > 0;

  return (
    <div className={cn('flex flex-col gap-3 lg:flex-row-reverse lg:items-start lg:gap-4', className)}>
      <div className="relative min-w-0 flex-1">
        <div
          ref={trackRef}
          onScroll={onScroll}
          onKeyDown={onTrackKey}
          tabIndex={total > 1 ? 0 : -1}
          role="group"
          aria-roledescription={t('carousel')}
          aria-label={t('label', { name })}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-none bg-gradient-to-br from-gray-50 to-white [-ms-overflow-style:none] [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D] lg:rounded-2xl [&::-webkit-scrollbar]:hidden"
        >
          {slides.map((image, position) => (
            <div
              key={image.url || 'placeholder'}
              role="group"
              aria-roledescription={t('slide')}
              aria-label={t('position', { n: position + 1, total })}
              className="relative aspect-square w-full shrink-0 snap-center"
            >
              <ProductImage
                src={image.url}
                alt={altFor(image, position)}
                name={name}
                sizes={MAIN_SIZES}
                priority={position === 0}
                className="p-4 sm:p-8"
                monogramClassName="text-6xl sm:text-7xl"
              />
            </div>
          ))}
        </div>

        {canZoom && (
          <button
            type="button"
            onClick={() => {
              setZoomed(false);
              setLightbox(true);
            }}
            aria-label={t('zoom')}
            className="absolute bottom-3 right-3 flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/95 text-[#2f5165] shadow-md hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
          >
            <MagnifyingGlassPlusIcon aria-hidden="true" className="size-5" />
          </button>
        )}

        {total > 1 && (
          <span
            className="absolute bottom-3 left-3 rounded-full bg-gray-900/75 px-2.5 py-1 text-xs font-semibold tabular-nums text-white lg:hidden"
            aria-hidden="true"
          >
            {current + 1}/{total}
          </span>
        )}
      </div>

      {total > 1 && (
        <ul className="hidden shrink-0 flex-col gap-2 lg:flex" aria-label={t('thumbnails')}>
          {slides.map((image, position) => (
            <li key={image.url}>
              <button
                type="button"
                onClick={() => scrollTo(position)}
                aria-label={t('viewImage', { n: position + 1, total })}
                aria-current={position === current ? 'true' : undefined}
                className={cn(
                  'relative block size-16 cursor-pointer overflow-hidden rounded-lg border-2 bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D] xl:size-20',
                  position === current ? 'border-[#3E667D]' : 'border-transparent hover:border-gray-300',
                )}
              >
                <ProductImage src={image.url} alt="" name={name} sizes="80px" className="p-1" monogramClassName="text-sm" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={lightbox}
        onOpenChange={(open) => {
          setLightbox(open);
          if (!open) setZoomed(false);
        }}
      >
        <DialogContent
          className="w-[96vw] max-w-5xl gap-0 overflow-hidden p-0 sm:max-w-5xl"
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') move(1);
            if (event.key === 'ArrowLeft') move(-1);
          }}
        >
          <DialogTitle className="sr-only">{t('lightboxTitle', { name })}</DialogTitle>
          <DialogDescription className="sr-only">{t('lightboxHelp')}</DialogDescription>
          <div
            className={cn('relative h-[80dvh] w-full overflow-hidden bg-white', zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in')}
            onClick={() => setZoomed((value) => !value)}
            onMouseMove={onZoomMove}
          >
            <div
              className="absolute inset-0 transition-transform duration-200 motion-reduce:transition-none"
              style={{ transform: zoomed ? 'scale(2.2)' : 'scale(1)', transformOrigin: origin }}
            >
              <ProductImage
                src={slides[current].url}
                alt={altFor(slides[current], current)}
                name={name}
                sizes="96vw"
                className="p-4"
                draggable={false}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-3 py-2">
            <button
              type="button"
              onClick={() => move(-1)}
              disabled={total < 2}
              aria-label={t('previous')}
              className={NAV_BUTTON}
            >
              <ChevronLeftIcon aria-hidden="true" className="size-6" />
            </button>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium tabular-nums text-gray-800" aria-live="polite">
                {t('position', { n: current + 1, total })}
              </span>
              <button
                type="button"
                onClick={() => setZoomed((value) => !value)}
                aria-pressed={zoomed}
                className="min-h-11 cursor-pointer rounded-full border border-gray-300 px-4 text-sm font-medium text-[#2f5165] hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
              >
                {zoomed ? t('zoomOut') : t('zoomIn')}
              </button>
            </div>
            <button
              type="button"
              onClick={() => move(1)}
              disabled={total < 2}
              aria-label={t('next')}
              className={NAV_BUTTON}
            >
              <ChevronRightIcon aria-hidden="true" className="size-6" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
