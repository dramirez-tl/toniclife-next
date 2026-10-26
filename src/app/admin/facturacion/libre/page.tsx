'use client';

// Facturación libre (Contabilidad, 22-oct-2026; rediseño 26-oct-2026): CFDI
// capturados a mano SIN ticket, como en el punto de venta (distribuidor →
// precio de lista, productos, receptor público / distribuidor / otros datos).
// Dos pestañas: "Facturas emitidas" (GET billing/invoices?manualKind=free:
// tabla con filtros, PDF/XML y reenvío) y "Nueva factura sin ticket"
// (captura → vista previa automática → timbrar, POST billing/manual-invoices/
// free). La pestaña anterior "Tickets pendientes" (facturar pendientes del
// cuadre) se retiró a pedido de Contabilidad el 26-oct; el API conserva esas
// rutas (POST billing/manual-invoices[/preview]).
// Permiso billing:manual (mig 169): Contabilidad, Super admin y Administrador.

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DocumentPlusIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import { PermissionGuard } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { FreeInvoicesTab } from '@/components/admin/billing/FreeInvoicesTab';
import { ManualFreeInvoiceForm } from '@/components/admin/billing/ManualFreeInvoiceForm';
import { useCanManageBilling } from '@/components/admin/billing/readiness/useCanManageBilling';

type Mode = 'list' | 'free';

export default function FacturacionLibrePage() {
  return (
    <PermissionGuard permissions={['billing:manual']}>
      <Suspense>
        <FacturacionLibreContent />
      </Suspense>
    </PermissionGuard>
  );
}

function FacturacionLibreContent() {
  const params = useSearchParams();
  // ?modo=libre abre directo la captura; por defecto, las facturas emitidas.
  const [mode, setMode] = useState<Mode>(params.get('modo') === 'libre' ? 'free' : 'list');
  const canManage = useCanManageBilling();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-3">
                <DocumentPlusIcon className="h-9 w-9" />
                <h1 className="text-3xl font-bold">Facturación libre</h1>
              </div>
              <p className="text-white/80">
                {mode === 'free'
                  ? 'Captura libre como en el punto de venta: distribuidor, productos y a quién se factura. Solo emite el CFDI: no genera venta ni descuenta inventario'
                  : 'Facturas emitidas sin ticket (captura libre): búscalas, descarga PDF/XML o reenvíalas por correo'}
              </p>
            </div>
            {mode === 'list' ? (
              <Button variant="secondary" className="gap-2" onClick={() => setMode('free')}>
                <DocumentPlusIcon className="h-4 w-4" />
                Nueva factura sin ticket
              </Button>
            ) : (
              <Button variant="secondary" className="gap-2" onClick={() => setMode('list')}>
                <TableCellsIcon className="h-4 w-4" />
                Ver facturas emitidas
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 text-sm shadow-sm" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'list'}
            onClick={() => setMode('list')}
            className={`rounded-md px-4 py-2 font-medium transition-colors ${mode === 'list' ? 'bg-[#3E667D] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Facturas emitidas
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'free'}
            onClick={() => setMode('free')}
            className={`rounded-md px-4 py-2 font-medium transition-colors ${mode === 'free' ? 'bg-[#3E667D] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Nueva factura sin ticket
          </button>
        </div>

        {mode === 'list' ? (
          <FreeInvoicesTab canManage={canManage} onNew={() => setMode('free')} />
        ) : (
          <ManualFreeInvoiceForm onViewList={() => setMode('list')} />
        )}
      </div>
    </div>
  );
}
