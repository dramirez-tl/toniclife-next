'use client';

// SectionCard — marco común de una sección: título, indicador de cambios sin
// guardar y acciones Guardar / Descartar POR SECCIÓN.

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useProductForm } from './ProductFormContext';

interface SectionCardProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Sin formulario propio (imágenes, historial…): no pinta acciones. */
  isDirty?: boolean;
  isSaving?: boolean;
  canSave?: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
  saveLabel?: string;
  /** Acciones extra a la derecha del título. */
  actions?: ReactNode;
}

export function SectionCard({
  title,
  description,
  children,
  isDirty = false,
  isSaving = false,
  canSave = true,
  onSave,
  onDiscard,
  saveLabel = 'Guardar sección',
  actions,
}: SectionCardProps) {
  const { mode, readOnly } = useProductForm();
  const showActions = mode === 'edit' && !readOnly && !!onSave;

  return (
    <Card className="p-0">
      <CardContent className="p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
              {title}
              {isDirty && mode === 'edit' ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
                  Sin guardar
                </span>
              ) : null}
            </h2>
            {description ? <p className="mt-1 text-sm text-gray-600">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>

        {children}

        {showActions ? (
          <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-4">
            <Button type="button" variant="ghost" onClick={onDiscard} disabled={!isDirty || isSaving}>
              Descartar
            </Button>
            <Button
              type="button"
              onClick={onSave}
              disabled={!isDirty || isSaving || !canSave}
              aria-busy={isSaving}
            >
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              {isSaving ? 'Guardando…' : saveLabel}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ReadOnlyNotice() {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900" role="status">
      Estás viendo esta ficha en modo de solo lectura: tu rol no tiene permiso para modificar productos.
    </div>
  );
}
