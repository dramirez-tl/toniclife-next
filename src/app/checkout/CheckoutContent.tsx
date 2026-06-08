// app/checkout/CheckoutContent.tsx - Checkout client component
// Extracted from page.tsx to allow Suspense boundary for useSearchParams
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircleIcon,
  TruckIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
  UserIcon,
  BuildingStorefrontIcon,
  MapPinIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  useCart,
  useCheckoutSummary,
  useGuestCheckout,
  useAuthenticatedCheckout,
  useCustomerAddresses,
  usePickupBranches,
} from '@/hooks/useCart';
import { useReferralCode } from '@/hooks/useReferralCode';
import { cartService } from '@/services/cart.service';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/slices/authSlice';
import {
  PaymentMethod,
  ShippingMethod,
  type CheckoutAddress,
  type InvoiceData,
  type GuestCheckoutInput,
  type AuthenticatedCheckoutInput,
  type CheckoutResponse,
} from '@/types/cart';

function CheckoutProductImage({ src, name }: { src?: string; name: string }) {
  const [error, setError] = useState(false);
  const initials = (() => {
    const words = name.split(/\s+/).filter(w => w.length > 0);
    return words.length >= 2
      ? (words[0][0] + words[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  })();

  if (src && !error) {
    return (
      <img
        src={src}
        alt={name}
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
    );
  }

  return (
    <div className="w-full h-full bg-gradient-to-br from-[#C8DDF2]/30 to-[#3E667D]/20 flex items-center justify-center">
      <span className="text-sm font-bold text-[#3E667D]/70">{initials}</span>
    </div>
  );
}

type CheckoutStep = 'info' | 'shipping' | 'payment' | 'confirmation';

// Mexican states
const MEXICAN_STATES = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
  'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México',
  'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit',
  'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
  'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas',
];

export default function CheckoutContent() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('info');
  const currentUser = useAppSelector(selectUser);
  const isAuthenticated = !!currentUser;
  // Modo de entrega: envío a domicilio (default) o recoger en sucursal.
  const [deliveryMode, setDeliveryMode] = useState<'delivery' | 'pickup'>(
    'delivery',
  );
  const [pickupBranchId, setPickupBranchId] = useState<string>('');
  const [orderResult, setOrderResult] = useState<{
    orderId: string;
    orderNumber: string;
    total: string;
  } | null>(null);

  // Form data states
  const [customerInfo, setCustomerInfo] = useState({
    email: '',
    name: '',
    phone: '',
  });

  const [shippingAddress, setShippingAddress] = useState<CheckoutAddress>({
    fullName: '',
    phone: '',
    street: '',
    exteriorNumber: '',
    interiorNumber: '',
    neighborhood: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'México',
    references: '',
  });

  const [selectedShippingMethod, setSelectedShippingMethod] = useState<ShippingMethod>(ShippingMethod.STANDARD);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(PaymentMethod.STRIPE);
  const [requiresInvoice, setRequiresInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    rfc: '',
    name: '',
    regime: '',
    useCfdi: 'G03',
    postalCode: '',
    email: '',
  });
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [notes, setNotes] = useState('');
  const [referralCode, setReferralCode] = useState('');

  // API hooks
  const { data: cart, isLoading: cartLoading } = useCart();
  const { data: checkoutSummary, isLoading: summaryLoading } = useCheckoutSummary(
    selectedShippingMethod,
    shippingAddress.postalCode,
  );
  const guestCheckout = useGuestCheckout();
  const authenticatedCheckout = useAuthenticatedCheckout();
  const { data: savedAddresses } = useCustomerAddresses();
  const { data: pickupBranches } = usePickupBranches();

  // Referral code from URL or localStorage
  const { referralCode: storedReferralCode } = useReferralCode();

  // Pre-fill referral code from stored value (captured from URL)
  useEffect(() => {
    if (storedReferralCode && !referralCode) {
      setReferralCode(storedReferralCode);
    }
  }, [storedReferralCode, referralCode]);

  // Pre-llenar datos de contacto del usuario autenticado (no los reescribe).
  useEffect(() => {
    if (!currentUser) return;
    const fullName = [currentUser.firstName, currentUser.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    setCustomerInfo((prev) => ({
      email: prev.email || currentUser.email || '',
      name: prev.name || fullName,
      phone: prev.phone || currentUser.phone || '',
    }));
  }, [currentUser]);

  // Check if cart is empty
  useEffect(() => {
    if (!cartLoading && (!cart || cart.items.length === 0)) {
      router.push('/carrito');
    }
  }, [cart, cartLoading, router]);

  const steps = [
    { id: 'info', name: 'Datos', icon: UserIcon },
    { id: 'shipping', name: 'Envío', icon: TruckIcon },
    { id: 'payment', name: 'Pago', icon: CreditCardIcon },
    { id: 'confirmation', name: 'Confirmar', icon: CheckCircleIcon },
  ];

  const getStepIndex = (step: CheckoutStep) => {
    return steps.findIndex(s => s.id === step);
  };

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerInfo.email || !customerInfo.name || !customerInfo.phone) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    // El código de referido es OPCIONAL: no bloquea el checkout.

    // Pre-fill shipping address name and phone
    if (!shippingAddress.fullName) {
      setShippingAddress(prev => ({
        ...prev,
        fullName: customerInfo.name,
        phone: customerInfo.phone,
      }));
    }

    setCurrentStep('shipping');
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (deliveryMode === 'pickup') {
      if (!pickupBranchId) {
        toast.error('Selecciona una sucursal para recoger tu pedido');
        return;
      }
      setCurrentStep('payment');
      toast.success('Sucursal de recolección seleccionada');
      return;
    }

    const requiredFields: (keyof CheckoutAddress)[] = [
      'fullName', 'phone', 'street', 'city', 'state', 'postalCode', 'country',
    ];
    const missingFields = requiredFields.filter(field => !shippingAddress[field]);

    if (missingFields.length > 0) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setCurrentStep('payment');
    toast.success('Información de envío guardada');
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptTerms) {
      toast.error('Debes aceptar los términos y condiciones');
      return;
    }

    try {
      const isPickup = deliveryMode === 'pickup';

      // Usuarios autenticados (distribuidores/clientes) van por el checkout
      // autenticado; los invitados por el de invitado. En recoger se manda
      // pickupBranchId; en envío, la dirección.
      let result: CheckoutResponse;
      if (isAuthenticated) {
        const authData: AuthenticatedCheckoutInput = {
          shippingAddress: isPickup ? undefined : shippingAddress,
          pickupBranchId: isPickup ? pickupBranchId : undefined,
          paymentMethod: selectedPaymentMethod,
          shippingMethod: selectedShippingMethod,
          requiresInvoice,
          invoiceData: requiresInvoice ? invoiceData : undefined,
          notes: notes || undefined,
          saveShippingAddress: !isPickup,
        };
        result = await authenticatedCheckout.mutateAsync(authData);
      } else {
        const checkoutData: GuestCheckoutInput = {
          email: customerInfo.email,
          name: customerInfo.name,
          phone: customerInfo.phone,
          shippingAddress,
          paymentMethod: selectedPaymentMethod,
          shippingMethod: selectedShippingMethod,
          requiresInvoice,
          invoiceData: requiresInvoice ? invoiceData : undefined,
          notes: notes || undefined,
          referralCode: referralCode || undefined,
          acceptTerms,
        };
        result = await guestCheckout.mutateAsync(checkoutData);
      }

      if (result.success) {
        setOrderResult({
          orderId: result.orderId,
          orderNumber: result.orderNumber,
          total: result.total,
        });
        setCurrentStep('confirmation');
        toast.success('¡Pedido creado exitosamente!');

        // If there's a real payment URL (not a placeholder), redirect
        // Placeholder URLs contain "placeholder" and won't work
        if (result.paymentUrl && !result.paymentUrl.includes('placeholder')) {
          window.location.href = result.paymentUrl;
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al procesar el pedido');
    }
  };

  // Loading state
  if (cartLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3E667D]"></div>
      </div>
    );
  }

  // El checkout requiere sesión (el pago se procesa sobre la cuenta).
  // Gate amable en vez de dejar fallar el envío del pedido.
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#C8DDF2]/40">
              <LockClosedIcon className="h-8 w-8 text-[#3E667D]" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              Inicia sesión para finalizar tu compra
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Para completar tu pedido y pagar de forma segura necesitas tu
              cuenta. Tu carrito se conserva.
            </p>
            <div className="mt-6 space-y-3">
              <Link href="/login?redirect=/checkout" className="block">
                <Button size="lg" className="w-full">
                  Iniciar sesión
                </Button>
              </Link>
              <Link href="/registro?redirect=/checkout" className="block">
                <Button variant="outline" size="lg" className="w-full">
                  Crear cuenta
                </Button>
              </Link>
              <Link
                href="/carrito"
                className="inline-block pt-1 text-sm text-gray-500 transition-colors hover:text-[#3E667D]"
              >
                Volver al carrito
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/carrito"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-[#3E667D] transition-colors mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Volver al carrito
          </Link>
          <h1 className="text-3xl font-bold text-[#3E667D]">Finalizar Compra</h1>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = getStepIndex(currentStep) > index;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-[#3E667D] text-white'
                          : isActive
                          ? 'bg-[#3E667D] text-white'
                          : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircleIcon className="h-6 w-6" />
                      ) : (
                        <StepIcon className="h-6 w-6" />
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium mt-2 ${
                        isActive || isCompleted ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {step.name}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-1 flex-1 mx-4 ${
                        isCompleted ? 'bg-[#C8DDF2]' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Info Step */}
            {currentStep === 'info' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserIcon className="h-6 w-6 text-[#3E667D]" />
                    Información de contacto
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleInfoSubmit} className="space-y-6">
                    <div className="space-y-1.5">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                        placeholder="tu@email.com"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Nombre completo *</Label>
                        <Input
                          type="text"
                          value={customerInfo.name}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                          placeholder="Juan Pérez"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Teléfono *</Label>
                        <Input
                          type="tel"
                          value={customerInfo.phone}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                          placeholder="55 1234 5678"
                          required
                        />
                      </div>
                    </div>

                    {/* Referral Code */}
                    <div className="pt-4 border-t border-gray-200">
                      <div className="space-y-1.5">
                        <Label>Código de referido (opcional)</Label>
                        <Input
                          type="text"
                          value={referralCode}
                          onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                          placeholder="CODIGO123"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Si te refirió un distribuidor, ingresa su código (opcional).
                      </p>
                    </div>

                    <Button type="submit" size="lg" className="w-full">
                      Continuar al envío
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Shipping Step */}
            {currentStep === 'shipping' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TruckIcon className="h-6 w-6 text-[#3E667D]" />
                    Dirección de envío
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleShippingSubmit} className="space-y-6">
                    {/* Selector: recoger en sucursal vs envío a domicilio */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setDeliveryMode('delivery');
                          setSelectedShippingMethod(ShippingMethod.STANDARD);
                        }}
                        className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                          deliveryMode === 'delivery'
                            ? 'border-[#a7c1e2] bg-[#C8DDF2]/10'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <TruckIcon className="h-5 w-5 flex-shrink-0 text-[#3E667D]" />
                        <div>
                          <p className="font-medium text-gray-900">Envío a domicilio</p>
                          <p className="text-xs text-gray-500">Lo enviamos a tu dirección</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeliveryMode('pickup');
                          setSelectedShippingMethod(ShippingMethod.PICKUP);
                        }}
                        className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                          deliveryMode === 'pickup'
                            ? 'border-[#a7c1e2] bg-[#C8DDF2]/10'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <BuildingStorefrontIcon className="h-5 w-5 flex-shrink-0 text-[#3E667D]" />
                        <div>
                          <p className="font-medium text-gray-900">Recoger en sucursal</p>
                          <p className="text-xs text-gray-500">En cualquier sucursal disponible</p>
                        </div>
                      </button>
                    </div>

                    {deliveryMode === 'pickup' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Sucursal de recolección *
                        </label>
                        <SearchableSelect
                          options={(pickupBranches ?? []).map((b) => ({
                            value: b.id,
                            label: `${b.name} — ${b.countryName}${b.addressCity ? ` (${b.addressCity})` : ''}`,
                          }))}
                          value={pickupBranchId}
                          onChange={setPickupBranchId}
                          showAllOption={false}
                          placeholder="Selecciona una sucursal..."
                          className="w-full"
                        />
                        {pickupBranchId &&
                          (() => {
                            const b = (pickupBranches ?? []).find(
                              (x) => x.id === pickupBranchId,
                            );
                            if (!b) return null;
                            return (
                              <div className="mt-3 flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                                <MapPinIcon className="h-4 w-4 mt-0.5 flex-shrink-0 text-[#3E667D]" />
                                <span>
                                  {[b.addressStreet, b.addressCity, b.addressState, b.countryName]
                                    .filter(Boolean)
                                    .join(', ')}
                                  {b.phone ? ` · Tel: ${b.phone}` : ''}
                                </span>
                              </div>
                            );
                          })()}
                      </div>
                    )}

                    {deliveryMode === 'delivery' && (
                      <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Nombre del destinatario *</Label>
                        <Input
                          type="text"
                          value={shippingAddress.fullName}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, fullName: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Teléfono *</Label>
                        <Input
                          type="tel"
                          value={shippingAddress.phone}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, phone: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-1.5">
                        <Label>Calle *</Label>
                        <Input
                          type="text"
                          value={shippingAddress.street}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Número ext.</Label>
                        <Input
                          type="text"
                          value={shippingAddress.exteriorNumber || ''}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, exteriorNumber: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Número interior</Label>
                        <Input
                          type="text"
                          value={shippingAddress.interiorNumber || ''}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, interiorNumber: e.target.value })}
                          placeholder="Depto, oficina, etc."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Colonia</Label>
                        <Input
                          type="text"
                          value={shippingAddress.neighborhood || ''}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, neighborhood: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label>Ciudad *</Label>
                        <Input
                          type="text"
                          value={shippingAddress.city}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Estado *
                        </label>
                        <SearchableSelect
                          options={MEXICAN_STATES.map(state => ({ value: state, label: state }))}
                          value={shippingAddress.state}
                          onChange={(val) => setShippingAddress({ ...shippingAddress, state: val })}
                          showAllOption={false}
                          placeholder="Seleccionar..."
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Código Postal *</Label>
                        <Input
                          type="text"
                          value={shippingAddress.postalCode}
                          onChange={(e) => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                          maxLength={5}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Referencias de ubicación</Label>
                      <Input
                        type="text"
                        value={shippingAddress.references || ''}
                        onChange={(e) => setShippingAddress({ ...shippingAddress, references: e.target.value })}
                        placeholder="Entre calles, color de casa, etc."
                      />
                    </div>

                    {/* Shipping Method Selection */}
                    <div className="pt-4 border-t border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Método de envío
                      </label>
                      <div className="space-y-3">
                        {checkoutSummary?.shippingOptions?.map((option) => (
                          <label
                            key={option.method}
                            className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              selectedShippingMethod === option.method
                                ? 'border-[#a7c1e2] bg-[#C8DDF2]/5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="shippingMethod"
                                value={option.method}
                                checked={selectedShippingMethod === option.method}
                                onChange={(e) => setSelectedShippingMethod(e.target.value as ShippingMethod)}
                                className="w-4 h-4 text-[#3E667D] focus:ring-[#a7c1e2]"
                              />
                              <div>
                                <p className="font-medium text-gray-900">{option.name}</p>
                                <p className="text-sm text-gray-500">{option.description}</p>
                                {option.estimatedDays > 0 && (
                                  <p className="text-xs text-gray-400">
                                    {option.estimatedDays} días hábiles
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="font-bold text-[#3E667D]">
                              {parseFloat(option.cost) === 0 ? 'Gratis' : cartService.formatCurrency(option.cost)}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                      </>
                    )}

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={() => setCurrentStep('info')}
                        className="flex-1"
                      >
                        Regresar
                      </Button>
                      <Button type="submit" size="lg" className="flex-1">
                        Continuar al pago
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Payment Step — temporarily disabled */}
            {currentStep === 'payment' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCardIcon className="h-6 w-6 text-[#3E667D]" />
                    Método de pago
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePaymentSubmit} className="space-y-6">
                    <div className="bg-[#C8DDF2]/10 border border-[#a7c1e2]/30 rounded-lg p-4 flex items-start gap-3">
                      <ShieldCheckIcon className="h-6 w-6 text-[#3E667D] flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-semibold text-[#3E667D]">Pago 100% seguro</p>
                        <p className="text-gray-600">
                          El pago con tarjeta se procesa en la pasarela segura de Stripe; tus datos
                          de tarjeta nunca pasan por nuestro sitio.
                        </p>
                      </div>
                    </div>

                    {/* Único método de pago: tarjeta vía Stripe */}
                    <div className="flex items-center gap-3 rounded-lg border-2 border-[#a7c1e2] bg-[#C8DDF2]/5 p-4">
                      <CreditCardIcon className="h-6 w-6 text-[#3E667D]" />
                      <div>
                        <p className="font-medium text-gray-900">
                          Tarjeta de Crédito/Débito
                        </p>
                        <p className="text-xs text-gray-500">
                          Pago en línea seguro vía Stripe
                        </p>
                      </div>
                    </div>

                    {/* Términos */}
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="w-5 h-5 mt-0.5 text-[#3E667D] border-gray-300 rounded focus:ring-[#a7c1e2]"
                      />
                      <span className="text-sm text-gray-600">
                        Acepto los términos y condiciones y la política de privacidad.
                      </span>
                    </label>

                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={() => setCurrentStep('shipping')}
                        className="flex-1"
                      >
                        Regresar
                      </Button>
                      <Button
                        type="submit"
                        size="lg"
                        className="flex-1"
                        disabled={
                          authenticatedCheckout.isPending || guestCheckout.isPending
                        }
                      >
                        {(authenticatedCheckout.isPending || guestCheckout.isPending) && (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        )}
                        Realizar pedido
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Confirmation Step */}
            {currentStep === 'confirmation' && orderResult && (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircleIcon className="h-12 w-12 text-white" />
                  </div>

                  <h2 className="text-3xl font-bold text-gray-900 mb-2">¡Pedido Confirmado!</h2>
                  <p className="text-lg text-gray-600 mb-6">
                    Gracias por tu compra. Tu pedido ha sido procesado exitosamente.
                  </p>

                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <p className="text-sm text-gray-600 mb-1">Número de pedido</p>
                    <p className="text-2xl font-bold text-[#3E667D]">{orderResult.orderNumber}</p>
                  </div>

                  <div className="border-t border-gray-200 pt-6 mb-6">
                    <div className="text-left space-y-3">
                      {deliveryMode === 'pickup' ? (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Recoger en:</span>
                          <span className="font-medium text-gray-900 text-right max-w-xs">
                            {(pickupBranches ?? []).find((b) => b.id === pickupBranchId)
                              ?.name ?? 'Sucursal seleccionada'}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Envío a:</span>
                            <span className="font-medium text-gray-900">
                              {shippingAddress.fullName}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Dirección:</span>
                            <span className="font-medium text-gray-900 text-right max-w-xs">
                              {shippingAddress.street} {shippingAddress.exteriorNumber}, {shippingAddress.neighborhood && `${shippingAddress.neighborhood},`} {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
                            </span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium text-gray-900">{customerInfo.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total del pedido:</span>
                        <span className="font-bold text-[#3E667D] text-lg">
                          {cartService.formatCurrency(orderResult.total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pago en línea: redirección a la pasarela segura (Stripe) */}
                  {(selectedPaymentMethod === PaymentMethod.STRIPE ||
                    selectedPaymentMethod === PaymentMethod.PAYPAL ||
                    selectedPaymentMethod === PaymentMethod.MERCADOPAGO) && (
                    <div className="bg-[#C8DDF2]/20 border border-[#a7c1e2]/40 rounded-lg p-4 mb-4 flex items-center justify-center gap-2 text-[#3E667D]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <p className="text-sm font-medium">
                        Te llevamos a la pasarela de pago segura para completar tu compra…
                      </p>
                    </div>
                  )}

                  {/* Transfer payment instructions */}
                  {selectedPaymentMethod === PaymentMethod.TRANSFER && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-gray-700">
                        <strong>Instrucciones de pago por transferencia:</strong><br />
                        Recibirás un correo con los datos bancarios para realizar tu transferencia.
                        Una vez confirmado el pago, procesaremos tu envío.
                      </p>
                    </div>
                  )}

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-gray-700">
                      <strong>¿Qué sigue?</strong><br />
                      Recibirás un email de confirmación con los detalles de tu pedido.
                      El tiempo estimado de entrega depende del método de envío seleccionado.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => router.push('/')}
                      className="flex-1"
                    >
                      Volver al inicio
                    </Button>
                    <Button
                      size="lg"
                      onClick={() => router.push('/productos')}
                      className="flex-1"
                    >
                      Seguir comprando
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Resumen del pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cart Items */}
                <div className="space-y-3">
                  {cart?.items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 relative overflow-hidden">
                        <CheckoutProductImage src={item.productImageUrl} name={item.productName} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {item.productName}
                        </p>
                        <p className="text-sm text-gray-500">Cantidad: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {cartService.formatCurrency(item.lineTotal)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-900">
                      {cart ? cartService.formatCurrency(cart.subtotal) : '-'}
                    </span>
                  </div>

                  {checkoutSummary && parseFloat(checkoutSummary.discountAmount) > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Descuento</span>
                      <span>-{cartService.formatCurrency(checkoutSummary.discountAmount)}</span>
                    </div>
                  )}

                  {checkoutSummary?.coupon && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Cupón ({checkoutSummary.coupon.code})</span>
                      <span>-{checkoutSummary.coupon.discount}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Envío</span>
                    <span className="font-medium text-gray-900">
                      {checkoutSummary
                        ? parseFloat(checkoutSummary.shippingAmount) === 0
                          ? <span className="text-[#3E667D]">¡Gratis!</span>
                          : cartService.formatCurrency(checkoutSummary.shippingAmount)
                        : 'Calculando...'
                      }
                    </span>
                  </div>

                  <div className="flex justify-between text-xs text-gray-500">
                    <span>IVA incluido en precios</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-[#3E667D]">
                      {checkoutSummary
                        ? cartService.formatCurrency(checkoutSummary.total)
                        : cartService.formatCurrency(cart?.total || '0')
                      }
                    </span>
                  </div>

                  {/* Points */}
                  {checkoutSummary && checkoutSummary.totalPoints > 0 && (
                    <p className="text-sm text-[#3E667D] mt-2 text-center">
                      +{checkoutSummary.totalPoints} puntos por esta compra
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
