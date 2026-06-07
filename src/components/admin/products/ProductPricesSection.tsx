'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  PlusIcon,
  XMarkIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { useSelector } from 'react-redux';
import { selectUser } from '@/store/slices/authSlice';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/components/ui';
import {
  useProductPrices,
  useCreateProductPrice,
  useDeactivateCountryPrices,
  useProductTaxes,
  useAssignProductTax,
  useUpdateProductTax,
  useRemoveProductTax,
} from '@/hooks/useProducts';
import { useActiveCountries, useActivePriceTypes, useActiveTaxRules } from '@/hooks/useConfig';
import type { ProductPrice, ProductTax } from '@/types/product';
import type { Country, PriceType, TaxRule } from '@/types/config';

interface ProductPricesSectionProps {
  productId: string;
  /** SAT fiscal fields (Mexico-specific, product-level) */
  satProductCode?: string;
  satUnitCode?: string;
  onSatFieldChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
    description: 'Precio preferente para clientes especiales o compras recurrentes. Aplica a todos los tipos de cliente.',
    example: 'Un cliente frecuente puede acceder a un precio preferente de $399 en lugar del precio público.',
  },
};

export function ProductPricesSection({
  productId,
  satProductCode = '',
  satUnitCode = '',
  onSatFieldChange,
}: ProductPricesSectionProps) {
  const { data: prices = [], isLoading: pricesLoading } = useProductPrices(productId);
  const { data: countries = [], isLoading: countriesLoading } = useActiveCountries();
  const { data: priceTypes = [], isLoading: priceTypesLoading } = useActivePriceTypes();

  const { data: productTaxes = [] } = useProductTaxes(productId);
  const { data: allTaxRules = [] } = useActiveTaxRules();

  const createPrice = useCreateProductPrice();
  const deactivateCountry = useDeactivateCountryPrices();
  const assignTax = useAssignProductTax();
  const updateTax = useUpdateProductTax();
  const removeTax = useRemoveProductTax();

  // Countries currently shown in the UI (those with prices + manually added)
  const [activeCountryIds, setActiveCountryIds] = useState<string[]>([]);
  // Local editable price values
  const [editPrices, setEditPrices] = useState<
    Record<string, { price: string; cost: string; points: string; businessValue: string; existingId?: string; updatedByName?: string; updatedAt?: string }>
  >({});
  // Snapshot of server values to detect changes
  const [originalPrices, setOriginalPrices] = useState<
    Record<string, { price: string; cost: string; points: string; businessValue: string }>
  >({});
  // Track which row is saving
  const [savingKey, setSavingKey] = useState<string | null>(null);
  // Track which row is resetting
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  // Modal for reset-to-zero confirmation
  const [resetConfirmKey, setResetConfirmKey] = useState<string | null>(null);
  const [resetConfirmText, setResetConfirmText] = useState('');
  // Add country dropdown open
  const [showAddCountry, setShowAddCountry] = useState(false);
  // Remove country confirmation modal
  const [removeCountryId, setRemoveCountryId] = useState<string | null>(null);
  const [removeConfirmText, setRemoveConfirmText] = useState('');
  const [removeReason, setRemoveReason] = useState('');
  const [isRemovingCountry, setIsRemovingCountry] = useState(false);
  // Tax rule dropdown open per country
  const [showAddTaxFor, setShowAddTaxFor] = useState<string | null>(null);
  // Tax rule action confirmation modal
  const [pendingTaxAction, setPendingTaxAction] = useState<{
    type: 'remove' | 'toggle';
    productId: string;
    taxRuleId: string;
    taxRuleName: string;
    taxLabel: string;
    currentIncluded?: boolean; // for toggle
  } | null>(null);
  const [taxActionReason, setTaxActionReason] = useState('');

  // Current user for audit trail
  const currentUser = useSelector(selectUser);

  // Initialize from existing prices — group by countryId (from DB)
  useEffect(() => {
    if (!prices.length || !countries.length || !priceTypes.length) return;

    const countriesWithPrices = new Set<string>();
    const newEditPrices: typeof editPrices = {};

    for (const price of prices) {
      // Use countryId directly from the price record
      const countryId = price.countryId;
      if (!countryId || !countries.some((c) => c.id === countryId)) continue;

      countriesWithPrices.add(countryId);
      const key = priceKey(countryId, price.priceTypeId);
      newEditPrices[key] = {
        price: price.price || '',
        cost: price.cost || '',
        points: price.points || '',
        businessValue: price.businessValue || '',
        existingId: price.id,
        updatedByName: price.updatedByName,
        updatedAt: price.updatedAt,
      };
    }

    // Build original snapshot (without existingId)
    const snapshot: Record<string, { price: string; cost: string; points: string; businessValue: string }> = {};
    for (const [key, val] of Object.entries(newEditPrices)) {
      snapshot[key] = { price: val.price, cost: val.cost, points: val.points, businessValue: val.businessValue };
    }

    setActiveCountryIds((prev) => {
      const merged = new Set([...prev, ...countriesWithPrices]);
      return Array.from(merged);
    });
    setEditPrices((prev) => ({ ...prev, ...newEditPrices }));
    setOriginalPrices((prev) => ({ ...prev, ...snapshot }));
  }, [prices, countries, priceTypes]);

  const handleAddCountry = (countryId: string) => {
    setActiveCountryIds((prev) => [...prev, countryId]);
    setShowAddCountry(false);
  };

  const handleRemoveCountry = async (countryId: string) => {
    const country = countries.find((c) => c.id === countryId);
    if (!country) return;

    setIsRemovingCountry(true);

    try {
      const { deactivatedCount } = await deactivateCountry.mutateAsync({
        productId,
        countryId,
        reason: removeReason,
      });

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

      if (deactivatedCount > 0) {
        toast.success(`${deactivatedCount} precios de ${country.name} desactivados`);
      }
    } catch {
      toast.error(`Error al desactivar precios de ${country.name}`);
    } finally {
      setIsRemovingCountry(false);
      setRemoveCountryId(null);
      setRemoveConfirmText('');
      setRemoveReason('');
    }
  };

  const handlePriceChange = (
    countryId: string,
    priceTypeId: string,
    field: 'price' | 'cost' | 'points' | 'businessValue',
    value: string
  ) => {
    const key = priceKey(countryId, priceTypeId);
    setEditPrices((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        price: prev[key]?.price || '',
        cost: prev[key]?.cost || '',
        points: prev[key]?.points || '',
        businessValue: prev[key]?.businessValue || '',
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

    const pointsNum = editData.points ? parseFloat(editData.points) : undefined;
    const bvNum = editData.businessValue ? parseFloat(editData.businessValue) : undefined;

    setSavingKey(key);

    try {
      const result = await createPrice.mutateAsync({
        productId,
        dto: {
          priceTypeId,
          countryId,
          currencyCode: country.currencyCode.trim(),
          price: priceNum,
          cost: costNum,
          points: pointsNum,
          businessValue: bvNum,
        },
      });

      // Update local state with the new ID and audit info
      setEditPrices((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          existingId: result.id,
          updatedByName: result.updatedByName,
          updatedAt: result.updatedAt,
        },
      }));

      // Update original snapshot so button disables again
      setOriginalPrices((prev) => ({
        ...prev,
        [key]: { price: editData.price, cost: editData.cost, points: editData.points, businessValue: editData.businessValue },
      }));

      toast.success('Precio guardado');
    } catch {
      toast.error('Error al guardar precio');
    } finally {
      setSavingKey(null);
    }
  };

  const handleResetPrice = async (
    countryId: string,
    priceTypeId: string
  ) => {
    const key = priceKey(countryId, priceTypeId);
    const country = countries.find((c) => c.id === countryId);
    if (!country?.currencyCode) return;

    setDeletingKey(key);
    setResetConfirmKey(null);

    try {
      const result = await createPrice.mutateAsync({
        productId,
        dto: {
          priceTypeId,
          countryId,
          currencyCode: country.currencyCode.trim(),
          price: 0,
          cost: 0,
          points: 0,
          businessValue: 0,
        },
      });

      const zeroState = { price: '0', cost: '0', points: '0', businessValue: '0' };
      setEditPrices((prev) => ({
        ...prev,
        [key]: {
          ...zeroState,
          existingId: result.id,
          updatedByName: result.updatedByName,
          updatedAt: result.updatedAt,
        },
      }));
      setOriginalPrices((prev) => ({
        ...prev,
        [key]: zeroState,
      }));

      toast.success('Precio reiniciado a 0');
    } catch {
      toast.error('Error al reiniciar precio');
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
      <Card className="p-0">
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
    <Card className="p-0">
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

            // Columns for the price types table (per-country render closures).
            // Logic is identical to the previous <tbody> map: each render
            // recomputes the row-derived values from outer state using `pt`.
            const priceColumns: DataTableColumn<PriceType>[] = [
              {
                key: 'priceType',
                header: 'Tipo de Precio',
                headerClassName: 'w-[170px] text-xs font-medium text-gray-500 uppercase',
                cellClassName: 'align-top',
                render: (pt) => (
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
                ),
              },
              {
                key: 'price',
                header: `Precio (${currencyCode})`,
                headerClassName: 'text-xs font-medium text-gray-500 uppercase',
                render: (pt) => {
                  const editData = editPrices[priceKey(countryId, pt.id)] || {
                    price: '',
                    cost: '',
                    points: '',
                    businessValue: '',
                  };
                  return (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editData.price}
                      onChange={(e) =>
                        handlePriceChange(countryId, pt.id, 'price', e.target.value)
                      }
                      placeholder="0.00"
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-[#3E667D] focus:border-[#3E667D] outline-none"
                    />
                  );
                },
              },
              {
                key: 'cost',
                header: `Costo (${currencyCode})`,
                headerClassName: 'text-xs font-medium text-gray-500 uppercase',
                render: (pt) => {
                  const editData = editPrices[priceKey(countryId, pt.id)] || {
                    price: '',
                    cost: '',
                    points: '',
                    businessValue: '',
                  };
                  return (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editData.cost}
                      onChange={(e) =>
                        handlePriceChange(countryId, pt.id, 'cost', e.target.value)
                      }
                      placeholder="0.00"
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-[#3E667D] focus:border-[#3E667D] outline-none"
                    />
                  );
                },
              },
              {
                key: 'points',
                header: 'Puntos',
                headerClassName: 'text-xs font-medium text-gray-500 uppercase',
                render: (pt) => {
                  const editData = editPrices[priceKey(countryId, pt.id)] || {
                    price: '',
                    cost: '',
                    points: '',
                    businessValue: '',
                  };
                  return (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editData.points}
                      onChange={(e) =>
                        handlePriceChange(countryId, pt.id, 'points', e.target.value)
                      }
                      placeholder="0.00"
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-[#3E667D] focus:border-[#3E667D] outline-none"
                    />
                  );
                },
              },
              {
                key: 'businessValue',
                header: 'Valor Negocio',
                headerClassName: 'text-xs font-medium text-gray-500 uppercase',
                render: (pt) => {
                  const editData = editPrices[priceKey(countryId, pt.id)] || {
                    price: '',
                    cost: '',
                    points: '',
                    businessValue: '',
                  };
                  return (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editData.businessValue}
                      onChange={(e) =>
                        handlePriceChange(countryId, pt.id, 'businessValue', e.target.value)
                      }
                      placeholder="0.00"
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-[#3E667D] focus:border-[#3E667D] outline-none"
                    />
                  );
                },
              },
              {
                key: 'actions',
                header: 'Acciones',
                headerClassName: 'w-[80px] text-center text-xs font-medium text-gray-500 uppercase',
                render: (pt) => {
                  const key = priceKey(countryId, pt.id);
                  const editData = editPrices[key] || {
                    price: '',
                    cost: '',
                    points: '',
                    businessValue: '',
                  };
                  const isSaving = savingKey === key;
                  const isDeleting = deletingKey === key;
                  const hasExisting = !!editData.existingId;

                  // Detect if any field changed vs. the server snapshot
                  const orig = originalPrices[key];
                  const normalize = (v: string | undefined) => v || '';
                  const hasChanges = !orig
                    ? !!(editData.price || editData.cost || editData.points || editData.businessValue)
                    : normalize(editData.price) !== normalize(orig.price) ||
                      normalize(editData.cost) !== normalize(orig.cost) ||
                      normalize(editData.points) !== normalize(orig.points) ||
                      normalize(editData.businessValue) !== normalize(orig.businessValue);

                  return (
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            handleSavePrice(countryId, pt.id)
                          }
                          disabled={isSaving || !editData.price || !hasChanges}
                          className="p-1.5 rounded-md text-[#3E667D] hover:bg-[#C8DDF2]/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Guardar"
                        >
                          {isSaving ? (
                            <div className="h-4 w-4 border-2 border-[#3E667D] border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </button>
                        {hasExisting && (
                          <button
                            type="button"
                            onClick={() => {
                              setResetConfirmKey(key);
                              setResetConfirmText('');
                            }}
                            disabled={isDeleting}
                            className="p-1.5 rounded-md text-amber-500 hover:bg-amber-50 disabled:opacity-30 transition-colors"
                            title="Reiniciar a 0"
                          >
                            {isDeleting ? (
                              <div className="h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <ArrowPathIcon className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                      {editData.updatedByName && (
                        <span className="text-[10px] text-gray-400 text-center leading-tight" title={editData.updatedAt ? new Date(editData.updatedAt).toLocaleString('es-MX') : ''}>
                          {editData.updatedByName.split('@')[0]}
                        </span>
                      )}
                    </div>
                  );
                },
              },
            ];

            return (
              <div
                key={countryId}
                className="border border-gray-200 rounded-lg"
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
                    onClick={() => {
                      setRemoveCountryId(countryId);
                      setRemoveConfirmText('');
                      setRemoveReason('');
                    }}
                    className="text-xs text-red-500 hover:text-red-700 hover:underline"
                    disabled={isRemovingCountry}
                  >
                    Quitar país
                  </button>
                </div>

                {/* Price types table */}
                <DataTable<PriceType>
                  columns={priceColumns}
                  data={priceTypes}
                  getRowKey={(pt) => pt.id}
                  minWidthClassName="w-full"
                />


                {/* Reglas Fiscales section */}
                {(() => {
                  const countryCode = country.code?.trim() || '';
                  // For tax rules, map countries to their fiscal zone
                  // Frontera MX-USA (FN) uses Mexico's (MX) tax rules
                  const fiscalCode = countryCode === 'FN' ? 'MX' : countryCode;
                  const assignedTaxes = productTaxes.filter(
                    (pt) => pt.countryCode === fiscalCode
                  );
                  const assignedIds = new Set(assignedTaxes.map((pt) => pt.taxRuleId));
                  const availableRules = allTaxRules.filter(
                    (tr) =>
                      tr.countryCode?.trim() === fiscalCode &&
                      tr.isActive &&
                      !assignedIds.has(tr.id)
                  );
                  const isDropdownOpen = showAddTaxFor === countryId;

                  // Public price for tax examples
                  const publicPt = priceTypes.find((pt) => pt.code === 'public');
                  const publicPriceStr = publicPt ? editPrices[priceKey(countryId, publicPt.id)]?.price : '';
                  const publicPrice = publicPriceStr ? parseFloat(publicPriceStr) : 0;
                  const fmtP = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

                  return (
                    <div className="px-4 py-3 border-t border-gray-200 bg-gray-50/50 rounded-b-lg">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide shrink-0">
                          Reglas Fiscales
                        </span>

                        <div className="flex-1" />

                        {/* Add button */}
                        <div className="relative shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setShowAddTaxFor(isDropdownOpen ? null : countryId)
                            }
                            disabled={availableRules.length === 0}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#3E667D] bg-white border border-gray-200 rounded-full hover:bg-[#C8DDF2]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <PlusIcon className="h-3.5 w-3.5" />
                            Agregar
                          </button>

                          {isDropdownOpen && availableRules.length > 0 && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowAddTaxFor(null)}
                              />
                              <div className="absolute right-0 bottom-full mb-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-48 overflow-y-auto">
                                {availableRules.map((rule) => (
                                  <button
                                    key={rule.id}
                                    type="button"
                                    onClick={() => {
                                      assignTax.mutate(
                                        { productId, taxRuleId: rule.id },
                                        {
                                          onSuccess: () => {
                                            toast.success(
                                              `${rule.name} asignada`
                                            );
                                            setShowAddTaxFor(null);
                                          },
                                          onError: () =>
                                            toast.error(
                                              'Error al asignar regla fiscal'
                                            ),
                                        }
                                      );
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between"
                                  >
                                    <span>{rule.name}</span>
                                    <span className="text-xs text-gray-400">
                                      {Number(rule.rate).toFixed(2)}%
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {assignedTaxes.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">
                          {availableRules.length === 0
                            ? 'No hay reglas fiscales para este país'
                            : 'Sin reglas asignadas'}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {assignedTaxes.map((tax) => {
                            const ratePct = Number(tax.rate);
                            const rate = ratePct / 100;
                            const pct = ratePct.toFixed(2);
                            const taxLabel = `${tax.taxType.toUpperCase()} ${pct}%`;

                            return (
                              <div
                                key={tax.id}
                                className="bg-white border border-gray-200 rounded-lg text-xs"
                              >
                                {/* Tax info row */}
                                <div className="flex items-center gap-2 px-3 py-2">
                                  <span className="text-[#3E667D] font-bold shrink-0">
                                    {tax.taxType.toUpperCase()}
                                  </span>
                                  <span className="font-medium text-gray-700">
                                    {tax.taxRuleName}
                                  </span>
                                  <span className="text-gray-400">
                                    {pct}%
                                  </span>

                                  <div className="flex-1" />

                                  {/* Switch toggle */}
                                  <span className={`text-[11px] ${tax.isIncludedInPrice ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
                                    {tax.isIncludedInPrice ? 'Incluido en precio' : 'Adicional al precio'}
                                  </span>
                                  <button
                                    type="button"
                                    role="switch"
                                    aria-checked={tax.isIncludedInPrice}
                                    onClick={() => {
                                      setPendingTaxAction({
                                        type: 'toggle',
                                        productId,
                                        taxRuleId: tax.taxRuleId,
                                        taxRuleName: tax.taxRuleName,
                                        taxLabel,
                                        currentIncluded: tax.isIncludedInPrice,
                                      });
                                      setTaxActionReason('');
                                    }}
                                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#3E667D] focus:ring-offset-1 ${
                                      tax.isIncludedInPrice ? 'bg-emerald-500' : 'bg-gray-300'
                                    }`}
                                  >
                                    <span
                                      className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
                                        tax.isIncludedInPrice ? 'translate-x-4' : 'translate-x-0'
                                      }`}
                                    />
                                  </button>

                                  {/* Remove button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPendingTaxAction({
                                        type: 'remove',
                                        productId,
                                        taxRuleId: tax.taxRuleId,
                                        taxRuleName: tax.taxRuleName,
                                        taxLabel,
                                      });
                                      setTaxActionReason('');
                                    }}
                                    className="text-gray-400 hover:text-red-500 transition-colors shrink-0 ml-1"
                                    title="Quitar regla"
                                  >
                                    <XMarkIcon className="h-4 w-4" />
                                  </button>
                                </div>

                                {/* Price example */}
                                {publicPrice > 0 && (
                                  <div className="px-3 pb-2 -mt-0.5">
                                    <span className="text-[11px] text-gray-400">
                                      {tax.isIncludedInPrice
                                        ? `Ej: Público ${fmtP(publicPrice)} ${currencyCode} (incluye ${fmtP(publicPrice * rate / (1 + rate))} de ${taxLabel})`
                                        : `Ej: Público ${fmtP(publicPrice)} + ${taxLabel} = ${fmtP(publicPrice * (1 + rate))} ${currencyCode}`}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* SAT fields — for Mexico and Frontera MX-USA */}
                      {(countryCode === 'MX' || countryCode === 'FN') && onSatFieldChange && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Datos SAT (Mexico)
                          </span>
                          <div className="grid grid-cols-2 gap-3 mt-2">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Clave Producto SAT</label>
                              <input
                                type="text"
                                name="satProductCode"
                                value={satProductCode}
                                onChange={onSatFieldChange}
                                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3E667D] focus:border-[#3E667D]"
                                placeholder="c_ClaveProdServ"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Clave Unidad SAT</label>
                              <input
                                type="text"
                                name="satUnitCode"
                                value={satUnitCode}
                                onChange={onSatFieldChange}
                                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#3E667D] focus:border-[#3E667D]"
                                placeholder="c_ClaveUnidad"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>

        {/* Reset price confirmation modal */}
        {resetConfirmKey && (() => {
          const [rCountryId, rPriceTypeId] = resetConfirmKey.split('::');
          const rCountry = countries.find((c) => c.id === rCountryId);
          const rPriceType = priceTypes.find((pt) => pt.id === rPriceTypeId);
          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <ArrowPathIcon className="h-6 w-6 text-white" />
                    <h3 className="text-lg font-bold text-white">
                      Reiniciar Precio
                    </h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-1">
                    Se pondrán en <strong>0</strong> todos los valores de:
                  </p>
                  <p className="text-sm font-semibold text-gray-800 mb-4">
                    {rPriceType?.name} — {rCountry?.name} ({rCountry?.currencyCode?.trim()})
                  </p>
                  <p className="text-sm text-gray-500 mb-3">
                    Escribe <strong className="text-red-600">CONFIRMAR</strong> para continuar:
                  </p>
                  <input
                    type="text"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    placeholder="CONFIRMAR"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none mb-4"
                    autoFocus
                  />
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setResetConfirmKey(null);
                        setResetConfirmText('');
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={resetConfirmText !== 'CONFIRMAR'}
                      onClick={() => handleResetPrice(rCountryId, rPriceTypeId)}
                    >
                      Reiniciar a 0
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Tax rule action confirmation modal */}
        {pendingTaxAction && (() => {
          const isRemove = pendingTaxAction.type === 'remove';
          const actionTitle = isRemove ? 'Quitar Regla Fiscal' : 'Modificar Regla Fiscal';
          const actionDescription = isRemove
            ? <>Se eliminará la regla <strong>{pendingTaxAction.taxLabel}</strong> ({pendingTaxAction.taxRuleName}) de este producto.</>
            : <>Se cambiará <strong>{pendingTaxAction.taxLabel}</strong> ({pendingTaxAction.taxRuleName}) de <strong>{pendingTaxAction.currentIncluded ? 'Incluido en precio' : 'Adicional al precio'}</strong> a <strong>{pendingTaxAction.currentIncluded ? 'Adicional al precio' : 'Incluido en precio'}</strong>.</>;
          const gradientFrom = isRemove ? 'from-red-500' : 'from-amber-500';
          const gradientTo = isRemove ? 'to-red-600' : 'to-orange-500';
          const ringColor = isRemove ? 'focus:ring-red-400 focus:border-red-400' : 'focus:ring-amber-400 focus:border-amber-400';

          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                <div className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} px-6 py-4`}>
                  <div className="flex items-center gap-3">
                    <ShieldExclamationIcon className="h-6 w-6 text-white" />
                    <h3 className="text-lg font-bold text-white">
                      {actionTitle}
                    </h3>
                  </div>
                </div>
                <div className="p-6">
                  {/* Action description */}
                  <p className="text-sm text-gray-600 mb-4">
                    {actionDescription}
                  </p>

                  {/* Warning */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-amber-700">
                      <strong>Atención:</strong> Los cambios en reglas fiscales afectan el cálculo de impuestos del producto. Esta acción quedará registrada.
                    </p>
                  </div>

                  {/* Reason */}
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo del cambio <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={taxActionReason}
                    onChange={(e) => setTaxActionReason(e.target.value)}
                    placeholder="Describe el motivo del cambio..."
                    rows={3}
                    className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg ${ringColor} outline-none mb-4 resize-none`}
                    autoFocus
                  />

                  {/* Responsible person */}
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-500 mb-1 font-medium">Responsable del cambio:</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {currentUser?.firstName} {currentUser?.lastName}
                    </p>
                    <p className="text-xs text-gray-500">{currentUser?.email}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date().toLocaleString('es-MX', {
                        dateStyle: 'long',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPendingTaxAction(null);
                        setTaxActionReason('');
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant={isRemove ? 'destructive' : 'default'}
                      size="sm"
                      disabled={taxActionReason.trim().length < 5}
                      onClick={() => {
                        if (isRemove) {
                          removeTax.mutate(
                            {
                              productId: pendingTaxAction.productId,
                              taxRuleId: pendingTaxAction.taxRuleId,
                            },
                            {
                              onSuccess: () => {
                                toast.success(`${pendingTaxAction.taxRuleName} removida`);
                                setPendingTaxAction(null);
                                setTaxActionReason('');
                              },
                              onError: () => toast.error('Error al remover regla fiscal'),
                            }
                          );
                        } else {
                          updateTax.mutate(
                            {
                              productId: pendingTaxAction.productId,
                              taxRuleId: pendingTaxAction.taxRuleId,
                              isIncludedInPrice: !pendingTaxAction.currentIncluded,
                            },
                            {
                              onSuccess: () => {
                                toast.success(
                                  pendingTaxAction.currentIncluded
                                    ? 'Se calculará adicional al precio'
                                    : 'Marcado como incluido en precio'
                                );
                                setPendingTaxAction(null);
                                setTaxActionReason('');
                              },
                              onError: () => toast.error('Error al actualizar'),
                            }
                          );
                        }
                      }}
                    >
                      {isRemove ? 'Quitar Regla' : 'Confirmar Cambio'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Remove country confirmation modal */}
        {removeCountryId && (() => {
          const rcCountry = countries.find((c) => c.id === removeCountryId);
          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <ExclamationTriangleIcon className="h-6 w-6 text-white" />
                    <h3 className="text-lg font-bold text-white">
                      Quitar País
                    </h3>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-sm text-gray-600 mb-4">
                    Se desactivarán <strong>todos los precios</strong> de{' '}
                    <strong>{rcCountry?.name} ({rcCountry?.currencyCode?.trim()})</strong>{' '}
                    para este producto.
                  </p>

                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={removeReason}
                    onChange={(e) => setRemoveReason(e.target.value)}
                    placeholder="Describe por qué se quitan los precios de este país..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none mb-4 resize-none"
                  />

                  <p className="text-sm text-gray-500 mb-2">
                    Escribe <strong className="text-red-600">CONFIRMAR</strong> para continuar:
                  </p>
                  <input
                    type="text"
                    value={removeConfirmText}
                    onChange={(e) => setRemoveConfirmText(e.target.value)}
                    placeholder="CONFIRMAR"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none mb-4"
                  />

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRemoveCountryId(null);
                        setRemoveConfirmText('');
                        setRemoveReason('');
                      }}
                      disabled={isRemovingCountry}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveCountry(removeCountryId)}
                      disabled={isRemovingCountry || removeConfirmText !== 'CONFIRMAR' || removeReason.trim().length < 5}
                    >
                      {isRemovingCountry ? 'Desactivando...' : 'Quitar País'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
