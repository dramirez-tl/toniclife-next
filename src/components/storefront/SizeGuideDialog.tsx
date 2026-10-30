'use client';

// Guía de tallas de la familia (Dialog de shadcn): primera columna "Talla" y
// después las medidas de la guía, con la unidad en el encabezado y las notas al
// pie. Pinta su propio botón disparador (va debajo del selector de talla). Esc y
// la X la cierran (Radix); con muchas columnas la tabla se desplaza en horizontal
// y la talla queda fija a la izquierda.

import { useTranslations } from 'next-intl';
import { RulerIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { StorefrontSizeGuide } from '@/types/storefront';

interface SizeGuideDialogProps {
  guide: StorefrontSizeGuide;
  /** Clases del botón que abre la guía. */
  className?: string;
}

export function SizeGuideDialog({ guide, className }: SizeGuideDialogProps) {
  const t = useTranslations('storefront.product.variants');
  const unit = guide.unit === 'in' ? t('unit.in') : t('unit.cm');
  const title = guide.name ? t('sizeGuideTitle', { name: guide.name }) : t('sizeGuide');

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            'h-auto min-h-11 w-fit cursor-pointer px-2 text-sm font-medium text-[#2f5165] underline-offset-4 hover:underline',
            className,
          )}
        >
          <RulerIcon aria-hidden="true" className="size-5" />
          {t('sizeGuide')}
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="px-6 pt-6 pb-3 text-left">
          <DialogTitle className="pr-8 text-[#3E667D]">{title}</DialogTitle>
          <DialogDescription>{t('measurementsNote', { unit })}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60dvh] overflow-auto px-6 pb-6">
          <table className="w-full border-collapse text-sm text-gray-900">
            <thead>
              <tr className="border-b border-gray-200">
                <th scope="col" className="sticky left-0 bg-white py-2 pr-3 text-left font-semibold">
                  {t('size')}
                </th>
                {guide.columns.map((column) => (
                  <th key={column.key} scope="col" className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guide.rows.map((row) => (
                <tr key={row.size} className="border-b border-gray-100 last:border-0">
                  <th scope="row" className="sticky left-0 bg-white py-2 pr-3 text-left font-semibold text-[#2f5165]">
                    {row.sizeLabel}
                  </th>
                  {guide.columns.map((column) => (
                    <td key={column.key} className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                      {row.values[column.key] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {guide.notes && <p className="mt-4 text-sm whitespace-pre-line text-gray-700">{guide.notes}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
