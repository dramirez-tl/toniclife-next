'use client';

// /admin/configuracion/rutas-envio — "Almacenes y envíos" (contrato de rutas §7).
//
// El administrador decide qué almacén envía los pedidos de la tienda a qué
// países. Tarjetas por país con la lista ORDENADA de almacenes (el orden es la
// prioridad) + el bloque "Almacenes que envían" (vista almacén → países). Todo
// se edita sobre un borrador y se guarda de una vez, con resumen de cambios.
//
// Permisos: ver = fulfillment:read | fulfillment:manage; editar = fulfillment:manage.
// Sin la migración 144 (`schemaReady === false`) la pantalla queda en solo lectura.

import { Suspense, useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { TruckIcon } from '@heroicons/react/24/outline';
import { ChevronLeft, FlaskConical, History, Lock, RefreshCw, TriangleAlert } from 'lucide-react';
import { PermissionGuard } from '@/components/auth';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { CountryRouteCard } from '@/components/admin/fulfillment/CountryRouteCard';
import { HistorySheet } from '@/components/admin/fulfillment/HistorySheet';
import { SaveBar } from '@/components/admin/fulfillment/SaveBar';
import {
  SaveSummaryDialog,
  type GainingCountry,
  type LosingCountry,
} from '@/components/admin/fulfillment/SaveSummaryDialog';
import { ScopeNote } from '@/components/admin/fulfillment/ScopeNote';
import { SimulatorSheet } from '@/components/admin/fulfillment/SimulatorSheet';
import { SkipToSave } from '@/components/admin/fulfillment/SkipToSave';
import { StockModeSetting } from '@/components/admin/fulfillment/StockModeSetting';
import { WarehouseCountriesDialog } from '@/components/admin/fulfillment/WarehouseCountriesDialog';
import { WarehouseSummary } from '@/components/admin/fulfillment/WarehouseSummary';
import { WarningsBanner } from '@/components/admin/fulfillment/WarningsBanner';
import { storeStatus, warehouseLabel } from '@/components/admin/fulfillment/fulfillment-ui';
import {
  FULFILLMENT_READ_PERMISSIONS,
  useFulfillmentPermissions,
} from '@/components/admin/fulfillment/useFulfillmentPermissions';
import { useRouteDraft } from '@/components/admin/fulfillment/useRouteDraft';
import { useUnsavedChangesGuard } from '@/components/admin/fulfillment/useUnsavedChangesGuard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { SearchableSelectOption } from '@/components/ui/SearchableSelect';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useFulfillmentDiagnostics,
  useFulfillmentRoutes,
  useFulfillmentWarehouseOptions,
  useSaveFulfillmentRoutes,
} from '@/hooks/useFulfillment';
import {
  emptyCountriesToConfirm,
  fulfillmentErrorMessage,
  isVersionConflict,
} from '@/lib/fulfillment/fulfillment-error';
import {
  changeKey,
  countChanges,
  countriesChangingWarehouse,
  countriesGainingShipping,
  countriesLosingShipping,
  crossBlockedChangeKeys,
  describeStockModeChange,
  diffRoutes,
} from '@/lib/fulfillment/route-diff';
import { PROPAGATION_NOTE, SAVED_TOAST_TITLE, appliedNoticeMessages, routingSubtitle } from '@/lib/fulfillment/route-texts';
import {
  STRUCTURAL_WARNING_CODES,
  addRoute,
  addRouteError,
  buildDraftWarnings,
  buildRoutingContext,
  buildSavePayload,
  copyCountryRoutes,
  copyableRoutes,
  fiscalParentName,
  isCrossCountryRoute,
  mergeWarnings,
  moveRoute,
  removeRoute,
  resolveCountry,
  setRouteActive,
  setRouteNotes,
  setStockMode,
  setWarehouseCountries,
  validateDraft,
  warehousesFromDraft,
  type AddRouteError,
  type DraftWarehouse,
  type RouteDraft,
} from '@/lib/fulfillment/route-draft';
import { productsAdminService } from '@/services/products-admin.service';
import type { FulfillmentCountry, FulfillmentStockMode } from '@/types/fulfillment';

const ADD_ERROR_TEXT: Record<AddRouteError, string> = {
  duplicate: 'Ese almacén ya está en la lista de este país.',
  too_many: 'Este país ya tiene 5 almacenes, que es el máximo.',
  branch_inactive: 'Esa sucursal está desactivada. Actívala primero en Sucursales.',
};

export default function RutasEnvioPage() {
  return (
    <PermissionGuard permissions={[...FULFILLMENT_READ_PERMISSIONS]}>
      <Suspense fallback={<RutasEnvioSkeleton />}>
        <RutasEnvioContent />
      </Suspense>
    </PermissionGuard>
  );
}

function RutasEnvioSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-8 sm:px-6 lg:px-8" aria-busy="true" aria-label="Cargando almacenes y envíos">
      <Skeleton className="h-32 w-full" />
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-56 w-full" />
        ))}
      </div>
    </div>
  );
}

function RutasEnvioContent() {
  const { canManage } = useFulfillmentPermissions();
  const routesQuery = useFulfillmentRoutes();
  const data = routesQuery.data;
  const schemaReady = data?.schemaReady !== false;
  const canEdit = canManage && schemaReady;

  const diagnosticsQuery = useFulfillmentDiagnostics({ enabled: !!data });
  const optionsQuery = useFulfillmentWarehouseOptions({ enabled: canEdit });
  const save = useSaveFulfillmentRoutes();

  const { base, draft, isDirty, expectedVersion, update: updateDraft, reset } = useRouteDraft(data);

  const [announcement, setAnnouncement] = useState('');
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [dialogBranchId, setDialogBranchId] = useState<string | null>(null);
  /**
   * Países que el API pidió confirmar (409) además de los que detectó el front.
   * Valen SOLO para el borrador que se mandó: cualquier edición posterior los
   * limpia, para que el diálogo no siga siendo destructivo ni pida teclear el
   * país cuando el usuario ya corrigió el borrador.
   */
  const [serverLosing, setServerLosing] = useState<string[]>([]);
  const update = useCallback(
    (fn: (d: RouteDraft) => RouteDraft) => {
      setServerLosing([]);
      updateDraft(fn);
    },
    [updateDraft],
  );

  // Cambios sin guardar: aviso del navegador al cerrar o recargar, y pregunta
  // propia al pulsar cualquier enlace interno (sidebar, Configuración, etc.).
  const leaveGuard = useUnsavedChangesGuard(isDirty);

  const ctx = useMemo(() => (data ? buildRoutingContext(data) : null), [data]);
  const countries = useMemo(() => data?.countries ?? [], [data]);
  const countryNames = useMemo(
    () => Object.fromEntries(countries.map((c) => [c.countryCode, c.countryName])) as Record<string, string>,
    [countries],
  );
  const countryOrder = useMemo(() => countries.map((c) => c.countryCode), [countries]);

  const options = useMemo(() => optionsQuery.data ?? [], [optionsQuery.data]);
  const warehouseOptions = useMemo<SearchableSelectOption[]>(
    () =>
      [...options]
        .sort((a, b) => Number(b.suggested) - Number(a.suggested) || a.code.localeCompare(b.code, 'es', { numeric: true }))
        .map((o) => ({
          value: o.branchId,
          label: `${o.code} · ${o.name}`,
          hint: [o.countryCode ? (countryNames[o.countryCode] ?? o.countryCode) : null, o.city].filter(Boolean).join(' · '),
          group: o.suggested ? 'Sugeridos' : 'Otras sucursales',
        })),
    [options, countryNames],
  );

  const warehouses = useMemo(() => (draft ? warehousesFromDraft(draft, countryOrder) : []), [draft, countryOrder]);

  /** Almacén por id: primero los que ya están en el borrador, luego las opciones del API (todas activas). */
  const findWarehouse = (branchId: string): DraftWarehouse | null => {
    const inDraft = warehouses.find((w) => w.branchId === branchId);
    if (inDraft) return inDraft;
    const option = options.find((o) => o.branchId === branchId);
    if (!option) return null;
    return {
      branchId: option.branchId,
      branchCode: option.code,
      branchName: option.name,
      branchCountryCode: option.countryCode,
      branchCity: option.city,
      branchIsActive: true,
    };
  };

  const changes = useMemo(() => (base && draft ? diffRoutes(base.countries, draft.countries) : []), [base, draft]);
  const stockModeChanged = !!base && !!draft && base.stockMode !== draft.stockMode;
  const changeCount = isDirty ? countChanges(changes, stockModeChanged) : 0;
  const issues = useMemo(() => (draft && isDirty ? validateDraft(draft) : []), [draft, isDirty]);

  const warnings = useMemo(() => {
    if (!draft || !ctx) return [];
    return mergeWarnings(buildDraftWarnings(draft, countries, ctx), diagnosticsQuery.data, draft);
  }, [draft, ctx, countries, diagnosticsQuery.data]);

  const losing = useMemo<LosingCountry[]>(() => {
    if (!base || !draft || !ctx) return [];
    const codes = new Set([...countriesLosingShipping(base.countries, draft.countries, ctx), ...serverLosing]);
    return countries
      .filter((c) => codes.has(c.countryCode))
      .map((c) => ({
        countryCode: c.countryCode,
        countryName: c.countryName,
        sellableProducts: c.sellableProducts,
        customers: c.customers,
      }));
  }, [base, draft, ctx, countries, serverLosing]);

  const gaining = useMemo<GainingCountry[]>(() => {
    if (!base || !draft || !ctx) return [];
    return countriesGainingShipping(base.countries, draft.countries, ctx).map((g) => {
      const country = countries.find((c) => c.countryCode === g.countryCode);
      return {
        countryCode: g.countryCode,
        countryName: country?.countryName ?? g.countryCode,
        customers: country?.customers ?? 0,
        warehouseLabel: warehouseLabel(g.to),
      };
    });
  }, [base, draft, ctx, countries]);

  const legacyBranchIds = useMemo(() => {
    const ids = new Set<string>();
    const diag = diagnosticsQuery.data;
    if (!diag) return ids;
    for (const w of warehouses) {
      const allSoon = w.countryCodes.length > 0 && w.countryCodes.every((code) => storeStatus(code) === 'soon');
      if (!allSoon) continue;
      const placeholder = w.countryCodes.every((code) => {
        const dc = diag.countries.find((c) => c.countryCode === code);
        const dw = dc?.warehouses.find((x) => x.branchId === w.branchId);
        return (
          !!dc?.warnings.some((x) => x.code === 'PLACEHOLDER_STOCK' && (!x.branchId || x.branchId === w.branchId)) ||
          (!!dw && dw.placeholderRows > 0 && dw.placeholderRows * 2 >= dw.sellableWithStock)
        );
      });
      if (placeholder) ids.add(w.branchId);
    }
    return ids;
  }, [warehouses, diagnosticsQuery.data]);

  // ── Carga / error ──
  if (routesQuery.isLoading) return <RutasEnvioSkeleton />;
  if (routesQuery.isError || !data || !draft || !base || !ctx) {
    return (
      <Shell onSimulate={null} onHistory={null}>
        <Card>
          <CardContent className="space-y-3 p-6" role="alert">
            <p className="flex items-center gap-2 font-semibold text-foreground">
              <TriangleAlert aria-hidden className="size-5 text-destructive" /> No se pudo cargar la configuración
            </p>
            <p className="text-sm text-muted-foreground">
              {fulfillmentErrorMessage(routesQuery.error, 'Inténtalo de nuevo en un momento.')}
            </p>
            <Button type="button" variant="outline" className="h-10" onClick={() => void routesQuery.refetch()}>
              <RefreshCw aria-hidden /> Reintentar
            </Button>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  // ── Acciones sobre el borrador (cada una se anuncia a lectores de pantalla) ──
  const nameOf = (code: string) => countryNames[code] ?? code;
  const routeOf = (code: string, branchId: string) => (draft.countries[code] ?? []).find((r) => r.branchId === branchId);

  const handleMove = (code: string, index: number, direction: -1 | 1) => {
    const route = (draft.countries[code] ?? [])[index];
    if (!route) return;
    update((d) => moveRoute(d, code, index, direction));
    const place = index + direction + 1;
    setAnnouncement(
      `${warehouseLabel(route)} ahora está en el lugar ${place} de ${nameOf(code)}${place === 1 ? ': es el almacén principal' : ''}.`,
    );
  };

  const handleToggle = (code: string, branchId: string, isActive: boolean) => {
    const route = routeOf(code, branchId);
    update((d) => setRouteActive(d, code, branchId, isActive));
    if (route) setAnnouncement(`${warehouseLabel(route)} a ${nameOf(code)}: ${isActive ? 'activa' : 'en pausa'}.`);
  };

  const handleRemove = (code: string, branchId: string) => {
    const route = routeOf(code, branchId);
    update((d) => removeRoute(d, code, branchId));
    if (route) setAnnouncement(`Se quitó ${warehouseLabel(route)} de ${nameOf(code)}. Falta guardar.`);
  };

  const handleAdd = (code: string, branchId: string) => {
    const warehouse = findWarehouse(branchId);
    if (!warehouse) return;
    const error = addRouteError(draft, code, warehouse);
    if (error) {
      toast.error(ADD_ERROR_TEXT[error]);
      return;
    }
    update((d) => addRoute(d, code, warehouse).draft);
    const blocked = isCrossCountryRoute(warehouse, code, ctx) && ctx.crossCountry !== 'allow';
    setAnnouncement(
      `Se agregó ${warehouseLabel(warehouse)} al final de la lista de ${nameOf(code)}.${
        blocked ? ' Es un envío entre países: se puede guardar, pero todavía no surte pedidos.' : ''
      }`,
    );
    if (blocked) {
      toast.info(`${warehouseLabel(warehouse)} → ${nameOf(code)}: se puede guardar, pero todavía no surte pedidos.`, {
        description: 'Los envíos de un país a otro aún no están habilitados.',
      });
    }
  };

  const handleApplyCountries = (warehouse: DraftWarehouse, codes: string[]) => {
    const { skipped } = setWarehouseCountries(draft, warehouse, codes);
    update((d) => setWarehouseCountries(d, warehouse, codes).draft);
    setDialogBranchId(null);
    setAnnouncement(`${warehouseLabel(warehouse)}: países actualizados en el borrador. Falta guardar.`);
    for (const s of skipped) toast.error(`${nameOf(s.countryCode)}: ${ADD_ERROR_TEXT[s.error]}`);
  };

  const handleDiscard = () => {
    reset();
    setServerLosing([]);
    setDiscardOpen(false);
    setAnnouncement('Se descartaron los cambios sin guardar.');
  };

  const handleReload = () => {
    reset();
    setServerLosing([]);
    setConflictOpen(false);
    void routesQuery.refetch();
    void diagnosticsQuery.refetch();
  };

  const handleSave = (reason: string) => {
    if (!expectedVersion) return;
    const payload = buildSavePayload({
      base,
      draft,
      expectedVersion,
      confirmEmptyCountries: losing.map((c) => c.countryCode),
      reason,
    });
    save.mutate(payload, {
      onSuccess: (response) => {
        reset();
        setServerLosing([]);
        setSaveOpen(false);
        toast.success(SAVED_TOAST_TITLE, { description: PROPAGATION_NOTE });
        setAnnouncement(`${SAVED_TOAST_TITLE} ${PROPAGATION_NOTE}`);
        // La disponibilidad del catálogo sale de las rutas: se pide a Next invalidarlo ya.
        // Es una optimización que nunca lanza (sin products:read la ruta responde 403 y
        // queda el TTL); por eso el texto no promete el catálogo "en menos de un minuto".
        void productsAdminService.revalidateCatalog([]);
        for (const n of appliedNoticeMessages(response.applied, countryNames)) toast.info(n.message);
      },
      onError: (error) => {
        if (isVersionConflict(error)) {
          setSaveOpen(false);
          setConflictOpen(true);
          return;
        }
        const toConfirm = emptyCountriesToConfirm(error);
        if (toConfirm) {
          setServerLosing(toConfirm);
          toast.error('Con estos cambios un país se queda sin envío. Revisa el aviso y confírmalo.');
          return;
        }
        toast.error(fulfillmentErrorMessage(error, 'No se pudieron guardar los cambios.'));
      },
    });
  };

  // ── Datos derivados para pintar ──
  const hasRoutes = (c: FulfillmentCountry) => (draft.countries[c.countryCode] ?? []).length > 0 || c.routes.length > 0;
  const mainCountries = countries.filter((c) => c.sellableProducts > 0 || hasRoutes(c));
  const otherCountries = countries.filter((c) => !mainCountries.includes(c));
  const anyMultiple = Object.values(draft.countries).some((routes) => routes.length >= 2);
  const dialogWarehouse = dialogBranchId ? findWarehouse(dialogBranchId) : null;

  const pendingOrders = (() => {
    const out = new Map<string, { branchId: string; label: string; count: number }>();
    for (const change of changes) {
      if ((change.type !== 'removed' && change.type !== 'paused') || !change.branchId) continue;
      const count = Math.max(
        0,
        ...(diagnosticsQuery.data?.countries ?? []).flatMap((c) =>
          c.warehouses.filter((w) => w.branchId === change.branchId).map((w) => w.pendingOrders),
        ),
      );
      if (count > 0) {
        out.set(change.branchId, {
          branchId: change.branchId,
          label: `${change.branchCode ?? ''} · ${change.branchName ?? ''}`,
          count,
        });
      }
    }
    return [...out.values()];
  })();

  // Rutas hacia OTRO país fiscal con el candado puesto: quedan configuradas, pero
  // todavía no surten. El resumen lo dice en cada renglón (no "almacén principal").
  const crossBlockedKeys = crossBlockedChangeKeys(changes, draft.countries, ctx);
  const crossBlocked = changes
    .filter((c) => crossBlockedKeys.has(changeKey(c.countryCode, c.branchId)))
    .map((c) => `${c.branchCode ?? ''} · ${c.branchName ?? ''} → ${nameOf(c.countryCode)}`);

  const renderCard = (country: FulfillmentCountry) => {
    const code = country.countryCode;
    const routes = draft.countries[code] ?? [];
    const fiscal = ctx.fiscalByCountry[code];
    const parent = fiscal && fiscal !== code ? countries.find((c) => c.countryCode === fiscal) : undefined;
    // Solo se ofrece copiar lo que el API aceptaría: rutas hacia sucursales activas.
    const copyFrom =
      routes.length === 0 && parent && copyableRoutes(draft, parent.countryCode).length > 0
        ? { countryCode: parent.countryCode, countryName: parent.countryName }
        : null;
    return (
      <CountryRouteCard
        key={code}
        country={country}
        routes={routes}
        resolvedBefore={resolveCountry(base.countries[code], code, ctx) !== null}
        ctx={ctx}
        canEdit={canEdit}
        diagnostics={diagnosticsQuery.data?.countries.find((c) => c.countryCode === code) ?? null}
        warnings={warnings.filter((w) => w.countryCode === code && !STRUCTURAL_WARNING_CODES.has(w.code))}
        warehouseOptions={warehouseOptions}
        optionsError={optionsQuery.isError}
        onRetryOptions={() => void optionsQuery.refetch()}
        showSkipToSave={changeCount > 0}
        countryNames={countryNames}
        copyFrom={copyFrom}
        fiscalParentName={fiscalParentName(code, countries, ctx)}
        onMove={(index, direction) => handleMove(code, index, direction)}
        onToggleActive={(branchId, isActive) => handleToggle(code, branchId, isActive)}
        onNotesChange={(branchId, notes) => update((d) => setRouteNotes(d, code, branchId, notes))}
        onRemove={(branchId) => handleRemove(code, branchId)}
        onAddWarehouse={(branchId) => handleAdd(code, branchId)}
        onCopyFrom={() => {
          if (!copyFrom) return;
          update((d) => copyCountryRoutes(d, copyFrom.countryCode, code));
          setAnnouncement(`${country.countryName} ahora usa los mismos almacenes que ${copyFrom.countryName}. Falta guardar.`);
        }}
      />
    );
  };

  return (
    <Shell stockMode={draft.stockMode} onSimulate={() => setSimulatorOpen(true)} onHistory={() => setHistoryOpen(true)}>
      <div className={`space-y-5 ${changeCount > 0 ? 'pb-32 sm:pb-24' : ''}`}>
        <p aria-live="polite" role="status" className="sr-only">
          {announcement}
        </p>

        {changeCount > 0 && <SkipToSave />}

        {!schemaReady && (
          <Alert>
            <Lock aria-hidden />
            <AlertTitle>Por ahora solo puedes consultar</AlertTitle>
            <AlertDescription>
              Falta un paso técnico para poder cambiar esta configuración: Sistemas debe aplicar la actualización de la
              base de datos de esta pantalla (migración 144). Mientras tanto ves lo que está vigente hoy.
            </AlertDescription>
          </Alert>
        )}
        {schemaReady && !canManage && (
          <Alert>
            <Lock aria-hidden />
            <AlertTitle>Solo lectura</AlertTitle>
            <AlertDescription>Puedes ver la configuración, pero no tienes permiso para cambiarla.</AlertDescription>
          </Alert>
        )}

        {diagnosticsQuery.isError && (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden />
            <AlertTitle>No se pudieron cargar las existencias ni los avisos de datos</AlertTitle>
            <AlertDescription>
              <p>
                Puedes seguir editando, pero no ves cuántos productos tiene cada almacén ni los avisos de costos de envío e
                impuestos. {fulfillmentErrorMessage(diagnosticsQuery.error, '')}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-2 h-10 text-foreground"
                onClick={() => void diagnosticsQuery.refetch()}
                disabled={diagnosticsQuery.isFetching}
              >
                <RefreshCw aria-hidden /> Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <WarningsBanner warnings={warnings} countryNames={countryNames} isDraft={isDirty} />

        <WarehouseSummary
          warehouses={warehouses}
          countryNames={countryNames}
          legacyBranchIds={legacyBranchIds}
          canEdit={canEdit}
          warehouseOptions={warehouseOptions}
          optionsError={optionsQuery.isError}
          onRetryOptions={() => void optionsQuery.refetch()}
          onChooseCountries={setDialogBranchId}
        />

        <section aria-labelledby="titulo-paises" className="space-y-3">
          <div>
            <h2 id="titulo-paises" className="text-lg font-semibold text-foreground">
              Países
            </h2>
            <p className="text-sm text-muted-foreground">
              El primero de cada lista es el almacén principal; los demás son respaldo. Usa Subir y Bajar para cambiar el
              orden.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{mainCountries.map(renderCard)}</div>

          {otherCountries.length > 0 && (
            <details className="rounded-lg border bg-card p-4">
              <summary className="cursor-pointer rounded font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Otros países ({otherCountries.length})
                <span className="ml-1 text-sm font-normal text-muted-foreground">sin productos a la venta ni almacén</span>
              </summary>
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">{otherCountries.map(renderCard)}</div>
            </details>
          )}
        </section>

        <StockModeSetting
          value={draft.stockMode}
          expanded={anyMultiple}
          canEdit={canEdit}
          onChange={(mode) => update((d) => setStockMode(d, mode))}
        />

        <ScopeNote />
      </div>

      <SaveBar
        changeCount={changeCount}
        isSaving={save.isPending}
        blockedReason={issues[0] ? `${nameOf(issues[0].countryCode)}: ${issues[0].message}` : null}
        onDiscard={() => setDiscardOpen(true)}
        onReview={() => setSaveOpen(true)}
      />

      {saveOpen && (
        <SaveSummaryDialog
          changes={changes}
          stockModeChange={stockModeChanged ? describeStockModeChange(draft.stockMode) : null}
          countryNames={countryNames}
          losing={losing}
          switching={countriesChangingWarehouse(base.countries, draft.countries, ctx)}
          pendingOrders={pendingOrders}
          crossBlocked={crossBlocked}
          crossBlockedKeys={crossBlockedKeys}
          gaining={gaining}
          isSaving={save.isPending}
          onClose={() => setSaveOpen(false)}
          onConfirm={handleSave}
        />
      )}

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="¿Descartar los cambios?"
        description="Se pierde lo que cambiaste y la pantalla vuelve a lo que está guardado."
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
        destructive
        onConfirm={handleDiscard}
      />

      <ConfirmDialog
        open={!!leaveGuard.pendingHref}
        onOpenChange={(open) => {
          if (!open) leaveGuard.cancel();
        }}
        title="¿Salir sin guardar?"
        description="Tienes cambios sin guardar en Almacenes y envíos. Si sales ahora se pierden."
        confirmLabel="Salir sin guardar"
        cancelLabel="Seguir editando"
        destructive
        onConfirm={() => leaveGuard.confirm(reset)}
      />

      <ConfirmDialog
        open={conflictOpen}
        onOpenChange={setConflictOpen}
        title="Alguien más guardó cambios"
        description="Mientras editabas, otra persona guardó esta configuración. Recarga para ver la versión nueva; tus cambios sin guardar se descartan y los vuelves a hacer sobre ella."
        confirmLabel="Recargar"
        cancelLabel="Cerrar"
        onConfirm={handleReload}
      />

      {dialogWarehouse && (
        <WarehouseCountriesDialog
          key={dialogWarehouse.branchId}
          warehouse={dialogWarehouse}
          draft={draft}
          countries={countries}
          ctx={ctx}
          onClose={() => setDialogBranchId(null)}
          onApply={(codes) => handleApplyCountries(dialogWarehouse, codes)}
        />
      )}

      <SimulatorSheet
        open={simulatorOpen}
        onOpenChange={setSimulatorOpen}
        countries={countries}
        draft={draft}
        isDirty={isDirty}
      />
      <HistorySheet open={historyOpen} onOpenChange={setHistoryOpen} />
    </Shell>
  );
}

function Shell({
  children,
  stockMode = null,
  onSimulate,
  onHistory,
}: {
  children: React.ReactNode;
  /** Modo de varios almacenes del borrador: el subtítulo lo refleja (null = aún no cargó). */
  stockMode?: FulfillmentStockMode | null;
  onSimulate: (() => void) | null;
  onHistory: (() => void) | null;
}) {
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
            <TruckIcon aria-hidden className="h-9 w-9 shrink-0" />
            <h1 className="text-2xl font-bold sm:text-4xl">¿Desde dónde enviamos a cada país?</h1>
          </div>
          <p className="max-w-3xl text-base text-white/80 sm:text-lg">{routingSubtitle(stockMode)}</p>
          {(onSimulate || onHistory) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {onSimulate && (
                <Button type="button" variant="secondary" className="h-10" onClick={onSimulate}>
                  <FlaskConical aria-hidden /> Probar un pedido
                </Button>
              )}
              {onHistory && (
                <Button type="button" variant="secondary" className="h-10" onClick={onHistory}>
                  <History aria-hidden /> Historial
                </Button>
              )}
            </div>
          )}
          <p className="mt-3 max-w-3xl text-sm text-white/90">{PROPAGATION_NOTE}</p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</div>
    </div>
  );
}
