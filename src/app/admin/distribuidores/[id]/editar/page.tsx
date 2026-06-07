'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchCustomerById,
  updateCustomer,
  selectSelectedCustomer,
  selectCustomersLoading,
  selectCustomersError,
  clearError,
} from '@/store/slices/customersSlice';
import type { UpdateCustomerDto } from '@/types/customer';
import { useActivePriceTypes } from '@/hooks/useConfig';
import { findPriceTypeIdForCustomerType } from '@/lib/priceType';
import { toast } from 'sonner';
import {
  ArrowLeftIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  IdentificationIcon,
  UserGroupIcon,
  StarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'inactive', label: 'Inactivo' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'suspended', label: 'Suspendido' },
];

const CUSTOMER_TYPE_OPTIONS = [
  { value: 'distributor', label: 'Distribuidor', desc: 'Vende, recluta y genera red', icon: UserGroupIcon, color: 'text-[#3E667D]' },
  { value: 'preferred_customer', label: 'Preferente', desc: 'Precio preferente, sin red ni puntos', icon: StarIcon, color: 'text-amber-500' },
  { value: 'final_customer', label: 'Cliente', desc: 'Solo compra a precio público', icon: UserIcon, color: 'text-purple-600' },
];

export default function EditarDistribuidorPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const dispatch = useAppDispatch();

  const customer = useAppSelector(selectSelectedCustomer);
  const isLoading = useAppSelector(selectCustomersLoading);
  const error = useAppSelector(selectCustomersError);
  const { data: priceTypes } = useActivePriceTypes();

  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState<UpdateCustomerDto>({
    firstName: '',
    lastName: '',
    lastNameMother: '',
    email: '',
    phone: '',
    birthDate: '',
    rfc: '',
    curp: '',
    status: 'active',
    customerType: 'distributor',
  });

  useEffect(() => {
    const load = async () => {
      setLoadingCustomer(true);
      await dispatch(fetchCustomerById(id));
      setLoadingCustomer(false);
    };
    load();
  }, [dispatch, id]);

  // Pre-populate form when customer loads
  useEffect(() => {
    if (customer && customer.id === id) {
      setFormData({
        firstName: customer.firstName ?? '',
        lastName: customer.lastName ?? '',
        lastNameMother: customer.lastNameMother ?? '',
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        birthDate: customer.birthDate ? customer.birthDate.split('T')[0] : '',
        rfc: customer.rfc ?? '',
        curp: customer.curp ?? '',
        status: (customer.status as UpdateCustomerDto['status']) ?? 'active',
        customerType: customer.customerType ?? 'distributor',
      });
    }
  }, [customer, id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    setSaving(true);

    // Build clean payload — only send non-empty values
    const payload: UpdateCustomerDto = {};
    if (formData.firstName) payload.firstName = formData.firstName.trim();
    if (formData.lastName) payload.lastName = formData.lastName.trim();
    payload.lastNameMother = formData.lastNameMother?.trim() || undefined;
    if (formData.email) payload.email = formData.email.trim();
    payload.phone = formData.phone?.trim() || undefined;
    payload.birthDate = formData.birthDate || undefined;
    payload.rfc = formData.rfc?.trim().toUpperCase() || undefined;
    payload.curp = formData.curp?.trim().toUpperCase() || undefined;
    if (formData.status) payload.status = formData.status;

    // Tipo de cliente. Si cambia a preferente/cliente, asignamos su tipo de
    // precio correspondiente. Para distribuidor no tocamos price_type_id (lo
    // define el kit/enrollment).
    if (formData.customerType) {
      payload.customerType = formData.customerType;
      if (formData.customerType !== 'distributor') {
        const ptId = findPriceTypeIdForCustomerType(priceTypes, formData.customerType);
        if (ptId) payload.priceTypeId = ptId;
      }
    }

    try {
      await dispatch(updateCustomer({ id, data: payload })).unwrap();
      setSuccessMessage('Datos actualizados correctamente');
      toast.success('Distribuidor actualizado');
      setTimeout(() => {
        router.push(`/admin/distribuidores/${id}`);
      }, 1200);
    } catch {
      toast.error('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  if (loadingCustomer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3E667D]" />
          <span className="text-gray-600">Cargando datos...</span>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600">Distribuidor no encontrado</p>
          <Link href="/admin/distribuidores" className="mt-4 inline-block text-[#3E667D] hover:underline">
            Volver al listado
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link
              href={`/admin/distribuidores/${id}`}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Editar Distribuidor</h1>
              <p className="text-sm text-gray-500">
                {customer.firstName} {customer.lastName}
                {customer.customerNumber && (
                  <span className="ml-2 font-mono text-[#3E667D]">#{customer.customerNumber}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircleIcon className="h-5 w-5 flex-shrink-0" />
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Información Personal */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Información Personal</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nombre(s) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    placeholder="Nombre(s)"
                  />
                </div>
              </div>

              {/* Apellido Paterno */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Apellido Paterno <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    placeholder="Apellido paterno"
                  />
                </div>
              </div>

              {/* Apellido Materno */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Apellido Materno</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    name="lastNameMother"
                    value={formData.lastNameMother ?? ''}
                    onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    placeholder="Apellido materno"
                  />
                </div>
              </div>

              {/* Fecha de Nacimiento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha de Nacimiento</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate ?? ''}
                    onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Correo Electrónico <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email ?? ''}
                    onChange={handleChange}
                    required
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono</label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone ?? ''}
                    onChange={handleChange}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    placeholder="+52 55 1234 5678"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Datos Fiscales */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Datos Fiscales</h2>
            <p className="text-xs text-gray-500 mb-5">
              Estos campos son solo para identificación del distribuidor. La Razón Social para facturación se gestiona en el módulo de facturación.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">RFC</label>
                <div className="relative">
                  <IdentificationIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    name="rfc"
                    value={formData.rfc ?? ''}
                    onChange={(e) => setFormData((p) => ({ ...p, rfc: e.target.value.toUpperCase() }))}
                    maxLength={13}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    placeholder="ABCD123456XYZ"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">12 o 13 caracteres</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">CURP</label>
                <div className="relative">
                  <IdentificationIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    name="curp"
                    value={formData.curp ?? ''}
                    onChange={(e) => setFormData((p) => ({ ...p, curp: e.target.value.toUpperCase() }))}
                    maxLength={18}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    placeholder="ABCD123456HDFRRL01"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">18 caracteres</p>
              </div>
            </div>
          </div>

          {/* Tipo de cliente */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Tipo de Cliente</h2>
            <p className="text-sm text-gray-500 mb-5">
              Define cómo participa en el MLM y qué tipo de precio paga.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {CUSTOMER_TYPE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = formData.customerType === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      active ? 'border-[#3E667D] bg-[#3E667D]/5' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="customerType"
                      value={opt.value}
                      checked={active}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <Icon className={`h-6 w-6 shrink-0 ${opt.color}`} />
                    <div>
                      <p className="font-medium text-gray-900">{opt.label}</p>
                      <p className="text-xs text-gray-500">{opt.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Estado */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">Estado de la Cuenta</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {STATUS_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center justify-center gap-2 p-3 border-2 rounded-lg cursor-pointer text-sm font-medium transition-colors ${
                    formData.status === opt.value
                      ? 'border-[#3E667D] bg-[#3E667D]/5 text-[#3E667D]'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    checked={formData.status === opt.value}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pb-4">
            <Link
              href={`/admin/distribuidores/${id}`}
              className="px-5 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving || isLoading}
              className="px-6 py-2 bg-[#3E667D] text-white rounded-lg text-sm font-medium hover:bg-[#2f5165] disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
