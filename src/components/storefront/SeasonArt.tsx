'use client';

// Arte general de una temporada (Buen Fin…), COMPLETO y sin recortar. Marketing manda tanto
// 3:2 como publicaciones cuadradas, así que el espacio toma la proporción de la imagen en
// cuanto carga (acotada: `artAspectRatio`). Cuando el espacio queda más ancho que el arte (en
// celular el alto lleva tope), los lados se rellenan con el mismo arte desenfocado: sirve para
// cualquier paleta, sin franjas de un color fijo. Si el archivo no carga no se pinta nada.
//
// Lo usan el aviso de la tienda (SeasonalPromotionsBanner) y la tarjeta del inicio del
// distribuidor (SeasonHomeCard): quien lo usa decide el ancho y los márgenes con `className`.

import { useState } from 'react';
import Image from 'next/image';
import { useImageAttempt } from '@/hooks/useImageAttempt';
import { imageAttempts } from '@/lib/inventory/product-thumb';
import { DEFAULT_ART_RATIO, artAspectRatio } from '@/lib/seasonal-promotions';
import { cn } from '@/lib/utils';

interface SeasonArtProps {
  src: string;
  /** Nombre de la temporada (texto alternativo). */
  name: string;
  /** Ancho que ocupa en pantalla (atributo `sizes` de la imagen). */
  sizes: string;
  className?: string;
}

export function SeasonArt({ src, name, sizes, className }: SeasonArtProps) {
  const art = useImageAttempt(imageAttempts(src));
  const [ratio, setRatio] = useState(DEFAULT_ART_RATIO);
  if (!art.current) return null;
  const attempt = `${art.current.optimized}:${art.current.src}`;

  return (
    <div
      data-testid="season-art"
      className={cn('relative shrink-0 overflow-hidden bg-[#0b3a67]', className)}
      style={{ aspectRatio: String(ratio) }}
    >
      {/* Relleno de los lados: el mismo arte, ampliado y desenfocado (misma descarga). */}
      <Image
        key={`fondo:${attempt}`}
        src={art.current.src}
        alt=""
        aria-hidden="true"
        fill
        sizes={sizes}
        unoptimized={!art.current.optimized}
        className="scale-125 object-cover opacity-70 blur-xl"
      />
      <Image
        key={attempt}
        src={art.current.src}
        alt={name}
        fill
        sizes={sizes}
        unoptimized={!art.current.optimized}
        className="object-contain"
        onLoad={(event) => {
          const img = event.currentTarget;
          setRatio(artAspectRatio(img.naturalWidth, img.naturalHeight));
        }}
        onError={art.fail}
      />
    </div>
  );
}
