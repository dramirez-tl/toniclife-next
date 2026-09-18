'use client';

// /admin/facturacion/preparacion — Preparación fiscal (Fase 1 del plan de
// facturación). Lo que Contabilidad debe dejar completo ANTES de encender la
// facturación en v2: emisor, claves SAT de productos, datos fiscales de
// clientes, formas de pago y sucursales. Nada de aquí timbra.
//
// Lectura con billing:read (layout); escritura con billing:manage.

import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBillingReadiness } from '@/hooks/useBilling';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { ReadinessHeader } from '@/components/admin/billing/readiness/ReadinessHeader';
import { EmitterTab } from '@/components/admin/billing/readiness/EmitterTab';
import { ProductsTab } from '@/components/admin/billing/readiness/ProductsTab';
import { CustomersTab } from '@/components/admin/billing/readiness/CustomersTab';
import { PaymentMethodsTab } from '@/components/admin/billing/readiness/PaymentMethodsTab';
import { BranchesTab } from '@/components/admin/billing/readiness/BranchesTab';
import { useCanManageBilling } from '@/components/admin/billing/readiness/useCanManageBilling';
import {
  READINESS_TABS,
  READINESS_TAB_LABELS,
  isReadinessTab,
  type ReadinessTab,
} from '@/components/admin/billing/readiness/tabs';

export default function PreparacionFiscalPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PreparacionContent />
    </Suspense>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function PreparacionContent() {
  const filters = useQueryFilters({
    tab: 'emisor',
    missing: 'any',
    issue: 'any',
    page: '1',
    limit: '25',
  });
  const tabParam = filters.get('tab');
  const activeTab: ReadinessTab = isReadinessTab(tabParam) ? tabParam : 'emisor';
  const canManage = useCanManageBilling();

  const readiness = useBillingReadiness();

  // Al cambiar de pestaña se limpian los filtros de la anterior (comparten
  // `search`/`page`), para no arrastrar una búsqueda de productos a clientes.
  const goTo = (tab: ReadinessTab) =>
    filters.setParams({ tab, search: null, page: null, limit: null, missing: null, issue: null });

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <ClipboardDocumentCheckIcon className="mt-1 h-8 w-8 text-[#3E667D]" aria-hidden />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Preparación fiscal</h1>
            <p className="text-gray-600">
              Datos maestros que deben estar completos antes de facturar desde v2. Esta pantalla no
              timbra nada.
            </p>
            {!canManage && (
              <p className="mt-1 text-xs text-amber-700">
                Modo solo lectura: para capturar necesitas el permiso billing:manage (Contabilidad).
              </p>
            )}
          </div>
        </div>
        <Button asChild variant="secondary">
          <Link href="/admin/facturacion">
            <ArrowLeftIcon className="mr-2 h-4 w-4" />
            Volver a Facturas
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <ReadinessHeader
          data={readiness.data}
          isLoading={readiness.isLoading}
          isFetching={readiness.isFetching}
          error={readiness.error}
          onRefresh={() => void readiness.refetch()}
          onGoTo={goTo}
        />
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          if (isReadinessTab(v)) goTo(v);
        }}
      >
        <TabsList className="flex h-auto w-full flex-wrap justify-start sm:w-fit">
          {READINESS_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {READINESS_TAB_LABELS[tab]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="emisor" className="mt-6">
          <EmitterTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="productos" className="mt-6">
          <ProductsTab canManage={canManage} filters={filters} />
        </TabsContent>
        <TabsContent value="clientes" className="mt-6">
          <CustomersTab canManage={canManage} filters={filters} counts={readiness.data?.customers} />
        </TabsContent>
        <TabsContent value="formas-pago" className="mt-6">
          <PaymentMethodsTab canManage={canManage} />
        </TabsContent>
        <TabsContent value="sucursales" className="mt-6">
          <BranchesTab canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
