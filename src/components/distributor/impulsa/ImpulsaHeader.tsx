'use client';

// Encabezado de las pantallas de IMPULSA. IMPULSA es una sección con marca propia, separada de RISE
// Academy: su logo va en sus colores sobre blanco (el logotipo es azul y se pierde en un fondo
// oscuro) y la franja amarillo → naranja de abajo es la de los puntos del logo. La tipografía es la
// del resto del sitio.

import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { IMPULSA_LOGO, IMPULSA_PATH } from '@/lib/impulsa';
import { cn } from '@/lib/utils';

interface ImpulsaHeaderProps {
  backHref: string;
  backLabel: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** 'lg' en la portada (manda el logo); 'md' en las pantallas de adentro. */
  size?: 'md' | 'lg';
  /** Lo que va a la derecha: el día de hoy, el avance de la ruta… */
  children?: ReactNode;
}

export function ImpulsaHeader({ backHref, backLabel, eyebrow, title, subtitle, size = 'md', children }: ImpulsaHeaderProps) {
  const t = useTranslations('distributor.impulsa');
  return (
    <header className="bg-white">
      <div className="mx-auto max-w-7xl px-4 pb-6 pt-5 sm:px-6 lg:px-8">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-muted-foreground hover:text-impulsa-blue focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <ArrowLeftIcon className="h-4 w-4" aria-hidden />
          {backLabel}
        </Link>
        <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-5">
          <Link
            href={IMPULSA_PATH}
            className="shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Image
              src={IMPULSA_LOGO.src}
              alt={t('logoAlt')}
              width={IMPULSA_LOGO.width}
              height={IMPULSA_LOGO.height}
              priority
              className={cn('w-auto', size === 'lg' ? 'h-24 sm:h-28' : 'h-16 sm:h-[4.5rem]')}
            />
          </Link>
          <div className="min-w-0 flex-1 basis-72">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
            ) : null}
            <h1
              className={cn(
                'font-bold leading-tight text-impulsa-blue',
                size === 'lg' ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl',
                eyebrow ? 'mt-1' : null,
              )}
            >
              {title}
            </h1>
            {subtitle ? <p className="mt-1 max-w-2xl text-base text-muted-foreground">{subtitle}</p> : null}
          </div>
          {children ? <div className="w-full sm:w-auto">{children}</div> : null}
        </div>
      </div>
      <div className="h-1.5 bg-gradient-to-r from-impulsa-yellow to-impulsa-orange" aria-hidden />
    </header>
  );
}
