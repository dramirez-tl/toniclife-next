'use client';

import { useRef, useState, useCallback, useEffect, useId } from 'react';
import { Upload, File as FileIcon, X, Image as ImageIcon, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * Textos del componente. Todos opcionales: los valores por defecto son los
 * de siempre (español) para no cambiar a los consumidores existentes; las
 * pantallas bilingües pasan sus traducciones. `{max}` se sustituye por el
 * tamaño máximo en MB.
 */
export interface FileUploadTexts {
  statusPending: string;
  statusValidated: string;
  statusRejected: string;
  statusExpired: string;
  reasonPrefix: string;
  viewCurrent: string;
  dropHint: string;
  selectFile: string;
  allowedHint: string;
  errorTooLarge: string;
  errorType: string;
  removeFile: string;
  uploading: string;
}

const DEFAULT_TEXTS: FileUploadTexts = {
  statusPending: 'Pendiente de validación',
  statusValidated: 'Validado',
  statusRejected: 'Rechazado',
  statusExpired: 'Vencido',
  reasonPrefix: 'Motivo:',
  viewCurrent: 'Ver documento actual',
  dropHint: 'Arrastra y suelta tu archivo aquí',
  selectFile: 'Seleccionar archivo',
  allowedHint: 'JPG, PNG o PDF (máx. {max}MB)',
  errorTooLarge: 'El archivo excede {max}MB',
  errorType: 'Tipo de archivo no permitido. Usa JPG, PNG o PDF.',
  removeFile: 'Eliminar archivo',
  uploading: 'Subiendo…',
};

interface FileUploadProps {
  label: string;
  name: string;
  accept?: string;
  maxSizeMB?: number;
  existingUrl?: string | null;
  status?: 'pending' | 'validated' | 'rejected' | 'expired' | null;
  rejectionReason?: string | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  /** Traducciones (parciales); lo que falte usa el español por defecto. */
  texts?: Partial<FileUploadTexts>;
  /** id del botón "Seleccionar archivo" (para `<Label htmlFor>` externo). */
  id?: string;
  'aria-describedby'?: string;
  /** Porcentaje 0-100 mientras se sube; null/undefined = sin barra. */
  progress?: number | null;
  /** Oculta el badge de estado (cuando el contenedor ya lo muestra). */
  hideStatus?: boolean;
  /**
   * Cambia este valor para limpiar el archivo seleccionado desde fuera (p. ej.
   * tras subirlo). Evita que el consumidor tenga que remontar el componente.
   */
  resetKey?: number | string;
}

const statusIcons = {
  pending: Clock,
  validated: CheckCircle2,
  rejected: XCircle,
  expired: XCircle,
} as const;

const statusColors = {
  pending: 'text-amber-600 bg-amber-50 border-amber-200',
  validated: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  rejected: 'text-destructive bg-destructive/10 border-destructive/20',
  expired: 'text-destructive bg-destructive/10 border-destructive/20',
} as const;

export function FileUpload({
  label,
  name,
  accept = 'image/jpeg,image/png,application/pdf',
  maxSizeMB = 5,
  existingUrl,
  status,
  rejectionReason,
  onChange,
  disabled = false,
  texts,
  id,
  'aria-describedby': ariaDescribedBy,
  progress,
  hideStatus = false,
  resetKey,
}: FileUploadProps) {
  const t: FileUploadTexts = { ...DEFAULT_TEXTS, ...texts };
  const fill = (s: string) => s.replace('{max}', String(maxSizeMB));
  const autoId = useId();
  const buttonId = id ?? `${autoId}-file`;
  const errorId = `${autoId}-error`;

  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate (and clean up) an object URL for image previews
  useEffect(() => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [selectedFile]);

  // Limpieza externa (tras subir): no dispara onChange para no re-subir.
  const firstReset = useRef(true);
  useEffect(() => {
    if (firstReset.current) {
      firstReset.current = false;
      return;
    }
    setSelectedFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  }, [resetKey]);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(fill(t.errorTooLarge));
        return;
      }
      const allowedTypes = accept.split(',').map((x) => x.trim());
      if (!allowedTypes.includes(file.type)) {
        setError(t.errorType);
        return;
      }
      setSelectedFile(file);
      onChange(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [accept, maxSizeMB, onChange, t.errorTooLarge, t.errorType],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setError(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const isImage = (filename: string) =>
    /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);

  const StatusIcon = status ? statusIcons[status] : null;
  const statusLabel = status
    ? {
        pending: t.statusPending,
        validated: t.statusValidated,
        rejected: t.statusRejected,
        expired: t.statusExpired,
      }[status]
    : null;

  const uploading = typeof progress === 'number';
  const describedBy = [ariaDescribedBy, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={buttonId} className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      {/* Status badge */}
      {!hideStatus && StatusIcon && status && (
        <div
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
            statusColors[status],
          )}
        >
          <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {statusLabel}
        </div>
      )}

      {/* Rejection reason */}
      {!hideStatus && status === 'rejected' && rejectionReason && (
        <p className="rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">
          {t.reasonPrefix} {rejectionReason}
        </p>
      )}

      {/* Existing file indicator */}
      {existingUrl && !selectedFile && (
        <div className="flex items-center gap-2 rounded-lg border border-input bg-muted px-3 py-2 text-sm">
          {isImage(existingUrl) ? (
            <ImageIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          ) : (
            <FileIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          )}
          <a
            href={existingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 truncate text-primary hover:underline"
          >
            {t.viewCurrent}
          </a>
        </div>
      )}

      {/* Selected file */}
      {selectedFile && (
        <div className="flex items-center gap-3 rounded-lg border border-input bg-accent/40 px-3 py-2 text-sm">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={selectedFile.name}
              className="h-10 w-10 shrink-0 rounded border border-input object-cover"
            />
          ) : (
            <FileIcon className="h-5 w-5 shrink-0 text-foreground" aria-hidden="true" />
          )}
          <span className="flex-1 truncate text-foreground">{selectedFile.name}</span>
          <span className="text-xs text-muted-foreground">
            {(selectedFile.size / 1024 / 1024).toFixed(1)}MB
          </span>
          {!disabled && !uploading && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={removeFile}
              className="text-muted-foreground hover:text-destructive"
              aria-label={t.removeFile}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      )}

      {/* Upload progress */}
      {uploading && (
        <div className="space-y-1" aria-live="polite">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress ?? 0}
            aria-label={t.uploading}
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress ?? 0}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t.uploading} {progress ?? 0}%
          </p>
        </div>
      )}

      {/* Drop zone */}
      {!selectedFile && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors',
            dragOver
              ? 'border-ring bg-accent ring-2 ring-ring/30'
              : 'border-input hover:bg-accent/50',
            disabled && 'cursor-not-allowed bg-muted opacity-50',
          )}
        >
          <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">{t.dropHint}</p>
          <Button
            id={buttonId}
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            aria-describedby={describedBy}
            onClick={() => !disabled && inputRef.current?.click()}
          >
            {t.selectFile}
          </Button>
          <p className="text-xs text-muted-foreground">{fill(t.allowedHint)}</p>
        </div>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
