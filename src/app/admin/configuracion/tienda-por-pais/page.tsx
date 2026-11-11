'use client';

// /admin/configuracion/tienda-por-pais — "Tienda en línea por país".
//
// Un solo lugar, dividido por país, para ver y configurar lo que la tienda en línea
// necesita para vender: qué almacén surte, con qué se cobra, con qué paqueterías se
// envía, cuánto cuesta el envío, qué se pide en la dirección y cuánto ha ingresado.
// "México" es UN país para el negocio: México + Frontera (la zona de precios FN).
//
// Lo que ya tiene su pantalla NO se rehace aquí: los almacenes se ven de solo lectura
// (se cambian en Almacenes y envíos) y los costos usan el mismo formulario de
// Configuración › Envíos. Lo nuevo es el catálogo de paqueterías y los ingresos.
//
// Permisos (nunca roles): entrar = fulfillment:read | fulfillment:manage (además del
// settings:read de toda Configuración); cambiar paqueterías = fulfillment:manage; ver
// ingresos = reports:read. Cada sección tolera que su consulta falle o que el servidor
// todavía no la tenga, sin tumbar a las demás.

import { Suspense, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { ChevronLeft } from 'lucide-react';
import { PermissionGuard } from '@/components/auth';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { STORE_STATUS_LABELS } from '@/components/admin/fulfillment/fulfillment-ui';
import {
  FULFILLMENT_READ_PERMISSIONS,
  useFulfillmentPermissions,
  useHasAnyPermission,
} from '@/components/admin/fulfillment/useFulfillmentPermissions';
import { useUnsavedChangesGuard } from '@/components/admin/fulfillment/useUnsavedChangesGuard';
import { useShippingSettingsForm } from '@/components/admin/shipping/useShippingSettingsForm';
import { AddressCard } from '@/components/admin/store-country/AddressCard';
import { CarriersCard } from '@/components/admin/store-country/CarriersCard';
import { OnlineRevenueCard } from '@/components/admin/store-country/OnlineRevenueCard';
import { PaymentsCard } from '@/components/admin/store-country/PaymentsCard';
import { ReadinessCard } from '@/components/admin/store-country/ReadinessCard';
import { ShippingCostsCard } from '@/components/admin/store-country/ShippingCostsCard';
import { WarehousesCard } from '@/components/admin/store-country/WarehousesCard';
import { useOnlineRevenue } from '@/components/admin/store-country/useOnlineRevenue';
import { Skeleton } from '@/components/ui/skeleton';
import { useCountries } from '@/hooks/useConfig';
import { useCarriers, useFulfillmentDiagnostics, useFulfillmentRoutes } from '@/hooks/useFulfillment';
import { usePilotPublicState } from '@/hooks/usePilot';
import { useStates } from '@/hooks/useStates';
import { useStripeAccounts } from '@/hooks/useStorePayments';
import { parseFulfillmentError } from '@/lib/fulfillment/fulfillment-error';
import type { StateCatalogInfo } from '@/lib/store-country/address-summary';
import { carriersOfCountry, carriersSummary } from '@/lib/store-country/carriers';
import { storeCountries, storeCountry, storeCountryScope } from '@/lib/store-country/countries';
import { formatMoney } from '@/lib/store-country/money';
import { onlineSalesProblem } from '@/lib/store-country/online-sales';
import {
  buildReadiness,
  readinessVerdict,
  type CarriersReadiness,
  type Loadable,
  type ShippingReadiness,
} from '@/lib/store-country/readiness';
import { shippingCostsOrigin, zoneShippingNote } from '@/lib/store-country/shipping-costs';
import { storeWarehouses, warehouseReadiness } from '@/lib/store-country/warehouses';
import type { CarriersResponse } from '@/types/fulfillment';

/** Parámetro de la URL con el país elegido (`?pais=CO`): se puede compartir el enlace. */
const COUNTRY_PARAM = 'pais';

export default function TiendaPorPaisPage() {
  return (
    <PermissionGuard permissions={[...FULFILLMENT_READ_PERMISSIONS]}>
      <Suspense fallback={<TiendaPorPaisSkeleton />}>
        <TiendaPorPaisContent />
      </Suspense>
    </PermissionGuard>
  );
}

/**
 * Cómo está el catálogo de paqueterías del país para "¿Lista para vender?": cargando
 * (undefined), sin poder consultarse (null), todavía no disponible en el servidor (404),
 * con la migración 200 pendiente o con sus paqueterías.
 */
function carriersReadiness(
  query: { isLoading: boolean; isError: boolean; error: unknown; data?: CarriersResponse },
  countryCode: string,
): Loadable<CarriersReadiness> {
  if (query.isLoading) return undefined;
  if (query.isError) return parseFulfillmentError(query.error).status === 404 ? { kind: 'unavailable' } : null;
  if (!query.data) return undefined;
  if (query.data.schemaReady === false) return { kind: 'pending_migration' };
  const summary = carriersSummary(carriersOfCountry(query.data.carriers, countryCode));
  return { kind: 'catalog', active: summary.active, defaultName: summary.defaultName };
}

function TiendaPorPaisSkeleton() {
  return (
    <Shell>
      <div className="space-y-6" aria-busy="true" aria-live="polite">
        <span className="sr-only">Cargando la tienda en línea por país…</span>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-72 w-full" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
    </Shell>
  );
}

function TiendaPorPaisContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const countryCode = storeCountry(searchParams.get(COUNTRY_PARAM)).code;
  const country = useMemo(() => storeCountry(countryCode), [countryCode]);
  const countries = useMemo(() => storeCountries(), []);
  const scope = storeCountryScope(country);

  const { canManage } = useFulfillmentPermissions();
  const canSeeReports = useHasAnyPermission(['reports:read']);

  const routesQuery = useFulfillmentRoutes();
  const diagnosticsQuery = useFulfillmentDiagnostics();
  const stripeQuery = useStripeAccounts();
  const pilotQuery = usePilotPublicState();
  const carriersQuery = useCarriers(country.code);
  const apiCountriesQuery = useCountries();
  const shippingForm = useShippingSettingsForm(country.code);
  const revenue = useOnlineRevenue(canSeeReports);
  const leaveGuard = useUnsavedChangesGuard(shippingForm.dirty);

  // País tal como lo conoce el API: de ahí salen su id (catálogo de estados) y su moneda.
  const apiCountry = apiCountriesQuery.data?.find((c) => c.code?.trim().toUpperCase() === country.code);
  const currency = apiCountry?.currencyCode?.trim().toUpperCase() || country.currency;
  const statesQuery = useStates({ countryId: apiCountry?.id, isActive: true }, { enabled: !!apiCountry?.id });

  // ── Almacenes ──
  const routesData = routesQuery.data;
  const places = useMemo(
    () => (routesData ? storeWarehouses(routesData, country) : undefined),
    [routesData, country],
  );
  const placesOrFailure = places ?? (routesQuery.isError ? null : undefined);

  // ── Costos de envío: de dónde salen los montos ──
  const diagnostics = diagnosticsQuery.data;
  const shippingSource = (code: string) =>
    diagnostics?.countries.find((c) => c.countryCode?.trim().toUpperCase() === code)?.shipping?.source ?? null;
  const shippingSettings = shippingForm.data ?? null;
  const shippingOrigin = shippingCostsOrigin({
    countryCode: country.code,
    settings: shippingSettings,
    diagnosticsSource: shippingSource(country.code),
  });
  // Se espera al diagnóstico solo cuando hace falta para saber de quién son los montos de fábrica.
  const shippingWaiting =
    shippingForm.isLoading || (shippingSettings?.hasOwnSettings !== true && diagnosticsQuery.isLoading);
  const shipping: Loadable<ShippingReadiness> = shippingWaiting
    ? undefined
    : !shippingSettings && shippingOrigin.kind === 'unknown'
      ? null
      : {
          origin: shippingOrigin,
          standardCost: shippingSettings ? formatMoney(shippingSettings.standardCost, currency) : null,
        };
  const zoneNotes = country.zones.map((zone) =>
    zoneShippingNote(
      zone.name,
      country.name,
      shippingCostsOrigin({ countryCode: zone.code, diagnosticsSource: shippingSource(zone.code) }),
    ),
  );

  // ── Paqueterías ──
  const carriers = carriersReadiness(carriersQuery, country.code);

  // ── Compras: el interruptor general (falla cerrado: sin respuesta real no se da por encendido) ──
  const purchasesEnabled: Loadable<boolean> = pilotQuery.isError
    ? null
    : pilotQuery.data && !pilotQuery.isPlaceholderData
      ? pilotQuery.data.checkoutEnabled === true
      : undefined;

  const items = buildReadiness({
    country,
    warehouses: placesOrFailure ? warehouseReadiness(placesOrFailure) : placesOrFailure,
    stripe: stripeQuery.isLoading ? undefined : (stripeQuery.data ?? null),
    shipping,
    carriers,
    purchasesEnabled,
  });
  const verdict = readinessVerdict(items, country.name);
  const itemOf = (id: string) => items.find((i) => i.id === id);

  // ── Dirección: catálogo de estados / departamentos ──
  const states: StateCatalogInfo =
    apiCountriesQuery.isLoading || (!!apiCountry?.id && statesQuery.isLoading)
      ? { kind: 'loading' }
      : !apiCountry?.id || statesQuery.isError
        ? { kind: 'error' }
        : { kind: 'list', count: statesQuery.data?.length ?? 0 };

  // ── Ingresos: se ocultan si la persona no puede ver reportes (lo decida el front o el API) ──
  const showRevenue =
    canSeeReports && !(revenue.query.isError && onlineSalesProblem(revenue.query.error) === 'forbidden');

  return (
    <Shell>
      <nav aria-label="País de la tienda" className="mb-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {countries.map((option) => {
          const selected = option.code === country.code;
          return (
            <Link
              key={option.code}
              href={`${pathname}?${COUNTRY_PARAM}=${option.code}`}
              scroll={false}
              aria-current={selected ? 'page' : undefined}
              className={`flex min-w-0 items-center gap-3 rounded-xl border px-3 py-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:px-4 ${
                selected
                  ? 'border-[#3E667D] bg-[#3E667D] text-white shadow-sm'
                  : 'border-border bg-card text-foreground hover:border-[#3E667D]/60 hover:bg-[#C8DDF2]/20'
              }`}
            >
              <span aria-hidden className="text-2xl leading-none">
                {option.flag}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{option.name}</span>
                <span className={`block truncate text-xs ${selected ? 'text-white/85' : 'text-muted-foreground'}`}>
                  {option.zones.length > 0
                    ? `Incluye ${option.zones.map((z) => z.name).join(' y ')}`
                    : STORE_STATUS_LABELS[option.published ? 'open' : 'soon']}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-6">
        <ReadinessCard countryScope={scope} items={items} verdict={verdict} />

        <div className="grid gap-6 lg:grid-cols-2">
          <WarehousesCard countryName={country.name} places={placesOrFailure} onRetry={() => routesQuery.refetch()} />
          <PaymentsCard country={country} item={itemOf('payments')} />
          <CarriersCard country={country} canManage={canManage} />
          <AddressCard country={country} states={states} />
        </div>

        <ShippingCostsCard
          country={country}
          currency={currency}
          form={shippingForm}
          item={itemOf('shipping')}
          // Los montos de fábrica del propio país se pueden confirmar tal cual; los de México
          // en otra moneda no: hay que capturar los del país.
          needsConfirm={shippingOrigin.kind === 'defaults' && !shippingOrigin.mexicoAmounts}
          zoneNotes={zoneNotes}
        />

        {showRevenue && <OnlineRevenueCard country={country} revenue={revenue} />}
      </div>

      <ConfirmDialog
        open={!!leaveGuard.pendingHref}
        onOpenChange={(open) => {
          if (!open) leaveGuard.cancel();
        }}
        title="¿Salir sin guardar?"
        description={`Tienes cambios sin guardar en los costos de envío de ${country.name}. Si sigues, se pierden.`}
        confirmLabel="Salir sin guardar"
        cancelLabel="Seguir editando"
        destructive
        onConfirm={() => leaveGuard.confirm(shippingForm.reset)}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <Link
            href="/admin/configuracion"
            className="mb-3 inline-flex items-center gap-1 rounded text-sm text-white/80 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronLeft aria-hidden className="size-4" /> Configuración
          </Link>
          <div className="mb-2 flex items-start gap-3">
            <GlobeAltIcon aria-hidden className="h-9 w-9 shrink-0" />
            <h1 className="text-2xl font-bold sm:text-4xl">Tienda en línea por país</h1>
          </div>
          <p className="max-w-3xl text-base text-white/80 sm:text-lg">
            Lo que la tienda necesita para vender en cada país, en un solo lugar: almacén, cobro, paqueterías, costos de
            envío, dirección e ingresos.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</div>
    </div>
  );
}
