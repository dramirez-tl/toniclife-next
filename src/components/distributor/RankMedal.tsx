'use client';

import { useState } from 'react';
import Image from 'next/image';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { getRankImage, RANK_LABELS } from '@/constants/ranks';
import type { RankType } from '@/types/network';

type MedalSize = 'sm' | 'md' | 'lg' | 'xl';

const sizePx: Record<MedalSize, number> = { sm: 32, md: 48, lg: 80, xl: 128 };

const sizeClass: Record<MedalSize, string> = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-20 h-20',
  xl: 'w-32 h-32',
};

interface RankMedalProps {
  rank: string | null | undefined;
  size?: MedalSize;
  /** Muestra la medalla en escala de grises (rango aún no alcanzado). */
  locked?: boolean;
  /** Sombra de realce para el rango actual. */
  glow?: boolean;
  /** Anillo de marca alrededor de la medalla. */
  ring?: boolean;
  className?: string;
  /** Texto alternativo (por defecto, la etiqueta del rango). */
  label?: string;
  /** Al hacer clic, abre la medalla en grande (lightbox). */
  zoomable?: boolean;
}

export function RankMedal({
  rank,
  size = 'md',
  locked = false,
  glow = false,
  ring = false,
  className,
  label,
  zoomable = false,
}: RankMedalProps) {
  const [open, setOpen] = useState(false);
  const src = getRankImage(rank);
  const px = sizePx[size];
  const alt = label ?? (rank ? RANK_LABELS[rank as RankType] ?? 'Rango' : 'Rango');

  const medal = (
    <div
      className={cn(
        'relative rounded-full overflow-hidden bg-white flex items-center justify-center shrink-0',
        sizeClass[size],
        glow && 'shadow-lg shadow-[#a7c1e2]/40',
        ring && 'ring-4 ring-offset-2 ring-[#3E667D]',
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        width={px}
        height={px}
        className={cn('w-full h-full object-contain', locked && 'grayscale opacity-40')}
      />
    </div>
  );

  if (!zoomable) return medal;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-zoom-in rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-[#a7c1e2]"
        aria-label={`Ver medalla ${alt}`}
      >
        {medal}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-6"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
          <div className="flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-64 w-64 items-center justify-center overflow-hidden rounded-full bg-white shadow-2xl sm:h-80 sm:w-80">
              <Image
                src={src}
                alt={alt}
                width={512}
                height={512}
                className={cn('h-full w-full object-contain', locked && 'grayscale opacity-60')}
              />
            </div>
            <p className="text-lg font-semibold text-white">{alt}</p>
          </div>
        </div>
      )}
    </>
  );
}
