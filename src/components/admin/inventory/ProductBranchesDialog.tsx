'use client';

// Ventana "¿en qué sucursales está?": las existencias de UN producto, sucursal por sucursal.
// Se abre desde Inventario › Existencias General cuando se ven "Todas las sucursales"
// (Diego, 14-nov-2026): el renglón dice cuántas piezas hay en total y aquí se ve dónde están.
// Lee GET /inventory/products/:id/stock (ya existía) y muestra solo las sucursales del selector.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDownTrayIcon, ArrowPathIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
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
import { useDownloadProductBranchesXlsx, useProductStock } from '@/hooks/useInventory';
import {
  branchBreakdown,
  breakdownTotals,
  filterBranchBreakdown,
  productBranchesExcelFilename,
  type BreakdownBranch,
  type BreakdownFilter,
} from '@/lib/inventory/all-branches';
import { todayInCdmx } from '@/lib/network/format';
import { resolveTimeZone } from '@/lib/timezone-utils';

interface ProductBranchesDialogProps {
  product: { productId: string; productCode: string; productName: string };
  /** Las sucursales del selector (las que la persona puede ver). */
  branches: BreakdownBranch[];
  onClose: () => void;
}

const formatNumber = (n: number) => new Intl.NumberFormat('es-MX').format(n);

function formatDateTime(date: string | undefined, timezone: string | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: resolveTimeZone(timezone),
  });
}

export function ProductBranchesDialog({ product, branches, onClose }: ProductBranchesDialogProps) {
  const { data, isLoading, isError, isFetching, refetch } = useProductStock(product.productId);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<BreakdownFilter>('all');
  const download = useDownloadProductBranchesXlsx();

  // El Excel trae TODAS las sucursales del producto (el API lo arma; no depende de la
  // búsqueda ni del filtro de esta ventana) y lleva su propio filtro de Excel.
  const handleDownload = async () => {
    try {
      await download.mutateAsync({
        productId: product.productId,
        filename: productBranchesExcelFilename(product.productCode, todayInCdmx()),
      });
      toast.success('Excel descargado');
    } catch {
      toast.error('No se pudo descargar el Excel. Intenta de nuevo.');
    }
  };

  const rows = useMemo(() => branchBreakdown(data, branches), [data, branches]);
  const totals = useMemo(() => breakdownTotals(rows), [rows]);
  const shown = useMemo(() => filterBranchBreakdown(rows, search, filter), [rows, search, filter]);
  const shownTotals = useMemo(() => breakdownTotals(shown), [shown]);
  const filtered = shown.length !== rows.length;
  const sucursales = (n: number) => `${n} ${n === 1 ? 'sucursal' : 'sucursales'}`;

  const filters: { value: BreakdownFilter; label: string }[] = [
    { value: 'all', label: `Todas (${totals.branches})` },
    { value: 'with', label: `Con existencia (${totals.withStock})` },
    { value: 'without', label: `Sin existencia (${totals.branches - totals.withStock})` },
  ];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-4 sm:max-w-4xl" data-testid="product-branches-dialog">
        <DialogHeader>
          <DialogTitle className="pr-8 text-left leading-snug">
            <span className="font-mono">{product.productCode}</span> · {product.productName}
          </DialogTitle>
          <DialogDescription className="text-left">
            Existencias por sucursal. Primero las que más tienen.
          </DialogDescription>
        </DialogHeader>

        {isError ? (
          <div className="rounded-md bg-red-50 px-4 py-6 text-center text-sm text-red-800" role="alert">
            <p className="font-medium">No se pudieron cargar las existencias de este producto.</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: 'Disponible', value: formatNumber(totals.quantityAvailable), strong: true },
                { label: 'En mano', value: formatNumber(totals.quantityOnHand) },
                { label: 'Reservado', value: formatNumber(totals.quantityReserved) },
                { label: 'Sucursales con existencia', value: `${totals.withStock} de ${totals.branches}` },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-lg border p-3 ${stat.strong ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 bg-white'}`}
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{stat.label}</p>
                  <p className={`mt-1 text-lg font-bold tabular-nums ${stat.strong ? 'text-emerald-800' : 'text-gray-900'}`}>
                    {isLoading ? '—' : stat.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar sucursal…"
                aria-label="Buscar sucursal"
                className="max-w-xs"
              />
              <div role="radiogroup" aria-label="Qué sucursales mostrar" className="flex flex-wrap gap-1.5 text-xs">
                {filters.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={filter === option.value}
                    onClick={() => setFilter(option.value)}
                    className={`min-h-8 rounded-full px-3 py-1 font-medium ${
                      filter === option.value ? 'bg-[#3E667D] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    {/* "Disponible" va primero: en un teléfono es lo que se alcanza a ver sin desplazar. */}
                    <th className="px-3 py-2">Sucursal</th>
                    <th className="px-3 py-2 text-right">Disponible</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Reservado</th>
                    <th className="px-3 py-2">Última actualización</th>
                    <th className="px-3 py-2 text-right">Kardex</th>
                  </tr>
                </thead>
                <tbody className="text-gray-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                        Cargando existencias…
                      </td>
                    </tr>
                  ) : shown.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                        {rows.length === 0
                          ? 'Este producto no está dado de alta en ninguna de tus sucursales.'
                          : 'Ninguna sucursal coincide con la búsqueda.'}
                      </td>
                    </tr>
                  ) : (
                    shown.map((row) => (
                      <tr key={row.branchId} className="border-t border-gray-100">
                        <td className="px-3 py-1.5">
                          <div className="max-w-72 truncate" title={`${row.branchName} (${row.branchCode})`}>
                            {row.branchName} <span className="font-mono text-gray-500">({row.branchCode})</span>
                          </div>
                        </td>
                        <td
                          className={`px-3 py-1.5 text-right font-semibold tabular-nums ${
                            row.quantityAvailable > 0 ? 'text-green-700' : 'text-red-600'
                          }`}
                        >
                          {formatNumber(row.quantityAvailable)}
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(row.quantityOnHand)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-gray-600">
                          {formatNumber(row.quantityReserved)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-1.5 text-gray-600">
                          {formatDateTime(row.lastMovementAt, row.timezone)}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <Link
                            href={`/admin/inventario/kardex/${product.productId}?branch=${row.branchId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Ver el kardex en ${row.branchName} (pestaña nueva)`}
                            aria-label={`Ver el kardex en ${row.branchName} (pestaña nueva)`}
                            className="inline-flex rounded-lg p-1.5 transition-colors hover:bg-blue-50"
                          >
                            <ChartBarIcon className="h-4 w-4 text-blue-600" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {shown.length > 0 && (
                  <tfoot className="sticky bottom-0 bg-gray-50 text-sm font-bold text-gray-900">
                    <tr className="border-t-2 border-gray-200">
                      <td className="px-3 py-2">
                        {filtered
                          ? `${sucursales(shown.length)} de ${rows.length}`
                          : `TOTAL · ${sucursales(shown.length)}`}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatNumber(shownTotals.quantityAvailable)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatNumber(shownTotals.quantityOnHand)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatNumber(shownTotals.quantityReserved)}</td>
                      <td colSpan={2} className="px-3 py-2 text-right text-xs font-normal text-gray-500">
                        {isFetching && !isLoading ? 'Actualizando…' : 'Hora local de cada sucursal'}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </>
        )}

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleDownload}
            disabled={download.isPending || isLoading || isError}
            title="Todas las sucursales de este producto, en un archivo de Excel"
          >
            {download.isPending ? (
              <ArrowPathIcon className="h-5 w-5 animate-spin" />
            ) : (
              <ArrowDownTrayIcon className="h-5 w-5" />
            )}
            {download.isPending ? 'Generando Excel…' : 'Descargar Excel'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
