// app/admin/inventario/lotes/[productId]/page.tsx - Product Lots
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.2 Módulo Productos e Inventario
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  CubeIcon,
  PlusIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useProductLots, useCreateLot, useProductStock } from '@/hooks/useInventory';
import { useActiveBranches } from '@/hooks/useBranches';
import { inventoryService } from '@/services/inventory.service';
import { LotStatus, type LotQueryDto, type LotDto } from '@/types/inventory';

export default function LotesPage() {
  const params = useParams();
  const productId = params.productId as string;

  const [branchFilter, setBranchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<LotStatus | ''>('');
  const [expiringDays, setExpiringDays] = useState<number | ''>('');
  const [showNewLotForm, setShowNewLotForm] = useState(false);
  const [page, setPage] = useState(1);

  // Fetch branches
  const { data: branches } = useActiveBranches();

  // New lot form state
  const [newLot, setNewLot] = useState({
    branchId: '',
    lotNumber: '',
    expirationDate: '',
    manufactureDate: '',
    initialQuantity: 1,
    notes: '',
  });

  // Set default branch when branches load
  useEffect(() => {
    if (branches && branches.length > 0 && !newLot.branchId) {
      setNewLot(prev => ({ ...prev, branchId: branches[0].id }));
    }
  }, [branches, newLot.branchId]);

  const query: LotQueryDto = {
    branchId: branchFilter || undefined,
    status: statusFilter || undefined,
    expiringInDays: expiringDays || undefined,
    page,
    limit: 20,
  };

  const { data: lotsData, isLoading, refetch } = useProductLots(productId, query);
  const { data: stockData } = useProductStock(productId);
  const createLot = useCreateLot();

  const handleCreateLot = async () => {
    if (!newLot.lotNumber || !newLot.branchId || newLot.initialQuantity < 1) {
      toast.error('Completa los campos requeridos');
      return;
    }

    try {
      await createLot.mutateAsync({
        productId,
        data: {
          branchId: newLot.branchId,
          lotNumber: newLot.lotNumber,
          expirationDate: newLot.expirationDate,
          manufactureDate: newLot.manufactureDate || undefined,
          initialQuantity: newLot.initialQuantity,
          notes: newLot.notes || undefined,
        },
      });
      toast.success('Lote creado correctamente');
      setShowNewLotForm(false);
      setNewLot({
        branchId: branches?.[0]?.id || '',
        lotNumber: '',
        expirationDate: '',
        manufactureDate: '',
        initialQuantity: 1,
        notes: '',
      });
      refetch();
    } catch (error) {
      toast.error('Error al crear el lote');
    }
  };

  const getStatusBadge = (status: LotStatus) => {
    const config: Record<LotStatus, { bg: string; text: string; icon: React.ReactNode }> = {
      [LotStatus.AVAILABLE]: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        icon: <CheckCircleIcon className="h-3 w-3" />,
      },
      [LotStatus.DEPLETED]: {
        bg: 'bg-gray-100',
        text: 'text-gray-700',
        icon: <XCircleIcon className="h-3 w-3" />,
      },
      [LotStatus.EXPIRED]: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        icon: <ExclamationTriangleIcon className="h-3 w-3" />,
      },
      [LotStatus.BLOCKED]: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        icon: <ClockIcon className="h-3 w-3" />,
      },
    };

    const { bg, text, icon } = config[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 ${bg} ${text} rounded-full text-xs font-medium`}>
        {icon}
        {inventoryService.getLotStatusLabel(status)}
      </span>
    );
  };

  const isExpiringSoon = (expirationDate?: string) => {
    if (!expirationDate) return false;
    const expDate = new Date(expirationDate);
    const today = new Date();
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 30;
  };

  // Product info from first stock record
  const productInfo = stockData?.[0];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <CubeIcon className="h-10 w-10" />
                <div>
                  <h1 className="text-4xl font-bold">Lotes del Producto</h1>
                  {productInfo && (
                    <p className="text-white/80 text-lg mt-1">
                      {productInfo.productName} ({productInfo.productCode})
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
                variant="primary"
                leftIcon={<PlusIcon className="h-5 w-5" />}
                onClick={() => setShowNewLotForm(true)}
              >
                Nuevo Lote
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* New Lot Form */}
        {showNewLotForm && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Crear Nuevo Lote</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sucursal *
                  </label>
                  <select
                    value={newLot.branchId}
                    onChange={(e) => setNewLot({ ...newLot, branchId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  >
                    {branches?.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Lote *
                  </label>
                  <input
                    type="text"
                    value={newLot.lotNumber}
                    onChange={(e) => setNewLot({ ...newLot, lotNumber: e.target.value })}
                    placeholder="LOT-2024-001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad Inicial *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newLot.initialQuantity}
                    onChange={(e) =>
                      setNewLot({ ...newLot, initialQuantity: parseInt(e.target.value) || 1 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Caducidad
                  </label>
                  <input
                    type="date"
                    value={newLot.expirationDate}
                    onChange={(e) => setNewLot({ ...newLot, expirationDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de Manufactura
                  </label>
                  <input
                    type="date"
                    value={newLot.manufactureDate}
                    onChange={(e) => setNewLot({ ...newLot, manufactureDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <input
                    type="text"
                    value={newLot.notes}
                    onChange={(e) => setNewLot({ ...newLot, notes: e.target.value })}
                    placeholder="Notas adicionales..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => setShowNewLotForm(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateLot} disabled={createLot.isPending}>
                  {createLot.isPending ? 'Creando...' : 'Crear Lote'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                >
                  <option value="">Todas las sucursales</option>
                  {branches?.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as LotStatus | '')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
              >
                <option value="">Todos los Estados</option>
                <option value={LotStatus.AVAILABLE}>Disponible</option>
                <option value={LotStatus.DEPLETED}>Agotado</option>
                <option value={LotStatus.EXPIRED}>Expirado</option>
                <option value={LotStatus.BLOCKED}>Bloqueado</option>
              </select>

              {/* Expiring Soon Filter */}
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={expiringDays}
                  onChange={(e) =>
                    setExpiringDays(e.target.value ? parseInt(e.target.value) : '')
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                >
                  <option value="">Todas las fechas</option>
                  <option value="7">Vence en 7 días</option>
                  <option value="30">Vence en 30 días</option>
                  <option value="60">Vence en 60 días</option>
                  <option value="90">Vence en 90 días</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lots Table */}
        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block w-12 h-12 border-4 border-[#3E667D] border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-600">Cargando lotes...</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          # Lote
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          Sucursal
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">
                          Inicial
                        </th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-900">
                          Actual
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          Caducidad
                        </th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {lotsData?.data.map((lot) => (
                        <tr
                          key={lot.id}
                          className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="py-4 px-4">
                            <div>
                              <span className="font-mono font-semibold text-[#3E667D]">
                                {lot.lotNumber}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm">{lot.branchName || '-'}</td>
                          <td className="py-4 px-4 text-center font-medium">
                            {lot.initialQuantity}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span
                              className={`font-bold ${
                                lot.quantity === 0
                                  ? 'text-red-600'
                                  : lot.quantity < lot.initialQuantity * 0.2
                                  ? 'text-yellow-600'
                                  : 'text-green-600'
                              }`}
                            >
                              {lot.quantity}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm">
                            {lot.expirationDate ? (
                              <div className="flex items-center gap-2">
                                <span
                                  className={
                                    isExpiringSoon(lot.expirationDate) ? 'text-red-600 font-medium' : ''
                                  }
                                >
                                  {inventoryService.formatDate(lot.expirationDate)}
                                </span>
                                {isExpiringSoon(lot.expirationDate) && (
                                  <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
                                )}
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="py-4 px-4">{getStatusBadge(lot.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {(!lotsData?.data || lotsData.data.length === 0) && (
                  <div className="text-center py-12">
                    <CubeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      No se encontraron lotes
                    </h3>
                    <p className="text-gray-600">Crea un nuevo lote para comenzar</p>
                  </div>
                )}

                {/* Pagination */}
                {lotsData && lotsData.total > 20 && (
                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      Mostrando {lotsData.data.length} de {lotsData.total} lotes
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
                        disabled={lotsData.data.length < 20}
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
