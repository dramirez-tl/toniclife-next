'use client';

// Botnatura (17-nov-2026): Tonic Life le vende a Botnatura y se lo factura desde aquí. Es un
// apartado AISLADO: catálogo propio de Botnatura (789 productos cargados de su archivo, mig 208),
// receptor fijo (sus datos fiscales) y la lista de las facturas emitidas desde este módulo. Nada
// de aquí toca los productos, precios, inventario ni ventas de Tonic Life.
// Pestañas: Facturar · Facturas emitidas · Productos · Datos de Botnatura.
// API /billing/botnatura/* (migs 207 y 208). Permiso billing:manual (Contabilidad, Super admin
// y Administrador), el mismo de Facturación libre.

import { useState } from 'react';
import { BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { PermissionGuard } from '@/components/auth';
import { BotnaturaInvoiceForm } from '@/components/admin/billing/botnatura/BotnaturaInvoiceForm';
import { BotnaturaInvoicesTab } from '@/components/admin/billing/botnatura/BotnaturaInvoicesTab';
import { BotnaturaProductsTab } from '@/components/admin/billing/botnatura/BotnaturaProductsTab';
import { BotnaturaSettingsTab } from '@/components/admin/billing/botnatura/BotnaturaSettingsTab';

type Tab = 'invoice' | 'list' | 'products' | 'settings';

const TABS: { id: Tab; label: string; hint: string }[] = [
  {
    id: 'invoice',
    label: 'Facturar',
    hint: 'Elige los productos de Botnatura, con qué precio salen y timbra el CFDI. Solo emite la factura: no genera venta ni descuenta inventario',
  },
  { id: 'list', label: 'Facturas emitidas', hint: 'Lo que se le ha facturado a Botnatura desde este apartado' },
  {
    id: 'products',
    label: 'Productos',
    hint: 'Catálogo propio de Botnatura: claves, nombres y sus dos precios (con IVA incluido)',
  },
  {
    id: 'settings',
    label: 'Datos de Botnatura',
    hint: 'Datos fiscales con los que salen todas las facturas de este apartado',
  },
];

export default function BotnaturaPage() {
  return (
    <PermissionGuard permissions={['billing:manual']}>
      <BotnaturaContent />
    </PermissionGuard>
  );
}

function BotnaturaContent() {
  const [tab, setTab] = useState<Tab>('invoice');
  const current = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-1 flex items-center gap-3">
            <BuildingStorefrontIcon className="h-9 w-9" />
            <h1 className="text-3xl font-bold">Botnatura</h1>
          </div>
          <p className="text-white/80">{current.hint}</p>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div
          className="inline-flex flex-wrap rounded-lg border border-gray-200 bg-white p-1 text-sm shadow-sm"
          role="tablist"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-md px-4 py-2 font-medium transition-colors ${tab === t.id ? 'bg-[#3E667D] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'invoice' && (
          <BotnaturaInvoiceForm
            onViewList={() => setTab('list')}
            onEditSettings={() => setTab('settings')}
            onEditCatalog={() => setTab('products')}
          />
        )}
        {tab === 'list' && <BotnaturaInvoicesTab onNew={() => setTab('invoice')} />}
        {tab === 'products' && <BotnaturaProductsTab />}
        {tab === 'settings' && <BotnaturaSettingsTab />}
      </div>
    </div>
  );
}
