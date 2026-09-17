'use client';

// Panel principal de RRHH.
//
// Todas las tarjetas salen de GET /hr/dashboard (se calcula en SQL): antes
// este panel hacía Promise.all con /hr/expenses —que no existe— y las seis
// tarjetas se quedaban en cero.
//
// El árbol /admin/rrhh/* ya está gateado por rrhh/layout.tsx (hr:read).

import Link from 'next/link';
import {
  UserGroupIcon,
  ClockIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  BuildingOfficeIcon,
  IdentificationIcon,
  CameraIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useHrDashboard } from '@/hooks/useHR';
import { formatDateOnly } from './hr-utils';

export default function RrhhDashboardPage() {
  const { data, isLoading, error } = useHrDashboard();

  const employees = data?.employees;
  const attendance = data?.attendanceToday;
  const vacations = data?.vacations;

  return (
    <div className="p-6">
      {/* Encabezado */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-3">
          <UserGroupIcon className="h-8 w-8 text-[#3E667D]" />
          <h1 className="text-2xl font-bold text-gray-900">Recursos Humanos</h1>
        </div>
        <p className="text-gray-600">
          Expedientes, checador, horarios y vacaciones del personal.
        </p>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 p-4 text-red-700">
            <ExclamationTriangleIcon className="h-6 w-6 shrink-0" />
            <p className="text-sm">
              No se pudieron cargar los indicadores del panel. Intenta de nuevo.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Plantilla */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Plantilla
      </h2>
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Empleados"
          value={employees?.total}
          hint={`${employees?.active ?? 0} activos`}
          icon={<UserGroupIcon className="h-5 w-5 text-blue-600" />}
          tone="bg-blue-100"
          loading={isLoading}
        />
        <StatCard
          label="En nómina"
          value={employees?.nomina}
          hint={`${employees?.externos ?? 0} externos / honorarios`}
          icon={<ClipboardDocumentListIcon className="h-5 w-5 text-emerald-600" />}
          tone="bg-emerald-100"
          loading={isLoading}
        />
        <StatCard
          label="Sin horario"
          value={employees?.withoutSchedule}
          hint="No se les puede calcular retardo"
          icon={<ClockIcon className="h-5 w-5 text-amber-600" />}
          tone="bg-amber-100"
          loading={isLoading}
          href="/admin/rrhh/horarios"
        />
        <StatCard
          label="Sin número NOI"
          value={employees?.withoutNoi}
          hint="Pendientes de amarrar con Aspel NOI"
          icon={<ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />}
          tone="bg-orange-100"
          loading={isLoading}
        />
      </div>

      {/* Asistencia de hoy */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Asistencia de hoy
        {attendance?.date ? (
          <span className="ml-2 font-normal normal-case text-gray-400">
            {formatDateOnly(attendance.date)}
          </span>
        ) : null}
      </h2>
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Presentes"
          value={attendance?.present}
          icon={<ClockIcon className="h-5 w-5 text-green-600" />}
          tone="bg-green-100"
          loading={isLoading}
          href="/admin/rrhh/asistencia?tab=resumen"
        />
        <StatCard
          label="Faltas"
          value={attendance?.absent}
          hint="Con horario y sin ninguna checada"
          icon={<ExclamationTriangleIcon className="h-5 w-5 text-red-600" />}
          tone="bg-red-100"
          loading={isLoading}
          href="/admin/rrhh/asistencia?tab=resumen"
        />
        <StatCard
          label="Retardos"
          value={attendance?.late}
          hint="Fuera de la tolerancia del horario"
          icon={<ClockIcon className="h-5 w-5 text-amber-600" />}
          tone="bg-amber-100"
          loading={isLoading}
          href="/admin/rrhh/asistencia?tab=resumen"
        />
        <StatCard
          label="Turnos abiertos"
          value={attendance?.openShifts}
          hint="Entraron y no han registrado salida"
          icon={<ClockIcon className="h-5 w-5 text-indigo-600" />}
          tone="bg-indigo-100"
          loading={isLoading}
          href="/admin/rrhh/asistencia?tab=resumen"
        />
      </div>

      {/* Expedientes por completar */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Pendientes
      </h2>
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Sin foto"
          value={employees?.withoutPhoto}
          hint="No se puede imprimir su gafete"
          icon={<CameraIcon className="h-5 w-5 text-purple-600" />}
          tone="bg-purple-100"
          loading={isLoading}
          href="/admin/rrhh/empleados"
        />
        <StatCard
          label="Sin gafete"
          value={employees?.withoutBadge}
          hint="Falta generar el código"
          icon={<IdentificationIcon className="h-5 w-5 text-sky-600" />}
          tone="bg-sky-100"
          loading={isLoading}
          href="/admin/rrhh/empleados"
        />
        <StatCard
          label="Vacaciones por aprobar"
          value={vacations?.pending}
          icon={<CalendarDaysIcon className="h-5 w-5 text-orange-600" />}
          tone="bg-orange-100"
          loading={isLoading}
          href="/admin/rrhh/vacaciones"
        />
      </div>

      {/* Accesos */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Ir a
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <QuickLink
          href="/admin/rrhh/empleados"
          title="Empleados"
          description="Expedientes, alta, gafetes y carga masiva"
          icon={<UserGroupIcon className="h-7 w-7 text-blue-600" />}
          tone="bg-blue-100"
        />
        <QuickLink
          href="/admin/rrhh/horarios"
          title="Horarios"
          description="Entrada, comida y salida con tolerancias"
          icon={<ClockIcon className="h-7 w-7 text-amber-600" />}
          tone="bg-amber-100"
        />
        <QuickLink
          href="/admin/rrhh/asistencia"
          title="Asistencia"
          description="Checadas del día, retardos y faltas"
          icon={<ClockIcon className="h-7 w-7 text-green-600" />}
          tone="bg-green-100"
        />
        <QuickLink
          href="/admin/rrhh/departamentos"
          title="Departamentos"
          description="Catálogo y jefaturas"
          icon={<BuildingOfficeIcon className="h-7 w-7 text-slate-600" />}
          tone="bg-slate-100"
        />
        <QuickLink
          href="/admin/rrhh/organigrama"
          title="Organigrama"
          description="Dirección por país y plantilla"
          icon={<ClipboardDocumentListIcon className="h-7 w-7 text-indigo-600" />}
          tone="bg-indigo-100"
        />
        <QuickLink
          href="/admin/rrhh/vacaciones"
          title="Vacaciones"
          description="Solicitudes y aprobaciones"
          icon={<CalendarDaysIcon className="h-7 w-7 text-orange-600" />}
          tone="bg-orange-100"
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
  tone,
  loading,
  href,
}: {
  label: string;
  value: number | undefined;
  hint?: string;
  icon: React.ReactNode;
  tone: string;
  loading: boolean;
  href?: string;
}) {
  const content = (
    <Card className={href ? 'h-full transition-shadow hover:shadow-md' : 'h-full'}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>
            {icon}
          </div>
          <div className="min-w-0">
            {loading ? (
              <Skeleton className="mb-1 h-7 w-12" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">
                {(value ?? 0).toLocaleString('es-MX')}
              </p>
            )}
            <p className="text-xs font-medium text-gray-700">{label}</p>
            {hint ? <p className="mt-0.5 text-[11px] text-gray-500">{hint}</p> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function QuickLink({
  href,
  title,
  description,
  icon,
  tone,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <Link href={href}>
      <Card className="h-full cursor-pointer transition-shadow hover:shadow-lg">
        <CardContent className="flex items-center gap-4 p-6">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${tone}`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-gray-900">{title}</p>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
          <ArrowRightIcon className="h-5 w-5 shrink-0 text-gray-400" />
        </CardContent>
      </Card>
    </Link>
  );
}
