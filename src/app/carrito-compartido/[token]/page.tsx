'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Loader2 } from 'lucide-react';
import {
  ShoppingBagIcon,
  TruckIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import {
  useSharedCartByToken,
  useSharedCartCheckout,
} from '@/hooks/useSharedCart';
import { usePickupBranches } from '@/hooks/useCart';
import { usePilotPublicState } from '@/hooks/usePilot';
import type { SharedCartDeliveryMethod } from '@/services/sharedCart.service';

export default function CarritoCompartidoPage() {
  const params = useParams();
  const token = (params?.token as string) || '';

  const { data: cart, isLoading, isError } = useSharedCartByToken(token);
  const checkoutMutation = useSharedCartCheckout(token);
  const { data: pickupBranches = [] } = usePickupBranches();
  // Piloto: compras bloqueadas globalmente (el server también rechaza).
  const { data: pilotState } = usePilotPublicState();
  const checkoutEnabled = pilotState?.checkoutEnabled ?? false;

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [method, setMethod] = useState<SharedCartDeliveryMethod>('pickup');
  const [pickupBranchId, setPickupBranchId] = useState('');
  const [addr, setAddr] = useState({
    street: '',
    exteriorNumber: '',
    interiorNumber: '',
    neighborhood: '',
    city: '',
    state: '',
    postalCode: '',
    references: '',
  });

  const currency = cart?.currencyCode || 'MXN';
  const fmt = (n: number) =>
    n.toLocaleString(currency === 'USD' ? 'en-US' : 'es-MX', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    });

  const shipping = useMemo(() => {
    if (!cart) return 0;
    if (method === 'pickup') return 0;
    return cart.subtotal >= 1500 ? 0 : 150;
  }, [cart, method]);

  const total = (cart?.subtotal || 0) + shipping;

  const branchOptions = useMemo(
    () =>
      pickupBranches.map((b) => ({
        value: b.id,
        label: `${b.name}${b.addressCity ? ` · ${b.addressCity}` : ''}`,
      })),
    [pickupBranches],
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!checkoutEnabled) {
      toast.error(
        'Las compras en línea estarán disponibles muy pronto. Gracias por tu paciencia.',
      );
      return;
    }
    if (!clientName.trim() || !clientEmail.trim()) {
      toast.error('Captura tu nombre y correo');
      return;
    }
    if (method === 'pickup' && !pickupBranchId) {
      toast.error('Selecciona una sucursal para recoger');
      return;
    }
    if (method === 'delivery' && (!addr.street || !addr.city || !addr.postalCode)) {
      toast.error('Completa tu dirección de envío');
      return;
    }
    try {
      const res = await checkoutMutation.mutateAsync({
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        clientPhone: clientPhone.trim() || undefined,
        deliveryMethod: method,
        pickupBranchId: method === 'pickup' ? pickupBranchId : undefined,
        address: method === 'delivery' ? addr : undefined,
      });
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl;
      } else {
        toast.success('Orden creada. Te contactaremos para el pago.');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'No se pudo procesar el pago';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  if (isLoading) {
    return (
      <Centered>
        <Loader2 className="h-8 w-8 animate-spin text-[#3E667D]" />
      </Centered>
    );
  }

  if (isError || !cart) {
    return (
      <Centered>
        <Notice
          icon={<ExclamationTriangleIcon className="h-10 w-10 text-amber-500" />}
          title="Carrito no disponible"
          text="Este link no es válido o el carrito ya no existe."
        />
      </Centered>
    );
  }

  const alreadyProcessed =
    cart.status === 'ordered' ||
    cart.status === 'paid' ||
    cart.orderStatus === 'confirmed';

  if (cart.status === 'cancelled') {
    return (
      <Centered>
        <Notice
          icon={<ExclamationTriangleIcon className="h-10 w-10 text-gray-400" />}
          title="Carrito cancelado"
          text="Quien te compartió este carrito lo canceló. Pídele uno nuevo."
        />
      </Centered>
    );
  }

  if (cart.isExpired || cart.status === 'expired') {
    return (
      <Centered>
        <Notice
          icon={<ExclamationTriangleIcon className="h-10 w-10 text-amber-500" />}
          title="El link expiró"
          text="Este carrito ya venció. Pide a tu distribuidor que te comparta uno nuevo."
        />
      </Centered>
    );
  }

  if (alreadyProcessed) {
    return (
      <Centered>
        <Notice
          icon={<CheckCircleIcon className="h-10 w-10 text-green-500" />}
          title={
            cart.status === 'paid' || cart.orderStatus === 'confirmed'
              ? '¡Pago recibido!'
              : 'Pago en proceso'
          }
          text={
            cart.orderNumber
              ? `Tu orden ${cart.orderNumber} ya fue registrada. ¡Gracias por tu compra!`
              : 'Este carrito ya fue procesado.'
          }
        />
      </Centered>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <ShoppingBagIcon className="h-8 w-8 text-[#3E667D]" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tu pedido</h1>
            <p className="text-sm text-gray-500">
              {cart.distributorName
                ? `Compartido por ${cart.distributorName}`
                : 'Tonic Life'}
            </p>
          </div>
        </div>

        {cart.note && (
          <div className="mb-4 rounded-xl border border-[#a7c1e2]/30 bg-[#C8DDF2]/10 p-3 text-sm text-gray-700">
            {cart.note}
          </div>
        )}

        {/* Productos */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <ul className="divide-y divide-gray-100">
              {cart.items.map((it) => (
                <li key={it.productId} className="flex items-center gap-3 py-3">
                  {it.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.imageUrl}
                      alt={it.name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                      <ShoppingBagIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {it.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {it.quantity} × {fmt(it.unitPrice)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {fmt(it.lineTotal)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit}>
          {/* Datos del cliente */}
          <Card className="mb-4">
            <CardContent className="p-4 space-y-3">
              <h2 className="text-sm font-bold text-gray-900">Tus datos</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  className={inputCls}
                  placeholder="Nombre completo"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
                <input
                  type="email"
                  className={inputCls}
                  placeholder="Correo"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  required
                />
                <input
                  className={inputCls}
                  placeholder="Teléfono (opcional)"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Entrega */}
          <Card className="mb-4">
            <CardContent className="p-4 space-y-3">
              <h2 className="text-sm font-bold text-gray-900">¿Cómo lo recibes?</h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <MethodOption
                  active={method === 'pickup'}
                  onClick={() => setMethod('pickup')}
                  icon={<BuildingStorefrontIcon className="h-5 w-5" />}
                  title="Recoger en sucursal"
                  desc="Sin costo de envío"
                />
                <MethodOption
                  active={method === 'delivery'}
                  onClick={() => setMethod('delivery')}
                  icon={<TruckIcon className="h-5 w-5" />}
                  title="Envío a domicilio"
                  desc={cart.subtotal >= 1500 ? 'Envío gratis' : 'Se cobra envío'}
                />
              </div>

              {method === 'pickup' ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Sucursal
                  </label>
                  <SearchableSelect
                    options={branchOptions}
                    value={pickupBranchId}
                    onChange={setPickupBranchId}
                    placeholder="Selecciona una sucursal"
                    showAllOption={false}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    className={`${inputCls} sm:col-span-2`}
                    placeholder="Calle"
                    value={addr.street}
                    onChange={(e) => setAddr({ ...addr, street: e.target.value })}
                  />
                  <input
                    className={inputCls}
                    placeholder="No. exterior"
                    value={addr.exteriorNumber}
                    onChange={(e) =>
                      setAddr({ ...addr, exteriorNumber: e.target.value })
                    }
                  />
                  <input
                    className={inputCls}
                    placeholder="No. interior (opcional)"
                    value={addr.interiorNumber}
                    onChange={(e) =>
                      setAddr({ ...addr, interiorNumber: e.target.value })
                    }
                  />
                  <input
                    className={inputCls}
                    placeholder="Colonia"
                    value={addr.neighborhood}
                    onChange={(e) =>
                      setAddr({ ...addr, neighborhood: e.target.value })
                    }
                  />
                  <input
                    className={inputCls}
                    placeholder="Código postal"
                    value={addr.postalCode}
                    onChange={(e) =>
                      setAddr({ ...addr, postalCode: e.target.value })
                    }
                  />
                  <input
                    className={inputCls}
                    placeholder="Ciudad"
                    value={addr.city}
                    onChange={(e) => setAddr({ ...addr, city: e.target.value })}
                  />
                  <input
                    className={inputCls}
                    placeholder="Estado"
                    value={addr.state}
                    onChange={(e) => setAddr({ ...addr, state: e.target.value })}
                  />
                  <input
                    className={`${inputCls} sm:col-span-2`}
                    placeholder="Referencias (opcional)"
                    value={addr.references}
                    onChange={(e) =>
                      setAddr({ ...addr, references: e.target.value })
                    }
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Totales */}
          <Card className="mb-4">
            <CardContent className="p-4 space-y-2 text-sm">
              <Row label="Subtotal" value={fmt(cart.subtotal)} />
              <Row
                label="Envío"
                value={shipping === 0 ? 'Gratis' : fmt(shipping)}
              />
              <div className="border-t border-gray-100 pt-2">
                <Row
                  label="Total"
                  value={`${fmt(total)} ${currency}`}
                  bold
                />
              </div>
            </CardContent>
          </Card>

          {!checkoutEnabled && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-semibold">Compras en línea muy pronto</p>
              <p className="text-xs">
                Estamos afinando los últimos detalles. El pago se habilitará en
                breve; tu carrito seguirá disponible con este mismo link.
              </p>
            </div>
          )}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={!checkoutEnabled || checkoutMutation.isPending}
          >
            {checkoutMutation.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            Pagar {fmt(total)}
          </Button>
          <p className="mt-3 text-center text-xs text-gray-400">
            Pago seguro procesado por Stripe.
          </p>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#a7c1e2]';

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50 px-4">
      {children}
    </div>
  );
}

function Notice({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Card className="max-w-sm">
      <CardContent className="flex flex-col items-center p-8 text-center">
        {icon}
        <h1 className="mt-4 text-lg font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{text}</p>
      </CardContent>
    </Card>
  );
}

function MethodOption({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
        active
          ? 'border-[#3E667D] bg-[#C8DDF2]/20 ring-1 ring-[#3E667D]'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <span className={active ? 'text-[#3E667D]' : 'text-gray-400'}>{icon}</span>
      <span>
        <span className="block text-sm font-semibold text-gray-900">
          {title}
        </span>
        <span className="block text-xs text-gray-500">{desc}</span>
      </span>
    </button>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? 'font-bold text-gray-900' : 'text-gray-500'}>
        {label}
      </span>
      <span className={bold ? 'font-bold text-gray-900' : 'text-gray-700'}>
        {value}
      </span>
    </div>
  );
}
