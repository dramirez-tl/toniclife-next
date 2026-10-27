'use client';

// Ficha del evento: encabezado con estado y cifras, acciones de estado
// (activar / cerrar / cancelar) y pestañas Datos · Sucursales · Boletos · Entrada.

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  MapPinIcon,
  PencilSquareIcon,
  TicketIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { EventStatusBadge } from '@/components/admin/events/EventBadges';
import { EventForm } from '@/components/admin/events/EventForm';
import { EventImageCard } from '@/components/admin/events/EventImageCard';
import { EventProductsTab } from '@/components/admin/events/EventProductsTab';
import { EventBranchesTab } from '@/components/admin/events/EventBranchesTab';
import { EventTicketsTab } from '@/components/admin/events/EventTicketsTab';
import { EventCheckInTab } from '@/components/admin/events/EventCheckInTab';
import { useQueryFilters } from '@/hooks/useQueryFilters';
import { useEvent, useUpdateEvent } from '@/hooks/useEvents';
import { eventsService } from '@/services/events.service';
import { saveBlob } from '@/lib/download';
import {
  eventErrorMessage,
  formatAllotment,
  formatEventDate,
  formatEventMoney,
  formatEventSchedule,
} from '@/lib/events/format';
import { eventToForm, toUpdateInput, type EventFormValues } from '@/lib/events/form';
import {
  EVENT_STATUS_HELP,
  EVENT_STATUS_LABEL,
  UNLIMITED_ALLOTMENT,
  type EventDto,
  type EventStatus,
} from '@/types/events';

const TABS = ['datos', 'claves', 'sucursales', 'boletos', 'entrada'] as const;
type TabId = (typeof TABS)[number];
const isTab = (v: string): v is TabId => (TABS as readonly string[]).includes(v);

interface StatusAction {
  to: EventStatus;
  label: string;
  destructive?: boolean;
  description: string;
  confirmText?: string;
}

/** Qué botones de estado se ofrecen desde cada estado. */
const STATUS_ACTIONS: Record<EventStatus, StatusAction[]> = {
  draft: [
    {
      to: 'active',
      label: 'Activar venta',
      description: 'Las sucursales asignadas podrán cobrar el boleto en el POS desde ahora.',
    },
    {
      to: 'cancelled',
      label: 'Cancelar evento',
      destructive: true,
      description: 'El evento no se venderá. Úsalo solo si el evento no se va a realizar.',
      confirmText: 'CANCELAR',
    },
  ],
  active: [
    {
      to: 'closed',
      label: 'Cerrar venta',
      description:
        'El POS dejará de vender el boleto. Los boletos ya emitidos siguen vigentes para la entrada.',
    },
    {
      to: 'cancelled',
      label: 'Cancelar evento',
      destructive: true,
      description:
        'El POS dejará de vender el boleto. Úsalo solo si el evento no se va a realizar.',
      confirmText: 'CANCELAR',
    },
  ],
  closed: [
    {
      to: 'active',
      label: 'Reabrir venta',
      description: 'Las sucursales asignadas volverán a cobrar el boleto en el POS.',
    },
    {
      to: 'cancelled',
      label: 'Cancelar evento',
      destructive: true,
      description: 'Úsalo solo si el evento no se va a realizar.',
      confirmText: 'CANCELAR',
    },
  ],
  cancelled: [
    {
      to: 'draft',
      label: 'Volver a borrador',
      description: 'El evento regresa a borrador: no se vende hasta que lo actives de nuevo.',
    },
  ],
};

export default function EventoDetallePage() {
  return (
    <Suspense fallback={<Skeleton className="m-8 h-96" />}>
      <EventoDetalleContent />
    </Suspense>
  );
}

function EventoDetalleContent() {
  const params = useParams();
  const id = (params?.id as string) || '';
  const { get, setParams } = useQueryFilters({ tab: 'datos' });
  const tabParam = get('tab');
  const tab: TabId = isTab(tabParam) ? tabParam : 'datos';

  const { data: event, isLoading, isError, error } = useEvent(id);
  const updateMutation = useUpdateEvent();
  const [pendingAction, setPendingAction] = useState<StatusAction | null>(null);
  const [downloading, setDownloading] = useState(false);

  // Excel del evento (resumen por sucursal, ventas y boletos): lo pidió
  // Operaciones para el FOCADE (14-oct-2026).
  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      const blob = await eventsService.downloadReport(id);
      saveBlob(
        blob,
        `evento-${event?.code ?? id}.xlsx`,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
    } catch (e) {
      toast.error(eventErrorMessage(e, 'No se pudo descargar el reporte.'));
    } finally {
      setDownloading(false);
    }
  };

  const initialForm = useMemo<EventFormValues | undefined>(
    () => (event ? eventToForm(event) : undefined),
    [event],
  );

  const handleSave = async (values: EventFormValues) => {
    try {
      await updateMutation.mutateAsync({ id, input: toUpdateInput(values) });
      toast.success('Evento actualizado');
    } catch (e) {
      toast.error(eventErrorMessage(e, 'No se pudo guardar el evento.'));
    }
  };

  const handleStatus = async () => {
    if (!pendingAction) return;
    try {
      await updateMutation.mutateAsync({ id, input: { status: pendingAction.to } });
      toast.success(`Evento ${EVENT_STATUS_LABEL[pendingAction.to].toLowerCase()}`);
      setPendingAction(null);
    } catch (e) {
      toast.error(eventErrorMessage(e, 'No se pudo cambiar el estado.'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#3E667D]" />
          <span className="text-gray-600">Cargando evento…</span>
        </div>
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="mb-2 text-xl font-semibold text-gray-900">No se pudo cargar el evento</h2>
          <p className="mb-4 text-gray-600">
            {eventErrorMessage(error, 'El evento no existe o no tienes acceso.')}
          </p>
          <Link href="/admin/eventos" className="text-[#3E667D] hover:underline">
            Volver a Eventos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <EventHeader
        event={event}
        actions={STATUS_ACTIONS[event.status] ?? []}
        onAction={setPendingAction}
        isPending={updateMutation.isPending}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-3 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadReport}
            disabled={downloading}
            title="Excel con el resumen por sucursal, las ventas de las claves y los boletos del evento"
          >
            <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
            {downloading ? 'Generando…' : 'Descargar reporte (Excel)'}
          </Button>
        </div>
        <Tabs value={tab} onValueChange={(v) => setParams({ tab: v })} className="gap-4">
          <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="datos" className="px-4">Datos</TabsTrigger>
            <TabsTrigger value="claves" className="px-4">Claves</TabsTrigger>
            <TabsTrigger value="sucursales" className="px-4">Sucursales</TabsTrigger>
            <TabsTrigger value="boletos" className="px-4">Boletos</TabsTrigger>
            <TabsTrigger value="entrada" className="px-4">Entrada</TabsTrigger>
          </TabsList>

          <TabsContent value="datos">
            <div className="mx-auto max-w-5xl space-y-6">
              <EventImageCard event={event} />
              <EventForm
                mode="edit"
                initial={initialForm}
                onSubmit={handleSave}
                isPending={updateMutation.isPending}
              />
            </div>
          </TabsContent>
          <TabsContent value="claves">
            <EventProductsTab event={event} />
          </TabsContent>
          <TabsContent value="sucursales">
            <EventBranchesTab event={event} />
          </TabsContent>
          <TabsContent value="boletos">
            <EventTicketsTab event={event} />
          </TabsContent>
          <TabsContent value="entrada">
            <EventCheckInTab event={event} />
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog
        open={!!pendingAction}
        onOpenChange={(o) => !o && setPendingAction(null)}
        title={pendingAction?.label ?? ''}
        description={pendingAction?.description}
        confirmLabel={pendingAction?.label ?? 'Confirmar'}
        confirmText={pendingAction?.confirmText}
        destructive={pendingAction?.destructive}
        isPending={updateMutation.isPending}
        onConfirm={handleStatus}
      >
        <p>
          <span className="font-medium">{event.name}</span>{' '}
          <span className="font-mono text-xs text-gray-500">{event.code}</span>
        </p>
      </ConfirmDialog>
    </div>
  );
}

function EventHeader({
  event,
  actions,
  onAction,
  isPending,
}: {
  event: EventDto;
  actions: StatusAction[];
  onAction: (a: StatusAction) => void;
  isPending: boolean;
}) {
  const s = event.stats;
  const place = [event.venueName, event.city, event.state].filter(Boolean).join(' · ');
  const schedule = formatEventSchedule(event);
  // Cada tarjeta explica qué cuenta y da un ejemplo con los números reales del
  // evento (27-oct-2026: "no se entiende"). Definiciones = events.service.ts.
  const n = (v: number) => v.toLocaleString('es-MX');
  const unlimited = s.allotted >= UNLIMITED_ALLOTMENT;
  const mainCode = event.productCode || event.code;
  const cuadra = !unlimited && s.soldUnits + s.remaining === s.allotted;
  const claves = (event.products ?? []).filter((p) => p.isActive);
  const emitidosDetalle = claves.length
    ? claves
        .map(
          (p) =>
            `${p.productCode}${p.label ? ` ${p.label}` : ''} ${n(p.soldUnits)}${p.ticketsPerUnit > 1 ? ` × ${p.ticketsPerUnit}` : ''}`,
        )
        .join(' + ')
    : null;
  const emitidosSuma = claves.reduce((acc, p) => acc + p.soldUnits * p.ticketsPerUnit, 0);
  const pctIngresados = s.ticketsIssued > 0 ? Math.round((s.ticketsCheckedIn / s.ticketsIssued) * 100) : 0;
  const chips: { label: string; value: string; accent?: string; hint: string; example?: string }[] = [
    {
      label: 'Sucursales',
      value: n(s.branches),
      hint: event.linkedProduct
        ? 'Sucursales con existencia del producto del boleto: solo ellas lo venden en su POS.'
        : 'Sucursales con boletos asignados: solo ellas ven el evento en su POS.',
      example: `Ej.: ${n(s.branches)} sucursales pueden cobrar la clave ${mainCode}.`,
    },
    {
      label: 'Asignados',
      value: formatAllotment(s.allotted, UNLIMITED_ALLOTMENT),
      hint: unlimited
        ? 'Sin tope: cada sucursal vende sin límite de boletos.'
        : event.linkedProduct
          ? 'Total repartido entre las sucursales: lo que aún tienen en existencia más lo ya vendido desde que se creó el evento.'
          : 'Total de boletos repartidos entre las sucursales (suma de lo asignado a cada una en la pestaña Sucursales).',
      example: unlimited
        ? undefined
        : cuadra
          ? `Ej.: ${n(s.allotted)} = ${n(s.soldUnits)} vendidos + ${n(s.remaining)} restantes.`
          : `Ej.: ${n(s.allotted)} repartidos; ${n(s.remaining)} siguen disponibles.`,
    },
    {
      label: 'Restantes',
      value: unlimited ? 'Sin límite' : n(s.remaining),
      hint: unlimited
        ? 'No se descuenta nada: no hay tope.'
        : 'Boletos que todavía se pueden vender (existencia de la clave principal en esas sucursales). En 0, el POS marca AGOTADO.',
      example: unlimited
        ? undefined
        : cuadra
          ? `Ej.: ${n(s.allotted)} asignados − ${n(s.soldUnits)} vendidos = ${n(s.remaining)}.`
          : `Ej.: quedan ${n(s.remaining)} por vender.`,
    },
    {
      label: 'Vendidos',
      value: n(s.soldUnits),
      hint: `Unidades cobradas de la clave principal ${mainCode} en ventas completadas desde que se creó el evento; una venta cancelada deja de contar.`,
      example: `Ej.: ${n(s.soldUnits)} compras${event.ticketsPerUnit > 1 ? `, cada una con ${event.ticketsPerUnit} boletos` : ', un boleto cada una'}.`,
    },
    {
      label: 'Boletos emitidos',
      value: n(s.ticketsIssued),
      hint: 'Boletos vigentes con QR generados al cobrar, contando todas las claves del evento (titular + invitado). No incluye cancelados.',
      example: emitidosDetalle
        ? `Ej.: ${emitidosDetalle} = ${n(emitidosSuma)}${emitidosSuma !== s.ticketsIssued ? ` (vigentes: ${n(s.ticketsIssued)})` : ''}.`
        : `Ej.: ${n(s.ticketsIssued)} boletos enviados por correo con su QR.`,
    },
    {
      label: 'Ingresados',
      value: n(s.ticketsCheckedIn),
      accent: 'text-emerald-700',
      hint: 'Boletos ya escaneados en la puerta el día del evento (pestaña Entrada).',
      example: `Ej.: ${n(s.ticketsCheckedIn)} de ${n(s.ticketsIssued)} han entrado${s.ticketsIssued > 0 ? ` (${pctIngresados} %)` : ''}.`,
    },
    {
      label: 'Cancelados',
      value: n(s.ticketsCancelled),
      accent: s.ticketsCancelled > 0 ? 'text-red-700' : undefined,
      hint: 'Boletos anulados porque su venta se canceló: ya no sirven para entrar y no cuentan en emitidos.',
      example: `Ej.: ${n(s.ticketsCancelled)} boletos cancelados${s.ticketsCancelled > 0 ? '; en la entrada su QR sale como "cancelado"' : ''}.`,
    },
  ];

  return (
    <div className="border-b bg-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Link
              href="/admin/eventos"
              className="mt-1 rounded-lg p-2 transition-colors hover:bg-gray-100"
              aria-label="Regresar a Eventos"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <TicketIcon className="h-7 w-7 shrink-0 text-[#3E667D]" />
                <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
                <span className="rounded-lg bg-[#3E667D]/5 px-2 py-0.5 font-mono text-sm font-semibold text-[#3E667D] ring-1 ring-[#3E667D]/10">
                  {event.code}
                </span>
                <EventStatusBadge status={event.status} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
                  {formatEventDate(event.eventDate)}
                  {schedule ? ` · ${schedule}` : ''}
                </span>
                {place && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPinIcon className="h-4 w-4 text-gray-400" />
                    {place}
                  </span>
                )}
                <span>
                  {formatEventMoney(event.ticketPrice, event.currencyCode)}
                  {event.ticketsPerUnit > 1 ? ` · ${event.ticketsPerUnit} boletos por unidad` : ''}
                </span>
              </div>
              {event.linkedProduct && (
                <p className="mt-1.5 inline-flex flex-wrap items-center gap-1.5 text-sm text-gray-700">
                  <LinkIcon className="h-4 w-4 text-[#3E667D]" />
                  Producto vinculado:{' '}
                  <span className="font-mono font-semibold text-[#3E667D]">
                    {event.productCode || event.code}
                  </span>
                  <span>— {event.productName}</span>
                </p>
              )}
              {event.productId && (
                <Link
                  href={`/admin/productos/${event.productId}/editar`}
                  className="mt-1 flex w-fit items-center gap-1.5 text-sm font-medium text-[#3E667D] hover:underline"
                  title="Abrir la ficha del producto del boleto: precio, imágenes, existencias, fiscal"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  Editar producto del boleto
                </Link>
              )}
              {(event.products?.length ?? 0) > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5" title="Claves que generan boletos">
                  {event.products.map((p) => (
                    <span
                      key={p.productId}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs ${
                        p.isMain
                          ? 'border-[#a7c1e2] bg-[#C8DDF2]/30 text-[#2f5165]'
                          : 'border-gray-200 bg-gray-50 text-gray-600'
                      } ${p.isActive ? '' : 'opacity-60 line-through'}`}
                      title={p.productName}
                    >
                      <span className="font-mono font-semibold">{p.productCode}</span>
                      {p.label && <span>· {p.label}</span>}
                      {p.ticketsPerUnit > 1 && <span className="text-gray-400">×{p.ticketsPerUnit}</span>}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-1 text-xs text-gray-400">{EVENT_STATUS_HELP[event.status]}</p>
            </div>
          </div>

          {actions.length > 0 && (
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {actions.map((a) => (
                <Button
                  key={a.to}
                  type="button"
                  variant={a.destructive ? 'outline' : 'default'}
                  className={a.destructive ? 'border-red-200 text-red-700 hover:bg-red-50' : ''}
                  onClick={() => onAction(a)}
                  disabled={isPending}
                >
                  {a.label}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {chips.map((c) => (
            <div
              key={c.label}
              className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
              title={c.example ? `${c.hint}\n${c.example}` : c.hint}
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{c.label}</p>
              <p className={`text-lg font-bold tabular-nums ${c.accent ?? 'text-gray-900'}`}>{c.value}</p>
              <p className="mt-1 text-[11px] leading-snug text-gray-500">{c.hint}</p>
              {c.example && <p className="mt-0.5 text-[11px] italic leading-snug text-gray-400">{c.example}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
