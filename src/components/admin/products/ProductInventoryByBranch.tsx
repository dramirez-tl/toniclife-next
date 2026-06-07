'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BuildingStorefrontIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
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

  // Show ALL branches — those with stock and those without
  const activeBranchesWithStock = branches.filter((b) => branchStockMap.has(b.id));
  const branchesWithoutStock = branches.filter((b) => !branchStockMap.has(b.id));

  // Count enabled branches
  const enabledCount = activeBranchesWithStock.filter((b) => {
    const stock = branchStockMap.get(b.id);
    return stock?.isActive !== false;
  }).length;

  return (
    <Card className="p-0">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <BuildingStorefrontIcon className="h-5 w-5 text-[#3E667D]" />
          <h2 className="text-lg font-bold text-gray-900">Inventario por Sucursal</h2>
          {branches.length > 0 && (
            <span className="text-xs bg-[#C8DDF2] text-[#3E667D] px-2 py-0.5 rounded-full font-medium">
              {enabledCount} de {branches.length} habilitadas
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Usa el switch para habilitar/deshabilitar el producto en cada sucursal. Los campos vacíos usan los valores por defecto.
        </p>

        {branches.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
            <BuildingStorefrontIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-1">
              No hay sucursales activas
            </p>
          </div>
        )}

        {branches.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table className="w-full text-sm">
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 hover:bg-transparent">
                    <TableHead className="text-center px-3 py-2.5 text-xs font-medium text-gray-500 uppercase w-[70px]">
                      Activo
                    </TableHead>
                    <TableHead className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase w-[180px]">
                      Sucursal
                    </TableHead>
                    <TableHead className="text-center px-3 py-2.5 text-xs font-medium text-gray-500 uppercase w-[80px]">
                      Stock
                    </TableHead>
                    {OVERRIDE_FIELDS.map((field) => (
                      <TableHead key={field.key} className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 uppercase">
                        <div className="flex items-center gap-1">
                          {field.label}
                          <div className="relative group">
                            <InformationCircleIcon className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                            <div className="absolute left-5 top-0 z-30 hidden group-hover:block w-52">
                              <div className="bg-gray-900 text-white text-xs rounded-lg p-2.5 shadow-xl">
                                <p>{field.tooltip}</p>
                                <p className="text-gray-400 mt-1">
                                  Default: {defaults[field.key]}
                                </p>
                                <div className="absolute -left-1.5 top-1.5 w-3 h-3 bg-gray-900 rotate-45" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center px-3 py-2.5 text-xs font-medium text-gray-500 uppercase w-[60px]">
                      Acc.
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Branches WITH stock data */}
                  {activeBranchesWithStock.map((branch) => {
                    const stock = branchStockMap.get(branch.id)!;
                    const isActive = stock.isActive !== false;
                    const values = editValues[branch.id] || {
                      minStockAlert: '',
                      maxStockLevel: '',
                      reorderPoint: '',
                      reorderQuantity: '',
                    };
                    const isSaving = savingBranchId === branch.id;
                    const isToggling = togglingBranchId === branch.id;

                    return (
                      <TableRow
                        key={branch.id}
                        className={`border-b border-gray-50 hover:bg-gray-50/50 ${!isActive ? 'opacity-50' : ''}`}
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
                          <div>
                            <span className="font-medium text-gray-700 text-sm">
                              {branch.name}
                            </span>
                            <span className="block text-[10px] text-gray-400 mt-0.5">
                              {branch.code}
                            </span>
                          </div>
                        </TableCell>

                        {/* Current stock */}
                        <TableCell className="px-3 py-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              !isActive
                                ? 'bg-gray-100 text-gray-400'
                                : stock.isLowStock
                                ? 'bg-red-50 text-red-700'
                                : stock.quantityAvailable > 0
                                ? 'bg-green-50 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {stock.quantityAvailable}
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
                                  onChange={(e) =>
                                    handleChange(branch.id, field.key, e.target.value)
                                  }
                                  disabled={!isActive}
                                  placeholder={String(defaults[field.key])}
                                  className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-[#3E667D] focus:border-[#3E667D] outline-none disabled:bg-gray-50 disabled:text-gray-400 ${
                                    hasOverride
                                      ? 'border-blue-300 bg-blue-50/30'
                                      : 'border-gray-200'
                                  }`}
                                />
                                {hasOverride && (
                                  <span className="absolute -top-1.5 -right-1 text-[8px] bg-blue-500 text-white px-1 rounded">
                                    custom
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          );
                        })}

                        {/* Save button — enabled only when inputs differ from server values */}
                        <TableCell className="px-3 py-2 text-center">
                          {(() => {
                            const dirty = isDirty(branch.id);
                            return (
                              <button
                                type="button"
                                onClick={() => handleSave(branch.id)}
                                disabled={isSaving || !isActive || !dirty}
                                className={`p-1.5 rounded-md transition-colors disabled:opacity-30 ${
                                  dirty
                                    ? 'text-[#3E667D] hover:bg-[#C8DDF2]/40 cursor-pointer'
                                    : 'text-gray-300 cursor-default'
                                }`}
                                title={dirty ? 'Guardar cambios' : 'Sin cambios'}
                              >
                                {isSaving ? (
                                  <div className="h-4 w-4 border-2 border-[#3E667D] border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                                    <path d="M15.988 3.012A2.25 2.25 0 0 0 14.174 2H5.25A2.25 2.25 0 0 0 3 4.25v11.5A2.25 2.25 0 0 0 5.25 18h9.5A2.25 2.25 0 0 0 17 15.75V5.826a2.25 2.25 0 0 0-.512-1.414l-.5-.6ZM5.25 3.5h7.336a.75.75 0 0 1 .574.268l1.414 1.7a.75.75 0 0 1 .176.482v9.8a.75.75 0 0 1-.75.75h-9.5a.75.75 0 0 1-.75-.75V4.25a.75.75 0 0 1 .75-.75h.75v2.5a.75.75 0 0 0 1.5 0V3.5Zm4.75 6a2.25 2.25 0 1 0 0 4.5 2.25 2.25 0 0 0 0-4.5Z" />
                                  </svg>
                                )}
                              </button>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Branches WITHOUT stock data — shown as disabled by default */}
                  {branchesWithoutStock.map((branch) => {
                    const isToggling = togglingBranchId === branch.id;

                    return (
                      <TableRow
                        key={branch.id}
                        className="border-b border-gray-50 hover:bg-gray-50/50 opacity-50"
                      >
                        {/* Toggle — will create stock_levels row when enabled */}
                        <TableCell className="px-3 py-3 text-center">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={false}
                            disabled={isToggling}
                            onClick={() => handleToggleAvailability(branch.id, false)}
                            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#3E667D] focus:ring-offset-2 disabled:opacity-50"
                          >
                            <span className="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-0" />
                          </button>
                        </TableCell>

                        {/* Branch info */}
                        <TableCell className="px-4 py-3">
                          <div>
                            <span className="font-medium text-gray-700 text-sm">
                              {branch.name}
                            </span>
                            <span className="block text-[10px] text-gray-400 mt-0.5">
                              {branch.code}
                            </span>
                          </div>
                        </TableCell>

                        {/* No stock */}
                        <TableCell className="px-3 py-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
                            —
                          </span>
                        </TableCell>

                        {/* Empty override fields */}
                        {OVERRIDE_FIELDS.map((field) => (
                          <TableCell key={field.key} className="px-3 py-2">
                            <input
                              type="number"
                              disabled
                              placeholder={String(defaults[field.key])}
                              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-gray-50 text-gray-400"
                            />
                          </TableCell>
                        ))}

                        {/* No save button */}
                        <TableCell className="px-3 py-2 text-center">
                          <span className="text-gray-300">—</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
