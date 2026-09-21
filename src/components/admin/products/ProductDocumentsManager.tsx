'use client';

// ProductDocumentsManager — ficha técnica en PDF (uso INTERNO, no se publica en
// la tienda). Descarga por URL firmada; borrar siempre con ConfirmDialog.

import { useId, useRef, useState } from 'react';
import { Download, FileText, FileUp, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { productsService } from '@/services/products.service';
import { useDeleteProductDocument, useProductDocuments, useUploadProductDocument } from '@/hooks/useProducts';
import type { ProductDocument } from '@/types/product';
import { productAdminErrorMessage } from './lib/errors';

const PDF_MAX_MB = 20;

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

interface ProductDocumentsManagerProps {
  productId: string;
  readOnly?: boolean;
}

export function ProductDocumentsManager({ productId, readOnly = false }: ProductDocumentsManagerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: documents = [], isLoading, isError } = useProductDocuments(productId);
  const uploadDoc = useUploadProductDocument();
  const deleteDoc = useDeleteProductDocument();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ProductDocument | null>(null);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    try {
      if (file.type !== 'application/pdf') {
        toast.error('Solo se permiten archivos PDF');
        return;
      }
      if (file.size > PDF_MAX_MB * 1024 * 1024) {
        toast.error(`El archivo supera ${PDF_MAX_MB} MB`);
        return;
      }
      await uploadDoc.mutateAsync({ productId, file, documentType: 'tech_sheet' });
      toast.success('Ficha técnica subida');
    } catch (err) {
      toast.error(productAdminErrorMessage(err, 'No se pudo subir el documento'));
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDownload = async (documentId: string) => {
    setDownloadingId(documentId);
    try {
      const { url } = await productsService.getProductDocumentDownloadUrl(productId, documentId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(productAdminErrorMessage(err, 'No se pudo generar el enlace de descarga'));
    } finally {
      setDownloadingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteDoc.mutateAsync({ productId, documentId: toDelete.id });
      toast.success('Documento eliminado');
      setToDelete(null);
    } catch (err) {
      toast.error(productAdminErrorMessage(err, 'No se pudo eliminar el documento'));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-gray-600">
          Documento de uso <strong>interno</strong> (no se muestra en la tienda). Solo PDF, hasta {PDF_MAX_MB} MB.
        </p>
        {!readOnly ? (
          <>
            <input
              id={inputId}
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="sr-only"
              aria-label="Elegir PDF de ficha técnica"
              onChange={(e) => void handleFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploadDoc.isPending}
            >
              {uploadDoc.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <FileUp className="mr-1 h-4 w-4" aria-hidden />
              )}
              Subir PDF
            </Button>
          </>
        ) : null}
      </div>

      {isLoading ? (
        <p className="flex items-center gap-2 text-sm text-gray-600" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cargando documentos…
        </p>
      ) : isError ? (
        <p className="text-sm text-red-700" role="alert">
          No se pudieron cargar los documentos.
        </p>
      ) : documents.length === 0 ? (
        <p className="rounded-lg bg-gray-50 px-4 py-4 text-center text-sm text-gray-700">Sin ficha técnica.</p>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
              <FileText className="h-5 w-5 shrink-0 text-red-600" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{doc.fileName}</p>
                <p className="text-xs text-gray-600">
                  {[formatBytes(doc.fileSize), doc.uploadedByName?.split('@')[0]].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void handleDownload(doc.id)}
                disabled={downloadingId === doc.id}
              >
                {downloadingId === doc.id ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="mr-1 h-4 w-4" aria-hidden />
                )}
                Ver
              </Button>
              {!readOnly ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-700 hover:text-red-800"
                  onClick={() => setToDelete(doc)}
                  aria-label={`Eliminar ${doc.fileName}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
        title="Eliminar documento"
        description="El PDF dejará de estar disponible para el equipo."
        confirmLabel="Eliminar documento"
        destructive
        isPending={deleteDoc.isPending}
        onConfirm={confirmDelete}
      >
        <p className="break-all font-medium">{toDelete?.fileName}</p>
      </ConfirmDialog>
    </div>
  );
}
