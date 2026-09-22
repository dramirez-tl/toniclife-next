'use client';

// KitConfirmDialog — confirmación del editor de kits sobre shadcn AlertDialog
// (contrato de kits §5.2): cambio de modo de surtido, marcar como kit de
// inscripción, cerrar un bono, conflicto de existencia propia. Radix maneja
// foco y Escape; `extraAction` permite un segundo botón (p. ej. "Vaciar
// existencia propia") además de Confirmar / Cancelar.

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface KitConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  isPending?: boolean;
  /** Sin botón principal (solo Cancelar + `extraAction`). */
  hideConfirm?: boolean;
  /** Botón adicional a la izquierda del principal. */
  extraAction?: ReactNode;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export function KitConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  isPending = false,
  hideConfirm = false,
  extraAction,
  onConfirm,
  onCancel,
}: KitConfirmDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next && isPending) return;
        if (!next) onCancel?.();
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        {children ? <div className="text-sm text-gray-700">{children}</div> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{cancelLabel}</AlertDialogCancel>
          {extraAction}
          {hideConfirm ? null : (
            <AlertDialogAction
              className={cn(destructive && buttonVariants({ variant: 'destructive' }))}
              disabled={isPending}
              aria-busy={isPending}
              onClick={(e) => {
                // El cierre lo decide quien confirma (operaciones asíncronas).
                e.preventDefault();
                void onConfirm();
              }}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
              {isPending ? 'Procesando…' : confirmLabel}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
