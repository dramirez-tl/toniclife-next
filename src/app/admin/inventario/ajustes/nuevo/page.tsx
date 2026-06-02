'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  ClipboardDocumentCheckIcon,
  MagnifyingGlassIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  LockClosedIcon,
  LockOpenIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  useCreateAdjustment,
  useAllBranchStock,
  useBranchPosLock,
  useLockBranchPos,
  useForceUnlockBranchPos,
} from '@/hooks/useInventory';
import { confirmAction } from '@/lib/utils';
import { useActiveBranches } from '@/hooks/useBranches';
import { CountType } from '@/types/inventory';
import type { CreateAdjustmentDto } from '@/types/inventory';
import { inventoryService } from '@/services/inventory.service';
import { exportInventoryCountPdf } from './exportCountPdf';

interface AdjustmentItem {
  productId: string;
  productCode: string;
  productName: string;
  currentQuantity: number;
  newQuantity: number;
  difference: number;
  reason?: string;
}

export default function NuevoAjustePage() {
  const router = useRouter();
  const createAdjustment = useCreateAdjustment();

  const [formData, setFormData] = useState({
    branchId: '',
    countType: CountType.FULL,
    notes: '',
  });
  const [items, setItems] = useState<AdjustmentItem[]>([]);
  const [filter, setFilter] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sucursales para el selector
  const { data: branches } = useActiveBranches();

  // Al seleccionar sucursal se cargan TODOS sus productos (todas las páginas)
  const {
    data: allStock,
    isLoading: stockLoading,
    isError: stockError,
    refetch: refetchStock,
  } = useAllBranchStock(formData.branchId || null);

  // Bloqueo del POS de la sucursal (manual + automático por conteo)
  const { data: lockState } = useBranchPosLock(formData.branchId || null);
  const lockMut = useLockBranchPos();
  const forceUnlockMut = useForceUnlockBranchPos();

  const handleLockPos = async () => {
    try {
      await lockMut.mutateAsync(formData.branchId);
      toast.success('POS bloqueado. Las terminales de la sucursal no pueden operar.');
    } catch {
      toast.error('No se pudo bloquear el POS');
    }
  };

  const handleUnlockPos = async () => {
    const ok = await confirmAction(
      'Esto desbloqueará el POS y cancelará cualquier conteo de inventario activo de esta sucursal. Los conteos en progreso se descartarán. ¿Continuar?',
    );
    if (!ok) return;
    try {
      const res = await forceUnlockMut.mutateAsync(formData.branchId);
      toast.success(
        res.cancelledCounts > 0
          ? `POS desbloqueado (${res.cancelledCounts} conteo(s) cancelado(s))`
          : 'POS desbloqueado',
      );
    } catch {
      toast.error('No se pudo desbloquear el POS');
    }
  };

  // Inicializa los renglones del conteo una vez por sucursal (sin pisar ediciones)
  const loadedBranchRef = useRef('');
  useEffect(() => {
    if (!formData.branchId) {
      setItems([]);
      loadedBranchRef.current = '';
      return;
    }
    if (loadedBranchRef.current === formData.branchId) return;

    if (allStock) {
      loadedBranchRef.current = formData.branchId;
      setItems(
        allStock.map((stock) => ({
          productId: stock.productId,
          productCode: stock.productCode,
          productName: stock.productName,
          currentQuantity: stock.quantityOnHand,
          newQuantity: stock.quantityOnHand,
          difference: 0,
        })),
      );
      setFilter('');
    } else {
      // La sucursal cambió y aún se está cargando: limpiar renglones viejos
      setItems([]);
    }
  }, [formData.branchId, allStock]);

  const visibleItems = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.productName.toLowerCase().includes(q) ||
        i.productCode.toLowerCase().includes(q),
    );
  }, [items, filter]);

  const handleNewQuantityChange = (productId: string, newQuantity: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              newQuantity: Math.max(0, newQuantity),
              difference: Math.max(0, newQuantity) - item.currentQuantity,
            }
          : item,
      ),
    );
  };

  const handleReasonChange = (productId: string, reason: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, reason } : item,
      ),
    );
  };

  const branchName = useMemo(
    () => branches?.find((b) => b.id === formData.branchId)?.name ?? 'Sucursal',
    [branches, formData.branchId],
  );

  const handleDownloadPdf = () => {
    if (items.length === 0) {
      toast.error('Selecciona una sucursal con productos para generar el informe');
      return;
    }
    exportInventoryCountPdf({
      branchName,
      adjustmentTypeLabel: inventoryService.getCountTypeLabel(formData.countType),
      notes: formData.notes || undefined,
      items: items.map((i) => ({
        productCode: i.productCode,
        productName: i.productName,
        systemQty: i.currentQuantity,
        countedQty: i.newQuantity,
      })),
    });
    toast.success('Informe PDF generado');
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.branchId) newErrors.branchId = 'Selecciona una sucursal';
    if (items.length === 0) newErrors.items = 'No hay productos para ajustar';
    const hasChanges = items.some((item) => item.difference !== 0);
    if (!hasChanges && items.length > 0) {
      newErrors.items = 'No hay diferencias: ajusta al menos una cantidad real para crear el ajuste (puedes descargar el informe sin crear ajuste).';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const adjustmentData: CreateAdjustmentDto = {
      branchId: formData.branchId,
      countType: formData.countType,
      notes: formData.notes || undefined,
      items: items
        .filter((item) => item.difference !== 0)
        .map((item) => ({
          productId: item.productId,
          systemQuantity: item.currentQuantity,
          countedQuantity: item.newQuantity,
          notes: item.reason,
        })),
    };

    try {
      await createAdjustment.mutateAsync(adjustmentData);
      // Informe PDF del conteo al finalizar
      handleDownloadPdf();
      toast.success('Ajuste creado correctamente');
      router.push('/admin/inventario/ajustes');
    } catch (error) {
      console.error('Error creating adjustment:', error);
      toast.error('Error al crear el ajuste');
    }
  };

  const totalIncrease = items
    .filter((item) => item.difference > 0)
    .reduce((sum, item) => sum + item.difference, 0);
  const totalDecrease = items
    .filter((item) => item.difference < 0)
    .reduce((sum, item) => sum + Math.abs(item.difference), 0);
  const diffCount = items.filter((item) => item.difference !== 0).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-14 z-10 border-b bg-white/95 backdrop-blur-sm lg:top-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/inventario/ajustes"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Volver a ajustes"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex h-11 w-11 items-center justify-center rounded-xl bg-[#3E667D]/10 text-[#3E667D]">
                  <ClipboardDocumentCheckIcon className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                    Nuevo Conteo de Inventario
                  </h1>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Selecciona la sucursal y captura el conteo físico de todos sus productos
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/inventario/ajustes"
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                form="ajuste-form"
                disabled={createAdjustment.isPending || items.length === 0}
                className="px-5 py-2 bg-[#3E667D] text-white rounded-lg hover:bg-[#2f5165] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
              >
                {createAdjustment.isPending ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear Ajuste'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <form id="ajuste-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Adjustment Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="h-5 w-5 text-[#3E667D]" />
            Información del Conteo
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sucursal *</label>
              <SearchableSelect
                options={(branches ?? []).map((branch) => ({
                  value: branch.id,
                  label: branch.name,
                }))}
                value={formData.branchId}
                onChange={(val) => setFormData({ ...formData, branchId: val })}
                showAllOption={false}
                placeholder="Seleccionar sucursal..."
              />
              {errors.branchId && <p className="mt-1 text-sm text-red-500">{errors.branchId}</p>}
              <p className="mt-1 text-xs text-gray-500">
                Al seleccionar la sucursal se cargan automáticamente todos sus productos para el conteo.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Conteo *</label>
              <SearchableSelect
                options={Object.values(CountType).map((type) => ({
                  value: type,
                  label: inventoryService.getCountTypeLabel(type),
                }))}
                value={formData.countType}
                onChange={(val) => setFormData({ ...formData, countType: val as CountType })}
                showAllOption={false}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notas (Opcional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Observaciones del conteo..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent"
              />
            </div>
          </div>

          {/* Bloqueo del POS durante la revisión */}
          {formData.branchId && (
            <div
              className={`mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4 ${
                lockState?.locked ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                {lockState?.locked ? (
                  <LockClosedIcon className="h-6 w-6 text-red-600 flex-shrink-0" />
                ) : (
                  <LockOpenIcon className="h-6 w-6 text-gray-500 flex-shrink-0" />
                )}
                <div>
                  <p className={`text-sm font-semibold ${lockState?.locked ? 'text-red-800' : 'text-gray-800'}`}>
                    {lockState?.locked ? 'POS bloqueado' : 'POS activo'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {lockState?.locked
                      ? 'Las terminales de esta sucursal no pueden hacer movimientos durante la revisión.'
                      : 'Bloquea el POS de la sucursal mientras realizas el conteo físico.'}
                  </p>
                </div>
              </div>
              {lockState?.locked ? (
                <button
                  type="button"
                  onClick={handleUnlockPos}
                  disabled={forceUnlockMut.isPending}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  <LockOpenIcon className="h-5 w-5" />
                  Desbloquear POS
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleLockPos}
                  disabled={lockMut.isPending}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#3E667D] text-white rounded-lg hover:bg-[#2f5165] transition-colors disabled:opacity-50"
                >
                  <LockClosedIcon className="h-5 w-5" />
                  Bloquear POS
                </button>
              )}
            </div>
          )}
        </div>

        {/* Products Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Productos a Contar
              {items.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">({items.length})</span>
              )}
            </h2>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={items.length === 0}
              className="flex items-center gap-2 px-4 py-2 border border-[#3E667D] text-[#3E667D] rounded-lg hover:bg-[#C8DDF2]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              Descargar informe PDF
            </button>
          </div>

          {errors.items && <p className="mb-4 text-sm text-red-500">{errors.items}</p>}

          {/* Estados */}
          {!formData.branchId ? (
            <div className="text-center py-12 text-gray-500">
              <ClipboardDocumentCheckIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Selecciona una sucursal para cargar sus productos</p>
            </div>
          ) : stockLoading ? (
            <div className="text-center py-12 text-gray-500">
              <ArrowPathIcon className="h-8 w-8 mx-auto mb-3 text-[#3E667D] animate-spin" />
              <p>Cargando productos de la sucursal...</p>
            </div>
          ) : stockError ? (
            <div className="text-center py-12">
              <p className="text-red-500 mb-2">No se pudieron cargar los productos</p>
              <button
                type="button"
                onClick={() => refetchStock()}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <ArrowPathIcon className="h-4 w-4" />
                Reintentar
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Esta sucursal no tiene productos con inventario.</p>
            </div>
          ) : (
            <>
              {/* Filtro */}
              <div className="relative mb-4">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filtrar por nombre o SKU dentro del conteo..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Producto</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Existencias en Sistema</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Cantidad Real</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Diferencia</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleItems.map((item) => (
                      <tr key={item.productId} className="border-b border-gray-100">
                        <td className="py-3 px-4">
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-sm text-gray-500">{item.productCode}</div>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600">{item.currentQuantity}</td>
                        <td className="py-3 px-4 text-right">
                          <input
                            type="number"
                            min="0"
                            value={item.newQuantity}
                            onChange={(e) =>
                              handleNewQuantityChange(item.productId, parseInt(e.target.value) || 0)
                            }
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-right focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent"
                          />
                        </td>
                        <td className="py-3 px-4 text-right">
                          {item.difference !== 0 ? (
                            <span
                              className={`inline-flex items-center gap-1 font-medium ${
                                item.difference > 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {item.difference > 0 ? (
                                <ArrowUpIcon className="h-4 w-4" />
                              ) : (
                                <ArrowDownIcon className="h-4 w-4" />
                              )}
                              {item.difference > 0 ? '+' : ''}
                              {item.difference}
                            </span>
                          ) : (
                            <span className="text-gray-400">Sin cambio</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={item.reason || ''}
                            onChange={(e) => handleReasonChange(item.productId, e.target.value)}
                            placeholder="Opcional..."
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent text-sm"
                          />
                        </td>
                      </tr>
                    ))}
                    {visibleItems.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          Ningún producto coincide con "{filter}"
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap justify-end gap-6 text-sm">
                <div className="text-gray-600">
                  Con diferencia: <span className="font-bold text-gray-900">{diffCount}</span>
                </div>
                {totalIncrease > 0 && (
                  <div className="text-green-600">
                    Incrementos: <span className="font-bold">+{totalIncrease}</span>
                  </div>
                )}
                {totalDecrease > 0 && (
                  <div className="text-red-600">
                    Decrementos: <span className="font-bold">-{totalDecrease}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

      </form>
      </div>
    </div>
  );
}
