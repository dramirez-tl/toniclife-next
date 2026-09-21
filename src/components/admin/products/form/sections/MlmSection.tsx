'use client';

// (11) MLM — SOLO LECTURA (zona de máximo cuidado). Los puntos que acredita una
// venta salen de `product_prices.points` por país y tipo de precio (sección
// Precios), no de estos campos del producto; el API ignora cualquier intento
// de cambiarlos desde la ficha.

import { useProductForm } from '../ProductFormContext';
import { SectionCard } from '../SectionCard';

const format = (v: string | number | null | undefined): string => {
  if (v === null || v === undefined || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(n) : '—';
};

export function MlmSection() {
  const { product, goToSection } = useProductForm();
  return (
    <SectionCard
      title="MLM"
      description="Datos de referencia del plan de compensación. No se editan desde la ficha."
    >
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 p-4">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-600">Puntos del producto</dt>
          <dd className="mt-1 text-2xl font-bold text-gray-900">{format(product?.pointsValue)}</dd>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-600">Volumen de negocio</dt>
          <dd className="mt-1 text-2xl font-bold text-gray-900">{format(product?.businessVolume)}</dd>
        </div>
        <div className="rounded-lg border border-gray-200 p-4">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-600">Califica para comisiones</dt>
          <dd className="mt-1 text-2xl font-bold text-gray-900">
            {product?.qualifiesForCommission === false ? 'No' : 'Sí'}
          </dd>
        </div>
      </dl>
      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900" role="note">
        Los puntos y el valor de negocio que acredita cada venta se capturan por país y tipo de precio en{' '}
        <button
          type="button"
          onClick={() => goToSection('precios')}
          className="font-semibold underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
        >
          Precios
        </button>
        . Estos valores a nivel producto son solo de referencia; cambiarlos requiere al equipo de Sistemas.
      </div>
    </SectionCard>
  );
}
