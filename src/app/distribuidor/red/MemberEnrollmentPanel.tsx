'use client';

// Panel de alta de un nuevo miembro en la red del distribuidor.
// - Colocación bajo cualquier nodo de su red (o bajo sí mismo).
// - Modo de pago del kit:
//     · invite  → se crea el miembro y se le envía invitación por correo para
//                 que inicie sesión, elija y pague su kit (Ruta B).
//     · sponsor → el patrocinador paga el kit ahora: se genera una orden + URL
//                 de Stripe (Ruta A). Al pagarse, el miembro se activa.

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Loader2 } from 'lucide-react';
import {
  XMarkIcon,
  CheckCircleIcon,
  CreditCardIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { kitsService } from '@/services/kits.service';
import { networkApi } from '@/services/networkApi';
import { useRegisterMember } from '@/hooks/useDistributor';
import type {
  RegisterMemberResult,
  KitPayerMode,
} from '@/services/distributorApi';

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

export function MemberEnrollmentPanel({ isOpen, onClose }: Props) {
  const [form, setForm] = useState({ ...EMPTY });
  const [uplineCustomerId, setUplineCustomerId] = useState(''); // '' = bajo mí
  const [kitProductId, setKitProductId] = useState('');
  const [payerMode, setPayerMode] = useState<KitPayerMode>('invite');
  const [result, setResult] = useState<RegisterMemberResult | null>(null);

  const registerMutation = useRegisterMember();

  const kitsQuery = useQuery({
    queryKey: ['enrollment-kits'],
    queryFn: () => kitsService.listKits({ limit: 100 }),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });

  const downlinesQuery = useQuery({
    queryKey: ['enroll-downlines'],
    queryFn: () =>
      networkApi.getDownlines({
        limit: 100,
        sortBy: 'level',
        sortOrder: 'asc',
      }),
    enabled: isOpen,
    staleTime: 60 * 1000,
  });

  const kitOptions = useMemo(
    () =>
      (kitsQuery.data?.data ?? []).map((k) => ({
        value: k.id,
        label: k.price
          ? `${k.name} — $${Number(k.price).toLocaleString()}`
          : k.name,
      })),
    [kitsQuery.data],
  );

  const uplineOptions = useMemo(
    () =>
      (downlinesQuery.data?.data ?? []).map((m) => ({
        value: m.id,
        label: `${m.fullName} · Nivel ${m.level}`,
      })),
    [downlinesQuery.data],
  );

  const set = (k: keyof typeof EMPTY, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const resetAll = () => {
    setForm({ ...EMPTY });
    setUplineCustomerId('');
    setKitProductId('');
    setPayerMode('invite');
  };

  const handleClose = () => {
    onClose();
    // limpiar tras la animación de cierre
    window.setTimeout(() => {
      setResult(null);
      resetAll();
    }, 300);
  };

  const canSubmit =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    form.phone.trim() &&
    (payerMode === 'invite' || !!kitProductId) &&
    !registerMutation.isPending;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (payerMode === 'sponsor' && !kitProductId) {
      toast.error('Para que el patrocinador pague, elige un kit.');
      return;
    }
    try {
      const res = await registerMutation.mutateAsync({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        mothersLastName: form.mothersLastName.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone.trim(),
        rfc: form.rfc.trim() || undefined,
        uplineCustomerId: uplineCustomerId || undefined,
        kitProductId: kitProductId || undefined,
        payerMode,
      });
      setResult(res);
      toast.success('Miembro creado correctamente');
      if (payerMode === 'sponsor' && res.paymentUrl) {
        window.open(res.paymentUrl, '_blank', 'noopener');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'No se pudo crear el miembro';
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
        aria-label="Dar de alta nuevo miembro"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h3 className="text-lg font-bold text-gray-900">
              Dar de alta nuevo miembro
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
                {/* Datos personales */}
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

                {/* Colocación en la red */}
                <Field label="Colocar bajo (upline)">
                  <SearchableSelect
                    options={uplineOptions}
                    value={uplineCustomerId}
                    onChange={setUplineCustomerId}
                    allLabel="Yo mismo (directo bajo mí)"
                    allValue=""
                    placeholder={
                      downlinesQuery.isLoading
                        ? 'Cargando tu red...'
                        : 'Buscar en mi red...'
                    }
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Por defecto queda directo bajo ti. Puedes colocarlo bajo
                    cualquier miembro de tu red.
                  </p>
                </Field>

                {/* Modo de pago del kit */}
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-700">
                    Pago del kit
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    <PayerOption
                      active={payerMode === 'invite'}
                      onClick={() => setPayerMode('invite')}
                      icon={<EnvelopeIcon className="h-5 w-5" />}
                      title="Enviar invitación por correo"
                      desc="El nuevo miembro inicia sesión, elige y paga su kit."
                    />
                    <PayerOption
                      active={payerMode === 'sponsor'}
                      onClick={() => setPayerMode('sponsor')}
                      icon={<CreditCardIcon className="h-5 w-5" />}
                      title="Yo pago el kit ahora"
                      desc="Se genera un pago (Stripe) para el kit del miembro."
                    />
                  </div>
                </div>

                {/* Kit (solo si el patrocinador paga) */}
                {payerMode === 'sponsor' && (
                  <Field label="Kit de inscripción" required>
                    <SearchableSelect
                      options={kitOptions}
                      value={kitProductId}
                      onChange={setKitProductId}
                      allLabel="— Selecciona un kit —"
                      allValue=""
                      placeholder={
                        kitsQuery.isLoading
                          ? 'Cargando kits...'
                          : 'Buscar kit...'
                      }
                    />
                  </Field>
                )}

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="default"
                    className="w-full"
                    disabled={registerMutation.isPending || (!canSubmit)}
                  >
                    {registerMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {payerMode === 'sponsor'
                      ? 'Crear y generar pago'
                      : 'Crear y enviar invitación'}
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

function PayerOption({
  active,
  onClick,
  icon,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
        active
          ? 'border-[#3E667D] bg-[#C8DDF2]/20 ring-1 ring-[#3E667D]'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <span
        className={`mt-0.5 flex-shrink-0 ${active ? 'text-[#3E667D]' : 'text-gray-400'}`}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-gray-900">
          {title}
        </span>
        <span className="block text-xs text-gray-500">{desc}</span>
      </span>
    </button>
  );
}

function ResultView({
  result,
  onCopy,
  onClose,
}: {
  result: RegisterMemberResult;
  onCopy: (text: string) => void;
  onClose: () => void;
}) {
  const isSponsor = result.payerMode === 'sponsor';
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
            {result.customerNumber ? ` · #${result.customerNumber}` : ''}
          </p>
        </div>
      </div>

      {/* Ruta A: pago del patrocinador */}
      {isSponsor && (
        <div className="rounded-xl border border-gray-200 p-4">
          {result.paymentUrl ? (
            <>
              <p className="text-sm text-gray-700">
                Orden del kit
                {result.kitOrderNumber ? (
                  <span className="font-mono"> #{result.kitOrderNumber}</span>
                ) : null}{' '}
                generada. Continúa al pago para activar al miembro.
              </p>
              <a
                href={result.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block"
              >
                <Button variant="default" className="w-full">
                  <CreditCardIcon className="h-4 w-4" />
                  Ir a pagar el kit
                </Button>
              </a>
              <p className="mt-2 text-xs text-gray-500">
                Si no se abrió automáticamente, usa este botón. El miembro se
                activa cuando se confirma el pago.
              </p>
            </>
          ) : (
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-amber-500" />
              <p className="text-sm text-amber-700">
                El miembro quedó creado, pero no se pudo generar el pago
                {result.paymentError ? `: ${result.paymentError}` : ''}. Puedes
                reintentar el pago del kit más tarde.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Ruta B: invitación */}
      {!isSponsor && (
        <div className="rounded-xl border border-gray-200 p-4">
          <p className="text-sm text-gray-700">
            {result.invitationSent
              ? 'Se envió la invitación por correo con sus datos de acceso.'
              : 'El miembro fue creado, pero el correo de invitación no salió. Comparte tú los datos de acceso:'}
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
                  onClick={() => onCopy(result.tempPassword as string)}
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
        </div>
      )}

      <Button variant="outline" className="w-full" onClick={onClose}>
        Listo
      </Button>
    </div>
  );
}
