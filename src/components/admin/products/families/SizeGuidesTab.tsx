'use client';

// SizeGuidesTab - tabla de guías de tallas (mig 178): clave, nombre, para quién,
// unidad, columnas, filas, familias que la usan y estado; buscador en cliente e
// "Incluir inactivas". Crear/editar abre SizeGuideDialog desde la página.

import { useId, useMemo, useState } from 'react';
import { ArrowPathIcon, MagnifyingGlassIcon, PencilIcon, PlusIcon, TableCellsIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DataTable, type DataTableColumn } from '@/components/ui';
import { guideHasMeasures, variantGenderLabel } from '@/lib/product-families';
import type { SizeGuide } from '@/types/product-family';
import { useProductPermissions } from '../lib/permissions';
import { useSizeGuides } from '../useProductFamilies';
import { FamiliesErrorCard } from './FamiliesErrorCard';

interface SizeGuidesTabProps {
  onCreate: () => void;
  onEdit: (guide: SizeGuide) => void;
}

const matches = (g: SizeGuide, needle: string) =>
  needle === '' ||
  g.code.toLowerCase().includes(needle) ||
  g.name.toLowerCase().includes(needle) ||
  (g.nameEn ?? '').toLowerCase().includes(needle);

const plural = (n: number, singular: string, pluralWord: string) => `${n} ${n === 1 ? singular : pluralWord}`;

export function SizeGuidesTab({ onCreate, onEdit }: SizeGuidesTabProps) {
  const ids = useId();
  const { canUpdate } = useProductPermissions();
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  const guides = useSizeGuides({ includeInactive });

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (guides.data ?? []).filter((g) => matches(g, needle));
  }, [guides.data, search]);

  const columns: DataTableColumn<SizeGuide>[] = [
    {
      key: 'code',
      header: 'Clave',
      sortable: true,
      sortValue: (g) => g.code,
      render: (g) => (
        <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 font-mono text-sm font-medium text-gray-800">
          {g.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Nombre',
      sortable: true,
      sortValue: (g) => g.name,
      render: (g) => (
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">{g.name}</p>
          {g.nameEn ? <p className="truncate text-xs text-gray-500" lang="en">{g.nameEn}</p> : null}
        </div>
      ),
    },
    {
      key: 'gender',
      header: 'Para quién',
      render: (g) => <span className="text-sm text-gray-700">{variantGenderLabel(g.gender) || '-'}</span>,
    },
    {
      key: 'unit',
      header: 'Unidad',
      render: (g) => <span className="text-sm text-gray-700">{g.unit}</span>,
    },
    {
      key: 'columns',
      header: 'Columnas',
      render: (g) => (
        <span className="text-sm text-gray-700" title={g.columns.map((c) => c.label).join(', ')}>
          {g.columns.length > 0 ? g.columns.map((c) => c.label).join(', ') : '-'}
        </span>
      ),
    },
    {
      key: 'rows',
      header: 'Tallas',
      sortable: true,
      sortValue: (g) => g.rows.length,
      render: (g) =>
        guideHasMeasures(g) ? (
          <span className="text-sm tabular-nums text-gray-900" title={g.rows.map((r) => r.size).join(', ')}>
            {plural(g.rows.length, 'talla', 'tallas')}
          </span>
        ) : (
          <Badge variant="warning" title="Sin filas: la tienda no muestra esta guía">
            Sin medidas
          </Badge>
        ),
    },
    {
      key: 'families',
      header: 'Familias',
      sortable: true,
      sortValue: (g) => g.familyCount,
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (g) =>
        g.familyCount > 0 ? (
          <span className="text-sm tabular-nums text-gray-900">{plural(g.familyCount, 'familia', 'familias')}</span>
        ) : (
          <span className="text-sm text-gray-500">Sin uso</span>
        ),
    },
    {
      key: 'active',
      header: 'Activa',
      sortable: true,
      sortValue: (g) => (g.isActive ? 1 : 0),
      render: (g) => <Badge variant={g.isActive ? 'success' : 'secondary'}>{g.isActive ? 'Activa' : 'Inactiva'}</Badge>,
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (g) => (
        <button
          type="button"
          onClick={() => onEdit(g)}
          className="rounded-lg p-2 transition-colors hover:bg-green-50"
          title={canUpdate ? 'Editar guía' : 'Ver guía'}
          aria-label={canUpdate ? `Editar guía ${g.code}` : `Ver guía ${g.code}`}
        >
          <PencilIcon className="h-4 w-4 text-green-600" aria-hidden />
        </button>
      ),
    },
  ];

  if (guides.isError && !guides.data) {
    return (
      <FamiliesErrorCard
        error={guides.error}
        fallback="No se pudieron cargar las guías de tallas. Intenta de nuevo."
        onRetry={() => void guides.refetch()}
      />
    );
  }

  return (
    <Card className="border-gray-100 shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Guías de tallas</h2>
            <p className="text-xs text-gray-500">
              Tabla de medidas por talla; se liga a las familias y la tienda la muestra junto al selector. Una
              guía sin tallas no se muestra. Mostrando {rows.length} de {guides.data?.length ?? 0}.
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
                  placeholder="PLAYERA-MUJER, sudadera…"
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
              onClick={() => void guides.refetch()}
              disabled={guides.isFetching}
            >
              <ArrowPathIcon className={`h-4 w-4 ${guides.isFetching ? 'animate-spin' : ''}`} aria-hidden />
              Actualizar
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={rows}
          isLoading={guides.isLoading && !guides.data}
          getRowKey={(g) => g.id}
          minWidthClassName="min-w-[1000px]"
          emptyState={
            <div className="py-2 text-center">
              <TableCellsIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" aria-hidden />
              <h3 className="mb-2 text-xl font-bold text-gray-900">
                {search.trim() ? 'Ninguna guía coincide' : 'No hay guías de tallas'}
              </h3>
              <p className="text-gray-600">
                {search.trim()
                  ? 'Prueba con otra clave o nombre.'
                  : 'Crea la primera guía con sus medidas por talla y lígala a una familia.'}
              </p>
              {canUpdate && !search.trim() ? (
                <div className="mt-4 flex justify-center">
                  <Button variant="default" onClick={onCreate}>
                    <PlusIcon className="h-4 w-4" aria-hidden />
                    Nueva guía
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
