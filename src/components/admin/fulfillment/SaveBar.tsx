'use client';

// SaveBar — barra fija de guardado (contrato §7.3-7 / §7.4). Solo aparece con
// cambios y respeta el área segura inferior del teléfono.

import { Button } from '@/components/ui/button';
import { changesLabel } from '@/lib/fulfillment/route-diff';

interface SaveBarProps {
  changeCount: number;
  isSaving: boolean;
  /** Problema del borrador que impide guardar (p. ej. nota demasiado larga). */
  blockedReason: string | null;
  onDiscard: () => void;
  onReview: () => void;
}

export function SaveBar({ changeCount, isSaving, blockedReason, onDiscard, onReview }: SaveBarProps) {
  if (changeCount <= 0) return null;
  return (
    <div
      role="region"
      aria-label="Cambios sin guardar"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{changesLabel(changeCount)}</p>
          {blockedReason && <p className="text-sm text-destructive">{blockedReason}</p>}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" className="h-10 flex-1 sm:flex-none" onClick={onDiscard} disabled={isSaving}>
            Descartar
          </Button>
          <Button
            type="button"
            className="h-10 flex-1 sm:flex-none"
            onClick={onReview}
            disabled={isSaving || !!blockedReason}
          >
            Revisar y guardar
          </Button>
        </div>
      </div>
    </div>
  );
}
