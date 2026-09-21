'use client';

// Imagen de producto con `next/image` y respaldo de MARCA: si no hay URL o la
// carga falla, se pinta un monograma con las iniciales (nunca se pide un archivo
// inexistente ni queda el icono roto del navegador).
// El contenedor padre debe ser `relative` con tamaño definido (p. ej. aspect-square).

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { productInitials } from '@/lib/storefront/content-format';

// Hosts que `next.config.ts` permite optimizar. Cualquier otro origen se sirve
// sin optimizar en vez de reventar el render con "hostname not configured".
const OPTIMIZABLE_HOSTS = [/^storage\.googleapis\.com$/, /\.googleusercontent\.com$/, /^images\.unsplash\.com$/];

function isOptimizable(src: string): boolean {
  if (src.startsWith('/')) return true;
  try {
    const url = new URL(src);
    return url.protocol === 'https:' && OPTIMIZABLE_HOSTS.some((re) => re.test(url.hostname));
  } catch {
    return false;
  }
}

function isRenderable(src: string | null | undefined): src is string {
  return typeof src === 'string' && (src.startsWith('/') || /^https?:\/\//i.test(src));
}

interface ProductImageProps {
  src: string | null | undefined;
  /** Texto alternativo ya localizado. Vacío = decorativa (el nombre ya está al lado). */
  alt: string;
  /** Nombre del producto: de aquí salen las iniciales del respaldo. */
  name: string;
  sizes: string;
  /** Solo la imagen LCP (principal del detalle, primeras tarjetas). */
  priority?: boolean;
  className?: string;
  monogramClassName?: string;
  draggable?: boolean;
}

export function ProductImage({
  src,
  alt,
  name,
  sizes,
  priority = false,
  className,
  monogramClassName,
  draggable,
}: ProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!isRenderable(src) || failedSrc === src) {
    return (
      <div
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#C8DDF2]/40 to-[#3E667D]/15"
      >
        <span
          className={cn(
            'select-none font-bold tracking-wide text-[#3E667D]/80',
            monogramClassName ?? 'text-3xl sm:text-4xl',
          )}
        >
          {productInitials(name)}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!isOptimizable(src)}
      draggable={draggable}
      className={cn('object-contain', className)}
      onError={() => setFailedSrc(src)}
    />
  );
}
