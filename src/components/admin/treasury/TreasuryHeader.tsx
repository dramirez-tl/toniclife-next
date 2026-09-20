'use client';

// TreasuryHeader — cabecera plana común de Tesorería (patrón
// facturacion/preparacion + rrhh/empleados): icono + h1 text-2xl + subtítulo
// y acciones a la derecha. Tokens shadcn, sin colores fijos.

import type { ReactNode } from 'react';

interface TreasuryHeaderProps {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  subtitle?: ReactNode;
  /** Aviso corto bajo el subtítulo (p. ej. modo solo lectura). */
  note?: ReactNode;
  actions?: ReactNode;
}

export function TreasuryHeader({ icon: Icon, title, subtitle, note, actions }: TreasuryHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <Icon className="mt-1 h-8 w-8 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
          {note && <p className="mt-1 text-xs text-amber-700">{note}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
