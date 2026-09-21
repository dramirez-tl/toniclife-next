'use client';

// HistorySheet — historial de cambios de las rutas (contrato §6.6 / §7.3-9).
// `summaryEs` viene del API; sin autor = "Sistema" (mantenimiento, cascada o la
// configuración inicial de la migración 144). Hora de negocio: Ciudad de México.
// `reason` = el "Motivo del cambio" que se escribió al guardar (el API lo
// persiste y lo devuelve por entrada); sin motivo no se pinta nada.

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useFulfillmentHistory } from '@/hooks/useFulfillment';
import { fulfillmentErrorMessage } from '@/lib/fulfillment/fulfillment-error';
import { DEFAULT_TIMEZONE, resolveTimeZone } from '@/lib/timezone-utils';

function formatWhen(at: string): string {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-MX', {
    timeZone: resolveTimeZone(DEFAULT_TIMEZONE),
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

interface HistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HistorySheet({ open, onOpenChange }: HistorySheetProps) {
  const history = useFulfillmentHistory(open);
  const entries = history.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Historial de cambios</SheetTitle>
          <SheetDescription>Quién cambió qué y cuándo (hora del centro de México). Lo más reciente primero.</SheetDescription>
        </SheetHeader>

        <div className="space-y-3 px-4 pb-6">
          {history.isLoading && (
            <div className="space-y-2" aria-busy="true" aria-label="Cargando historial">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}

          {history.isError && (
            <div role="alert" className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              <p>{fulfillmentErrorMessage(history.error, 'No se pudo cargar el historial.')}</p>
              <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => void history.refetch()}>
                Reintentar
              </Button>
            </div>
          )}

          {!history.isLoading && !history.isError && entries.length === 0 && (
            <p className="text-sm text-muted-foreground">Todavía no hay cambios registrados.</p>
          )}

          {entries.length > 0 && (
            <ol className="space-y-2">
              {entries.map((entry) => (
                <li key={entry.id} className="rounded-md border p-3 text-sm">
                  <p className="break-words text-foreground">{entry.summaryEs}</p>
                  {entry.reason?.trim() && (
                    <p className="mt-1 break-words text-foreground">
                      <span className="font-medium">Motivo:</span> {entry.reason.trim()}
                    </p>
                  )}
                  <p className="mt-1 break-words text-xs text-muted-foreground">
                    {entry.actor?.email ?? 'Sistema'} · <time dateTime={entry.at}>{formatWhen(entry.at)}</time>
                  </p>
                </li>
              ))}
            </ol>
          )}

          {history.hasNextPage && (
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full"
              onClick={() => void history.fetchNextPage()}
              disabled={history.isFetchingNextPage}
            >
              {history.isFetchingNextPage && <Loader2 aria-hidden className="animate-spin" />}
              {history.isFetchingNextPage ? 'Cargando…' : 'Cargar más'}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
