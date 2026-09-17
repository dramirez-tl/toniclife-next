'use client';

// OrgNodeCard - La tarjeta de un nodo del organigrama (país/director,
// departamento, grupo o persona).
//
// Ancho FIJO (220px, 260px en la raíz de país) a propósito: el árbol se lee
// por columnas y con anchos variables los conectores de 1px dejan de caer
// sobre el centro de la tarjeta.

import { Badge } from '@/components/ui/badge';
import { EmployeeAvatar } from '@/components/admin/hr/EmployeeAvatar';
import {
  ArrowTopRightOnSquareIcon,
  BuildingOffice2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  GlobeAmericasIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import {
  EMPLOYEE_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  EMPLOYMENT_TYPE_VARIANTS,
  type EmployeeStatus,
} from '@/types/hr';
import type { OrgNode } from './org-utils';

/** Punto de estado del expediente (activo, vacaciones, inactivo, baja). */
const STATUS_DOT: Record<EmployeeStatus, string> = {
  active: 'bg-emerald-500',
  inactive: 'bg-gray-400',
  on_leave: 'bg-amber-500',
  terminated: 'bg-red-500',
};

export interface OrgNodeCardProps {
  node: OrgNode;
  selected: boolean;
  /** Coincide con la búsqueda o con la tarjeta de resumen activa. */
  highlighted: boolean;
  collapsed: boolean;
  onSelect: () => void;
  onToggle: () => void;
  /** Doble clic / botón: abre el expediente. */
  onOpen?: () => void;
  /** Modo lista (móvil): sin ancho fijo y más compacto. */
  compact?: boolean;
}

export function OrgNodeCard({
  node,
  selected,
  highlighted,
  collapsed,
  onSelect,
  onToggle,
  onOpen,
  compact = false,
}: OrgNodeCardProps) {
  const isCountry = node.kind === 'country';
  const isDepartment = node.kind === 'department';
  const isGroup = node.kind === 'group';
  const employee = node.employee;

  const width = compact ? 'w-full' : isCountry ? 'w-[260px]' : 'w-[220px]';

  const tone = isCountry
    ? 'border-transparent bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white'
    : isDepartment
      ? 'border-[#3E667D]/25 bg-[#C8DDF2]/25'
      : isGroup
        ? 'border-dashed border-gray-300 bg-gray-50'
        : 'border-gray-200 bg-white';

  const state = selected
    ? 'border-[#3E667D] ring-2 ring-[#3E667D]/35'
    : highlighted
      ? 'border-amber-400 ring-2 ring-amber-300 bg-amber-50'
      : '';

  return (
    <div className={`${width} shrink-0`}>
      <div
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        onClick={onSelect}
        onDoubleClick={() => onOpen?.()}
        onKeyDown={(e) => {
          // Solo la tarjeta: sin este corte el preventDefault se comería el
          // Enter/Espacio del botón "Ver expediente" que vive dentro (su
          // click ES la acción por defecto de esa tecla) y con teclado no
          // habría forma de abrir el expediente.
          if (e.target !== e.currentTarget) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
          }
        }}
        className={`w-full rounded-xl border p-3 text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3E667D] ${tone} ${state}`}
      >
        {isCountry && (
          <div className="flex items-center gap-3">
            {node.country?.directorName ? (
              <EmployeeAvatar
                photoUrl={node.photoUrl}
                name={node.country.directorName}
                initials={node.initials}
                size={44}
                className="ring-2 ring-white/40"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15">
                <GlobeAmericasIcon className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{node.title}</p>
              <p className="text-[11px] uppercase tracking-wide text-white/70">
                Director General
              </p>
              <p className="truncate text-xs text-white/85">{node.subtitle}</p>
            </div>
          </div>
        )}

        {isDepartment && (
          <div>
            <div className="flex items-start gap-2">
              <BuildingOffice2Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#3E667D]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-900">{node.title}</p>
                <p className="truncate text-xs text-gray-500">
                  {node.department?.headName ? (
                    <>Jefe: {node.department.headName}</>
                  ) : (
                    <span className="text-amber-700">Sin jefe asignado</span>
                  )}
                </p>
                {node.department?.subheadName && (
                  <p className="truncate text-[11px] text-gray-400">
                    Subjefe: {node.department.subheadName}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-[11px] text-gray-500">
              <UserGroupIcon className="h-3.5 w-3.5" />
              {node.department?.employeesCount ?? 0} en plantilla
              {!node.department?.countryId && (
                <span className="ml-auto text-amber-700">Sin país</span>
              )}
            </div>
          </div>
        )}

        {isGroup && (
          <div>
            <p className="text-sm font-semibold text-gray-700">{node.title}</p>
            {node.subtitle && <p className="text-xs text-gray-500">{node.subtitle}</p>}
          </div>
        )}

        {employee && (
          <div>
            <div className="flex items-start gap-2">
              <EmployeeAvatar
                photoUrl={employee.photoUrl}
                name={employee.fullName}
                initials={employee.initials}
                size={compact ? 32 : 38}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {employee.fullName}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {employee.jobPositionName ?? (
                    <span className="text-amber-700">Sin puesto</span>
                  )}
                </p>
              </div>
              <span
                className={`mt-1 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[employee.status] ?? 'bg-gray-400'}`}
                title={EMPLOYEE_STATUS_LABELS[employee.status] ?? employee.status}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1">
              {employee.branchName && (
                <span className="truncate rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">
                  {employee.branchName}
                </span>
              )}
              {employee.employmentType !== 'nomina' && (
                <Badge
                  variant={EMPLOYMENT_TYPE_VARIANTS[employee.employmentType] ?? 'secondary'}
                  className="text-[10px]"
                >
                  {EMPLOYMENT_TYPE_LABELS[employee.employmentType]}
                </Badge>
              )}
              {!employee.hasSystemAccess && (
                <Badge variant="outline" className="text-[10px] text-gray-500">
                  Sin acceso
                </Badge>
              )}
              {onOpen && (
                <button
                  type="button"
                  title="Ver expediente"
                  aria-label={`Ver expediente de ${employee.fullName}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen();
                  }}
                  className="ml-auto rounded p-1 text-[#3E667D] hover:bg-[#3E667D]/10"
                >
                  <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Colapsar/expandir: el contador dice cuánta gente se esconde. */}
      {node.children.length > 0 && (
        <div className={compact ? 'mt-1' : 'mt-1 flex justify-center'}>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            className="org-no-print inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-600 shadow-sm hover:border-[#3E667D] hover:text-[#3E667D]"
          >
            {collapsed ? (
              <ChevronRightIcon className="h-3 w-3" />
            ) : (
              <ChevronDownIcon className="h-3 w-3" />
            )}
            {node.descendants}
          </button>
        </div>
      )}
    </div>
  );
}
