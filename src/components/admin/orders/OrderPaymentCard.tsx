'use client';

// OrderPaymentCard - Tarjeta "Pago" de la ficha del pedido (17-nov-2026): con qué se pagó
// (tarjeta u OXXO, los dos por Stripe), en qué estado está y sus fechas. Con OXXO: cuándo se
// generó la ficha, su referencia, cuándo vence y la liga para verla. Solo lectura: no cobra ni
// cambia nada del pago. Datos de GET /orders/:id/timeline.

import { toast } from 'sonner';
import {
  ArrowTopRightOnSquareIcon,
  BanknotesIcon,
  ClipboardDocumentIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import { paymentBadgeClass, paymentFacts, timelineMoney } from '@/lib/orders/order-timeline';
import type { OrderTimelinePayment } from '@/types/order-timeline';

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copiado');
  } catch {
    toast.error('No se pudo copiar');
  }
}

export function OrderPaymentCard({ payment }: { payment: OrderTimelinePayment }) {
  const Icon = payment.kind === 'oxxo' ? BanknotesIcon : CreditCardIcon;
  const amount = timelineMoney(payment.amount, payment.currencyCode);
  const facts = paymentFacts(payment);
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-gray-900">Pago</h2>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${paymentBadgeClass(payment.state)}`}>
          {payment.stateLabel}
        </span>
      </div>

      <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#3E667D] shadow-sm">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{payment.methodLabel}</p>
          {amount && <p className="text-sm tabular-nums text-gray-600">{amount}</p>}
        </div>
      </div>

      {facts.length > 0 && (
        <dl className="mt-4 space-y-2 text-sm">
          {facts.map((fact) => (
            <div key={fact.label} className="flex items-start justify-between gap-3">
              <dt className="shrink-0 text-gray-500">{fact.label}</dt>
              <dd
                className={`flex min-w-0 items-center gap-1 text-right ${fact.mono ? 'font-mono text-xs' : ''} ${fact.tone === 'danger' ? 'font-medium text-red-600' : 'text-gray-900'}`}
              >
                <span className="break-all">{fact.value}</span>
                {fact.copy && (
                  <button
                    type="button"
                    onClick={() => void copyText(fact.copy as string)}
                    className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    title={`Copiar ${fact.label.toLowerCase()}`}
                    aria-label={`Copiar ${fact.label.toLowerCase()}`}
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  </button>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {payment.voucherUrl && (
        <a
          href={payment.voucherUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#3E667D] hover:underline"
        >
          Ver la ficha de OXXO
          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
        </a>
      )}

      {payment.state === 'voucher_issued' && (
        <p className="mt-3 text-xs text-gray-500">
          Un pago en OXXO se confirma hasta el siguiente día hábil. Mientras tanto las piezas siguen apartadas.
        </p>
      )}
      {payment.state === 'none' && (
        <p className="mt-3 text-xs text-gray-500">Este pedido no tiene un pago registrado en el sistema.</p>
      )}
    </div>
  );
}
