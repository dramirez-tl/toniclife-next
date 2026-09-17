'use client';

// Carga masiva de expedientes desde CSV (el puente hacia Aspel NOI).
//
// Flujo: plantilla → archivo → vista previa (dryRun) → aplicar. La aplicación
// es todo-o-nada en el API: si hay errores de fila NO se aplica nada. La carga
// NUNCA da de baja a quien no venga en el archivo; las bajas se capturan con
// status='terminated' en la propia fila.

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ArrowDownTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useImportEmployees } from '@/hooks/useHR';
import { exportToCsv } from '@/lib/csv-export';
import { apiErrorMessage } from '@/app/admin/rrhh/hr-utils';
import {
  EMPLOYEE_IMPORT_COLUMNS,
  type EmployeeImportResult,
} from '@/types/hr';

const MAX_FILE_MB = 5;

/** Fila de ejemplo de la plantilla (mismo orden que las columnas). */
const TEMPLATE_SAMPLE: string[] = [
  'EMP-0001',
  '1234',
  'TONIC WORLD CENTER',
  'nomina',
  'Ana',
  'Perez',
  'Lopez',
  '+525512345678',
  'ana.perez@ejemplo.com',
  'MATRIZ',
  'DEPT-1',
  'AUX-ALM',
  'SUC-9-18',
  '2026-01-15',
  'active',
  'PELA900101AA1',
  'PELA900101MDFRPN01',
  '12345678901',
  'Ingreso por reemplazo',
];

export function EmployeeImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<EmployeeImportResult | null>(null);
  const [applied, setApplied] = useState(false);

  const importEmployees = useImportEmployees();

  const downloadTemplate = () => {
    exportToCsv('plantilla-empleados', [...EMPLOYEE_IMPORT_COLUMNS], [TEMPLATE_SAMPLE]);
    toast.success('Plantilla descargada. Borra la fila de ejemplo antes de subirla.');
  };

  const pickFile = (picked: File | null) => {
    setPreview(null);
    setApplied(false);
    if (!picked) {
      setFile(null);
      return;
    }
    if (picked.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`El archivo excede ${MAX_FILE_MB} MB`);
      return;
    }
    setFile(picked);
  };

  const run = async (dryRun: boolean) => {
    if (!file) {
      toast.error('Elige el archivo CSV');
      return;
    }
    try {
      const result = await importEmployees.mutateAsync({ file, dryRun });
      setPreview(result);
      if (dryRun) {
        toast.success(
          `Vista previa: ${result.toCreate} altas, ${result.toUpdate} actualizaciones`,
        );
      } else {
        setApplied(true);
        toast.success(
          `Carga aplicada: ${result.toCreate} altas y ${result.toUpdate} actualizaciones`,
        );
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'No se pudo procesar el archivo'));
    }
  };

  const hasErrors = (preview?.errors?.length ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar empleados (CSV)</DialogTitle>
          <DialogDescription>
            Crea expedientes SIN cuenta de acceso y actualiza los que ya existen. La llave es el
            número de NOI (o el número de empleado si no hay NOI). No se da de baja a nadie que
            no venga en el archivo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
              Descargar plantilla
            </Button>
            <span className="text-xs text-muted-foreground">
              Encabezado obligatorio; el orden de las columnas es libre.
            </span>
          </div>

          <div className="rounded-lg border border-dashed border-border p-4">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
                <DocumentTextIcon className="mr-2 h-4 w-4" />
                Elegir archivo
              </Button>
              <span className="text-sm text-muted-foreground">
                {file ? file.name : 'Ningún archivo seleccionado'}
              </span>
            </div>
          </div>

          {preview && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <CountBox label="Filas" value={preview.total} />
                <CountBox label="Altas" value={preview.toCreate} tone="text-emerald-600" />
                <CountBox label="Actualiza" value={preview.toUpdate} tone="text-blue-600" />
                <CountBox label="Sin cambio" value={preview.unchanged} />
              </div>

              {hasErrors && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <p className="mb-2 text-sm font-medium text-red-700">
                    {preview.errors.length} fila(s) con error. Corrige el archivo: no se aplica
                    nada hasta que no haya errores.
                  </p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-red-700">
                    {preview.errors.slice(0, 50).map((e, i) => (
                      <li key={`${e.row}-${i}`}>
                        Fila {e.row}: {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(preview.sample?.length ?? 0) > 0 && (
                <div className="rounded-lg border border-border">
                  <p className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
                    Primeras filas
                  </p>
                  <ul className="max-h-56 divide-y divide-border overflow-y-auto">
                    {preview.sample.map((row, i) => (
                      <li
                        key={`${row.row}-${i}`}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                      >
                        <span className="min-w-0 truncate">
                          <span className="font-mono text-muted-foreground">#{row.row}</span>{' '}
                          {row.name || row.employeeNumber || row.noiNumber || 'Sin nombre'}
                          {row.message ? (
                            <span className="text-muted-foreground"> · {row.message}</span>
                          ) : null}
                        </span>
                        {row.action ? (
                          <Badge
                            variant={
                              row.action === 'create'
                                ? 'success'
                                : row.action === 'update'
                                  ? 'info'
                                  : row.action === 'error'
                                    ? 'destructive'
                                    : 'secondary'
                            }
                          >
                            {row.action}
                          </Badge>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button
            variant="secondary"
            onClick={() => void run(true)}
            disabled={!file || importEmployees.isPending}
          >
            {importEmployees.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Vista previa
          </Button>
          <Button
            onClick={() => void run(false)}
            disabled={!file || !preview || hasErrors || applied || importEmployees.isPending}
          >
            {importEmployees.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CountBox({
  label,
  value,
  tone = 'text-gray-900',
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3 text-center">
      <p className={`text-xl font-bold ${tone}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
