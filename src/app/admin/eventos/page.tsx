'use client';

// Eventos — listado. Backend: GET /events.
// De venta: cada evento es un producto de tipo 'event' que las sucursales
// asignadas cobran en el POS; al cobrar se emiten los boletos.
// Privados (por invitación): no se venden; llevan su lista de invitados.

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRightIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TicketIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui/DataTable';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useEvents } from '@/hooks/useEvents';
import { EventStatusBadge, PrivateEventBadge } from '@/components/admin/events/EventBadges';
import {
  eventErrorMessage,
  formatAllotment,
  formatEventDate,
  formatEventTime,
} from '@/lib/events/format';
import {
  EVENT_STATUS_LABEL,
  EVENT_STATUSES,
  UNLIMITED_ALLOTMENT,
  type EventAccessFilter,
  type EventDto,
  type EventStatus,
} from '@/types/events';

const PAGE_SIZE = 25;

const ACCESS_OPTIONS: { value: EventAccessFilter; label: string }[] = [
  { value: 'sale', label: 'De venta (boletos en el POS)' },
  { value: 'invitation', label: 'Privados (por invitación)' },
];

const isPrivate = (ev: EventDto) => ev.accessMode === 'invitation';

export default function EventosPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [access, setAccess] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim(), 350);

  const query = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: (status || undefined) as EventStatus | undefined,
      // Sin filtro el API solo regresa los de venta: aquí se piden todos.
      accessMode: (access || 'all') as EventAccessFilter,
      page,
      limit: PAGE_SIZE,
    }),
    [debouncedSearch, status, access, page],
  );
  const { data, isLoading, isFetching, isError, error } = useEvents(query);

  const columns: DataTableColumn<EventDto>[] = [
    {
      key: 'name',
      header: 'Evento',
      render: (ev) => (
        <div className="min-w-0">
          <Link
            href={`/admin/eventos/${ev.id}`}
            className="font-medium text-gray-900 hover:text-[#3E667D] hover:underline"
          >
            {ev.name}
          </Link>
          <p className="mt-0.5 font-mono text-xs text-gray-400">
            {ev.code}
            {isPrivate(ev) && <PrivateEventBadge className="ml-1.5 font-sans" />}
            {ev.linkedProduct && (
              <span className="ml-1.5 font-sans text-[11px] text-[#3E667D]">· producto del catálogo</span>
            )}
          </p>
          {ev.speaker && <p className="text-xs text-gray-500">{ev.speaker}</p>}
        </div>
      ),
    },
    {
      key: 'eventDate',
      header: 'Fecha',
      render: (ev) => (
        <div className="text-sm">
          <p className="text-gray-900">{formatEventDate(ev.eventDate)}</p>
          {ev.startTime && <p className="text-xs text-gray-500">{formatEventTime(ev.startTime)}</p>}
        </div>
      ),
    },
    {
      key: 'venue',
      header: 'Sede / Ciudad',
      render: (ev) => (
        <div className="text-sm">
          <p className="text-gray-900">{ev.venueName || '—'}</p>
          <p className="text-xs text-gray-500">
            {[ev.city, ev.state].filter(Boolean).join(', ') || ev.countryCode}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (ev) => <EventStatusBadge status={ev.status} privateEvent={isPrivate(ev)} />,
    },
    {
      key: 'branches',
      header: 'Sucursales',
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
      render: (ev) => (
        <span className="text-sm text-gray-700">{isPrivate(ev) ? '—' : ev.stats.branches}</span>
      ),
    },
    {
      key: 'allotted',
      header: 'Asignados / Vendidos',
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
      render: (ev) =>
        isPrivate(ev) ? (
          <span className="text-sm text-gray-400">No se vende</span>
        ) : (
          <span className="text-sm text-gray-700">
            {formatAllotment(ev.stats.allotted, UNLIMITED_ALLOTMENT)}
            <span className="text-gray-400"> / </span>
            {ev.stats.soldUnits.toLocaleString('es-MX')}
          </span>
        ),
    },
    {
      key: 'tickets',
      header: 'Boletos emitidos / Ingresados',
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
      render: (ev) =>
        isPrivate(ev) ? (
          <span className="text-sm text-gray-700" title="Invitados en la lista y lugares que suman">
            {(ev.guestStats?.guests ?? 0).toLocaleString('es-MX')} invitados
            <span className="text-gray-400"> · </span>
            {(ev.guestStats?.seats ?? 0).toLocaleString('es-MX')} lugares
          </span>
        ) : (
          <span className="text-sm text-gray-700">
            {ev.stats.ticketsIssued.toLocaleString('es-MX')}
            <span className="text-gray-400"> / </span>
            <span className={ev.stats.ticketsCheckedIn > 0 ? 'text-emerald-700' : ''}>
              {ev.stats.ticketsCheckedIn.toLocaleString('es-MX')}
            </span>
          </span>
        ),
    },
    {
      key: 'actions',
      header: '',
      cellClassName: 'text-right',
      render: (ev) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/eventos/${ev.id}${isPrivate(ev) ? '?tab=invitados' : ''}`}>
            Ver
            <ArrowRightIcon className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ];

  const total = data?.total ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <TicketIcon className="h-9 w-9" />
                <h1 className="text-3xl font-bold sm:text-4xl">Eventos</h1>
              </div>
              <p className="text-base text-white/80 sm:text-lg">
                Venta de boletos en el POS con entrada por QR, y eventos privados por invitación
              </p>
            </div>
            <Button
              asChild
              className="bg-white font-semibold text-[#3E667D] hover:bg-white/90"
              size="lg"
            >
              <Link href="/admin/eventos/nuevo">
                <PlusIcon className="h-5 w-5" />
                Nuevo evento
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-3 md:grid-cols-[1fr_240px_220px]">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, clave, ponente o ciudad…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <SearchableSelect
                options={ACCESS_OPTIONS}
                value={access}
                onChange={(v) => {
                  setAccess(v);
                  setPage(1);
                }}
                allLabel="De venta y privados"
              />
              <SearchableSelect
                options={EVENT_STATUSES.map((s) => ({ value: s, label: EVENT_STATUS_LABEL[s] }))}
                value={status}
                onChange={(v) => {
                  setStatus(v);
                  setPage(1);
                }}
                allLabel="Todos los estados"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista */}
        <Card>
          <CardContent className="p-0">
            {isError ? (
              <div className="p-10 text-center">
                <p className="font-medium text-red-700">
                  {eventErrorMessage(error, 'No se pudieron cargar los eventos.')}
                </p>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={data?.items ?? []}
                getRowKey={(ev) => ev.id}
                isLoading={isLoading}
                minWidthClassName="min-w-[1000px]"
                emptyState={
                  <div className="py-6 text-center">
                    <TicketIcon className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                    <p className="font-medium text-gray-600">No hay eventos</p>
                    <p className="mt-1 text-sm text-gray-400">
                      {debouncedSearch || status || access
                        ? 'Ningún evento coincide con los filtros.'
                        : 'Crea el primero con “Nuevo evento”.'}
                    </p>
                  </div>
                }
              />
            )}
            {total > 0 && (
              <div className="px-4 pb-4">
                <DataTablePagination
                  currentPage={page}
                  pageSize={PAGE_SIZE}
                  totalItems={total}
                  onPageChange={setPage}
                  isLoading={isFetching}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
