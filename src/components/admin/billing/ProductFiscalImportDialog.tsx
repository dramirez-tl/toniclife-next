'use client';

// Importación masiva de claves SAT / regla IVA / exento por producto (CSV).
//
// Flujo: plantilla → archivo → vista previa (dryRun) → aplicar, como
// EmployeeImportDialog. A diferencia de RRHH, aquí una fila con error NO
// bloquea a las demás: el API aplica las válidas y reporta las que no. Nunca
// borra valores (columna vacía = no tocar).
//
// Cabeceras: sku,clave_sat,unidad_sat,regla_iva,exento. La plantilla la
// genera el API con una fila por producto activo y lo que ya tenga.

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ArrowDownTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useImportProductFiscal } from '@/hooks/useBilling';
import { billingService } from '@/services/billing.service';
import { billingErrorMessage } from '@/lib/billing-error';
import { saveBlob } from '@/lib/download';
import type { ProductFiscalImportResult, ProductFiscalInvalidKind } from '@/types/billing';

const MAX_FILE_MB = 5;
const TEMPLATE_FILENAME = 'productos-claves-sat.csv';

const INVALID_KIND_LABEL: Record<ProductFiscalInvalidKind, string> = {
  product: 'clave de producto',
  unit: 'unidad',
  taxRule: 'regla IVA',
};

export function ProductFiscalImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ProductFiscalImportResult | null>(null);
  const [applied, setApplied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const importFiscal = useImportProductFiscal();

  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      const blob = await billingService.downloadProductFiscalTemplate();
      saveBlob(blob, TEMPLATE_FILENAME, 'text/csv;charset=utf-8;');
      toast.success('Plantilla descargada: complétala en Excel y súbela aquí.');
    } catch (err) {
      toast.error(billingErrorMessage(err, 'No se pudo descargar la plantilla'));
    } finally {
      setDownloading(false);
    }
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
      const result = await importFiscal.mutateAsync({ file, dryRun });
      setPreview(result);
      if (dryRun) {
        toast.success(
          `Vista previa: ${result.toUpdate} producto(s) por actualizar de ${result.matched} encontrados`,
        );
      } else {
        setApplied(true);
        toast.success(`Carga aplicada: ${result.applied} producto(s) actualizados`);
      }
    } catch (err) {
      toast.error(billingErrorMessage(err, 'No se pudo procesar el archivo'));
    }
  };

  const errorCount = preview?.errors?.length ?? 0;
  const unmatchedCount = preview?.unmatchedSkus?.length ?? 0;
  const invalidCount = preview?.invalidCodes?.length ?? 0;
  const canApply =
    !!file && !!preview && preview.dryRun && preview.toUpdate > 0 && !applied && !importFiscal.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar claves SAT por producto (CSV)</DialogTitle>
          <DialogDescription>
            Empareja por SKU. Columnas: <span className="font-mono">sku, clave_sat, unidad_sat, regla_iva, exento</span>.
            Una columna vacía no toca el valor actual. Las claves se validan contra el catálogo del SAT;
            las filas con error se omiten sin frenar a las demás.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void downloadTemplate()} disabled={downloading}>
              {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
              )}
              Descargar plantilla CSV
            </Button>
            <span className="text-xs text-muted-foreground">
              Trae todos los productos activos con lo que ya tienen capturado.
            </span>
          </div>

          <div className="rounded-lg border border-dashed border-border p-4">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              aria-label="Archivo CSV de claves SAT"
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
                <CountBox label="SKU encontrados" value={preview.matched} tone="text-blue-600" />
                <CountBox
                  label={preview.dryRun ? 'Por actualizar' : 'Actualizados'}
                  value={preview.dryRun ? preview.toUpdate : preview.applied}
                  tone="text-emerald-600"
                />
                <CountBox
                  label="Con error"
                  value={errorCount}
                  tone={errorCount > 0 ? 'text-red-600' : 'text-gray-900'}
                />
              </div>

              {applied && (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  Carga aplicada. Los conteos de Preparación fiscal se actualizaron.
                </p>
              )}

              {unmatchedCount > 0 && (
                <IssueList
                  title={`${unmatchedCount} SKU no existen o están inactivos (se omiten)`}
                  items={preview.unmatchedSkus}
                  tone="amber"
                />
              )}

              {invalidCount > 0 && (
                <IssueList
                  title={`${invalidCount} código(s) no existen en el catálogo del SAT / reglas (se omiten)`}
                  items={preview.invalidCodes.map(
                    (c) => `${c.code} (${INVALID_KIND_LABEL[c.kind] ?? c.kind})`,
                  )}
                  tone="amber"
                />
              )}

              {errorCount > 0 && (
                <IssueList
                  title={`${errorCount} fila(s) con error (no se aplican; el resto sí)`}
                  items={preview.errors.map((e) => `Fila ${e.row}${e.sku ? ` · ${e.sku}` : ''}: ${e.message}`)}
                  tone="red"
                />
              )}

              {preview.dryRun && preview.toUpdate === 0 && (
                <p className="text-sm text-muted-foreground">
                  No hay cambios que aplicar: revisa que los SKU coincidan y que las columnas traigan datos.
                </p>
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
            disabled={!file || importFiscal.isPending}
          >
            {importFiscal.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Vista previa
          </Button>
          <Button onClick={() => void run(false)} disabled={!canApply}>
            {importFiscal.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

function IssueList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'amber' | 'red';
}) {
  const box =
    tone === 'red'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-amber-200 bg-amber-50 text-amber-800';
  return (
    <div className={`rounded-lg border p-3 ${box}`}>
      <p className="mb-2 text-sm font-medium">{title}</p>
      <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
        {items.slice(0, 100).map((item, i) => (
          <li key={`${i}-${item}`} className="break-words">
            {item}
          </li>
        ))}
        {items.length > 100 && <li>… y {items.length - 100} más</li>}
      </ul>
    </div>
  );
}
