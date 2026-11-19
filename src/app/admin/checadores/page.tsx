'use client';

// Sistemas › Checadores — Licencias de los checadores de asistencia (16-nov-2026).
//
// El checador es una app en tableta Android que se activa con una licencia, igual que una
// caja del punto de venta. Aquí Sistemas tiene el control: crea la licencia de cada checador
// (la clave se escribe una vez en la tableta), ve en cuál tableta está activa, si está en
// línea, y la libera (para pasarla a otra tableta) o la cancela (la tableta se cierra sola
// en un minuto). Las licencias de las cajas siguen en Sucursales; estas no se mezclan.
// Qué estado tiene cada una y cómo se muestra lo decide `lib/checker-licenses`.

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowPathIcon,
  ClipboardDocumentIcon,
  EyeIcon,
  EyeSlashIcon,
  FingerPrintIcon,
  LinkSlashIcon,
  NoSymbolIcon,
  PencilSquareIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn, confirmAction } from '@/lib/utils';
import { useActiveBranches } from '@/hooks/useBranches';
import {
  useCheckerLicenses,
  useCreateCheckerLicense,
  useRevokeCheckerLicense,
  useUnbindCheckerLicense,
  useUpdateCheckerLicense,
} from '@/hooks/useCheckerLicenses';
import {
  CHECKER_STATE_LABEL,
  checkerAppVersion,
  checkerDeviceLabel,
  checkerLastSeenText,
  checkerLicenseState,
  checkerLicenseSummary,
  maskCheckerKey,
  sortCheckerLicenses,
  type CheckerLicenseState,
} from '@/lib/checker-licenses';
import type { PosLicense } from '@/types/posLicense';

const STATE_CLASS: Record<CheckerLicenseState, string> = {
  online: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  silent: 'bg-amber-50 text-amber-900 border-amber-200',
  unused: 'bg-slate-100 text-slate-700 border-slate-200',
  revoked: 'bg-rose-50 text-rose-800 border-rose-200',
};

/** Mensaje del API (en español) o el de respaldo. */
function apiMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string | string[] } } } | null)?.response?.data?.message;
  if (Array.isArray(message)) return message.join(' ');
  return typeof message === 'string' && message.trim() ? message : fallback;
}

type FormMode = { mode: 'create' } | { mode: 'edit'; license: PosLicense };
const EMPTY_FORM = { branchId: '', label: '', notes: '' };

export default function CheckerLicensesPage() {
  const licensesQuery = useCheckerLicenses();
  const { data: branches = [] } = useActiveBranches();
  const createLicense = useCreateCheckerLicense();
  const updateLicense = useUpdateCheckerLicense();
  const revokeLicense = useRevokeCheckerLicense();
  const unbindLicense = useUnbindCheckerLicense();

  // "Hace 2 min" y "sin señal" dependen de la hora: se recalculan cada medio minuto.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());
  const [form, setForm] = useState<FormMode | null>(null);
  const [values, setValues] = useState(EMPTY_FORM);
  /** Licencia recién creada: se muestra su clave completa para escribirla en la tableta. */
  const [created, setCreated] = useState<PosLicense | null>(null);

  const licenses = useMemo(() => sortCheckerLicenses(licensesQuery.data, now), [licensesQuery.data, now]);
  const summary = useMemo(() => checkerLicenseSummary(licensesQuery.data, now), [licensesQuery.data, now]);
  const branchOptions = useMemo(
    () => branches.map((b) => ({ value: b.id, label: `${b.code} · ${b.name}` })),
    [branches],
  );
  const saving = createLicense.isPending || updateLicense.isPending;

  const copyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      toast.success('Clave copiada');
    } catch {
      toast.error('No se pudo copiar. Selecciónala y cópiala a mano.');
    }
  };
  const toggleReveal = (id: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const openCreate = () => {
    setValues(EMPTY_FORM);
    setForm({ mode: 'create' });
  };
  const openEdit = (license: PosLicense) => {
    setValues({ branchId: license.branchId, label: license.label ?? '', notes: license.notes ?? '' });
    setForm({ mode: 'edit', license });
  };

  const submit = async () => {
    if (!form) return;
    const label = values.label.trim();
    const notes = values.notes.trim();
    if (!label) return void toast.error('Escribe el nombre del checador (por ejemplo, "Recepción").');
    try {
      if (form.mode === 'create') {
        // Sin sucursal = "Todos (Corporativo)": el checador de oficinas, donde checa quien venga de
        // cualquier sucursal. El API lo deja en la sucursal del corporativo.
        const license = await createLicense.mutateAsync({
          branchId: values.branchId || undefined,
          label,
          notes: notes || undefined,
        });
        setForm(null);
        setCreated(license);
      } else {
        await updateLicense.mutateAsync({ id: form.license.id, dto: { label, notes: notes || undefined } });
        setForm(null);
        toast.success('Checador actualizado');
      }
    } catch (err) {
      toast.error(apiMessage(err, 'No se pudo guardar. Inténtalo de nuevo.'));
    }
  };

  const release = async (license: PosLicense) => {
    const name = license.label || license.licenseKey;
    if (!(await confirmAction(`¿Liberar la licencia de "${name}"? La tableta donde está se cerrará y la clave se podrá usar en otra.`))) return;
    try {
      await unbindLicense.mutateAsync(license.id);
      toast.success('Licencia liberada: ya se puede activar en otra tableta');
    } catch (err) {
      toast.error(apiMessage(err, 'No se pudo liberar la licencia.'));
    }
  };
  const cancel = async (license: PosLicense) => {
    const name = license.label || license.licenseKey;
    if (!(await confirmAction(`¿Cancelar la licencia de "${name}"? El checador se cerrará en un minuto y esta clave ya no servirá.`))) return;
    try {
      await revokeLicense.mutateAsync({ id: license.id, dto: { reason: 'Cancelada desde Sistemas › Checadores' } });
      toast.success('Licencia cancelada');
    } catch (err) {
      toast.error(apiMessage(err, 'No se pudo cancelar la licencia.'));
    }
  };

  const columns: DataTableColumn<PosLicense>[] = [
    {
      key: 'label',
      header: 'Checador',
      sortable: true,
      sortValue: (l) => l.label ?? '',
      render: (l) => (
        <div className="min-w-0">
          <p className="font-medium text-foreground">{l.label || 'Sin nombre'}</p>
          {l.notes && <p className="text-xs text-muted-foreground">{l.notes}</p>}
        </div>
      ),
    },
    {
      key: 'branch',
      header: 'Sucursal',
      sortable: true,
      sortValue: (l) => l.branchName ?? '',
      render: (l) => <span className="text-sm">{[l.branchCode, l.branchName].filter(Boolean).join(' · ') || 'Sin sucursal'}</span>,
    },
    {
      key: 'key',
      header: 'Clave de licencia',
      render: (l) => {
        const shown = revealed.has(l.id);
        return (
          <div className="flex items-center gap-1">
            <code className="whitespace-nowrap rounded bg-muted px-2 py-1 font-mono text-sm tracking-wide">
              {shown ? l.licenseKey : maskCheckerKey(l.licenseKey)}
            </code>
            <Button type="button" variant="ghost" size="icon" onClick={() => toggleReveal(l.id)} aria-label={shown ? 'Ocultar clave' : 'Ver clave completa'}>
              {shown ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => void copyKey(l.licenseKey)} aria-label="Copiar clave">
              <ClipboardDocumentIcon className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
    {
      key: 'state',
      header: 'Estado',
      render: (l) => {
        const state = checkerLicenseState(l, now);
        return (
          <Badge variant="outline" className={cn('font-medium', STATE_CLASS[state])}>
            {CHECKER_STATE_LABEL[state]}
          </Badge>
        );
      },
    },
    {
      key: 'device',
      header: 'Tableta',
      render: (l) => {
        const device = l.status === 'active' ? checkerDeviceLabel(l.hardwareInfo) : '';
        const version = checkerAppVersion(l.appVersion);
        return device ? (
          <div className="text-sm">
            <p>{device}</p>
            {version && <p className="text-xs text-muted-foreground">App {version}</p>}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Ninguna</span>
        );
      },
    },
    {
      key: 'lastSeen',
      header: 'Última señal',
      render: (l) => (
        <span className="text-sm text-muted-foreground">
          {l.status === 'revoked' ? 'Cancelada' : checkerLastSeenText(l.lastSeenAt, now) || 'Nunca'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      render: (l) =>
        l.status === 'revoked' ? null : (
          <div className="flex items-center justify-end gap-1">
            <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(l)} aria-label="Cambiar nombre o notas" title="Cambiar nombre o notas">
              <PencilSquareIcon className="h-4 w-4" />
            </Button>
            {l.status === 'active' && (
              <Button type="button" variant="ghost" size="icon" onClick={() => void release(l)} aria-label="Liberar de la tableta" title="Liberar de la tableta">
                <LinkSlashIcon className="h-4 w-4" />
              </Button>
            )}
            <Button type="button" variant="ghost" size="icon" onClick={() => void cancel(l)} aria-label="Cancelar licencia" title="Cancelar licencia" className="text-rose-700 hover:text-rose-800">
              <NoSymbolIcon className="h-4 w-4" />
            </Button>
          </div>
        ),
    },
  ];

  const stats: { label: string; value: number; className: string }[] = [
    { label: 'En línea', value: summary.online, className: 'text-emerald-700' },
    { label: 'Sin señal', value: summary.silent, className: 'text-amber-700' },
    { label: 'Sin activar', value: summary.unused, className: 'text-slate-700' },
    { label: 'Canceladas', value: summary.revoked, className: 'text-rose-700' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50 dark:from-background dark:to-background">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-2 flex items-center gap-3">
            <FingerPrintIcon className="h-9 w-9" aria-hidden="true" />
            <h1 className="text-3xl font-bold sm:text-4xl">Checadores</h1>
          </div>
          <p className="max-w-3xl text-white/85">
            Licencias con las que se activan los checadores de asistencia. Crea una por tableta, escribe su clave en
            la app y desde aquí ves cuál está en línea, la pasas a otra tableta o la cancelas.
          </p>
        </div>
      </div>

      <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className={cn('text-3xl font-bold tabular-nums', s.className)}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {summary.total === 1 ? '1 licencia' : `${summary.total} licencias`}. Un checador en línea manda señal cada minuto.
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => void licensesQuery.refetch()} disabled={licensesQuery.isFetching}>
                  <ArrowPathIcon className={cn('h-4 w-4', licensesQuery.isFetching && 'animate-spin')} aria-hidden="true" />
                  Actualizar
                </Button>
                <Button type="button" onClick={openCreate}>
                  <PlusIcon className="h-4 w-4" aria-hidden="true" />
                  Nueva licencia
                </Button>
              </div>
            </div>

            {licensesQuery.isError ? (
              <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                {apiMessage(licensesQuery.error, 'No se pudieron cargar las licencias de checadores.')}
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={licenses}
                getRowKey={(l) => l.id}
                isLoading={licensesQuery.isLoading}
                minWidthClassName="min-w-[980px]"
                emptyMessage='Todavía no hay licencias de checador. Crea la primera con "Nueva licencia".'
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alta y edición */}
      <Dialog open={!!form} onOpenChange={(open) => !open && !saving && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.mode === 'edit' ? 'Editar checador' : 'Nueva licencia de checador'}</DialogTitle>
            <DialogDescription>
              {form?.mode === 'edit'
                ? 'El nombre es el que se ve en la pantalla del checador.'
                : 'Una licencia por tableta. Al guardar verás la clave para escribirla en la app del checador.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {form?.mode === 'create' && (
              <div className="grid gap-2">
                <Label htmlFor="checker-branch">Sucursal</Label>
                {/* "Todos (Corporativo)" (sin sucursal) = el checador de oficinas: aquí checa quien
                    venga de cualquier sucursal a una cita o a apoyar. Con una sucursal elegida, el
                    checador es de esa sucursal. En los dos casos puede checar cualquier colaborador. */}
                <SearchableSelect
                  id="checker-branch"
                  options={branchOptions}
                  value={values.branchId}
                  onChange={(branchId) => setValues((v) => ({ ...v, branchId }))}
                  allLabel="Todos (Corporativo)"
                  aria-describedby="checker-branch-help"
                />
                <p id="checker-branch-help" className="text-xs text-muted-foreground">
                  Deja &quot;Todos (Corporativo)&quot; para el checador de oficinas, donde checa quien venga de cualquier
                  sucursal. O elige la sucursal donde estará la tableta.
                </p>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="checker-label">Nombre del checador</Label>
              <Input
                id="checker-label"
                value={values.label}
                maxLength={80}
                placeholder="Ej. Recepción, Comedor, Almacén"
                onChange={(e) => setValues((v) => ({ ...v, label: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="checker-notes">Notas (opcional)</Label>
              <Textarea
                id="checker-notes"
                value={values.notes}
                rows={2}
                maxLength={300}
                placeholder="Ej. Tableta Samsung del pasillo, serie o etiqueta de Activos TI"
                onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setForm(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void submit()} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {form?.mode === 'edit' ? 'Guardar' : 'Crear licencia'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Licencia recién creada: la clave completa y qué hacer con ella */}
      <Dialog open={!!created} onOpenChange={(open) => !open && setCreated(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Licencia creada</DialogTitle>
            <DialogDescription>
              {created?.label} · {[created?.branchCode, created?.branchName].filter(Boolean).join(' · ')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted p-4">
              <code className="font-mono text-2xl font-semibold tracking-widest">{created?.licenseKey}</code>
              <Button type="button" variant="outline" onClick={() => created && void copyKey(created.licenseKey)}>
                <ClipboardDocumentIcon className="h-4 w-4" aria-hidden="true" />
                Copiar
              </Button>
            </div>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Abre la app del checador en la tableta.</li>
              <li>Escribe esta clave y toca &quot;Activar&quot;.</li>
              <li>Acepta el permiso de la cámara. La tableta aparecerá aquí como &quot;En línea&quot;.</li>
            </ol>
            <p className="text-sm text-muted-foreground">La clave se puede volver a ver en la lista cuando haga falta.</p>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setCreated(null)}>
              Listo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
