'use client';

// SectionCard.tsx — tarjeta de sección con guardado independiente: título,
// icono, estado "cambios sin guardar", botón Guardar y región aria-live para
// el resultado. Cada sección del formulario la usa con su propio estado.

import type { ComponentType, ReactNode, SVGProps } from 'react';
import { CheckCircleIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  id: string;
  title: string;
  description?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tooltip?: string;
  tooltipAriaLabel?: string;
  children: ReactNode;
  /** Si se omite, la tarjeta no tiene pie de guardado (p. ej. Documentos). */
  onSave?: () => void;
  saveLabel?: string;
  savingLabel?: string;
  dirtyLabel?: string;
  cleanLabel?: string;
  isDirty?: boolean;
  isSaving?: boolean;
  /** Bloquea el botón (p. ej. hasta aceptar el aviso de privacidad). */
  saveDisabled?: boolean;
  saveDisabledReason?: string;
  /** Mensaje de estado tras guardar (se anuncia con aria-live). */
  statusMessage?: string | null;
  statusTone?: 'success' | 'error' | 'info';
  headerBadge?: ReactNode;
  dataTour?: string;
  className?: string;
}

export function SectionCard({
  id,
  title,
  description,
  icon: Icon,
  tooltip,
  tooltipAriaLabel,
  children,
  onSave,
  saveLabel,
  savingLabel,
  dirtyLabel,
  cleanLabel,
  isDirty = false,
  isSaving = false,
  saveDisabled = false,
  saveDisabledReason,
  statusMessage,
  statusTone = 'info',
  headerBadge,
  dataTour,
  className,
}: SectionCardProps) {
  const headingId = `${id}-heading`;
  const disabled = isSaving || saveDisabled || !isDirty;

  return (
    <Card id={id} className={cn('scroll-mt-24', className)} data-tour={dataTour}>
      <CardContent className="p-5">
        <section aria-labelledby={headingId}>
          <header className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 id={headingId} className="text-base font-semibold text-foreground">
                    {title}
                  </h2>
                  {tooltip && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                          aria-label={tooltipAriaLabel ?? title}
                        >
                          <span aria-hidden="true" className="text-xs font-bold">?</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-left leading-relaxed">
                        {tooltip}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                {description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
                )}
              </div>
            </div>
            {headerBadge}
          </header>

          <div className="space-y-4">{children}</div>

          {onSave && (
            <footer className="mt-5 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p
                className={cn(
                  'text-xs',
                  isDirty ? 'font-medium text-amber-700' : 'text-muted-foreground',
                )}
                aria-live="polite"
              >
                {isDirty ? dirtyLabel : cleanLabel}
              </p>
              <div className="flex items-center gap-2 sm:justify-end">
                {saveDisabled && saveDisabledReason && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <LockClosedIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {saveDisabledReason}
                  </span>
                )}
                <Button
                  type="button"
                  onClick={onSave}
                  disabled={disabled}
                  className="w-full sm:w-auto"
                >
                  {isSaving ? (
                    <>
                      <span
                        className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                        aria-hidden="true"
                      />
                      {savingLabel}
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
                      {saveLabel}
                    </>
                  )}
                </Button>
              </div>
            </footer>
          )}

          <div aria-live="polite" aria-atomic="true" className="mt-2 min-h-0">
            {statusMessage && (
              <p
                className={cn(
                  'rounded-md px-3 py-2 text-xs',
                  statusTone === 'success' && 'bg-emerald-50 text-emerald-800',
                  statusTone === 'error' && 'bg-destructive/10 text-destructive',
                  statusTone === 'info' && 'bg-muted text-muted-foreground',
                )}
              >
                {statusMessage}
              </p>
            )}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
