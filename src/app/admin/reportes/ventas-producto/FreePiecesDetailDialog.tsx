'use client';

// Ventana con el detalle de las piezas GRATIS de un producto por una promoción de temporada,
// venta por venta (Diego, 14-nov-2026: "para saber que sí son las 100 piezas gratis en las 77
// ventas; solo para aclaraciones"). Se abre al hacer clic en un renglón de "Piezas gratis por
// promociones de temporada". No consulta nada: arma el detalle con los renglones que el reporte
// ya trae (`lib/free-pieces-detail`), y dice si suma lo mismo que el resumen.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { PermissionGuard } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  filterFreePiecesSales,
  freePiecesBreakdownText,
  freePiecesDetail,
  orderFreePiecesSales,
} from '@/lib/free-pieces-detail';
import type { FreeByPromotionRow, ProductSalesSummary } from '@/types/reports';
import { formatAmount, formatDateDisplay, formatUnits } from './format';

interface FreePiecesDetailDialogProps {
  /** Renglón del resumen que se abrió. */
  row: FreeByPromotionRow;
  /** El producto con sus renglones de venta, tal como lo trae el reporte. */
  product: ProductSalesSummary | undefined;
  /** "Todas las sucursales · 14/11/2026". */
  scopeLabel: string;
  /** Con todas las sucursales se muestra de cuál es cada venta. */
  showBranch: boolean;
  onClose: () => void;
}

/** Quien puede abrir Reportes › Ventas ve el folio como liga (misma regla que el menú). */
const SALES_REPORT_PERMISSIONS = ['reports:read', 'reports', 'reports.sales'];

export function FreePiecesDetailDialog({ row, product, scopeLabel, showBranch, onClose }: FreePiecesDetailDialogProps) {
  const [search, setSearch] = useState('');
  // Por hora (como se vendió) o con las ventas que más piezas gratis llevaron hasta arriba.
  const [order, setOrder] = useState<'time' | 'free'>('time');
  const detail = useMemo(() => freePiecesDetail(row, product), [row, product]);
  const shown = useMemo(
    () => orderFreePiecesSales(filterFreePiecesSales(detail.sales, search), order),
    [detail.sales, search, order],
  );
  const filtered = shown.length !== detail.sales.length;
  const shownTotals = useMemo(
    () =>
      shown.reduce(
        (t, s) => ({
          paidUnits: t.paidUnits + s.paidUnits,
          freeUnits: t.freeUnits + s.freeUnits,
          giftedValue: t.giftedValue + s.giftedValue,
        }),
        { paidUnits: 0, freeUnits: 0, giftedValue: 0 },
      ),
    [shown],
  );
  const pieces = (n: number) => `${formatUnits(n)} ${n === 1 ? 'pieza gratis' : 'piezas gratis'}`;
  const ventas = (n: number) => `${n} ${n === 1 ? 'venta' : 'ventas'}`;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-4 sm:max-w-6xl" data-testid="free-pieces-detail">
        <DialogHeader>
          <DialogTitle>
            <span className="font-mono">{row.productSku}</span> · {row.productName}
          </DialogTitle>
          <DialogDescription>
            Piezas gratis por «{row.promotionName}» · {scopeLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'Ventas (folios)', value: String(detail.totals.sales) },
            { label: 'Piezas gratis', value: formatUnits(detail.totals.freeUnits), strong: true },
            { label: 'Piezas cobradas', value: formatUnits(detail.totals.paidUnits) },
            { label: 'Valor regalado', value: formatAmount(detail.totals.giftedValue) },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-lg border p-3 ${stat.strong ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white'}`}
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{stat.label}</p>
              <p className={`mt-1 text-lg font-bold tabular-nums ${stat.strong ? 'text-emerald-800' : 'text-gray-900'}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {detail.matches ? (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status" data-testid="free-pieces-match">
            <span className="font-semibold">
              Cuadra con el resumen: {pieces(detail.totals.freeUnits)} en {ventas(detail.totals.sales)}.
            </span>{' '}
            {freePiecesBreakdownText(detail.breakdown)}.
          </p>
        ) : (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
            El detalle suma {pieces(detail.totals.freeUnits)} en {ventas(detail.totals.sales)} y el resumen dice{' '}
            {formatUnits(row.units)} en {row.salesCount}. Vuelve a aplicar el filtro del reporte y abre el renglón otra
            vez; si sigue distinto, avisa a Sistemas.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={showBranch ? 'Buscar folio, cliente o sucursal…' : 'Buscar folio o cliente…'}
            aria-label="Buscar dentro del detalle"
            className="max-w-xs"
          />
          <div role="radiogroup" aria-label="Orden de las ventas" className="flex gap-1.5 text-xs">
            {(
              [
                { value: 'time', label: 'Por hora' },
                { value: 'free', label: 'Más gratis primero' },
              ] as const
            ).map((o) => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={order === o.value}
                onClick={() => setOrder(o.value)}
                className={`min-h-8 rounded-full px-3 py-1 font-medium ${
                  order === o.value ? 'bg-[#3E667D] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <p className="-mt-2 text-xs text-gray-500">
          {filtered ? `${shown.length} de ${ventas(detail.sales.length)}. ` : ''}
          Cobradas = piezas de este producto que sí se pagaron en la venta.
        </p>

        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">Folio</th>
                <th className="px-3 py-2">Fecha y hora</th>
                {showBranch && <th className="px-3 py-2">Sucursal</th>}
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2 text-right">Cobradas</th>
                <th className="px-3 py-2 text-right">Gratis</th>
                <th className="px-3 py-2 text-right">Valor regalado</th>
              </tr>
            </thead>
            <tbody className="text-gray-800">
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={showBranch ? 7 : 6} className="px-3 py-8 text-center text-sm text-gray-500">
                    {detail.sales.length === 0
                      ? 'El reporte no trae ventas de este producto con piezas gratis.'
                      : 'Ninguna venta coincide con la búsqueda.'}
                  </td>
                </tr>
              ) : (
                shown.map((s) => (
                  <tr key={s.saleId} className="border-t border-gray-100">
                    <td className="whitespace-nowrap px-3 py-1.5 font-mono text-gray-900">
                      <PermissionGuard permissions={SALES_REPORT_PERMISSIONS} fallback={<span>{s.saleNumber}</span>}>
                        <Link
                          href={`/admin/reportes/ventas?search=${encodeURIComponent(s.saleNumber)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir la venta completa en Reportes › Ventas (pestaña nueva)"
                          className="text-[#3E667D] underline-offset-2 hover:underline"
                        >
                          {s.saleNumber}
                        </Link>
                      </PermissionGuard>
                    </td>
                    <td className="whitespace-nowrap px-3 py-1.5">
                      {formatDateDisplay(s.saleDate)} <span className="text-gray-500">{s.saleTime}</span>
                    </td>
                    {showBranch && (
                      <td className="px-3 py-1.5">
                        <div className="max-w-52 truncate" title={`${s.branchCode} ${s.branchName}`}>
                          {s.branchCode} {s.branchName}
                        </div>
                      </td>
                    )}
                    <td className="px-3 py-1.5">
                      <div className="max-w-64 truncate" title={s.customerName}>
                        {s.customerNumber ? <span className="font-mono text-gray-500">{s.customerNumber} </span> : null}
                        {s.customerName}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatUnits(s.paidUnits)}</td>
                    <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-emerald-800">
                      {formatUnits(s.freeUnits)}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{formatAmount(s.giftedValue)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {shown.length > 0 && (
              <tfoot className="sticky bottom-0 bg-gray-50 text-sm font-bold text-gray-900">
                <tr className="border-t-2 border-gray-200">
                  <td colSpan={showBranch ? 4 : 3} className="px-3 py-2">
                    {filtered ? `${ventas(shown.length)} de ${detail.sales.length}` : `TOTAL · ${ventas(shown.length)}`}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatUnits(shownTotals.paidUnits)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-emerald-800">{formatUnits(shownTotals.freeUnits)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatAmount(shownTotals.giftedValue)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
