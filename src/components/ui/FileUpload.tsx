'use client';

import { useRef, useState, useCallback } from 'react';
import {
  ArrowUpTrayIcon,
  DocumentIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

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
    icon: ClockIcon,
    label: 'Pendiente de validación',
    color: 'text-amber-600 bg-amber-50 border-amber-200',
  },
  validated: {
    icon: CheckCircleIcon,
    label: 'Validado',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  rejected: {
    icon: XCircleIcon,
    label: 'Rechazado',
    color: 'text-red-600 bg-red-50 border-red-200',
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
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}

      {/* Status badge */}
      {statusInfo && (
        <div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusInfo.color}`}>
          <statusInfo.icon className="h-3.5 w-3.5" />
          {statusInfo.label}
        </div>
      )}

      {/* Rejection reason */}
      {status === 'rejected' && rejectionReason && (
        <p className="text-xs text-red-600 bg-red-50 rounded px-2 py-1">
          Motivo: {rejectionReason}
        </p>
      )}

      {/* Existing file indicator */}
      {existingUrl && !selectedFile && (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
          {isImage(existingUrl) ? (
            <PhotoIcon className="h-5 w-5 text-gray-400" />
          ) : (
            <DocumentIcon className="h-5 w-5 text-gray-400" />
          )}
          <a
            href={existingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#3E667D] hover:underline truncate flex-1"
          >
            Ver documento actual
          </a>
        </div>
      )}

      {/* Selected file */}
      {selectedFile && (
        <div className="flex items-center gap-2 rounded-lg border border-[#3E667D]/20 bg-[#3E667D]/5 px-3 py-2 text-sm">
          <DocumentIcon className="h-5 w-5 text-[#3E667D]" />
          <span className="truncate flex-1 text-gray-700">{selectedFile.name}</span>
          <span className="text-xs text-gray-500">
            {(selectedFile.size / 1024 / 1024).toFixed(1)}MB
          </span>
          {!disabled && (
            <button
              type="button"
              onClick={removeFile}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
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
          onClick={() => !disabled && inputRef.current?.click()}
          className={`
            flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-4
            transition-colors cursor-pointer
            ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}
            ${dragOver ? 'border-[#3E667D] bg-[#3E667D]/5' : 'border-gray-300 hover:border-[#3E667D]/40 hover:bg-gray-50'}
          `}
        >
          <ArrowUpTrayIcon className="h-6 w-6 text-gray-400 mb-1" />
          <p className="text-xs text-gray-500">
            Arrastra o <span className="text-[#3E667D] font-medium">selecciona</span> un archivo
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG o PDF (máx. {maxSizeMB}MB)</p>
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

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
