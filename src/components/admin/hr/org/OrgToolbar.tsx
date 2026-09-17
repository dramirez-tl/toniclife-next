'use client';

// OrgToolbar - Barra del organigrama: búsqueda, filtros, bajas,
// expandir/contraer, zoom, impresión y CSV.
//
// Se pega debajo de la barra superior del admin SOLO desde `md` (top-14, y
// top-12 en escritorio): en un teléfono los cinco filtros apilados miden ~450px
// y, pegados, no dejarían ver el organigrama en ningún momento del scroll. Por
// lo mismo, abajo de `md` los filtros se pliegan detrás del botón "Filtros" y
// la búsqueda es lo único que queda a la vista.
//
// Lleva `org-no-print` porque al imprimir estorba.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  MagnifyingGlassIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  PrinterIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { EMPLOYMENT_TYPES, EMPLOYMENT_TYPE_LABELS } from '@/types/hr';
import type { OrgChartBranch, OrgChartCountry, OrgChartDepartment } from '@/types/hr';
import { NO_COUNTRY, NO_DEPARTMENT, hasActiveFilters, type OrgFilters } from './org-utils';

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 1.5;
export const ZOOM_STEP = 0.1;

export interface OrgToolbarProps {
  /** La pantalla mide el alto real de la barra para anclar la ficha lateral. */
  rootRef?: React.Ref<HTMLDivElement>;
  filters: OrgFilters;
  onFiltersChange: (patch: Partial<OrgFilters>) => void;
  onClearFilters: () => void;
  countries: OrgChartCountry[];
  departments: OrgChartDepartment[];
  branches: OrgChartBranch[];
  includeInactive: boolean;
  onIncludeInactiveChange: (value: boolean) => void;
  /** Cuántos nodos coinciden con la búsqueda (0 = sin resultados). */
  matches: number;
  /** Expandir/contraer solo aplica a la vista de jerarquía. */
  showTreeControls: boolean;
  /** El zoom no aplica en la lista indentada de móvil. */
  showZoom: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onPrint: () => void;
  onExportCsv: () => void;
}

export function OrgToolbar({
  rootRef,
  filters,
  onFiltersChange,
  onClearFilters,
  countries,
  departments,
  branches,
  includeInactive,
  onIncludeInactiveChange,
  matches,
  showTreeControls,
  showZoom,
  zoom,
  onZoomChange,
  onExpandAll,
  onCollapseAll,
  onPrint,
  onExportCsv,
}: OrgToolbarProps) {
  const countryOptions = [
    ...countries.map((c) => ({ value: c.id, label: c.name, hint: c.code })),
    { value: NO_COUNTRY, label: 'Sin país asignado' },
  ];

  const departmentOptions = [
    ...departments
      .filter((d) => d.isActive !== false)
      .map((d) => ({
        value: d.id,
        label: d.name,
        hint: d.countryName ?? 'Sin país',
      })),
    { value: NO_DEPARTMENT, label: 'Sin departamento' },
  ];

  const branchOptions = branches.map((b) => ({
    value: b.id,
    label: b.name,
    hint: `${b.code} · ${b.employeesCount} persona${b.employeesCount === 1 ? '' : 's'}`,
  }));

  const typeOptions = EMPLOYMENT_TYPES.map((t) => ({
    value: t,
    label: EMPLOYMENT_TYPE_LABELS[t],
  }));

  const setZoom = (value: number) =>
    onZoomChange(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number(value.toFixed(2)))));

  // Solo en teléfono: los cuatro selectores se pliegan. Desde `md` el grid
  // manda y `filtersOpen` no pinta nada.
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilters = [
    filters.countryId,
    filters.departmentId,
    filters.branchId,
    filters.employmentType,
  ].filter(Boolean).length;
  /** Clase de los selectores plegables (ocultos en móvil si no se abrieron). */
  const foldable = cn(!filtersOpen && 'hidden md:block');

  return (
    <div
      ref={rootRef}
      className="org-no-print z-10 mb-4 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-sm backdrop-blur md:sticky md:top-14 lg:top-12"
    >
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        <div className="xl:col-span-1">
          <Label className="mb-1 block text-xs text-muted-foreground">Buscar persona</Label>
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={filters.search}
              onChange={(e) => onFiltersChange({ search: e.target.value })}
              placeholder="Nombre, número o puesto"
              className="pl-8 pr-8"
            />
            {filters.search && (
              <button
                type="button"
                aria-label="Limpiar búsqueda"
                onClick={() => onFiltersChange({ search: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          {filters.search && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {matches > 0
                ? `${matches} coincidencia${matches === 1 ? '' : 's'} resaltada${matches === 1 ? '' : 's'}`
                : 'Sin coincidencias'}
            </p>
          )}
        </div>

        <div className={foldable}>
          <Label className="mb-1 block text-xs text-muted-foreground">País</Label>
          <SearchableSelect
            options={countryOptions}
            value={filters.countryId}
            onChange={(v) => onFiltersChange({ countryId: v })}
            allLabel="Todos los países"
            allValue=""
          />
        </div>

        <div className={foldable}>
          <Label className="mb-1 block text-xs text-muted-foreground">Departamento</Label>
          <SearchableSelect
            options={departmentOptions}
            value={filters.departmentId}
            onChange={(v) => onFiltersChange({ departmentId: v })}
            allLabel="Todos los departamentos"
            allValue=""
          />
        </div>

        <div className={foldable}>
          <Label className="mb-1 block text-xs text-muted-foreground">Sucursal</Label>
          <SearchableSelect
            options={branchOptions}
            value={filters.branchId}
            onChange={(v) => onFiltersChange({ branchId: v })}
            allLabel="Todas las sucursales"
            allValue=""
          />
        </div>

        <div className={foldable}>
          <Label className="mb-1 block text-xs text-muted-foreground">Tipo</Label>
          <SearchableSelect
            options={typeOptions}
            value={filters.employmentType}
            onChange={(v) => onFiltersChange({ employmentType: v })}
            allLabel="Todos los tipos"
            allValue=""
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
        {/* Teléfono: los filtros viven detrás de este botón (desde md están
            siempre a la vista y el botón desaparece). */}
        <Button
          variant="outline"
          size="sm"
          className="md:hidden"
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((prev) => !prev)}
        >
          <AdjustmentsHorizontalIcon className="mr-1 h-4 w-4" />
          Filtros
          {activeFilters > 0 && (
            <span className="ml-1 rounded-full bg-[#3E667D] px-1.5 text-[10px] text-white">
              {activeFilters}
            </span>
          )}
        </Button>

        <label className="flex items-center gap-2 text-xs text-gray-600">
          <Switch checked={includeInactive} onCheckedChange={onIncludeInactiveChange} />
          Incluir bajas
        </label>

        {hasActiveFilters(filters) && (
          <button
            type="button"
            onClick={onClearFilters}
            className="text-xs text-primary underline"
          >
            Limpiar filtros
          </button>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {showTreeControls && (
            <>
              <Button variant="outline" size="sm" onClick={onExpandAll}>
                <ArrowsPointingOutIcon className="mr-1 h-4 w-4" />
                Expandir todo
              </Button>
              <Button variant="outline" size="sm" onClick={onCollapseAll}>
                <ArrowsPointingInIcon className="mr-1 h-4 w-4" />
                Contraer todo
              </Button>
            </>
          )}

          {showZoom && (
            <div className="flex items-center rounded-lg border border-gray-200">
              <button
                type="button"
                aria-label="Alejar"
                onClick={() => setZoom(zoom - ZOOM_STEP)}
                disabled={zoom <= ZOOM_MIN}
                className="px-2 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <MagnifyingGlassMinusIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onZoomChange(1)}
                className="min-w-[3.25rem] border-x border-gray-200 px-1 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                title="Restablecer el zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                aria-label="Acercar"
                onClick={() => setZoom(zoom + ZOOM_STEP)}
                disabled={zoom >= ZOOM_MAX}
                className="px-2 py-1.5 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <MagnifyingGlassPlusIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={onPrint}>
            <PrinterIcon className="mr-1 h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="outline" size="sm" onClick={onExportCsv}>
            <ArrowDownTrayIcon className="mr-1 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </div>
    </div>
  );
}
