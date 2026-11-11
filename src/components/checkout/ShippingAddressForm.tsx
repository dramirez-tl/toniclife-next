'use client';

// ShippingAddressForm — Formulario de la dirección de envío del checkout (10-nov-2026).
// Los campos son los del PAÍS de la tienda (`lib/address-forms`, los mismos del alta en
// POS, portal y admin) y el estado / departamento sale del catálogo del API
// (GET /states?countryId=), no de listas fijas. Qué campos lleva cada país, cuáles son
// obligatorios y el formato del código postal los decide `lib/checkout/shipping-address`;
// aquí solo se pintan, con los textos en el idioma de la tienda.

import { useTranslations } from 'next-intl';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  checkoutAddressFields,
  type AddressDraft,
  type AddressDraftError,
  type AddressFieldSpan,
  type AddressFormKey,
  type AddressFormMode,
  type StateOption,
} from '@/lib/checkout/shipping-address';

/** Rejilla de 6 columnas: en teléfono cada campo ocupa su renglón. */
const SPAN_CLASS: Record<AddressFieldSpan, string> = {
  wide: 'col-span-6 sm:col-span-4',
  companion: 'col-span-6 sm:col-span-2',
  half: 'col-span-6 md:col-span-3',
  third: 'col-span-6 md:col-span-2',
  full: 'col-span-6',
};

/** Formato de solo dígitos (`^\d{5}$`): teclado numérico en el teléfono. El ZIP+4 de EE. UU. lleva guion y no entra aquí. */
const DIGITS_ONLY = /^\^\\d\{\d+\}\$$/;

/** id del control de un campo (para el `<Label>` y para llevar el foco al que falta). */
export const addressFieldId = (key: AddressFormKey): string => `checkout-address-${key}`;

/**
 * Textos del formulario según el país de la tienda: cada país nombra sus campos a su
 * manera (Colonia / Zona / Barrio, Estado / Departamento) y, si no tiene texto propio,
 * usa el general.
 */
export function useAddressFormTexts(countryCode: string) {
  const t = useTranslations('checkout.addressForm');
  const country = countryCode.toUpperCase();
  const label = (key: AddressFormKey): string =>
    t.has(`fields.${country}.${key}`) ? t(`fields.${country}.${key}`) : t(`fields.default.${key}`);
  const zipHint = t.has(`zipHint.${country}`) ? t(`zipHint.${country}`) : null;
  const errorText = (error: AddressDraftError): string => {
    if (error.reason === 'pattern') {
      return error.field === 'zipCode' && zipHint
        ? t('errors.zipCode', { hint: zipHint })
        : t('errors.invalid', { field: label(error.field) });
    }
    return t(error.field === 'state' ? 'errors.select' : 'errors.required', { field: label(error.field) });
  };
  return { t, label, zipHint, errorText };
}

interface ShippingAddressFormProps {
  /** País de la tienda (ISO2): define los campos. */
  countryCode: string;
  /** `complete` = se completa una guardada: solo son obligatorios calle, ciudad, estado y C. P. */
  mode?: AddressFormMode;
  draft: AddressDraft;
  onChange: (patch: Partial<AddressDraft>) => void;
  /** Opciones del catálogo de estados; vacío = se captura a mano. */
  stateOptions: StateOption[];
  statesLoading?: boolean;
  /** Primer problema encontrado al intentar continuar. */
  error?: AddressDraftError | null;
  saveAddress: boolean;
  onSaveAddressChange: (save: boolean) => void;
  /** Encabezado (solo cuando el formulario convive con las direcciones guardadas). */
  title?: string;
  hint?: string;
}

export function ShippingAddressForm({
  countryCode,
  mode = 'new',
  draft,
  onChange,
  stateOptions,
  statesLoading = false,
  error,
  saveAddress,
  onSaveAddressChange,
  title,
  hint,
}: ShippingAddressFormProps) {
  const { t, label, zipHint, errorText } = useAddressFormTexts(countryCode);
  const fields = checkoutAddressFields(countryCode, mode);

  return (
    <div className="space-y-4">
      {title && (
        <div>
          <p className="text-sm font-medium text-gray-700">{title}</p>
          {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
        </div>
      )}

      <div className="grid grid-cols-6 gap-4">
        {fields.map((field) => {
          const id = addressFieldId(field.key);
          const fieldError = error && error.field === field.key ? error : null;
          const invalid = fieldError !== null;
          const helpId = `${id}-help`;
          const help = fieldError ? errorText(fieldError) : field.key === 'zipCode' ? zipHint : null;
          const placeholder =
            field.placeholder ??
            (field.key === 'intNumber'
              ? t('intNumberPlaceholder')
              : field.key === 'reference'
                ? t('referencePlaceholder')
                : undefined);
          return (
            <div key={field.key} className={`${SPAN_CLASS[field.span]} space-y-1.5`}>
              <Label htmlFor={id}>
                {label(field.key)}
                {field.required ? ' *' : ''}
              </Label>
              {field.key === 'state' && (statesLoading || stateOptions.length > 0) ? (
                <SearchableSelect
                  id={id}
                  options={stateOptions}
                  value={draft.state}
                  onChange={(value) => onChange({ state: value })}
                  showAllOption={false}
                  disabled={statesLoading && stateOptions.length === 0}
                  placeholder={statesLoading && stateOptions.length === 0 ? t('stateLoading') : t('statePlaceholder')}
                  className="w-full"
                  aria-invalid={invalid}
                  aria-describedby={help ? helpId : undefined}
                />
              ) : (
                <Input
                  id={id}
                  type="text"
                  value={draft[field.key]}
                  onChange={(e) => onChange({ [field.key]: e.target.value })}
                  placeholder={placeholder}
                  maxLength={field.maxLength}
                  inputMode={field.pattern && DIGITS_ONLY.test(field.pattern) ? 'numeric' : undefined}
                  autoComplete={field.key === 'zipCode' ? 'postal-code' : undefined}
                  aria-required={field.required || undefined}
                  aria-invalid={invalid || undefined}
                  aria-describedby={help ? helpId : undefined}
                />
              )}
              {help && (
                <p id={helpId} className={`text-xs ${invalid ? 'text-red-600' : 'text-gray-400'}`}>
                  {help}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <label className="flex cursor-pointer items-start gap-3">
        <Checkbox
          checked={saveAddress}
          onCheckedChange={(checked) => onSaveAddressChange(checked === true)}
          className="mt-0.5"
        />
        <span className="text-sm text-gray-700">{t('save')}</span>
      </label>
    </div>
  );
}
