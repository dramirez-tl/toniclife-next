// app/checkout/CheckoutContent.tsx - Checkout client component
// Extracted from page.tsx to allow Suspense boundary for useSearchParams
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  IdentificationIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Label } from '@/components/ui/label';
import { LinePersonalization } from '@/components/storefront/LinePersonalization';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { SavedAddressPicker, SavedAddressPickerSkeleton } from '@/components/checkout/SavedAddressPicker';
import { ShippingAddressForm, addressFieldId, useAddressFormTexts } from '@/components/checkout/ShippingAddressForm';
import {
  useCart,
  useCheckoutSummary,
  useGuestCheckout,
  useAuthenticatedCheckout,
  useCustomerAddresses,
  useDeleteCustomerAddress,
  usePickupBranches,
} from '@/hooks/useCart';
import { getReferralCode } from '@/hooks/useReferralCode';
import { usePilotPublicState } from '@/hooks/usePilot';
import { formatCurrency } from '@/lib/currency';
import { useStoreCountry } from '@/hooks/useStoreCountry';
import { useActiveCountries } from '@/hooks/useConfig';
import { useStates } from '@/hooks/useStates';
import { buyerDistributorNumber, fillContactFromBuyer } from '@/lib/checkout/buyer';
import { standardShippingInfo } from '@/lib/checkout/shipping-method';
import { isDeliveryBlocked, isHomeDeliveryUnavailable, shouldWaitForStoreCountry, storeCountryName } from '@/lib/checkout/delivery-gates';
import {
  INITIAL_SHIPPING_ADDRESS_STATE,
  activeAddressDraft,
  addressFormMode,
  buildCheckoutAddress,
  buildShippingAddressPayload,
  chooseAddress,
  clearDraftStates,
  draftAddressParts,
  editAddressDraft,
  formatAddressLine,
  pinAddressChoice,
  rejectSavedAddress,
  resolveAddressChoice,
  sameAddressChoice,
  savedAddressOptions,
  shippingAreaOf,
  stateSelectOptions,
  stateValueIsCode,
  validateAddressDraft,
  type AddressDraftError,
  type SavedAddressContext,
  type ShippingAddressState,
  type ShippingRecipient,
} from '@/lib/checkout/shipping-address';
import { cartDisplayCurrency } from '@/lib/storefront/cart-country';
import { cartKeys } from '@/lib/storefront/cart-query-keys';
import { cartSummaryMismatch } from '@/lib/storefront/cart-sync';
import { reportCheckoutCountryMismatch } from '@/lib/storefront/cart-country-dialog-store';
import { catalogErrorCode, catalogErrorMessage } from '@/lib/storefront/errors';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/slices/authSlice';
import {
  PaymentMethod,
  ShippingMethod,
  type InvoiceData,
  type GuestCheckoutInput,
  type AuthenticatedCheckoutInput,
  type CheckoutResponse,
  type SavedAddress,
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

// Nombre del país que viaja en `shippingAddress.country`. Los estados ya no son listas
// fijas: salen del catálogo del API (GET /states), ver lib/checkout/shipping-address.
const COUNTRY_NAMES: Record<string, string> = {
  MX: 'México',
  US: 'United States',
  CO: 'Colombia',
  GT: 'Guatemala',
};

export default function CheckoutContent() {
  const router = useRouter();
  const t = useTranslations('checkout');
  // País + idioma de la tienda (locale): moneda, impuesto, envío y estados.
  const { countryId, countryCode, currency, lang } = useStoreCountry();
  const fmt = (n: number | string) => formatCurrency(n, cartDisplayCurrency(cart?.currencyCode, currency), lang);
  const taxIncluded = countryCode === 'MX';
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

  // Envío a domicilio: quién recibe (editable siempre) y la dirección, que es una
  // guardada o una capturada. Qué se ofrece, qué queda elegido y qué viaja en el
  // pedido lo decide lib/checkout/shipping-address.
  const [recipient, setRecipient] = useState<ShippingRecipient>({ name: '', phone: '' });
  const [shipping, setShipping] = useState<ShippingAddressState>(INITIAL_SHIPPING_ADDRESS_STATE);
  const [addressError, setAddressError] = useState<AddressDraftError | null>(null);

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

  // API hooks. El carrito se relee SIEMPRE al entrar y al volver a la ventana: es uno
  // por cuenta y otra pestaña u otro dispositivo pudo cambiarlo (lib/storefront/cart-sync).
  const queryClient = useQueryClient();
  const { data: cart, isLoading: cartLoading, isFetching: cartFetching } = useCart({ fresh: true });

  // Direcciones guardadas del comprador y catálogo de estados del país de la tienda.
  // De ahí sale la elección VIGENTE: la que eligió el cliente o, si aún no elige, la
  // primera guardada que se puede usar tal cual (si no hay, una dirección nueva).
  const savedAddressesQuery = useCustomerAddresses();
  const deleteSavedAddress = useDeleteCustomerAddress();
  const statesQuery = useStates({ countryId, isActive: true }, { enabled: !!countryId });
  const addressCtx = useMemo<SavedAddressContext>(
    () => ({ countryCode, states: statesQuery.data, rejectedIds: shipping.rejectedIds }),
    [countryCode, statesQuery.data, shipping.rejectedIds],
  );
  const addressOptions = useMemo(
    () => savedAddressOptions(savedAddressesQuery.data, addressCtx),
    [savedAddressesQuery.data, addressCtx],
  );
  const addressChoice = useMemo(
    () => resolveAddressChoice(shipping.choice, addressOptions),
    [shipping.choice, addressOptions],
  );
  const addressDraft = useMemo(
    () => activeAddressDraft(shipping, addressChoice, addressOptions, addressCtx),
    [shipping, addressChoice, addressOptions, addressCtx],
  );
  const selectedSavedAddress =
    addressChoice.kind === 'saved'
      ? addressOptions.find((option) => option.address.id === addressChoice.id)?.address
      : undefined;
  const addressTexts = useAddressFormTexts(countryCode);
  const shippingCountry = useMemo(
    () => ({ code: countryCode, name: COUNTRY_NAMES[countryCode] || 'México' }),
    [countryCode],
  );

  // El envío y el impuesto del resumen se cotizan con el C. P. y el estado de la
  // dirección vigente. Recoger en sucursal sigue como siempre: con lo capturado.
  const shippingArea = useMemo(
    () =>
      deliveryMode === 'pickup'
        ? { postalCode: shipping.newDraft.zipCode, state: shipping.newDraft.state }
        : shippingAreaOf(addressChoice, addressOptions, addressDraft),
    [deliveryMode, shipping.newDraft, addressChoice, addressOptions, addressDraft],
  );
  const { data: checkoutSummary, isFetching: summaryFetching } = useCheckoutSummary(
    selectedShippingMethod,
    shippingArea.postalCode,
    countryId,
    shippingArea.state,
  );
  // Las líneas salen del carrito y los montos del resumen: son dos respuestas del API. Si
  // dejan de coincidir (11-nov-2026: otra sesión de la misma cuenta vació el carrito y
  // aquí se vio Subtotal $363.00 con Total $150.00), el carrito en pantalla es viejo: se
  // vuelve a pedir UNA vez por desacuerdo y, mientras llega, no se muestran montos.
  const summaryMismatch = orderResult ? null : cartSummaryMismatch(cart, checkoutSummary);
  const resyncedMismatch = useRef<string | null>(null);
  useEffect(() => {
    if (!summaryMismatch || resyncedMismatch.current === summaryMismatch) return;
    resyncedMismatch.current = summaryMismatch;
    void queryClient.invalidateQueries({ queryKey: cartKeys.cart() });
  }, [summaryMismatch, queryClient]);
  const amountsSyncing = !!summaryMismatch && (cartFetching || summaryFetching);
  // Envío estándar a domicilio (el único que se ofrece): lo que se va a cobrar y en
  // cuántos días llega, tal como lo da el resumen del API.
  const standardShipping = standardShippingInfo(checkoutSummary, selectedShippingMethod);
  const guestCheckout = useGuestCheckout();
  const authenticatedCheckout = useAuthenticatedCheckout();
  const { data: pickupBranches } = usePickupBranches();
  // Piloto: compras del checkout gateadas globalmente desde /admin/sistema.
  const { data: pilotState } = usePilotPublicState();
  const checkoutEnabled = pilotState?.checkoutEnabled ?? false;

  // Rutas de surtido (solo interfaz; no cambia montos ni el cuerpo del pedido):
  //  · si el API dice que ningún almacén envía a este país, "Envío a domicilio" se
  //    deshabilita (recoger en sucursal sigue igual). Campo ausente = como siempre.
  //  · mientras la lista de países CARGA (misma consulta que useStoreCountry, con su
  //    único reintento) pagar espera; si FALLÓ se paga sin countryId, como hoy.
  const { isLoading: countriesLoading } = useActiveCountries();
  const homeDeliveryUnavailable = isHomeDeliveryUnavailable(checkoutSummary);
  const deliveryBlocked = isDeliveryBlocked(deliveryMode, checkoutSummary);
  // Un invitado no manda countryId en su pedido: no tiene nada que esperar.
  const waitingForCountry = shouldWaitForStoreCountry({ countryId, isLoading: isAuthenticated && countriesLoading });
  const homeDeliveryUnavailableText = t('deliveryHomeUnavailable', {
    country: storeCountryName(countryCode, lang),
  });

  // Mientras cargan las guardadas (y, donde el estado viaja como código, su catálogo)
  // aún no se sabe qué dirección queda elegida: va un esqueleto, no el formulario.
  const addressBookLoading =
    savedAddressesQuery.isLoading ||
    (stateValueIsCode(countryCode) && (countriesLoading || statesQuery.isLoading));

  // Quién compra (resumen del API). A un distribuidor se le muestra su número: la
  // compra y sus puntos se registran a su cuenta. Ya no se pide código de referido a
  // nadie. No depende del código postal: se recuerda mientras el resumen se recotiza.
  const summaryDistributorNumber = buyerDistributorNumber(checkoutSummary);
  const [distributorNumber, setDistributorNumber] = useState<string | null>(null);
  if (checkoutSummary && summaryDistributorNumber !== distributorNumber) {
    setDistributorNumber(summaryDistributorNumber);
  }

  // Pre-llenar datos de contacto del usuario autenticado (no los reescribe). Se
  // ajusta al renderizar cuando cambia el usuario en sesión, no en un efecto.
  const [contactUser, setContactUser] = useState<typeof currentUser>(null);
  if (currentUser && contactUser !== currentUser) {
    setContactUser(currentUser);
    const fullName = [currentUser.firstName, currentUser.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    setCustomerInfo((prev) => ({
      email: prev.email || currentUser.email || '',
      name: prev.name || fullName,
      phone: prev.phone || currentUser.phone || '',
    }));
  }

  // Lo que siga vacío se completa UNA vez con la ficha del comprador que manda el
  // resumen (un distribuidor suele tener el teléfono en su ficha y no en su usuario).
  const buyerName = checkoutSummary?.buyer?.name ?? null;
  const buyerPhone = checkoutSummary?.buyer?.phone ?? null;
  const [buyerContactApplied, setBuyerContactApplied] = useState(false);
  if (!buyerContactApplied && (buyerName || buyerPhone)) {
    setBuyerContactApplied(true);
    setCustomerInfo((prev) => fillContactFromBuyer(prev, { name: buyerName, phone: buyerPhone }));
  }

  // Check if cart is empty. Con el pedido ya creado el carrito queda vacío (se convirtió
  // en pedido): ahí no se regresa al carrito, se muestra la confirmación.
  useEffect(() => {
    if (orderResult) return;
    if (!cartLoading && (!cart || cart.items.length === 0)) {
      router.push('/carrito');
    }
  }, [cart, cartLoading, router, orderResult]);

  // Si cambia el país de la tienda se limpia el estado capturado (un estado MX no
  // aplica a US y viceversa). El país de la dirección sale siempre de `shippingCountry`.
  const [draftsCountry, setDraftsCountry] = useState(countryCode);
  if (draftsCountry !== countryCode) {
    setDraftsCountry(countryCode);
    setShipping((state) => clearDraftStates(state));
  }

  const steps = [
    { id: 'info', name: t('steps.info'), icon: UserIcon },
    { id: 'shipping', name: t('steps.shipping'), icon: TruckIcon },
    { id: 'payment', name: t('steps.payment'), icon: CreditCardIcon },
    { id: 'confirmation', name: t('steps.confirm'), icon: CheckCircleIcon },
  ];

  const getStepIndex = (step: CheckoutStep) => {
    return steps.findIndex(s => s.id === step);
  };

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerInfo.email || !customerInfo.name || !customerInfo.phone) {
      toast.error(t('toasts.fillRequired'));
      return;
    }

    // Quién recibe: por defecto quien compra (se puede cambiar en el siguiente paso).
    if (!recipient.name) {
      setRecipient({ name: customerInfo.name, phone: customerInfo.phone });
    }

    setCurrentStep('shipping');
  };

  // Eliminar una dirección guardada (ya confirmado en el diálogo). Si era la elegida,
  // la elección vuelve sola a la siguiente guardada o a una dirección nueva.
  const handleDeleteAddress = async (address: SavedAddress) => {
    try {
      await deleteSavedAddress.mutateAsync(address.id);
      toast.success(t('addressBook.deleted'));
    } catch (error) {
      toast.error(catalogErrorMessage(error, t('addressBook.deleteError'), { useApiMessage: lang === 'es' }));
    }
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (deliveryMode === 'pickup') {
      if (!pickupBranchId) {
        toast.error(t('toasts.selectPickup'));
        return;
      }
      setCurrentStep('payment');
      toast.success(t('toasts.pickupSelected'));
      return;
    }

    if (deliveryBlocked) {
      toast.error(homeDeliveryUnavailableText);
      return;
    }

    // Las guardadas aún cargan: todavía no hay dirección que validar.
    if (addressBookLoading) return;

    if (!recipient.name.trim() || !recipient.phone) {
      toast.error(t('toasts.fillRequired'));
      return;
    }

    // Una guardada que se puede usar ya está completa; una nueva (o una guardada por
    // completar) se revisa con los campos y el formato de código postal del país.
    if (addressChoice.kind !== 'saved') {
      const problem = validateAddressDraft(countryCode, addressDraft, addressFormMode(addressChoice));
      if (problem) {
        setAddressError(problem);
        toast.error(addressTexts.errorText(problem));
        document.getElementById(addressFieldId(problem.field))?.focus();
        return;
      }
    }

    // Se fija la dirección con la que el cliente continúa: si la lista de guardadas
    // cambia después, no se cambia sola por otra.
    setShipping((state) => pinAddressChoice(state, addressChoice, addressOptions, addressCtx));
    setAddressError(null);
    setCurrentStep('payment');
    toast.success(t('toasts.shippingSaved'));
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Piloto: compras bloqueadas globalmente (el server también lo valida).
    if (!checkoutEnabled) {
      toast.error(t('pilot.blocked'));
      return;
    }

    if (!acceptTerms) {
      toast.error(t('toasts.mustAcceptTerms'));
      return;
    }

    // Sin almacén que envíe a este país no se paga con envío a domicilio.
    if (deliveryBlocked) {
      toast.error(homeDeliveryUnavailableText);
      return;
    }
    // El país de la tienda aún está cargando: el botón ya espera; esto cubre el Enter.
    if (waitingForCountry) return;

    const isPickup = deliveryMode === 'pickup';

    // Envío a domicilio: la dirección debe ser la MISMA con la que se continuó en
    // "Envío". Si la guardada ya no está (se eliminó en otra pestaña), dejó de poder
    // usarse o a lo capturado le falta algo, se regresa a ese paso en vez de pagar
    // con otra dirección.
    if (!isPickup) {
      const addressProblem =
        addressChoice.kind === 'saved'
          ? null
          : validateAddressDraft(countryCode, addressDraft, addressFormMode(addressChoice));
      if (
        addressBookLoading ||
        !sameAddressChoice(shipping.choice, addressChoice) ||
        addressProblem ||
        !recipient.name.trim() ||
        !recipient.phone
      ) {
        setAddressError(addressProblem);
        setCurrentStep('shipping');
        toast.error(t('toasts.reviewAddress'));
        return;
      }
    }

    try {
      // Usuarios autenticados (distribuidores/clientes) van por el checkout
      // autenticado; los invitados por el de invitado. En recoger se manda
      // pickupBranchId; en envío, la dirección: una guardada (su id + quién recibe)
      // o una nueva (con la casilla "guardar para mis próximas compras").
      let result: CheckoutResponse;
      if (isAuthenticated) {
        const authData: AuthenticatedCheckoutInput = {
          countryId,
          ...(isPickup
            ? { pickupBranchId, saveShippingAddress: false }
            : buildShippingAddressPayload({
                choice: addressChoice,
                draft: addressDraft,
                recipient,
                country: shippingCountry,
                saveAddress: shipping.saveAddress,
              })),
          paymentMethod: selectedPaymentMethod,
          shippingMethod: selectedShippingMethod,
          requiresInvoice,
          invoiceData: requiresInvoice ? invoiceData : undefined,
          notes: notes || undefined,
        };
        result = await authenticatedCheckout.mutateAsync(authData);
      } else {
        const checkoutData: GuestCheckoutInput = {
          email: customerInfo.email,
          name: customerInfo.name,
          phone: customerInfo.phone,
          shippingAddress: buildCheckoutAddress(addressDraft, recipient, shippingCountry),
          paymentMethod: selectedPaymentMethod,
          shippingMethod: selectedShippingMethod,
          requiresInvoice,
          invoiceData: requiresInvoice ? invoiceData : undefined,
          notes: notes || undefined,
          // Al público no se le pide código: solo viaja el del enlace con el que llegó
          // a la tienda (ReferralCodeCapture), si lo hay.
          referralCode: getReferralCode() || undefined,
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
        toast.success(t('toasts.orderCreated'));

        // If there's a real payment URL (not a placeholder), redirect
        // Placeholder URLs contain "placeholder" and won't work
        if (result.paymentUrl && !result.paymentUrl.includes('placeholder')) {
          window.location.href = result.paymentUrl;
        }
      }
    } catch (error: unknown) {
      // 409 CHK_COUNTRY_MISMATCH (C2): el API no creó el pedido; aviso con enlace al carrito y a su tienda.
      if (reportCheckoutCountryMismatch(error)) return;
      // 422 CHK_ADDRESS_NOT_USABLE: el API no aceptó la dirección guardada (es de otro
      // país o le faltan datos). No se creó el pedido: se regresa a "Envío" con esa
      // dirección abierta en el formulario para completarla; ya no se ofrece tal cual.
      if (catalogErrorCode(error) === 'CHK_ADDRESS_NOT_USABLE' && addressChoice.kind === 'saved') {
        const rejectedId = addressChoice.id;
        setShipping((state) => rejectSavedAddress(state, rejectedId));
        setCurrentStep('shipping');
      }
      const apiMessage = (error as { response?: { data?: { message?: string | string[] } } } | null)?.response
        ?.data?.message;
      toast.error(apiMessage || t('toasts.orderError'));
    }
  };

  // Loading state. También mientras se regresa al carrito porque quedó vacío (p. ej. lo
  // vació otra sesión de la misma cuenta): no se pinta un resumen sin productos.
  if (cartLoading || (!orderResult && cart?.items.length === 0)) {
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
              {t('authTitle')}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {t('authBody')}
            </p>
            <div className="mt-6 space-y-3">
              <Link href="/login?redirect=/checkout" className="block">
                <Button size="lg" className="w-full">
                  {t('signIn')}
                </Button>
              </Link>
              <Link href="/registro?redirect=/checkout" className="block">
                <Button variant="outline" size="lg" className="w-full">
                  {t('createAccount')}
                </Button>
              </Link>
              <Link
                href="/carrito"
                className="inline-block pt-1 text-sm text-gray-500 transition-colors hover:text-[#3E667D]"
              >
                {t('backToCart')}
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
            {t('backToCart')}
          </Link>
          <h1 className="text-3xl font-bold text-[#3E667D]">{t('title')}</h1>
        </div>

        {/* Piloto: aviso de compras deshabilitadas (el botón de pagar
            también queda apagado; el server rechaza igualmente). */}
        {!checkoutEnabled && (
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-800">
              {t('pilot.bannerTitle')}
            </p>
            <p className="text-sm text-amber-700">{t('pilot.bannerBody')}</p>
          </div>
        )}

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
                    {t('contactTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleInfoSubmit} className="space-y-6">
                    <div className="space-y-1.5">
                      <Label>{t('email')}</Label>
                      <Input
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                        placeholder={t('emailPlaceholder')}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>{t('fullName')}</Label>
                        <Input
                          type="text"
                          value={customerInfo.name}
                          onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                          placeholder={t('fullNamePlaceholder')}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t('phone')}</Label>
                        <PhoneInput
                          value={customerInfo.phone}
                          onChange={(v) => setCustomerInfo({ ...customerInfo, phone: v })}
                        />
                      </div>
                    </div>

                    {/* Distribuidor: su número, solo lectura. La compra y sus puntos se
                        registran a su cuenta; al público en general no se le muestra nada
                        (ya no se pide código de referido). */}
                    {distributorNumber && (
                      <div className="pt-4 border-t border-gray-200">
                        <div className="flex items-start gap-3 rounded-lg border border-[#a7c1e2]/30 bg-[#C8DDF2]/10 p-4">
                          <IdentificationIcon className="h-6 w-6 flex-shrink-0 text-[#3E667D]" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-700">{t('distributor.label')}</p>
                            <p className="font-mono text-lg font-semibold text-[#3E667D]">{distributorNumber}</p>
                            <p className="mt-1 text-xs text-gray-500">{t('distributor.note')}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <Button type="submit" size="lg" className="w-full">
                      {t('continueToShipping')}
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
                    {t('shippingTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleShippingSubmit} className="space-y-6">
                    {/* Selector: recoger en sucursal vs envío a domicilio */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={homeDeliveryUnavailable}
                        onClick={() => {
                          setDeliveryMode('delivery');
                          setSelectedShippingMethod(ShippingMethod.STANDARD);
                        }}
                        className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-70 ${
                          deliveryMode === 'delivery' && !homeDeliveryUnavailable
                            ? 'border-[#a7c1e2] bg-[#C8DDF2]/10'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <TruckIcon className="h-5 w-5 flex-shrink-0 text-[#3E667D]" />
                        <div>
                          <p className="font-medium text-gray-900">{t('deliveryHome')}</p>
                          <p className={`text-xs ${homeDeliveryUnavailable ? 'text-gray-700' : 'text-gray-500'}`}>
                            {homeDeliveryUnavailable ? homeDeliveryUnavailableText : t('deliveryHomeDesc')}
                          </p>
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
                          <p className="font-medium text-gray-900">{t('deliveryPickup')}</p>
                          <p className="text-xs text-gray-500">{t('deliveryPickupDesc')}</p>
                        </div>
                      </button>
                    </div>

                    {deliveryMode === 'pickup' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('pickupBranch')}
                        </label>
                        <SearchableSelect
                          options={(pickupBranches ?? []).map((b) => ({
                            value: b.id,
                            label: `${b.name} — ${b.countryName}${b.addressCity ? ` (${b.addressCity})` : ''}`,
                          }))}
                          value={pickupBranchId}
                          onChange={setPickupBranchId}
                          showAllOption={false}
                          placeholder={t('pickupPlaceholder')}
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

                    {deliveryMode === 'delivery' && !homeDeliveryUnavailable && (
                      <>
                    {/* Quién recibe: se puede cambiar siempre, también con una dirección guardada */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="checkout-recipient-name">{t('recipientName')}</Label>
                        <Input
                          id="checkout-recipient-name"
                          type="text"
                          value={recipient.name}
                          onChange={(e) => setRecipient({ ...recipient, name: e.target.value })}
                          maxLength={200}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>{t('phone')}</Label>
                        <PhoneInput
                          value={recipient.phone}
                          onChange={(v) => setRecipient((current) => ({ ...current, phone: v }))}
                        />
                      </div>
                    </div>

                    {/* Dirección: una guardada o una nueva (lib/checkout/shipping-address) */}
                    {addressBookLoading ? (
                      <SavedAddressPickerSkeleton />
                    ) : (
                      <>
                        {addressOptions.length > 0 && (
                          <SavedAddressPicker
                            options={addressOptions}
                            choice={addressChoice}
                            onChoose={(choice) => {
                              setShipping((state) => chooseAddress(state, choice));
                              setAddressError(null);
                            }}
                            onDelete={handleDeleteAddress}
                            deletingId={deleteSavedAddress.isPending ? deleteSavedAddress.variables : null}
                          />
                        )}
                        {addressChoice.kind !== 'saved' && (
                          <div
                            className={
                              addressOptions.length > 0
                                ? 'rounded-lg border border-gray-200 bg-gray-50/60 p-4'
                                : undefined
                            }
                          >
                            <ShippingAddressForm
                              countryCode={countryCode}
                              mode={addressFormMode(addressChoice)}
                              draft={addressDraft}
                              onChange={(patch) => {
                                setShipping((state) =>
                                  editAddressDraft(state, addressChoice, patch, addressOptions, addressCtx),
                                );
                                setAddressError(null);
                              }}
                              stateOptions={stateSelectOptions(statesQuery.data, countryCode, addressDraft.state)}
                              statesLoading={statesQuery.isLoading || (!countryId && countriesLoading)}
                              error={addressError}
                              saveAddress={shipping.saveAddress}
                              onSaveAddressChange={(save) => setShipping((state) => ({ ...state, saveAddress: save }))}
                              title={
                                addressOptions.length === 0
                                  ? undefined
                                  : addressChoice.kind === 'complete'
                                    ? t('addressForm.completeTitle')
                                    : t('addressForm.newTitle')
                              }
                              hint={addressChoice.kind === 'complete' ? t('addressForm.completeHint') : undefined}
                            />
                          </div>
                        )}
                      </>
                    )}

                    {/* Método de envío. El único envío a domicilio es el ESTÁNDAR: el exprés
                        se dejó de ofrecer (11-nov-2026) y recoger en sucursal se elige arriba.
                        No hay nada que escoger, así que se informa, con el costo que se va a
                        cobrar (el del resumen: ya trae el envío gratis por monto o por cupón). */}
                    <div className="pt-4 border-t border-gray-200">
                      <p className="block text-sm font-medium text-gray-700 mb-3">{t('shippingMethod')}</p>
                      <div className="flex items-center justify-between gap-3 rounded-lg border-2 border-[#a7c1e2] bg-[#C8DDF2]/5 p-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <TruckIcon className="h-5 w-5 flex-shrink-0 text-[#3E667D]" />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900">{t('standardShipping')}</p>
                            {standardShipping.days > 0 && (
                              <p className="text-xs text-gray-500">{t('businessDays', { days: standardShipping.days })}</p>
                            )}
                          </div>
                        </div>
                        <span className="flex-shrink-0 font-bold text-[#3E667D]">
                          {standardShipping.cost === null
                            ? '…'
                            : standardShipping.cost === 0
                              ? t('free')
                              : fmt(standardShipping.cost)}
                        </span>
                      </div>
                    </div>
                      </>
                    )}

                    {/* Notas del pedido: personalización (nombre a estampar) y otras indicaciones.
                        Viajan en orders.observation y Almacén las ve en la entrega (30-oct-2026). */}
                    <div className="pt-4 border-t border-gray-200">
                      <Label htmlFor="checkout-notes">{t('notesLabel')}</Label>
                      <Textarea
                        id="checkout-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                        maxLength={500}
                        rows={3}
                        placeholder={t('notesPlaceholder')}
                        className="mt-1"
                      />
                      <p className="mt-1 text-xs text-gray-500">{t('notesHint')}</p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        onClick={() => setCurrentStep('info')}
                        className="flex-1"
                      >
                        {t('back')}
                      </Button>
                      <Button
                        type="submit"
                        size="lg"
                        className="flex-1"
                        disabled={deliveryBlocked || (deliveryMode === 'delivery' && addressBookLoading)}
                      >
                        {t('continueToPayment')}
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
                    {t('paymentTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePaymentSubmit} className="space-y-6">
                    <div className="bg-[#C8DDF2]/10 border border-[#a7c1e2]/30 rounded-lg p-4 flex items-start gap-3">
                      <ShieldCheckIcon className="h-6 w-6 text-[#3E667D] flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-semibold text-[#3E667D]">{t('securePayment')}</p>
                        <p className="text-gray-600">
                          {t('stripeNote')}
                        </p>
                      </div>
                    </div>

                    {/* Único método de pago: tarjeta vía Stripe */}
                    <div className="flex items-center gap-3 rounded-lg border-2 border-[#a7c1e2] bg-[#C8DDF2]/5 p-4">
                      <CreditCardIcon className="h-6 w-6 text-[#3E667D]" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {t('card')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t('cardDesc')}
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
                        {t('acceptTerms')}
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
                        {t('back')}
                      </Button>
                      <Button
                        type="submit"
                        size="lg"
                        className="flex-1"
                        disabled={
                          !checkoutEnabled ||
                          deliveryBlocked ||
                          waitingForCountry ||
                          authenticatedCheckout.isPending ||
                          guestCheckout.isPending
                        }
                        title={
                          !checkoutEnabled
                            ? t('pilot.blocked')
                            : deliveryBlocked
                              ? homeDeliveryUnavailableText
                              : undefined
                        }
                      >
                        {(authenticatedCheckout.isPending || guestCheckout.isPending) && (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        )}
                        {t('placeOrder')}
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

                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('confirmedTitle')}</h2>
                  <p className="text-lg text-gray-600 mb-6">
                    {t('confirmedBody')}
                  </p>

                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <p className="text-sm text-gray-600 mb-1">{t('orderNumber')}</p>
                    <p className="text-2xl font-bold text-[#3E667D]">{orderResult.orderNumber}</p>
                  </div>

                  <div className="border-t border-gray-200 pt-6 mb-6">
                    <div className="text-left space-y-3">
                      {deliveryMode === 'pickup' ? (
                        <div className="flex justify-between">
                          <span className="text-gray-600">{t('pickupAt')}</span>
                          <span className="font-medium text-gray-900 text-right max-w-xs">
                            {(pickupBranches ?? []).find((b) => b.id === pickupBranchId)
                              ?.name ?? t('selectedBranch')}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t('shipTo')}</span>
                            <span className="font-medium text-gray-900">
                              {recipient.name}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">{t('address')}</span>
                            <span className="font-medium text-gray-900 text-right max-w-xs">
                              {formatAddressLine(selectedSavedAddress ?? draftAddressParts(addressDraft))}
                            </span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('email')}</span>
                        <span className="font-medium text-gray-900">{customerInfo.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('orderTotal')}</span>
                        <span className="font-bold text-[#3E667D] text-lg">
                          {fmt(orderResult.total)}
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
                        {t('redirecting')}
                      </p>
                    </div>
                  )}

                  {/* Transfer payment instructions */}
                  {selectedPaymentMethod === PaymentMethod.TRANSFER && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-gray-700">
                        <strong>{t('transferTitle')}</strong><br />
                        {t('transferBody')}
                      </p>
                    </div>
                  )}

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-gray-700">
                      <strong>{t('whatsNext')}</strong><br />
                      {t('whatsNextBody')}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => router.push('/')}
                      className="flex-1"
                    >
                      {t('backHome')}
                    </Button>
                    <Button
                      size="lg"
                      onClick={() => router.push('/productos')}
                      className="flex-1"
                    >
                      {t('keepShopping')}
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
                <CardTitle>{t('summaryTitle')}</CardTitle>
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
                        <LinePersonalization text={item.personalization} />
                        <p className="text-sm text-gray-500">{t('qty', { count: item.quantity })}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {fmt(item.lineTotal)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('subtotal')}</span>
                    <span className="font-medium text-gray-900">
                      {/* Mismo origen que el total: el resumen del API (el carrito solo mientras llega). */}
                      {amountsSyncing
                        ? t('calculating')
                        : checkoutSummary
                          ? fmt(checkoutSummary.subtotal)
                          : cart ? fmt(cart.subtotal) : '-'}
                    </span>
                  </div>

                  {checkoutSummary?.seasonalDiscountAmount && parseFloat(checkoutSummary.seasonalDiscountAmount) > 0 && (
                    <div className="flex justify-between text-sm text-emerald-700">
                      <span>{t('seasonalSavings')}</span>
                      <span>{fmt(checkoutSummary.seasonalDiscountAmount)}</span>
                    </div>
                  )}

                  {checkoutSummary && parseFloat(checkoutSummary.discountAmount) > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>{t('discount')}</span>
                      <span>-{fmt(checkoutSummary.discountAmount)}</span>
                    </div>
                  )}

                  {checkoutSummary?.coupon && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>{t('coupon', { code: checkoutSummary.coupon.code })}</span>
                      <span>-{checkoutSummary.coupon.discount}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('shipping')}</span>
                    <span className="font-medium text-gray-900">
                      {checkoutSummary
                        ? parseFloat(checkoutSummary.shippingAmount) === 0
                          ? <span className="text-[#3E667D]">{t('freeExcl')}</span>
                          : fmt(checkoutSummary.shippingAmount)
                        : t('calculating')
                      }
                    </span>
                  </div>

                  {taxIncluded ? (
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{t('taxIncluded')}</span>
                    </div>
                  ) : (
                    checkoutSummary &&
                    parseFloat(checkoutSummary.taxAmount) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t('tax')}</span>
                        <span className="font-medium text-gray-900">
                          {fmt(checkoutSummary.taxAmount)}
                        </span>
                      </div>
                    )
                  )}
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-gray-900">{t('total')}</span>
                    <span className="text-2xl font-bold text-[#3E667D]">
                      {amountsSyncing
                        ? t('calculating')
                        : checkoutSummary
                          ? fmt(checkoutSummary.total)
                          : fmt(cart?.total || '0')
                      }
                    </span>
                  </div>

                  {/* Points */}
                  {checkoutSummary && checkoutSummary.totalPoints > 0 && (
                    <p className="text-sm text-[#3E667D] mt-2 text-center">
                      {t('earnPoints', { points: checkoutSummary.totalPoints })}
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
