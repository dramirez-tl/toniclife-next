'use client';

// PaymentField.tsx — primitivas accesibles del formulario de Datos para
// Comisiones: etiqueta con tooltip Radix (teclado/táctil), mensajes de ayuda
// y error enlazados por `aria-describedby`, y candado de campo validado.

import type { ReactNode } from 'react';
import { InformationCircleIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface FieldLabelProps {
  htmlFor: string;
  label: string;
  tooltip?: string;
  /** Texto accesible del botón de ayuda ("Ayuda: {label}"). */
  tooltipAriaLabel?: string;
  required?: boolean;
  /** Texto accesible del asterisco ("obligatorio"). */
  requiredLabel?: string;
  locked?: boolean;
  lockedLabel?: string;
  className?: string;
}

export function FieldLabel({
  htmlFor,
  label,
  tooltip,
  tooltipAriaLabel,
  required,
  requiredLabel,
  locked,
  lockedLabel,
  className,
}: FieldLabelProps) {
  return (
    <div className={cn('mb-1.5 flex flex-wrap items-center gap-1.5', className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
        {required && (
          <span className="text-destructive" aria-label={requiredLabel} title={requiredLabel}>
            *
          </span>
        )}
      </Label>
      {tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label={tooltipAriaLabel ?? label}
            >
              <InformationCircleIcon className="h-4 w-4" aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-left leading-relaxed">
            {tooltip}
          </TooltipContent>
        </Tooltip>
      )}
      {locked && lockedLabel && (
        <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
          <LockClosedIcon className="h-3 w-3" aria-hidden="true" />
          {lockedLabel}
        </span>
      )}
    </div>
  );
}

interface FieldMessageProps {
  id: string;
  hint?: ReactNode;
  error?: ReactNode;
  success?: ReactNode;
}

/**
 * Ayuda + error del campo. El error va con `role="alert"` para lectores de
 * pantalla; el `id` es el que el input enlaza con `aria-describedby`.
 */
export function FieldMessage({ id, hint, error, success }: FieldMessageProps) {
  if (!hint && !error && !success) return null;
  return (
    <div id={id} className="mt-1 space-y-0.5 text-xs">
      {error ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : success ? (
        <p className="text-emerald-700">{success}</p>
      ) : null}
      {hint && <p className="text-muted-foreground">{hint}</p>}
    </div>
  );
}

interface LockedNoticeProps {
  title: string;
  body: string;
  actionLabel: string;
  onRequestChange: () => void;
  disabled?: boolean;
}

/** Aviso de sección validada: el cambio pasa por "Solicitar cambio". */
export function LockedNotice({ title, body, actionLabel, onRequestChange, disabled }: LockedNoticeProps) {
  return (
    <div
      className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 sm:flex-row sm:items-center sm:justify-between"
      role="status"
    >
      <div className="flex items-start gap-2">
        <LockClosedIcon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-emerald-900">{title}</p>
          <p className="text-xs text-emerald-800/80">{body}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={onRequestChange}
        disabled={disabled}
      >
        {actionLabel}
      </Button>
    </div>
  );
}

/** Contenedor de un campo con ancla `#field-*` (la usan checklist y errores del API). */
export function FieldGroup({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return (
    <div id={id} className={cn('scroll-mt-28', className)}>
      {children}
    </div>
  );
}
