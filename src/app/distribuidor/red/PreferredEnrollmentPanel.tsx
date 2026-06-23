'use client';

// Panel de alta de un CLIENTE PREFERENTE.
// - Sin kit, sin colocación en la red MLM.
// - Nace activo con precio preferente y queda ligado al patrocinador.
// - Se le crea cuenta + contraseña temporal + invitación por correo.

import { useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { PhoneInput } from '@/components/ui/PhoneInput';
import {
  XMarkIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useRegisterPreferred } from '@/hooks/useDistributor';
import type { RegisterPreferredResult } from '@/services/distributorApi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const EMPTY = {
  firstName: '',
  lastName: '',
  mothersLastName: '',
  email: '',
  phone: '',
  rfc: '',
};

export function PreferredEnrollmentPanel({ isOpen, onClose }: Props) {
  const [form, setForm] = useState({ ...EMPTY });
  const [result, setResult] = useState<RegisterPreferredResult | null>(null);

  const registerMutation = useRegisterPreferred();

  const set = (k: keyof typeof EMPTY, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleClose = () => {
    onClose();
    window.setTimeout(() => {
      setResult(null);
      setForm({ ...EMPTY });
    }, 300);
  };

  const canSubmit =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    form.phone.trim() &&
    !registerMutation.isPending;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await registerMutation.mutateAsync({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        mothersLastName: form.mothersLastName.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone.trim(),
        rfc: form.rfc.trim() || undefined,
      });
      setResult(res);
      toast.success('Cliente preferente creado correctamente');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'No se pudo crear el cliente preferente';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  return (
    <>
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-lg transform bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Dar de alta cliente preferente"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 className="text-lg font-bold text-gray-900">
              Dar de alta cliente preferente
            </h3>
            <button
              onClick={handleClose}
              className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Cerrar"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            {result ? (
              <ResultView result={result} onCopy={copy} onClose={handleClose} />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="rounded-xl border border-[#a7c1e2]/25 bg-[#C8DDF2]/10 p-4">
                  <p className="text-sm text-gray-600">
                    El cliente preferente <strong>no compra kit</strong> y{' '}
                    <strong>no crea red</strong>. Obtiene{' '}
                    <strong>precio preferente</strong> al comprar en línea o
                    presentando su ID en sucursal. Queda registrado bajo ti.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nombre(s)" required>
                    <input
                      className={inputCls}
                      value={form.firstName}
                      onChange={(e) => set('firstName', e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Apellido paterno" required>
                    <input
                      className={inputCls}
                      value={form.lastName}
                      onChange={(e) => set('lastName', e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Apellido materno">
                    <input
                      className={inputCls}
                      value={form.mothersLastName}
                      onChange={(e) => set('mothersLastName', e.target.value)}
                    />
                  </Field>
                  <Field label="RFC">
                    <input
                      className={`${inputCls} uppercase`}
                      value={form.rfc}
                      onChange={(e) => set('rfc', e.target.value)}
                      maxLength={13}
                    />
                  </Field>
                  <Field label="Correo" required>
                    <input
                      type="email"
                      className={inputCls}
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Teléfono" required>
                    <PhoneInput
                      value={form.phone}
                      onChange={(v) => set('phone', v)}
                    />
                  </Field>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="default"
                    className="w-full"
                    disabled={registerMutation.isPending || !canSubmit}
                  >
                    {registerMutation.isPending && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    Crear y enviar invitación
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}
    </>
  );
}

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#a7c1e2]';

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function ResultView({
  result,
  onCopy,
  onClose,
}: {
  result: RegisterPreferredResult;
  onCopy: (text: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 p-4">
        <CheckCircleIcon className="h-6 w-6 flex-shrink-0 text-green-600" />
        <div>
          <p className="text-sm font-semibold text-green-800">
            {result.fullName} creado
          </p>
          <p className="text-xs text-green-700">
            {result.email}
            {result.customerNumber ? ` · ID #${result.customerNumber}` : ''}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 p-4">
        <p className="text-sm text-gray-700">
          {result.invitationSent
            ? 'Se envió la invitación por correo con sus datos de acceso.'
            : 'El cliente fue creado, pero el correo de invitación no salió. Comparte tú los datos de acceso:'}
        </p>
        {result.tempPassword && (
          <div className="mt-3 rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Contraseña temporal
            </p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="font-mono text-sm text-[#3E667D]">
                {result.tempPassword}
              </span>
              <button
                type="button"
                onClick={() => onCopy(result.tempPassword)}
                className="rounded-md p-1 text-gray-500 hover:bg-gray-200"
                aria-label="Copiar contraseña"
              >
                <ClipboardDocumentIcon className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Deberá cambiarla al iniciar sesión.
            </p>
          </div>
        )}
        {result.customerNumber && (
          <div className="mt-3 rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              ID de cliente preferente
            </p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="font-mono text-sm text-[#3E667D]">
                {result.customerNumber}
              </span>
              <button
                type="button"
                onClick={() => onCopy(result.customerNumber as string)}
                className="rounded-md p-1 text-gray-500 hover:bg-gray-200"
                aria-label="Copiar ID"
              >
                <ClipboardDocumentIcon className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Este es el ID que da en sucursal para su precio preferente.
            </p>
          </div>
        )}
      </div>

      <Button variant="outline" className="w-full" onClick={onClose}>
        Listo
      </Button>
    </div>
  );
}
