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
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DataTable, type DataTableColumn } from '@/components/ui';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import {
  clampCountQuantity,
  countUpperLimit,
  FOREIGN_KEY_COUNT_BADGE,
  FOREIGN_KEY_HELP,
  isForeignStockRow,
} from '@/lib/inventory/foreign-product';

interface AdjustmentItem {
  productId: string;
  productCode: string;
  productName: string;
  currentQuantity: number;
  newQuantity: number;
  difference: number;
  reason?: string;
  /** Clave de otro país: en el conteo solo se confirma o se baja. */
  foreign?: boolean;
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
  const [onlyForeign, setOnlyForeign] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sucursales para el selector
  const { data: branches } = useActiveBranches();

  // Al seleccionar sucursal se cargan TODOS sus productos (todas las páginas).
  // 'count' = claves del país de la sucursal y, de las de otro país, solo las
  // que aún tienen piezas: las demás ya no salen en la hoja de conteo.
  const {
    data: allStock,
    isLoading: stockLoading,
    isError: stockError,
    refetch: refetchStock,
  } = useAllBranchStock(formData.branchId || null, 'count');

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
    // Único desbloqueo disponible aquí = FORZADO: cancela TODOS los conteos
    // activos de la sucursal (no solo el de quien desbloquea).
    const ok = await confirmAction(
      `Desbloqueo forzado de ${branchName}: se reactivará el POS y se CANCELARÁN TODOS los conteos activos de esta sucursal (planeados, en progreso o pendientes de aprobación), incluidos los de otros usuarios. No se puede deshacer. ¿Continuar?`,
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
      setOnlyForeign(false);
      loadedBranchRef.current = '';
      return;
    }
    if (loadedBranchRef.current === formData.branchId) return;
    setOnlyForeign(false);

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
          foreign: isForeignStockRow(stock),
        })),
      );
      setFilter('');
    } else {
      // La sucursal cambió y aún se está cargando: limpiar renglones viejos
      setItems([]);
    }
  }, [formData.branchId, allStock]);

  const visibleItems = useMemo(() => {
    // "Ver solo esas claves" (aviso de claves de otro país).
    const base = onlyForeign ? items.filter((i) => i.foreign) : items;
    const q = filter.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (i) =>
        i.productName.toLowerCase().includes(q) ||
        i.productCode.toLowerCase().includes(q),
    );
  }, [items, filter, onlyForeign]);

  const handleNewQuantityChange = (productId: string, newQuantity: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        // Una clave de otro país nunca sube: como mucho, lo que ya hay.
        const next = clampCountQuantity(newQuantity, item.foreign, item.currentQuantity);
        return { ...item, newQuantity: next, difference: next - item.currentQuantity };
      }),
    );
  };

  const handleReasonChange = (productId: string, reason: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, reason } : item,
      ),
    );
  };

  const columns = useMemo<DataTableColumn<AdjustmentItem>[]>(
    () => [
      {
        key: 'producto',
        header: 'Producto',
        render: (item) => (
          <>
            <div className="font-medium">{item.productName}</div>
            <div className="text-sm text-gray-500">{item.productCode}</div>
            {item.foreign && (
              <span
                title={FOREIGN_KEY_HELP}
                className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
              >
                {FOREIGN_KEY_COUNT_BADGE}
              </span>
            )}
          </>
        ),
      },
      {
        key: 'currentQuantity',
        header: 'Existencias en Sistema',
        headerClassName: 'text-right',
        cellClassName: 'text-right text-gray-600',
        render: (item) => item.currentQuantity,
      },
      {
        key: 'newQuantity',
        header: 'Cantidad Real',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        render: (item) => (
          <input
            type="number"
            min="0"
            max={countUpperLimit(item.foreign, item.currentQuantity)}
            value={item.newQuantity}
            onChange={(e) =>
              handleNewQuantityChange(item.productId, parseInt(e.target.value) || 0)
            }
            className="w-24 px-2 py-1 border border-gray-300 rounded text-right focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent"
          />
        ),
      },
      {
        key: 'difference',
        header: 'Diferencia',
        headerClassName: 'text-right',
        cellClassName: 'text-right',
        render: (item) =>
          item.difference !== 0 ? (
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
          ),
      },
      {
        key: 'reason',
        header: 'Motivo',
        render: (item) => (
          <input
            type="text"
            value={item.reason || ''}
            onChange={(e) => handleReasonChange(item.productId, e.target.value)}
            placeholder="Opcional..."
            className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-[#a7c1e2] focus:border-transparent text-sm"
          />
        ),
      },
    ],
    [],
  );

  const branchName = useMemo(
    () => branches?.find((b) => b.id === formData.branchId)?.name ?? 'Sucursal',
    [branches, formData.branchId],
  );

  const handleDownloadPdf = async () => {
    if (items.length === 0) {
      toast.error('Selecciona una sucursal con productos para generar el informe');
      return;
    }
    try {
      await exportInventoryCountPdf({
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
    } catch (err) {
      console.error(err);
      toast.error('No se pudo generar el PDF');
    }
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
      // Sin systemQuantity: la existencia del sistema la lee el servidor al
      // guardar (el valor cargado aquí es solo referencia para el capturista).
      items: items
        .filter((item) => item.difference !== 0)
        .map((item) => ({
          productId: item.productId,
          countedQuantity: item.newQuantity,
          notes: item.reason,
        })),
    };

    try {
      await createAdjustment.mutateAsync(adjustmentData);
      // Informe PDF del conteo al finalizar
      handleDownloadPdf();
      toast.success('Conteo creado. La diferencia se calculó con la existencia del sistema al guardar.');
      router.push('/admin/inventario/ajustes');
    } catch (error) {
      console.error('Error creating adjustment:', error);
      const msg = (error as { response?: { data?: { message?: string | string[] } } })
        ?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(' ') : msg || 'Error al crear el ajuste');
    }
  };

  const totalIncrease = items
    .filter((item) => item.difference > 0)
    .reduce((sum, item) => sum + item.difference, 0);
  const totalDecrease = items
    .filter((item) => item.difference < 0)
    .reduce((sum, item) => sum + Math.abs(item.difference), 0);
  const diffCount = items.filter((item) => item.difference !== 0).length;
  const foreignCount = items.filter((item) => item.foreign).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-14 z-10 border-b bg-white/95 backdrop-blur-sm lg:top-12">
        <div className="px-4 sm:px-6 lg:px-8 py-5">
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
      <div className="px-4 sm:px-6 lg:px-8 py-8">
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
                <div className="flex flex-col items-start sm:items-end gap-1">
                  <button
                    type="button"
                    onClick={handleUnlockPos}
                    disabled={forceUnlockMut.isPending}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-red-300 rounded-lg text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <LockOpenIcon className="h-5 w-5" />
                    Desbloqueo forzado del POS
                  </button>
                  <p className="text-xs text-red-600">
                    Cancela TODOS los conteos activos de la sucursal.
                  </p>
                </div>
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

          {formData.branchId && items.length > 0 && (
            <Alert className="mb-4">
              <InformationCircleIcon className="h-4 w-4" />
              <AlertTitle>La existencia del sistema se toma al guardar</AlertTitle>
              <AlertDescription>
                La columna «Existencias en Sistema» es la lectura de cuando cargaste la sucursal.
                Si hubo ventas o movimientos mientras contabas, el servidor calcula la diferencia
                con la existencia real en el momento de crear el conteo, no con la que ves aquí.
              </AlertDescription>
            </Alert>
          )}

          {formData.branchId && foreignCount > 0 && (
            <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-900">
              <InformationCircleIcon className="h-4 w-4" />
              <AlertTitle>
                {foreignCount === 1
                  ? 'Hay 1 clave de otro país con piezas en esta sucursal'
                  : `Hay ${foreignCount} claves de otro país con piezas en esta sucursal`}
              </AlertTitle>
              <AlertDescription className="text-amber-900">
                <p>
                  {foreignCount === 1
                    ? 'No tiene precio en el país de esta sucursal, así que aquí no se maneja. En el conteo solo puedes confirmar lo que hay o bajarlo; para sacarla usa una salida.'
                    : 'No tienen precio en el país de esta sucursal, así que aquí no se manejan. En el conteo solo puedes confirmar lo que hay o bajarlo; para sacarlas usa una salida.'}
                </p>
                <button
                  type="button"
                  onClick={() => setOnlyForeign((v) => !v)}
                  className="mt-2 inline-flex items-center rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
                >
                  {onlyForeign
                    ? 'Ver todos los productos'
                    : foreignCount === 1
                      ? 'Ver solo esa clave'
                      : 'Ver solo esas claves'}
                </button>
              </AlertDescription>
            </Alert>
          )}

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

              <DataTable<AdjustmentItem>
                columns={columns}
                data={visibleItems}
                getRowKey={(item, i) => String(item.productId ?? i)}
                emptyState={
                  <p className="text-sm text-gray-500">
                    Ningún producto coincide con &quot;{filter}&quot;
                  </p>
                }
              />

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
