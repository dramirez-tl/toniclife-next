'use client';

// ConfirmDialog — confirmación reutilizable del admin sobre `components/ui/dialog`.
//
// Reemplaza los overlays a mano (fixed inset-0 + card) de facturación y
// pedidos: título, resumen (children), texto de confirmación opcional que el
// usuario debe teclear (p. ej. `CANCELAR`), `isPending` que bloquea el cierre
// y `destructive` para acciones irreversibles (cancelar un CFDI, desechar).
//
// Accesible: Radix maneja foco/Escape; el campo de confirmación lleva Label y
// `aria-describedby`; el botón principal anuncia el estado pendiente.
//
// El texto tecleado vive en `ConfirmDialogBody`, que Radix desmonta al cerrar:
// así se limpia SIEMPRE, también cuando el padre cierra con `setOpen(false)`
// sin pasar por `onOpenChange` (si no, al reabrir seguía escrito `CANCELAR`).

import { useId, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { matchesConfirmText, type ConfirmTextMatch } from '@/lib/confirm-text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /** Texto corto bajo el título (DialogDescription). */
  description?: ReactNode;
  /** Resumen o formulario de la acción. */
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Si viene, el usuario debe teclearlo EXACTO para habilitar el botón. */
  confirmText?: string;
  /**
   * Cómo se compara lo tecleado. `exact` (por defecto): idéntico. `loose`:
   * ignora mayúsculas y acentos (para confirmar con un NOMBRE, p. ej. un país).
   */
  confirmMatch?: ConfirmTextMatch;
  isPending?: boolean;
  /** Bloquea el botón principal por reglas propias del que llama. */
  disabled?: boolean;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
  /** Ancho del contenido (clase Tailwind), por defecto `sm:max-w-lg`. */
  contentClassName?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  confirmText,
  confirmMatch = 'exact',
  isPending = false,
  disabled = false,
  destructive = false,
  onConfirm,
  contentClassName,
}: ConfirmDialogProps) {
  const handleOpenChange = (next: boolean) => {
    if (!next && isPending) return; // no se cierra a media operación
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={contentClassName ?? 'sm:max-w-lg'}
        showCloseButton={!isPending}
        onInteractOutside={(e) => {
          if (isPending) e.preventDefault();
        }}
      >
        <ConfirmDialogBody
          title={title}
          description={description}
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
          confirmText={confirmText}
          confirmMatch={confirmMatch}
          isPending={isPending}
          disabled={disabled}
          destructive={destructive}
          onConfirm={onConfirm}
          onCancel={() => handleOpenChange(false)}
        >
          {children}
        </ConfirmDialogBody>
      </DialogContent>
    </Dialog>
  );
}

type ConfirmDialogBodyProps = Pick<
  ConfirmDialogProps,
  'title' | 'description' | 'children' | 'confirmText' | 'onConfirm'
> & {
  confirmLabel: string;
  cancelLabel: string;
  confirmMatch: ConfirmTextMatch;
  isPending: boolean;
  disabled: boolean;
  destructive: boolean;
  onCancel: () => void;
};

/** Contenido del diálogo: se monta al abrir, así que `typed` siempre arranca vacío. */
function ConfirmDialogBody({
  title,
  description,
  children,
  confirmLabel,
  cancelLabel,
  confirmText,
  confirmMatch,
  isPending,
  disabled,
  destructive,
  onConfirm,
  onCancel,
}: ConfirmDialogBodyProps) {
  const [typed, setTyped] = useState('');
  const inputId = useId();
  const helpId = `${inputId}-help`;

  const needsText = !!confirmText;
  const textOk = !needsText || matchesConfirmText(typed, confirmText ?? '', confirmMatch);
  const canConfirm = !isPending && !disabled && textOk;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description ? <DialogDescription>{description}</DialogDescription> : null}
      </DialogHeader>

      {children ? <div className="text-sm text-gray-700">{children}</div> : null}

      {needsText && (
        <div className="space-y-1.5">
          <Label htmlFor={inputId}>
            Escribe <span className="font-mono font-semibold">{confirmText}</span> para confirmar
          </Label>
          <Input
            id={inputId}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize={confirmMatch === 'loose' ? 'words' : 'characters'}
            aria-describedby={helpId}
            aria-invalid={typed.length > 0 && !textOk}
            disabled={isPending}
          />
          <p id={helpId} className="text-xs text-muted-foreground">
            Esta confirmación evita acciones por accidente.
          </p>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={destructive ? 'destructive' : 'default'}
          onClick={() => void onConfirm()}
          disabled={!canConfirm}
          aria-busy={isPending}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
          {isPending ? 'Procesando…' : confirmLabel}
        </Button>
      </DialogFooter>
    </>
  );
}
