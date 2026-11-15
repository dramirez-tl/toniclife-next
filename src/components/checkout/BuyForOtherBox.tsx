// BuyForOtherBox — "Tu número de distribuidor" del paso Datos, con la opción de COMPRAR
// PARA OTRO DISTRIBUIDOR (15-nov-2026).
//
// Por omisión es la tarjeta de siempre: el número de quien compra, solo lectura. Si el
// servidor lo ofrece (`available`), agrega "Comprar para otro distribuidor": se escribe el
// número, la tienda muestra a quién corresponde y, al confirmar, la compra y sus puntos
// se registran a esa persona (quien compra la paga). La lógica vive en
// lib/checkout/buy-for-other; aquí solo va la pantalla. No es un <form>: vive dentro del
// formulario de "Datos".
'use client';

import { useState } from 'react';
import { IdentificationIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLookupBeneficiary } from '@/hooks/useCart';
import {
  beneficiaryErrorKey,
  beneficiaryLabel,
  distributorNumberInput,
  numberProblem,
  type BeneficiaryErrorKey,
} from '@/lib/checkout/buy-for-other';
import type { CheckoutBeneficiary } from '@/types/cart';

interface BuyForOtherBoxProps {
  /** Número del distribuidor en sesión. */
  ownNumber: string;
  /** El servidor ofrece comprar para otro distribuidor en esta compra. */
  available: boolean;
  /** Para quién es la compra; null = para la cuenta en sesión. */
  beneficiary: CheckoutBeneficiary | null;
  onChange: (beneficiary: CheckoutBeneficiary | null) => void;
  /** Se está escribiendo un número que aún no se busca (para no continuar a medias). */
  onPendingChange?: (pending: boolean) => void;
  /** País de la tienda: el mismo que viaja al pagar. */
  countryId?: string;
}

const LINK_BUTTON =
  'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-sm text-sm font-medium text-[#3E667D] underline underline-offset-2 hover:text-[#2f5165]';

export function BuyForOtherBox({
  ownNumber,
  available,
  beneficiary,
  onChange,
  onPendingChange,
  countryId,
}: BuyForOtherBoxProps) {
  const t = useTranslations('checkout');
  const lookup = useLookupBeneficiary();
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState<BeneficiaryErrorKey | 'empty' | 'own' | null>(null);

  const setDraft = (open: boolean, value = '') => {
    setEditing(open);
    setInput(value);
    setError(null);
    onPendingChange?.(open && value !== '');
  };

  const search = async () => {
    const problem = numberProblem(input, ownNumber);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    try {
      const found = await lookup.mutateAsync({ customerNumber: distributorNumberInput(input), countryId });
      onChange(found);
      setDraft(false);
    } catch (err) {
      setError(beneficiaryErrorKey(err));
    }
  };

  return (
    <div className="pt-4 border-t border-gray-200 space-y-3">
      <div className="flex items-start gap-3 rounded-lg border border-[#a7c1e2]/30 bg-[#C8DDF2]/10 p-4">
        <IdentificationIcon aria-hidden="true" className="h-6 w-6 flex-shrink-0 text-[#3E667D]" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-700">{t('distributor.label')}</p>
          <p className="font-mono text-lg font-semibold text-[#3E667D]">{ownNumber}</p>
          {!beneficiary && <p className="mt-1 text-xs text-gray-500">{t('distributor.note')}</p>}
          {available && !beneficiary && !editing && (
            <button type="button" onClick={() => setDraft(true)} className={`mt-2 ${LINK_BUTTON}`}>
              <UserPlusIcon aria-hidden="true" className="h-4 w-4" />
              {t('buyForOther.action')}
            </button>
          )}
        </div>
      </div>

      {available && editing && !beneficiary && (
        <div className="rounded-lg border border-gray-200 p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="checkout-beneficiary-number">{t('buyForOther.inputLabel')}</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="checkout-beneficiary-number"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                autoFocus
                value={input}
                placeholder={t('buyForOther.inputPlaceholder')}
                aria-invalid={error ? true : undefined}
                aria-describedby="checkout-beneficiary-help"
                onChange={(e) => {
                  const value = distributorNumberInput(e.target.value);
                  setInput(value);
                  setError(null);
                  onPendingChange?.(value !== '');
                }}
                onKeyDown={(e) => {
                  // Enter busca; no envía el formulario de "Datos".
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void search();
                  }
                }}
                className="sm:max-w-xs"
              />
              <div className="flex gap-2">
                <Button type="button" onClick={() => void search()} disabled={lookup.isPending}>
                  {lookup.isPending && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                  {lookup.isPending ? t('buyForOther.searching') : t('buyForOther.search')}
                </Button>
                <Button type="button" variant="outline" onClick={() => setDraft(false)} disabled={lookup.isPending}>
                  {t('buyForOther.cancel')}
                </Button>
              </div>
            </div>
          </div>
          <p
            id="checkout-beneficiary-help"
            role={error ? 'alert' : undefined}
            className={error ? 'text-sm text-red-600' : 'text-xs text-gray-500'}
          >
            {error ? t(`buyForOther.errors.${error}`) : t('buyForOther.inputHint')}
          </p>
        </div>
      )}

      {beneficiary && (
        <div className="rounded-lg border border-[#a7c1e2] bg-[#C8DDF2]/15 p-4" role="status">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#2f5165]">
            {t('buyForOther.selectedTitle')}
          </p>
          <p className="break-words text-base font-semibold text-gray-900">{beneficiaryLabel(beneficiary)}</p>
          <p className="mt-1 text-sm text-gray-600">{t('buyForOther.selectedNote')}</p>
          <div className="mt-2 flex flex-wrap gap-x-4">
            {available && (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setDraft(true);
                }}
                className={LINK_BUTTON}
              >
                {t('buyForOther.change')}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setDraft(false);
              }}
              className={LINK_BUTTON}
            >
              {t('buyForOther.remove')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
