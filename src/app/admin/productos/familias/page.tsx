'use client';

// /admin/productos/familias - Familias y tallas (ropa, mig 178, 30-oct-2026).
//
// Pestaña Familias: agrupan las variantes de un diseño (la playera rosa en CH,
// M y G); cada producto se une a la suya desde su ficha (sección Variantes).
// Pestaña Guías de tallas: la tabla de medidas por talla que la tienda muestra
// junto al selector (una guía sin filas no se muestra). Lectura con
// products:read; crear y editar con products:update (sin él, los diálogos solo
// muestran). Sin la migración 178 el API responde 503 y aquí se avisa.

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeftIcon, PlusIcon, SwatchIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { PermissionGuard } from '@/components/auth';
import { cn } from '@/lib/utils';
import { FamiliesTab } from '@/components/admin/products/families/FamiliesTab';
import { FamilyDialog } from '@/components/admin/products/families/FamilyDialog';
import { SizeGuideDialog } from '@/components/admin/products/families/SizeGuideDialog';
import { SizeGuidesTab } from '@/components/admin/products/families/SizeGuidesTab';
import { useProductPermissions } from '@/components/admin/products/lib/permissions';
import type { ProductFamily, SizeGuide } from '@/types/product-family';

type Tab = 'familias' | 'guias';

interface TabConfig {
  id: Tab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  subtitle: string;
  newLabel: string;
}

const TABS: TabConfig[] = [
  {
    id: 'familias',
    label: 'Familias',
    icon: SwatchIcon,
    subtitle: 'Agrupan las variantes de un mismo diseño; cada producto se une a su familia desde su ficha',
    newLabel: 'Nueva familia',
  },
  {
    id: 'guias',
    label: 'Guías de tallas',
    icon: TableCellsIcon,
    subtitle: 'Medidas por talla que la tienda muestra junto al selector; se ligan a las familias',
    newLabel: 'Nueva guía',
  },
];

export default function FamiliasPage() {
  return (
    <PermissionGuard permissions={['products:read', 'products:*']}>
      <Suspense fallback={<div className="min-h-screen bg-gray-50" role="status" aria-label="Cargando" />}>
        <FamiliasContent />
      </Suspense>
    </PermissionGuard>
  );
}

function FamiliasContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const active: Tab = sp.get('tab') === 'guias' ? 'guias' : 'familias';
  const config = TABS.find((t) => t.id === active)!;
  const Icon = config.icon;
  const { canUpdate } = useProductPermissions();

  const [familyDialog, setFamilyDialog] = useState<{ open: boolean; family: ProductFamily | null }>({
    open: false,
    family: null,
  });
  const [guideDialog, setGuideDialog] = useState<{ open: boolean; guide: SizeGuide | null }>({
    open: false,
    guide: null,
  });

  const setTab = (next: Tab) => {
    const usp = new URLSearchParams(sp.toString());
    if (next === 'familias') usp.delete('tab');
    else usp.set('tab', next);
    const q = usp.toString();
    router.replace(q ? `/admin/productos/familias?${q}` : '/admin/productos/familias', { scroll: false });
  };

  const openCreate = () => {
    if (active === 'familias') setFamilyDialog({ open: true, family: null });
    else setGuideDialog({ open: true, guide: null });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 pb-6 pt-10 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <Icon className="h-9 w-9" aria-hidden />
                <h1 className="text-3xl font-bold sm:text-4xl">Familias y tallas</h1>
              </div>
              <p className="text-base text-white/80 sm:text-lg">{config.subtitle}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link href="/admin/productos">
                  <ArrowLeftIcon className="h-5 w-5" aria-hidden />
                  Volver al catálogo
                </Link>
              </Button>
              {canUpdate ? (
                <Button variant="default" onClick={openCreate}>
                  <PlusIcon className="h-5 w-5" aria-hidden />
                  {config.newLabel}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto border-b border-white/20" role="tablist">
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
                    '-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors sm:px-5',
                    isActive
                      ? 'border-white text-white'
                      : 'border-transparent text-white/70 hover:border-white/40 hover:text-white',
                  )}
                >
                  <TIcon className="h-4 w-4" aria-hidden />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {active === 'familias' ? (
          <FamiliesTab
            onCreate={() => setFamilyDialog({ open: true, family: null })}
            onEdit={(family) => setFamilyDialog({ open: true, family })}
          />
        ) : (
          <SizeGuidesTab
            onCreate={() => setGuideDialog({ open: true, guide: null })}
            onEdit={(guide) => setGuideDialog({ open: true, guide })}
          />
        )}
      </div>

      <FamilyDialog
        open={familyDialog.open}
        onOpenChange={(open) => setFamilyDialog((prev) => ({ ...prev, open }))}
        family={familyDialog.family}
        readOnly={!canUpdate}
      />
      <SizeGuideDialog
        open={guideDialog.open}
        onOpenChange={(open) => setGuideDialog((prev) => ({ ...prev, open }))}
        guide={guideDialog.guide}
        readOnly={!canUpdate}
      />
    </div>
  );
}
