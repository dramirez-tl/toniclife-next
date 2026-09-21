'use client';

// Cantidad con LÍMITES reales: mínimo 1, máximo `max` (= maxQuantity del API).
// Botones de 44 px con aria-label, campo numérico editable (commit en blur/Enter)
// y anuncio por aria-live del valor y del tope.

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

interface QuantityStepperProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

const BUTTON =
  'flex size-11 shrink-0 cursor-pointer items-center justify-center text-[#2f5165] hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#3E667D]';

export function QuantityStepper({ value, max, onChange, disabled = false, className }: QuantityStepperProps) {
  const t = useTranslations('storefront.product.quantity');
  const inputId = useId();
  const limit = Math.max(1, max);
  const [draft, setDraft] = useState<string | null>(null);

  const clamp = (n: number) => Math.min(limit, Math.max(1, Math.trunc(n)));
  const commit = () => {
    if (draft === null) return;
    const parsed = Number.parseInt(draft, 10);
    onChange(Number.isFinite(parsed) ? clamp(parsed) : value);
    setDraft(null);
  };
  const atMax = value >= limit;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-gray-900">
        {t('label')}
      </label>
      <div className="flex items-center gap-3">
        <div className={cn('inline-flex items-stretch overflow-hidden rounded-md border border-gray-300 bg-white', disabled && 'opacity-60')}>
          <button type="button" onClick={() => onChange(clamp(value - 1))} disabled={disabled || value <= 1} aria-label={t('decrease')} className={BUTTON}>
            <MinusIcon aria-hidden="true" className="size-4" />
          </button>
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            disabled={disabled}
            value={draft ?? String(value)}
            onChange={(event) => setDraft(event.target.value.replace(/\D/g, '').slice(0, 3))}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commit();
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                onChange(clamp(value + 1));
              }
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                onChange(clamp(value - 1));
              }
            }}
            className="w-12 border-x border-gray-300 bg-transparent text-center text-base font-semibold tabular-nums text-gray-900 outline-none focus-visible:bg-[#C8DDF2]/30"
          />
          <button type="button" onClick={() => onChange(clamp(value + 1))} disabled={disabled || atMax} aria-label={t('increase')} className={BUTTON}>
            <PlusIcon aria-hidden="true" className="size-4" />
          </button>
        </div>
        {atMax && !disabled && <span className="text-xs text-gray-700">{t('max', { max: limit })}</span>}
      </div>
      <span className="sr-only" aria-live="polite">
        {atMax && !disabled ? t('announceMax', { count: value, max: limit }) : t('announce', { count: value })}
      </span>
    </div>
  );
}
