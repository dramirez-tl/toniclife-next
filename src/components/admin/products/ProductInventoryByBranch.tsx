'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BuildingStorefrontIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useProductStock, useUpdateStockSettings } from '@/hooks/useInventory';
import { useActiveBranches } from '@/hooks/useBranches';
import type { ProductStockDto } from '@/types/inventory';

interface ProductInventoryByBranchProps {
  productId: string;
  defaults: {
    minStockAlert: number;
    maxStockLevel: number;
    reorderPoint: number;
    reorderQuantity: number;
  };
}

// Fields we allow to override
const OVERRIDE_FIELDS = [
  { key: 'minStockAlert', label: 'Alerta Mín.', tooltip: 'Cantidad mínima antes de generar alerta de stock bajo' },
  { key: 'maxStockLevel', label: 'Stock Máx.', tooltip: 'Capacidad máxima de almacenamiento en esta sucursal' },
  { key: 'reorderPoint', label: 'Pto. Reorden', tooltip: 'Cantidad a la que se debe generar pedido de reabastecimiento' },
  { key: 'reorderQuantity', label: 'Cant. Reorden', tooltip: 'Cantidad sugerida a pedir en cada reabastecimiento' },
] as const;

type OverrideKey = typeof OVERRIDE_FIELDS[number]['key'];

type BranchOverrides = Record<OverrideKey, string>;

export function ProductInventoryByBranch({ productId, defaults }: ProductInventoryByBranchProps) {
  const { data: stockData = [], isLoading: stockLoading } = useProductStock(productId);
  const { data: branches = [], isLoading: branchesLoading } = useActiveBranches();
  const updateSettings = useUpdateStockSettings();

  // Local editable state indexed by branchId
  const [editValues, setEditValues] = useState<Record<string, BranchOverrides>>({});
  const [savingBranchId, setSavingBranchId] = useState<string | null>(null);
  const [togglingBranchId, setTogglingBranchId] = useState<string | null>(null);

  // Filtros de la tabla (127 sucursales: buscar + ocultar deshabilitadas)
  const [search, setSearch] = useState('');
  const [onlyEnabled, setOnlyEnabled] = useState(false);

  // Track original server values to detect dirty state
  const originalValues = useRef<Record<string, BranchOverrides>>({});

  // Check if a branch has unsaved changes
  const isDirty = useCallback((branchId: string) => {
    const current = editValues[branchId];
    const original = originalValues.current[branchId];
    if (!current || !original) return false;
    return OVERRIDE_FIELDS.some((f) => current[f.key] !== original[f.key]);
  }, [editValues]);

  // Initialize edit values from stock data
  useEffect(() => {
    if (!stockData.length) return;

    const newValues: Record<string, BranchOverrides> = {};
    for (const stock of stockData) {
      newValues[stock.branchId] = {
        minStockAlert: stock.minStockAlertOverride != null ? String(stock.minStockAlertOverride) : '',
        maxStockLevel: stock.maxStockLevelOverride != null ? String(stock.maxStockLevelOverride) : '',
        reorderPoint: stock.reorderPointOverride != null ? String(stock.reorderPointOverride) : '',
        reorderQuantity: stock.reorderQuantityOverride != null ? String(stock.reorderQuantityOverride) : '',
      };
    }
    originalValues.current = { ...originalValues.current, ...newValues };
    setEditValues((prev) => ({ ...prev, ...newValues }));
  }, [stockData]);

  const handleChange = (branchId: string, field: OverrideKey, value: string) => {
    setEditValues((prev) => ({
      ...prev,
      [branchId]: {
        ...prev[branchId],
        minStockAlert: prev[branchId]?.minStockAlert || '',
        maxStockLevel: prev[branchId]?.maxStockLevel || '',
        reorderPoint: prev[branchId]?.reorderPoint || '',
        reorderQuantity: prev[branchId]?.reorderQuantity || '',
        [field]: value,
      },
    }));
  };

  const handleSave = async (branchId: string) => {
    const values = editValues[branchId];
    if (!values) return;

    setSavingBranchId(branchId);

    try {
      await updateSettings.mutateAsync({
        branchId,
        productId,
        dto: {
          minStockAlert: values.minStockAlert ? parseFloat(values.minStockAlert) : null,
          maxStockLevel: values.maxStockLevel ? parseFloat(values.maxStockLevel) : null,
          reorderPoint: values.reorderPoint ? parseFloat(values.reorderPoint) : null,
          reorderQuantity: values.reorderQuantity ? parseFloat(values.reorderQuantity) : null,
        },
      });
      toast.success('Configuración guardada');
    } catch {
      toast.error('Error al guardar configuración');
    } finally {
      setSavingBranchId(null);
    }
  };

  const handleToggleAvailability = async (branchId: string, currentlyActive: boolean) => {
    setTogglingBranchId(branchId);
    try {
      await updateSettings.mutateAsync({
        branchId,
        productId,
        dto: { isActive: !currentlyActive },
      });
      const branchName = branches.find((b) => b.id === branchId)?.name || 'Sucursal';
      toast.success(`${branchName}: producto ${!currentlyActive ? 'habilitado' : 'deshabilitado'}`);
    } catch {
      toast.error('Error al cambiar disponibilidad');
    } finally {
      setTogglingBranchId(null);
    }
  };

  const isLoading = stockLoading || branchesLoading;

  if (isLoading) {
    return (
      <Card className="p-0">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <BuildingStorefrontIcon className="h-5 w-5 text-gray-400 animate-pulse" />
            <span className="text-sm text-gray-500">Cargando inventario por sucursal...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Build map of stock data by branchId
  const branchStockMap = new Map<string, ProductStockDto>();
  for (const stock of stockData) {
    branchStockMap.set(stock.branchId, stock);
  }

  // Sucursal "habilitada" = tiene fila de stock y no está marcada inactiva
  const isBranchEnabled = (branchId: string) => {
    const stock = branchStockMap.get(branchId);
    return !!stock && stock.isActive !== false;
  };

  const enabledCount = branches.filter((b) => isBranchEnabled(b.id)).length;

  // Lista unificada filtrada (buscador + solo-habilitadas) y ordenada:
  // habilitadas primero, luego las que tienen stock, luego alfabético.
  const q = search.trim().toLowerCase();
  const visibleBranches = branches
    .filter((b) => {
      if (onlyEnabled && !isBranchEnabled(b.id)) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        (b.code ?? '').toLowerCase().includes(q)
      );
    })
    .sort((a, bb) => {
      const ea = isBranchEnabled(a.id) ? 0 : 1;
      const eb = isBranchEnabled(bb.id) ? 0 : 1;
      if (ea !== eb) return ea - eb;
      const sa = branchStockMap.has(a.id) ? 0 : 1;
      const sb = branchStockMap.has(bb.id) ? 0 : 1;
      if (sa !== sb) return sa - sb;
      return a.name.localeCompare(bb.name);
    });

  return (
    <Card className="p-0">
      <CardContent className="p-6">
        {/* Header */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <BuildingStorefrontIcon className="h-5 w-5 text-[#3E667D]" />
          <h2 className="text-lg font-bold text-gray-900">Inventario por Sucursal</h2>
          {branches.length > 0 && (
            <span className="rounded-full bg-[#C8DDF2] px-2 py-0.5 text-xs font-medium text-[#3E667D]">
              {enabledCount} de {branches.length} habilitadas
            </span>
          )}
        </div>
        <p className="mb-4 text-xs text-gray-500">
          Usa el switch para habilitar/deshabilitar el producto en cada sucursal. Los campos vacíos usan los valores por defecto.
        </p>

        {branches.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 py-8 text-center">
            <BuildingStorefrontIcon className="mx-auto mb-3 h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">No hay sucursales activas</p>
          </div>
        ) : (
          <>
            {/* Buscador + filtro */}
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar sucursal por nombre o código..."
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-transparent focus:ring-2 focus:ring-[#3E667D]"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOnlyEnabled((v) => !v)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    onlyEnabled
                      ? 'border-[#3E667D] bg-[#C8DDF2]/40 text-[#3E667D]'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      onlyEnabled ? 'bg-[#3E667D]' : 'bg-gray-300'
                    }`}
                  />
                  Solo habilitadas
                </button>
                <span className="whitespace-nowrap text-sm text-gray-500">
                  {visibleBranches.length} de {branches.length}
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200">
              <div className="max-h-[600px] overflow-auto">
                <Table className="w-full text-sm">
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 hover:bg-transparent">
                      <TableHead className="sticky top-0 z-10 w-[70px] bg-gray-100 px-3 py-2.5 text-center text-xs font-medium uppercase text-gray-500">
                        Activo
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 min-w-[200px] bg-gray-100 px-4 py-2.5 text-left text-xs font-medium uppercase text-gray-500">
                        Sucursal
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 w-[80px] bg-gray-100 px-3 py-2.5 text-center text-xs font-medium uppercase text-gray-500">
                        Stock
                      </TableHead>
                      {OVERRIDE_FIELDS.map((field) => (
                        <TableHead
                          key={field.key}
                          className="sticky top-0 z-10 min-w-[120px] bg-gray-100 px-3 py-2.5 text-left text-xs font-medium uppercase text-gray-500"
                        >
                          <div className="flex items-center gap-1">
                            {field.label}
                            <div className="group relative">
                              <InformationCircleIcon className="h-3.5 w-3.5 cursor-help text-gray-400" />
                              <div className="absolute left-5 top-0 z-30 hidden w-52 group-hover:block">
                                <div className="rounded-lg bg-gray-900 p-2.5 text-xs text-white shadow-xl">
                                  <p>{field.tooltip}</p>
                                  <p className="mt-1 text-gray-400">Default: {defaults[field.key]}</p>
                                  <div className="absolute -left-1.5 top-1.5 h-3 w-3 rotate-45 bg-gray-900" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="sticky top-0 z-10 w-[60px] bg-gray-100 px-3 py-2.5 text-center text-xs font-medium uppercase text-gray-500">
                        Acc.
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleBranches.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4 + OVERRIDE_FIELDS.length}
                          className="px-4 py-10 text-center text-sm text-gray-500"
                        >
                          Ninguna sucursal coincide con la búsqueda.
                        </TableCell>
                      </TableRow>
                    ) : (
                      visibleBranches.map((branch) => {
                        const stock = branchStockMap.get(branch.id) ?? null;
                        const hasStock = !!stock;
                        const isActive = stock ? stock.isActive !== false : false;
                        const values = editValues[branch.id] || {
                          minStockAlert: '',
                          maxStockLevel: '',
                          reorderPoint: '',
                          reorderQuantity: '',
                        };
                        const isSaving = savingBranchId === branch.id;
                        const isToggling = togglingBranchId === branch.id;
                        const dirty = isDirty(branch.id);

                        return (
                          <TableRow
                            key={branch.id}
                            className={`border-b border-gray-50 hover:bg-gray-50/50 ${!isActive ? 'opacity-60' : ''}`}
                          >
                            {/* Toggle */}
                            <TableCell className="px-3 py-3 text-center">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isActive}
                                disabled={isToggling}
                                onClick={() => handleToggleAvailability(branch.id, isActive)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#3E667D] focus:ring-offset-2 disabled:opacity-50 ${
                                  isActive ? 'bg-[#3E667D]' : 'bg-gray-200'
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    isActive ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </TableCell>

                            {/* Branch info */}
                            <TableCell className="px-4 py-3">
                              <span className="text-sm font-medium text-gray-700">{branch.name}</span>
                              <span className="mt-0.5 block text-[10px] text-gray-400">{branch.code}</span>
                            </TableCell>

                            {/* Current stock */}
                            <TableCell className="px-3 py-3 text-center">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                  !hasStock || !isActive
                                    ? 'bg-gray-100 text-gray-400'
                                    : stock!.isLowStock
                                    ? 'bg-red-50 text-red-700'
                                    : stock!.quantityAvailable > 0
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-gray-100 text-gray-500'
                                }`}
                              >
                                {hasStock ? stock!.quantityAvailable : '—'}
                              </span>
                            </TableCell>

                            {/* Override fields */}
                            {OVERRIDE_FIELDS.map((field) => {
                              const hasOverride = values[field.key] !== '';
                              return (
                                <TableCell key={field.key} className="px-3 py-2">
                                  <div className="relative">
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={values[field.key]}
                                      onChange={(e) => handleChange(branch.id, field.key, e.target.value)}
                                      disabled={!isActive}
                                      placeholder={String(defaults[field.key])}
                                      className={`w-full rounded-md border px-2.5 py-1.5 text-sm outline-none focus:border-[#3E667D] focus:ring-1 focus:ring-[#3E667D] disabled:bg-gray-50 disabled:text-gray-400 ${
                                        hasOverride ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200'
                                      }`}
                                    />
                                    {hasOverride && (
                                      <span className="absolute -right-1 -top-1.5 rounded bg-blue-500 px-1 text-[8px] text-white">
                                        custom
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                              );
                            })}

                            {/* Save */}
                            <TableCell className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleSave(branch.id)}
                                disabled={isSaving || !isActive || !dirty}
                                className={`rounded-md p-1.5 transition-colors disabled:opacity-30 ${
                                  dirty && isActive
                                    ? 'cursor-pointer text-[#3E667D] hover:bg-[#C8DDF2]/40'
                                    : 'cursor-default text-gray-300'
                                }`}
                                title={dirty ? 'Guardar cambios' : 'Sin cambios'}
                              >
                                {isSaving ? (
                                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#3E667D] border-t-transparent" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                              </button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
