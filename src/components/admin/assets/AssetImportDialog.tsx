'use client';

// AssetImportDialog - Carga masiva del parque existente (CSV o Excel).
//
// Dos pasos: se valida TODO el archivo y se muestran errores y avisos ANTES de
// guardar nada; el alta real es all-or-nothing con el token de la vista previa.

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Upload, FileDown, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { assetsService } from '@/services/assets.service';
import { useCommitAssetImport, usePreviewAssetImport } from '@/hooks/useAssets';
import type { AssetImportPreview } from '@/types/asset';

interface AssetImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssetImportDialog({ open, onOpenChange }: AssetImportDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<AssetImportPreview | null>(null);

  const previewMutation = usePreviewAssetImport();
  const commitMutation = useCommitAssetImport();

  const reset = () => {
    setFileName('');
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error('El archivo supera los 20 MB');
      return;
    }
    setFileName(file.name);
    setPreview(null);
    try {
      const result = await previewMutation.mutateAsync(file);
      setPreview(result);
      if (!result.valid) toast.error(result.message);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'No se pudo leer el archivo');
      reset();
    }
  };

  const handleCommit = async () => {
    if (!preview?.token) return;
    try {
      const result = await commitMutation.mutateAsync(preview.token);
      toast.success(result.message);
      handleClose(false);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg[0] : msg || 'No se pudo aplicar la carga');
    }
  };

  const downloadTemplate = async () => {
    try {
      const blob = await assetsService.downloadImportTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla-activos.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('No se pudo descargar la plantilla');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        // Una vista previa validada no se pierde por un clic en el fondo.
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Carga masiva de activos</DialogTitle>
          <DialogDescription>
            Sube un CSV o Excel con el equipo que ya tienes. Solo la categoría y el nombre son
            obligatorios: los equipos viejos sin factura ni costo también se pueden capturar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void downloadTemplate()}>
              <FileDown className="mr-2 h-4 w-4" />
              Descargar plantilla
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => void handleFile(e.target.files)}
            />
            <Button
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={previewMutation.isPending}
            >
              {previewMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Elegir archivo
            </Button>
            {fileName ? (
              <span className="text-sm text-muted-foreground">{fileName}</span>
            ) : null}
          </div>

          {preview && (
            <div className="space-y-3">
              <div
                className={`flex items-start gap-3 rounded-md border p-3 ${
                  preview.valid
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950'
                    : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950'
                }`}
              >
                {preview.valid ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                )}
                <div className="text-sm">
                  <p className="font-medium">{preview.message}</p>
                  <p className="text-muted-foreground">
                    {preview.totalRows} fila(s) leídas · {preview.validRows} válida(s)
                  </p>
                </div>
              </div>

              {preview.errors.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-md border border-border p-3">
                  <p className="mb-2 text-sm font-medium text-destructive">
                    Errores ({preview.errorCount})
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {preview.errors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                  {preview.errorCount > preview.errors.length ? (
                    <p className="mt-2 text-xs italic text-muted-foreground">
                      …y {preview.errorCount - preview.errors.length} error(es) más.
                    </p>
                  ) : null}
                </div>
              )}

              {preview.warnings.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
                  <p className="mb-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                    Avisos (no impiden la carga)
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {preview.warnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.valid && preview.sample.length > 0 && (
                <div className="rounded-md border border-border">
                  <p className="border-b border-border px-3 py-2 text-sm font-medium">
                    Vista previa (primeros {preview.sample.length})
                  </p>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="p-2 text-left">Línea</th>
                          <th className="p-2 text-left">Equipo</th>
                          <th className="p-2 text-left">Marca / Modelo</th>
                          <th className="p-2 text-left">Serie</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.sample.map((s) => (
                          <tr key={s.line} className="border-t border-border">
                            <td className="p-2 text-muted-foreground">{s.line}</td>
                            <td className="p-2">{s.name}</td>
                            <td className="p-2 text-muted-foreground">
                              {[s.brand, s.model].filter(Boolean).join(' · ') || '—'}
                            </td>
                            <td className="p-2 font-mono text-muted-foreground">
                              {s.serialNumber ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cerrar
          </Button>
          <Button
            onClick={() => void handleCommit()}
            disabled={!preview?.valid || !preview.token || commitMutation.isPending}
          >
            {commitMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Importar {preview?.validRows ?? 0} equipo(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
