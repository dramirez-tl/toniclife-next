'use client';

// Organigrama - La jerarquía REAL de la empresa, con los huecos a la vista.
//
// Tres vistas sobre una sola consulta (GET /hr/org/chart):
//   1. Jerarquía   - árbol Director General → departamentos → equipo por jefe.
//   2. Departamentos - jefe/subjefe/país editables en línea y plantilla.
//   3. Sucursales  - quién está en cada punto, agrupado por país.
//
// La jerarquía sale de tres columnas distintas (countries.director_general_user_id,
// departments.head_user_id y employees.supervisor_id) y hoy faltan datos: hay
// departamentos sin país ni jefe y expedientes sin supervisor ni puesto. En vez
// de esconderlos, el árbol los agrupa ("Sin país asignado", "Sin departamento",
// "Sin jefe directo") y las tarjetas de resumen llevan directo a ellos.
//
// Sin librerías de diagramas: los conectores son CSS (ver OrgTree).

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowPathIcon,
  BriefcaseIcon,
  BuildingOffice2Icon,
  ExclamationTriangleIcon,
  GlobeAmericasIcon,
  UserGroupIcon,
  UserPlusIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useOrgChart } from '@/hooks/useHR';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useAppSelector } from '@/store/hooks';
import { selectUserPermissions, selectUserRoles } from '@/store/slices/authSlice';
import { OrgBranchesView } from '@/components/admin/hr/org/OrgBranchesView';
import { OrgDepartmentsView } from '@/components/admin/hr/org/OrgDepartmentsView';
import { OrgDetailPanel } from '@/components/admin/hr/org/OrgDetailPanel';
import { OrgToolbar } from '@/components/admin/hr/org/OrgToolbar';
import { OrgTree } from '@/components/admin/hr/org/OrgTree';
import {
  EMPTY_ORG_FILTERS,
  NO_COUNTRY,
  NO_DEPARTMENT,
  buildOrgTree,
  collectCollapsibleIds,
  exportOrgChartCsv,
  filterDepartments,
  filterEmployees,
  findOrgNode,
  highlightMatches,
  searchOrgTree,
  standaloneOrgNode,
  type OrgFilters,
  type OrgHighlight,
  type OrgNode,
} from '@/components/admin/hr/org/org-utils';
import { hasManagePermission } from '../hr-utils';
import type { OrgChart } from '@/types/hr';

/** Evita `chart &&` en cada memo mientras carga la consulta. */
const EMPTY_CHART: OrgChart = {
  generatedAt: '',
  countries: [],
  departments: [],
  branches: [],
  employees: [],
  stats: {
    employees: 0,
    withoutSupervisor: 0,
    withoutDepartment: 0,
    withoutPosition: 0,
    departmentsWithoutHead: 0,
    departmentsWithoutCountry: 0,
  },
};

export default function OrganigramaPage() {
  const router = useRouter();

  const [includeInactive, setIncludeInactive] = useState(false);
  const [filters, setFilters] = useState<OrgFilters>(EMPTY_ORG_FILTERS);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [highlight, setHighlight] = useState<OrgHighlight>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [tab, setTab] = useState('jerarquia');

  const { data, isLoading, isError, isFetching, refetch } = useOrgChart(includeInactive);
  const chart = data ?? EMPTY_CHART;

  const permissions = useAppSelector(selectUserPermissions);
  const roles = useAppSelector(selectUserRoles);
  const canManage = useMemo(() => hasManagePermission(permissions, roles), [permissions, roles]);

  // < md el diagrama no cabe: se vuelve lista indentada. < xl la ficha va en
  // un panel lateral en vez de la columna derecha.
  const isMobile = useIsMobile(768);
  const isBelowXl = useIsMobile(1280);

  const roots = useMemo(() => buildOrgTree(chart, filters), [chart, filters]);
  const search = useMemo(() => searchOrgTree(roots, filters.search), [roots, filters.search]);
  const marks = useMemo(() => highlightMatches(roots, highlight), [roots, highlight]);

  const highlighted = useMemo(
    () => new Set<string>([...search.matched, ...marks.matched]),
    [search, marks],
  );
  const forcedOpen = useMemo(
    () => new Set<string>([...search.expand, ...marks.expand]),
    [search, marks],
  );

  const visibleEmployees = useMemo(
    () => filterEmployees(chart.employees, filters, chart.departments),
    [chart, filters],
  );
  const visibleDepartments = useMemo(
    () => filterDepartments(chart.departments, filters),
    [chart.departments, filters],
  );

  const selectedNode: OrgNode | null = useMemo(() => {
    if (!selectedId) return null;
    return findOrgNode(roots, selectedId) ?? standaloneOrgNode(chart, selectedId);
  }, [selectedId, roots, chart]);

  const patchFilters = (patch: Partial<OrgFilters>) =>
    setFilters((prev) => ({ ...prev, ...patch }));

  const toggleNode = (nodeId: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => setCollapsed(new Set(collectCollapsibleIds(roots)));

  const openEmployee = (employeeId: string) =>
    router.push(`/admin/rrhh/empleados/${employeeId}`);

  const selectEmployee = (employeeId: string) => setSelectedId(`emp:${employeeId}`);

  /**
   * Imprimir: primero se expande todo y se restablece el zoom (un nodo
   * colapsado NO está en el DOM, así que ningún @media print podría abrirlo) y
   * hasta que React repinta se abre el diálogo del navegador.
   */
  const handlePrint = () => {
    expandAll();
    setZoom(1);
    setTimeout(() => window.print(), 150);
  };

  const handleExport = () => exportOrgChartCsv(chart, visibleEmployees);

  const stats = chart.stats;
  const isEmpty =
    !isLoading && chart.employees.length === 0 && chart.departments.length === 0;

  const cards: {
    id: string;
    label: string;
    value: number;
    icon: typeof UsersIcon;
    active: boolean;
    onClick: () => void;
  }[] = [
    {
      id: 'personas',
      label: 'Personas',
      value: stats.employees,
      icon: UsersIcon,
      active: false,
      onClick: () => {
        setFilters(EMPTY_ORG_FILTERS);
        setHighlight(null);
      },
    },
    {
      id: 'sin-jefe',
      label: 'Sin jefe directo',
      value: stats.withoutSupervisor,
      icon: UserPlusIcon,
      active: highlight === 'sin-jefe-directo',
      onClick: () =>
        setHighlight((prev) => (prev === 'sin-jefe-directo' ? null : 'sin-jefe-directo')),
    },
    {
      id: 'sin-departamento',
      label: 'Sin departamento',
      value: stats.withoutDepartment,
      icon: UserGroupIcon,
      active: filters.departmentId === NO_DEPARTMENT,
      onClick: () =>
        patchFilters({
          departmentId: filters.departmentId === NO_DEPARTMENT ? '' : NO_DEPARTMENT,
        }),
    },
    {
      id: 'sin-puesto',
      label: 'Sin puesto',
      value: stats.withoutPosition,
      icon: BriefcaseIcon,
      active: highlight === 'sin-puesto',
      onClick: () => setHighlight((prev) => (prev === 'sin-puesto' ? null : 'sin-puesto')),
    },
    {
      id: 'dept-sin-jefe',
      label: 'Áreas sin jefe',
      value: stats.departmentsWithoutHead,
      icon: BuildingOffice2Icon,
      active: highlight === 'departamento-sin-jefe',
      onClick: () =>
        setHighlight((prev) =>
          prev === 'departamento-sin-jefe' ? null : 'departamento-sin-jefe',
        ),
    },
    {
      id: 'dept-sin-pais',
      label: 'Áreas sin país',
      value: stats.departmentsWithoutCountry,
      icon: GlobeAmericasIcon,
      active: filters.countryId === NO_COUNTRY,
      onClick: () =>
        patchFilters({ countryId: filters.countryId === NO_COUNTRY ? '' : NO_COUNTRY }),
    },
  ];

  const detail = (
    <OrgDetailPanel
      chart={chart}
      node={selectedNode}
      canManage={canManage}
      onClose={() => setSelectedId(null)}
      onSelectEmployee={selectEmployee}
    />
  );

  return (
    <div className="p-4 sm:p-6">
      {/* Impresión: se esconde TODO menos el área del organigrama (la barra
          lateral del admin y la barra de la pantalla viven fuera de este
          árbol, por eso el truco de visibility). */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #organigrama-print, #organigrama-print * { visibility: visible !important; }
          #organigrama-print { position: absolute; left: 0; top: 0; width: 100%; }
          .org-no-print { display: none !important; }
          .org-scroll {
            overflow: visible !important;
            border: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          .org-zoom { transform: none !important; width: 100% !important; }
          @page { size: landscape; margin: 8mm; }
        }
      `}</style>

      {/* Encabezado */}
      <div className="org-no-print mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organigrama</h1>
          <p className="text-gray-600">
            Directores Generales, departamentos, jefaturas y equipos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            title="Volver a consultar el organigrama"
          >
            <ArrowPathIcon className={`mr-1 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Link href="/admin/rrhh/empleados">
            <Button variant="secondary" size="sm">
              Empleados
            </Button>
          </Link>
          <Link href="/admin/rrhh">
            <Button variant="secondary" size="sm">
              Volver a RRHH
            </Button>
          </Link>
        </div>
      </div>

      {isError ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ExclamationTriangleIcon className="mx-auto mb-4 h-12 w-12 text-red-400" />
            <h2 className="mb-1 text-lg font-bold text-gray-900">
              No se pudo cargar el organigrama
            </h2>
            <p className="mb-4 text-gray-600">Revisa tu conexión e intenta de nuevo.</p>
            <Button variant="outline" onClick={() => refetch()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <OrganigramaSkeleton />
      ) : isEmpty ? (
        <Card>
          <CardContent className="py-12 text-center">
            <UserGroupIcon className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <h2 className="mb-1 text-lg font-bold text-gray-900">Aún no hay expedientes</h2>
            <p className="mb-4 text-gray-600">
              Impórtalos desde Empleados y el organigrama se arma solo.
            </p>
            <Link href="/admin/rrhh/empleados">
              <Button>Ir a Empleados</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <OrgToolbar
            filters={filters}
            onFiltersChange={patchFilters}
            onClearFilters={() => {
              setFilters(EMPTY_ORG_FILTERS);
              setHighlight(null);
            }}
            countries={chart.countries}
            departments={chart.departments}
            branches={chart.branches}
            includeInactive={includeInactive}
            onIncludeInactiveChange={setIncludeInactive}
            matches={search.count}
            showTreeControls={tab === 'jerarquia'}
            showZoom={tab === 'jerarquia' && !isMobile}
            zoom={zoom}
            onZoomChange={setZoom}
            onExpandAll={expandAll}
            onCollapseAll={collapseAll}
            onPrint={handlePrint}
            onExportCsv={handleExport}
          />

          <div id="organigrama-print">
            {/* Tarjetas de resumen: cada hueco es un clic */}
            <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
              {cards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={card.onClick}
                  className={`rounded-xl border bg-white p-3 text-left transition-colors hover:border-[#3E667D] ${
                    card.active ? 'border-[#3E667D] ring-2 ring-[#3E667D]/25' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <card.icon className="h-3.5 w-3.5" />
                    {card.label}
                  </div>
                  <p className="mt-1 text-xl font-bold text-gray-900">{card.value}</p>
                </button>
              ))}
            </div>

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="org-no-print">
                <TabsTrigger value="jerarquia">Jerarquía</TabsTrigger>
                <TabsTrigger value="departamentos">Departamentos</TabsTrigger>
                <TabsTrigger value="sucursales">Sucursales</TabsTrigger>
              </TabsList>

              <TabsContent value="jerarquia" className="mt-4">
                <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-4">
                  <div className="min-w-0">
                    {roots.length === 0 ? (
                      <Card>
                        <CardContent className="py-12 text-center text-gray-600">
                          Ningún nodo coincide con los filtros.
                        </CardContent>
                      </Card>
                    ) : (
                      <OrgTree
                        roots={roots}
                        collapsed={collapsed}
                        forcedOpen={forcedOpen}
                        highlighted={highlighted}
                        selectedId={selectedId}
                        zoom={zoom}
                        variant={isMobile ? 'list' : 'tree'}
                        onToggle={toggleNode}
                        onSelect={(node) => setSelectedId(node.id)}
                        onOpenEmployee={openEmployee}
                      />
                    )}
                  </div>

                  {!isBelowXl && (
                    <aside className="org-no-print hidden xl:block">
                      <div className="sticky top-28 max-h-[calc(100vh-9rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-4">
                        {detail}
                      </div>
                    </aside>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="departamentos" className="mt-4">
                <OrgDepartmentsView
                  chart={chart}
                  employees={visibleEmployees}
                  departments={visibleDepartments}
                  canManage={canManage}
                  onSelectEmployee={selectEmployee}
                />
              </TabsContent>

              <TabsContent value="sucursales" className="mt-4">
                <OrgBranchesView
                  chart={chart}
                  employees={visibleEmployees}
                  onSelectEmployee={selectEmployee}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* < xl (y siempre que la selección venga de otra pestaña): panel lateral */}
          <Sheet
            open={!!selectedId && (isBelowXl || tab !== 'jerarquia')}
            onOpenChange={(open) => {
              if (!open) setSelectedId(null);
            }}
          >
            <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Ficha del organigrama</SheetTitle>
              </SheetHeader>
              <div className="px-4 pb-8">{detail}</div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}

function OrganigramaSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      <Skeleton className="h-[26rem] w-full" />
    </div>
  );
}
