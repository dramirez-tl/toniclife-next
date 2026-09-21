'use client';

// UnsavedBar — barra fija inferior mientras haya secciones con cambios.
// "Guardar todo" guarda en secuencia (cada PATCH usa el `updatedAt` que dejó
// el anterior) e informa el resultado por sección.

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SECTION_LABEL, type ProductSectionId } from '../lib/labels';

interface UnsavedBarProps {
  dirtySections: ProductSectionId[];
  isSavingAll: boolean;
  onSaveAll: () => void;
  onDiscardAll: () => void;
  onGoTo: (id: ProductSectionId) => void;
}

export function UnsavedBar({ dirtySections, isSavingAll, onSaveAll, onDiscardAll, onGoTo }: UnsavedBarProps) {
  if (dirtySections.length === 0) return null;
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-amber-300 bg-amber-50 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="region"
      aria-label="Cambios sin guardar"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-sm text-amber-900" aria-live="polite">
          <span className="font-semibold">Tienes cambios sin guardar en: </span>
          {dirtySections.map((id, i) => (
            <span key={id}>
              {i > 0 ? ', ' : ''}
              <button
                type="button"
                onClick={() => onGoTo(id)}
                className="underline underline-offset-2 hover:text-amber-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
              >
                {SECTION_LABEL[id]}
              </button>
            </span>
          ))}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" variant="ghost" onClick={onDiscardAll} disabled={isSavingAll}>
            Descartar
          </Button>
          <Button type="button" onClick={onSaveAll} disabled={isSavingAll} aria-busy={isSavingAll}>
            {isSavingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            {isSavingAll ? 'Guardando…' : 'Guardar todo'}
          </Button>
        </div>
      </div>
    </div>
  );
}
