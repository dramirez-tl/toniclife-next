'use client';

// TransferDiscrepanciesCard - "Diferencias al recibir" del detalle de un
// traspaso: qué faltó (o sobró) al recibir, cuántas piezas siguen sin aclarar y
// qué se aclaró después (llegaron, se devolvieron, se extraviaron), con el
// botón "Aclarar diferencias" para quien puede aprobar inventario.

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { inventoryService } from '@/services/inventory.service';
import {
  discrepancyPending,
  discrepancyStateInfo,
  formatPieces,
  resolutionPhrase,
  totalPending,
  type DiscrepancyTone,
} from '@/lib/inventory/transfer-discrepancies';
import type { TransferDto } from '@/types/inventory';
import { ResolveDiscrepanciesDialog } from './ResolveDiscrepanciesDialog';

const TYPE_LABEL: Record<string, string> = {
  missing: 'Faltante',
  damaged: 'Dañado',
  excess: 'Excedente',
  wrong_product: 'Producto equivocado',
};

const TONE_CLASS: Record<DiscrepancyTone, string> = {
  warning: 'bg-amber-100 text-amber-800',
  success: 'bg-emerald-100 text-emerald-800',
  muted: 'bg-gray-100 text-gray-600',
};

export function TransferDiscrepanciesCard({
  transfer,
  canResolve,
  timeZone,
}: {
  transfer: TransferDto;
  /** El usuario puede aprobar inventario (mismo permiso que recibir). */
  canResolve: boolean;
  /** Zona de la sucursal destino, para las fechas de las aclaraciones. */
  timeZone: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const discrepancies = transfer.discrepancies ?? [];
  if (discrepancies.length === 0) return null;

  const pending = totalPending(discrepancies);
  const canClarify =
    pending > 0 && canResolve && transfer.discrepancyResolutionEnabled === true;

  return (
    <div className="mt-6 rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold text-amber-800">
            <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
            Diferencias al recibir ({discrepancies.length})
          </h2>
          {pending > 0 && (
            <p className="mt-1 max-w-3xl text-sm text-gray-600">
              Lo que faltó salió de {transfer.branch.name} y no entró a{' '}
              {transfer.destinationBranch.name}.{' '}
              {canClarify
                ? 'Cuando sepas qué pasó, acláralo: si llegó, si se devolvió o si se extravió.'
                : !canResolve
                  ? 'Solo Operaciones, CEDEAS, Almacén o Administración pueden aclararlo.'
                  : null}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pending > 0 ? (
            <Badge variant="warning" className="px-3 py-1 text-sm">
              {formatPieces(pending)} por aclarar
            </Badge>
          ) : (
            <Badge className="bg-emerald-100 px-3 py-1 text-sm text-emerald-800">
              <CheckCircleIcon className="h-4 w-4" />
              Todo aclarado
            </Badge>
          )}
          {canClarify && (
            <Button onClick={() => setDialogOpen(true)}>Aclarar diferencias</Button>
          )}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        {/* Ancho mínimo: en pantallas angostas se desplaza de lado en vez de
            apretar "Aclaración" hasta volverla ilegible. */}
        <table className="w-full min-w-[56rem] text-sm">
          <thead className="bg-amber-50 text-xs text-amber-900">
            <tr>
              <th className="px-3 py-2 text-left">Producto</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-right">Enviado</th>
              <th className="px-3 py-2 text-right">Recibido</th>
              <th className="px-3 py-2 text-right">Diferencia</th>
              <th className="whitespace-nowrap px-3 py-2 text-right">Por aclarar</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="min-w-[18rem] px-3 py-2 text-left">Aclaración</th>
            </tr>
          </thead>
          <tbody>
            {discrepancies.map((dsc) => {
              const difference = dsc.quantityActual - dsc.quantityExpected;
              const rowPending = discrepancyPending(dsc);
              const state = discrepancyStateInfo(dsc);
              const resolutions = dsc.resolutions ?? [];
              return (
                <tr key={dsc.id} className="border-t border-amber-100 align-top">
                  <td className="px-3 py-2">
                    <div className="text-gray-900">{dsc.productName}</div>
                    <div className="font-mono text-[11px] text-gray-400">{dsc.productCode}</div>
                  </td>
                  <td className="px-3 py-2">
                    {TYPE_LABEL[dsc.discrepancyType] ?? dsc.discrepancyType}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatPieces(dsc.quantityExpected)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatPieces(dsc.quantityActual)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-semibold tabular-nums ${difference < 0 ? 'text-red-600' : 'text-amber-700'}`}
                  >
                    {difference > 0 ? '+' : ''}
                    {formatPieces(difference)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${rowPending > 0 ? 'font-semibold text-amber-700' : 'text-gray-400'}`}
                  >
                    {rowPending > 0 ? formatPieces(rowPending) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASS[state.tone]}`}
                    >
                      {state.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {dsc.notes && <p className="text-gray-500">{dsc.notes}</p>}
                    {resolutions.length > 0 ? (
                      <ul className="space-y-1.5">
                        {resolutions.map((r) => (
                          <li key={r.id}>
                            <p>
                              <span className="font-medium text-gray-900">
                                {resolutionPhrase(r)}
                              </span>
                              <span className="text-gray-500">
                                {' '}
                                · {inventoryService.formatDateTime(r.createdAt, timeZone)}
                                {r.resolvedBy?.name ? ` · ${r.resolvedBy.name}` : ''}
                              </span>
                            </p>
                            {r.movementId && r.movementNumber && (
                              <p className="text-xs text-gray-500">
                                Entrada{' '}
                                <Link
                                  href={`/admin/inventario/traspasos/${r.movementId}`}
                                  className="whitespace-nowrap font-mono text-[#3E667D] hover:underline"
                                >
                                  {r.movementNumber}
                                </Link>
                              </p>
                            )}
                            {r.notes && <p className="text-xs text-gray-500">{r.notes}</p>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      !dsc.notes && <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {dialogOpen && (
        <ResolveDiscrepanciesDialog
          transfer={transfer}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}
