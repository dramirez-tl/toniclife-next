'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PlusIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  useProductPrices,
  useCreateProductPrice,
  useDeleteProductPrice,
} from '@/hooks/useProducts';
import { useActiveCountries, useActivePriceTypes } from '@/hooks/useConfig';
import type { ProductPrice } from '@/types/product';
import type { Country, PriceType } from '@/types/config';

interface ProductPricesSectionProps {
  productId: string;
}

// Key for local price state: countryId::priceTypeId
const priceKey = (countryId: string, priceTypeId: string) =>
  `${countryId}::${priceTypeId}`;

// Tooltip helpers for each price type (by code)
const PRICE_TYPE_HELPERS: Record<string, { description: string; example: string }> = {
  public: {
    description: 'Precio base para clientes finales sin descuento. Es el precio de referencia para todos los demás.',
    example: 'Si el producto cuesta $500 MXN, este es el precio que ve el cliente en la tienda.',
  },
  distributor: {
    description: 'Precio con 25% de descuento sobre el precio público. Aplica a distribuidores activos con kit pagado.',
    example: 'Precio público $500 → Distribuidor paga $375 (ahorra $125).',
  },
  wholesale: {
    description: 'Precio mayorista con 35% de descuento. Para distribuidores que compran en volumen o tienen rango alto.',
    example: 'Precio público $500 → Mayorista paga $325 (ahorra $175).',
  },
  employee: {
    description: 'Precio especial para empleados de Tonic Life con 40% de descuento.',
    example: 'Precio público $500 → Empleado paga $300 (ahorra $200).',
  },
  promotional: {
    description: 'Precio temporal para promociones o campañas especiales. Aplica a todos los tipos de cliente.',
    example: 'Se puede poner un precio especial de $399 durante una promoción de temporada.',
  },
};

export function ProductPricesSection({ productId }: ProductPricesSectionProps) {
  const { data: prices = [], isLoading: pricesLoading } = useProductPrices(productId);
  const { data: countries = [], isLoading: countriesLoading } = useActiveCountries();
  const { data: priceTypes = [], isLoading: priceTypesLoading } = useActivePriceTypes();

  const createPrice = useCreateProductPrice();
  const deletePrice = useDeleteProductPrice();

  // Countries currently shown in the UI (those with prices + manually added)
  const [activeCountryIds, setActiveCountryIds] = useState<string[]>([]);
  // Local editable price values
  const [editPrices, setEditPrices] = useState<
    Record<string, { price: string; cost: string; existingId?: string }>
  >({});
  // Track which row is saving
  const [savingKey, setSavingKey] = useState<string | null>(null);
  // Track which row is deleting
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  // Add country dropdown open
  const [showAddCountry, setShowAddCountry] = useState(false);
  // Remove country confirmation
  const [removeCountryId, setRemoveCountryId] = useState<string | null>(null);
  const [isRemovingCountry, setIsRemovingCountry] = useState(false);

  // Map currency codes to country objects
  const countryByCurrency = useCallback(
    (currencyCode: string): Country | undefined => {
      return countries.find(
        (c) => c.currencyCode?.trim() === currencyCode.trim()
      );
    },
    [countries]
  );

  // Initialize from existing prices
  useEffect(() => {
    if (!prices.length || !countries.length || !priceTypes.length) return;

    const countriesWithPrices = new Set<string>();
    const newEditPrices: typeof editPrices = {};

    for (const price of prices) {
      const country = countryByCurrency(price.currencyCode);
      if (!country) continue;

      countriesWithPrices.add(country.id);
      const key = priceKey(country.id, price.priceTypeId);
      newEditPrices[key] = {
        price: price.price || '',
        cost: price.cost || '',
        existingId: price.id,
      };
    }

    setActiveCountryIds((prev) => {
      const merged = new Set([...prev, ...countriesWithPrices]);
      return Array.from(merged);
    });
    setEditPrices((prev) => ({ ...prev, ...newEditPrices }));
  }, [prices, countries, priceTypes, countryByCurrency]);

  const handleAddCountry = (countryId: string) => {
    setActiveCountryIds((prev) => [...prev, countryId]);
    setShowAddCountry(false);
  };

  const handleRemoveCountry = async (countryId: string) => {
    const country = countries.find((c) => c.id === countryId);
    if (!country) return;

    // Find all existing prices for this country
    const countryPriceIds = priceTypes
      .map((pt) => {
        const key = priceKey(countryId, pt.id);
        return editPrices[key]?.existingId;
      })
      .filter(Boolean) as string[];

    setIsRemovingCountry(true);

    try {
      // Delete all existing prices for this country
      for (const priceId of countryPriceIds) {
        await deletePrice.mutateAsync({ productId, priceId });
      }

      // Remove from UI
      setActiveCountryIds((prev) => prev.filter((id) => id !== countryId));

      // Clear edit prices for this country
      setEditPrices((prev) => {
        const next = { ...prev };
        for (const pt of priceTypes) {
          delete next[priceKey(countryId, pt.id)];
        }
        return next;
      });

      if (countryPriceIds.length > 0) {
        toast.success(`Precios de ${country.name} eliminados`);
      }
    } catch {
      toast.error(`Error al eliminar precios de ${country.name}`);
    } finally {
      setIsRemovingCountry(false);
      setRemoveCountryId(null);
    }
  };

  const handlePriceChange = (
    countryId: string,
    priceTypeId: string,
    field: 'price' | 'cost',
    value: string
  ) => {
    const key = priceKey(countryId, priceTypeId);
    setEditPrices((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        price: prev[key]?.price || '',
        cost: prev[key]?.cost || '',
        [field]: value,
      },
    }));
  };

  const handleSavePrice = async (
    countryId: string,
    priceTypeId: string
  ) => {
    const key = priceKey(countryId, priceTypeId);
    const editData = editPrices[key];
    const country = countries.find((c) => c.id === countryId);

    if (!editData?.price || !country?.currencyCode) {
      toast.error('Ingresa al menos el precio');
      return;
    }

    const priceNum = parseFloat(editData.price);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error('Precio inválido');
      return;
    }

    const costNum = editData.cost ? parseFloat(editData.cost) : undefined;
    if (costNum !== undefined && (isNaN(costNum) || costNum < 0)) {
      toast.error('Costo inválido');
      return;
    }

    setSavingKey(key);

    try {
      const result = await createPrice.mutateAsync({
        productId,
        dto: {
          priceTypeId,
          currencyCode: country.currencyCode.trim(),
          price: priceNum,
          cost: costNum,
        },
      });

      // Update local state with the new ID
      setEditPrices((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          existingId: result.id,
        },
      }));

      toast.success('Precio guardado');
    } catch {
      toast.error('Error al guardar precio');
    } finally {
      setSavingKey(null);
    }
  };

  const handleDeletePrice = async (
    countryId: string,
    priceTypeId: string
  ) => {
    const key = priceKey(countryId, priceTypeId);
    const existingId = editPrices[key]?.existingId;
    if (!existingId) return;

    setDeletingKey(key);

    try {
      await deletePrice.mutateAsync({ productId, priceId: existingId });

      setEditPrices((prev) => ({
        ...prev,
        [key]: { price: '', cost: '', existingId: undefined },
      }));

      toast.success('Precio eliminado');
    } catch {
      toast.error('Error al eliminar precio');
    } finally {
      setDeletingKey(null);
    }
  };

  // Countries not yet added
  const availableCountries = countries.filter(
    (c) => !activeCountryIds.includes(c.id)
  );

  const isLoading = pricesLoading || countriesLoading || priceTypesLoading;

  if (isLoading) {
    return (
      <Card padding="none">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <CurrencyDollarIcon className="h-5 w-5 text-gray-400 animate-pulse" />
            <span className="text-sm text-gray-500">Cargando precios...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card padding="none">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <CurrencyDollarIcon className="h-5 w-5 text-[#3E667D]" />
            <h2 className="text-lg font-bold text-gray-900">
              Precios por País
            </h2>
            {activeCountryIds.length > 0 && (
              <span className="text-xs bg-[#C8DDF2] text-[#3E667D] px-2 py-0.5 rounded-full font-medium">
                {activeCountryIds.length}{' '}
                {activeCountryIds.length === 1 ? 'país' : 'países'}
              </span>
            )}
          </div>

          {/* Add country button */}
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddCountry(!showAddCountry)}
              disabled={availableCountries.length === 0}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Agregar País
            </Button>

            {showAddCountry && availableCountries.length > 0 && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowAddCountry(false)}
                />
                <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-60 overflow-y-auto">
                  {availableCountries.map((country) => (
                    <button
                      key={country.id}
                      type="button"
                      onClick={() => handleAddCountry(country.id)}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between"
                    >
                      <span>{country.name}</span>
                      <span className="text-xs text-gray-400">
                        {country.currencyCode?.trim()}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Empty state */}
        {activeCountryIds.length === 0 && (
          <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-lg">
            <CurrencyDollarIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-1">
              No hay precios configurados
            </p>
            <p className="text-xs text-gray-400">
              Agrega un país para comenzar a definir precios
            </p>
          </div>
        )}

        {/* Country sections */}
        <div className="space-y-6">
          {activeCountryIds.map((countryId) => {
            const country = countries.find((c) => c.id === countryId);
            if (!country) return null;

            const currencyCode = country.currencyCode?.trim() || '???';

            return (
              <div
                key={countryId}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                {/* Country header */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800 text-sm">
                      {country.name}
                    </span>
                    <span className="text-xs bg-white text-gray-600 px-2 py-0.5 rounded border border-gray-200">
                      {currencyCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setRemoveCountryId(countryId)}
                    className="text-xs text-red-500 hover:text-red-700 hover:underline"
                    disabled={isRemovingCountry}
                  >
                    Quitar país
                  </button>
                </div>

                {/* Price types table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase w-[200px]">
                          Tipo de Precio
                        </th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                          Precio ({currencyCode})
                        </th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">
                          Costo ({currencyCode})
                        </th>
                        <th className="text-center px-4 py-2 text-xs font-medium text-gray-500 uppercase w-[100px]">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceTypes.map((pt: PriceType) => {
                        const key = priceKey(countryId, pt.id);
                        const editData = editPrices[key] || {
                          price: '',
                          cost: '',
                        };
                        const isSaving = savingKey === key;
                        const isDeleting = deletingKey === key;
                        const hasExisting = !!editData.existingId;

                        return (
                          <tr
                            key={pt.id}
                            className="border-b border-gray-50 hover:bg-gray-50/50"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-start gap-1.5">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-gray-700">
                                      {pt.name}
                                    </span>
                                    {pt.discountPercentage > 0 && (
                                      <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                                        -{pt.discountPercentage}%
                                      </span>
                                    )}
                                    {/* Tooltip trigger */}
                                    <div className="relative group">
                                      <InformationCircleIcon className="h-4 w-4 text-gray-400 hover:text-[#3E667D] cursor-help" />
                                      {/* Tooltip content */}
                                      <div className="absolute left-6 top-0 z-30 hidden group-hover:block w-72">
                                        <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl">
                                          <p className="font-semibold mb-1.5">
                                            {pt.name}
                                            {pt.discountPercentage > 0 && ` (${pt.discountPercentage}% desc.)`}
                                          </p>
                                          <p className="text-gray-300 mb-2">
                                            {PRICE_TYPE_HELPERS[pt.code]?.description || pt.description || 'Tipo de precio personalizado.'}
                                          </p>
                                          <div className="border-t border-gray-700 pt-1.5 mt-1.5">
                                            <p className="text-yellow-300 font-medium text-[11px] uppercase tracking-wide mb-0.5">Ejemplo</p>
                                            <p className="text-gray-300">
                                              {PRICE_TYPE_HELPERS[pt.code]?.example || 'Ingresa el precio y costo para este tipo.'}
                                            </p>
                                          </div>
                                          {/* Arrow */}
                                          <div className="absolute -left-1.5 top-2 w-3 h-3 bg-gray-900 rotate-45" />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  {/* Applies to badge */}
                                  {pt.appliesTo && pt.appliesTo.length > 0 && (
                                    <div className="flex gap-1 mt-1">
                                      {pt.appliesTo.map((target: string) => (
                                        <span
                                          key={target}
                                          className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded"
                                        >
                                          {target === 'customer' ? 'Clientes' :
                                           target === 'distributor' ? 'Distribuidores' :
                                           target === 'employee' ? 'Empleados' :
                                           target === 'all' ? 'Todos' : target}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editData.price}
                                onChange={(e) =>
                                  handlePriceChange(
                                    countryId,
                                    pt.id,
                                    'price',
                                    e.target.value
                                  )
                                }
                                placeholder="0.00"
                                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-[#3E667D] focus:border-[#3E667D] outline-none"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editData.cost}
                                onChange={(e) =>
                                  handlePriceChange(
                                    countryId,
                                    pt.id,
                                    'cost',
                                    e.target.value
                                  )
                                }
                                placeholder="0.00"
                                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-[#3E667D] focus:border-[#3E667D] outline-none"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSavePrice(countryId, pt.id)
                                  }
                                  disabled={isSaving || !editData.price}
                                  className="p-1.5 rounded-md text-green-600 hover:bg-green-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                  title="Guardar"
                                >
                                  {isSaving ? (
                                    <div className="h-4 w-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <CheckIcon className="h-4 w-4" />
                                  )}
                                </button>
                                {hasExisting && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeletePrice(countryId, pt.id)
                                    }
                                    disabled={isDeleting}
                                    className="p-1.5 rounded-md text-red-500 hover:bg-red-50 disabled:opacity-30"
                                    title="Eliminar"
                                  >
                                    {isDeleting ? (
                                      <div className="h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <TrashIcon className="h-4 w-4" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {/* Remove country confirmation modal */}
        {removeCountryId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
                <div className="flex items-center gap-3">
                  <ExclamationTriangleIcon className="h-6 w-6 text-white" />
                  <h3 className="text-lg font-bold text-white">
                    Quitar País
                  </h3>
                </div>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">
                  Se eliminarán{' '}
                  <strong>todos los precios</strong> de{' '}
                  <strong>
                    {countries.find((c) => c.id === removeCountryId)?.name}
                  </strong>{' '}
                  para este producto. Esta acción no se puede deshacer.
                </p>
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setRemoveCountryId(null)}
                    disabled={isRemovingCountry}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveCountry(removeCountryId)}
                    disabled={isRemovingCountry}
                  >
                    {isRemovingCountry ? 'Eliminando...' : 'Sí, quitar'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
