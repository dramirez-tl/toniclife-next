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
import { promotionsService } from '@/services/promotions.service';
import type { ManualGrantRequest } from '@/types/promotion';
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

            {/* Promociones (derechos + otorgamiento manual) */}
            {customer.customerType === 'distributor' && (
              <PromotionGrantsSection customerId={customer.id} />
            )}

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

// ============================================================================
// Promociones del distribuidor: historial de derechos (auto/manual) +
// "Otorgar promoción" por excepción autorizada (mig 111). Atiende solicitudes
// tipo "habilítale al 1716485 la PROMO149 y 149-1" aunque ya no estén
// vigentes: el canje (POS/panel) ya funciona por derechos, así que el
// otorgado manual se canjea igual que uno ganado por puntos.
// ============================================================================
const GRANT_STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: 'Activo', cls: 'bg-emerald-100 text-emerald-800' },
  redeemed: { label: 'Canjeado', cls: 'bg-blue-100 text-blue-800' },
  expired: { label: 'Vencido', cls: 'bg-gray-100 text-gray-600' },
  cancelled: { label: 'Cancelado', cls: 'bg-red-100 text-red-700' },
};

function PromotionGrantsSection({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [validityDays, setValidityDays] = useState('');
  const [note, setNote] = useState('');

  const grantsQuery = useQuery({
    queryKey: ['customer-grants', customerId],
    queryFn: () => promotionsService.getCustomerGrants(customerId),
    staleTime: 30 * 1000,
  });

  // Catálogo de promos para el modal (incluye NO vigentes, marcadas).
  const promosQuery = useQuery({
    queryKey: ['promos-for-grant'],
    queryFn: () =>
      promotionsService.listPromotions({ isActive: true, limit: 100 }),
    enabled: modalOpen,
    staleTime: 60 * 1000,
  });

  const grantMutation = useMutation({
    mutationFn: (dto: ManualGrantRequest) =>
      promotionsService.grantManual(customerId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-grants', customerId] });
    },
  });
  const revokeMutation = useMutation({
    mutationFn: (grantId: string) => promotionsService.revokeGrant(grantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-grants', customerId] });
    },
  });

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleGrant = async () => {
    if (selected.size === 0) {
      toast.error('Selecciona al menos una promoción');
      return;
    }
    if (note.trim().length < 5) {
      toast.error('La nota de autorización es obligatoria (quién autorizó / ticket)');
      return;
    }
    try {
      const results = await grantMutation.mutateAsync({
        productIds: [...selected],
        validityDays: validityDays.trim() ? Number(validityDays) : undefined,
        note: note.trim(),
      });
      for (const r of results) {
        if (r.status === 'granted') toast.success(`${r.code}: derecho otorgado ✔`);
        else toast.warning(`${r.code}: ${r.message ?? r.status}`);
      }
      if (results.some((r) => r.status === 'granted')) {
        setModalOpen(false);
        setSelected(new Set());
        setValidityDays('');
        setNote('');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Error al otorgar';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const grants = grantsQuery.data ?? [];
  const fmtDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString('es-MX', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ShieldCheckIcon className="h-5 w-5" />
          Promociones (derechos de canje)
        </h2>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-[#3E667D] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#2f5165]"
        >
          + Otorgar promoción
        </button>
      </div>

      {grantsQuery.isLoading ? (
        <p className="py-4 text-center text-sm text-gray-400">Cargando…</p>
      ) : grants.length === 0 ? (
        <p className="rounded-lg border-2 border-dashed p-4 text-center text-sm text-gray-500">
          Sin derechos de promoción. Usa “Otorgar promoción” para habilitarle
          una (incluso si su ventana ya venció) con autorización de Operaciones.
        </p>
      ) : (
        <div className="space-y-2">
          {grants.map((g) => {
            const meta =
              GRANT_STATUS_META[g.status] ?? {
                label: g.status,
                cls: 'bg-gray-100 text-gray-600',
              };
            return (
              <div
                key={g.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    <span className="font-mono text-xs bg-gray-100 rounded px-1.5 py-0.5 mr-1.5">
                      {g.productCode}
                    </span>
                    {g.productName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    {g.source === 'manual' ? '✍ Manual' : '⚙ Automático'} ·
                    otorgado {fmtDate(g.grantedAt)} · vence {fmtDate(g.expiresAt)}
                    {g.consumesPoints ? ' · consume puntos' : ''}
                    {g.redeemedSaleNumber
                      ? ` · canjeado en ${g.redeemedSaleNumber}`
                      : ''}
                    {g.grantNote ? ` · “${g.grantNote}”` : ''}
                    {g.grantedByName ? ` — ${g.grantedByName}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}
                  >
                    {meta.label}
                  </span>
                  {g.status === 'active' && (
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            `¿Revocar el derecho de ${g.productCode}? El distribuidor ya no podrá canjearlo.`,
                          )
                        ) {
                          revokeMutation.mutate(g.id, {
                            onSuccess: () => toast.success('Derecho revocado'),
                            onError: () => toast.error('No se pudo revocar'),
                          });
                        }
                      }}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Revocar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Otorgar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">
              Otorgar promoción por excepción
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Habilita el derecho de canje aunque la ventana de la promo ya
              haya vencido. Vigencia y consumo de puntos: los de la regla del
              país del distribuidor (la vigencia se puede cambiar abajo).
            </p>

            <div className="mt-4 max-h-64 space-y-1.5 overflow-y-auto rounded-lg border p-2">
              {promosQuery.isLoading ? (
                <p className="py-3 text-center text-sm text-gray-400">
                  Cargando promociones…
                </p>
              ) : (
                (promosQuery.data?.data ?? []).map((p) => {
                  const anyCurrent = (p.promotionRuleCountries ?? []).some(
                    (r) => r.isActive && r.isCurrent !== false,
                  );
                  return (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggle(p.id)}
                        className="h-4 w-4 rounded"
                      />
                      <span className="font-mono text-xs bg-gray-100 rounded px-1.5 py-0.5">
                        {p.code}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
                        {p.name}
                      </span>
                      {!anyCurrent && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                          no vigente
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Vigencia del derecho (días)
                </label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value)}
                  placeholder="La de la regla"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Autorización <span className="text-red-500">*</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Autorizó Operaciones — nombre / ticket / correo"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleGrant}
                disabled={grantMutation.isPending}
                className="rounded-lg bg-[#3E667D] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#2f5165] disabled:opacity-50"
              >
                {grantMutation.isPending ? 'Otorgando…' : 'Otorgar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
