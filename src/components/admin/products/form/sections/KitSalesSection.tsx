'use client';

// (12) Ventas — ventas de un kit/paquete por PERIODO DE NEGOCIO (26 → 25), tal
// como las calcula GET /products/:id/kit-sales?periods=N (contrato de kits
// §5.2): cobradas y canceladas, por canal (POS / migradas / en línea), top de
// sucursales y, en el periodo vigente, las últimas 20 ventas. Las fechas se
// muestran como vienen del API: aquí no se recalcula ningún periodo.

import { useId, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useKitSales } from '@/hooks/useKitAdmin';
import {
  CHANNEL_LABEL,
  periodTitle,
  periodTotals,
  saleHref,
  saleStatusLabel,
  topBranchesSentence,
  totalPaid,
} from '@/lib/kits/kit-sales';
import { productAdminErrorMessage } from '../../lib/errors';
import { useProductForm } from '../ProductFormContext';
import { SectionCard } from '../SectionCard';

const PERIOD_OPTIONS = [3, 6, 12] as const;

const fmtDateTime = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
};

export function KitSalesSection() {
  const { productId, product } = useProductForm();
  const selectId = useId();
  const [periods, setPeriods] = useState<number>(3);
  const sales = useKitSales(productId, periods);
  const noun = product?.productType === 'pack' ? 'paquete' : 'kit';
  const data = sales.data ?? null;

  return (
    <SectionCard
      title="Ventas"
      description={`Unidades del ${noun} por periodo de negocio (del 26 al 25). Solo lectura.`}
      actions={
        <div className="flex items-center gap-2">
          <Label htmlFor={selectId} className="text-xs text-gray-600">
            Periodos
          </Label>
          <select
            id={selectId}
            value={periods}
            onChange={(e) => setPeriods(Number(e.target.value))}
            className="h-9 rounded-md border border-gray-300 bg-white px-2 text-sm"
          >
            {PERIOD_OPTIONS.map((n) => (
              <option key={n} value={n}>
                Últimos {n}
              </option>
            ))}
          </select>
        </div>
      }
    >
      {sales.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-gray-600" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Consultando ventas…
        </p>
      ) : sales.isError ? (
        <p className="text-sm text-red-700" role="alert">
          {productAdminErrorMessage(sales.error, 'No se pudieron consultar las ventas del kit.')}
        </p>
      ) : !data ? (
        <p className="text-sm text-gray-700" role="status">
          Este servidor aún no calcula las ventas por periodo de los kits. Se activará cuando se despliegue el API.
        </p>
      ) : data.periods.length === 0 ? (
        <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-700">Sin periodos que mostrar.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            <strong>{totalPaid(data.periods)}</strong> unidades cobradas en los últimos {data.periods.length}{' '}
            {data.periods.length === 1 ? 'periodo' : 'periodos'}.
          </p>
          <ol className="space-y-3">
            {data.periods.map((p) => (
              <li key={p.periodId || p.periodNumber} className="rounded-lg border border-gray-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">{periodTitle(p)}</h3>
                  {p.isCurrent ? <Badge variant="info">Vigente</Badge> : p.isClosed ? <Badge variant="secondary">Cerrado</Badge> : null}
                </div>
                <p className="mt-1 text-sm text-gray-800">{periodTotals(p)}</p>
                <p className="mt-1 text-xs text-gray-600">
                  <span className="font-medium text-gray-700">Sucursales:</span> {topBranchesSentence(p.topBranches)}
                </p>

                {p.isCurrent && p.lastSales.length > 0 ? (
                  <div className="mt-3 overflow-x-auto">
                    <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Últimas {p.lastSales.length} ventas
                    </h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Folio</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Sucursal</TableHead>
                          <TableHead>Canal</TableHead>
                          <TableHead className="text-right">Cant.</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {p.lastSales.map((line) => (
                          <TableRow key={`${line.channel}-${line.id}`}>
                            <TableCell>
                              <Link
                                href={saleHref(line)}
                                className="inline-flex items-center gap-1 font-mono text-xs text-[#3E667D] underline underline-offset-2"
                                title={line.channel === 'web' ? 'Abrir el pedido' : 'Abrir el POS web'}
                              >
                                {line.folio}
                                <ExternalLink className="h-3 w-3" aria-hidden />
                              </Link>
                            </TableCell>
                            <TableCell className="text-xs text-gray-700">{fmtDateTime(line.at)}</TableCell>
                            <TableCell className="font-mono text-xs">{line.branchCode ?? '—'}</TableCell>
                            <TableCell className="text-xs">{CHANNEL_LABEL[line.channel]}</TableCell>
                            <TableCell className="text-right tabular-nums">{line.quantity}</TableCell>
                            <TableCell>
                              <Badge variant={line.status === 'cancelled' ? 'secondary' : 'success'}>{saleStatusLabel(line.status)}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : p.isCurrent ? (
                  <p className="mt-2 text-xs text-gray-600">Sin ventas en el periodo vigente.</p>
                ) : null}
              </li>
            ))}
          </ol>
          {data.generatedAt ? <p className="text-xs text-gray-500">Calculado el {fmtDateTime(data.generatedAt)}.</p> : null}
        </div>
      )}
    </SectionCard>
  );
}
