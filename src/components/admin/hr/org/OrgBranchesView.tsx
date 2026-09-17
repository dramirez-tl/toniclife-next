'use client';

// OrgBranchesView - Quién está en cada sucursal, agrupado por país.
//
// Solo salen las sucursales CON personal: el catálogo tiene decenas de puntos
// de venta y una lista de tarjetas vacías no dice nada. Cada persona muestra su
// puesto y su jefe directo, que es el dato que se busca cuando alguien
// pregunta "¿quién manda en esta tienda?".

import { useMemo } from 'react';
import { BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/card';
import { EmployeeAvatar } from '@/components/admin/hr/EmployeeAvatar';
import type { OrgChart, OrgChartEmployee } from '@/types/hr';
import { groupByBranch } from './org-utils';

export interface OrgBranchesViewProps {
  chart: OrgChart;
  /** Padrón ya filtrado por la barra. */
  employees: OrgChartEmployee[];
  onSelectEmployee: (employeeId: string) => void;
}

export function OrgBranchesView({
  chart,
  employees,
  onSelectEmployee,
}: OrgBranchesViewProps) {
  const groups = useMemo(() => groupByBranch(chart, employees), [chart, employees]);
  const supervisorNames = useMemo(
    () => new Map(chart.employees.map((e) => [e.id, e.fullName])),
    [chart.employees],
  );

  const withoutBranch = employees.filter((e) => !e.branchId);

  if (groups.length === 0 && withoutBranch.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BuildingStorefrontIcon className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-gray-600">Ninguna sucursal tiene personal con estos filtros.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.countryName}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {group.countryName} · {group.branches.length} sucursal
            {group.branches.length === 1 ? '' : 'es'}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group.branches.map(({ branch, people }) => (
              <Card key={branch.id} className="border-gray-200">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{branch.name}</p>
                      <code className="text-xs text-gray-400">{branch.code}</code>
                    </div>
                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {people.length}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {people.map((person) => (
                      <li key={person.id}>
                        <button
                          type="button"
                          onClick={() => onSelectEmployee(person.id)}
                          className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-gray-50"
                        >
                          <EmployeeAvatar
                            photoUrl={person.photoUrl}
                            name={person.fullName}
                            initials={person.initials}
                            size={28}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-gray-900">
                              {person.fullName}
                            </span>
                            <span className="block truncate text-[11px] text-gray-500">
                              {person.jobPositionName ?? 'Sin puesto'}
                              {' · '}
                              {person.supervisorId
                                ? `Jefe: ${supervisorNames.get(person.supervisorId) ?? '—'}`
                                : 'Sin jefe directo'}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}

      {withoutBranch.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Sin sucursal · {withoutBranch.length} persona
            {withoutBranch.length === 1 ? '' : 's'}
          </h2>
          <Card className="border-dashed border-gray-300">
            <CardContent className="flex flex-wrap gap-2 p-4">
              {withoutBranch.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => onSelectEmployee(person.id)}
                  className="flex items-center gap-1.5 rounded-full border border-gray-200 py-0.5 pl-0.5 pr-2 text-xs text-gray-700 hover:border-[#3E667D] hover:text-[#3E667D]"
                >
                  <EmployeeAvatar
                    photoUrl={person.photoUrl}
                    name={person.fullName}
                    initials={person.initials}
                    size={20}
                  />
                  <span className="max-w-[10rem] truncate">{person.fullName}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
