'use client';

// AssetDocumentsSection - Fotos, garantías, manuales y cartas responsivas.
// Los archivos viven privados en GCS: se descargan con un enlace temporal.

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Upload, Download, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { confirmAction } from '@/lib/utils';
import { assetsService } from '@/services/assets.service';
import { useDeleteAssetDocument, useUploadAssetDocument } from '@/hooks/useAssets';
import {
  ASSET_DOCUMENT_TYPES,
  ASSET_DOCUMENT_TYPE_LABELS,
  type AssetDocument,
  type AssetDocumentType,
} from '@/types/asset';

const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 20;

export function AssetDocumentsSection({
  assetId,
  documents,
}: {
  assetId: string;
  documents: AssetDocument[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState<AssetDocumentType>('photo');
  const uploadMutation = useUploadAssetDocument();
  const deleteMutation = useDeleteAssetDocument();

  const handleFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast.error('Solo se aceptan PDF, JPG, PNG o WEBP');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`El archivo supera los ${MAX_MB} MB`);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    try {
      await uploadMutation.mutateAsync({ assetId, file, documentType: docType });
      toast.success('Documento subido');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'No se pudo subir el documento');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDownload = async (documentId: string) => {
    try {
      const { url } = await assetsService.getAssetDocumentUrl(assetId, documentId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'No se pudo abrir el documento');
    }
  };

  const handleDelete = async (doc: AssetDocument) => {
    const ok = await confirmAction(`¿Quitar "${doc.fileName}"?`);
    if (!ok) return;
    try {
      await deleteMutation.mutateAsync({ assetId, documentId: doc.id });
      toast.success('Documento eliminado');
    } catch {
      toast.error('No se pudo eliminar el documento');
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-2">
            <span className="text-sm text-muted-foreground">Tipo de documento</span>
            <SearchableSelect
              options={ASSET_DOCUMENT_TYPES.map((t) => ({
                value: t,
                label: ASSET_DOCUMENT_TYPE_LABELS[t],
              }))}
              value={docType}
              onChange={(v) => setDocType(v as AssetDocumentType)}
              showAllOption={false}
              className="w-56"
            />
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(',')}
            className="hidden"
            onChange={(e) => void handleFile(e.target.files)}
          />
          <Button
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Subir archivo
          </Button>
          <p className="text-xs text-muted-foreground">PDF, JPG, PNG o WEBP · máx {MAX_MB} MB</p>
        </div>

        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Este equipo no tiene documentos ni fotos.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium">{doc.fileName}</p>
                    <Badge variant="outline">
                      {ASSET_DOCUMENT_TYPE_LABELS[doc.documentType]}
                    </Badge>
                    {doc.isPrimary ? <Badge variant="info">Principal</Badge> : null}
                  </div>
                  {doc.description ? (
                    <p className="truncate text-xs text-muted-foreground">{doc.description}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => void handleDownload(doc.id)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void handleDelete(doc)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
