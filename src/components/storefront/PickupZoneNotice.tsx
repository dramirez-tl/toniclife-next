'use client';

// PickupZoneNotice — Aviso de que el pedido está cotizado con la lista de OTRA zona de
// precios porque se va a recoger ahí (16-nov-2026). Lo ve quien, con cuenta de México, elige
// recoger en una sucursal de Frontera (o al revés): los precios cambian y aquí se le dice,
// con el total de antes y el de ahora cuando el cambio se acaba de hacer.

import { useTranslations } from 'next-intl';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { priceZoneLabel } from '@/components/storefront/PickupBranchPicker';
import { cn } from '@/lib/utils';
import type { PickupPriceZone, PickupZoneResult } from '@/types/cart';

interface PickupZoneNoticeProps {
  /** Zona con la que está cotizado el carrito (`cart.pickupZone`). */
  zone: PickupPriceZone;
  /** Último cambio de lista hecho en esta visita; con él se muestran los dos totales. */
  change?: PickupZoneResult | null;
  /** Da formato de moneda a un importe del API. */
  formatAmount: (amount: string) => string;
  className?: string;
}

export function PickupZoneNotice({ zone, change, formatAmount, className }: PickupZoneNoticeProps) {
  const t = useTranslations('checkout');
  const label = priceZoneLabel(zone, t);
  const sameZone =
    !!change?.pickupZone && change.pickupZone.countryId.toLowerCase() === zone.countryId.toLowerCase();
  const totals = sameZone && change?.previous && change.current ? change : null;

  return (
    <div
      role="status"
      className={cn('flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900', className)}
    >
      <InformationCircleIcon aria-hidden="true" className="mt-0.5 h-5 w-5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="font-semibold">{t('pickup.zoneNoticeTitle', { zone: label })}</p>
        <p className="mt-1">{t('pickup.zoneNoticeBody', { zone: label })}</p>
        {totals?.previous && totals.current && (
          <p className="mt-1 font-medium">
            {t('pickup.zoneNoticeTotals', {
              before: formatAmount(totals.previous.total),
              after: formatAmount(totals.current.total),
            })}
          </p>
        )}
      </div>
    </div>
  );
}
