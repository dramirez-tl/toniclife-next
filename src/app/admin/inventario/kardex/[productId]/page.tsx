// app/admin/inventario/kardex/[productId]/page.tsx - Product Kardex
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.2 Módulo Productos e Inventario
'use client';

import { Suspense, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui/DataTable';
import {
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FunnelIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CubeIcon,
  BuildingStorefrontIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useKardex, useProductStock } from '@/hooks/useInventory';
import { useActiveBranches } from '@/hooks/useBranches';
import { inventoryService } from '@/services/inventory.service';
import {
  type MovementType,
  type MovementCategory,
  type KardexQueryDto,
  type KardexEntryDto,
} from '@/types/inventory';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { DEFAULT_TIMEZONE, getTimezoneShortLabel, resolveTimeZone } from '@/lib/timezone-utils';

// ── Taxonomía REAL de BD (auditoría 04-sep-2026, M2/M13/M27) ─────────────────
// movement_type (CHECK): entry | exit | transfer_out | transfer_in |
//   adjustment_positive | adjustment_negative | initial_load | physical_count
// movement_category (CHECK): purchase | production | return_from_customer |
//   return_to_supplier | sale | sample | donation | damage | expiration | theft |
//   transfer | adjustment | initial | count
// El select anterior mandaba transfer/adjustment/return/loss, que no existen
// en BD: el kardex "filtraba" y no devolvía nada.

/** Opciones del filtro de tipo: 'type:<movement_type>' o 'cat:<movement_category>'. */
const TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'type:entry', label: 'Entrada' },
  { value: 'type:exit', label: 'Salida' },
  { value: 'cat:sale', label: 'Venta POS' },
  { value: 'cat:return_from_customer', label: 'Devolución de cliente' },
  { value: 'cat:purchase', label: 'Compra a proveedor' },
  { value: 'cat:transfer', label: 'Traspasos (ambos sentidos)' },
  { value: 'type:transfer_out', label: 'Traspaso — salida' },
  { value: 'type:transfer_in', label: 'Traspaso — entrada' },
  { value: 'type:physical_count', label: 'Conteo físico' },
  { value: 'type:adjustment_positive', label: 'Ajuste (+)' },
  { value: 'type:adjustment_negative', label: 'Ajuste (−)' },
  { value: 'type:initial_load', label: 'Carga inicial' },
  { value: 'cat:damage', label: 'Daño / merma' },
  { value: 'cat:expiration', label: 'Caducidad' },
];

/** Valores del select anterior (enum del API sin existencia en BD) → equivalente real. */
const LEGACY_TYPE_FILTER: Record<string, string> = {
  entry: 'type:entry',
  exit: 'type:exit',
  transfer: 'cat:transfer',
  adjustment: 'type:physical_count',
  return: 'cat:return_from_customer',
  production: 'cat:production',
  loss: 'cat:damage',
};

interface TypeFilter {
  value: string;
  label: string;
  movementType?: MovementType;
  movementCategory?: MovementCategory;
}

function parseTypeFilter(raw: string): TypeFilter {
  const value = LEGACY_TYPE_FILTER[raw] ?? raw;
  const label = TYPE_FILTER_OPTIONS.find((o) => o.value === value)?.label ?? value;
  if (value.startsWith('type:')) {
    return { value, label, movementType: value.slice(5) as MovementType };
  }
  if (value.startsWith('cat:')) {
    return { value, label, movementCategory: value.slice(4) as MovementCategory };
  }
  return { value: '', label: '' };
}

const ENTRY_TYPES = new Set<string>(['entry', 'transfer_in', 'adjustment_positive', 'initial_load']);

/**
 * Cantidad con signo REAL. physical_count guarda quantity = |discrepancia| y el
 * sentido vive en quantity_before/after (el 99% son ganancias que se pintaban
 * como "Salida -N"; auditoría 04-sep, M3/M28). El resto se decide por tipo.
 */
function getSignedQuantity(m: KardexEntryDto): number {
  const t = m.movementType as string;
  if (t === 'physical_count') {
    const delta = m.quantityAfter - m.quantityBefore;
    return delta !== 0 ? delta : m.quantity;
  }
  return ENTRY_TYPES.has(t) ? m.quantity : -m.quantity;
}

const isEntryRow = (m: KardexEntryDto) => getSignedQuantity(m) >= 0;
const getDirectionLabel = (m: KardexEntryDto) => (isEntryRow(m) ? 'Entrada' : 'Salida');
const formatSigned = (n: number) =>
  `${n >= 0 ? '+' : '−'}${Math.abs(n).toLocaleString('es-MX')}`;

const TYPE_LABELS: Record<string, string> = {
  entry: 'Entrada',
  exit: 'Salida',
  transfer_in: 'Traspaso Entrada',
  transfer_out: 'Traspaso Salida',
  adjustment_positive: 'Ajuste (+)',
  adjustment_negative: 'Ajuste (−)',
  initial_load: 'Carga Inicial',
  physical_count: 'Conteo Físico',
};
const TYPE_COLORS: Record<string, string> = {
  entry: 'bg-green-100 text-green-700',
  exit: 'bg-red-100 text-red-700',
  transfer_in: 'bg-blue-100 text-blue-700',
  transfer_out: 'bg-blue-100 text-blue-700',
  adjustment_positive: 'bg-green-100 text-green-700',
  adjustment_negative: 'bg-red-100 text-red-700',
  initial_load: 'bg-gray-100 text-gray-700',
  physical_count: 'bg-yellow-100 text-yellow-700',
};
/** En entradas/salidas genéricas la categoría dice más que el tipo. */
const CATEGORY_LABELS: Record<string, string> = {
  sale: 'Venta POS',
  return_from_customer: 'Devolución Venta',
  purchase: 'Compra',
  return_to_supplier: 'Devolución a proveedor',
  damage: 'Daño / merma',
  expiration: 'Caducidad',
  theft: 'Robo',
  sample: 'Muestra',
  donation: 'Donación',
  production: 'Producción',
};
const CATEGORY_COLORS: Record<string, string> = {
  sale: 'bg-orange-100 text-orange-700',
  return_from_customer: 'bg-purple-100 text-purple-700',
};
const categoryApplies = (type: string, category?: string) =>
  !!category && (type === 'entry' || type === 'exit') && !!CATEGORY_LABELS[category];

function getMovementTypeText(type: string, category?: string): string {
  if (categoryApplies(type, category)) return CATEGORY_LABELS[category!];
  return TYPE_LABELS[type] || inventoryService.getMovementTypeLabel(type as MovementType);
}

const REFERENCE_TYPE_LABELS: Record<string, string> = {
  count: 'Conteo',
  transfer: 'Traspaso',
  sale: 'Venta',
  order: 'Pedido',
  purchase: 'Compra',
  return: 'Devolución',
};
const referenceTypeLabel = (t?: string) => (t ? (REFERENCE_TYPE_LABELS[t] ?? t) : '');

/**
 * URL del conteo referido (reference_type='count'): por id si el API lo manda
 * (referenceId); si no, el listado de ajustes filtrado por # de conteo.
 */
function getCountUrl(m: KardexEntryDto): string | null {
  if (m.referenceId) return `/admin/inventario/ajustes/${m.referenceId}`;
  if (m.referenceNumber) {
    return `/admin/inventario/ajustes?search=${encodeURIComponent(m.referenceNumber)}`;
  }
  return null;
}

function getDetailUrl(m: KardexEntryDto): string | null {
  const t = m.movementType as string;
  if (t === 'transfer_in' || t === 'transfer_out') return `/admin/inventario/traspasos/${m.movementId}`;
  if (t === 'entry') return `/admin/inventario/entradas/${m.movementId}`;
  if (t === 'exit') return `/admin/inventario/salidas/${m.movementId}`;
  if (m.referenceType === 'count') return getCountUrl(m);
  return null;
}

export default function KardexPage() {
  return <Suspense><KardexContent /></Suspense>;
}

function KardexContent() {
  const params = useParams();
  const productId = params.productId as string;

  const { get, getNumber, setParams } = useQueryFilters({
    page: '1',
  });

  const branchFilter = get('branch');
  // Se conserva la clave 'movementType' en la URL (bookmarks); los valores
  // viejos del enum se traducen en parseTypeFilter.
  const typeFilter = parseTypeFilter(get('movementType'));
  const fromDate = get('fromDate');
  const toDate = get('toDate');
  const page = getNumber('page') || 1;

  // Fetch branches for filter
  const { data: branches } = useActiveBranches();

  // Fetch product stock across branches
  const { data: productStockList } = useProductStock(productId);

  const query: KardexQueryDto = {
    branchId: branchFilter || undefined,
    movementType: typeFilter.movementType,
    movementCategory: typeFilter.movementCategory,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    page,
    limit: 50,
  };

  const { data: kardexData, isLoading, isError, refetch } = useKardex(productId, query);

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Exportar TODO paginando (dictamen 3.3.2: antes una sola llamada con
      // limit=10000 truncaba en silencio kardex más largos).
      const baseQuery = {
        branchId: branchFilter || undefined,
        movementType: typeFilter.movementType,
        movementCategory: typeFilter.movementCategory,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      };
      const PAGE_SIZE = 1000;
      const firstPage = await inventoryService.getKardex(productId, {
        ...baseQuery,
        page: 1,
        limit: PAGE_SIZE,
      });
      const allMovements = [...(firstPage?.movements ?? [])];
      const expectedTotal = firstPage?.total ?? allMovements.length;
      let pageNum = 2;
      while (
        allMovements.length < expectedTotal &&
        pageNum <= Math.ceil(expectedTotal / PAGE_SIZE)
      ) {
        const next = await inventoryService.getKardex(productId, {
          ...baseQuery,
          page: pageNum,
          limit: PAGE_SIZE,
        });
        if (!next?.movements?.length) break;
        allMovements.push(...next.movements);
        pageNum += 1;
      }
      const allData = { ...firstPage, movements: allMovements };

      if (!allData?.movements?.length) {
        toast.warning('No hay movimientos para exportar');
        return;
      }
      if (allMovements.length < expectedTotal) {
        toast.warning(
          `Exportación parcial: ${allMovements.length} de ${expectedTotal} movimientos`,
          { description: 'Acota el rango de fechas y vuelve a exportar.' },
        );
      }

      const name = productName || allData.product?.name || 'Producto';
      const code = productCode || allData.product?.code || '';
      const now = new Date();
      const branchTimezone = resolveTimeZone(branches?.find((b) => b.id === branchFilter)?.timezone);
      const exportDate = now.toLocaleString('es-MX', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: branchTimezone,
      });

      // Build active filters description
      const filterParts: string[] = [];
      if (branchFilter) {
        const bName = branches?.find((b) => b.id === branchFilter)?.name;
        if (bName) filterParts.push(`Sucursal: ${bName}`);
      }
      if (typeFilter.value) filterParts.push(`Tipo: ${typeFilter.label}`);
      if (fromDate) filterParts.push(`Desde: ${fromDate}`);
      if (toDate) filterParts.push(`Hasta: ${toDate}`);
      const filterDesc = filterParts.length ? filterParts.join(' | ') : 'Todos los movimientos';

      // CSV helper: escape cell (wrap in quotes if it contains commas/quotes/newlines)
      const esc = (val: string | number | undefined | null) => {
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows: string[] = [];

      // ── Header block ─────────────────────────────────────────────────────────
      rows.push(`KARDEX DE PRODUCTO`);
      rows.push(`Producto,${esc(name)}`);
      rows.push(`SKU,${esc(code)}`);
      rows.push(`Exportado el,${esc(exportDate)}`);
      rows.push(`Filtros,${esc(filterDesc)}`);
      rows.push(`Total movimientos,${allData.movements.length}`);
      rows.push(''); // blank separator

      // ── Column headers ────────────────────────────────────────────────────────
      rows.push([
        '# Movimiento',
        'Fecha',
        'Tipo de Movimiento',
        'Dirección',
        'Cantidad',
        'Stock Anterior',
        'Stock Nuevo',
        'Sucursal Origen',
        'Sucursal Destino',
        'Tipo Referencia',
        '# Referencia',
        'Lote',
        'Caducidad',
        'Costo Unitario',
        'Costo Total',
        'Notas',
        'Procesado Por',
      ].join(','));

      // ── Data rows ─────────────────────────────────────────────────────────────
      for (const m of allData.movements) {
        const expirationLabel = m.lotExpirationDate
          ? new Date(m.lotExpirationDate).toLocaleDateString('es-MX', {
              timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric',
            })
          : 'NA';

        rows.push([
          esc(m.movementNumber),
          esc(inventoryService.formatDateTime(m.createdAt, branches?.find(b => b.name === m.branchName)?.timezone || DEFAULT_TIMEZONE)),
          esc(getMovementTypeText(m.movementType, m.movementCategory)),
          esc(getDirectionLabel(m)),
          esc(formatSigned(getSignedQuantity(m))),
          esc(m.quantityBefore),
          esc(m.quantityAfter),
          esc(m.branchName),
          esc(m.destinationBranchName),
          esc(referenceTypeLabel(m.referenceType)),
          esc(m.referenceNumber),
          esc(m.lotNumber) || 'NA',
          expirationLabel,
          esc(m.unitCost),
          esc(m.totalCost),
          esc(m.notes),
          esc(m.requestedBy?.name),
        ].join(','));
      }

      // ── Download ──────────────────────────────────────────────────────────────
      const csv = '\uFEFF' + rows.join('\n'); // BOM for Excel UTF-8
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeCode = code.replace(/[^a-zA-Z0-9]/g, '-');
      const dateStr = now.toISOString().slice(0, 10);
      link.href = url;
      link.download = `kardex-${safeCode}-${dateStr}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Kardex exportado — ${allData.movements.length} movimientos`);
    } catch {
      toast.error('Error al exportar el kardex');
    } finally {
      setIsExporting(false);
    }
  };

  // Product info: prefer stock data (always loads), fallback to kardex response
  const productName = productStockList?.[0]?.productName || kardexData?.product?.name;
  const productCode = productStockList?.[0]?.productCode || kardexData?.product?.code;

  // Find current stock for selected branch
  const selectedBranchStock = branchFilter
    ? productStockList?.find((s) => s.branchId === branchFilter)
    : null;

  const selectedBranchName = branchFilter
    ? branches?.find((b) => b.id === branchFilter)?.name
    : null;

  const getCategoryBadge = (m: KardexEntryDto) =>
    isEntryRow(m) ? (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
        <ArrowUpIcon className="h-3 w-3" />
        Entrada
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
        <ArrowDownIcon className="h-3 w-3" />
        Salida
      </span>
    );

  const getMovementTypeBadge = (type: string, category?: string) => {
    const label = getMovementTypeText(type, category);
    const color =
      (categoryApplies(type, category) && CATEGORY_COLORS[category!]) ||
      TYPE_COLORS[type] ||
      'bg-gray-100 text-gray-700';
    return (
      <span className={`inline-flex items-center px-2 py-1 ${color} rounded-full text-xs font-medium`}>
        {label}
      </span>
    );
  };

  const detailLink = (m: KardexEntryDto, children: React.ReactNode, className: string) => {
    const href = getDetailUrl(m);
    if (!href) return <span className={className.replace('hover:underline', '')}>{children}</span>;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  };

  // ── DataTable column definitions ────────────────────────────────────────────
  const columns: DataTableColumn<KardexEntryDto>[] = [
    {
      key: 'movementNumber',
      header: '# Movimiento',
      sortable: true,
      sortValue: (m) => m.movementNumber,
      render: (m) =>
        detailLink(
          m,
          m.movementNumber,
          'font-mono text-sm text-[#3E667D] font-medium whitespace-nowrap hover:underline hover:text-[#2f5165] transition-colors',
        ),
    },
    {
      key: 'createdAt',
      header: 'Fecha',
      sortable: true,
      sortValue: (m) => m.createdAt,
      render: (m) => {
        const tz = branches?.find(b => b.name === m.branchName)?.timezone || DEFAULT_TIMEZONE;
        return (
          <span className="text-sm text-gray-600 whitespace-nowrap">
            {inventoryService.formatDateTime(m.createdAt, tz)}
            <span className="text-gray-400"> · {getTimezoneShortLabel(tz)}</span>
          </span>
        );
      },
    },
    {
      key: 'movementType',
      header: 'Tipo',
      render: (m) => getMovementTypeBadge(m.movementType, m.movementCategory),
    },
    {
      key: 'movementCategory',
      header: 'Dirección',
      render: (m) => getCategoryBadge(m),
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      sortable: true,
      sortValue: (m) => getSignedQuantity(m),
      render: (m) => {
        const signed = getSignedQuantity(m);
        return (
          <span className={`font-bold font-mono ${signed >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatSigned(signed)}
          </span>
        );
      },
    },
    {
      key: 'quantityBefore',
      header: 'Anterior',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (m) => (
        <span className="text-sm text-gray-500 font-mono">
          {m.quantityBefore.toLocaleString('es-MX')}
        </span>
      ),
    },
    {
      key: 'quantityAfter',
      header: 'Nuevo',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (m) => (
        <span className="font-semibold text-gray-900 font-mono">
          {m.quantityAfter.toLocaleString('es-MX')}
        </span>
      ),
    },
    {
      key: 'reference',
      header: 'Referencia',
      render: (m) => {
        // reference_type='count' → detalle del conteo (M3/M28); el resto → detalle del movimiento
        const href = m.referenceType === 'count' ? getCountUrl(m) : getDetailUrl(m);

        const content = m.referenceType ? (
          <div className="text-sm whitespace-nowrap">
            <span className="text-gray-500">{referenceTypeLabel(m.referenceType)}:</span>{' '}
            <span className="font-mono">{m.referenceNumber || m.movementNumber}</span>
          </div>
        ) : (
          <span className="font-mono text-sm">{m.movementNumber}</span>
        );

        if (href) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              title={m.referenceType === 'count' ? 'Ver el conteo de inventario' : 'Ver detalle'}
              className="text-[#3E667D] hover:underline hover:text-[#2f5165] transition-colors"
            >
              {content}
            </a>
          );
        }
        return <span className="text-gray-500">{content}</span>;
      },
    },
    {
      key: 'branch',
      header: 'Sucursal / Destino',
      render: (m) =>
        m.branchName ? (
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium whitespace-nowrap">
              <BuildingStorefrontIcon className="h-3 w-3" />
              {m.branchName}
            </span>
            {m.destinationBranchName && (
              <>
                <span className="text-gray-400 text-xs pl-1">↓</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium whitespace-nowrap">
                  <BuildingStorefrontIcon className="h-3 w-3" />
                  {m.destinationBranchName}
                </span>
              </>
            )}
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'lot',
      header: 'Lote / CAD',
      render: (m) =>
        m.lotNumber || m.lotExpirationDate ? (
          <div>
            {m.lotNumber && (
              <span className="font-mono text-gray-700 text-sm">{m.lotNumber}</span>
            )}
            {m.lotExpirationDate && (
              <div className="text-xs text-gray-500">
                {new Date(m.lotExpirationDate).toLocaleDateString('es-MX', {
                  timeZone: 'UTC',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </div>
            )}
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'requestedBy',
      header: 'Procesado Por',
      render: (m) => (
        <span className="text-sm text-gray-600">{m.requestedBy?.name || '—'}</span>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/admin/inventario${branchFilter ? `?branch=${branchFilter}` : ''}`}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Link>
              <div>
                <p className="text-white/60 text-sm font-medium uppercase tracking-wider">Kardex de Producto</p>
                {productName ? (
                  <h1 className="text-2xl font-bold mt-0.5">
                    {productName}
                    {productCode && (
                      <span className="ml-2 text-white/60 font-mono text-lg">
                        {productCode}
                      </span>
                    )}
                  </h1>
                ) : (
                  <h1 className="text-2xl font-bold mt-0.5">Cargando...</h1>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
              onClick={handleExport}
              disabled={isExporting}
              size="sm"
            >
              {isExporting
                ? <span className="inline-block w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                : <ArrowDownTrayIcon className="h-4 w-4" />}
              {isExporting ? 'Exportando...' : 'Exportar CSV'}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Product Stock Summary */}
        {selectedBranchStock && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <BuildingStorefrontIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Sucursal</p>
                    <p className="font-semibold text-sm text-gray-900 truncate">{selectedBranchName}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-50 rounded-lg">
                    <CubeIcon className="h-5 w-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">En Existencia</p>
                    <p className="text-xl font-bold text-gray-900">
                      {selectedBranchStock.quantityOnHand.toLocaleString('es-MX')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <ChartBarIcon className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Reservado</p>
                    <p className="text-xl font-bold text-gray-900">
                      {selectedBranchStock.quantityReserved.toLocaleString('es-MX')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${selectedBranchStock.isLowStock ? 'bg-red-50' : 'bg-green-50'}`}>
                    <CubeIcon className={`h-5 w-5 ${selectedBranchStock.isLowStock ? 'text-red-600' : 'text-green-600'}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Disponible</p>
                    <p className={`text-xl font-bold ${selectedBranchStock.isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                      {selectedBranchStock.quantityAvailable.toLocaleString('es-MX')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center">
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-4 w-4 text-gray-400" />
                <SearchableSelect
                  options={(branches ?? []).map((branch) => ({
                    value: branch.id,
                    label: branch.name,
                  }))}
                  value={branchFilter}
                  onChange={(val) => setParams({ branch: val, page: '1' })}
                  allLabel="Todas las sucursales"
                />
              </div>

              <SearchableSelect
                options={TYPE_FILTER_OPTIONS}
                value={typeFilter.value}
                onChange={(val) => setParams({ movementType: val, page: '1' })}
                allLabel="Todos los Tipos"
                className="w-[240px]"
              />

              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setParams({ fromDate: e.target.value, page: '1' })}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                />
                <span className="text-gray-400 text-sm">a</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setParams({ toDate: e.target.value, page: '1' })}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
              >
                <ArrowPathIcon className="h-4 w-4" />
                Actualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Kardex Table */}
        {isError ? (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mb-4">
                <ChartBarIcon className="h-8 w-8 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Error al cargar el kardex
              </h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto mb-4">
                No se pudo obtener el historial de movimientos. Intenta de nuevo.
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Reintentar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4">
              <DataTable<KardexEntryDto>
                columns={columns}
                data={kardexData?.movements ?? []}
                getRowKey={(m) => m.id}
                isLoading={isLoading}
                loadingRows={10}
                minWidthClassName="min-w-[1100px]"
                sortingMode="server"
                emptyState={
                  <div className="py-16 px-6 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                      <ChartBarIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Sin movimientos registrados
                    </h3>
                    <p className="text-gray-500 text-sm max-w-md mx-auto">
                      {branchFilter
                        ? 'No se encontraron movimientos para este producto en la sucursal seleccionada.'
                        : 'Los movimientos se registrarán automáticamente al procesar ventas, transferencias o ajustes de inventario.'}
                    </p>
                  </div>
                }
              />
              {(kardexData?.total ?? 0) > 0 && (
                <DataTablePagination
                  currentPage={page}
                  pageSize={50}
                  totalItems={kardexData?.total ?? 0}
                  onPageChange={(p) => setParams({ page: String(p) })}
                  isLoading={isLoading}
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
