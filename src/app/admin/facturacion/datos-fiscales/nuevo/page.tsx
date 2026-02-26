// app/admin/facturacion/datos-fiscales/nuevo/page.tsx - Crear Datos Fiscales
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.5 Facturación
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  BuildingOfficeIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { FISCAL_REGIMES, CFDI_USES } from '@/types/billing';
import { useCreateFiscalData, useValidateRfc } from '@/hooks/useBilling';
import { customersService } from '@/services/customers.service';
import type { Customer } from '@/types/customer';

interface CustomerOption {
  id: string;
  number: string;
  name: string;
  email: string;
}

export default function NewFiscalDataPage() {
  const router = useRouter();
  const createFiscalData = useCreateFiscalData();
  const validateRfc = useValidateRfc();

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  const [formData, setFormData] = useState({
    rfc: '',
    legalName: '',
    taxRegime: '',
    postalCode: '',
    street: '',
    exteriorNumber: '',
    interiorNumber: '',
    neighborhood: '',
    city: '',
    state: '',
    email: '',
    defaultCfdiUse: 'G03', // Default: Gastos en general
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Debounced search for customers
  useEffect(() => {
    const searchCustomers = async () => {
      if (!customerSearch.trim()) {
        setCustomers([]);
        return;
      }

      setIsLoadingCustomers(true);
      try {
        const response = await customersService.getAll({
          search: customerSearch,
          limit: 10,
        });
        const customerOptions: CustomerOption[] = response.data.map((c: Customer) => ({
          id: c.id,
          number: c.customerNumber || '',
          name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.customerNumber || '',
          email: c.email || '',
        }));
        setCustomers(customerOptions);
      } catch (error) {
        console.error('Error searching customers:', error);
        setCustomers([]);
      } finally {
        setIsLoadingCustomers(false);
      }
    };

    const debounceTimer = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounceTimer);
  }, [customerSearch]);

  const handleSelectCustomer = (customer: CustomerOption) => {
    setSelectedCustomer(customer);
    setFormData((prev) => ({ ...prev, email: customer.email }));
    setShowCustomerSearch(false);
    setCustomerSearch('');
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Customer validation
    if (!selectedCustomer) {
      newErrors.customer = 'Selecciona un cliente';
    }

    // RFC validation
    if (!formData.rfc) {
      newErrors.rfc = 'El RFC es requerido';
    } else if (!/^[A-Z&Ñ]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(formData.rfc.toUpperCase())) {
      newErrors.rfc = 'El formato del RFC no es válido';
    }

    // Legal name validation
    if (!formData.legalName.trim()) {
      newErrors.legalName = 'La razón social es requerida';
    }

    // Tax regime validation
    if (!formData.taxRegime) {
      newErrors.taxRegime = 'El régimen fiscal es requerido';
    }

    // Postal code validation
    if (!formData.postalCode) {
      newErrors.postalCode = 'El código postal es requerido';
    } else if (!/^[0-9]{5}$/.test(formData.postalCode)) {
      newErrors.postalCode = 'El código postal debe tener 5 dígitos';
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El formato del correo no es válido';
    }

    // CFDI use validation
    if (!formData.defaultCfdiUse) {
      newErrors.defaultCfdiUse = 'El uso de CFDI es requerido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleValidateRfc = async () => {
    if (!formData.rfc) {
      toast.error('Ingresa un RFC para validar');
      return;
    }

    try {
      await validateRfc.mutateAsync(formData.rfc);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      await createFiscalData.mutateAsync({
        customerId: selectedCustomer!.id,
        rfc: formData.rfc,
        legalName: formData.legalName,
        fiscalRegime: formData.taxRegime,
        postalCode: formData.postalCode,
        cfdiUse: formData.defaultCfdiUse,
        email: formData.email,
      });
      router.push('/admin/facturacion/datos-fiscales');
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/facturacion/datos-fiscales"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BuildingOfficeIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Nuevos Datos Fiscales</h1>
              </div>
              <p className="text-white/80 text-lg">
                Registra la información fiscal de un cliente para facturación
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit}>
          {/* Customer Selection */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Seleccionar Cliente
              </h2>

              {!selectedCustomer ? (
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCustomerSearch(true)}
                    leftIcon={<MagnifyingGlassIcon className="h-5 w-5" />}
                    className="w-full justify-start"
                  >
                    Buscar cliente...
                  </Button>
                  {errors.customer && (
                    <p className="mt-2 text-sm text-red-500">{errors.customer}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <UserIcon className="h-6 w-6 text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{selectedCustomer.name}</p>
                    <p className="text-sm text-gray-500">
                      {selectedCustomer.number} • {selectedCustomer.email}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCustomer(null)}
                  >
                    Cambiar
                  </Button>
                </div>
              )}

              {/* Customer Search Modal */}
              {showCustomerSearch && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
                    <h3 className="text-lg font-semibold mb-4">Buscar Cliente</h3>
                    <div className="relative mb-4">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Buscar por nombre, número o email..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {isLoadingCustomers ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#3E667D] mx-auto"></div>
                          <p className="text-sm text-gray-500 mt-2">Buscando...</p>
                        </div>
                      ) : customers.length > 0 ? (
                        customers.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => handleSelectCustomer(customer)}
                            className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-[#3E667D] hover:bg-[#3E667D]/5 transition-colors"
                          >
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-gray-500">
                              {customer.number} • {customer.email}
                            </div>
                          </button>
                        ))
                      ) : customerSearch.trim() ? (
                        <p className="text-center text-gray-500 py-4">
                          No se encontraron clientes
                        </p>
                      ) : (
                        <p className="text-center text-gray-500 py-4">
                          Escribe para buscar clientes
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomerSearch(false);
                        setCustomerSearch('');
                      }}
                      className="w-full mt-4 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fiscal Information */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Información Fiscal
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* RFC */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    RFC *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.rfc}
                      onChange={(e) =>
                        setFormData({ ...formData, rfc: e.target.value.toUpperCase() })
                      }
                      maxLength={13}
                      className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent font-mono uppercase ${
                        errors.rfc ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="XAXX010101000"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleValidateRfc}
                      isLoading={validateRfc.isPending}
                    >
                      Validar
                    </Button>
                  </div>
                  {errors.rfc && (
                    <p className="mt-1 text-sm text-red-500">{errors.rfc}</p>
                  )}
                </div>

                {/* Legal Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Razón Social *
                  </label>
                  <input
                    type="text"
                    value={formData.legalName}
                    onChange={(e) =>
                      setFormData({ ...formData, legalName: e.target.value })
                    }
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent ${
                      errors.legalName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Nombre o Razón Social como aparece en el SAT"
                  />
                  {errors.legalName && (
                    <p className="mt-1 text-sm text-red-500">{errors.legalName}</p>
                  )}
                </div>

                {/* Tax Regime */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Régimen Fiscal *
                  </label>
                  <select
                    value={formData.taxRegime}
                    onChange={(e) =>
                      setFormData({ ...formData, taxRegime: e.target.value })
                    }
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent ${
                      errors.taxRegime ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Seleccionar régimen...</option>
                    {FISCAL_REGIMES.map((regime) => (
                      <option key={regime.Value} value={regime.Value}>
                        {regime.Value} - {regime.Name}
                      </option>
                    ))}
                  </select>
                  {errors.taxRegime && (
                    <p className="mt-1 text-sm text-red-500">{errors.taxRegime}</p>
                  )}
                </div>

                {/* Postal Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Código Postal *
                  </label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        postalCode: e.target.value.replace(/\D/g, '').slice(0, 5),
                      })
                    }
                    maxLength={5}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent ${
                      errors.postalCode ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="12345"
                  />
                  {errors.postalCode && (
                    <p className="mt-1 text-sm text-red-500">{errors.postalCode}</p>
                  )}
                </div>

                {/* CFDI Use */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Uso de CFDI *
                  </label>
                  <select
                    value={formData.defaultCfdiUse}
                    onChange={(e) =>
                      setFormData({ ...formData, defaultCfdiUse: e.target.value })
                    }
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent ${
                      errors.defaultCfdiUse ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Seleccionar uso de CFDI...</option>
                    {CFDI_USES.map((use) => (
                      <option key={use.Value} value={use.Value}>
                        {use.Value} - {use.Name}
                      </option>
                    ))}
                  </select>
                  {errors.defaultCfdiUse && (
                    <p className="mt-1 text-sm text-red-500">{errors.defaultCfdiUse}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="correo@ejemplo.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-500">{errors.email}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address (Optional) */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Dirección Fiscal
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Información opcional para el domicilio fiscal
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Street */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Calle
                  </label>
                  <input
                    type="text"
                    value={formData.street}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    placeholder="Nombre de la calle"
                  />
                </div>

                {/* Exterior Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número Exterior
                  </label>
                  <input
                    type="text"
                    value={formData.exteriorNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, exteriorNumber: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    placeholder="123"
                  />
                </div>

                {/* Interior Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número Interior
                  </label>
                  <input
                    type="text"
                    value={formData.interiorNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, interiorNumber: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    placeholder="Depto 5"
                  />
                </div>

                {/* Neighborhood */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Colonia
                  </label>
                  <input
                    type="text"
                    value={formData.neighborhood}
                    onChange={(e) =>
                      setFormData({ ...formData, neighborhood: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    placeholder="Nombre de la colonia"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    placeholder="Ciudad"
                  />
                </div>

                {/* State */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    placeholder="Estado"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <Link href="/admin/facturacion/datos-fiscales">
              <Button variant="outline">Cancelar</Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              isLoading={createFiscalData.isPending}
              leftIcon={<CheckCircleIcon className="h-5 w-5" />}
            >
              Guardar Datos Fiscales
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
