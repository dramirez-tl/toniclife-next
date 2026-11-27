'use client';

// Comercial › IMPULSA: la ruta de los primeros 90 días de cada nuevo Distribuidor, en 6 Victorias.
// Es una sección con marca propia, separada de RISE Academy (Comercial, 26-nov-2026): su logo, sus
// tres colores (ver `.impulsa` en globals.css) y la tipografía del sitio. Tres pestañas:
//   * Seguimiento: lo que se mide (Día 0 recibido, Sesiones de Arranque hechas, quién llega al Día 7
//     y pasa a la V2) y la lista de nuevos distribuidores con el avance de su Tarjeta de Ruta.
//   * Victorias y contenido: qué Victorias hay, cómo va su producción y qué videos y guías ya están
//     subidos (los videos son lecciones de un curso con nivel V1 … V6; las guías, Materiales).
//   * Mensajes del CRM: los mensajes al Distribuidor y los avisos al Patrocinador, tal como se aprobaron.
// Pantalla del admin: en español, como el resto de Comercial.

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import { CheckCircleIcon, ClipboardDocumentIcon, ClockIcon } from '@heroicons/react/24/outline';
import { PermissionGuard } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useImpulsaAdminCatalog,
  useImpulsaAdminParticipants,
  useImpulsaAdminSummary,
  useImpulsaSetDayZero,
} from '@/hooks/useImpulsa';
import { IMPULSA_LOGO, daysAgoLabel, formatDateOnly, victoryDaysLabel } from '@/lib/impulsa';
import { cn } from '@/lib/utils';
import type { ImpulsaAdminParticipant } from '@/types/impulsa';

const MANAGE_PERMISSIONS = ['courses:manage', 'config'];
const PAGE_SIZE = 25;

function PendingMigrationNote() {
  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
      Falta aplicar la migración 216 de IMPULSA. Mientras tanto se ve en qué día va cada persona, pero nadie puede guardar
      su Tarjeta de Ruta (ni mover un Día 0).
    </p>
  );
}

function StatTile({ label, value, hint, strong }: { label: string; value: number; hint?: string; strong?: boolean }) {
  return (
    <div className={cn('rounded-xl border p-4 shadow-sm', strong ? 'border-primary/30 bg-primary text-primary-foreground' : 'border-gray-200 bg-white')}>
      <p className={cn('text-xs font-medium uppercase tracking-wide', strong ? 'text-primary-foreground/70' : 'text-gray-400')}>{label}</p>
      <p className={cn('mt-1 text-2xl font-bold tabular-nums', strong ? 'text-primary-foreground' : 'text-gray-900')}>
        {value.toLocaleString('es-MX')}
      </p>
      {hint && <p className={cn('mt-1 text-xs', strong ? 'text-primary-foreground/70' : 'text-gray-400')}>{hint}</p>}
    </div>
  );
}

/**
 * Mover a mano el Día 0 de una cuenta (demostración o corrección). Con `participant` se abre desde su
 * renglón; sin él se captura el número: así se puede usar una cuenta de prueba inscrita hace años, que
 * no sale en la lista de nuevos distribuidores.
 */
function DayZeroDialog({ participant, today, onClose }: { participant: ImpulsaAdminParticipant | null; today: string; onClose: () => void }) {
  const [number, setNumber] = useState(participant?.customerNumber ?? '');
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');
  const setDayZero = useImpulsaSetDayZero();
  const customerNumber = number.trim();
  const save = (value: string | null) =>
    setDayZero.mutate(
      { customerNumber, date: value, note: note.trim() || null },
      {
        onSuccess: (result) => {
          toast.success(
            value === null
              ? `#${result.customerNumber} regresó a su fecha de inscripción (Día ${result.day})`
              : `#${result.customerNumber} ahora va en su Día ${result.day}`,
          );
          onClose();
        },
        onError: () => toast.error('No se pudo mover el Día 0. Revisa el número de distribuidor.'),
      },
    );
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="impulsa sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{participant ? `Día 0 de #${participant.customerNumber}` : 'Mover el Día 0 de una cuenta'}</DialogTitle>
          <DialogDescription>
            {participant
              ? `${participant.name}. Hoy va en su Día ${participant.day} (Día 0: ${formatDateOnly(participant.dayZero)}${
                  participant.dayZeroSource === 'manual' ? ', puesto a mano' : ', su inscripción'
                }).`
              : 'Para enseñar la ruta con una cuenta de prueba, o para corregir una fecha de inscripción mal capturada.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!participant && (
            <div>
              <Label htmlFor="impulsa-dz-number">Número de distribuidor</Label>
              <Input
                id="impulsa-dz-number"
                value={number}
                maxLength={20}
                inputMode="numeric"
                placeholder="Ej.: 132681"
                onChange={(e) => setNumber(e.target.value)}
                className="mt-1"
              />
            </div>
          )}
          <div>
            <Label htmlFor="impulsa-dz-date">Nuevo Día 0</Label>
            <Input id="impulsa-dz-date" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="mt-1" />
            <p className="mt-1 text-xs text-gray-500">
              Para una demostración pon la fecha de hoy: la cuenta verá su Día 0 y mañana su Día 1.
            </p>
          </div>
          <div>
            <Label htmlFor="impulsa-dz-note">Motivo</Label>
            <Input
              id="impulsa-dz-note"
              value={note}
              maxLength={200}
              placeholder="Demostración al equipo, corrección…"
              onChange={(e) => setNote(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={setDayZero.isPending || !customerNumber || (participant !== null && participant.dayZeroSource !== 'manual')}
            onClick={() => save(null)}
            title="Quita la fecha puesta a mano"
          >
            Regresar a su inscripción
          </Button>
          <Button type="button" disabled={setDayZero.isPending || !date || !customerNumber} onClick={() => save(date)}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TrackingTab() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [range, setRange] = useState<{ from?: string; to?: string }>({});
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [victory, setVictory] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  // undefined = cerrado; null = se captura el número; un renglón = esa persona.
  const [editing, setEditing] = useState<ImpulsaAdminParticipant | null | undefined>(undefined);

  const summary = useImpulsaAdminSummary(range);
  const list = useImpulsaAdminParticipants({ ...range, search: appliedSearch, victory, page, limit: PAGE_SIZE });
  const s = summary.data;
  const rows = list.data?.data ?? [];
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // La fecha de negocio la da el API (hora Centro); sin resumen aún no se puede mover un Día 0.
  const today = s?.today ?? '';

  const apply = () => {
    if (from && to && from > to) {
      toast.error('La fecha "desde" no puede ser mayor que "hasta"');
      return;
    }
    setRange({ ...(from ? { from } : {}), ...(to ? { to } : {}) });
    setAppliedSearch(search.trim());
    setPage(1);
  };
  const pickVictory = (number: number) => {
    setVictory((current) => (current === number ? undefined : number));
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {s && !s.ready && <PendingMigrationNote />}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div>
            <Label htmlFor="impulsa-from" className="text-xs text-gray-500">Inscritos desde</Label>
            <Input id="impulsa-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-auto" />
          </div>
          <div>
            <Label htmlFor="impulsa-to" className="text-xs text-gray-500">Hasta</Label>
            <Input id="impulsa-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-auto" />
          </div>
          <div className="lg:w-72">
            <Label htmlFor="impulsa-search" className="text-xs text-gray-500">Distribuidor</Label>
            <Input
              id="impulsa-search"
              value={search}
              maxLength={100}
              placeholder="Número o nombre (opcional)"
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && apply()}
              className="mt-1"
            />
          </div>
          <Button type="button" onClick={apply} disabled={summary.isFetching || list.isFetching}>
            Aplicar
          </Button>
          <PermissionGuard permissions={MANAGE_PERMISSIONS}>
            <Button
              type="button"
              variant="outline"
              className="lg:ml-auto"
              disabled={!today || s?.ready === false}
              onClick={() => setEditing(null)}
              title="Para una demostración con una cuenta de prueba, o para corregir una fecha"
            >
              Mover el Día 0 de una cuenta
            </Button>
          </PermissionGuard>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Día 0 = fecha de inscripción. Sin fechas se toman los inscritos de los últimos 90 días (los que van en su ruta).
          {s ? ` Rango actual: ${formatDateOnly(s.from)} a ${formatDateOnly(s.to)}.` : ''}
        </p>
      </div>

      {summary.isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : summary.isError || !s ? (
        <p className="text-sm text-red-600">No se pudo cargar el resumen.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="impulsa-admin-stats">
            <StatTile label="Nuevos distribuidores" value={s.totals.enrolled} hint={`${s.totals.inRoute.toLocaleString('es-MX')} en sus primeros 90 días`} strong />
            <StatTile label="Día 0 hecho" value={s.totals.dayZeroDone} hint="Vieron la bienvenida y agendaron" />
            <StatTile label="Sesiones de Arranque hechas" value={s.totals.sessionsDone} hint="Sus 6 casillas marcadas" />
            <StatTile label="Victoria 1 completa" value={s.totals.victoryCompleted} hint={`de ${s.totals.reachedDay7.toLocaleString('es-MX')} que ya llegaron a su Día 7`} />
            <StatTile label="Compromiso Tonic" value={s.totals.commitments} hint="Lo aceptaron" />
            <StatTile label="Usan su Tarjeta de Ruta" value={s.totals.withActivity} hint="Marcaron o registraron algo" />
            {s.activity.slice(0, 2).map((a) => (
              <StatTile key={a.metric} label={a.label} value={a.total} />
            ))}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">En qué Victoria van hoy</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {s.byVictory.map((v) => (
                <button
                  key={v.number}
                  type="button"
                  onClick={() => pickVictory(v.number)}
                  aria-pressed={victory === v.number}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-colors',
                    victory === v.number ? 'border-primary bg-primary/10' : 'border-gray-200 hover:border-primary/50',
                  )}
                >
                  <p className="text-lg font-bold text-impulsa-blue">{v.code}</p>
                  <p className="text-xs text-gray-500">{v.title}</p>
                  <p className="mt-1 text-xl font-bold tabular-nums text-gray-900">{v.count.toLocaleString('es-MX')}</p>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-400">Haz clic en una Victoria para ver solo a quienes van hoy en ella.</p>
          </div>
        </>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Distribuidor</th>
                <th className="px-4 py-3">Patrocinador</th>
                <th className="px-4 py-3">Suc.</th>
                <th className="px-4 py-3 text-right">Día</th>
                <th className="px-4 py-3">Victoria</th>
                <th className="px-4 py-3">Tarjeta de Ruta</th>
                <th className="px-4 py-3 text-right" title="Probaron o compraron · Invitaciones · Presentaciones · Seguimientos">Registro diario</th>
                <th className="px-4 py-3">Última actividad</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="text-gray-800">
              {list.isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400">Cargando…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400">No hay nuevos distribuidores con esos filtros</td>
                </tr>
              ) : (
                rows.map((p) => (
                  <tr key={p.customerId} className="border-t border-gray-100">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-gray-500">{p.customerNumber}</span> {p.name}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {p.sponsorNumber ? <span className="font-mono text-gray-400">{p.sponsorNumber} </span> : null}
                      {p.sponsorName ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{p.branchCode ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                      {p.day}
                      {p.dayZeroSource === 'manual' && <span className="ml-1 text-xs font-normal text-amber-600" title="Día 0 puesto a mano">a mano</span>}
                    </td>
                    <td className="px-4 py-2.5">{p.victoryCode ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-impulsa-blue" style={{ width: `${p.card.percent}%` }} />
                        </div>
                        <span className="tabular-nums text-xs text-gray-500">
                          {p.card.checksDone}/{p.card.checksTotal}
                        </span>
                        {p.card.sessionDone && <CheckCircleIcon className="h-4 w-4 text-emerald-600" aria-label="Sesión de Arranque hecha" />}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">
                      {p.activity.tried_or_bought} · {p.activity.invitations} · {p.activity.presentations} · {p.activity.follow_ups}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{p.lastActivityAt ? daysAgoLabel(p.lastActivityAt, today) : '—'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <PermissionGuard permissions={MANAGE_PERMISSIONS}>
                        <button type="button" onClick={() => setEditing(p)} className="text-xs text-impulsa-blue hover:underline">
                          Mover Día 0
                        </button>
                      </PermissionGuard>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-500">
          <span>
            {total.toLocaleString('es-MX')} {total === 1 ? 'persona' : 'personas'}
            {victory ? ` en la V${victory}` : ''}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>
              Anterior
            </Button>
            <span className="tabular-nums">
              {page} / {pages}
            </span>
            <Button type="button" variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((n) => n + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      </div>

      {editing !== undefined && today && (
        <DayZeroDialog
          key={editing?.customerId ?? 'manual'}
          participant={editing}
          today={today}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  );
}

function ContentTab() {
  const { data, isLoading, isError } = useImpulsaAdminCatalog();
  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (isError || !data) return <p className="text-sm text-red-600">No se pudo cargar el contenido.</p>;
  const uploaded = new Set(data.v1.guides.map((g) => g.title.trim().toLowerCase()));
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.victories.map((v) => (
          <Card key={v.number} className={cn(v.availability === 'available' && 'border-primary')}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-2xl font-bold text-impulsa-blue">{v.code}</span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                    v.availability === 'available' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600',
                  )}
                >
                  {v.availability === 'available' ? 'Disponible' : 'Próximamente'}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{victoryDaysLabel(v)}</p>
              <p className="mt-1 text-base font-semibold text-gray-900">{v.title}</p>
              <p className="mt-2 text-xs text-gray-500">Producción: {v.productionStatus}</p>
              <p className="mt-2 text-sm text-gray-700">
                {v.courses} {v.courses === 1 ? 'curso' : 'cursos'} · {v.videos} {v.videos === 1 ? 'video' : 'videos'} · {v.guides}{' '}
                {v.guides === 1 ? 'guía' : 'guías'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Victoria 1 · Microvideos por día</h2>
            <ul className="mt-3 space-y-2">
              {data.v1.messages.map((m) => {
                const done = data.v1.videoDays.includes(m.day);
                return (
                  <li key={m.code} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2 text-sm">
                    <span className="text-gray-800">{m.title}</span>
                    <span className={cn('flex items-center gap-1 text-xs font-semibold', done ? 'text-emerald-700' : 'text-amber-700')}>
                      {done ? <CheckCircleIcon className="h-4 w-4" /> : <ClockIcon className="h-4 w-4" />}
                      {done ? 'Video subido' : 'Falta el video'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Victoria 1 · Guías</h2>
              <ul className="mt-3 space-y-2">
                {data.v1.expectedGuides.map((name) => {
                  const done = uploaded.has(name.trim().toLowerCase());
                  return (
                    <li key={name} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2 text-sm">
                      <span className="text-gray-800">{name}</span>
                      <span className={cn('flex items-center gap-1 text-xs font-semibold', done ? 'text-emerald-700' : 'text-amber-700')}>
                        {done ? <CheckCircleIcon className="h-4 w-4" /> : <ClockIcon className="h-4 w-4" />}
                        {done ? 'Publicada' : 'Falta publicarla'}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {data.v1.guides.length > 0 && (
                <p className="mt-3 text-xs text-gray-500">Publicadas hoy: {data.v1.guides.map((g) => g.title).join(' · ')}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">Cómo se sube el contenido de una Victoria</h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-700">
                <li>
                  <strong>Microvideos:</strong> en{' '}
                  <Link href="/admin/comercial/capacitacion" className="text-impulsa-blue underline">
                    Capacitación
                  </Link>{' '}
                  crea un curso con <strong>Nivel de IMPULSA</strong> (V1 … V6), público y publicado. Cada lección se titula como
                  su día, por ejemplo «Día 3 · Sigo invitando»: así el video sale en ese día de la ruta. Ese curso no aparece
                  en RISE Academy: solo se ve dentro de su Victoria.
                </li>
                <li>
                  <strong>Guías:</strong> en{' '}
                  <Link href="/admin/comercial/materiales" className="text-impulsa-blue underline">
                    Materiales
                  </Link>{' '}
                  sube el PDF con la categoría <strong>IMPULSA · Victoria N</strong> y publícalo. Si se llama igual que en la lista de
                  arriba, se marca como publicada.
                </li>
                <li>Los textos de cada día son los aprobados por Dirección General: no se capturan aquí.</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Texto copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  };
  return (
    <button type="button" onClick={() => void copy()} className="inline-flex items-center gap-1 text-xs text-impulsa-blue hover:underline">
      <ClipboardDocumentIcon className="h-3.5 w-3.5" />
      Copiar
    </button>
  );
}

function MessagesTab() {
  const { data, isLoading, isError } = useImpulsaAdminCatalog();
  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;
  if (isError || !data) return <p className="text-sm text-red-600">No se pudieron cargar los mensajes.</p>;
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-700 shadow-sm">
        <p>
          <strong>Día 0 = fecha de inscripción.</strong> Cada mensaje corresponde al día que indica, contado desde ahí. Campos que
          se llenan: {data.fields.map((f) => `[${f}]`).join(' · ')}.
        </p>
        <p className="mt-2">
          Hoy el Distribuidor ve el mensaje de cada día dentro de su Victoria, y el Patrocinador ve sus avisos en «Mi equipo en
          IMPULSA» con el mensaje sugerido listo para mandarlo desde su propio WhatsApp. El <strong>envío automático</strong> (CRM /
          WhatsApp) es una etapa aparte: falta que Dirección General decida la forma de envío y que Meta apruebe las plantillas.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">A · Mensaje diario al nuevo Distribuidor ({data.v1.messages.length})</h2>
        <div className="space-y-3">
          {data.v1.messages.map((m) => (
            <div key={m.code} className="rounded-xl border border-l-4 border-gray-200 border-l-impulsa-yellow bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-gray-900">{m.title}</p>
                <span className="text-xs text-gray-500">
                  {m.code} · envío: {m.moment} <CopyButton text={m.message} />
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">{m.message}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">B · Acompañamiento del Patrocinador ({data.v1.notices.length})</h2>
        <p className="mb-3 text-xs text-gray-500">
          Si el Distribuidor no tiene Patrocinador activo, el aviso es para su línea ascendente activa más cercana.
        </p>
        <div className="space-y-3">
          {data.v1.notices.map((n) => (
            <div key={n.code} className="rounded-xl border border-l-4 border-gray-200 border-l-impulsa-blue bg-white p-4 shadow-sm">
              <p className="text-sm font-bold text-gray-900">
                Día {n.day} del Distribuidor · {n.action}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Aviso al Patrocinador ({n.code}) <CopyButton text={n.notice} />
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-700">{n.notice}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Mensaje sugerido para su Distribuidor (opcional) <CopyButton text={n.suggestedMessage} />
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-700">{n.suggestedMessage}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function ImpulsaAdminPage() {
  return (
    <div className="impulsa space-y-6 px-4 pb-8 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4 px-6 py-5">
          <Image
            src={IMPULSA_LOGO.src}
            alt="IMPULSA: cada paso, una Victoria"
            width={IMPULSA_LOGO.width}
            height={IMPULSA_LOGO.height}
            priority
            className="h-20 w-auto shrink-0"
          />
          <div className="min-w-0 flex-1 basis-72">
            <h1 className="text-2xl font-bold text-impulsa-blue sm:text-3xl">La ruta de los primeros 90 días</h1>
            <p className="mt-1 text-sm text-gray-600">
              6 Victorias. Cada día el nuevo Distribuidor sabe qué necesita saber, qué hace ahora y dónde encuentra ayuda.
            </p>
          </div>
        </div>
        <div className="h-1.5 bg-gradient-to-r from-impulsa-yellow to-impulsa-orange" aria-hidden />
      </div>

      <Tabs defaultValue="seguimiento">
        <TabsList>
          <TabsTrigger value="seguimiento">Seguimiento</TabsTrigger>
          <TabsTrigger value="contenido">Victorias y contenido</TabsTrigger>
          <TabsTrigger value="mensajes">Mensajes del CRM</TabsTrigger>
        </TabsList>
        <TabsContent value="seguimiento" className="mt-6">
          <TrackingTab />
        </TabsContent>
        <TabsContent value="contenido" className="mt-6">
          <ContentTab />
        </TabsContent>
        <TabsContent value="mensajes" className="mt-6">
          <MessagesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
