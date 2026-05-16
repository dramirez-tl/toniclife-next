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
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersService } from '@/services/customers.service';
import { toast } from 'sonner';
import type { PaymentReadinessItem, DocumentValidation } from '@/types/payment-data';
import { DistributorPeriodActivity } from '@/components/distributor/DistributorPeriodActivity';
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
  ShieldCheckIcon,
  DocumentArrowUpIcon,
  EyeIcon,
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3E667D]"></div>
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
            className="text-[#3E667D] hover:underline"
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
            className="text-[#3E667D] hover:underline"
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
              <SearchableSelect
                options={[
                  { value: 'active', label: 'Activar' },
                  { value: 'inactive', label: 'Desactivar' },
                  { value: 'pending', label: 'Pendiente' },
                  { value: 'suspended', label: 'Suspender' },
                ]}
                value={customer.status}
                onChange={(val) => handleStatusChange(val as CustomerStatus)}
                showAllOption={false}
                disabled={statusChangeLoading}
              />
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

            {/* Actividad por Periodo */}
            <DistributorPeriodActivity customerId={customer.id} />

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
                  className="text-sm text-[#3E667D] hover:underline"
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
                        address.isDefault ? 'border-[#3E667D] bg-blue-50' : 'border-gray-200'
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
                          <span className="text-xs text-[#3E667D] font-medium">
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
                  className="text-sm text-[#3E667D] hover:underline"
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
                        account.isDefault ? 'border-[#3E667D] bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">
                          {account.bankName || 'Banco no especificado'}
                        </span>
                        {account.isDefault && (
                          <span className="text-xs text-[#3E667D] font-medium">
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
            {/* Payment Readiness */}
            {customer.customerType === 'distributor' && (
              <PaymentReadinessSection customerId={customer.id} />
            )}

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
                    <p className="font-mono font-bold text-lg text-[#3E667D]">
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
                        className="block text-[#3E667D] hover:underline"
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

// ===== PAYMENT READINESS SECTION =====

function PaymentReadinessSection({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();
  const [rejectField, setRejectField] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data: readiness, isLoading } = useQuery({
    queryKey: ['customer', customerId, 'payment-readiness'],
    queryFn: () => customersService.getPaymentReadiness(customerId),
  });

  const validateMutation = useMutation({
    mutationFn: (validations: DocumentValidation[]) =>
      customersService.validateDocuments(customerId, validations),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId, 'payment-readiness'] });
      toast.success(result.documentsValidated ? 'Todos los documentos validados' : 'Validación actualizada');
      setRejectField(null);
      setRejectReason('');
    },
    onError: () => toast.error('Error al validar documentos'),
  });

  const handleApprove = (field: string) => {
    validateMutation.mutate([{ field, approved: true }]);
  };

  const handleReject = (field: string) => {
    if (!rejectReason.trim()) {
      toast.error('Ingresa un motivo de rechazo');
      return;
    }
    validateMutation.mutate([{ field, approved: false, rejectionReason: rejectReason }]);
  };

  const handleApproveAll = () => {
    const docItems = readiness?.items.filter(
      (i) => i.url && (i.status === 'uploaded' || i.status === 'rejected'),
    );
    if (!docItems?.length) return;
    const validations = docItems.map((i) => {
      const fieldMap: Record<string, string> = { ineDocument: 'ine', taxIdDocument: 'taxId', bankStatement: 'bankStatement' };
      return { field: fieldMap[i.field] || i.field, approved: true };
    });
    validateMutation.mutate(validations);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-48 bg-gray-200 rounded" />
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!readiness) return null;

  const statusIcon = (status: string) => {
    switch (status) {
      case 'complete':
      case 'validated':
        return <CheckCircleIcon className="h-4 w-4 text-emerald-500" />;
      case 'uploaded':
        return <ClockIcon className="h-4 w-4 text-amber-500" />;
      case 'rejected':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      default:
        return <ExclamationTriangleIcon className="h-4 w-4 text-gray-300" />;
    }
  };

  const docFields = ['ineDocument', 'taxIdDocument', 'bankStatement'];
  const pendingDocs = readiness.items.filter(
    (i) => docFields.includes(i.field) && i.status === 'uploaded',
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <DocumentArrowUpIcon className="h-5 w-5" />
          Documentos para Pago
        </h2>
        {readiness.overallReady ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <ShieldCheckIcon className="h-3.5 w-3.5" />
            Listo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700">
            <ExclamationTriangleIcon className="h-3.5 w-3.5" />
            Incompleto
          </span>
        )}
      </div>

      <div className="space-y-2">
        {readiness.items.map((item) => (
          <div key={item.field} className="flex items-start gap-2 py-1.5">
            {statusIcon(item.status)}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-700">{item.label}</p>
              {item.value && (
                <p className="text-xs text-gray-400 font-mono truncate">{item.value}</p>
              )}
              {item.status === 'rejected' && item.rejectionReason && (
                <p className="text-xs text-red-500 mt-0.5">Rechazado: {item.rejectionReason}</p>
              )}
              {/* Document action buttons */}
              {item.url && docFields.includes(item.field) && (
                <div className="flex items-center gap-2 mt-1">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#3E667D] hover:underline flex items-center gap-0.5"
                  >
                    <EyeIcon className="h-3 w-3" />
                    Ver
                  </a>
                  {(item.status === 'uploaded' || item.status === 'rejected') && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const fieldMap: Record<string, string> = { ineDocument: 'ine', taxIdDocument: 'taxId', bankStatement: 'bankStatement' };
                          handleApprove(fieldMap[item.field] || item.field);
                        }}
                        disabled={validateMutation.isPending}
                        className="text-xs text-emerald-600 hover:text-emerald-800 font-medium"
                      >
                        Validar
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectField(item.field)}
                        disabled={validateMutation.isPending}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                </div>
              )}
              {/* Rejection reason input */}
              {rejectField === item.field && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Motivo del rechazo..."
                    className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const fieldMap: Record<string, string> = { ineDocument: 'ine', taxIdDocument: 'taxId', bankStatement: 'bankStatement' };
                      handleReject(fieldMap[item.field] || item.field);
                    }}
                    disabled={validateMutation.isPending}
                    className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                  >
                    Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRejectField(null); setRejectReason(''); }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bulk approve button */}
      {pendingDocs.length > 0 && (
        <button
          type="button"
          onClick={handleApproveAll}
          disabled={validateMutation.isPending}
          className="mt-4 w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {validateMutation.isPending ? 'Validando...' : `Validar todos (${pendingDocs.length} documentos)`}
        </button>
      )}
    </div>
  );
}
