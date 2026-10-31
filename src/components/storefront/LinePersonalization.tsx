'use client';

// "Personalización: TEXTO" bajo el nombre del producto en cualquier línea (drawer y
// página del carrito, resumen del checkout, confirmación, Mis pedidos). Una sola clave
// de i18n (`storefront.cart.line.personalization`) para todas. Sin texto no pinta nada.

import { useTranslations } from 'next-intl';
import { normalizePersonalization } from '@/lib/storefront/personalization';
import { cn } from '@/lib/utils';

interface LinePersonalizationProps {
  text: string | null | undefined;
  className?: string;
}

export function LinePersonalization({ text, className }: LinePersonalizationProps) {
  const t = useTranslations('storefront.cart.line');
  const value = normalizePersonalization(text);
  if (!value) return null;
  return <p className={cn('break-words text-xs text-gray-500', className)}>{t('personalization', { text: value })}</p>;
}
