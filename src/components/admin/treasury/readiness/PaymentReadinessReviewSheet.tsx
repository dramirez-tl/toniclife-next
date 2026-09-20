'use client';

// PaymentReadinessReviewSheet — Sheet ancho de la bandeja: envuelve
// PaymentReadinessReview con navegación por la cola (ids de la página actual,
// Anterior/Siguiente, J/K) y `key={customerId}` para que el estado del visor
// nazca limpio con cada distribuidor.

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PaymentReadinessReview } from './PaymentReadinessReview';

interface PaymentReadinessReviewSheetProps {
  customerId: string | null;
  /** Ids ordenados de la cola visible; se navega dentro de ellos. */
  queueIds: string[];
  onOpenChange: (open: boolean) => void;
  onNavigate: (customerId: string) => void;
}

export function PaymentReadinessReviewSheet({
  customerId,
  queueIds,
  onOpenChange,
  onNavigate,
}: PaymentReadinessReviewSheetProps) {
  const index = customerId ? queueIds.indexOf(customerId) : -1;
  const hasPrev = index > 0;
  const hasNext = index >= 0 && index < queueIds.length - 1;

  return (
    <Sheet open={!!customerId} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-none lg:w-[92vw] 2xl:max-w-[1500px]"
      >
        <SheetHeader className="pb-0">
          <SheetTitle>Revisión de datos para pago</SheetTitle>
          <SheetDescription>
            Visor del documento a la izquierda; checklist, cuenta, régimen y bitácora a la derecha. Escape cierra.
          </SheetDescription>
        </SheetHeader>
        {customerId && (
          <div className="px-4 pb-4">
            <PaymentReadinessReview
              key={customerId}
              customerId={customerId}
              enableShortcuts
              queue={{
                index: Math.max(0, index),
                total: queueIds.length,
                hasPrev,
                hasNext,
                onPrev: () => hasPrev && onNavigate(queueIds[index - 1]),
                onNext: () => hasNext && onNavigate(queueIds[index + 1]),
              }}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
