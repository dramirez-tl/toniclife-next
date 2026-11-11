'use client';

// Miniatura del producto para las listas de inventario: ayuda a ubicar de qué producto se
// trata sin leer la clave. Con foto es un botón: al pulsarlo la foto se ve en grande. Sin
// foto queda el cubo de siempre. De dónde sale la foto lo decide lib/inventory/product-thumb
// (la fila de la lista o, si el API aún no la manda, la galería del producto).

import { useState } from 'react';
import Image from 'next/image';
import { CubeIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useProductImages } from '@/hooks/useProducts';
import { imageAttempts, thumbFromGallery, thumbFromRow, type ImageAttempt } from '@/lib/inventory/product-thumb';
import { cn } from '@/lib/utils';

interface ProductThumbProps {
  productId: string;
  name: string;
  code: string;
  /** Foto principal según la lista. `undefined` = el API no la manda: se consulta la galería. */
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  className?: string;
}

const BOX = 'h-10 w-10 flex-shrink-0 rounded-lg';

function Placeholder({ className, busy = false }: { className?: string; busy?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={cn(BOX, 'flex items-center justify-center bg-[#3E667D]/10', busy && 'animate-pulse motion-reduce:animate-none', className)}
    >
      <CubeIcon className="h-5 w-5 text-[#3E667D]" />
    </div>
  );
}

/**
 * Intento vigente de una lista (`imageAttempts`) y cómo pasar al siguiente cuando la carga
 * falla. Se recuerda por foto: otra foto empieza de nuevo desde el primer intento.
 */
function useImageAttempt(attempts: ImageAttempt[]): { current: ImageAttempt | null; fail: () => void } {
  const key = attempts.map((attempt) => `${attempt.optimized ? 'o' : 'r'}:${attempt.src}`).join('|');
  const [failed, setFailed] = useState<{ key: string; count: number }>({ key: '', count: 0 });
  const count = failed.key === key ? failed.count : 0;
  return { current: attempts[count] ?? null, fail: () => setFailed({ key, count: count + 1 }) };
}

function ThumbButton({
  small,
  large,
  name,
  code,
  className,
}: {
  small: string;
  large: string;
  name: string;
  code: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  // Miniatura: la versión pequeña; si falla, la foto original tal cual; si tampoco, el cubo.
  const thumb = useImageAttempt(imageAttempts(small, large));
  const full = useImageAttempt(imageAttempts(large));

  if (!thumb.current) return <Placeholder className={className} />;

  return (
    // El botón es el disparador del diálogo: al cerrar, el foco regresa a la miniatura.
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
      <button
        type="button"
        aria-label={`Ver la foto de ${name} en grande`}
        title="Ver la foto en grande"
        className={cn(
          BOX,
          'group relative cursor-zoom-in overflow-hidden border border-gray-200 bg-white outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#3E667D] focus-visible:ring-offset-2',
          className,
        )}
      >
        <Image
          key={`${thumb.current.optimized}:${thumb.current.src}`}
          src={thumb.current.src}
          alt=""
          fill
          sizes="40px"
          unoptimized={!thumb.current.optimized}
          className="object-cover transition-transform duration-200 motion-safe:group-hover:scale-110"
          onError={thumb.fail}
        />
      </button>
      </DialogTrigger>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="pr-8 text-left text-base leading-snug text-gray-900">{name}</DialogTitle>
            <DialogDescription className="text-left font-mono text-sm text-gray-500">{code}</DialogDescription>
          </DialogHeader>
          {/* Cuadrada y nunca más alta que la ventana (pantallas bajas). */}
          <div className="relative mx-auto aspect-square w-full max-w-[70vh] overflow-hidden rounded-lg bg-gray-50">
            {full.current ? (
              <Image
                key={`${full.current.optimized}:${full.current.src}`}
                src={full.current.src}
                alt={`Foto de ${name}`}
                fill
                sizes="(min-width: 640px) 624px, 100vw"
                unoptimized={!full.current.optimized}
                className="object-contain"
                onError={full.fail}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500">
                <CubeIcon aria-hidden="true" className="h-12 w-12" />
                <p className="text-sm">No se pudo cargar la foto.</p>
              </div>
            )}
          </div>
        </DialogContent>
    </Dialog>
  );
}

export function ProductThumb({ productId, name, code, imageUrl, thumbnailUrl, className }: ProductThumbProps) {
  const fromRow = thumbFromRow({ imageUrl, thumbnailUrl });
  const needsLookup = fromRow.kind === 'lookup';
  const gallery = useProductImages(productId, needsLookup);
  const thumb = needsLookup && gallery.data ? thumbFromGallery(gallery.data) : fromRow;

  if (thumb.kind !== 'ready') {
    return <Placeholder className={className} busy={needsLookup && gallery.isLoading} />;
  }
  return <ThumbButton small={thumb.small} large={thumb.large} name={name} code={code} className={className} />;
}
