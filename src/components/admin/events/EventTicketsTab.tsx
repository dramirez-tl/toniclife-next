'use client';

// EventTicketsTab - Boletos emitidos del evento: filtros, tabla paginada,
// reenvío del correo (con destinatario opcional) y copia de la liga pública.

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  EnvelopeIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  TicketIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DataTable, DataTablePagination, type DataTableColumn } from '@/components/ui/DataTable';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useEventBranches, useEventTickets, useResendTicketEmail } from '@/hooks/useEvents';
import { eventErrorMessage, formatEventTimestamp } from '@/lib/events/format';
import {
  TICKET_STATUS_LABEL,
  TICKET_STATUSES,
  type EventDto,
  type EventTicketDto,
  type TicketStatus,
} from '@/types/events';
import { TicketStatusBadge } from './EventBadges';

const PAGE_SIZE = 50;

const EMAIL_STATUS_LABEL: Record<string, string> = {
  sent: 'Enviado',
  pending: 'Pendiente',
  failed: 'Falló',
  skipped: 'Sin correo',
  none: 'Sin enviar',
};

export function EventTicketsTab({ event }: { event: EventDto }) {
  const [status, setStatus] = useState('');
  const [branchId, setBranchId] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search.trim(), 350);

  const query = useMemo(
    () => ({
      status: (status || undefined) as TicketStatus | undefined,
      branchId: branchId || undefined,
      search: debouncedSearch || undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [status, branchId, debouncedSearch, page],
  );
  const { data, isLoading, isFetching } = useEventTickets(event.id, query);
  const { data: branches } = useEventBranches(event.id);
  const resendMutation = useResendTicketEmail();

  const branchOptions = useMemo(
    () =>
      (branches ?? [])
        .slice()
        .sort((a, b) => a.branchName.localeCompare(b.branchName, 'es', { sensitivity: 'base' }))
        .map((b) => ({ value: b.branchId, label: b.branchName })),
    [branches],
  );

  // ── Reenviar correo ──
  const [resendTicket, setResendTicket] = useState<EventTicketDto | null>(null);
  const [resendTo, setResendTo] = useState('');

  const openResend = (t: EventTicketDto) => {
    setResendTicket(t);
    setResendTo('');
  };

  const handleResend = async () => {
    if (!resendTicket) return;
    const to = resendTo.trim();
    if (to && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      toast.error('El correo no es válido.');
      return;
    }
    if (!to && !resendTicket.attendeeEmail && !resendTicket.emailedTo) {
      toast.error('El boleto no tiene correo: captura uno para reenviarlo.');
      return;
    }
    try {
      const res = await resendMutation.mutateAsync({
        id: event.id,
        ticketId: resendTicket.id,
        to: to || undefined,
      });
      toast.success(
        `Correo enviado a ${res.sentTo}${res.tickets > 1 ? ` (${res.tickets} boletos)` : ''}.`,
      );
      setResendTicket(null);
    } catch (e) {
      toast.error(eventErrorMessage(e, 'No se pudo reenviar el correo.'));
    }
  };

  const copyLink = async (t: EventTicketDto) => {
    try {
      await navigator.clipboard.writeText(t.publicUrl);
      toast.success(`Liga del boleto ${t.ticketNumber} copiada.`);
    } catch {
      toast.error('No se pudo copiar. Cópiala a mano: ' + t.publicUrl);
    }
  };

  const columns: DataTableColumn<EventTicketDto>[] = [
    {
      key: 'ticketNumber',
      header: 'Número',
      render: (t) => (
        <span className="font-mono text-sm font-semibold text-[#3E667D]">{t.ticketNumber}</span>
      ),
    },
    {
      key: 'label',
      header: 'Tipo',
      render: (t) =>
        t.label ? (
          <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-700">
            {t.label}
          </Badge>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        ),
    },
    {
      key: 'attendee',
      header: 'Asistente',
      render: (t) => (
        <div>
          <p className="text-sm text-gray-900">{t.attendeeName || <span className="text-gray-400">Sin nombre</span>}</p>
          {t.customerNumber && (
            <p className="text-xs text-gray-400">Cliente #{t.customerNumber}</p>
          )}
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Correo',
      render: (t) => (
        <span className="text-sm text-gray-700">
          {t.attendeeEmail || <span className="text-gray-400">—</span>}
        </span>
      ),
    },
    {
      key: 'branch',
      header: 'Sucursal',
      render: (t) => <span className="text-sm text-gray-700">{t.branchName || '—'}</span>,
    },
    {
      key: 'sale',
      header: 'Venta',
      render: (t) => (
        <span className="font-mono text-xs text-gray-600">{t.saleNumber || '—'}</span>
      ),
    },
    {
      key: 'issuedAt',
      header: 'Emitido',
      render: (t) => (
        <span className="text-sm text-gray-700">{formatEventTimestamp(t.issuedAt, event.timezone)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (t) => (
        <div className="space-y-1">
          <TicketStatusBadge status={t.status} />
          {t.status === 'checked_in' && t.checkedInAt && (
            <p className="text-xs text-gray-400">
              {formatEventTimestamp(t.checkedInAt, event.timezone)}
              {t.checkedInByName ? ` · ${t.checkedInByName}` : ''}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'emailStatus',
      header: 'Correo enviado',
      render: (t) => (
        <div className="text-sm">
          <p className="text-gray-700">
            {EMAIL_STATUS_LABEL[t.emailStatus] ?? t.emailStatus}
            {t.emailCount > 1 ? ` ×${t.emailCount}` : ''}
          </p>
          {t.emailedAt && (
            <p className="text-xs text-gray-400">
              {formatEventTimestamp(t.emailedAt, event.timezone)}
              {t.emailedTo ? ` · ${t.emailedTo}` : ''}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      cellClassName: 'text-right',
      render: (t) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => openResend(t)}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-[#C8DDF2]/20 hover:text-[#3E667D]"
            title="Reenviar correo"
            aria-label={`Reenviar correo del boleto ${t.ticketNumber}`}
            disabled={t.status === 'cancelled'}
          >
            <EnvelopeIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void copyLink(t)}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-[#C8DDF2]/20 hover:text-[#3E667D]"
            title="Copiar liga del boleto"
            aria-label={`Copiar liga del boleto ${t.ticketNumber}`}
          >
            <LinkIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const total = data?.total ?? 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_200px_240px]">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Número de boleto, asistente, correo o folio de venta…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <SearchableSelect
              options={TICKET_STATUSES.map((s) => ({ value: s, label: TICKET_STATUS_LABEL[s] }))}
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
              allLabel="Todos los estados"
            />
            <SearchableSelect
              options={branchOptions}
              value={branchId}
              onChange={(v) => {
                setBranchId(v);
                setPage(1);
              }}
              allLabel="Todas las sucursales"
              placeholder="Sucursal"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={data?.items ?? []}
            getRowKey={(t) => t.id}
            isLoading={isLoading}
            minWidthClassName="min-w-[1100px]"
            emptyState={
              <div className="py-6 text-center">
                <TicketIcon className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                <p className="font-medium text-gray-600">Sin boletos</p>
                <p className="mt-1 text-sm text-gray-400">
                  {debouncedSearch || status || branchId
                    ? 'Ningún boleto coincide con los filtros.'
                    : 'Los boletos se emiten cuando el POS cobra la venta.'}
                </p>
              </div>
            }
          />
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

      {/* Reenviar correo */}
      <Dialog open={!!resendTicket} onOpenChange={(o) => !o && !resendMutation.isPending && setResendTicket(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reenviar boleto por correo</DialogTitle>
            <DialogDescription>
              {resendTicket ? (
                <>
                  Boleto <span className="font-mono font-semibold">{resendTicket.ticketNumber}</span>
                  {resendTicket.attendeeName ? ` · ${resendTicket.attendeeName}` : ''}
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <p className="text-sm text-gray-600">
              Correo registrado:{' '}
              <span className="font-medium text-gray-900">
                {resendTicket?.attendeeEmail || resendTicket?.emailedTo || 'ninguno'}
              </span>
            </p>
            <div className="grid gap-2">
              <Label htmlFor="resend-to">Enviar a otro correo (opcional)</Label>
              <Input
                id="resend-to"
                type="email"
                value={resendTo}
                onChange={(e) => setResendTo(e.target.value)}
                placeholder="correo@ejemplo.com"
                autoComplete="off"
              />
              <p className="text-xs text-gray-400">
                Vacío = se manda al correo registrado del asistente o del cliente.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResendTicket(null)} disabled={resendMutation.isPending}>
              Cancelar
            </Button>
            <Button onClick={handleResend} disabled={resendMutation.isPending}>
              {resendMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              {resendMutation.isPending ? 'Enviando…' : 'Reenviar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
