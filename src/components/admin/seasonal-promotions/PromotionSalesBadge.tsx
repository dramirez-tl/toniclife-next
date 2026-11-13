// Insignia de ventas de una promoción en el detalle de la temporada (13-nov-2026):
// cuántas ventas cobradas la usaron y cuánto se cobró por sus productos. El texto
// sale de promotionSalesSummary; al pasar el cursor explica qué cuenta y qué no.

import { BanknotesIcon } from '@heroicons/react/24/outline';
import { promotionSalesSummary } from '@/lib/seasonal-promotions';
import type { SeasonPromotion } from '@/types/seasonal-promotion';

const PLACEMENT = {
  /** Con las demás insignias del título, en pantallas angostas: el texto puede partirse. */
  inline: 'inline-flex rounded-xl lg:hidden',
  /** A la derecha del renglón, en escritorio: una línea, alineadas entre promociones. */
  side: 'hidden flex-shrink-0 whitespace-nowrap rounded-full lg:inline-flex',
} as const;

export function PromotionSalesBadge({
  promotion,
  placement,
}: {
  promotion: Pick<SeasonPromotion, 'usageCount' | 'salesAmounts'>;
  /** El renglón pinta las dos; cada una se muestra en su tamaño de pantalla. */
  placement: keyof typeof PLACEMENT;
}) {
  const summary = promotionSalesSummary(promotion);
  return (
    <span
      title={summary.hint}
      className={`max-w-full items-center gap-1.5 px-3 py-1 text-xs font-semibold ${
        summary.hasSales ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
      } ${PLACEMENT[placement]}`}
    >
      <BanknotesIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      {summary.label}
    </span>
  );
}
