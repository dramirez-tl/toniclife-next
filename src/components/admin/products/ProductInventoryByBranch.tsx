'use client';

import { useState, useEffect } from 'react';
import {
  BuildingStorefrontIcon,
  CheckIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/Card';
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

  const isLoading = stockLoading || branchesLoading;

  if (isLoading) {
    return (
      <Card padding="none">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <BuildingStorefrontIcon className="h-5 w-5 text-gray-400 animate-pulse" />
            <span className="text-sm text-gray-500">Cargando inventario por sucursal...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Merge stock data with branch info
  // Show all branches that have stock records, plus a note about adding new ones
  const branchStockMap = new Map<string, ProductStockDto>();
  for (const stock of stockData) {
    branchStockMap.set(stock.branchId, stock);
  }

  // Show branches that have stock data
  const activeBranchesWithStock = branches.filter((b) => branchStockMap.has(b.id));
  // Branches without stock data
  const branchesWithoutStock = branches.filter((b) => !branchStockMap.has(b.id));

  return (
    <Card padding="none">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <BuildingStorefrontIcon className="h-5 w-5 text-[#3E667D]" />
          <h2 className="text-lg font-bold text-gray-900">Inventario por Sucursal</h2>
          {activeBranchesWithStock.length > 0 && (
            <span className="text-xs bg-[#C8DDF2] text-[#3E667D] px-2 py-0.5 rounded-full font-medium">
              {activeBranchesWithStock.length}{' '}
              {activeBranchesWithStock.length === 1 ? 'sucursal' : 'sucursales'}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-5">
          Los campos vacíos usan los valores por defecto del producto. Escribe un valor para personalizar por sucursal.
        </p>

        {activeBranchesWithStock.length === 0 && branchesWithoutStock.length > 0 && (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
            <BuildingStorefrontIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-1">
              No hay registros de stock en ninguna sucursal
            </p>
            <p className="text-xs text-gray-400">
              El stock se crea automáticamente al realizar movimientos de inventario
            </p>
          </div>
        )}

        {activeBranchesWithStock.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase w-[180px]">
                      Sucursal
                    </th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500 uppercase w-[80px]">
                      Stock
                    </th>
                    {OVERRIDE_FIELDS.map((field) => (
                      <th key={field.key} className="text-left px-3 py-2.5 text-xs font-medium text-gray-500 uppercase">
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
                      </th>
                    ))}
                    <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500 uppercase w-[60px]">
                      Acc.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeBranchesWithStock.map((branch) => {
                    const stock = branchStockMap.get(branch.id)!;
                    const values = editValues[branch.id] || {
                      minStockAlert: '',
                      maxStockLevel: '',
                      reorderPoint: '',
                      reorderQuantity: '',
                    };
                    const isSaving = savingBranchId === branch.id;

                    return (
                      <tr
                        key={branch.id}
                        className="border-b border-gray-50 hover:bg-gray-50/50"
                      >
                        {/* Branch info */}
                        <td className="px-4 py-3">
                          <div>
                            <span className="font-medium text-gray-700 text-sm">
                              {branch.name}
                            </span>
                            <span className="block text-[10px] text-gray-400 mt-0.5">
                              {branch.code}
                            </span>
                          </div>
                        </td>

                        {/* Current stock */}
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              stock.isLowStock
                                ? 'bg-red-50 text-red-700'
                                : stock.quantityAvailable > 0
                                ? 'bg-green-50 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {stock.quantityAvailable}
                          </span>
                        </td>

                        {/* Override fields */}
                        {OVERRIDE_FIELDS.map((field) => {
                          const hasOverride = values[field.key] !== '';

                          return (
                            <td key={field.key} className="px-3 py-2">
                              <div className="relative">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={values[field.key]}
                                  onChange={(e) =>
                                    handleChange(branch.id, field.key, e.target.value)
                                  }
                                  placeholder={String(defaults[field.key])}
                                  className={`w-full px-2.5 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-[#3E667D] focus:border-[#3E667D] outline-none ${
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
                            </td>
                          );
                        })}

                        {/* Save button */}
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleSave(branch.id)}
                            disabled={isSaving}
                            className="p-1.5 rounded-md text-green-600 hover:bg-green-50 disabled:opacity-30"
                            title="Guardar"
                          >
                            {isSaving ? (
                              <div className="h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <CheckIcon className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Note about branches without stock */}
        {branchesWithoutStock.length > 0 && activeBranchesWithStock.length > 0 && (
          <p className="text-xs text-gray-400 mt-3">
            {branchesWithoutStock.length} sucursal(es) sin registro de stock:{' '}
            {branchesWithoutStock.map((b) => b.name).join(', ')}.
            Se crearán automáticamente al realizar movimientos.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
