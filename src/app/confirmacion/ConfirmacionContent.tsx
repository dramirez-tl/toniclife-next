'use client';

// Confirmación post-pago (28-oct-2026, Bloque 1). Stripe redirige aquí
// (/checkout/success → /confirmacion?orderId=…&stripe_session=cs_…) ANTES de que
// llegue el webhook que confirma el cobro, así que la página consulta el pedido
// cada 3 s mientras siga pendiente (máx. 20 veces) y luego avisa que el pago
// está en proceso. Dos caminos para leer el pedido:
//   - con sesión (distribuidor): GET /orders/my-orders/:id + su tracking;
//   - sin sesión (o si lo anterior falla): GET /checkout/confirmation/:orderId
//     ?session_id=… (público; el session_id es la llave de ESE pedido).
// Antes consultaba GET /orders/:id (permiso orders:read, solo colaboradores) y
// cualquier comprador veía 403.
// Moneda: si el pedido con sesión no trae currencyCode (OrderDto anterior al
// Bloque 1), se toma de la confirmación pública del mismo pedido (ver abajo).
// Pago en efectivo en OXXO (12-nov-2026): el pedido sigue pendiente hasta que el
// comprador paga en la tienda y OXXO avisa (siguiente día hábil). En vez de
// "estamos confirmando tu pago" se muestra su ficha, fija: cuánto, hasta cuándo,
// la referencia y el enlace a la ficha de Stripe. Solo se sigue consultando
// mientras Stripe genera la ficha (lib/checkout/payment-options).

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import confetti from 'canvas-confetti';
import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  BanknotesIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  ClockIcon,
  CreditCardIcon,
  EnvelopeIcon,
  MapPinIcon,
  PrinterIcon,
  ShareIcon,
  SparklesIcon,
  TruckIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LinePersonalization } from '@/components/storefront/LinePersonalization';
import { useAppSelector } from '@/store/hooks';
import { selectIsAuthenticated, selectIsInitialized, selectUser } from '@/store/slices/authSlice';
import { isStoreAccount, ordersPath } from '@/lib/auth-area';
import { myOrderQueryKey, useMyOrder, useMyOrderTracking } from '@/hooks/useOrders';
import { usePickupBranches } from '@/hooks/useCart';
import {
  pendingRefetchInterval,
  useCheckoutConfirmation,
  usePollingExhausted,
} from '@/hooks/useCheckoutConfirmation';
import type { Order } from '@/types/order';
import {
  confirmationSteps,
  fromGuestConfirmation,
  fromMyOrder,
  pickupStepHintKey,
  type ConfirmationOxxo,
  type ConfirmationStep,
  type ConfirmationView,
} from '@/lib/checkout/confirmation';
import { formatOxxoDeadline, formatOxxoReference, shouldPollPendingPayment } from '@/lib/checkout/payment-options';
import { formatCurrency } from '@/lib/currency';
import { apiErrorStatus } from '@/lib/api-error';
import { localeLanguage } from '@/i18n/config';

type T = ReturnType<typeof useTranslations<'checkout.confirmation'>>;

const BRAND = '#3E667D';
const BRAND_SOFT = '#C8DDF2';

/**
 * El pedido del distribuidor sigue "pendiente" hasta que el webhook de Stripe lo confirma.
 * Uno que se paga en OXXO con la ficha ya generada deja de consultarse: su pago llega
 * cuando el comprador pasa a la tienda, no en segundos.
 */
const isMyOrderPending = (order: Order | undefined) =>
  !!order && order.status === 'pending' && shouldPollPendingPayment(order);
const myOrderRefetchInterval = pendingRefetchInterval<Order>(isMyOrderPending);

function Spinner({ text }: { text: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#a7c1e2] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 text-lg">{text}</p>
      </div>
    </div>
  );
}

function Notice({
  title,
  body,
  tone = 'neutral',
  children,
}: {
  title: string;
  body: string;
  tone?: 'neutral' | 'error' | 'warning';
  children?: React.ReactNode;
}) {
  const Icon = tone === 'error' ? XCircleIcon : tone === 'warning' ? ClockIcon : CheckCircleIcon;
  const color = tone === 'error' ? 'text-red-500' : tone === 'warning' ? 'text-amber-500' : 'text-[#3E667D]';
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <Icon className={`h-12 w-12 mx-auto mb-4 ${color}`} />
          <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600 mb-6">{body}</p>
          <div className="flex flex-wrap justify-center gap-3">{children}</div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConfirmacionContent() {
  const t = useTranslations('checkout.confirmation');
  const lang = localeLanguage(useLocale());
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || searchParams.get('id') || '';
  const sessionId = searchParams.get('stripe_session') || searchParams.get('session_id') || '';

  const isInitialized = useAppSelector(selectIsInitialized);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  // "Mis pedidos" de quien compró: en su panel (distribuidor) o en la tienda (la cuenta
  // del público, que no tiene panel ni puntos; ver lib/auth-area.ts).
  const sessionUser = useAppSelector(selectUser);
  const ordersHref = ordersPath(sessionUser);
  const hasPanel = isAuthenticated && !isStoreAccount(sessionUser);

  // --- Camino 1: distribuidor con sesión (Mis pedidos) ---
  const authFlow = isInitialized && isAuthenticated && !!orderId;
  const myOrderId = authFlow ? orderId : null;
  const myOrderQ = useMyOrder(myOrderId, { refetchInterval: myOrderRefetchInterval, retry: 1 });
  const myOrder = myOrderQ.data;
  // Recibe el resultado completo para que CADA sondeo vuelva a renderizar (ver el hook).
  const myPollingExhausted = usePollingExhausted(myOrderQueryKey(myOrderId), myOrderQ, isMyOrderPending(myOrder));
  const trackingQ = useMyOrderTracking(authFlow && myOrder?.status === 'confirmed' ? orderId : null, {
    retry: 1,
  });
  const pickupBranchId = myOrder?.pickupBranchId ?? null;
  const { data: pickupBranches } = usePickupBranches(authFlow && !!pickupBranchId);
  const pickupBranch = pickupBranchId ? (pickupBranches ?? []).find((x) => x.id === pickupBranchId) : undefined;
  const pickupBranchName = pickupBranch ? [pickupBranch.code, pickupBranch.name].filter(Boolean).join(' ') : null;

  // --- Camino 2: sin sesión, o si Mis pedidos no pudo (p. ej. usuario sin cliente) ---
  const guestEnabled = isInitialized && !!orderId && !!sessionId && (!isAuthenticated || myOrderQ.isError);
  // Moneda del camino con sesión: GET /orders/my-orders/:id no traía currencyCode y
  // un distribuidor de US veía sus totales en USD formateados como MXN. Si el pedido
  // no la trae y tenemos el session_id de Stripe, se pide UNA vez (sin sondeo) la
  // confirmación pública del MISMO pedido (misma llave) solo para tomar la moneda.
  const currencyFromGuest = authFlow && !!sessionId && !!myOrder && !myOrder.currencyCode;
  const guestQ = useCheckoutConfirmation(orderId, sessionId, {
    enabled: guestEnabled || currencyFromGuest,
    pollWhilePending: guestEnabled,
  });

  const view: ConfirmationView | null = myOrder
    ? fromMyOrder(myOrder, trackingQ.data, { pickupBranchName, currencyCode: guestQ.data?.currencyCode })
    : guestQ.data
      ? fromGuestConfirmation(guestQ.data)
      : null;

  const loading =
    !isInitialized || (authFlow && myOrderQ.isLoading) || (guestEnabled && guestQ.isLoading);
  const pollingExhausted = myOrder ? myPollingExhausted : guestQ.pollingExhausted;

  // Confeti una sola vez, cuando el pedido ya está confirmado.
  const confettiFired = useRef(false);
  const confirmedNow = !!view && !view.awaitingPayment && !view.cancelled && !view.paymentFailed;
  useEffect(() => {
    if (!confirmedNow || confettiFired.current) return;
    confettiFired.current = true;
    const end = Date.now() + 3000;
    const frame = () => {
      confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0 }, colors: [BRAND, BRAND_SOFT, '#FFD700'] });
      confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 }, colors: [BRAND, BRAND_SOFT, '#FFD700'] });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [confirmedNow]);

  if (!orderId) {
    return (
      <Notice title={t('notFoundTitle')} body={t('notFoundBody')} tone="error">
        <Link href="/productos">
          <Button>{t('goToProducts')}</Button>
        </Link>
      </Notice>
    );
  }

  if (loading) return <Spinner text={t('loading')} />;

  if (!view) {
    const status = apiErrorStatus(guestQ.error) ?? apiErrorStatus(myOrderQ.error);
    const notFound = status === 404 || (!sessionId && !isAuthenticated);
    return (
      <Notice
        title={notFound ? t('notFoundTitle') : t('errorTitle')}
        body={notFound ? t('notFoundBody') : t('errorBody')}
        tone="error"
      >
        {isAuthenticated && (
          <Link href={ordersHref}>
            <Button variant="outline">{t('myOrders')}</Button>
          </Link>
        )}
        <Link href="/productos">
          <Button>{t('goToProducts')}</Button>
        </Link>
      </Notice>
    );
  }

  // Pago en efectivo en OXXO. "Venció" lo dice Stripe (pago fallido), así que se afirma que
  // no se cobró. Si solo pasó la fecha límite no se afirma: quien pagó el último día sigue
  // pendiente hasta que OXXO avisa, y decirle que no pagó lo llevaría a comprar dos veces.
  const oxxo = view.oxxo;
  if (oxxo && (oxxo.state === 'expired' || oxxo.state === 'deadline_passed')) {
    const expired = oxxo.state === 'expired';
    return (
      <Notice
        title={expired ? t('oxxo.expiredTitle') : t('oxxo.deadlinePassedTitle')}
        body={expired ? t('oxxo.expiredBody') : t('oxxo.deadlinePassedBody')}
        tone="warning"
      >
        {isAuthenticated && (
          <Link href={ordersHref}>
            <Button variant="outline">{t('myOrders')}</Button>
          </Link>
        )}
        <Link href="/productos">
          <Button>{t('goToProducts')}</Button>
        </Link>
      </Notice>
    );
  }
  // Por pagar: su ficha (o el aviso de que se está generando) en vez del "confirmando tu pago".
  if (oxxo && (oxxo.state === 'awaiting_payment' || oxxo.state === 'voucher_pending')) {
    return (
      <OxxoPaymentPanel
        view={view}
        oxxo={oxxo}
        pollingExhausted={pollingExhausted}
        t={t}
        lang={lang}
        isAuthenticated={isAuthenticated}
        ordersHref={ordersHref}
      />
    );
  }

  if (view.awaitingPayment) {
    if (pollingExhausted) {
      return (
        <Notice title={t('awaitingTitle')} body={t('awaitingTimeout')} tone="warning">
          {isAuthenticated && (
            <Link href={ordersHref}>
              <Button>{t('myOrders')}</Button>
            </Link>
          )}
          <Link href="/productos">
            <Button variant="outline">{t('goToProducts')}</Button>
          </Link>
        </Notice>
      );
    }
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 border-4 border-[#a7c1e2] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('awaitingTitle')}</h2>
            <p className="text-gray-600">{t('awaitingBody')}</p>
            <p className="mt-4 text-sm text-gray-500">
              {t('orderNumber')}: <span className="font-mono font-semibold text-gray-700">{view.orderNumber}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (view.paymentFailed) {
    return (
      <Notice title={t('failedTitle')} body={t('failedBody')} tone="error">
        <Link href="/carrito">
          <Button>{t('backToCart')}</Button>
        </Link>
        <Link href="/contacto">
          <Button variant="outline">{t('contact')}</Button>
        </Link>
      </Notice>
    );
  }

  if (view.cancelled) {
    return (
      <Notice title={t('cancelledTitle')} body={t('cancelledBody', { number: view.orderNumber })} tone="warning">
        {isAuthenticated && (
          <Link href={ordersHref}>
            <Button variant="outline">{t('myOrders')}</Button>
          </Link>
        )}
        <Link href="/productos">
          <Button>{t('goToProducts')}</Button>
        </Link>
      </Notice>
    );
  }

  return (
    <ConfirmedOrder
      view={view}
      t={t}
      lang={lang}
      isAuthenticated={isAuthenticated}
      ordersHref={ordersHref}
      hasPanel={hasPanel}
    />
  );
}

// ================================
// Pedido por pagar en OXXO
// ================================
// Página fija (el pago llega cuando el comprador pasa a la tienda): cuánto paga, hasta
// cuándo, la referencia y el enlace a su ficha de Stripe. Mientras Stripe genera la ficha
// (llega por webhook segundos después de terminar su página) se avisa y se sigue
// consultando; si tarda más que eso, se le dice dónde la va a encontrar, sin alarmar.

function OxxoPaymentPanel({
  view,
  oxxo,
  pollingExhausted,
  t,
  lang,
  isAuthenticated,
  ordersHref,
}: {
  view: ConfirmationView;
  oxxo: ConfirmationOxxo;
  /** Se dejó de consultar y la ficha aún no llega. */
  pollingExhausted: boolean;
  t: T;
  lang: 'es' | 'en';
  isAuthenticated: boolean;
  /** "Mis pedidos" de esta sesión (panel del distribuidor o tienda). */
  ordersHref: string;
}) {
  // Siempre en hora del centro de México, sea cual sea la zona del navegador.
  const deadline = formatOxxoDeadline(oxxo.expiresAt, lang);
  const reference = formatOxxoReference(oxxo.reference);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <Card className="max-w-lg w-full">
        <CardContent className="p-6 sm:p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-[#C8DDF2]/60 rounded-full flex items-center justify-center mx-auto mb-4">
              <BanknotesIcon aria-hidden="true" className="h-9 w-9 text-[#3E667D]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('oxxo.title')}</h1>
            <p className="text-gray-600">{t('oxxo.intro')}</p>
          </div>

          <dl className="mt-6 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-gray-50 text-sm">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-gray-600">{t('orderNumber')}</dt>
              <dd className="break-all text-right font-mono font-semibold text-gray-900">{view.orderNumber}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-gray-600">{t('oxxo.amount')}</dt>
              <dd className="text-right text-lg font-bold text-[#3E667D]">
                {formatCurrency(view.totals.total, view.currencyCode, lang)}
              </dd>
            </div>
          </dl>

          {deadline && (
            <p className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
              <ClockIcon aria-hidden="true" className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <span>{t('oxxo.deadline', { deadline })}</span>
            </p>
          )}

          {reference && (
            <div className="mt-4 rounded-lg border border-gray-200 p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('oxxo.reference')}</p>
              {/* Ancho para 4 grupos por renglón: los 32 dígitos quedan en dos renglones parejos. */}
              <p className="mx-auto mt-1 max-w-[15rem] break-words font-mono text-lg font-semibold text-gray-900 [word-spacing:0.2em]">
                {reference}
              </p>
              <p className="mt-2 text-xs text-gray-500">{t('oxxo.referenceHint')}</p>
            </div>
          )}

          {/* La ficha: el enlace cuando ya existe; mientras, que se está generando. El cambio se anuncia. */}
          <div aria-live="polite" className="mt-6">
            {oxxo.voucherUrl ? (
              <Button asChild size="xl" className="w-full">
                <a href={oxxo.voucherUrl} target="_blank" rel="noopener noreferrer">
                  {t('oxxo.viewVoucher')}
                  <ArrowTopRightOnSquareIcon aria-hidden="true" className="h-5 w-5" />
                  <span className="sr-only">{t('oxxo.opensNewTab')}</span>
                </a>
              </Button>
            ) : pollingExhausted ? (
              <p className="rounded-lg border border-[#a7c1e2]/60 bg-[#C8DDF2]/20 p-4 text-sm text-gray-700">
                {t('oxxo.voucherLater')}
              </p>
            ) : (
              <div className="flex items-center justify-center gap-3 rounded-lg border border-[#a7c1e2]/60 bg-[#C8DDF2]/20 p-4 text-sm font-medium text-[#3E667D]">
                <div
                  aria-hidden="true"
                  className="h-5 w-5 flex-shrink-0 animate-spin rounded-full border-2 border-[#3E667D] border-t-transparent"
                />
                <p>{t('oxxo.generating')}</p>
              </div>
            )}
          </div>

          <p className="mt-6 text-sm text-gray-600">{t('oxxo.note')}</p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {isAuthenticated && (
              <Link href={ordersHref}>
                <Button variant="outline">{t('myOrders')}</Button>
              </Link>
            )}
            <Link href="/productos">
              <Button variant="outline">{t('goToProducts')}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ================================
// Pedido confirmado
// ================================

function ConfirmedOrder({
  view,
  t,
  lang,
  isAuthenticated,
  ordersHref,
  hasPanel,
}: {
  view: ConfirmationView;
  t: T;
  lang: 'es' | 'en';
  isAuthenticated: boolean;
  /** "Mis pedidos" de esta sesión (panel del distribuidor o tienda). */
  ordersHref: string;
  /** La sesión tiene panel de distribuidor (ahí se ven los puntos). */
  hasPanel: boolean;
}) {
  const money = (n: number) => formatCurrency(n, view.currencyCode, lang);
  const steps = confirmationSteps(view);
  const pickup = view.delivery.mode === 'pickup';
  const branchLabel = view.delivery.pickupBranchName ?? t('pickupDefaultBranch');

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      void navigator.share({ title: t('title'), text: t('shareText', { number: view.orderNumber }) });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Encabezado */}
      <div className="bg-gradient-to-r from-[#C8DDF2] to-[#C8DDF2]/90 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="h-12 w-12 text-[#3E667D]" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">{t('title')}</h1>
          <p className="text-xl text-white/90 mb-2">
            {view.buyerFirstName ? t('thanksName', { name: view.buyerFirstName }) : t('thanks')}
          </p>
          <p className="text-white/80 mb-8">{t('received')}</p>
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-6 py-3">
            <span className="text-sm">{t('orderNumber')}:</span>
            <span className="font-mono font-bold text-lg">{view.orderNumber}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Acciones rápidas */}
        <div className="flex flex-wrap justify-center gap-3 mb-12 print:hidden">
          <Button variant="outline" onClick={() => window.print()}>
            <PrinterIcon className="h-5 w-5" />
            {t('print')}
          </Button>
          <Button variant="outline" onClick={handleShare}>
            <ShareIcon className="h-5 w-5" />
            {t('share')}
          </Button>
          {isAuthenticated && (
            <Link href={ordersHref}>
              <Button variant="outline">
                <TruckIcon className="h-5 w-5" />
                {t('trackCta')}
              </Button>
            </Link>
          )}
        </div>

        {/* Aviso del correo */}
        <Card className="mb-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <EnvelopeIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">{t('emailNotice.title')}</h3>
                <p className="text-sm text-blue-800">{t('emailNotice.body')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Línea de tiempo */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('whatsNext')}</h2>
            <div className="space-y-6">
              {steps.map((step) => (
                <StepRow key={step.key} step={step.key} state={step.state} view={view} t={t} lang={lang} branch={branchLabel} />
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Detalle del pedido */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-bold text-gray-900 mb-4">{t('details')}</h3>
              <div className="space-y-3 mb-6">
                {view.items.map((item) => (
                  <div key={item.key} className="flex gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-xl" aria-hidden>
                        &#128230;
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">{item.name ?? t('itemFallback')}</p>
                      <LinePersonalization text={item.personalization} />
                      <p className="text-xs text-gray-500">{t('quantity', { count: item.quantity })}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 whitespace-nowrap">{money(item.total)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 space-y-2">
                <Row label={t('subtotal')} value={money(view.totals.subtotal)} />
                <Row
                  label={t('shipping')}
                  value={
                    view.totals.shipping === 0 ? <span className="text-[#3E667D]">{t('free')}</span> : money(view.totals.shipping)
                  }
                />
                {view.totals.discount > 0 && (
                  <Row label={t('discount')} value={<span className="text-green-600">-{money(view.totals.discount)}</span>} />
                )}
                {view.totals.tax > 0 && <Row label={t('tax')} value={money(view.totals.tax)} />}
                <div className="flex justify-between text-lg font-bold border-t pt-3 mt-3">
                  <span>{t('total')}</span>
                  <span className="text-[#3E667D]">{money(view.totals.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {/* Entrega: dirección o sucursal */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  {pickup ? (
                    <BuildingStorefrontIcon className="h-5 w-5 text-[#3E667D]" />
                  ) : (
                    <MapPinIcon className="h-5 w-5 text-[#3E667D]" />
                  )}
                  {pickup ? t('pickupTitle') : t('shippingAddress')}
                </h3>
                {pickup ? (
                  <p className="text-sm text-gray-900 font-medium">{t('pickupAt', { branch: branchLabel })}</p>
                ) : view.delivery.addressLines.length > 0 ? (
                  <div className="text-sm space-y-0.5">
                    {view.delivery.addressLines.map((line, i) => (
                      <p key={i} className={i === 0 ? 'font-medium text-gray-900' : 'text-gray-600'}>
                        {line}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">{t('addressUnavailable')}</p>
                )}
                {view.fulfillment?.fulfillBranchName && !pickup && (
                  <p className="mt-3 text-xs text-gray-500">
                    {t('fulfilledBy', { branch: view.fulfillment.fulfillBranchName })}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Pago */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCardIcon className="h-5 w-5 text-[#3E667D]" />
                  {t('payment')}
                </h3>
                <p className="text-sm text-gray-900 font-medium">
                  {view.oxxo ? t('oxxo.paymentConfirmed') : t('paymentConfirmed')}
                </p>
                {view.createdAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(view.createdAt).toLocaleString(lang === 'en' ? 'en-US' : 'es-MX', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Puntos */}
        {view.points > 0 && (
          <Card className="mb-8 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <SparklesIcon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">
                    {t('pointsTitle', { points: view.points.toLocaleString(lang === 'en' ? 'en-US' : 'es-MX') })}
                  </h3>
                  <p className="text-sm text-gray-600">{t('pointsBody')}</p>
                </div>
                {hasPanel && (
                  <Link href="/distribuidor">
                    <Button variant="outline" size="sm">
                      {t('viewPoints')}
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Llamados a la acción */}
        <div className="grid md:grid-cols-2 gap-6 print:hidden">
          {isAuthenticated && (
            <Card className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-2">{t('trackTitle')}</h3>
                <p className="text-white/80 text-sm mb-4">{t('trackBody')}</p>
                <Link href={ordersHref}>
                  <Button variant="secondary" size="sm">
                    {t('trackCta')}
                    <ArrowRightIcon className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
          <Card className="bg-gradient-to-r from-[#C8DDF2] to-[#C8DDF2]/90 text-white">
            <CardContent className="p-6">
              <h3 className="font-bold text-lg mb-2">{t('shopTitle')}</h3>
              <p className="text-white/80 text-sm mb-4">{t('shopBody')}</p>
              <Link href="/productos">
                <Button variant="secondary" size="sm">
                  {t('shopCta')}
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Ayuda */}
        <Card className="mt-8 print:hidden">
          <CardContent className="p-6 text-center">
            <h3 className="font-bold text-gray-900 mb-2">{t('helpTitle')}</h3>
            <p className="text-gray-600 mb-4">{t('helpBody')}</p>
            <div className="flex gap-3 justify-center">
              <Link href="/faq">
                <Button variant="outline" size="sm">
                  {t('helpCenter')}
                </Button>
              </Link>
              <Link href="/contacto">
                <Button variant="outline" size="sm">
                  {t('contact')}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function StepRow({
  step,
  state,
  view,
  t,
  lang,
  branch,
}: {
  step: ConfirmationStep;
  state: 'done' | 'current' | 'todo';
  view: ConfirmationView;
  t: T;
  lang: 'es' | 'en';
  branch: string;
}) {
  const f = view.fulfillment;
  const dateOf = (iso: string | null | undefined) =>
    iso
      ? new Date(iso).toLocaleString(lang === 'en' ? 'en-US' : 'es-MX', {
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;
  // Fecha o dato extra bajo cada paso.
  let detail: string | null = null;
  let link: string | null = null;
  if (step === 'confirmed') detail = dateOf(view.createdAt);
  if (step === 'shipped' && f?.status !== 'pending' && f?.status !== 'ready') {
    if (f?.carrier && f.trackingNumber) detail = t('carrierAndTracking', { carrier: f.carrier, tracking: f.trackingNumber });
    else if (f?.trackingNumber) detail = t('trackingOnly', { tracking: f.trackingNumber });
    else if (f?.carrier) detail = f.carrier;
    if (f?.shippedAt && detail) detail = `${detail} · ${dateOf(f.shippedAt)}`;
    else if (f?.shippedAt) detail = dateOf(f.shippedAt);
    link = f?.trackingUrl ?? null;
  }
  if ((step === 'delivered' || step === 'pickupDelivered') && f?.deliveredAt) detail = dateOf(f.deliveredAt);

  const title = t(`steps.${step}.title` as never);
  // Recoger en sucursal: el texto del último paso sigue al avance (se le avisará cuando
  // esté listo y qué llevar → ya puede pasar por él → entregado).
  const hint =
    step === 'pickupDelivered'
      ? t(`steps.pickupDelivered.${pickupStepHintKey(state)}`, { branch })
      : t(`steps.${step}.hint` as never);
  const Icon = step === 'shipped' ? TruckIcon : step === 'pickupDelivered' ? BuildingStorefrontIcon : CheckCircleIcon;

  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0">
        {state === 'done' ? (
          <div className="w-10 h-10 bg-[#3E667D] rounded-full flex items-center justify-center ring-4 ring-[#C8DDF2]/40">
            <CheckCircleIcon className="h-6 w-6 text-white" />
          </div>
        ) : state === 'current' ? (
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
          </div>
        ) : (
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
      </div>
      <div className="flex-1 pt-1">
        <h3 className={`font-bold mb-1 ${state === 'todo' ? 'text-gray-400' : 'text-gray-900'}`}>{title}</h3>
        {detail && <p className="text-sm text-gray-600 mb-1">{detail}</p>}
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#3E667D] hover:underline mb-1"
          >
            {t('trackingLink')}
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>
        )}
        <p className={`text-sm ${state === 'todo' ? 'text-gray-500' : 'text-gray-600'}`}>{hint}</p>
      </div>
    </div>
  );
}
