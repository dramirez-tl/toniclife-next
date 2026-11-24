'use client';

// EventGuestsImportDialog - Carga masiva de invitados: el Excel de la
// responsable (una hoja por tipo de acceso, columnas Nombre e ID) o una lista
// pegada. Dos pasos: primero la VISTA PREVIA (no guarda nada: dice quién es
// cada renglón y qué hay que revisar) y después "Cargar".

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ArrowUpTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useImportEventGuests } from '@/hooks/useEventGuests';
import { eventErrorMessage } from '@/lib/events/format';
import { guestFlagLabel, importFlagCounts, importPreviewLines } from '@/lib/events/guests';
import {
  GUEST_FLAG_HELP,
  GUEST_KIND_LABEL,
  type GuestFlag,
  type GuestImportInput,
  type GuestImportResult,
} from '@/types/event-guests';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
/** Renglones de la vista previa que se pintan (el resumen cuenta todos). */
const PREVIEW_ROWS = 300;

interface Props {
  eventId: string;
  accessTypes: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EventGuestsImportDialog({ eventId, accessTypes, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        {open && <ImportBody eventId={eventId} accessTypes={accessTypes} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ImportBody({
  eventId,
  accessTypes,
  onClose,
}: {
  eventId: string;
  accessTypes: string[];
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'file' | 'text'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [accessType, setAccessType] = useState('');
  const [preview, setPreview] = useState<GuestImportResult | null>(null);
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const importMutation = useImportEventGuests(eventId);

  const input = (): GuestImportInput =>
    mode === 'file' ? { file, accessType } : { text, accessType };
  const ready = mode === 'file' ? !!file : text.trim().length > 0;
  // Cualquier cambio en lo que se va a cargar invalida la vista previa.
  const reset = () => setPreview(null);

  const pickFile = (f: File | null) => {
    if (f && f.size > MAX_FILE_BYTES) {
      toast.error('El archivo pesa más de 5 MB.');
      return;
    }
    if (f && !/\.xlsx$/i.test(f.name)) {
      toast.error('Sube un archivo de Excel (.xlsx).');
      return;
    }
    setFile(f);
    reset();
  };

  const runPreview = async () => {
    try {
      setPreview(await importMutation.mutateAsync({ input: input(), apply: false }));
      setOnlyFlagged(false);
    } catch (e) {
      toast.error(eventErrorMessage(e, 'No se pudo leer la lista.'));
    }
  };

  const runApply = async () => {
    try {
      const result = await importMutation.mutateAsync({ input: input(), apply: true });
      toast.success(
        result.created === 1
          ? 'Se cargó 1 invitado'
          : `Se cargaron ${result.created.toLocaleString('es-MX')} invitados`,
      );
      onClose();
    } catch (e) {
      toast.error(eventErrorMessage(e, 'No se pudo cargar la lista.'));
    }
  };

  const isPending = importMutation.isPending;
  const rows = preview
    ? preview.guests.filter((g) => (onlyFlagged ? g.flags.length > 0 || g.alreadyInList : true))
    : [];

  return (
    <div className="space-y-5">
      <DialogHeader>
        <DialogTitle>Carga masiva de invitados</DialogTitle>
        <DialogDescription>
          Primero se muestra la vista previa (no guarda nada). Quien ya está en la lista con el mismo
          tipo de acceso no se duplica, así que puedes volver a subir la lista actualizada.
        </DialogDescription>
      </DialogHeader>

      <Tabs
        value={mode}
        onValueChange={(v) => {
          setMode(v as 'file' | 'text');
          reset();
        }}
      >
        <TabsList>
          <TabsTrigger value="file" className="px-4">
            <ArrowUpTrayIcon className="mr-1.5 h-4 w-4" />
            Archivo de Excel
          </TabsTrigger>
          <TabsTrigger value="text" className="px-4">
            <DocumentTextIcon className="mr-1.5 h-4 w-4" />
            Pegar lista
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file" className="space-y-2">
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                pickFile(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={isPending}>
                <ArrowUpTrayIcon className="mr-2 h-4 w-4" />
                {file ? 'Cambiar archivo' : 'Elegir archivo'}
              </Button>
              <span className="text-sm text-gray-700">{file ? file.name : 'Ningún archivo elegido'}</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Excel (.xlsx) con una hoja por tipo de acceso (Acceso General, Todo Incluido, Elite…) y las
              columnas <span className="font-medium">Nombre</span> e <span className="font-medium">ID</span>{' '}
              (número de distribuidor). “Invitado 1786956” en la columna ID = acompañante de ese
              distribuidor. También se leen, si vienen: Red, Tipo de acceso, Lugares, Teléfono y Correo.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="text" className="space-y-2">
          <Textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              reset();
            }}
            rows={7}
            className="font-mono text-sm"
            placeholder={'1786956\n75271, Nombre del distribuidor\nInvitado 75271, Nombre del acompañante\nNombre de alguien sin ID'}
          />
          <p className="text-xs text-gray-500">
            Un invitado por renglón. Con solo el número de distribuidor basta (el nombre sale de su
            ficha). Puedes pegar dos columnas copiadas de Excel (número y nombre, en cualquier orden).
          </p>
        </TabsContent>
      </Tabs>

      <div className="grid gap-2 sm:max-w-sm">
        <Label htmlFor="import-access">
          Tipo de acceso {mode === 'file' ? '(si el archivo no lo dice)' : '(para toda la lista pegada)'}
        </Label>
        <Input
          id="import-access"
          value={accessType}
          onChange={(e) => {
            setAccessType(e.target.value);
            reset();
          }}
          placeholder="Opcional: Acceso General, Elite…"
          maxLength={60}
          list="import-access-types"
        />
        <datalist id="import-access-types">
          {accessTypes.map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </div>

      {preview && (
        <div className="space-y-3">
          <div className="rounded-lg border border-[#a7c1e2] bg-[#C8DDF2]/20 p-4 text-sm text-gray-800">
            <p className="font-semibold text-gray-900">Vista previa: todavía no se ha guardado nada</p>
            <ul className="mt-1 space-y-0.5">
              {importPreviewLines(preview).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {preview.totals.byAccess.length > 0 && (
              <p className="mt-2 text-xs text-gray-600">
                {preview.totals.byAccess
                  .map(
                    (a) =>
                      `${a.accessType}: ${a.guests.toLocaleString('es-MX')} invitados / ${a.seats.toLocaleString('es-MX')} lugares`,
                  )
                  .join(' · ')}
              </p>
            )}
          </div>

          {importFlagCounts(preview).length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">
                Por revisar (nadie se queda fuera: se cargan todos y los avisos quedan marcados en la lista)
              </p>
              <ul className="mt-1 space-y-1">
                {importFlagCounts(preview).map((f) => (
                  <li key={f.flag}>
                    <span className="font-medium">
                      {f.label}: {f.count.toLocaleString('es-MX')}.
                    </span>{' '}
                    {GUEST_FLAG_HELP[f.flag as GuestFlag] ?? ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-600">
              {rows.length > PREVIEW_ROWS
                ? `Se muestran los primeros ${PREVIEW_ROWS} de ${rows.length.toLocaleString('es-MX')}.`
                : `${rows.length.toLocaleString('es-MX')} invitados.`}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => setOnlyFlagged((v) => !v)}>
              {onlyFlagged ? 'Ver todos' : 'Ver solo los que hay que revisar'}
            </Button>
          </div>
          <div className="max-h-80 overflow-auto rounded-lg border border-gray-200">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="sticky top-0 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">Renglón</th>
                  <th className="px-3 py-2">Nombre en la lista</th>
                  <th className="px-3 py-2">Quién es</th>
                  <th className="px-3 py-2">Ficha del ID</th>
                  <th className="px-3 py-2">Acceso</th>
                  <th className="px-3 py-2 text-right">Lugares</th>
                  <th className="px-3 py-2">Avisos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.slice(0, PREVIEW_ROWS).map((g) => (
                  <tr
                    key={`${g.sheet ?? ''}-${g.row}`}
                    className={g.alreadyInList ? 'bg-gray-50 text-gray-400' : ''}
                  >
                    <td className="px-3 py-1.5 tabular-nums text-gray-500">
                      {g.sheet ? `${g.sheet} · ` : ''}
                      {g.row}
                    </td>
                    <td className="px-3 py-1.5">{g.fullName}</td>
                    <td className="px-3 py-1.5">{GUEST_KIND_LABEL[g.kind]}</td>
                    <td className="px-3 py-1.5">
                      {g.customerNumber ? (
                        <>
                          <span className="font-mono">{g.customerNumber}</span>
                          {g.customerName ? ` ${g.customerName}` : ''}
                        </>
                      ) : (
                        <span className="text-gray-400">{g.listedNumber ? `${g.listedNumber} (no existe)` : '—'}</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">{g.accessType ?? '—'}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{g.seats}</td>
                    <td className="px-3 py-1.5">
                      <div className="flex flex-wrap gap-1">
                        {g.alreadyInList && (
                          <Badge variant="outline" className="border-gray-200 bg-white text-gray-500">
                            Ya está en la lista
                          </Badge>
                        )}
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
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-gray-400">
                      Nada que mostrar con este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
          Cancelar
        </Button>
        {preview ? (
          <Button type="button" onClick={runApply} disabled={isPending || preview.totals.toCreate === 0}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            {preview.totals.toCreate === 0
              ? 'No hay invitados nuevos'
              : `Cargar ${preview.totals.toCreate.toLocaleString('es-MX')} invitado${preview.totals.toCreate === 1 ? '' : 's'}`}
          </Button>
        ) : (
          <Button type="button" onClick={runPreview} disabled={isPending || !ready}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
            Ver vista previa
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}
