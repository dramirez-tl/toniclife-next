'use client';

// KitProspectModal — Modal de captura de prospecto para vender un kit
// de inscripción desde el POS.
//
// Reglas que aplica:
//   1. El cliente seleccionado en el POS (sponsor) debe ser distribuidor activo.
//      El componente NO lo valida directamente, debe ser pasado por el padre
//      (PosCart) que ya tiene esa información.
//   2. El producto agregado al carrito debe ser un kit con kit_position
//      definido. Si no lo es, mostramos error.
//   3. Al confirmar, llama a POST /customers/kit-enrollment (useEnrollKitProspect)
//      y emite onEnrolled({ customerId, customerNumber, tempPassword }) al padre,
//      que debe usar customerId como el cliente de la venta del POS para cobrar
//      el kit.

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { XMarkIcon, UserPlusIcon, ClipboardIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useEnrollKitProspect } from '@/hooks/useKits';
import { KIT_POSITION_LABEL, type KitPosition } from '@/types/product';
import type { KitEnrollmentResponse } from '@/types/kit';

export interface KitProspectModalProps {
  open: boolean;
  onClose: () => void;
  /** Distribuidor patrocinador (cliente seleccionado en POS) */
  sponsor: {
    id: string;
    customerNumber?: string;
    firstName: string;
    lastName: string;
    customerType?: string;
    status?: string;
  } | null;
  /** Kit que se está vendiendo (debe tener kit_position) */
  kit: {
    id: string;
    code: string;
    name: string;
    kitPosition?: string;
  } | null;
  /** Sucursal donde se está haciendo la venta */
  branchId?: string;
  /** Callback al inscribir exitosamente. El padre debe setear el customer del POS al customerId devuelto. */
  onEnrolled: (result: KitEnrollmentResponse) => void;
}

export function KitProspectModal({
  open,
  onClose,
  sponsor,
  kit,
  branchId,
  onEnrolled,
}: KitProspectModalProps) {
  const enrollMutation = useEnrollKitProspect();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mothersLastName, setMothersLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [rfc, setRfc] = useState('');
  const [sendEmail, setSendEmail] = useState(true);

  const [result, setResult] = useState<KitEnrollmentResponse | null>(null);

  const resetAndClose = () => {
    setFirstName('');
    setLastName('');
    setMothersLastName('');
    setEmail('');
    setPhone('');
    setRfc('');
    setResult(null);
    onClose();
  };

  // Validaciones suaves: si el padre no provee customerType/status, asumimos válido
  // y dejamos que el backend rechace con 400 si no lo es. Solo bloqueamos si tenemos
  // datos explícitos que indican un sponsor inválido.
  const sponsorMissing = !sponsor;
  const sponsorInvalid =
    sponsorMissing ||
    (sponsor.customerType !== undefined && sponsor.customerType !== 'distributor') ||
    (sponsor.status !== undefined && sponsor.status !== 'active');

  const kitInvalid = !kit || !kit.kitPosition;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsor || !kit) return;

    if (sponsorInvalid) {
      toast.error('El cliente seleccionado en el POS no es un distribuidor activo');
      return;
    }
    if (kitInvalid) {
      toast.error('El kit no tiene posición definida (configúrala en /admin/kits)');
      return;
    }

    try {
      const resp = await enrollMutation.mutateAsync({
        sponsorCustomerId: sponsor.id,
        kitProductId: kit.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        mothersLastName: mothersLastName.trim() || undefined,
        email: email.trim(),
        phone: phone.trim(),
        rfc: rfc.trim() || undefined,
        branchId,
        sendCredentialsByEmail: sendEmail,
      });
      setResult(resp);
      toast.success(`Distribuidor inscrito: ${resp.customerNumber}`);
      onEnrolled(resp);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al inscribir prospecto';
      toast.error(msg);
    }
  };

  const copyPassword = () => {
    if (result?.tempPassword) {
      navigator.clipboard.writeText(result.tempPassword);
      toast.success('Contraseña copiada al portapapeles');
    }
  };

  // -------- Render --------
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && resetAndClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto z-50">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white px-6 py-4 flex items-center justify-between rounded-t-lg sticky top-0 z-10">
            <Dialog.Title className="flex items-center gap-2 text-xl font-semibold">
              <UserPlusIcon className="h-6 w-6" />
              Inscribir distribuidor con kit
            </Dialog.Title>
            <Dialog.Close className="text-white/80 hover:text-white">
              <XMarkIcon className="h-6 w-6" />
            </Dialog.Close>
          </div>

          {result ? (
            // ----- Pantalla de éxito -----
            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">Inscripción creada (pendiente de pago)</h3>
                <dl className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">N° distribuidor:</dt>
                    <dd className="font-mono font-semibold">{result.customerNumber}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Estado:</dt>
                    <dd className="font-semibold">{result.status}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Posición:</dt>
                    <dd className="font-semibold">
                      {KIT_POSITION_LABEL[result.kitPosition as KitPosition] || result.kitPosition}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Sponsor:</dt>
                    <dd>
                      {result.sponsor.name} ({result.sponsor.customerNumber})
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-amber-900 mb-2">⚠ Contraseña temporal</h3>
                <p className="text-xs text-amber-800 mb-2">
                  Esta contraseña solo se muestra UNA vez. Entrégasela al nuevo distribuidor o cópiala antes de cerrar.
                  Al primer ingreso se le pedirá vincular su correo electrónico.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-amber-300 px-3 py-2 rounded font-mono text-sm">
                    {result.tempPassword}
                  </code>
                  <Button variant="outline" size="sm" onClick={copyPassword}>
                    <ClipboardIcon className="h-4 w-4" />
                    Copiar
                  </Button>
                </div>
              </div>

              {result.sponsorBonus && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm">
                  <p className="font-semibold text-emerald-900 mb-1">Bono al patrocinador</p>
                  <p className="text-emerald-800">
                    {sponsor ? `${sponsor.firstName} ${sponsor.lastName}` : 'El sponsor'} recibirá{' '}
                    <span className="font-bold">
                      {result.sponsorBonus.currencyCode}{' '}
                      {result.sponsorBonus.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>{' '}
                    por esta inscripción ({result.sponsorBonus.countryCode}).
                  </p>
                  <p className="text-xs text-emerald-700 mt-1">
                    El pago se procesa en el siguiente ciclo de comisiones.
                  </p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <p className="font-semibold text-blue-900 mb-1">Siguiente paso:</p>
                <p className="text-blue-800">
                  El POS ya cambió el cliente activo al nuevo distribuidor <strong>{result.customerNumber}</strong>.
                  Procede a cobrar el kit normalmente. Cuando se confirme el pago, el distribuidor pasará a estado activo.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="default" onClick={resetAndClose}>
                  Continuar al cobro
                </Button>
              </div>
            </div>
          ) : (
            // ----- Formulario -----
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Sponsor + kit info */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm space-y-1">
                <div>
                  <span className="text-gray-600">Patrocinador (sponsor):</span>{' '}
                  {sponsor ? (
                    <span className="font-medium">
                      {sponsor.firstName} {sponsor.lastName}
                      {sponsor.customerNumber && (
                        <span className="text-gray-500 font-mono ml-2">({sponsor.customerNumber})</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-red-600">Ninguno seleccionado en el POS</span>
                  )}
                </div>
                <div>
                  <span className="text-gray-600">Kit a vender:</span>{' '}
                  {kit ? (
                    <span className="font-medium">
                      {kit.name} <span className="text-gray-500 font-mono ml-1">({kit.code})</span>
                      {kit.kitPosition && (
                        <span className="ml-2 inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                          {KIT_POSITION_LABEL[kit.kitPosition as KitPosition] || kit.kitPosition}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-red-600">No identificado</span>
                  )}
                </div>
              </div>

              {sponsorInvalid && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm">
                  El cliente seleccionado en el POS no es un distribuidor activo. Cambia el cliente antes de continuar.
                </div>
              )}
              {kitInvalid && !sponsorInvalid && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded text-sm">
                  Este kit no tiene posición definida. Edítalo en /admin/kits y asígnale Básico, Premium o Preferente.
                </div>
              )}

              <h3 className="font-semibold text-gray-900 pt-2">Datos del nuevo distribuidor</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre(s) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apellido paterno <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellido materno</label>
                <input
                  type="text"
                  value={mothersLastName}
                  onChange={(e) => setMothersLastName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3E667D]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono <span className="text-red-500">*</span>
                  </label>
                  <PhoneInput
                    value={phone}
                    onChange={(v) => setPhone(v)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RFC (opcional)</label>
                <input
                  type="text"
                  value={rfc}
                  onChange={(e) => setRfc(e.target.value.toUpperCase())}
                  maxLength={13}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3E667D] uppercase font-mono"
                />
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="h-4 w-4"
                />
                <span>Enviar credenciales por email al nuevo distribuidor</span>
              </label>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                <p>
                  Al inscribir se crea una contraseña temporal aleatoria. Al primer ingreso el usuario podrá vincular su
                  correo y cambiar la contraseña. El distribuidor queda en estado <strong>pendiente</strong> hasta que
                  se cobre el kit en este mismo POS.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={resetAndClose}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  disabled={enrollMutation.isPending || (sponsorInvalid || kitInvalid)}
                >
                  {enrollMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Inscribir y continuar al cobro
                </Button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
