'use client';

// Usos de las promociones de una temporada (mig 186): qué ventas / pedidos las
// aplicaron, cuántas veces, descuento, piezas gratis y regalos; estado
// cobrada / sin cobrar / revertida.

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { ReceiptPercentIcon } from '@heroicons/react/24/outline';
import { useSeasonUsages } from '@/hooks/useSeasonalPromotions';
import type {
  PromoSeason,
  SeasonUsage,
  SeasonUsageListQueryParams,
  SeasonUsageStatus,
} from '@/types/seasonal-promotion';
import { formatMoney, usageStatusLabel } from '@/lib/seasonal-promotions';
import { DEFAULT_TIMEZONE, formatDateTimeLocal } from '@/lib/timezone-utils';

export function SeasonUsagesSection({ season }: { season: PromoSeason }) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [status, setStatus] = useState<SeasonUsageStatus | ''>('');
  const [promotionId, setPromotionId] = useState('');

  const params: SeasonUsageListQueryParams = useMemo(() => {
    const p: SeasonUsageListQueryParams = { page, limit };
    if (status) p.status = status;
    if (promotionId) p.promotionId = promotionId;
    return p;
  }, [page, limit, status, promotionId]);

  const { data, isLoading, isFetching } = useSeasonUsages(season.id, params);
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  const columns: DataTableColumn<SeasonUsage>[] = [
    {
      key: 'createdAt',
      header: 'Fecha',
      sortable: true,
      sortValue: (u) => u.createdAt,
      render: (u) => (
        <span className="whitespace-nowrap text-sm text-gray-700">
          {formatDateTimeLocal(u.createdAt, DEFAULT_TIMEZONE)}
        </span>
      ),
    },
    {
      key: 'document',
      header: 'Venta / pedido',
      render: (u) => (
        <div className="flex flex-col">
          <span className="font-mono text-sm text-gray-900">{u.documentNumber ?? '—'}</span>
          <span className="text-xs text-gray-500">
            {u.source === 'pos' ? (u.branchName ?? 'POS') : 'Tienda en línea'}
          </span>
        </div>
      ),
    },
    {
      key: 'promo',
      header: 'Promoción',
      render: (u) => (
        <div className="flex flex-col">
          <span className="text-sm text-gray-900">{u.promoName}</span>
          <span className="font-mono text-xs text-gray-500">{u.promoCode}</span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Cliente',
      render: (u) => (
        <div className="flex flex-col">
          <span className="text-sm text-gray-900">{u.customerName ?? 'Público general'}</span>
          {u.customerNumber && <span className="font-mono text-xs text-gray-500">#{u.customerNumber}</span>}
        </div>
      ),
    },
    {
      key: 'times',
      header: 'Veces',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (u) => <span className="text-sm text-gray-900">{u.times}</span>,
    },
    {
      key: 'units',
      header: 'Gratis / regalos',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (u) => (
        <span className="text-sm text-gray-700">
          {u.freeUnits > 0 ? `${u.freeUnits} gratis` : ''}
          {u.freeUnits > 0 && u.giftUnits > 0 ? ' · ' : ''}
          {u.giftUnits > 0 ? `${u.giftUnits} regalo${u.giftUnits === 1 ? '' : 's'}` : ''}
          {u.freeUnits === 0 && u.giftUnits === 0 ? '—' : ''}
        </span>
      ),
    },
    {
      key: 'discount',
      header: 'Descuento',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      sortable: true,
      sortValue: (u) => u.discountAmount,
      render: (u) => (
        <span className="text-sm font-medium text-gray-900">{formatMoney(u.discountAmount)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (u) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
            u.status === 'applied'
              ? 'bg-green-100 text-green-700'
              : u.status === 'pending'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-gray-100 text-gray-700'
          }`}
        >
          {usageStatusLabel(u.status)}
        </span>
      ),
    },
  ];

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardContent className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <ReceiptPercentIcon className="h-5 w-5 text-[#3E667D]" />
              Ventas con promociones de la temporada
            </h2>
            <p className="text-xs text-gray-500">
              Una fila por promoción y venta. “Sin cobrar” = creada en el POS o pedido web pendiente de pago;
              “Revertida” = cancelada o vencida.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SearchableSelect
              options={(season.promotions ?? []).map((p) => ({ value: p.id, label: p.name, hint: p.code }))}
              value={promotionId}
              onChange={(v) => {
                setPromotionId(v);
                setPage(1);
              }}
              allLabel="Todas las promociones"
              className="w-56"
            />
            <SearchableSelect
              options={[
                { value: 'applied', label: 'Cobradas' },
                { value: 'pending', label: 'Sin cobrar' },
                { value: 'reverted', label: 'Revertidas' },
              ]}
              value={status}
              onChange={(v) => {
                setStatus(v as SeasonUsageStatus | '');
                setPage(1);
              }}
              allLabel="Todos los estados"
              className="w-44"
            />
          </div>
        </div>
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading && !data}
          getRowKey={(u) => u.id}
          minWidthClassName="min-w-[900px]"
          emptyState={
            <p className="py-4 text-center text-sm text-gray-500">
              Todavía no hay ventas con estas promociones.
            </p>
          }
        />
        {rows.length > 0 && (
          <DataTablePagination
            currentPage={page}
            pageSize={limit}
            totalItems={total}
            isLoading={isLoading || isFetching}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setLimit(size);
              setPage(1);
            }}
            pageSizeOptions={[25, 50, 100]}
          />
        )}
      </CardContent>
    </Card>
  );
}
