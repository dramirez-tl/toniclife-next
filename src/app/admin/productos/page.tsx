'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShoppingBagIcon,
  PlusIcon,
  GiftIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PermissionGuard } from '@/components/auth';
import { cn } from '@/lib/utils';
import { ProductosTab } from './_tabs/ProductosTab';
import { KitsTab } from './_tabs/KitsTab';
import { PromocionesTab } from './_tabs/PromocionesTab';

type Tab = 'productos' | 'kits' | 'promociones';

interface TabConfig {
  id: Tab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  subtitle: string;
  newHref: string;
  newLabel: string;
}

const TABS: TabConfig[] = [
  {
    id: 'productos',
    label: 'Productos',
    icon: ShoppingBagIcon,
    subtitle: 'Administra el catálogo de productos y el inventario',
    newHref: '/admin/productos/nuevo',
    newLabel: 'Nuevo Producto',
  },
  {
    id: 'kits',
    label: 'Kits',
    icon: GiftIcon,
    subtitle: 'Kits Básico, Premium y Preferente que se venden para inscribir distribuidores',
    newHref: '/admin/kits/nuevo',
    newLabel: 'Nuevo Kit',
  },
  {
    id: 'promociones',
    label: 'Promociones',
    icon: SparklesIcon,
    subtitle:
      'Promociones canjeables por puntos acumulados del periodo (MX 4,000/6,000 — US 6,600/9,900)',
    newHref: '/admin/promociones/nuevo',
    newLabel: 'Nueva Promoción',
  },
];

// Claves de filtros internos por pestaña. Al cambiar de tab se limpian
// para que cada pestaña arranque con su propio estado de filtros.
const TAB_FILTER_KEYS = [
  'search',
  'sku',
  'categoryId',
  'kitPosition',
  'countryId',
  'status',
  'isActive',
  'page',
  'limit',
];

export default function ProductosPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PageContent />
    </Suspense>
  );
}

function PageContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const rawTab = sp.get('tab');
  const active: Tab =
    rawTab === 'kits' || rawTab === 'promociones' ? rawTab : 'productos';
  const config = TABS.find((t) => t.id === active)!;
  const Icon = config.icon;

  const setTab = (next: Tab) => {
    const usp = new URLSearchParams(sp.toString());
    if (next === 'productos') usp.delete('tab');
    else usp.set('tab', next);
    TAB_FILTER_KEYS.forEach((k) => usp.delete(k));
    const q = usp.toString();
    router.replace(q ? `/admin/productos?${q}` : '/admin/productos', {
      scroll: false,
    });
  };

  return (
    <PermissionGuard permissions={['products:read', 'products:*']}>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
        <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="pt-10 pb-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <Icon className="h-9 w-9" />
                  <h1 className="text-3xl font-bold sm:text-4xl">Gestión de Productos</h1>
                </div>
                <p className="text-base text-white/80 sm:text-lg">{config.subtitle}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/admin">
                  <Button variant="secondary">Volver al Panel Principal</Button>
                </Link>
                <Link href={config.newHref}>
                  <Button variant="default">
                    <PlusIcon className="h-5 w-5" />
                    {config.newLabel}
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex gap-1 border-b border-white/20 overflow-x-auto" role="tablist">
              {TABS.map((t) => {
                const TIcon = t.icon;
                const isActive = active === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      'inline-flex items-center gap-2 px-4 sm:px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                      isActive
                        ? 'border-white text-white'
                        : 'border-transparent text-white/70 hover:text-white hover:border-white/40',
                    )}
                  >
                    <TIcon className="h-4 w-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {active === 'productos' && <ProductosTab />}
        {active === 'kits' && <KitsTab />}
        {active === 'promociones' && <PromocionesTab />}
      </div>
    </PermissionGuard>
  );
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="pt-10 pb-6">
            <div className="flex items-center gap-3 mb-2">
              <ShoppingBagIcon className="h-9 w-9" />
              <h1 className="text-3xl font-bold sm:text-4xl">Gestión de Productos</h1>
            </div>
            <p className="text-base text-white/80 sm:text-lg">Cargando...</p>
          </div>
          <div className="h-12 border-b border-white/20" />
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                  <div className="h-8 w-16 bg-gray-200 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded mb-3" />
              <div className="grid grid-cols-3 gap-4">
                <div className="h-10 bg-gray-200 rounded" />
                <div className="h-10 bg-gray-200 rounded" />
                <div className="h-10 bg-gray-200 rounded" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
