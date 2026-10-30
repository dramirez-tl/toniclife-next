'use client';

// FamiliesErrorCard - aviso de error de las tablas de Familias y tallas: sin la
// migración 178 el API responde 503 (se nombra la migración, en ámbar); cualquier
// otro error va en rojo. Siempre con "Reintentar".

import { ExclamationTriangleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { isMigrationPendingError } from '@/lib/product-families';
import { productAdminErrorMessage } from '../lib/errors';

interface FamiliesErrorCardProps {
  error: unknown;
  /** Texto si el API no dice nada útil. */
  fallback: string;
  onRetry: () => void;
}

export function FamiliesErrorCard({ error, fallback, onRetry }: FamiliesErrorCardProps) {
  const migrationPending = isMigrationPendingError(error);
  return (
    <Card className={migrationPending ? 'border-amber-300 bg-amber-50' : 'border-red-200 bg-red-50'}>
      <CardContent className="p-6" role="alert">
        {migrationPending ? (
          <div className="flex items-start gap-3 text-amber-900">
            <ExclamationTriangleIcon className="h-6 w-6 shrink-0" aria-hidden />
            <div>
              <p className="font-semibold">
                {productAdminErrorMessage(error, 'Falta aplicar la migración 178 en la base de datos.')}
              </p>
              <p className="mt-1 text-sm">
                Las familias de producto, las variantes y las guías de tallas estarán disponibles en cuanto se
                aplique. Mientras tanto la ficha del producto no puede asignar familia ni talla.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-red-700">
            <XCircleIcon className="h-6 w-6 shrink-0" aria-hidden />
            <p>{productAdminErrorMessage(error, fallback)}</p>
          </div>
        )}
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Reintentar
        </Button>
      </CardContent>
    </Card>
  );
}
