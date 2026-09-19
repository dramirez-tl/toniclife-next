// app/admin/facturacion/page.tsx — Facturación CFDI (Fase 2)
// Pestañas `?tab=facturas|por-facturar`: listado con filtros en URL contra
// GET /billing/invoices y ventas por facturar contra GET /billing/invoiceable-sales.
'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import {
  BuildingOfficeIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PermissionGuard } from '@/components/auth';
import { useBillingStatus } from '@/hooks/useBilling';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { useCanManageBilling } from '@/components/admin/billing/readiness/useCanManageBilling';
import { InvoicesTab } from '@/components/admin/billing/invoices/InvoicesTab';
import { InvoiceableSalesTab } from '@/components/admin/billing/invoices/InvoiceableSalesTab';
import { PacStatusCard, V2FlowsBanner } from '@/components/admin/billing/invoices/BillingStatusCards';
import { BILLING_FLOW_DISABLED_NOTICE } from '@/lib/billing-error';

const TABS = ['facturas', 'por-facturar'] as const;
type Tab = (typeof TABS)[number];

function isTab(value: string): value is Tab {
  return (TABS as readonly string[]).includes(value);
}

export default function FacturacionPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FacturacionContent />
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

function FacturacionContent() {
  const filters = useQueryFilters({ tab: 'facturas', page: '1', limit: '25' });
  const tabParam = filters.get('tab');
  const activeTab: Tab = isTab(tabParam) ? tabParam : 'facturas';
  const canManage = useCanManageBilling();
  const { data: status } = useBillingStatus();
  // 503 BILLING_V2_DISABLED en una acción: se avisa aunque /status aún no lo diga.
  const [flowDisabledByAction, setFlowDisabledByAction] = useState(false);

  // Al cambiar de pestaña se limpian los filtros de la anterior (comparten
  // `search`/`page`/`branchId`), para no arrastrar una búsqueda a la otra.
  const goTo = (tab: Tab) =>
    filters.setParams({
      tab,
      search: null,
      page: null,
      limit: null,
      status: null,
      invoiceType: null,
      branchId: null,
      startDate: null,
      endDate: null,
      withBalance: null,
      date: null,
      vstatus: null,
      ready: null,
    });

  const headerLink = (href: string, label: string, Icon: typeof DocumentTextIcon) => (
    <Button
      asChild
      variant="outline"
      className="border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white"
    >
      <Link href={href}>
        <Icon className="h-5 w-5" aria-hidden />
        {label}
      </Link>
    </Button>
  );

  return (
    <PermissionGuard permissions={['billing:read', 'billing:*']}>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <DocumentTextIcon className="h-10 w-10" aria-hidden />
                  <h1 className="text-4xl font-bold">Facturación CFDI</h1>
                </div>
                <p className="text-lg text-white/80">Facturas timbradas en v2 y ventas pendientes de facturar</p>
                {!canManage && (
                  <p className="mt-1 text-xs text-white/70">
                    Modo solo lectura: para facturar necesitas el permiso billing:manage (Contabilidad).
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {headerLink('/admin/facturacion/preparacion', 'Preparación fiscal', ClipboardDocumentCheckIcon)}
                {headerLink('/admin/facturacion/datos-fiscales', 'Datos fiscales', BuildingOfficeIcon)}
                {headerLink('/admin/facturacion/global', 'Factura global', GlobeAltIcon)}
                {headerLink('/admin/facturacion/complemento-pago', 'Complemento de pago', DocumentDuplicateIcon)}
                {headerLink('/admin/facturacion/reporte-folios', 'Reporte folios', ChartBarIcon)}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <V2FlowsBanner status={status} />
          {flowDisabledByAction && status?.v2FlowsEnabled !== false && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
              {BILLING_FLOW_DISABLED_NOTICE}
            </div>
          )}
          <PacStatusCard status={status} />

          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              if (isTab(v)) goTo(v);
            }}
          >
            <TabsList className="mb-6 flex h-auto w-full flex-wrap justify-start sm:w-fit">
              <TabsTrigger value="facturas">Facturas</TabsTrigger>
              <TabsTrigger value="por-facturar">Ventas por facturar</TabsTrigger>
            </TabsList>
            <TabsContent value="facturas">
              <InvoicesTab filters={filters} canManage={canManage} />
            </TabsContent>
            <TabsContent value="por-facturar">
              <InvoiceableSalesTab
                filters={filters}
                canManage={canManage}
                onFlowDisabled={() => setFlowDisabledByAction(true)}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PermissionGuard>
  );
}
