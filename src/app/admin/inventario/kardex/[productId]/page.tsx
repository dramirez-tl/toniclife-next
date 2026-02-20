// app/admin/inventario/kardex/[productId]/page.tsx - Product Kardex
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.2 Módulo Productos e Inventario
'use client';

import { useState } from 'react';
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
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useKardex } from '@/hooks/useInventory';
import { useActiveBranches } from '@/hooks/useBranches';
import { inventoryService } from '@/services/inventory.service';
import { MovementType, type KardexQueryDto } from '@/types/inventory';

export default function KardexPage() {
  const params = useParams();
  const productId = params.productId as string;

  const [branchFilter, setBranchFilter] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState<MovementType | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  // Fetch branches for filter
  const { data: branches } = useActiveBranches();

  const query: KardexQueryDto = {
    branchId: branchFilter || undefined,
    movementType: movementTypeFilter || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    page,
    limit: 50,
  };

  const { data: kardexData, isLoading, refetch } = useKardex(productId, query);

  const handleExport = () => {
    toast.success('Exportando kardex...');
  };

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
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <ChartBarIcon className="h-10 w-10" />
                <div>
                  <h1 className="text-4xl font-bold">Kardex de Producto</h1>
                  {kardexData?.product && (
                    <p className="text-white/80 text-lg mt-1">
                      {kardexData.product.name} ({kardexData.product.code})
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Link href="/admin/inventario">
                <Button variant="secondary">Volver a Inventario</Button>
              </Link>
              <Button
                variant="outline"
                className="border-white text-white hover:bg-white/10"
                leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
                onClick={handleExport}
              >
                Exportar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Branch Filter */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                >
                  <option value="">Todas las sucursales</option>
                  {branches?.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Movement Type Filter */}
              <select
                value={movementTypeFilter}
                onChange={(e) => setMovementTypeFilter(e.target.value as MovementType | '')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
              >
                <option value="">Todos los Tipos</option>
                <option value={MovementType.ENTRY}>Entrada</option>
                <option value={MovementType.EXIT}>Salida</option>
                <option value={MovementType.TRANSFER}>Traspaso</option>
                <option value={MovementType.ADJUSTMENT}>Ajuste</option>
                <option value={MovementType.RETURN}>Devolución</option>
                <option value={MovementType.LOSS}>Pérdida</option>
              </select>

              {/* Date Range */}
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                />
                <span className="text-gray-500">a</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent"
                />
              </div>

              {/* Refresh */}
              <Button
                variant="outline"
                leftIcon={<ArrowPathIcon className="h-5 w-5" />}
                onClick={() => refetch()}
              >
                Actualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Kardex Table */}
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block w-12 h-12 border-4 border-[#003B7A] border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600">Cargando kardex...</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          # Movimiento
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          Fecha
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          Tipo
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          Dirección
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">
                          Cantidad
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">
                          Ant.
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">
                          Nuevo
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          Referencia
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          Procesado Por
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {kardexData?.movements.map((movement) => (
                        <tr
                          key={movement.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <span className="font-mono text-sm text-[#003B7A]">
                              {movement.movementNumber}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                            {inventoryService.formatDateTime(movement.createdAt)}
                          </td>
                          <td className="py-4 px-4">
                            {getMovementTypeBadge(movement.movementType)}
                          </td>
                          <td className="py-4 px-4">{getCategoryBadge(movement.movementCategory)}</td>
                          <td className="py-4 px-4 text-center">
                            <span
                              className={`font-bold ${
                                movement.movementCategory === 'inbound' ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {movement.movementCategory === 'inbound' ? '+' : '-'}
                              {movement.quantity}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center text-gray-600">
                            {movement.quantityBefore}
                          </td>
                          <td className="py-4 px-4 text-center font-semibold text-gray-900">
                            {movement.quantityAfter}
                          </td>
                          <td className="py-4 px-4 text-sm">
                            {movement.referenceType && (
                              <div>
                                <span className="text-gray-500 capitalize">
                                  {movement.referenceType}:
                                </span>{' '}
                                <span className="font-mono text-[#003B7A]">
                                  {movement.referenceNumber}
                                </span>
                              </div>
                            )}
                            {movement.lotId && (
                              <div className="text-xs text-gray-500">
                                Lote: {movement.lotId}
                              </div>
                            )}
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                            {movement.requestedBy?.name || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {(!kardexData?.movements || kardexData.movements.length === 0) && (
                  <div className="text-center py-12">
                    <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      No hay movimientos registrados
                    </h3>
                    <p className="text-gray-600">
                      Los movimientos de inventario aparecerán aquí
                    </p>
                  </div>
                )}

                {/* Pagination */}
                {kardexData && kardexData.totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Página {kardexData.page} de {kardexData.totalPages} ({kardexData.total} movimientos)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={page >= kardexData.totalPages}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
