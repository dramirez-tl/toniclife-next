'use client';

// FamiliesTab - tabla de familias de producto (mig 178): clave, nombre, guía,
// variantes activas/total, para quién, colores, tallas y estado; buscador en
// cliente (la lista es corta) e "Incluir inactivas". Crear/editar abre
// FamilyDialog desde la página.

import { useId, useMemo, useState } from 'react';
import { ArrowPathIcon, MagnifyingGlassIcon, PencilIcon, PlusIcon, SwatchIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DataTable, type DataTableColumn } from '@/components/ui';
import { genderLabels, guideHasMeasures, sortSizes } from '@/lib/product-families';
import type { ProductFamily } from '@/types/product-family';
import { useProductPermissions } from '../lib/permissions';
import { useProductFamilies, useSizeGuides } from '../useProductFamilies';
import { FamiliesErrorCard } from './FamiliesErrorCard';

interface FamiliesTabProps {
  onCreate: () => void;
  onEdit: (family: ProductFamily) => void;
}

const matches = (f: ProductFamily, needle: string) =>
  needle === '' ||
  f.code.toLowerCase().includes(needle) ||
  f.name.toLowerCase().includes(needle) ||
  (f.nameEn ?? '').toLowerCase().includes(needle);

export function FamiliesTab({ onCreate, onEdit }: FamiliesTabProps) {
  const ids = useId();
  const { canUpdate } = useProductPermissions();
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  const families = useProductFamilies({ includeInactive });
  // Para avisar "sin medidas" junto al nombre de la guía.
  const guides = useSizeGuides({ includeInactive: true });
  const guideById = useMemo(() => new Map((guides.data ?? []).map((g) => [g.id, g])), [guides.data]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (families.data ?? []).filter((f) => matches(f, needle));
  }, [families.data, search]);

  const columns: DataTableColumn<ProductFamily>[] = [
    {
      key: 'code',
      header: 'Clave',
      sortable: true,
      sortValue: (f) => f.code,
      render: (f) => (
        <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 font-mono text-sm font-medium text-gray-800">
          {f.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Nombre',
      sortable: true,
      sortValue: (f) => f.name,
      render: (f) => (
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">{f.name}</p>
          {f.nameEn ? <p className="truncate text-xs text-gray-500" lang="en">{f.nameEn}</p> : null}
        </div>
      ),
    },
    {
      key: 'guide',
      header: 'Guía de tallas',
      render: (f) => {
        if (!f.sizeGuideId) return <span className="text-sm text-gray-500">Sin guía</span>;
        const guide = guideById.get(f.sizeGuideId);
        return (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm text-gray-700">{f.sizeGuideName ?? guide?.name ?? 'Guía'}</span>
            {guide && !guideHasMeasures(guide) ? (
              <Badge variant="warning" title="La guía no tiene filas: la tienda no la muestra">
                Sin medidas
              </Badge>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'variants',
      header: 'Variantes',
      sortable: true,
      sortValue: (f) => f.variantCount,
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (f) =>
        f.variantCount === 0 ? (
          <span className="text-sm text-gray-500">Sin variantes</span>
        ) : (
          <span className="text-sm tabular-nums text-gray-900" title={`${f.activeVariantCount} activas de ${f.variantCount}`}>
            <strong>{f.activeVariantCount}</strong> activas / {f.variantCount}
          </span>
        ),
    },
    {
      key: 'genders',
      header: 'Para quién',
      render: (f) => <span className="text-sm text-gray-700">{genderLabels(f.genders).join(', ') || '-'}</span>,
    },
    {
      key: 'colors',
      header: 'Colores',
      render: (f) =>
        f.colors.length > 0 ? (
          <span className="line-clamp-2 max-w-[220px] text-sm text-gray-700" title={f.colors.join(', ')}>
            {f.colors.join(', ')}
          </span>
        ) : (
          <span className="text-sm text-gray-500">-</span>
        ),
    },
    {
      key: 'sizes',
      header: 'Tallas',
      render: (f) =>
        f.sizes.length > 0 ? (
          <span className="font-mono text-sm text-gray-700">{sortSizes(f.sizes).join(', ')}</span>
        ) : (
          <span className="text-sm text-gray-500">-</span>
        ),
    },
    {
      key: 'active',
      header: 'Activa',
      sortable: true,
      sortValue: (f) => (f.isActive ? 1 : 0),
      render: (f) => <Badge variant={f.isActive ? 'success' : 'secondary'}>{f.isActive ? 'Activa' : 'Inactiva'}</Badge>,
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (f) => (
        <button
          type="button"
          onClick={() => onEdit(f)}
          className="rounded-lg p-2 transition-colors hover:bg-green-50"
          title={canUpdate ? 'Editar familia' : 'Ver familia'}
          aria-label={canUpdate ? `Editar familia ${f.code}` : `Ver familia ${f.code}`}
        >
          <PencilIcon className="h-4 w-4 text-green-600" aria-hidden />
        </button>
      ),
    },
  ];

  if (families.isError && !families.data) {
    return (
      <FamiliesErrorCard
        error={families.error}
        fallback="No se pudieron cargar las familias. Intenta de nuevo."
        onRetry={() => void families.refetch()}
      />
    );
  }

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Familias de producto</h2>
            <p className="text-xs text-gray-500">
              Cada producto se une a su familia desde la ficha (sección Variantes). Mostrando {rows.length} de{' '}
              {families.data?.length ?? 0}.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full sm:w-72">
              <Label htmlFor={`${ids}-search`} className="mb-1 block text-xs">
                Buscar por clave o nombre
              </Label>
              <div className="relative">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                <input
                  id={`${ids}-search`}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="PLR, playera…"
                  className="h-9 w-full rounded-lg border border-gray-300 pl-9 pr-3 text-sm focus:border-transparent focus:ring-2 focus:ring-[#3E667D]"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pb-1.5">
              <Switch id={`${ids}-inactive`} checked={includeInactive} onCheckedChange={setIncludeInactive} />
              <Label htmlFor={`${ids}-inactive`} className="text-sm font-normal">
                Incluir inactivas
              </Label>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-gray-600"
              onClick={() => void families.refetch()}
              disabled={families.isFetching}
            >
              <ArrowPathIcon className={`h-4 w-4 ${families.isFetching ? 'animate-spin' : ''}`} aria-hidden />
              Actualizar
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          isLoading={families.isLoading && !families.data}
          getRowKey={(f) => f.id}
          minWidthClassName="min-w-[1100px]"
          emptyState={
            <div className="py-2 text-center">
              <SwatchIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" aria-hidden />
              <h3 className="mb-2 text-xl font-bold text-gray-900">
                {search.trim() ? 'Ninguna familia coincide' : 'No hay familias de producto'}
              </h3>
              <p className="text-gray-600">
                {search.trim()
                  ? 'Prueba con otra clave o nombre.'
                  : 'Crea la primera familia y únele sus variantes desde la ficha de cada producto.'}
              </p>
              {canUpdate && !search.trim() ? (
                <div className="mt-4 flex justify-center">
                  <Button variant="default" onClick={onCreate}>
                    <PlusIcon className="h-4 w-4" aria-hidden />
                    Nueva familia
                  </Button>
                </div>
              ) : null}
            </div>
          }
        />
      </CardContent>
    </Card>
  );
}
