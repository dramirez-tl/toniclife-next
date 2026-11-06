'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchCustomerById,
  updateCustomer,
  selectSelectedCustomer,
  selectCustomersLoading,
  selectCustomersError,
  clearError,
} from '@/store/slices/customersSlice';
import { selectUserRoles } from '@/store/slices/authSlice';
import type { UpdateCustomerDto } from '@/types/customer';
import { useActivePriceTypes, useActiveCountries } from '@/hooks/useConfig';
import { customersService } from '@/services/customers.service';
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
  GlobeAltIcon,
  LockOpenIcon,
} from '@heroicons/react/24/outline';

// Lo que cada estado hace HOY en el sistema (pricing.service, enrollment,
// shared-cart, Tesorería): cualquier estado distinto de "active" compra a
// precio público, no puede patrocinar altas ni compartir carrito; "inactive"
// además queda fuera de la cola de pago de Tesorería. La red y el historial
// nunca se tocan al cambiar de estado.
const STATUS_OPTIONS = [
  {
    value: 'active',
    label: 'Activo',
    desc: 'Opera normal: precio de distribuidor, puede patrocinar altas, compartir carrito y cobrar comisiones.',
  },
  {
    value: 'inactive',
    label: 'Inactivo',
    desc: 'Baja (a petición del distribuidor o por dejar de comprar). Conserva su historial y su lugar en la red; compra a precio público, no patrocina ni cobra comisiones. Reversible.',
  },
  {
    value: 'pending',
    label: 'Pendiente',
    desc: 'Alta sin terminar: aún no paga su kit de inscripción. Se activa solo al cobrarlo; mientras tanto el panel le pide el kit.',
  },
  {
    value: 'suspended',
    label: 'Suspendido',
    desc: 'Bloqueo temporal por decisión de la empresa (revisión, adeudo). Se trata como no activo (precio público, sin patrocinar ni compartir carrito); red e historial se conservan. Reversible.',
  },
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
  // Solo el superadministrador puede dejar el correo vacío (el API lo
  // exige): el distribuidor registra uno al entrar al portal.
  const isSuperAdmin = useAppSelector(selectUserRoles).includes('super_admin');
  const { data: priceTypes } = useActivePriceTypes();

  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const { data: countries } = useActiveCountries();
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
    countryId: '',
    countryChangeReason: '',
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
        countryId: customer.countryId ?? '',
        countryChangeReason: '',
      });
    }
  }, [customer, id]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    setSaving(true);

    // Solo se mandan los campos que CAMBIARON. Antes se reenviaba todo y un
    // dato viejo inválido (p. ej. una CURP mal capturada en el sistema
    // anterior) hacía fallar la validación del API aunque solo se quisiera
    // cambiar el correo.
    const payload: UpdateCustomerDto = {};
    const orig = {
      firstName: customer?.firstName ?? '',
      lastName: customer?.lastName ?? '',
      lastNameMother: customer?.lastNameMother ?? '',
      phone: customer?.phone ?? '',
      birthDate: customer?.birthDate ? customer.birthDate.split('T')[0] : '',
      rfc: (customer?.rfc ?? '').toUpperCase(),
      curp: (customer?.curp ?? '').toUpperCase(),
      status: customer?.status ?? 'active',
      customerType: customer?.customerType ?? 'distributor',
    };
    const firstName = formData.firstName?.trim() ?? '';
    if (firstName && firstName !== orig.firstName) payload.firstName = firstName;
    const lastName = formData.lastName?.trim() ?? '';
    if (lastName && lastName !== orig.lastName) payload.lastName = lastName;
    const lastNameMother = formData.lastNameMother?.trim() ?? '';
    if (lastNameMother !== orig.lastNameMother) {
      payload.lastNameMother = lastNameMother || undefined;
    }
    const email = formData.email?.trim() ?? '';
    if (email) {
      if (email.toLowerCase() !== (customer?.email ?? '').toLowerCase()) {
        payload.email = email;
      }
    } else if (isSuperAdmin && customer?.email) {
      // Vaciar el campo = QUITAR el correo (email: null); la cuenta queda
      // pendiente de registrar uno al entrar.
      payload.email = null;
    }
    const phone = formData.phone?.trim() ?? '';
    if (phone !== orig.phone) payload.phone = phone || undefined;
    const birthDate = formData.birthDate ?? '';
    if (birthDate !== orig.birthDate) payload.birthDate = birthDate || undefined;
    // RFC/CURP: '' = borrar el dato (el API lo acepta y lo deja en NULL).
    const rfc = formData.rfc?.trim().toUpperCase() ?? '';
    if (rfc !== orig.rfc) payload.rfc = rfc;
    const curp = formData.curp?.trim().toUpperCase() ?? '';
    if (curp !== orig.curp) payload.curp = curp;
    if (formData.status && formData.status !== orig.status) {
      payload.status = formData.status;
    }

    // País (5-nov-2026): solo desde el admin y con motivo obligatorio (queda en la
    // auditoría). La moneda y los precios siguen al país.
    const countryId = formData.countryId ?? '';
    if (countryId && countryId !== (customer?.countryId ?? '')) {
      const reason = (formData.countryChangeReason ?? '').trim();
      if (reason.length < 5) {
        toast.error('Escribe el motivo del cambio de país (quién lo solicitó y por qué).');
        setSaving(false);
        return;
      }
      payload.countryId = countryId;
      payload.countryChangeReason = reason;
    }

    // Tipo de cliente. Si cambia a preferente/cliente, asignamos su tipo de
    // precio correspondiente. Para distribuidor no tocamos price_type_id (lo
    // define el kit/enrollment).
    if (formData.customerType && formData.customerType !== orig.customerType) {
      payload.customerType = formData.customerType;
      if (formData.customerType !== 'distributor') {
        const ptId = findPriceTypeIdForCustomerType(priceTypes, formData.customerType);
        if (ptId) payload.priceTypeId = ptId;
      }
    }

    if (Object.keys(payload).length === 0) {
      toast.info('No hay cambios que guardar');
      setSaving(false);
      return;
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
                  Correo Electrónico{' '}
                  {!isSuperAdmin && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email ?? ''}
                    onChange={handleChange}
                    required={!isSuperAdmin}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                {isSuperAdmin && (
                  <p className="mt-1 text-xs text-gray-500">
                    Déjalo vacío para quitarle el correo: el distribuidor
                    tendrá que registrar uno al entrar al portal con su número.
                  </p>
                )}
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono</label>
                <PhoneInput
                  value={formData.phone ?? ''}
                  onChange={(v) => setFormData((prev) => ({ ...prev, phone: v }))}
                />
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

          {/* País (5-nov-2026): cambio solo desde el admin, con motivo */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">País</h2>
            <p className="text-xs text-gray-500 mb-5">
              Define la moneda, los precios y la tienda que ve el distribuidor. Él no puede cambiarlo desde su portal; aquí
              sí, dejando el motivo (quién lo solicitó y por qué), que queda en la auditoría.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">País</label>
                <div className="relative">
                  <GlobeAltIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    name="countryId"
                    value={formData.countryId ?? ''}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3E667D] focus:border-transparent bg-white"
                  >
                    <option value="">Sin país</option>
                    {(countries ?? []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.currencyCode ? ` · ${c.currencyCode}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {(formData.countryId ?? '') !== (customer?.countryId ?? '') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Motivo del cambio <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="countryChangeReason"
                    value={formData.countryChangeReason ?? ''}
                    onChange={handleChange}
                    rows={3}
                    maxLength={300}
                    placeholder="Ej. Lo solicitó la distribuidora por WhatsApp el 5-nov: se mudó a Guatemala."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1">Quién lo pidió y por qué. Queda registrado en la auditoría.</p>
                </div>
              )}
            </div>
          </div>

          {/* Acceso al portal (5-nov-2026): bloqueo por intentos fallidos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Acceso al portal</h2>
            <p className="text-xs text-gray-500 mb-4">
              Tras varios intentos fallidos el sistema bloquea el inicio de sesión unos minutos (&quot;Cuenta bloqueada. Intenta de
              nuevo en N minutos&quot;). Aquí se quita el bloqueo de inmediato.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {customer?.accessLockedUntil ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  Bloqueado hasta {new Date(customer.accessLockedUntil).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  {customer.accessFailedAttempts ? ` · ${customer.accessFailedAttempts} intentos fallidos` : ''}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
                  <CheckCircleIcon className="h-4 w-4" />
                  Sin bloqueo
                  {customer?.accessFailedAttempts ? ` · ${customer.accessFailedAttempts} intentos fallidos acumulados` : ''}
                </span>
              )}
              <button
                type="button"
                disabled={unlocking}
                onClick={async () => {
                  setUnlocking(true);
                  try {
                    const r = await customersService.unlockAccess(id);
                    if (r.unlocked) toast.success(r.message);
                    else toast.info(r.message);
                    await dispatch(fetchCustomerById(id));
                  } catch (err: unknown) {
                    const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                    toast.error(msg || 'No se pudo desbloquear el acceso');
                  } finally {
                    setUnlocking(false);
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <LockOpenIcon className="h-4 w-4 text-emerald-600" />
                {unlocking ? 'Desbloqueando…' : 'Desbloquear acceso'}
              </button>
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
            <h2 className="text-base font-semibold text-gray-900 mb-1">Estado de la Cuenta</h2>
            <p className="text-xs text-gray-500 mb-5">
              ¿Baja solicitada por el distribuidor o por dejar de comprar? Usa <span className="font-medium text-gray-700">Inactivo</span>.
              <span className="font-medium text-gray-700"> Suspendido</span> es un bloqueo temporal decidido por la empresa. Ningún estado borra su red ni su historial.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {STATUS_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex flex-col gap-1.5 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                    formData.status === opt.value
                      ? 'border-[#3E667D] bg-[#3E667D]/5'
                      : 'border-gray-200 hover:border-gray-300'
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
                  <span className={`text-sm font-medium ${formData.status === opt.value ? 'text-[#3E667D]' : 'text-gray-800'}`}>
                    {opt.label}
                  </span>
                  <span className="text-[11px] leading-snug text-gray-500">{opt.desc}</span>
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
