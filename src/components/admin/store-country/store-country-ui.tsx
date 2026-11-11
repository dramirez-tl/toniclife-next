'use client';

// store-country-ui — Piezas compartidas de "Tienda en línea por país": la tarjeta de cada
// sección y cómo se pinta el estado de un punto (ícono + palabra; nunca solo el color).

import type { ComponentType, ReactNode, SVGProps } from 'react';
import { CircleAlert, CircleCheck, CircleHelp, Loader2, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { ReadinessState } from '@/lib/store-country/readiness';

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

interface SectionCardProps {
  /** Ancla de la sección (a ella llevan los enlaces de "¿Lista para vender?"). */
  id: string;
  icon: IconType;
  title: string;
  description?: ReactNode;
  /** Botón o enlace a la derecha del título. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Tarjeta de una sección, con el mismo aire que las de Almacenes y envíos. */
export function SectionCard({ id, icon: Icon, title, description, action, children, className }: SectionCardProps) {
  return (
    <Card id={id} className={`scroll-mt-24 ${className ?? ''}`}>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1 basis-64">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Icon aria-hidden className="size-5 shrink-0 text-[#3E667D]" />
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {action}
        </header>
        {children}
      </CardContent>
    </Card>
  );
}

export const STATE_LABELS: Record<ReadinessState, string> = {
  ok: 'Listo',
  attention: 'Revisar',
  missing: 'Falta',
  unknown: 'Sin dato',
};

const STATE_ICON: Record<ReadinessState, { icon: IconType; className: string }> = {
  ok: { icon: CircleCheck, className: 'text-emerald-600' },
  attention: { icon: TriangleAlert, className: 'text-amber-600' },
  missing: { icon: CircleAlert, className: 'text-red-600' },
  unknown: { icon: CircleHelp, className: 'text-muted-foreground' },
};

/** Ícono del estado; mientras se consulta, un indicador de espera. */
export function StateIcon({ state, pending = false, className = '' }: { state: ReadinessState; pending?: boolean; className?: string }) {
  if (pending) return <Loader2 aria-hidden className={`size-5 shrink-0 animate-spin text-muted-foreground ${className}`} />;
  const { icon: Icon, className: tone } = STATE_ICON[state];
  return <Icon aria-hidden className={`size-5 shrink-0 ${tone} ${className}`} />;
}

const STATE_BADGE: Record<ReadinessState, string> = {
  ok: 'border-emerald-200 bg-emerald-100 text-emerald-900',
  attention: 'border-amber-200 bg-amber-100 text-amber-900',
  missing: 'border-red-200 bg-red-100 text-red-900',
  unknown: 'border-border bg-muted text-muted-foreground',
};

/** La palabra del estado ("Listo", "Revisar", "Falta"… o la propia del punto), con contraste AA. */
export function StateBadge({ state, pending = false, label }: { state: ReadinessState; pending?: boolean; label?: string }) {
  return (
    <Badge variant="outline" className={pending ? STATE_BADGE.unknown : STATE_BADGE[state]}>
      {pending ? 'Consultando' : (label ?? STATE_LABELS[state])}
    </Badge>
  );
}

/** Caja de un aviso dentro de una sección, con el tono del estado. */
export const STATE_BOX: Record<ReadinessState, string> = {
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  attention: 'border-amber-200 bg-amber-50 text-amber-950',
  missing: 'border-red-200 bg-red-50 text-red-950',
  unknown: 'border-border bg-muted/50 text-foreground',
};
