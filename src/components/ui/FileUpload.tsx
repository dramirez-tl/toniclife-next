'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Upload, File as FileIcon, X, Image as ImageIcon, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  label: string;
  name: string;
  accept?: string;
  maxSizeMB?: number;
  existingUrl?: string | null;
  status?: 'pending' | 'validated' | 'rejected' | null;
  rejectionReason?: string | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

const statusConfig = {
  pending: {
    icon: Clock,
    label: 'Pendiente de validación',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  validated: {
    icon: CheckCircle2,
    label: 'Validado',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  rejected: {
    icon: XCircle,
    label: 'Rechazado',
    color: 'text-destructive bg-destructive/10 border-destructive/20',
  },
};

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
}: FileUploadProps) {
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

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`El archivo excede ${maxSizeMB}MB`);
        return;
      }
      const allowedTypes = accept.split(',').map((t) => t.trim());
      if (!allowedTypes.includes(file.type)) {
        setError('Tipo de archivo no permitido. Usa JPG, PNG o PDF.');
        return;
      }
      setSelectedFile(file);
      onChange(file);
    },
    [accept, maxSizeMB, onChange],
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

  const statusInfo = status ? statusConfig[status] : null;

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-foreground">{label}</label>
      )}

      {/* Status badge */}
      {statusInfo && (
        <div
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
            statusInfo.color,
          )}
        >
          <statusInfo.icon className="h-3.5 w-3.5" />
          {statusInfo.label}
        </div>
      )}

      {/* Rejection reason */}
      {status === 'rejected' && rejectionReason && (
        <p className="rounded bg-destructive/10 px-2 py-1 text-xs text-destructive">
          Motivo: {rejectionReason}
        </p>
      )}

      {/* Existing file indicator */}
      {existingUrl && !selectedFile && (
        <div className="flex items-center gap-2 rounded-lg border border-input bg-muted px-3 py-2 text-sm">
          {isImage(existingUrl) ? (
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          ) : (
            <FileIcon className="h-5 w-5 text-muted-foreground" />
          )}
          <a
            href={existingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 truncate text-primary hover:underline"
          >
            Ver documento actual
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
            <FileIcon className="h-5 w-5 shrink-0 text-foreground" />
          )}
          <span className="flex-1 truncate text-foreground">{selectedFile.name}</span>
          <span className="text-xs text-muted-foreground">
            {(selectedFile.size / 1024 / 1024).toFixed(1)}MB
          </span>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={removeFile}
              className="text-muted-foreground hover:text-destructive"
              aria-label="Eliminar archivo"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
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
          <Upload className="h-6 w-6 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Arrastra y suelta tu archivo aquí
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => !disabled && inputRef.current?.click()}
          >
            Seleccionar archivo
          </Button>
          <p className="text-[10px] text-muted-foreground">
            JPG, PNG o PDF (máx. {maxSizeMB}MB)
          </p>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}
