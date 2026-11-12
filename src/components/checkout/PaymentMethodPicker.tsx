'use client';

// PaymentMethodPicker — Forma de pago en el paso "Pago" del checkout cuando la tienda ofrece
// OXXO (12-nov-2026): tarjeta (la de siempre; llega elegida) o efectivo en OXXO. Si la
// tienda NO ofrece OXXO este componente no se pinta: queda la tarjeta sola, como antes.
// OXXO fuera del rango de Stripe se muestra, no se puede elegir y dice por qué; se puede
// llegar a él con el teclado para leer el motivo (`aria-disabled`, no `disabled`).
// Elegido OXXO se explica cómo funciona antes de generar la ficha.
// Si se ofrece y si se puede elegir lo decide `lib/checkout/payment-options`.

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { BanknotesIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { LanguageCode } from '@/i18n/config';
import { oxxoPreviewDeadlineDay, type OxxoConfig, type OxxoOption } from '@/lib/checkout/payment-options';
import { cn } from '@/lib/utils';
import { PaymentMethod } from '@/types/cart';

// Tarjetas con el mismo aspecto que la tarjeta única de siempre. En celular (360 px) el
// espacio y el icono van más justos para que "Tarjeta de Crédito/Débito" quepa en un renglón.
const OPTION =
  'flex items-start gap-2 rounded-lg border-2 p-4 transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#a7c1e2] has-[:focus-visible]:ring-offset-1 sm:gap-3';
const OPTION_ON = 'cursor-pointer border-[#a7c1e2] bg-[#C8DDF2]/5';
const OPTION_OFF = 'cursor-pointer border-gray-200 hover:border-gray-300';
const OPTION_DISABLED = 'cursor-not-allowed border-gray-200 bg-gray-50';
const ICON = 'mt-0.5 h-5 w-5 flex-shrink-0 sm:mt-0 sm:h-6 sm:w-6';
/** El círculo del radio, con un borde que se distinga sobre la tarjeta blanca. */
const RADIO = 'mt-1 border-gray-400 bg-white data-[state=checked]:border-[#3E667D]';

interface PaymentMethodPickerProps {
  /** Forma de pago elegida. */
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  /** Si OXXO se puede elegir con el total de este pedido (`oxxoOption`). */
  oxxo: OxxoOption;
  /** Vigencia de la ficha y límites del pago en OXXO (`readOxxoConfig`). */
  config: OxxoConfig;
  /** Escribe un monto con la moneda del pedido. */
  formatAmount: (amount: number) => string;
  lang: LanguageCode;
  /** El pedido se está enviando: la forma de pago ya no se cambia. */
  disabled?: boolean;
}

export function PaymentMethodPicker({
  value,
  onChange,
  oxxo,
  config,
  formatAmount,
  lang,
  disabled = false,
}: PaymentMethodPickerProps) {
  const t = useTranslations('checkout');
  const uid = useId();
  const cardId = `${uid}-card`;
  const oxxoId = `${uid}-oxxo`;

  const oxxoChosen = value === PaymentMethod.OXXO && oxxo.selectable;
  const reason =
    oxxo.reason === 'below_min'
      ? t('oxxo.belowMin', { amount: formatAmount(config.minAmount) })
      : oxxo.reason === 'above_max'
        ? t('oxxo.aboveMax', { amount: formatAmount(config.maxAmount) })
        : null;

  return (
    <div>
      <RadioGroup
        value={value}
        onValueChange={(next) => {
          if (next !== PaymentMethod.OXXO) onChange(PaymentMethod.STRIPE);
          // OXXO fuera de rango recibe el foco (para leer el motivo) pero no se elige.
          else if (oxxo.selectable) onChange(PaymentMethod.OXXO);
        }}
        disabled={disabled}
        aria-label={t('paymentTitle')}
        className="gap-3"
      >
        <label htmlFor={cardId} className={cn(OPTION, value === PaymentMethod.STRIPE ? OPTION_ON : OPTION_OFF)}>
          <RadioGroupItem
            id={cardId}
            value={PaymentMethod.STRIPE}
            aria-labelledby={`${cardId}-title`}
            aria-describedby={`${cardId}-desc`}
            className={RADIO}
          />
          <CreditCardIcon aria-hidden="true" className={cn(ICON, 'text-[#3E667D]')} />
          <span className="min-w-0">
            <span id={`${cardId}-title`} className="block font-medium text-gray-900">
              {t('card')}
            </span>
            <span id={`${cardId}-desc`} className="block text-xs text-gray-500">
              {t('cardDesc')}
            </span>
          </span>
        </label>

        <label
          htmlFor={oxxoId}
          className={cn(OPTION, !oxxo.selectable ? OPTION_DISABLED : oxxoChosen ? OPTION_ON : OPTION_OFF)}
        >
          <RadioGroupItem
            id={oxxoId}
            value={PaymentMethod.OXXO}
            aria-disabled={!oxxo.selectable || undefined}
            aria-labelledby={`${oxxoId}-title`}
            aria-describedby={reason ? `${oxxoId}-desc ${oxxoId}-reason` : `${oxxoId}-desc`}
            className={cn(RADIO, 'aria-disabled:cursor-not-allowed aria-disabled:opacity-60')}
          />
          <BanknotesIcon
            aria-hidden="true"
            className={cn(ICON, oxxo.selectable ? 'text-[#3E667D]' : 'text-gray-400')}
          />
          <span className="min-w-0">
            <span
              id={`${oxxoId}-title`}
              className={cn('block font-medium', oxxo.selectable ? 'text-gray-900' : 'text-gray-600')}
            >
              {t('oxxo.label')}
            </span>
            <span id={`${oxxoId}-desc`} className="block text-xs text-gray-500">
              {t('oxxo.desc')}
            </span>
            {reason && (
              <span id={`${oxxoId}-reason`} className="mt-1 block text-xs font-medium text-amber-800">
                {reason}
              </span>
            )}
          </span>
        </label>
      </RadioGroup>

      {/* Cómo funciona, solo con OXXO elegido. La región ya existe para que al aparecer se anuncie. */}
      <div aria-live="polite">
        {oxxoChosen && (
          <div className="mt-3 rounded-lg border border-[#a7c1e2]/60 bg-[#C8DDF2]/15 p-4 text-sm text-gray-700">
            <p className="font-semibold text-[#2f5165]">{t('oxxo.howTitle')}</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>{t('oxxo.howVoucher')}</li>
              <li>
                {t('oxxo.howDeadline', {
                  days: config.expiresAfterDays,
                  // Hoy en hora del centro de México más la vigencia; la fecha real la pone Stripe.
                  date: oxxoPreviewDeadlineDay(config.expiresAfterDays, lang),
                })}
              </li>
              <li>{t('oxxo.howConfirmation')}</li>
              <li>{t('oxxo.howLimit', { amount: formatAmount(config.maxAmount) })}</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
