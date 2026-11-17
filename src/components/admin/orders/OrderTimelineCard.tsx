'use client';

// OrderTimelineCard - "Seguimiento del pedido" en la ficha del admin (17-nov-2026): una línea
// con lo que ya pasó y lo que falta, del pedido creado a la entrega. Pago con tarjeta u OXXO
// (ficha generada, pago recibido) y los estatus que ve la sucursal en el punto de venta (por
// surtir, listo para recoger, entregado). En pantalla ancha va horizontal; en teléfono, vertical.
// Solo pinta lo que manda GET /orders/:id/timeline.

import { CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import {
  STEP_DOT,
  STEP_TITLE,
  TONE_BADGE,
  dueText,
  isOverdue,
  isReached,
  stepWhen,
} from '@/lib/orders/order-timeline';
import type { OrderTimeline, OrderTimelineStep } from '@/types/order-timeline';

const LINE_ON = 'bg-emerald-500';
const LINE_OFF = 'bg-gray-200';

function StepDot({ step }: { step: OrderTimelineStep }) {
  return (
    <span
      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${STEP_DOT[step.state]}`}
      aria-hidden
    >
      {step.state === 'done' && <CheckIcon className="h-4 w-4" />}
      {step.state === 'problem' && <ExclamationTriangleIcon className="h-4 w-4" />}
      {step.state === 'current' && <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#3E667D]" />}
      {step.state === 'upcoming' && <span className="h-2 w-2 rounded-full bg-gray-300" />}
    </span>
  );
}

function StepText({ step, centered }: { step: OrderTimelineStep; centered: boolean }) {
  const due = dueText(step.dueAt);
  return (
    <div className={`min-w-0 ${centered ? 'px-2 text-center' : ''}`}>
      <p className={`text-sm font-semibold leading-snug ${STEP_TITLE[step.state]}`}>{step.title}</p>
      <p className={`mt-0.5 text-xs ${step.state === 'current' ? 'font-medium text-[#3E667D]' : 'text-gray-500'}`}>
        {stepWhen(step)}
      </p>
      {step.detail && <p className="mt-1 break-words text-xs text-gray-500">{step.detail}</p>}
      {due && (
        <p className={`mt-1 text-xs font-medium ${isOverdue(step.dueAt) ? 'text-red-600' : 'text-amber-700'}`}>{due}</p>
      )}
    </div>
  );
}

export function OrderTimelineCard({ timeline }: { timeline: OrderTimeline }) {
  const { steps, headline } = timeline;
  return (
    <section className="rounded-lg bg-white p-6 shadow" aria-label="Seguimiento del pedido">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Seguimiento del pedido</h2>
          <p className="text-sm text-gray-500">Pago y entrega, paso por paso</p>
        </div>
        <div className="text-right">
          <span
            className={`inline-block rounded-full border px-4 py-1.5 text-sm font-semibold ${TONE_BADGE[headline.tone]}`}
          >
            {headline.label}
          </span>
          {headline.detail && <p className="mt-1 max-w-xs text-xs text-gray-500">{headline.detail}</p>}
        </div>
      </div>

      {/* Pantalla ancha: línea horizontal */}
      <ol className="hidden lg:flex">
        {steps.map((step, i) => {
          const next = steps[i + 1];
          return (
            <li
              key={step.key}
              className="flex min-w-0 flex-1 flex-col items-center"
              aria-current={step.state === 'current' ? 'step' : undefined}
            >
              <div className="relative mb-3 flex w-full items-center justify-center">
                {i > 0 && (
                  <span
                    className={`absolute left-0 right-1/2 top-1/2 h-0.5 -translate-y-1/2 ${isReached(step.state) ? LINE_ON : LINE_OFF}`}
                  />
                )}
                {next && (
                  <span
                    className={`absolute left-1/2 right-0 top-1/2 h-0.5 -translate-y-1/2 ${isReached(next.state) ? LINE_ON : LINE_OFF}`}
                  />
                )}
                <StepDot step={step} />
              </div>
              <StepText step={step} centered />
            </li>
          );
        })}
      </ol>

      {/* Teléfono y tableta: línea vertical */}
      <ol className="lg:hidden">
        {steps.map((step, i) => {
          const next = steps[i + 1];
          return (
            <li key={step.key} className="flex gap-3" aria-current={step.state === 'current' ? 'step' : undefined}>
              <div className="flex flex-col items-center">
                <StepDot step={step} />
                {next && <span className={`my-1 w-0.5 flex-1 ${isReached(next.state) ? LINE_ON : LINE_OFF}`} />}
              </div>
              <div className={next ? 'pb-5' : ''}>
                <StepText step={step} centered={false} />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
