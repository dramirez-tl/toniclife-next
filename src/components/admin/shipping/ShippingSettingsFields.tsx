'use client';

// ShippingSettingsFields — Campos de costos de envío y envío gratis de un país.
//
// Los mismos en Configuración › Envíos y en Tienda en línea por país: dos costos (envío
// estándar y envío del kit; el exprés se dejó de ofrecer el 11-nov-2026) y el bloque
// "Envío gratis" con sus dos interruptores. No guarda nada: avisa cada cambio
// con `onChange`; el guardado lo hace quien lo usa (`useShippingSettingsForm`).

import { Switch } from '@/components/ui/switch';
import { formatCurrency } from '@/lib/currency';
import { freeShippingEffect, type ShippingFormValues } from '@/lib/store-country/shipping-costs';

interface ShippingSettingsFieldsProps {
  values: ShippingFormValues;
  onChange: (patch: Partial<ShippingFormValues>) => void;
  /** Moneda del país (ISO 4217) para las etiquetas y la frase "Así queda". */
  currency: string;
  /** false = el servidor aún no admite los interruptores del envío gratis (API anterior). */
  flagsSupported: boolean;
}

const INPUT_CLASS =
  'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent';

export function ShippingSettingsFields({ values, onChange, currency, flagsSupported }: ShippingSettingsFieldsProps) {
  // Texto con la moneda del país para las frases de ayuda ("$1,500.00").
  const freeShippingAmount = formatCurrency(values.freeShippingThreshold, currency);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Costo de Envío Estándar ({currency})
          </label>
          <input
            type="number"
            min={0}
            value={values.standardShippingCost}
            onChange={(e) => onChange({ standardShippingCost: parseFloat(e.target.value) || 0 })}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Costo de Envío del Kit de Inscripción ({currency})
          </label>
          <input
            type="number"
            min={0}
            value={values.kitShippingCost}
            onChange={(e) => onChange({ kitShippingCost: parseFloat(e.target.value) || 0 })}
            className={INPUT_CLASS}
          />
          <p className="mt-1 text-xs text-gray-400">
            Se cobra cuando el miembro elige envío a domicilio para su kit.
          </p>
        </div>
      </div>

      {/* Envío gratis por monto: se enciende por país y, aparte, para
          distribuidores. Regla del API: el envío estándar es gratis solo si
          está encendido Y la compra llega al monto mínimo Y (quien compra no
          es distribuidor O también aplica a distribuidores). */}
      <div className="rounded-xl border border-gray-200 p-5">
        <h3 className="text-base font-semibold text-gray-900">Envío gratis</h3>
        <p className="mt-1 text-sm text-gray-500">
          Aplica al envío estándar a domicilio, que es el único que ofrece la
          tienda. El envío del kit de inscripción siempre se cobra.
        </p>

        <label className="mt-5 flex items-start gap-3">
          <Switch
            checked={values.freeShippingEnabled}
            onCheckedChange={(v) => onChange({ freeShippingEnabled: v })}
            disabled={!flagsSupported}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium text-gray-900">
              Envío gratis a partir del monto mínimo
            </span>
            <span className="block text-xs text-gray-500">
              Encendido: la compra que llega al monto mínimo no paga envío
              estándar. Apagado: todas las compras lo pagan.
            </span>
          </span>
        </label>

        <div
          className={`mt-4 pl-11 transition-opacity ${
            values.freeShippingEnabled ? '' : 'opacity-50'
          }`}
        >
          <label
            htmlFor="free-shipping-threshold"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Monto mínimo para envío gratis ({currency})
          </label>
          <input
            id="free-shipping-threshold"
            type="number"
            min={0}
            value={values.freeShippingThreshold}
            disabled={!values.freeShippingEnabled}
            onChange={(e) => onChange({ freeShippingThreshold: parseFloat(e.target.value) || 0 })}
            className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent disabled:cursor-not-allowed disabled:bg-gray-100"
          />
          <p className="mt-1 text-xs text-gray-400">
            Se compara con el subtotal de la compra.
            {!values.freeShippingEnabled &&
              ' No se usa mientras el envío gratis esté apagado.'}
          </p>
        </div>

        <label
          className={`mt-5 flex items-start gap-3 transition-opacity ${
            values.freeShippingEnabled ? '' : 'opacity-50'
          }`}
        >
          <Switch
            checked={values.freeShippingForDistributors}
            onCheckedChange={(v) => onChange({ freeShippingForDistributors: v })}
            disabled={!flagsSupported || !values.freeShippingEnabled}
            className="mt-0.5"
          />
          <span>
            <span className="block text-sm font-medium text-gray-900">
              También aplica a distribuidores
            </span>
            <span className="block text-xs text-gray-500">
              Encendido: los distribuidores también reciben el envío gratis
              al llegar al monto mínimo. Apagado: siempre pagan envío estándar.
            </span>
          </span>
        </label>

        <p
          className="mt-5 rounded-lg bg-[#C8DDF2]/25 px-4 py-3 text-sm text-[#2f5165]"
          aria-live="polite"
        >
          <span className="font-semibold">Así queda: </span>
          {freeShippingEffect(
            values.freeShippingEnabled,
            values.freeShippingForDistributors,
            values.freeShippingThreshold,
            freeShippingAmount,
          )}
        </p>

        {!flagsSupported && (
          <p className="mt-3 text-xs text-amber-700">
            El servidor todavía no admite estos interruptores: por ahora aplica
            la regla de siempre. Se podrán cambiar en cuanto se actualice.
          </p>
        )}
      </div>
    </div>
  );
}
