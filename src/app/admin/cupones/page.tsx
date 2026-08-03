'use client';

// Admin de CUPONES de descuento — datos reales (antes era una maqueta).
// Backend: /coupons (CRUD + stats). El cupón se aplica en el carrito ecommerce.

import { Suspense, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  TicketIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  UsersIcon,
  ReceiptPercentIcon,
  TruckIcon,
  BanknotesIcon,
  SparklesIcon,
  PauseCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import {
  useCoupons,
  useCouponsStats,
  useCreateCoupon,
  useUpdateCoupon,
  useDeleteCoupon,
} from '@/hooks/useCoupons';
import { useActiveCountries } from '@/hooks/useConfig';
import { useActiveBranches } from '@/hooks/useBranches';
import type {
  Coupon,
  CouponChannel,
  CouponInput,
  CouponType,
} from '@/services/coupons.service';
import { PermissionGuard } from '@/components/auth';

// ─────────────────────────────────────────────────────────────────────────────

type CouponStatus = 'active' | 'scheduled' | 'expired' | 'inactive';

function couponStatus(c: Coupon): CouponStatus {
  const today = new Date().toISOString().slice(0, 10);
  if (!c.isActive) return 'inactive';
  if (c.validFrom > today) return 'scheduled';
  if (
    (c.validUntil && c.validUntil < today) ||
    (c.usageLimit !== null && c.usageCount >= c.usageLimit)
  ) {
    return 'expired';
  }
  return 'active';
}

const STATUS_UI: Record<CouponStatus, { label: string; cls: string }> = {
  active: { label: 'Activo', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  scheduled: { label: 'Programado', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  expired: { label: 'Expirado', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  inactive: { label: 'Inactivo', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const TYPE_UI: Record<CouponType, { label: string; Icon: typeof TicketIcon }> = {
  percentage: { label: 'Porcentaje', Icon: ReceiptPercentIcon },
  fixed_amount: { label: 'Monto fijo', Icon: BanknotesIcon },
  free_shipping: { label: 'Envío gratis', Icon: TruckIcon },
};

function randomCode(prefix = 'TL'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${s}`;
}

const CHANNEL_UI: Record<CouponChannel, { label: string; cls: string }> = {
  all: { label: 'POS + Tienda', cls: 'border-gray-200 bg-gray-50 text-gray-600' },
  pos: { label: 'Solo POS', cls: 'border-sky-200 bg-sky-50 text-sky-700' },
  ecommerce: { label: 'Solo Tienda', cls: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
};

const EMPTY_FORM: CouponInput = {
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: 10,
  isActive: true,
  isStackable: false,
  allowedChannel: 'all',
  employeeOnly: false,
  branchIds: [],
};

// ─────────────────────────────────────────────────────────────────────────────

export default function CuponesPage() {
  return (
    <Suspense>
      <CuponesContent />
    </Suspense>
  );
}

function CuponesContent() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useCoupons({
    search: search || undefined,
    status: (statusFilter || undefined) as CouponStatus | undefined,
    type: (typeFilter || undefined) as CouponType | undefined,
    page,
    limit: 20,
  });
  const { data: stats } = useCouponsStats();
  const { data: countriesData } = useActiveCountries();
  const countries = useMemo(
    () =>
      (countriesData || []).map((c: { id: string; name: string }) => ({
        value: c.id,
        label: c.name,
      })),
    [countriesData],
  );
  const { data: branchesData } = useActiveBranches();
  // Nombres de sucursal: catálogo activo + los que ya vienen en los cupones
  // (una sucursal inactiva ligada a un cupón viejo debe mostrar su nombre,
  // no el UUID).
  const branchNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of branchesData ?? []) m.set(b.id, b.name);
    for (const c of data?.data ?? [])
      for (const b of c.branches ?? []) if (!m.has(b.id)) m.set(b.id, b.name);
    return m;
  }, [branchesData, data]);

  const createMutation = useCreateCoupon();
  const updateMutation = useUpdateCoupon();
  const deleteMutation = useDeleteCoupon();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponInput>(EMPTY_FORM);
  const set = (patch: Partial<CouponInput>) => setForm((f) => ({ ...f, ...patch }));

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, code: randomCode() });
    setModalOpen(true);
  };

  const couponToForm = (c: Coupon): CouponInput => ({
    code: c.code,
    description: c.description || '',
    discountType: c.discountType,
    discountValue: c.discountValue,
    currencyCode: c.currencyCode || undefined,
    minPurchaseAmount: c.minPurchaseAmount ?? undefined,
    maxDiscountAmount: c.maxDiscountAmount ?? undefined,
    usageLimit: c.usageLimit ?? undefined,
    usageLimitPerCustomer: c.usageLimitPerCustomer ?? undefined,
    customerNumber: c.customerNumber || undefined,
    countryId: c.countryId || undefined,
    validFrom: c.validFrom,
    validUntil: c.validUntil || undefined,
    isActive: c.isActive,
    isStackable: c.isStackable,
    allowedChannel: c.allowedChannel ?? 'all',
    employeeOnly: c.employeeOnly ?? false,
    branchIds: (c.branches ?? []).map((b) => b.id),
  });

  const openEdit = (c: Coupon) => {
    setEditingId(c.id);
    setForm(couponToForm(c));
    setModalOpen(true);
  };

  const openDuplicate = (c: Coupon) => {
    setEditingId(null);
    setForm({ ...couponToForm(c), code: randomCode(c.code.split('-')[0] || 'TL') });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.code.trim()) {
      toast.error('El código es obligatorio');
      return;
    }
    if (
      form.discountType !== 'free_shipping' &&
      (!form.discountValue || form.discountValue <= 0)
    ) {
      toast.error('Captura el valor del descuento');
      return;
    }
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, input: form });
        toast.success(`Cupón ${form.code.toUpperCase()} actualizado`);
      } else {
        await createMutation.mutateAsync(form);
        toast.success(`Cupón ${form.code.toUpperCase()} creado`);
      }
      setModalOpen(false);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string | string[] } } })?.response
          ?.data?.message || 'Error al guardar el cupón';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  const handleToggleActive = async (c: Coupon) => {
    try {
      await updateMutation.mutateAsync({
        id: c.id,
        input: { ...couponToForm(c), isActive: !c.isActive },
      });
      toast.success(c.isActive ? 'Cupón desactivado' : 'Cupón activado');
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message || 'No se pudo cambiar el estado';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  const handleDelete = async (c: Coupon) => {
    if (
      !window.confirm(
        c.usageCount > 0
          ? `${c.code} ya tiene ${c.usageCount} usos: se DESACTIVARÁ (no se borra, por auditoría). ¿Continuar?`
          : `¿Eliminar el cupón ${c.code}? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    try {
      const res = await deleteMutation.mutateAsync(c.id);
      toast.success(res.deleted ? 'Cupón eliminado' : 'Cupón desactivado (tenía usos)');
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string | string[] } } })
          ?.response?.data?.message || 'No se pudo eliminar el cupón';
      toast.error(Array.isArray(msg) ? msg[0] : msg);
    }
  };

  const coupons = data?.data || [];

  return (
    <PermissionGuard permissions={['promotions:read', 'promotions:*']}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <TicketIcon className="h-9 w-9" />
                  <h1 className="text-3xl font-bold sm:text-4xl">Cupones de Descuento</h1>
                </div>
                <p className="text-base text-white/80 sm:text-lg">
                  Cupones generales o personalizados por cliente — porcentaje, monto fijo o envío gratis
                </p>
              </div>
              <Button
                onClick={openCreate}
                className="bg-white font-semibold text-[#3E667D] hover:bg-white/90"
                size="lg"
              >
                <PlusIcon className="h-5 w-5" />
                Nuevo Cupón
              </Button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard icon={TicketIcon} label="Total" value={stats?.total ?? '—'} />
            <StatCard
              icon={CheckCircleIcon}
              label="Activos"
              value={stats?.active ?? '—'}
              accent="text-emerald-600"
            />
            <StatCard
              icon={ClockIcon}
              label="Programados"
              value={stats?.scheduled ?? '—'}
              accent="text-blue-600"
            />
            <StatCard
              icon={XCircleIcon}
              label="Expirados"
              value={stats?.expired ?? '—'}
              accent="text-amber-600"
            />
            <StatCard
              icon={PauseCircleIcon}
              label="Inactivos"
              value={stats?.inactive ?? '—'}
              accent="text-gray-500"
            />
            <StatCard
              icon={UsersIcon}
              label="Usos totales"
              value={stats?.totalUses ?? '—'}
              accent="text-[#3E667D]"
            />
          </div>

          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_200px_200px]">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Buscar por código o descripción…"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="pl-9"
                  />
                </div>
                <SearchableSelect
                  options={[
                    { value: 'active', label: 'Activos' },
                    { value: 'scheduled', label: 'Programados' },
                    { value: 'expired', label: 'Expirados' },
                    { value: 'inactive', label: 'Inactivos' },
                  ]}
                  value={statusFilter}
                  onChange={(v) => {
                    setStatusFilter(v);
                    setPage(1);
                  }}
                  allLabel="Todos los Estados"
                />
                <SearchableSelect
                  options={[
                    { value: 'percentage', label: 'Porcentaje' },
                    { value: 'fixed_amount', label: 'Monto fijo' },
                    { value: 'free_shipping', label: 'Envío gratis' },
                  ]}
                  value={typeFilter}
                  onChange={(v) => {
                    setTypeFilter(v);
                    setPage(1);
                  }}
                  allLabel="Todos los Tipos"
                />
              </div>
            </CardContent>
          </Card>

          {/* Lista */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-3 p-6">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />
                  ))}
                </div>
              ) : coupons.length === 0 ? (
                <div className="p-12 text-center">
                  <TicketIcon className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                  <p className="font-medium text-gray-600">No hay cupones</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Crea el primero con “Nuevo Cupón”.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {coupons.map((c) => (
                    <CouponRow
                      key={c.id}
                      coupon={c}
                      onEdit={() => openEdit(c)}
                      onDuplicate={() => openDuplicate(c)}
                      onToggle={() => handleToggleActive(c)}
                      onDelete={() => handleDelete(c)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Paginación */}
          {(data?.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm text-gray-500">
                Página {page} de {data?.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= (data?.totalPages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </div>

        {/* Modal Crear/Editar */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar cupón' : 'Nuevo cupón'}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              {/* Código + generador */}
              <div className="grid gap-2">
                <Label>Código *</Label>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <Input
                    value={form.code}
                    onChange={(e) => set({ code: e.target.value.toUpperCase() })}
                    placeholder="EJ. BIENVENIDA10"
                    className="font-mono uppercase"
                    maxLength={40}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => set({ code: randomCode() })}
                    title="Generar código aleatorio"
                  >
                    <SparklesIcon className="h-4 w-4" />
                    Generar
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Descripción</Label>
                <Textarea
                  value={form.description || ''}
                  onChange={(e) => set({ description: e.target.value })}
                  placeholder="¿Para qué es este cupón? (visible solo en admin)"
                  rows={2}
                />
              </div>

              {/* Tipo + valor */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Tipo de descuento *</Label>
                  <SearchableSelect
                    options={[
                      { value: 'percentage', label: 'Porcentaje (%)' },
                      { value: 'fixed_amount', label: 'Monto fijo ($)' },
                      { value: 'free_shipping', label: 'Envío gratis' },
                    ]}
                    value={form.discountType}
                    onChange={(v) =>
                      set({ discountType: (v || 'percentage') as CouponType })
                    }
                    showAllOption={false}
                  />
                </div>
                {form.discountType !== 'free_shipping' && (
                  <div className="grid gap-2">
                    <Label>
                      {form.discountType === 'percentage'
                        ? 'Porcentaje (1-100) *'
                        : 'Monto *'}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      max={form.discountType === 'percentage' ? 100 : undefined}
                      value={form.discountValue ?? ''}
                      onChange={(e) =>
                        set({ discountValue: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>
                )}
              </div>

              {/* Condiciones */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Compra mínima (opcional)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.minPurchaseAmount ?? ''}
                    onChange={(e) =>
                      set({
                        minPurchaseAmount: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="Sin mínimo"
                  />
                </div>
                {form.discountType === 'percentage' && (
                  <div className="grid gap-2">
                    <Label>Tope de descuento $ (opcional)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.maxDiscountAmount ?? ''}
                      onChange={(e) =>
                        set({
                          maxDiscountAmount: e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        })
                      }
                      placeholder="Sin tope"
                    />
                  </div>
                )}
                {form.discountType === 'fixed_amount' && (
                  <div className="grid gap-2">
                    <Label>Moneda del monto (opcional)</Label>
                    <SearchableSelect
                      options={[
                        { value: 'MXN', label: 'MXN — Peso mexicano' },
                        { value: 'USD', label: 'USD — Dólar' },
                        { value: 'COP', label: 'COP — Peso colombiano' },
                        { value: 'GTQ', label: 'GTQ — Quetzal' },
                      ]}
                      value={form.currencyCode || ''}
                      onChange={(v) => set({ currencyCode: v || undefined })}
                      allLabel="Cualquier moneda"
                    />
                  </div>
                )}
              </div>

              {/* Vigencia */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Vigente desde</Label>
                  <Input
                    type="date"
                    value={form.validFrom || ''}
                    onChange={(e) => set({ validFrom: e.target.value || undefined })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Vigente hasta (vacío = sin límite)</Label>
                  <Input
                    type="date"
                    value={form.validUntil || ''}
                    onChange={(e) => set({ validUntil: e.target.value || undefined })}
                  />
                </div>
              </div>

              {/* Límites */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Límite total de usos (vacío = ilimitado)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.usageLimit ?? ''}
                    onChange={(e) =>
                      set({
                        usageLimit: e.target.value
                          ? parseInt(e.target.value, 10)
                          : undefined,
                      })
                    }
                    placeholder="Ilimitado"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Límite por cliente (vacío = ilimitado)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.usageLimitPerCustomer ?? ''}
                    onChange={(e) =>
                      set({
                        usageLimitPerCustomer: e.target.value
                          ? parseInt(e.target.value, 10)
                          : undefined,
                      })
                    }
                    placeholder="Ilimitado"
                  />
                </div>
              </div>

              {/* Personalización */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Nº de cliente (cupón personalizado)</Label>
                  <Input
                    value={form.customerNumber || ''}
                    onChange={(e) =>
                      set({ customerNumber: e.target.value || undefined })
                    }
                    placeholder="Vacío = cualquier cliente"
                  />
                  <p className="text-xs text-gray-400">
                    Si lo capturas, SOLO ese cliente podrá usar el cupón.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>País (opcional)</Label>
                  <SearchableSelect
                    options={countries}
                    value={form.countryId || ''}
                    onChange={(v) => set({ countryId: v || undefined })}
                    allLabel="Todos los países"
                  />
                </div>
              </div>

              {/* Dónde aplica: canal, empleados, sucursales (mig 108) */}
              <div className="grid gap-4 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
                <p className="text-sm font-semibold text-gray-700">Dónde aplica</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Canal</Label>
                    <SearchableSelect
                      options={[
                        { value: 'all', label: 'POS y Tienda en línea' },
                        { value: 'pos', label: 'Solo Punto de Venta' },
                        { value: 'ecommerce', label: 'Solo Tienda en línea' },
                      ]}
                      // Empleados fuerza 'pos' solo VISUALMENTE (y el server
                      // lo aplica): el canal elegido no se pierde al apagar
                      // el switch.
                      value={form.employeeOnly ? 'pos' : form.allowedChannel || 'all'}
                      onChange={(v) =>
                        set({ allowedChannel: (v || 'all') as CouponChannel })
                      }
                      showAllOption={false}
                      disabled={form.employeeOnly}
                    />
                    {form.employeeOnly && (
                      <p className="text-xs text-gray-400">
                        Cupón de empleados: canal fijo Solo POS.
                      </p>
                    )}
                  </div>
                  <div className="grid content-start gap-2">
                    <Label>Descuento para empleados</Label>
                    <label className="flex cursor-pointer items-center gap-2 pt-1.5">
                      <Switch
                        checked={form.employeeOnly ?? false}
                        onCheckedChange={(v) => set({ employeeOnly: v })}
                      />
                      <span className="text-sm text-gray-700">
                        Solo empleados (lo aplica el cajero en mostrador)
                      </span>
                    </label>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Sucursales (vacío = todas)</Label>
                  <SearchableSelect
                    options={(branchesData ?? [])
                      .filter((b) => !(form.branchIds ?? []).includes(b.id))
                      .map((b) => ({ value: b.id, label: b.name }))}
                    value=""
                    onChange={(v) => {
                      if (!v) return;
                      set({ branchIds: [...(form.branchIds ?? []), v] });
                    }}
                    placeholder="Agregar sucursal…"
                    showAllOption={false}
                  />
                  {(form.branchIds ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(form.branchIds ?? []).map((id) => (
                        <Badge
                          key={id}
                          variant="outline"
                          className="gap-1 border-[#a7c1e2] bg-[#C8DDF2]/30 text-[#2f5165]"
                        >
                          {branchNameById.get(id) ?? id}
                          <button
                            type="button"
                            className="ml-0.5 text-[#2f5165]/60 hover:text-red-600"
                            onClick={() =>
                              set({
                                branchIds: (form.branchIds ?? []).filter(
                                  (x) => x !== id,
                                ),
                              })
                            }
                            title="Quitar sucursal"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400">
                    Sin sucursales seleccionadas, el cupón aplica en todas.
                  </p>
                </div>
              </div>

              {/* Switches */}
              <div className="flex flex-wrap gap-6 pt-1">
                <label className="flex cursor-pointer items-center gap-2">
                  <Switch
                    checked={form.isActive ?? true}
                    onCheckedChange={(v) => set({ isActive: v })}
                  />
                  <span className="text-sm text-gray-700">Activo</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <Switch
                    checked={form.isStackable ?? false}
                    onCheckedChange={(v) => set({ isStackable: v })}
                  />
                  <span className="text-sm text-gray-700">
                    Combinable con otros descuentos
                  </span>
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Guardando…'
                  : editingId
                    ? 'Guardar cambios'
                    : 'Crear cupón'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  accent = 'text-[#3E667D]',
}: {
  icon: typeof TicketIcon;
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-1 flex items-center gap-2 text-gray-500">
          <Icon className={`h-4 w-4 ${accent}`} />
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
        </div>
        <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function CouponRow({
  coupon: c,
  onEdit,
  onDuplicate,
  onToggle,
  onDelete,
}: {
  coupon: Coupon;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const status = couponStatus(c);
  const { label: typeLabel, Icon: TypeIcon } = TYPE_UI[c.discountType];
  const usagePct =
    c.usageLimit && c.usageLimit > 0
      ? Math.min(100, Math.round((c.usageCount / c.usageLimit) * 100))
      : null;

  const valueLabel =
    c.discountType === 'percentage'
      ? `${c.discountValue}%`
      : c.discountType === 'fixed_amount'
        ? `$${c.discountValue.toFixed(2)}${c.currencyCode ? ` ${c.currencyCode}` : ''}`
        : 'Envío gratis';

  return (
    <div className="flex flex-col gap-3 p-4 transition-colors hover:bg-gray-50/60 sm:flex-row sm:items-center">
      {/* Código + badges */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-[#3E667D]/5 px-2.5 py-1 font-mono text-sm font-bold text-[#3E667D] ring-1 ring-[#3E667D]/10">
            {c.code}
          </span>
          <Badge variant="outline" className={STATUS_UI[status].cls}>
            {STATUS_UI[status].label}
          </Badge>
          {c.isStackable && (
            <Badge
              variant="outline"
              className="border-violet-200 bg-violet-50 text-violet-700"
            >
              Combinable
            </Badge>
          )}
          {c.customerNumber && (
            <Badge
              variant="outline"
              className="border-[#a7c1e2] bg-[#C8DDF2]/30 text-[#2f5165]"
            >
              Personal · #{c.customerNumber}
            </Badge>
          )}
          {c.countryName && (
            <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-600">
              {c.countryName}
            </Badge>
          )}
          {(c.allowedChannel ?? 'all') !== 'all' && (
            <Badge variant="outline" className={CHANNEL_UI[c.allowedChannel].cls}>
              {CHANNEL_UI[c.allowedChannel].label}
            </Badge>
          )}
          {c.employeeOnly && (
            <Badge
              variant="outline"
              className="border-teal-200 bg-teal-50 text-teal-700"
            >
              Empleados
            </Badge>
          )}
          {(c.branches ?? []).length > 0 && (
            <Badge
              variant="outline"
              className="border-gray-200 bg-gray-50 text-gray-600"
              title={(c.branches ?? []).map((b) => b.name).join(', ')}
            >
              {c.branches.length === 1
                ? c.branches[0].name
                : `${c.branches.length} sucursales`}
            </Badge>
          )}
        </div>
        {c.description && (
          <p className="mt-1 line-clamp-1 text-sm text-gray-500">{c.description}</p>
        )}
        {c.customerName && (
          <p className="mt-0.5 text-xs text-gray-400">Cliente: {c.customerName}</p>
        )}
      </div>

      {/* Tipo + valor */}
      <div className="flex items-center gap-2 sm:w-44">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#C8DDF2]/30 text-[#3E667D]">
          <TypeIcon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-bold text-gray-900">{valueLabel}</p>
          <p className="text-xs text-gray-400">
            {typeLabel}
            {c.minPurchaseAmount ? ` · mín $${c.minPurchaseAmount}` : ''}
          </p>
        </div>
      </div>

      {/* Uso */}
      <div className="sm:w-36">
        <p className="text-sm font-medium text-gray-700">
          {c.usageCount.toLocaleString()}
          {c.usageLimit ? ` / ${c.usageLimit.toLocaleString()}` : ''}
          <span className="ml-1 text-xs font-normal text-gray-400">usos</span>
        </p>
        {usagePct !== null && (
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#a7c1e2] to-[#3E667D]"
              style={{ width: `${usagePct}%` }}
            />
          </div>
        )}
      </div>

      {/* Vigencia */}
      <div className="text-sm text-gray-500 sm:w-32">
        <p>{c.validFrom}</p>
        <p className="text-xs text-gray-400">{c.validUntil || 'Sin límite'}</p>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1">
        <button
          onClick={onEdit}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-[#C8DDF2]/20 hover:text-[#3E667D]"
          title="Editar"
        >
          <PencilIcon className="h-4 w-4" />
        </button>
        <button
          onClick={onDuplicate}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-[#C8DDF2]/20 hover:text-[#3E667D]"
          title="Duplicar"
        >
          <DocumentDuplicateIcon className="h-4 w-4" />
        </button>
        <button
          onClick={onToggle}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
          title={c.isActive ? 'Desactivar' : 'Activar'}
        >
          {c.isActive ? (
            <PauseCircleIcon className="h-4 w-4" />
          ) : (
            <CheckCircleIcon className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
          title="Eliminar"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
