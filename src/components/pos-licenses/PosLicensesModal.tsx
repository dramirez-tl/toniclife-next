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
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { confirmAction } from '@/lib/utils';
import {
  usePosLicensesByBranch,
  useCreatePosLicense,
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
  const revokeLicense = useRevokePosLicense();
  const unbindLicense = useUnbindPosLicense();
  const [labelInput, setLabelInput] = useState('');

  // Al abrir el modal refrescamos para reflejar activaciones recientes
  // hechas desde la terminal Electron (el admin no se entera por si solo).
  useEffect(() => {
    if (isOpen) refetch();
  }, [isOpen, refetch]);

  if (!isOpen) return null;

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

          {isLoading ? (
            <div className="text-sm text-gray-500 py-6 text-center">
              Cargando licencias...
            </div>
          ) : licenses.length > 0 ? (
            <div className="border rounded-lg overflow-hidden mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-700">Clave</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-700">Etiqueta</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-700">Estado</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-700">Equipo</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {licenses.map((license: PosLicense) => (
                    <tr key={license.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-xs text-gray-900 whitespace-nowrap">
                        {license.licenseKey}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {license.label || (
                          <span className="text-gray-400 italic">sin etiqueta</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
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
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {license.status === 'active' && license.hardwareFingerprint ? (
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
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-4 italic">
              Esta sucursal aun no tiene licencias POS generadas.
            </p>
          )}

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
              variant="primary"
              onClick={handleGenerate}
              isLoading={createLicense.isPending}
              leftIcon={<PlusIcon className="h-4 w-4" />}
            >
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
