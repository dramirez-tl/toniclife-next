// app/admin/inventario/kardex/[productId]/page.tsx - Product Kardex
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.2 Módulo Productos e Inventario
'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
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
import { MovementType, type KardexQueryDto } from '@/types/inventory';
import { useQueryFilters } from '@/hooks/useQueryFilters';

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
  const movementTypeFilter = get('movementType') as MovementType | '';
  const fromDate = get('fromDate');
  const toDate = get('toDate');
  const page = getNumber('page') || 1;

  // Fetch branches for filter
  const { data: branches } = useActiveBranches();

  // Fetch product stock across branches
  const { data: productStockList } = useProductStock(productId);

  const query: KardexQueryDto = {
    branchId: branchFilter || undefined,
    movementType: movementTypeFilter || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    page,
    limit: 50,
  };

  const { data: kardexData, isLoading, isError, refetch } = useKardex(productId, query);

  const handleExport = () => {
    toast.info('Esta función se habilitará próximamente');
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

  const getCategoryBadge = (category: string) => {
    const isInbound = category === 'inbound';
    if (isInbound) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
          <ArrowUpIcon className="h-3 w-3" />
          Entrada
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
        <ArrowDownIcon className="h-3 w-3" />
        Salida
      </span>
    );
  };

  const getMovementTypeBadge = (type: MovementType) => {
    const colors: Record<MovementType, string> = {
      [MovementType.ENTRY]: 'bg-green-100 text-green-700',
      [MovementType.EXIT]: 'bg-red-100 text-red-700',
      [MovementType.TRANSFER]: 'bg-blue-100 text-blue-700',
      [MovementType.ADJUSTMENT]: 'bg-yellow-100 text-yellow-700',
      [MovementType.RETURN]: 'bg-purple-100 text-purple-700',
      [MovementType.PRODUCTION]: 'bg-indigo-100 text-indigo-700',
      [MovementType.LOSS]: 'bg-red-100 text-red-700',
    };

    return (
      <span className={`inline-flex items-center px-2 py-1 ${colors[type]} rounded-full text-xs font-medium`}>
        {inventoryService.getMovementTypeLabel(type)}
      </span>
    );
  };

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
              leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
              onClick={handleExport}
              size="sm"
            >
              Exportar
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
                options={[
                  { value: MovementType.ENTRY, label: 'Entrada' },
                  { value: MovementType.EXIT, label: 'Salida' },
                  { value: MovementType.TRANSFER, label: 'Traspaso' },
                  { value: MovementType.ADJUSTMENT, label: 'Ajuste' },
                  { value: MovementType.RETURN, label: 'Devolución' },
                  { value: MovementType.LOSS, label: 'Pérdida' },
                ]}
                value={movementTypeFilter}
                onChange={(val) => setParams({ movementType: val, page: '1' })}
                allLabel="Todos los Tipos"
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
                leftIcon={<ArrowPathIcon className="h-4 w-4" />}
                onClick={() => refetch()}
              >
                Actualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Kardex Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-16">
                <div className="inline-block w-10 h-10 border-4 border-[#3E667D] border-t-transparent rounded-full animate-spin" />
                <p className="mt-3 text-gray-500 text-sm">Cargando kardex...</p>
              </div>
            ) : isError ? (
              <div className="text-center py-16 px-6">
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
              </div>
            ) : kardexData?.movements && kardexData.movements.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          # Movimiento
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Dirección
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Cantidad
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Anterior
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Nuevo
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Referencia
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Procesado Por
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {kardexData.movements.map((movement) => (
                        <tr
                          key={movement.id}
                          className="hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <span className="font-mono text-sm text-[#3E667D] font-medium">
                              {movement.movementNumber}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {inventoryService.formatDateTime(movement.createdAt)}
                          </td>
                          <td className="py-3 px-4">
                            {getMovementTypeBadge(movement.movementType)}
                          </td>
                          <td className="py-3 px-4">{getCategoryBadge(movement.movementCategory)}</td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`font-bold font-mono ${
                                movement.movementCategory === 'inbound' ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {movement.movementCategory === 'inbound' ? '+' : '-'}
                              {movement.quantity.toLocaleString('es-MX')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-sm text-gray-500 font-mono">
                            {movement.quantityBefore.toLocaleString('es-MX')}
                          </td>
                          <td className="py-3 px-4 text-center font-semibold text-gray-900 font-mono">
                            {movement.quantityAfter.toLocaleString('es-MX')}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {movement.referenceType && (
                              <div>
                                <span className="text-gray-500 capitalize">
                                  {movement.referenceType}:
                                </span>{' '}
                                <span className="font-mono text-[#3E667D]">
                                  {movement.referenceNumber}
                                </span>
                              </div>
                            )}
                            {movement.lotId && (
                              <div className="text-xs text-gray-400">
                                Lote: {movement.lotId.slice(0, 8)}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {movement.requestedBy?.name || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {kardexData.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                    <p className="text-sm text-gray-500">
                      Página {kardexData.page} de {kardexData.totalPages} ({kardexData.total.toLocaleString('es-MX')} movimientos)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setParams({ page: String(page - 1) })}
                        disabled={page === 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setParams({ page: String(page + 1) })}
                        disabled={page >= kardexData.totalPages}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 px-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <ChartBarIcon className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Sin movimientos registrados
                </h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                  {branchFilter
                    ? 'No se encontraron movimientos para este producto en la sucursal seleccionada. Los movimientos se registrarán automáticamente al procesar ventas, transferencias o ajustes de inventario.'
                    : 'Selecciona una sucursal para ver los movimientos de este producto. Los movimientos se registrarán automáticamente al procesar ventas, transferencias o ajustes de inventario.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
