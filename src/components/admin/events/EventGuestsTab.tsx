'use client';

// EventGuestsTab - Lista de invitados de un evento privado: resumen, filtros,
// tabla paginada, alta / edición / baja de un invitado, baja de varios, carga
// masiva (Excel o lista pegada), descarga de la lista en Excel y envío de las
// invitaciones (correo y/o WhatsApp) con el estado de cada una.
//
// Quitar no borra: el invitado queda fuera de la lista y se puede regresar
// desde "Ver los quitados".

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArrowUturnLeftIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui/DataTable';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  useBulkRemoveEventGuests,
  useEventGuests,
  useRemoveEventGuest,
  useRestoreEventGuest,
} from '@/hooks/useEventGuests';
import { eventGuestsService } from '@/services/event-guests.service';
import { saveBlob } from '@/lib/download';
import { eventErrorMessage } from '@/lib/events/format';
import { capacityNote, formatGuestPhone, guestFlagLabel } from '@/lib/events/guests';
import { INVITATION_STATUS_LABEL } from '@/lib/events/invitations';
import type { EventDto } from '@/types/events';
import {
  GUEST_FLAG_HELP,
  GUEST_FLAG_LABEL,
  GUEST_FLAGS,
  GUEST_KIND_LABEL,
  GUEST_KINDS,
  GUEST_STATUS_LABEL,
  GUEST_STATUSES,
  type EventGuestDto,
  type EventGuestsQuery,
  type GuestContactFilter,
  type GuestFlag,
  type GuestInvitationFilter,
  type GuestKind,
  type GuestStatus,
} from '@/types/event-guests';
import { EventGuestDialog } from './EventGuestDialog';
import { EventGuestsImportDialog } from './EventGuestsImportDialog';
import { EventInvitationsDialog } from './EventInvitationsDialog';

const PAGE_SIZE = 50;

const STATUS_CLASS: Record<GuestStatus, string> = {
  invited: 'border-gray-200 bg-gray-50 text-gray-600',
  confirmed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  declined: 'border-red-200 bg-red-50 text-red-700',
};

const CONTACT_OPTIONS: { value: GuestContactFilter; label: string }[] = [
  { value: 'none', label: 'Sin teléfono ni correo' },
  { value: 'no_phone', label: 'Sin teléfono' },
  { value: 'no_email', label: 'Sin correo' },
  { value: 'with_phone', label: 'Con teléfono' },
  { value: 'with_email', label: 'Con correo' },
];

const INVITATION_OPTIONS: { value: GuestInvitationFilter; label: string }[] = [
  { value: 'not_sent', label: 'Invitación sin enviar' },
  { value: 'sent', label: 'Invitación enviada' },
  { value: 'failed', label: 'Invitación: falló' },
];

/** Color del estado de una invitación por canal. */
const INVITATION_CLASS: Record<string, string> = {
  sent: 'text-emerald-700',
  failed: 'text-red-700',
  pending: 'text-gray-400',
  skipped: 'text-gray-400',
};

const FLAG_OPTIONS = [
  { value: 'any', label: 'Con cualquier aviso' },
  ...GUEST_FLAGS.map((f) => ({ value: f, label: GUEST_FLAG_LABEL[f] })),
];

const n = (v: number) => v.toLocaleString('es-MX');

export function EventGuestsTab({ event }: { event: EventDto }) {
  const [search, setSearch] = useState('');
  const [accessType, setAccessType] = useState('');
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [flag, setFlag] = useState('');
  const [contact, setContact] = useState('');
  const [invitation, setInvitation] = useState('');
  const [removed, setRemoved] = useState(false);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim(), 350);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<EventGuestDto | null>(null);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [toRemove, setToRemove] = useState<EventGuestDto | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const query = useMemo<EventGuestsQuery>(
    () => ({
      search: debouncedSearch || undefined,
      accessType: accessType || undefined,
      kind: (kind || undefined) as GuestKind | undefined,
      status: (status || undefined) as GuestStatus | undefined,
      flag: (flag || undefined) as GuestFlag | 'any' | undefined,
      contact: (contact || undefined) as GuestContactFilter | undefined,
      invitation: (invitation || undefined) as GuestInvitationFilter | undefined,
      removed: removed || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [debouncedSearch, accessType, kind, status, flag, contact, invitation, removed, page],
  );
  const { data, isLoading, isFetching, isError, error } = useEventGuests(event.id, query);
  const removeMutation = useRemoveEventGuest(event.id);
  const restoreMutation = useRestoreEventGuest(event.id);
  const bulkMutation = useBulkRemoveEventGuests(event.id);

  const summary = data?.summary;
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const accessTypes = useMemo(
    () => (summary?.byAccess ?? []).map((a) => a.accessType).filter((a) => a !== 'Sin tipo de acceso'),
    [summary],
  );
  const hasFilters = !!(debouncedSearch || accessType || kind || status || flag || contact || invitation);
  // Arreglo estable para el diálogo de invitaciones (su revisión depende de él).
  const selectedIds = useMemo(() => [...selected], [selected]);

  // Cualquier cambio de filtro regresa a la primera página y suelta la selección.
  const filter = (apply: () => void) => {
    apply();
    setPage(1);
    setSelected(new Set());
  };
  const clearFilters = () =>
    filter(() => {
      setSearch('');
      setAccessType('');
      setKind('');
      setStatus('');
      setFlag('');
      setContact('');
      setInvitation('');
    });

  const pageIds = items.map((g) => g.id);
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const toggleAll = (on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of pageIds) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const handleRemove = async () => {
    if (!toRemove) return;
    try {
      await removeMutation.mutateAsync(toRemove.id);
      toast.success(`${toRemove.fullName} salió de la lista`);
      setToRemove(null);
      toggle(toRemove.id, false);
    } catch (e) {
      toast.error(eventErrorMessage(e, 'No se pudo quitar al invitado.'));
    }
  };

  const handleBulkRemove = async () => {
    try {
      const result = await bulkMutation.mutateAsync([...selected]);
      toast.success(
        result.removed === 1 ? '1 invitado salió de la lista' : `${n(result.removed)} invitados salieron de la lista`,
      );
      setSelected(new Set());
      setBulkConfirm(false);
    } catch (e) {
      toast.error(eventErrorMessage(e, 'No se pudieron quitar los invitados.'));
    }
  };

  const handleRestore = async (g: EventGuestDto) => {
    try {
      await restoreMutation.mutateAsync(g.id);
      toast.success(`${g.fullName} regresó a la lista`);
    } catch (e) {
      toast.error(eventErrorMessage(e, 'No se pudo regresar al invitado.'));
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await eventGuestsService.exportXlsx(event.id);
      saveBlob(
        blob,
        `invitados-${event.code}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    } catch (e) {
      toast.error(eventErrorMessage(e, 'No se pudo descargar la lista.'));
    } finally {
      setDownloading(false);
    }
  };

  const columns: DataTableColumn<EventGuestDto>[] = [
    ...(removed
      ? []
      : [
          {
            key: 'select',
            header: '',
            cellClassName: 'w-10',
            render: (g: EventGuestDto) => (
              <Checkbox
                checked={selected.has(g.id)}
                onCheckedChange={(v) => toggle(g.id, v === true)}
                aria-label={`Seleccionar a ${g.fullName}`}
              />
            ),
          },
        ]),
    {
      key: 'name',
      header: 'Invitado',
      render: (g) => (
        <div className="min-w-0">
          <p className="font-medium text-gray-900">{g.fullName}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {GUEST_KIND_LABEL[g.kind]}
            {g.kind === 'distributor' && g.customerNumber && (
              <span className="ml-1 font-mono text-gray-600">#{g.customerNumber}</span>
            )}
            {g.kind === 'companion' && (
              <span>
                {' '}
                de <span className="font-mono text-gray-600">#{g.hostCustomerNumber}</span> {g.hostName}
              </span>
            )}
            {g.kind === 'external' && g.listedNumber && (
              <span className="ml-1 text-gray-400">(ID en la lista: {g.listedNumber})</span>
            )}
          </p>
          {g.kind === 'distributor' && g.customerName && g.customerName !== g.fullName.toUpperCase() && (
            <p className="text-xs text-gray-400">En su ficha: {g.customerName}</p>
          )}
        </div>
      ),
    },
    {
      key: 'access',
      header: 'Tipo de acceso',
      render: (g) => (
        <div className="text-sm">
          <p className="text-gray-900">{g.accessType || <span className="text-gray-400">Sin definir</span>}</p>
          {g.network && <p className="text-xs text-gray-500">Red: {g.network}</p>}
        </div>
      ),
    },
    {
      key: 'seats',
      header: 'Lugares',
      headerClassName: 'text-right',
      cellClassName: 'text-right tabular-nums',
      render: (g) => <span className="text-sm text-gray-900">{g.seats}</span>,
    },
    {
      key: 'contact',
      header: 'A dónde invitarlo',
      render: (g) =>
        g.contactPhone || g.contactEmail ? (
          <div className="text-sm text-gray-700">
            {g.contactPhone && <p className="tabular-nums">{formatGuestPhone(g.contactPhone)}</p>}
            {g.contactEmail && <p className="break-all text-xs text-gray-500">{g.contactEmail}</p>}
          </div>
        ) : (
          <span className="text-sm text-amber-700">Sin teléfono ni correo</span>
        ),
    },
    {
      key: 'invitation',
      header: 'Invitación',
      render: (g) => (
        <div className="text-xs leading-relaxed">
          <p className={INVITATION_CLASS[g.emailStatus] ?? 'text-gray-400'} title={g.emailError ?? g.emailedTo ?? undefined}>
            Correo: {INVITATION_STATUS_LABEL[g.emailStatus] ?? g.emailStatus}
          </p>
          <p
            className={INVITATION_CLASS[g.whatsappStatus] ?? 'text-gray-400'}
            title={g.whatsappError ?? g.whatsappTo ?? undefined}
          >
            WhatsApp: {INVITATION_STATUS_LABEL[g.whatsappStatus] ?? g.whatsappStatus}
          </p>
          {(g.emailStatus === 'failed' || g.whatsappStatus === 'failed') && (
            <p className="mt-0.5 max-w-[220px] text-[11px] leading-snug text-red-600">
              {(g.emailStatus === 'failed' ? g.emailError : null) ?? g.whatsappError}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (g) => (
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className={STATUS_CLASS[g.status]}>
            {GUEST_STATUS_LABEL[g.status]}
          </Badge>
          {g.flags.map((f) => (
            <Badge
              key={f}
              variant="outline"
              className="border-amber-200 bg-amber-50 text-amber-800"
              title={GUEST_FLAG_HELP[f as GuestFlag]}
            >
              {guestFlagLabel(f)}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      cellClassName: 'text-right',
      render: (g) =>
        removed ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleRestore(g)}
            disabled={restoreMutation.isPending}
          >
            <ArrowUturnLeftIcon className="mr-1 h-4 w-4" />
            Regresar a la lista
          </Button>
        ) : (
          <div className="flex justify-end gap-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(g)}>
              <PencilSquareIcon className="mr-1 h-4 w-4" />
              Editar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => setToRemove(g)}
              aria-label={`Quitar a ${g.fullName}`}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        ),
    },
  ];

  const capacity = summary ? capacityNote(summary) : null;
  const cards: { label: string; value: string; hint: string; accent?: string; onClick?: () => void }[] = summary
    ? [
        {
          label: 'Invitados',
          value: n(summary.guests),
          hint: `${n(summary.distributors)} distribuidores · ${n(summary.companions)} acompañantes · ${n(summary.external)} solo por nombre`,
        },
        {
          label: 'Lugares',
          value: n(summary.seats),
          hint: capacity?.text ?? '',
          accent: capacity?.over ? 'text-red-700' : undefined,
        },
        {
          label: 'Confirmaron',
          value: n(summary.confirmed),
          hint: `${n(summary.declined)} dijeron que no asistirán`,
          accent: summary.confirmed > 0 ? 'text-emerald-700' : undefined,
          onClick: () => filter(() => setStatus('confirmed')),
        },
        {
          label: 'Por revisar',
          value: n(summary.flagged),
          hint: 'Con algún aviso de la carga (sin ID, ID que no existe, repetido…)',
          accent: summary.flagged > 0 ? 'text-amber-700' : undefined,
          onClick: () => filter(() => setFlag('any')),
        },
        {
          label: 'Sin contacto',
          value: n(summary.withoutContact),
          hint: `No tienen teléfono ni correo. Con teléfono: ${n(summary.withPhone)} · con correo: ${n(summary.withEmail)}`,
          accent: summary.withoutContact > 0 ? 'text-amber-700' : undefined,
          onClick: () => filter(() => setContact('none')),
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      {/* Resumen */}
      {summary && (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
          {cards.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={c.onClick}
              disabled={!c.onClick}
              className={`rounded-lg border border-gray-100 bg-white px-3 py-2 text-left ${
                c.onClick ? 'cursor-pointer transition-colors hover:border-[#a7c1e2] hover:bg-[#C8DDF2]/10' : 'cursor-default'
              }`}
              title={c.onClick ? 'Clic para ver solo estos' : undefined}
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{c.label}</p>
              <p className={`text-lg font-bold tabular-nums ${c.accent ?? 'text-gray-900'}`}>{c.value}</p>
              <p className="mt-1 text-[11px] leading-snug text-gray-500">{c.hint}</p>
            </button>
          ))}
        </div>
      )}
      {summary && summary.byAccess.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600">
          <span className="font-medium text-gray-700">Por tipo de acceso:</span>
          {summary.byAccess.map((a) => (
            <button
              key={a.accessType}
              type="button"
              onClick={() =>
                a.accessType !== 'Sin tipo de acceso' && filter(() => setAccessType(a.accessType))
              }
              className={`rounded-md border px-2 py-0.5 ${
                accessType === a.accessType
                  ? 'border-[#3E667D] bg-[#C8DDF2]/40 text-[#2f5165]'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              {a.accessType}: {n(a.guests)} invitados / {n(a.seats)} lugares
            </button>
          ))}
        </div>
      )}
      {summary && (summary.emailSent ?? 0) + (summary.whatsappSent ?? 0) + (summary.emailFailed ?? 0) + (summary.whatsappFailed ?? 0) > 0 && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
          <span className="font-medium text-gray-700">Invitaciones enviadas:</span>
          <span>por correo {n(summary.emailSent ?? 0)}</span>
          <span>por WhatsApp {n(summary.whatsappSent ?? 0)}</span>
          {(summary.emailFailed ?? 0) + (summary.whatsappFailed ?? 0) > 0 && (
            <button
              type="button"
              onClick={() => filter(() => setInvitation('failed'))}
              className="text-red-700 hover:underline"
            >
              fallaron {n((summary.emailFailed ?? 0) + (summary.whatsappFailed ?? 0))} (ver)
            </button>
          )}
        </p>
      )}
      {capacity?.over && (
        <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
          {capacity.text}. Sube el aforo en la pestaña Datos o quita invitados.
        </p>
      )}

      {/* Acciones y filtros */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={() => setImporting(true)}>
                <ArrowUpTrayIcon className="mr-2 h-4 w-4" />
                Carga masiva
              </Button>
              <Button type="button" variant="outline" onClick={() => setAdding(true)}>
                <PlusIcon className="mr-2 h-4 w-4" />
                Agregar invitado
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviting(true)}
                disabled={!summary || summary.guests === 0}
                title="Mandar la invitación con los datos del evento y la liga del boleto, por correo y/o WhatsApp"
              >
                <PaperAirplaneIcon className="mr-2 h-4 w-4" />
                Enviar invitaciones
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={removed ? 'default' : 'outline'}
                onClick={() => filter(() => setRemoved((v) => !v))}
                title="Los invitados que se quitaron de la lista (se pueden regresar)"
              >
                {removed ? 'Volver a la lista' : `Ver los quitados${summary ? ` (${n(summary.removed)})` : ''}`}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDownload}
                disabled={downloading || !summary || summary.guests === 0}
                title="Excel con la lista completa: tipo de acceso, nombre, ID, titular, red, lugares, estado, teléfono, correo y avisos"
              >
                <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
                {downloading ? 'Generando…' : 'Descargar lista (Excel)'}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr_1fr]">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, número o red…"
                value={search}
                onChange={(e) => filter(() => setSearch(e.target.value))}
                className="pl-9"
              />
            </div>
            <SearchableSelect
              options={accessTypes.map((a) => ({ value: a, label: a }))}
              value={accessType}
              onChange={(v) => filter(() => setAccessType(v))}
              allLabel="Todos los accesos"
            />
            <SearchableSelect
              options={GUEST_KINDS.map((k) => ({ value: k, label: GUEST_KIND_LABEL[k] }))}
              value={kind}
              onChange={(v) => filter(() => setKind(v))}
              allLabel="Todos (quién es)"
            />
            <SearchableSelect
              options={GUEST_STATUSES.map((s) => ({ value: s, label: GUEST_STATUS_LABEL[s] }))}
              value={status}
              onChange={(v) => filter(() => setStatus(v))}
              allLabel="Todos los estados"
            />
            <SearchableSelect
              options={FLAG_OPTIONS}
              value={flag}
              onChange={(v) => filter(() => setFlag(v))}
              allLabel="Con o sin avisos"
            />
            <SearchableSelect
              options={CONTACT_OPTIONS}
              value={contact}
              onChange={(v) => filter(() => setContact(v))}
              allLabel="Con o sin contacto"
            />
            <SearchableSelect
              options={INVITATION_OPTIONS}
              value={invitation}
              onChange={(v) => filter(() => setInvitation(v))}
              allLabel="Invitación: todas"
            />
          </div>
          {(hasFilters || selected.size > 0) && (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {hasFilters && (
                <button type="button" onClick={clearFilters} className="text-[#3E667D] hover:underline">
                  Quitar filtros
                </button>
              )}
              {selected.size > 0 && (
                <>
                  <span className="text-gray-600">{n(selected.size)} seleccionados</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => setBulkConfirm(true)}
                  >
                    <TrashIcon className="mr-1 h-4 w-4" />
                    Quitar de la lista
                  </Button>
                  <button
                    type="button"
                    onClick={() => setSelected(new Set())}
                    className="text-gray-500 hover:underline"
                  >
                    Soltar selección
                  </button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {isError ? (
            <div className="p-10 text-center">
              <p className="font-medium text-red-700">
                {eventErrorMessage(error, 'No se pudo cargar la lista de invitados.')}
              </p>
            </div>
          ) : (
            <>
              {!removed && items.length > 0 && (
                <label className="flex items-center gap-2 border-b border-gray-100 px-4 py-2 text-xs text-gray-600">
                  <Checkbox checked={allSelected} onCheckedChange={(v) => toggleAll(v === true)} />
                  Seleccionar los {n(items.length)} de esta página
                </label>
              )}
              <DataTable
                columns={columns}
                data={items}
                getRowKey={(g) => g.id}
                isLoading={isLoading}
                minWidthClassName="min-w-[1160px]"
                emptyState={
                  <div className="py-6 text-center">
                    <UserGroupIcon className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                    <p className="font-medium text-gray-600">
                      {removed ? 'No se ha quitado a nadie' : hasFilters ? 'Nadie coincide con los filtros' : 'La lista está vacía'}
                    </p>
                    {!removed && !hasFilters && (
                      <p className="mt-1 text-sm text-gray-400">
                        Sube el Excel de invitados con “Carga masiva” o agrégalos uno por uno.
                      </p>
                    )}
                  </div>
                }
              />
            </>
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

      <EventGuestDialog
        eventId={event.id}
        guest={editing}
        accessTypes={accessTypes}
        open={adding || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setAdding(false);
            setEditing(null);
          }
        }}
      />
      <EventGuestsImportDialog
        eventId={event.id}
        accessTypes={accessTypes}
        open={importing}
        onOpenChange={setImporting}
      />
      <EventInvitationsDialog
        event={event}
        selectedIds={selectedIds}
        accessTypes={accessTypes}
        totalGuests={summary?.guests ?? 0}
        open={inviting}
        onOpenChange={setInviting}
      />
      <ConfirmDialog
        open={!!toRemove}
        onOpenChange={(o) => !o && setToRemove(null)}
        title="Quitar de la lista"
        description="El invitado sale de la lista del evento. No se borra: lo puedes regresar desde “Ver los quitados”."
        confirmLabel="Quitar de la lista"
        destructive
        isPending={removeMutation.isPending}
        onConfirm={handleRemove}
      >
        <p>
          <span className="font-medium">{toRemove?.fullName}</span>
          {toRemove?.accessType ? ` · ${toRemove.accessType}` : ''}
          {toRemove ? ` · ${toRemove.seats} ${toRemove.seats === 1 ? 'lugar' : 'lugares'}` : ''}
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        open={bulkConfirm}
        onOpenChange={setBulkConfirm}
        title={`Quitar ${n(selected.size)} invitados de la lista`}
        description="Salen de la lista del evento. No se borran: los puedes regresar uno por uno desde “Ver los quitados”."
        confirmLabel="Quitar de la lista"
        destructive
        isPending={bulkMutation.isPending}
        onConfirm={handleBulkRemove}
      />
    </div>
  );
}
