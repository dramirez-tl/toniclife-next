'use client';

// Campo de SOLO LECTURA para los editores de kits y promociones.
//
// La clave del producto y sus datos fiscales (claves SAT, exención, regla
// fiscal) solo se cambian en la ficha del producto, donde el cambio pide
// confirmación o motivo y queda en el historial. Aquí se muestran y se enlaza
// a la sección correcta; estos editores ya NO los mandan en su PATCH.

import { useId } from 'react';
import Link from 'next/link';
import { ExternalLink, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ProductSectionId } from './lib/labels';

/** Ruta de la ficha nueva del producto, en la sección indicada. */
export const productFichaHref = (productId: string, section: ProductSectionId): string =>
  `/admin/productos/${productId}/editar?seccion=${section}`;

interface LockedProductFieldProps {
  label: string;
  value: string | null | undefined;
  /** Texto cuando no hay valor capturado. */
  emptyText?: string;
  mono?: boolean;
  className?: string;
}

export function LockedProductField({ label, value, emptyText = 'Sin capturar', mono, className }: LockedProductFieldProps) {
  const id = useId();
  const text = value && value.trim() !== '' ? value : '';
  return (
    <div className={className}>
      <Label htmlFor={id} className="mb-1 flex items-center gap-1.5">
        <Lock className="size-3.5 text-gray-600" aria-hidden="true" />
        {label}
        <span className="sr-only"> (solo lectura)</span>
      </Label>
      <Input
        id={id}
        readOnly
        value={text}
        placeholder={emptyText}
        className={`bg-gray-50 text-gray-800 ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}

interface LockedProductLinkProps {
  productId: string;
  section: ProductSectionId;
  /** Por qué no se edita aquí. */
  children: React.ReactNode;
  linkLabel: string;
}

/** Explicación + enlace visible a la ficha donde SÍ se puede cambiar. */
export function LockedProductLink({ productId, section, children, linkLabel }: LockedProductLinkProps) {
  return (
    <p className="mt-1.5 text-xs text-gray-700">
      {children}{' '}
      <Link
        href={productFichaHref(productId, section)}
        className="inline-flex min-h-6 items-center gap-1 font-semibold text-[#3E667D] underline underline-offset-2 hover:text-[#0A4B94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E667D] focus-visible:ring-offset-1 rounded-sm"
      >
        {linkLabel}
        <ExternalLink className="size-3.5" aria-hidden="true" />
      </Link>
    </p>
  );
}
