'use client';

// OrgDetailPanel - Ficha del nodo seleccionado (persona, departamento o país)
// con las acciones de mando.
//
// Las tres mutaciones ya existían y cada una escribe en un lugar distinto:
//   PATCH /hr/employees/:id     { supervisorId }  → jefe DIRECTO (expediente)
//   PATCH /hr/departments/:id   { headUserId… }   → jefe de departamento (USUARIO)
//   PUT   /hr/org/directors/:id { userId }        → Director General (USUARIO)
//
// Por eso nombrar jefe de departamento o Director General solo se ofrece a
// quien tiene cuenta de acceso: la columna guarda users.id, no employees.id.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowTopRightOnSquareIcon,
  BuildingOffice2Icon,
  GlobeAmericasIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/SearchableSelect';
import { EmployeeAvatar } from '@/components/admin/hr/EmployeeAvatar';
import { useSetOrgDirector, useUpdateDepartment, useUpdateEmployee } from '@/hooks/useHR';
import { apiErrorMessage } from '@/app/admin/rrhh/hr-utils';
import {
  EMPLOYEE_STATUS_LABELS,
  EMPLOYEE_STATUS_VARIANTS,
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYMENT_TYPE_VARIANTS,
  type OrgChart,
  type OrgChartCountry,
  type OrgChartDepartment,
  type OrgChartEmployee,
} from '@/types/hr';
import { buildPersonContext, descendantEmployeeIds, type OrgNode } from './org-utils';

export interface OrgDetailPanelProps {
  chart: OrgChart;
  node: OrgNode | null;
  canManage: boolean;
  onClose: () => void;
  /** Saltar a otra persona desde la cadena de mando o los reportes. */
  onSelectEmployee: (employeeId: string) => void;
}

export function OrgDetailPanel({
  chart,
  node,
  canManage,
  onClose,
  onSelectEmployee,
}: OrgDetailPanelProps) {
  if (!node) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
        Selecciona una tarjeta del organigrama para ver su ficha, su cadena de mando y sus
        reportes directos.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {node.kind === 'employee'
            ? 'Persona'
            : node.kind === 'department'
              ? 'Departamento'
              : node.kind === 'country'
                ? 'País'
                : 'Grupo'}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar ficha"
          className="org-no-print rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {node.employee && (
        <EmployeeDetail
          chart={chart}
          employee={node.employee}
          canManage={canManage}
          onSelectEmployee={onSelectEmployee}
        />
      )}

      {node.department && (
        <DepartmentDetail chart={chart} department={node.department} />
      )}

      {node.country && <CountryDetail chart={chart} country={node.country} canManage={canManage} />}

      {node.kind === 'group' && (
        <div className="rounded-xl border border-dashed border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-800">{node.title}</p>
          <p className="mt-1 text-xs text-gray-500">{node.subtitle}</p>
          <p className="mt-3 text-xs text-gray-500">
            Son los nodos que todavía no tienen a quién colgarse. Asígnales país, departamento o
            jefe directo y se acomodarán solos.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Persona
// ---------------------------------------------------------------------------

interface EmployeeDetailProps {
  chart: OrgChart;
  employee: OrgChartEmployee;
  canManage: boolean;
  onSelectEmployee: (employeeId: string) => void;
}

function EmployeeDetail({
  chart,
  employee,
  canManage,
  onSelectEmployee,
}: EmployeeDetailProps) {
  const updateEmployee = useUpdateEmployee();
  const updateDepartment = useUpdateDepartment();
  const setDirector = useSetOrgDirector();
  const [savingRole, setSavingRole] = useState<string | null>(null);

  const context = useMemo(() => buildPersonContext(chart, employee), [chart, employee]);
  const { department, country } = context;

  // Jefatura y Dirección se guardan como USUARIO (users.id), así que a quien
  // solo tiene expediente no se le ofrecen: en vez de tres botones grises sin
  // explicación se muestra una línea que dice qué falta.
  const canName = employee.hasSystemAccess;

  // Opciones de jefe directo: primero su propio departamento. Se excluyen la
  // persona y sus descendientes para no cerrar un ciclo (A jefe de B, B de A).
  const supervisorOptions = useMemo<SearchableSelectOption[]>(() => {
    const blocked = descendantEmployeeIds(chart, employee.id);
    const same: SearchableSelectOption[] = [];
    const others: SearchableSelectOption[] = [];
    for (const candidate of chart.employees) {
      if (candidate.id === employee.id || blocked.has(candidate.id)) continue;
      const option: SearchableSelectOption = {
        value: candidate.id,
        label: candidate.fullName,
        hint: candidate.jobPositionName ?? 'Sin puesto',
        group:
          candidate.departmentId && candidate.departmentId === employee.departmentId
            ? 'Mismo departamento'
            : 'Otras áreas',
      };
      if (option.group === 'Mismo departamento') same.push(option);
      else others.push(option);
    }
    return [...same, ...others];
  }, [chart, employee]);

  const changeSupervisor = async (value: string) => {
    try {
      await updateEmployee.mutateAsync({
        id: employee.id,
        data: { supervisorId: value || null },
      });
      toast.success(value ? 'Jefe directo actualizado' : 'Se quitó el jefe directo');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'No se pudo actualizar el jefe directo'));
    }
  };

  const assignDepartmentRole = async (role: 'head' | 'subhead', remove = false) => {
    if (!department) return;
    setSavingRole(role);
    try {
      await updateDepartment.mutateAsync({
        id: department.id,
        data:
          role === 'head'
            ? { headUserId: remove ? null : employee.userId }
            : { subheadUserId: remove ? null : employee.userId },
      });
      const noun = role === 'head' ? 'Jefe' : 'Subjefe';
      toast.success(
        remove
          ? `${noun} de ${department.name} liberado`
          : `${employee.fullName} es ${noun.toLowerCase()} de ${department.name}`,
      );
    } catch (error) {
      toast.error(apiErrorMessage(error, 'No se pudo actualizar el departamento'));
    } finally {
      setSavingRole(null);
    }
  };

  const assignDirector = async (remove = false) => {
    if (!country) return;
    setSavingRole('director');
    try {
      await setDirector.mutateAsync({
        countryId: country.id,
        userId: remove ? null : employee.userId,
      });
      toast.success(
        remove
          ? `${country.name} quedó sin Director General`
          : `${employee.fullName} es Director General de ${country.name}`,
      );
    } catch (error) {
      toast.error(apiErrorMessage(error, 'No se pudo asignar al Director General'));
    } finally {
      setSavingRole(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Identidad */}
      <div className="flex items-start gap-3">
        <EmployeeAvatar
          photoUrl={employee.photoUrl}
          name={employee.fullName}
          initials={employee.initials}
          size={72}
        />
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-gray-900">{employee.fullName}</p>
          <p className="font-mono text-xs text-gray-500">{employee.employeeNumber}</p>
          <p className="mt-1 text-sm text-gray-700">
            {employee.jobPositionName ?? <span className="text-amber-700">Sin puesto</span>}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant={EMPLOYEE_STATUS_VARIANTS[employee.status] ?? 'secondary'}>
              {EMPLOYEE_STATUS_LABELS[employee.status] ?? employee.status}
            </Badge>
            <Badge variant={EMPLOYMENT_TYPE_VARIANTS[employee.employmentType] ?? 'secondary'}>
              {EMPLOYMENT_TYPE_LABELS[employee.employmentType]}
            </Badge>
            {!employee.hasSystemAccess && <Badge variant="outline">Sin acceso</Badge>}
            {context.isDepartmentHead && <Badge variant="info">Jefe de área</Badge>}
            {context.isCountryDirector && <Badge variant="info">Director General</Badge>}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-xs">
        <Field label="Departamento" value={department?.name ?? 'Sin departamento'} />
        <Field label="Sucursal" value={employee.branchName ?? 'Sin sucursal'} />
        <Field label="País" value={country?.name ?? 'Sin país'} />
        <Field
          label="Acceso al sistema"
          value={employee.hasSystemAccess ? 'Con cuenta' : 'Solo expediente'}
        />
      </dl>

      <Link href={`/admin/rrhh/empleados/${employee.id}`}>
        <Button variant="outline" size="sm" className="w-full">
          <ArrowTopRightOnSquareIcon className="mr-1 h-4 w-4" />
          Ver expediente completo
        </Button>
      </Link>

      {/* Cadena de mando */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Reporta a
        </h3>
        <ol className="space-y-1">
          {context.chain.map((link, index) => (
            <li
              key={`${link.role}-${index}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <span className="text-[11px] uppercase tracking-wide text-gray-400">
                {link.role}
              </span>
              {link.name ? (
                link.employeeId ? (
                  <button
                    type="button"
                    onClick={() => onSelectEmployee(link.employeeId as string)}
                    className="truncate text-right text-[#3E667D] hover:underline"
                  >
                    {link.name}
                  </button>
                ) : (
                  <span className="truncate text-right text-gray-700">{link.name}</span>
                )
              ) : (
                <span className="text-right text-amber-700">Sin asignar</span>
              )}
            </li>
          ))}
        </ol>
      </section>

      {/* Reportes directos */}
      <section>
        <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <UserGroupIcon className="h-3.5 w-3.5" />
          Reportes directos ({context.reports.length})
        </h3>
        {context.reports.length === 0 ? (
          <p className="text-xs text-gray-500">Nadie le reporta todavía.</p>
        ) : (
          <ul className="space-y-1">
            {context.reports.map((report) => (
              <li key={report.id}>
                <button
                  type="button"
                  onClick={() => onSelectEmployee(report.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm hover:bg-gray-50"
                >
                  <EmployeeAvatar
                    photoUrl={report.photoUrl}
                    name={report.fullName}
                    initials={report.initials}
                    size={24}
                  />
                  <span className="truncate">{report.fullName}</span>
                  <span className="ml-auto truncate text-[11px] text-gray-400">
                    {report.jobPositionName ?? 'Sin puesto'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Acciones de mando (hr:manage) */}
      {canManage && (
        <section className="org-no-print space-y-3 rounded-xl border border-gray-200 bg-gray-50/70 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Acciones
          </h3>

          <div>
            <Label className="mb-1 block text-xs text-muted-foreground">
              Asignar jefe directo
            </Label>
            <SearchableSelect
              options={supervisorOptions}
              value={employee.supervisorId ?? ''}
              onChange={changeSupervisor}
              allLabel="Sin jefe directo"
              allValue=""
              placeholder="Buscar colaborador"
              disabled={updateEmployee.isPending}
            />
            <p className="mt-1 text-[11px] text-gray-400">
              No aparecen ni la propia persona ni quienes ya le reportan (evita ciclos).
            </p>
          </div>

          {department && (context.isDepartmentHead || context.isDepartmentSubhead || canName) && (
            <div className="flex flex-wrap gap-2">
              {context.isDepartmentHead ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={savingRole === 'head'}
                  onClick={() => assignDepartmentRole('head', true)}
                >
                  Quitar como jefe de {department.name}
                </Button>
              ) : (
                canName && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={savingRole === 'head'}
                    onClick={() => assignDepartmentRole('head')}
                  >
                    Nombrar jefe de {department.name}
                  </Button>
                )
              )}

              {context.isDepartmentSubhead ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={savingRole === 'subhead'}
                  onClick={() => assignDepartmentRole('subhead', true)}
                >
                  Quitar como subjefe
                </Button>
              ) : (
                canName && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={savingRole === 'subhead'}
                    onClick={() => assignDepartmentRole('subhead')}
                  >
                    Nombrar subjefe
                  </Button>
                )
              )}
            </div>
          )}

          {country && (context.isCountryDirector || canName) && (
            <div>
              {context.isCountryDirector ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={savingRole === 'director'}
                  onClick={() => assignDirector(true)}
                >
                  Quitar como Director General de {country.name}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={savingRole === 'director'}
                  onClick={() => assignDirector()}
                >
                  Nombrar Director General de {country.name}
                </Button>
              )}
            </div>
          )}

          {/* El motivo se DICE, no se insinúa con un botón gris: un botón
              deshabilitado no recibe el puntero (disabled:pointer-events-none)
              ni el foco, así que su `title` no se lee nunca. */}
          {!canName && (department || country) && (
            <p className="text-[11px] text-amber-700">
              Jefatura y Dirección se guardan como usuario: crea la cuenta de acceso de esta
              persona para poder nombrarla.
            </p>
          )}

          {!department && (
            <p className="text-[11px] text-amber-700">
              Sin departamento no se puede nombrar jefatura. Asígnalo desde el expediente.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Departamento y país
// ---------------------------------------------------------------------------

function DepartmentDetail({
  chart,
  department,
}: {
  chart: OrgChart;
  department: OrgChartDepartment;
}) {
  const people = chart.employees.filter((e) => e.departmentId === department.id);
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#3E667D]/10">
          <BuildingOffice2Icon className="h-6 w-6 text-[#3E667D]" />
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold text-gray-900">{department.name}</p>
          <code className="text-xs text-gray-400">{department.code}</code>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-xs">
        <Field label="País" value={department.countryName ?? 'Sin país'} />
        <Field label="Plantilla" value={`${people.length} persona(s)`} />
        <Field label="Jefe" value={department.headName ?? 'Sin jefe'} />
        <Field label="Subjefe" value={department.subheadName ?? 'Sin subjefe'} />
      </dl>

      <p className="text-xs text-gray-500">
        El jefe, el subjefe y el país se editan en la pestaña Departamentos de esta misma
        pantalla.
      </p>

      <Link href="/admin/rrhh/departamentos">
        <Button variant="outline" size="sm" className="w-full">
          Ir al catálogo de departamentos
        </Button>
      </Link>
    </div>
  );
}

function CountryDetail({
  chart,
  country,
  canManage,
}: {
  chart: OrgChart;
  country: OrgChartCountry;
  canManage: boolean;
}) {
  const setDirector = useSetOrgDirector();

  const options = useMemo<SearchableSelectOption[]>(
    () =>
      chart.employees
        .filter((e) => e.hasSystemAccess && e.userId)
        .map((e) => ({
          value: e.userId as string,
          label: e.fullName,
          hint: e.jobPositionName ?? 'Sin puesto',
        })),
    [chart.employees],
  );

  const change = async (userId: string) => {
    try {
      await setDirector.mutateAsync({ countryId: country.id, userId: userId || null });
      toast.success(
        userId ? 'Director General actualizado' : `${country.name} quedó sin Director General`,
      );
    } catch (error) {
      toast.error(apiErrorMessage(error, 'No se pudo asignar al Director General'));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#3E667D]/10">
          <GlobeAmericasIcon className="h-6 w-6 text-[#3E667D]" />
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold text-gray-900">{country.name}</p>
          <code className="text-xs text-gray-400">{country.code}</code>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-xs">
        <Field label="Director General" value={country.directorName ?? 'Sin asignar'} />
        <Field label="Departamentos" value={String(country.departmentsCount)} />
        <Field label="Personas" value={String(country.employeesCount)} />
      </dl>

      {canManage && (
        <div className="org-no-print">
          <Label className="mb-1 block text-xs text-muted-foreground">
            Director General de {country.name}
          </Label>
          <SearchableSelect
            options={options}
            value={country.directorUserId ?? ''}
            onChange={change}
            allLabel="Sin Director General"
            allValue=""
            placeholder="Buscar colaborador con cuenta"
            disabled={setDirector.isPending}
          />
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 px-2 py-1.5">
      <dt className="text-[10px] uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="truncate text-gray-800">{value}</dd>
    </div>
  );
}
