'use client';

// Aviso de la tienda cuando la sesión de un distribuidor/preferente VENCIÓ y el
// refresh fue rechazado: el API lo está cotizando como visitante (precio público,
// sin puntos). Sin este aviso el cambio de precio pasa desapercibido (hallazgo M2).
// No limpia la sesión ni redirige: eso es del flujo de auth.

import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { useStorefrontSessionExpired } from '@/hooks/useStorefront';
import { cn } from '@/lib/utils';

export function SessionExpiredNotice({ className }: { className?: string }) {
  const t = useTranslations('storefront.common.sessionExpired');
  const expired = useStorefrontSessionExpired();
  if (!expired) return null;

  return (
    <div
      role="status"
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950',
        className,
      )}
    >
      <InformationCircleIcon aria-hidden="true" className="size-5 shrink-0 text-amber-800" />
      <p className="min-w-0 flex-1 basis-48">{t('message')}</p>
      {/* `/login` vive fuera de `[locale]`: enlace de Next, no el de next-intl. */}
      <NextLink
        href="/login"
        className="inline-flex min-h-11 items-center font-semibold text-[#2f5165] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
      >
        {t('login')}
      </NextLink>
    </div>
  );
}
