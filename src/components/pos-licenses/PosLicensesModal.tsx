// PosLicensesModal - Modal enfocado solo a licencias POS de una sucursal.
//
// Se abre desde el row action "Licencias" en /admin/sucursales y permite
// generar, copiar, liberar y revocar licencias sin tener que entrar al
// editor completo de la sucursal.

'use client';

import { useEffect, useState } from 'react';
import {
  KeyIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  LockClosedIcon,
  LockOpenIcon,
  XCircleIcon,
  ComputerDesktopIcon,
  PencilSquareIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DataTable, type DataTableColumn } from '@/components/ui';
import { confirmAction } from '@/lib/utils';
import {
  usePosLicensesByBranch,
  useCreatePosLicense,
  useUpdatePosLicense,
  useRevokePosLicense,
  useUnbindPosLicense,
} from '@/hooks/usePosLicenses';
import type { PosLicense } from '@/types/posLicense';

interface PosLicensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  branchName: string;
  branchCode?: string;
}

export function PosLicensesModal({
  isOpen,
  onClose,
  branchId,
  branchName,
  branchCode,
}: PosLicensesModalProps) {
  const { data: licenses = [], isLoading, refetch } = usePosLicensesByBranch(
    isOpen ? branchId : undefined,
  );
  const createLicense = useCreatePosLicense();
  const updateLicense = useUpdatePosLicense();
  const revokeLicense = useRevokePosLicense();
  const unbindLicense = useUnbindPosLicense();
  const [labelInput, setLabelInput] = useState('');
  // Edición en línea de la etiqueta: con ella se identifica en qué terminal
  // (caja) se cobró cada venta en sucursales con varias terminales.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Al abrir el modal refrescamos para reflejar activaciones recientes
  // hechas desde la terminal Electron (el admin no se entera por si solo).
  useEffect(() => {
    if (isOpen) refetch();
  }, [isOpen, refetch]);

  if (!isOpen) return null;

  function startEditLabel(license: PosLicense) {
    setEditingId(license.id);
    setEditValue(license.label ?? '');
  }

  function cancelEditLabel() {
    setEditingId(null);
    setEditValue('');
  }

  async function saveLabel(license: PosLicense) {
    const label = editValue.trim();
    if (label === (license.label ?? '')) {
      cancelEditLabel();
      return;
    }
    try {
      await updateLicense.mutateAsync({ id: license.id, dto: { label } });
      toast.success(
        label
          ? `Etiqueta guardada: ${label}. La terminal la muestra al reiniciar.`
          : 'Etiqueta eliminada.',
      );
      cancelEditLabel();
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Error al guardar la etiqueta');
    }
  }

  async function handleGenerate() {
    try {
      const license = await createLicense.mutateAsync({
        branchId,
        label: labelInput.trim() || undefined,
      });
      toast.success(`Licencia generada: ${license.licenseKey}`);
      setLabelInput('');
      try {
        await navigator.clipboard.writeText(license.licenseKey);
        toast.success('Clave copiada al portapapeles', { duration: 2500 });
      } catch {
        // ignore clipboard failure
      }
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Error al generar licencia');
    }
  }

  async function handleCopy(licenseKey: string) {
    try {
      await navigator.clipboard.writeText(licenseKey);
      toast.success('Clave copiada al portapapeles');
    } catch {
      toast.error('No se pudo copiar la clave');
    }
  }

  async function handleUnbind(license: PosLicense) {
    if (!(await confirmAction(
      `Liberar la licencia ${license.licenseKey} del equipo actual? Quedara lista para activarse en otra maquina.`,
    ))) return;
    try {
      await unbindLicense.mutateAsync(license.id);
      toast.success('Licencia liberada del equipo');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Error al liberar licencia');
    }
  }

  async function handleRevoke(license: PosLicense) {
    if (!(await confirmAction(
      `Revocar la licencia ${license.licenseKey} permanentemente? Esta accion no se puede deshacer.`,
    ))) return;
    try {
      await revokeLicense.mutateAsync({ id: license.id });
      toast.success('Licencia revocada');
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message || 'Error al revocar licencia');
    }
  }

  const columns: DataTableColumn<PosLicense>[] = [
    {
      key: 'licenseKey',
      header: 'Clave',
      cellClassName: 'font-mono text-xs text-gray-900 whitespace-nowrap',
      render: (license) => license.licenseKey,
    },
    {
      key: 'label',
      header: 'Etiqueta',
      cellClassName: 'text-gray-700',
      render: (license) =>
        editingId === license.id ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void saveLabel(license);
                if (e.key === 'Escape') cancelEditLabel();
              }}
              placeholder="Ej. Caja 1 mostrador"
              maxLength={100}
              disabled={updateLicense.isPending}
              className="w-40 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => void saveLabel(license)}
              disabled={updateLicense.isPending}
              className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors disabled:opacity-50"
              title="Guardar etiqueta (Enter)"
            >
              {updateLicense.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckIcon className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={cancelEditLabel}
              disabled={updateLicense.isPending}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              title="Cancelar (Esc)"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 group">
            {license.label || (
              <span className="text-gray-400 italic">sin etiqueta</span>
            )}
            {license.status !== 'revoked' && (
              <button
                type="button"
                onClick={() => startEditLabel(license)}
                className="p-1 rounded hover:bg-blue-50 text-gray-300 group-hover:text-gray-400 hover:!text-blue-600 transition-colors"
                title="Editar etiqueta (nombre de la terminal en el corte y en las ventas)"
              >
                <PencilSquareIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (license) => (
        <>
          {license.status === 'active' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              <LockClosedIcon className="h-3 w-3" />
              Activa
            </span>
          )}
          {license.status === 'inactive' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
              <LockOpenIcon className="h-3 w-3" />
              Sin canjear
            </span>
          )}
          {license.status === 'revoked' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
              <XCircleIcon className="h-3 w-3" />
              Revocada
            </span>
          )}
        </>
      ),
    },
    {
      key: 'hardware',
      header: 'Equipo',
      cellClassName: 'text-xs text-gray-600',
      render: (license) =>
        license.status === 'active' && license.hardwareFingerprint ? (
          <div className="flex items-center gap-1">
            <ComputerDesktopIcon className="h-3 w-3 text-gray-400 shrink-0" />
            <div>
              <div className="font-medium text-gray-800">
                {(license.hardwareInfo?.hostname as string | undefined) ??
                  `HW-${license.hardwareFingerprint.slice(0, 12).toUpperCase()}`}
              </div>
              {license.hardwareInfo?.osPlatform && (
                <div className="text-gray-500">
                  {license.hardwareInfo.osPlatform as string}{' '}
                  {(license.hardwareInfo.osRelease as string | undefined) ?? ''}
                </div>
              )}
            </div>
          </div>
        ) : (
          <span className="text-gray-400 italic">no vinculada</span>
        ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (license) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleCopy(license.licenseKey)}
            className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
            title="Copiar clave"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
          </button>
          {license.status === 'active' && (
            <button
              onClick={() => handleUnbind(license)}
              className="p-1 rounded hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
              title="Liberar del equipo (sigue siendo valida)"
            >
              <LockOpenIcon className="h-4 w-4" />
            </button>
          )}
          {license.status !== 'revoked' && (
            <button
              onClick={() => handleRevoke(license)}
              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
              title="Revocar permanentemente"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#3E667D]/10 p-2">
              <KeyIcon className="h-5 w-5 text-[#3E667D]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Licencias POS
              </h2>
              <p className="text-xs text-gray-500">
                {branchCode ? `${branchCode} — ` : ''}
                {branchName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-xs text-gray-500 mb-4">
            Cada licencia activa una terminal Electron en un equipo especifico.
            Tras la primera activacion la licencia queda vinculada al hardware
            y no puede usarse en otra maquina hasta liberarla o revocarla.
          </p>

          <div className="border rounded-lg overflow-hidden mb-4">
            <DataTable<PosLicense>
              columns={columns}
              data={licenses}
              getRowKey={(license, index) => String(license.id ?? index)}
              isLoading={isLoading}
              emptyMessage="Esta sucursal aun no tiene licencias POS generadas."
            />
          </div>

          {/* Inline create form */}
          <div className="border rounded-lg p-3 bg-gray-50 flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Etiqueta para identificar la terminal (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. Caja 1 mostrador, Call Center turno noche"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerate();
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#3E667D] focus:border-transparent"
                maxLength={100}
              />
            </div>
            <Button
              variant="default"
              onClick={handleGenerate}
              disabled={createLicense.isPending}
            >
              {createLicense.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              <PlusIcon className="h-4 w-4" />
              Generar licencia
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
