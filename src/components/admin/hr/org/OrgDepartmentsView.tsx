'use client';

// OrgDepartmentsView - Vista por departamento: jefe, subjefe y país editables
// en línea, más la plantilla agrupada por puesto.
//
// Jefe y subjefe son USUARIOS (departments.head_user_id / subhead_user_id), así
// que el selector solo ofrece colaboradores con cuenta de acceso. Si el jefe
// actual no tiene expediente, se agrega su nombre como opción para no perderlo
// al guardar otra cosa.

import { useMemo } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { BuildingOffice2Icon, UserGroupIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/SearchableSelect';
import { EmployeeAvatar } from '@/components/admin/hr/EmployeeAvatar';
import { useUpdateDepartment } from '@/hooks/useHR';
import { apiErrorMessage } from '@/app/admin/rrhh/hr-utils';
import type { OrgChart, OrgChartDepartment, OrgChartEmployee } from '@/types/hr';
import { groupByJobPosition } from './org-utils';

export interface OrgDepartmentsViewProps {
  chart: OrgChart;
  /** Padrón ya filtrado por la barra. */
  employees: OrgChartEmployee[];
  /** Departamentos ya filtrados por la barra. */
  departments: OrgChartDepartment[];
  canManage: boolean;
  onSelectEmployee: (employeeId: string) => void;
}

export function OrgDepartmentsView({
  chart,
  employees,
  departments,
  canManage,
  onSelectEmployee,
}: OrgDepartmentsViewProps) {
  const updateDepartment = useUpdateDepartment();

  // Colaboradores CON cuenta: son los únicos que pueden ser jefe o subjefe.
  const userOptions = useMemo<SearchableSelectOption[]>(
    () =>
      chart.employees
        .filter((e) => e.hasSystemAccess && e.userId)
        .map((e) => ({
          value: e.userId as string,
          label: e.fullName,
          hint: e.jobPositionName ?? 'Sin puesto',
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'es')),
    [chart.employees],
  );

  const countryOptions = useMemo<SearchableSelectOption[]>(
    () => chart.countries.map((c) => ({ value: c.id, label: c.name, hint: c.code })),
    [chart.countries],
  );

  const peopleByDepartment = useMemo(() => {
    const map = new Map<string, OrgChartEmployee[]>();
    for (const employee of employees) {
      if (!employee.departmentId) continue;
      const list = map.get(employee.departmentId) ?? [];
      list.push(employee);
      map.set(employee.departmentId, list);
    }
    return map;
  }, [employees]);

  const save = async (
    department: OrgChartDepartment,
    data: { headUserId?: string | null; subheadUserId?: string | null; countryId?: string | null },
    message: string,
  ) => {
    try {
      await updateDepartment.mutateAsync({ id: department.id, data });
      toast.success(message);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'No se pudo actualizar el departamento'));
    }
  };

  /** Agrega al jefe/subjefe actual si no está entre los expedientes con cuenta. */
  const withCurrent = (
    userId: string | null,
    name: string | null,
  ): SearchableSelectOption[] =>
    userId && !userOptions.some((o) => o.value === userId)
      ? [...userOptions, { value: userId, label: name ?? 'Usuario sin expediente' }]
      : userOptions;

  if (departments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BuildingOffice2Icon className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-gray-600">No hay departamentos con los filtros actuales.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="org-no-print flex items-center justify-between gap-2">
        <p className="text-sm text-gray-600">
          {departments.length} departamento{departments.length === 1 ? '' : 's'}
        </p>
        <Link href="/admin/rrhh/departamentos">
          <Button variant="secondary" size="sm">
            Catálogo de departamentos
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {departments.map((department) => {
          const people = peopleByDepartment.get(department.id) ?? [];
          const groups = groupByJobPosition(people);

          return (
            <Card key={department.id} className="border-gray-200">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#3E667D]/10">
                      <BuildingOffice2Icon className="h-5 w-5 text-[#3E667D]" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900">{department.name}</p>
                      <code className="text-xs text-gray-400">{department.code}</code>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <UserGroupIcon className="h-3.5 w-3.5" />
                      {people.length} / {department.employeesCount}
                    </span>
                    {!department.headUserId && <Badge variant="warning">Sin jefe</Badge>}
                    {!department.countryId && <Badge variant="warning">Sin país</Badge>}
                  </div>
                </div>

                {canManage ? (
                  <div className="org-no-print grid gap-2 sm:grid-cols-3">
                    <div>
                      <Label className="mb-1 block text-xs text-muted-foreground">Jefe</Label>
                      <SearchableSelect
                        options={withCurrent(department.headUserId, department.headName)}
                        value={department.headUserId ?? ''}
                        onChange={(v) =>
                          save(
                            department,
                            { headUserId: v || null },
                            v ? 'Jefe del departamento actualizado' : 'Departamento sin jefe',
                          )
                        }
                        allLabel="Sin jefe"
                        allValue=""
                        placeholder="Buscar colaborador"
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs text-muted-foreground">Subjefe</Label>
                      <SearchableSelect
                        options={withCurrent(department.subheadUserId, department.subheadName)}
                        value={department.subheadUserId ?? ''}
                        onChange={(v) =>
                          save(
                            department,
                            { subheadUserId: v || null },
                            v ? 'Subjefe actualizado' : 'Departamento sin subjefe',
                          )
                        }
                        allLabel="Sin subjefe"
                        allValue=""
                        placeholder="Buscar colaborador"
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs text-muted-foreground">País</Label>
                      <SearchableSelect
                        options={countryOptions}
                        value={department.countryId ?? ''}
                        onChange={(v) =>
                          save(
                            department,
                            { countryId: v || null },
                            v ? 'País del departamento actualizado' : 'Departamento sin país',
                          )
                        }
                        allLabel="Sin país"
                        allValue=""
                        placeholder="Selecciona un país"
                      />
                    </div>
                  </div>
                ) : (
                  <dl className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <dt className="text-gray-400">Jefe</dt>
                      <dd className="truncate text-gray-800">
                        {department.headName ?? 'Sin jefe'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-400">Subjefe</dt>
                      <dd className="truncate text-gray-800">
                        {department.subheadName ?? 'Sin subjefe'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-400">País</dt>
                      <dd className="truncate text-gray-800">
                        {department.countryName ?? 'Sin país'}
                      </dd>
                    </div>
                  </dl>
                )}

                {/* Plantilla por puesto */}
                {people.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    Sin personal asignado con los filtros actuales.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {groups.map((group) => (
                      <div key={group.position}>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                          {group.position} · {group.people.length}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {group.people.map((person) => (
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
                              <span className="max-w-[9rem] truncate">{person.fullName}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
