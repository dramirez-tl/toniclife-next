'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createCustomer,
  selectCustomersLoading,
  selectCustomersError,
  clearError,
  fetchCustomerByReferralCode,
} from '@/store/slices/customersSlice';
import type { CreateCustomerDto, Customer } from '@/types/customer';
import {
  ArrowLeftIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  IdentificationIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

export default function NuevoDistribuidorPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectCustomersLoading);
  const error = useAppSelector(selectCustomersError);

  const [formData, setFormData] = useState<CreateCustomerDto & { _customerType: string }>({
    _customerType: 'distributor',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthDate: '',
    rfc: '',
    curp: '',
    priceTypeId: '', // TODO: populate from catalog
    branchId: '',    // TODO: populate from catalog
    sponsorId: '',
    kitType: 'basic',
    customerType: 'distributor',
  });

  const [sponsorCode, setSponsorCode] = useState('');
  const [sponsor, setSponsor] = useState<Customer | null>(null);
  const [sponsorError, setSponsorError] = useState('');
  const [searchingSponsor, setSearchingSponsor] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearchSponsor = async () => {
    if (!sponsorCode.trim()) {
      setSponsorError('Ingresa un código de referido');
      return;
    }

    setSearchingSponsor(true);
    setSponsorError('');
    setSponsor(null);

    try {
      const result = await dispatch(fetchCustomerByReferralCode(sponsorCode)).unwrap();
      setSponsor(result);
      setFormData((prev) => ({ ...prev, sponsorId: result.id }));
    } catch {
      setSponsorError('No se encontró un distribuidor con ese código');
    } finally {
      setSearchingSponsor(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());

    // Clean up empty optional fields
    const cleanData: CreateCustomerDto = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      priceTypeId: formData.priceTypeId,
      branchId: formData.branchId,
      customerType: formData.customerType || formData._customerType,
    };

    if (formData.phone) cleanData.phone = formData.phone;
    if (formData.birthDate) cleanData.birthDate = formData.birthDate;
    if (formData.rfc) cleanData.rfc = formData.rfc;
    if (formData.curp) cleanData.curp = formData.curp;
    if (formData.sponsorId) cleanData.sponsorId = formData.sponsorId;
    if (formData.kitType) cleanData.kitType = formData.kitType;

    try {
      await dispatch(createCustomer(cleanData)).unwrap();
      setSuccessMessage('Distribuidor creado exitosamente');
      setTimeout(() => {
        router.push('/admin/distribuidores');
      }, 1500);
    } catch {
      // Error is handled by Redux
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/distribuidores"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nuevo Distribuidor</h1>
              <p className="text-gray-600">Registra un nuevo distribuidor en la red</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircleIcon className="h-5 w-5" />
            {successMessage}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <ExclamationTriangleIcon className="h-5 w-5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Tipo de registro */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tipo de Registro</h2>
            <div className="grid grid-cols-2 gap-4">
              <label
                className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  formData.customerType === 'distributor'
                    ? 'border-[#003B7A] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="customerType"
                  value="distributor"
                  checked={formData.customerType === 'distributor'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <UserGroupIcon className="h-6 w-6 text-[#003B7A]" />
                <div>
                  <p className="font-medium text-gray-900">Distribuidor</p>
                  <p className="text-sm text-gray-500">Puede vender y reclutar</p>
                </div>
              </label>
              <label
                className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  formData.customerType === 'retail'
                    ? 'border-[#003B7A] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="customerType"
                  value="retail"
                  checked={formData.customerType === 'retail'}
                  onChange={handleChange}
                  className="sr-only"
                />
                <UserIcon className="h-6 w-6 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">Cliente</p>
                  <p className="text-sm text-gray-500">Solo compra productos</p>
                </div>
              </label>
            </div>
          </div>

          {/* Información personal */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Personal</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre(s) *
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
                    placeholder="Nombre(s)"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apellidos *
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
                    placeholder="Apellido paterno y materno"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correo Electrónico *
                </label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono Principal
                </label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
                    placeholder="+52 55 1234 5678"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apellido Materno
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="lastNameMother"
                    value={(formData as any).lastNameMother ?? ''}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
                    placeholder="Apellido materno"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Nacimiento
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Información Fiscal */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Información Fiscal</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RFC</label>
                <div className="relative">
                  <IdentificationIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="rfc"
                    value={formData.rfc}
                    onChange={handleChange}
                    maxLength={13}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A] uppercase"
                    placeholder="ABCD123456XYZ"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">12 o 13 caracteres</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CURP</label>
                <div className="relative">
                  <IdentificationIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="curp"
                    value={formData.curp}
                    onChange={handleChange}
                    maxLength={18}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A] uppercase"
                    placeholder="ABCD123456HDFRRL01"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">18 caracteres</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Regimen Fiscal (opcional)
                </label>
                <div className="relative">
                  <BuildingOfficeIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="taxRegime"
                    value={(formData as any).taxRegime ?? ''}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
                    placeholder="Regimen fiscal (si aplica)"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Información MLM (solo distribuidores) */}
          {formData.customerType === 'distributor' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Información de Red MLM
              </h2>
              <div className="space-y-6">
                {/* Buscar patrocinador */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código del Patrocinador
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <UserGroupIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={sponsorCode}
                        onChange={(e) => setSponsorCode(e.target.value.toUpperCase())}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A] uppercase"
                        placeholder="Código de referido"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSearchSponsor}
                      disabled={searchingSponsor}
                      className="px-4 py-2 bg-[#003B7A] text-white rounded-lg hover:bg-[#002855] disabled:opacity-50"
                    >
                      {searchingSponsor ? 'Buscando...' : 'Buscar'}
                    </button>
                  </div>
                  {sponsorError && (
                    <p className="text-sm text-red-600 mt-1">{sponsorError}</p>
                  )}
                  {sponsor && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        <span className="font-medium text-green-800">
                          Patrocinador encontrado:
                        </span>
                      </div>
                      <p className="text-green-700 mt-1">
                        {sponsor.firstName} {sponsor.lastName} ({sponsor.customerNumber || sponsor.email})
                      </p>
                    </div>
                  )}
                </div>

                {/* Tipo de kit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tipo de Kit de Inicio
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { value: 'basic', label: 'Básico', price: '$1,500' },
                      { value: 'advanced', label: 'Avanzado', price: '$3,500' },
                      { value: 'premium', label: 'Premium', price: '$7,500' },
                    ].map((kit) => (
                      <label
                        key={kit.value}
                        className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          formData.kitType === kit.value
                            ? 'border-[#003B7A] bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="kitType"
                          value={kit.value}
                          checked={formData.kitType === kit.value}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <span className="font-medium text-gray-900">{kit.label}</span>
                        <span className="text-sm text-[#7AB82E] font-semibold">
                          {kit.price}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-4">
            <Link
              href="/admin/distribuidores"
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-[#003B7A] text-white rounded-lg hover:bg-[#002855] disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                'Crear Distribuidor'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
