'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import {
  PhotoIcon,
  StarIcon as StarOutline,
  TrashIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  DocumentArrowUpIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { productsService } from '@/services/products.service';
import {
  useProductImages,
  useUploadProductImage,
  useUpdateProductImage,
  useDeleteProductImage,
  useProductDocuments,
  useUploadProductDocument,
  useDeleteProductDocument,
} from '@/hooks/useProducts';

interface ProductMediaSectionProps {
  productId: string;
}

const IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const IMG_MAX_MB = 10;
const PDF_MAX_MB = 20;

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function ProductMediaSection({ productId }: ProductMediaSectionProps) {
  const { data: images = [], isLoading: imagesLoading } = useProductImages(productId);
  const { data: documents = [], isLoading: docsLoading } = useProductDocuments(productId);

  const uploadImage = useUploadProductImage();
  const updateImage = useUpdateProductImage();
  const deleteImage = useDeleteProductImage();
  const uploadDoc = useUploadProductDocument();
  const deleteDoc = useDeleteProductDocument();

  const imgInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const [busyImageId, setBusyImageId] = useState<string | null>(null);
  const [busyDocId, setBusyDocId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // ---- Imágenes ----
  const handleImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    for (const file of list) {
      if (!IMG_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" no es una imagen válida (JPG, PNG, WEBP o GIF)`);
        continue;
      }
      if (file.size > IMG_MAX_MB * 1024 * 1024) {
        toast.error(`"${file.name}" supera ${IMG_MAX_MB}MB`);
        continue;
      }
      try {
        await uploadImage.mutateAsync({ productId, file });
      } catch {
        toast.error(`Error al subir "${file.name}"`);
      }
    }
    toast.success('Imágenes actualizadas');
    if (imgInputRef.current) imgInputRef.current.value = '';
  };

  const handleSetPrimary = async (imageId: string) => {
    setBusyImageId(imageId);
    try {
      await updateImage.mutateAsync({ productId, imageId, dto: { isPrimary: true } });
      toast.success('Imagen principal actualizada');
    } catch {
      toast.error('No se pudo marcar como principal');
    } finally {
      setBusyImageId(null);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    setBusyImageId(imageId);
    try {
      await deleteImage.mutateAsync({ productId, imageId });
      toast.success('Imagen eliminada');
    } catch {
      toast.error('No se pudo eliminar la imagen');
    } finally {
      setBusyImageId(null);
    }
  };

  // ---- Documentos (PDF) ----
  const handlePdfFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF');
      if (pdfInputRef.current) pdfInputRef.current.value = '';
      return;
    }
    if (file.size > PDF_MAX_MB * 1024 * 1024) {
      toast.error(`El archivo supera ${PDF_MAX_MB}MB`);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
      return;
    }
    try {
      await uploadDoc.mutateAsync({ productId, file, documentType: 'tech_sheet' });
      toast.success('Ficha técnica subida');
    } catch {
      toast.error('Error al subir el documento');
    } finally {
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  const handleDownloadDoc = async (documentId: string) => {
    setDownloadingId(documentId);
    try {
      const { url } = await productsService.getProductDocumentDownloadUrl(productId, documentId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('No se pudo generar el enlace de descarga');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteDoc = async (documentId: string) => {
    setBusyDocId(documentId);
    try {
      await deleteDoc.mutateAsync({ productId, documentId });
      toast.success('Documento eliminado');
    } catch {
      toast.error('No se pudo eliminar el documento');
    } finally {
      setBusyDocId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ============ GALERÍA DE IMÁGENES ============ */}
      <Card className="p-0">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PhotoIcon className="h-5 w-5 text-[#3E667D]" />
              <h2 className="text-lg font-bold text-gray-900">Imágenes del producto</h2>
              {images.length > 0 && (
                <span className="rounded-full bg-[#C8DDF2] px-2 py-0.5 text-xs font-medium text-[#3E667D]">
                  {images.length}
                </span>
              )}
            </div>
            <input
              ref={imgInputRef}
              type="file"
              accept={IMG_TYPES.join(',')}
              multiple
              className="hidden"
              onChange={(e) => handleImageFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => imgInputRef.current?.click()}
              disabled={uploadImage.isPending}
            >
              {uploadImage.isPending ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <ArrowUpTrayIcon className="mr-1 h-4 w-4" />
              )}
              Agregar imágenes
            </Button>
          </div>

          <p className="mb-4 text-xs text-gray-500">
            JPG, PNG, WEBP o GIF · máx {IMG_MAX_MB}MB. La imagen marcada como
            principal es la que se muestra en listados y tienda.
          </p>

          {imagesLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="size-4 animate-spin" /> Cargando imágenes...
            </div>
          ) : images.length === 0 ? (
            <button
              type="button"
              onClick={() => imgInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-10 text-center transition-colors hover:border-[#3E667D] hover:bg-gray-50"
            >
              <PhotoIcon className="mb-2 h-10 w-10 text-gray-300" />
              <p className="text-sm text-gray-600">Sin imágenes. Haz clic para agregar.</p>
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {images.map((img) => {
                const isBusy = busyImageId === img.id;
                return (
                  <div
                    key={img.id}
                    className="group relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <div className="relative aspect-square w-full">
                      <Image
                        src={img.imageUrl}
                        alt={img.altText || 'Imagen del producto'}
                        fill
                        sizes="(max-width: 768px) 50vw, 200px"
                        className="object-cover"
                        unoptimized
                      />
                      {isBusy && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
                          <Loader2 className="size-5 animate-spin text-[#3E667D]" />
                        </div>
                      )}
                    </div>

                    {img.isPrimary && (
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#3E667D] px-2 py-0.5 text-[10px] font-medium text-white">
                        <StarSolid className="h-3 w-3" /> Principal
                      </span>
                    )}

                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/45 px-2 py-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                      {!img.isPrimary ? (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(img.id)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-white hover:text-amber-300"
                          title="Marcar como principal"
                        >
                          <StarOutline className="h-4 w-4" /> Principal
                        </button>
                      ) : (
                        <span className="text-[11px] text-white/70">Imagen principal</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img.id)}
                        disabled={isBusy}
                        className="rounded p-1 text-white hover:bg-red-500/80"
                        title="Eliminar imagen"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============ FICHA TÉCNICA / DOCUMENTOS PDF ============ */}
      <Card className="p-0">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5 text-[#3E667D]" />
              <h2 className="text-lg font-bold text-gray-900">Ficha técnica (PDF)</h2>
              {documents.length > 0 && (
                <span className="rounded-full bg-[#C8DDF2] px-2 py-0.5 text-xs font-medium text-[#3E667D]">
                  {documents.length}
                </span>
              )}
            </div>
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handlePdfFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => pdfInputRef.current?.click()}
              disabled={uploadDoc.isPending}
            >
              {uploadDoc.isPending ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <DocumentArrowUpIcon className="mr-1 h-4 w-4" />
              )}
              Subir PDF
            </Button>
          </div>

          <p className="mb-4 text-xs text-gray-500">
            Documento de uso <strong>interno</strong> (no se muestra en la tienda).
            Solo PDF · máx {PDF_MAX_MB}MB.
          </p>

          {docsLoading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="size-4 animate-spin" /> Cargando documentos...
            </div>
          ) : documents.length === 0 ? (
            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-8 text-center transition-colors hover:border-[#3E667D] hover:bg-gray-50"
            >
              <DocumentArrowUpIcon className="mb-2 h-9 w-9 text-gray-300" />
              <p className="text-sm text-gray-600">Sin ficha técnica. Haz clic para subir un PDF.</p>
            </button>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => {
                const isBusy = busyDocId === doc.id;
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 p-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
                      <DocumentTextIcon className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{doc.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {[formatBytes(doc.fileSize), doc.uploadedByName?.split('@')[0]]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadDoc(doc.id)}
                      disabled={downloadingId === doc.id}
                    >
                      {downloadingId === doc.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      )}
                      Ver
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDoc(doc.id)}
                      disabled={isBusy}
                      className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                      title="Eliminar documento"
                    >
                      {isBusy ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <TrashIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
