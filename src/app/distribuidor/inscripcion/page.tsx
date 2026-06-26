'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  CheckCircleIcon,
  TruckIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  useEnrollmentKits,
  usePickupBranches,
  useOnboardingStatus,
} from '@/hooks/useMyOrders';
import { distributorApi } from '@/services/distributorApi';
import type {
  EnrollmentKit,
  KitShippingAddress,
} from '@/services/distributorApi';

// ===== Página =====

export default function InscripcionPage() {
  return (
    <Suspense fallback={<WizardSkeleton />}>
      <InscripcionContent />
    </Suspense>
  );
}

function InscripcionContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  // Si volvemos de Stripe (success_url trae orderId) → confirmar el pago.
  if (orderId) {
    return <ConfirmingPayment />;
  }
  return <EnrollmentWizard />;
}

// ===== Confirmación de pago (post-Stripe) =====

function ConfirmingPayment() {
  const router = useRouter();
  // Poll del estado de onboarding hasta que el webhook active la cuenta.
  const { data } = useOnboardingStatus(true, 3000);

  useEffect(() => {
    if (data && !data.needsKit) {
      toast.success('¡Pago confirmado! Tu cuenta de distribuidor está activa.');
      // Tras activar: si faltan términos, primero a aceptarlos; si no, al panel
      // (primera visita → el tutorial se muestra automáticamente).
      window.location.href = data.needsTerms
        ? '/distribuidor/terminos'
        : '/distribuidor';
    }
  }, [data]);

  return (
    <div className="mx-auto max-w-lg py-10">
      <Card className="border border-gray-200">
        <CardContent className="flex flex-col items-center px-6 py-14 text-center">
          <Loader2 className="mb-5 h-12 w-12 animate-spin text-[#3E667D]" />
          <h2 className="text-xl font-bold text-gray-900">
            Confirmando tu pago…
          </h2>
          <p className="mt-2 max-w-sm text-sm text-gray-600">
            Estamos validando tu pago con el banco. En cuanto se confirme,
            activaremos tu cuenta y te llevaremos a tu panel. No cierres esta
            ventana.
          </p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="mt-6 text-sm font-medium text-[#3E667D] hover:underline"
          >
            ¿Tarda demasiado? Actualizar
          </button>
        </CardContent>
      </Card>
    </div>
  );
}

// ===== Wizard de inscripción =====

type DeliveryMode = 'pickup' | 'shipping';

const EMPTY_ADDRESS: KitShippingAddress = {
  street: '',
  extNumber: '',
  intNumber: '',
  neighborhood: '',
  city: '',
  state: '',
  zipCode: '',
  phone: '',
  reference: '',
};

function EnrollmentWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [kitId, setKitId] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<DeliveryMode | null>(null);
  const [branchId, setBranchId] = useState('');
  const [address, setAddress] = useState<KitShippingAddress>(EMPTY_ADDRESS);
  const [paying, setPaying] = useState(false);

  const { data: kits, isLoading: kitsLoading } = useEnrollmentKits();
  const { data: branches } = usePickupBranches(delivery === 'pickup');

  const selectedKit = useMemo(
    () => kits?.find((k) => k.productId === kitId) ?? null,
    [kits, kitId],
  );

  const branchOptions = useMemo(
    () =>
      (branches ?? []).map((b) => ({
        value: b.id,
        label: [b.name, b.city].filter(Boolean).join(' — '),
      })),
    [branches],
  );

  const fmt = useMemo(
    () =>
      new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: selectedKit?.currencyCode || 'MXN',
      }),
    [selectedKit?.currencyCode],
  );

  const addressComplete =
    address.street.trim() &&
    address.city.trim() &&
    address.state.trim() &&
    address.zipCode.trim();

  const canPay =
    !!selectedKit &&
    ((delivery === 'pickup' && !!branchId) ||
      (delivery === 'shipping' && !!addressComplete));

  const handlePay = async () => {
    if (!selectedKit || !delivery) return;
    setPaying(true);
    try {
      const result = await distributorApi.paySelfKit({
        kitProductId: selectedKit.productId,
        deliveryMode: delivery,
        ...(delivery === 'pickup'
          ? { pickupBranchId: branchId }
          : { shippingAddress: address }),
      });
      if (!result.paymentUrl) {
        toast.error('No se pudo generar el enlace de pago. Intenta de nuevo.');
        setPaying(false);
        return;
      }
      // Redirige a Stripe Checkout (hosted). Al pagar, vuelve a /distribuidor/inscripcion.
      window.location.href = result.paymentUrl;
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'No se pudo iniciar el pago. Intenta de nuevo.',
      );
      setPaying(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl py-2">
      {/* Encabezado de bienvenida */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#3E667D] to-[#0A4B94] p-6 text-white shadow-lg">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-6 w-6" />
          <h1 className="text-xl font-bold sm:text-2xl">
            Activa tu negocio Tonic Life
          </h1>
        </div>
        <p className="mt-1 text-sm text-white/85">
          Elige tu kit de inscripción y cómo quieres recibirlo. Al completar el
          pago, tu cuenta de distribuidor quedará activa.
        </p>
      </div>

      {/* Pasos */}
      <Stepper step={step} />

      {/* Paso 1: elegir kit */}
      {step === 1 && (
        <div className="space-y-4">
          {kitsLoading ? (
            <KitsSkeleton />
          ) : !kits || kits.length === 0 ? (
            <Card className="border border-dashed border-gray-300">
              <CardContent className="px-6 py-12 text-center text-sm text-gray-500">
                No hay kits de inscripción disponibles para tu país en este
                momento. Contacta a tu patrocinador o a soporte.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {kits.map((kit) => (
                <KitCard
                  key={kit.productId}
                  kit={kit}
                  selected={kitId === kit.productId}
                  onSelect={() => setKitId(kit.productId)}
                />
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              size="lg"
              disabled={!kitId}
              onClick={() => setStep(2)}
            >
              Continuar
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Paso 2: entrega */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <DeliveryCard
              active={delivery === 'pickup'}
              onSelect={() => setDelivery('pickup')}
              Icon={BuildingStorefrontIcon}
              title="Recoger en sucursal"
              subtitle="Sin costo de envío. Recoge tu kit en la sucursal que elijas."
            />
            <DeliveryCard
              active={delivery === 'shipping'}
              onSelect={() => setDelivery('shipping')}
              Icon={TruckIcon}
              title="Envío a domicilio"
              subtitle="Recibe tu kit en la dirección que indiques."
            />
          </div>

          {delivery === 'pickup' && (
            <Card className="border border-gray-200">
              <CardContent className="space-y-2 p-5">
                <Label>Sucursal para recoger</Label>
                <SearchableSelect
                  options={branchOptions}
                  value={branchId}
                  onChange={setBranchId}
                  placeholder="Busca tu sucursal…"
                  showAllOption={false}
                />
              </CardContent>
            </Card>
          )}

          {delivery === 'shipping' && (
            <Card className="border border-gray-200">
              <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="Calle" required className="sm:col-span-2">
                  <Input
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  />
                </Field>
                <Field label="Número exterior">
                  <Input
                    value={address.extNumber}
                    onChange={(e) => setAddress({ ...address, extNumber: e.target.value })}
                  />
                </Field>
                <Field label="Número interior">
                  <Input
                    value={address.intNumber}
                    onChange={(e) => setAddress({ ...address, intNumber: e.target.value })}
                  />
                </Field>
                <Field label="Colonia">
                  <Input
                    value={address.neighborhood}
                    onChange={(e) =>
                      setAddress({ ...address, neighborhood: e.target.value })
                    }
                  />
                </Field>
                <Field label="Código postal" required>
                  <Input
                    value={address.zipCode}
                    onChange={(e) => setAddress({ ...address, zipCode: e.target.value })}
                  />
                </Field>
                <Field label="Ciudad / Municipio" required>
                  <Input
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  />
                </Field>
                <Field label="Estado" required>
                  <Input
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                  />
                </Field>
                <Field label="Teléfono de contacto">
                  <Input
                    value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  />
                </Field>
                <Field label="Referencias" className="sm:col-span-2">
                  <Input
                    value={address.reference}
                    onChange={(e) => setAddress({ ...address, reference: e.target.value })}
                    placeholder="Entre calles, color de fachada, etc."
                  />
                </Field>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="outline" size="lg" onClick={() => setStep(1)}>
              <ArrowLeftIcon className="h-4 w-4" />
              Atrás
            </Button>
            <Button
              size="lg"
              disabled={
                !delivery ||
                (delivery === 'pickup' && !branchId) ||
                (delivery === 'shipping' && !addressComplete)
              }
              onClick={() => setStep(3)}
            >
              Continuar
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Paso 3: resumen y pago */}
      {step === 3 && selectedKit && (
        <div className="space-y-4">
          <Card className="border border-gray-200">
            <CardContent className="p-5">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                Resumen
              </h3>
              <div className="flex items-center justify-between border-b border-gray-100 py-2">
                <span className="text-gray-700">Kit</span>
                <span className="font-medium text-gray-900">{selectedKit.name}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-100 py-2">
                <span className="text-gray-700">Entrega</span>
                <span className="font-medium text-gray-900">
                  {delivery === 'pickup'
                    ? `Recoger — ${
                        branchOptions.find((b) => b.value === branchId)?.label ??
                        'sucursal'
                      }`
                    : 'Envío a domicilio'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-700">Kit</span>
                <span className="text-gray-900">{fmt.format(selectedKit.price)}</span>
              </div>
              {delivery === 'shipping' && (
                <div className="flex items-center justify-between py-1 text-sm text-gray-500">
                  <span>Envío</span>
                  <span>Se calcula al pagar</span>
                </div>
              )}
              {selectedKit.points > 0 && (
                <p className="mt-2 text-xs font-medium text-[#3E667D]">
                  {selectedKit.points.toLocaleString('es-MX')} puntos
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
            <ShieldCheckIcon className="h-4 w-4" />
            Pago seguro con Stripe
          </div>

          <div className="flex justify-between">
            <Button variant="outline" size="lg" onClick={() => setStep(2)} disabled={paying}>
              <ArrowLeftIcon className="h-4 w-4" />
              Atrás
            </Button>
            <Button size="lg" disabled={!canPay || paying} onClick={handlePay}>
              {paying && <Loader2 className="h-4 w-4 animate-spin" />}
              {paying ? 'Redirigiendo al pago…' : 'Pagar mi kit'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Subcomponentes =====

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const labels = ['Elige tu kit', 'Entrega', 'Pago'];
  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      {labels.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = step > n;
        const active = step === n;
        return (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                active
                  ? 'bg-[#3E667D] text-white'
                  : done
                    ? 'bg-[#abc9ba] text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {done ? <CheckCircleIcon className="h-5 w-5" /> : n}
            </span>
            <span
              className={`hidden text-sm sm:inline ${
                active ? 'font-semibold text-gray-900' : 'text-gray-500'
              }`}
            >
              {label}
            </span>
            {n < 3 && <span className="mx-1 h-px w-6 bg-gray-300 sm:w-10" />}
          </div>
        );
      })}
    </div>
  );
}

function KitCard({
  kit,
  selected,
  onSelect,
}: {
  kit: EnrollmentKit;
  selected: boolean;
  onSelect: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const fmt = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: kit.currencyCode || 'MXN',
  });
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col rounded-xl border-2 p-4 text-left transition ${
        selected
          ? 'border-[#3E667D] bg-[#3E667D]/5 shadow-sm'
          : 'border-gray-200 hover:border-[#3E667D]/50'
      }`}
    >
      <div className="mb-3 flex h-32 items-center justify-center overflow-hidden rounded-lg bg-gray-50">
        {kit.imageUrl && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={kit.imageUrl}
            alt={kit.name}
            className="h-full w-auto object-contain"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <CubeIcon className="h-12 w-12 text-gray-300" />
        )}
      </div>
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-gray-900">{kit.name}</span>
        {selected && <CheckCircleIcon className="h-5 w-5 shrink-0 text-[#3E667D]" />}
      </div>
      <span className="mt-1 text-lg font-bold text-[#3E667D]">
        {fmt.format(kit.price)}
      </span>
      {kit.points > 0 && (
        <span className="text-xs text-gray-500">
          {kit.points.toLocaleString('es-MX')} puntos
        </span>
      )}
    </button>
  );
}

function DeliveryCard({
  active,
  onSelect,
  Icon,
  title,
  subtitle,
}: {
  active: boolean;
  onSelect: () => void;
  Icon: typeof TruckIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition ${
        active
          ? 'border-[#3E667D] bg-[#3E667D]/5'
          : 'border-gray-200 hover:border-[#3E667D]/50'
      }`}
    >
      <Icon className="mt-0.5 h-6 w-6 shrink-0 text-[#3E667D]" />
      <span>
        <span className="block font-semibold text-gray-900">{title}</span>
        <span className="mt-0.5 block text-sm text-gray-500">{subtitle}</span>
      </span>
    </button>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label>
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </Label>
      {children}
    </div>
  );
}

// ===== Skeletons =====

function WizardSkeleton() {
  return (
    <div className="mx-auto max-w-3xl py-2">
      <Skeleton className="mb-6 h-24 w-full rounded-2xl" />
      <KitsSkeleton />
    </div>
  );
}

function KitsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} className="h-56 w-full rounded-xl" />
      ))}
    </div>
  );
}
