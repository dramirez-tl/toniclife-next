'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchCustomerById,
  fetchAddresses,
  fetchBankAccounts,
  selectSelectedCustomer,
  selectCustomersError,
  updateCustomer,
} from '@/store/slices/customersSlice';
import { CustomerStatus } from '@/types/customer';
import {
  ArrowLeftIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  IdentificationIcon,
  MapPinIcon,
  BuildingLibraryIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  suspended: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  pending: 'Pendiente',
  suspended: 'Suspendido',
};

export default function DetalleDistribuidorPage() {
  const params = useParams();
  const id = params.id as string;
  const dispatch = useAppDispatch();
  const customer = useAppSelector(selectSelectedCustomer);
  const error = useAppSelector(selectCustomersError);
  const [isLoading, setIsLoading] = useState(true);
  const [statusChangeLoading, setStatusChangeLoading] = useState(false);

  useEffect(() => {
    const loadCustomer = async () => {
      setIsLoading(true);
      await dispatch(fetchCustomerById(id));
      await dispatch(fetchAddresses(id));
      await dispatch(fetchBankAccounts(id));
      setIsLoading(false);
    };
    loadCustomer();
  }, [dispatch, id]);

  const handleStatusChange = async (newStatus: CustomerStatus) => {
    if (!customer) return;
    setStatusChangeLoading(true);
    await dispatch(updateCustomer({ id: customer.id, data: { status: newStatus } }));
    setStatusChangeLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003B7A]"></div>
          <span className="text-gray-600">Cargando información...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error al cargar</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/admin/distribuidores"
            className="text-[#003B7A] hover:underline"
          >
            Volver a la lista
          </Link>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No encontrado</h2>
          <p className="text-gray-600 mb-4">El cliente no fue encontrado</p>
          <Link
            href="/admin/distribuidores"
            className="text-[#003B7A] hover:underline"
          >
            Volver a la lista
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/distribuidores"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {customer.firstName} {customer.lastName}
                  </h1>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      statusColors[customer.status]
                    }`}
                  >
                    {statusLabels[customer.status]}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-gray-500">
                    {customer.customerType === 'distributor' ? 'Distribuidor' : 'Cliente'}
                  </span>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {customer.customerNumber || '-'}
                  </code>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/admin/distribuidores/${customer.id}/editar`}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <PencilIcon className="h-4 w-4" />
                Editar
              </Link>
              <select
                value={customer.status}
                onChange={(e) => handleStatusChange(e.target.value as CustomerStatus)}
                disabled={statusChangeLoading}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003B7A]"
              >
                <option value="active">Activar</option>
                <option value="inactive">Desactivar</option>
                <option value="pending">Pendiente</option>
                <option value="suspended">Suspender</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información Personal */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                Información Personal
              </h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-gray-500">Nombre completo</label>
                  <p className="font-medium text-gray-900">
                    {customer.firstName} {customer.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Correo electrónico</label>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                    {customer.email}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Teléfono principal</label>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <PhoneIcon className="h-4 w-4 text-gray-400" />
                    {customer.phone || '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Apellido materno</label>
                  <p className="font-medium text-gray-900">
                    {customer.lastNameMother || '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Fecha de nacimiento</label>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-gray-400" />
                    {customer.birthDate
                      ? new Date(customer.birthDate).toLocaleDateString('es-MX')
                      : '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Información Fiscal */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <IdentificationIcon className="h-5 w-5" />
                Información Fiscal
              </h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-gray-500">RFC</label>
                  <p className="font-medium text-gray-900 font-mono">
                    {customer.rfc || '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">CURP</label>
                  <p className="font-medium text-gray-900 font-mono">
                    {customer.curp || '-'}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-gray-500">Regimen Fiscal</label>
                  <p className="font-medium text-gray-900">
                    {customer.taxRegime || '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Direcciones */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <MapPinIcon className="h-5 w-5" />
                  Direcciones
                </h2>
                <Link
                  href={`/admin/distribuidores/${customer.id}/direcciones/nueva`}
                  className="text-sm text-[#003B7A] hover:underline"
                >
                  + Agregar
                </Link>
              </div>
              {customer.addresses && customer.addresses.length > 0 ? (
                <div className="space-y-4">
                  {customer.addresses.map((address) => (
                    <div
                      key={address.id}
                      className={`p-4 border rounded-lg ${
                        address.isDefault ? 'border-[#003B7A] bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            address.type === 'shipping'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {address.type === 'shipping' ? 'Envío' : 'Facturación'}
                        </span>
                        {address.isDefault && (
                          <span className="text-xs text-[#003B7A] font-medium">
                            Predeterminada
                          </span>
                        )}
                      </div>
                      <p className="text-gray-900">
                        {address.street} {address.exteriorNumber}
                        {address.interiorNumber && ` Int. ${address.interiorNumber}`}
                      </p>
                      <p className="text-gray-600 text-sm">
                        {address.neighborhood}, {address.city}, {address.state},{' '}
                        {address.postalCode}
                      </p>
                      {address.phone && (
                        <p className="text-gray-500 text-sm mt-1">Tel: {address.phone}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No hay direcciones registradas</p>
              )}
            </div>

            {/* Cuentas Bancarias */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BuildingLibraryIcon className="h-5 w-5" />
                  Cuentas Bancarias
                </h2>
                <Link
                  href={`/admin/distribuidores/${customer.id}/cuentas/nueva`}
                  className="text-sm text-[#003B7A] hover:underline"
                >
                  + Agregar
                </Link>
              </div>
              {customer.bankAccounts && customer.bankAccounts.length > 0 ? (
                <div className="space-y-4">
                  {customer.bankAccounts.map((account) => (
                    <div
                      key={account.id}
                      className={`p-4 border rounded-lg ${
                        account.isDefault ? 'border-[#003B7A] bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">
                          {account.bankName || 'Banco no especificado'}
                        </span>
                        {account.isDefault && (
                          <span className="text-xs text-[#003B7A] font-medium">
                            Predeterminada
                          </span>
                        )}
                      </div>
                      {account.accountHolder && (
                        <p className="text-gray-600 text-sm">
                          Titular: {account.accountHolder}
                        </p>
                      )}
                      {account.accountNumber && (
                        <p className="text-gray-600 text-sm font-mono">
                          Cuenta: ****{account.accountNumber.slice(-4)}
                        </p>
                      )}
                      {account.clabe && (
                        <p className="text-gray-600 text-sm font-mono">
                          CLABE: ****{account.clabe.slice(-4)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No hay cuentas bancarias registradas
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Info MLM */}
            {customer.customerType === 'distributor' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <UserGroupIcon className="h-5 w-5" />
                  Informacion de Red
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-500">Numero de Cliente</label>
                    <p className="font-mono font-bold text-lg text-[#003B7A]">
                      {customer.customerNumber || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Kit de Inicio</label>
                    <p className="font-medium text-gray-900 capitalize">
                      {customer.kitType || 'No especificado'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Patrocinador</label>
                    {customer.sponsor ? (
                      <Link
                        href={`/admin/distribuidores/${customer.sponsor.id}`}
                        className="block text-[#003B7A] hover:underline"
                      >
                        {customer.sponsor.firstName} {customer.sponsor.lastName}
                        <span className="text-gray-500 text-sm ml-2">
                          ({customer.sponsor.email || ''})
                        </span>
                      </Link>
                    ) : (
                      <p className="text-gray-500">Sin patrocinador</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Fecha de Inscripcion</label>
                    <p className="font-medium text-gray-900">
                      {customer.registrationDate
                        ? new Date(customer.registrationDate).toLocaleDateString('es-MX')
                        : '-'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Fechas importantes */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ClockIcon className="h-5 w-5" />
                Fechas Importantes
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">Fecha de Registro</label>
                  <p className="font-medium text-gray-900">
                    {new Date(customer.createdAt).toLocaleDateString('es-MX', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Ultima Actualizacion</label>
                  <p className="font-medium text-gray-900">
                    {customer.updatedAt
                      ? new Date(customer.updatedAt).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Términos Aceptados</label>
                  <div className="flex items-center gap-2">
                    {customer.termsAcceptedAt ? (
                      <>
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        <span className="text-green-700">
                          {new Date(customer.termsAcceptedAt).toLocaleDateString('es-MX')}
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircleIcon className="h-5 w-5 text-red-500" />
                        <span className="text-red-700">No aceptados</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ID del sistema */}
            <div className="bg-gray-100 rounded-lg p-4">
              <label className="text-xs text-gray-500">ID del Sistema</label>
              <p className="font-mono text-xs text-gray-700 break-all">{customer.id}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
