'use client';

// KitBonusesSection — gobierna kit_enrollment_bonuses para un kit.
// El "bono de kit" es el monto que se paga al patrocinador (o upline/compañia)
// al inscribir un nuevo distribuidor con este kit. La regla vive por
// (kit, pais, destinatario) con versionamiento por vigencia: crear una regla
// nueva cierra la anterior (queda en el historico). Backend: /products/:id/bonuses

import { useMemo, useState } from 'react';
import {
  GiftIcon,
  PlusIcon,
  PencilSquareIcon,
  XMarkIcon,
  CheckIcon,
  InformationCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  useKitBonuses,
  useCreateKitBonus,
  useUpdateKitBonus,
  useDeactivateKitBonus,
} from '@/hooks/useKits';
import { useActiveCountries } from '@/hooks/useConfig';
import type {
  KitBonus,
  BonusRecipientRole,
  CreateKitBonusInput,
} from '@/types/kit';

interface KitBonusesSectionProps {
  kitId: string;
  /** Si el kit no es de inscripcion, el bono casi nunca aplica: avisamos. */
  isEnrollmentKit?: boolean;
}

const RECIPIENT_OPTIONS: { value: BonusRecipientRole; label: string }[] = [
  { value: 'sponsor', label: 'Patrocinador (sponsor)' },
  { value: 'upline', label: 'Línea superior (upline)' },
  { value: 'company', label: 'Compañía' },
];

const RECIPIENT_LABEL: Record<BonusRecipientRole, string> = {
  sponsor: 'Patrocinador',
  upline: 'Línea superior',
  company: 'Compañía',
};

function formatMoney(amount: string, currency: string): string {
  const n = Number(amount);
  if (Number.isNaN(n)) return `${amount} ${currency}`;
  return `${n.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

export function KitBonusesSection({
  kitId,
  isEnrollmentKit,
}: KitBonusesSectionProps) {
  const { data: bonuses, isLoading } = useKitBonuses(kitId);
  const { data: countries } = useActiveCountries();
  const createBonus = useCreateKitBonus(kitId);
  const updateBonus = useUpdateKitBonus(kitId);
  const deactivateBonus = useDeactivateKitBonus(kitId);

  // -------- form de alta --------
  const [showForm, setShowForm] = useState(false);
  const [countryId, setCountryId] = useState('');
  const [recipientRole, setRecipientRole] =
    useState<BonusRecipientRole>('sponsor');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('');
  const [notes, setNotes] = useState('');

  // -------- edicion inline --------
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const countryOptions = useMemo(
    () =>
      (countries ?? []).map((c) => ({
        value: c.id,
        label: `${c.name} (${c.code})`,
      })),
    [countries],
  );

  const currentBonuses = (bonuses ?? []).filter((b) => b.isCurrent);
  const historicBonuses = (bonuses ?? []).filter((b) => !b.isCurrent);

  const resetForm = () => {
    setShowForm(false);
    setCountryId('');
    setRecipientRole('sponsor');
    setAmount('');
    setCurrency('');
    setNotes('');
  };

  const onCountryChange = (id: string) => {
    setCountryId(id);
    const c = countries?.find((x) => x.id === id);
    setCurrency(c?.currencyCode ?? '');
  };

  const handleCreate = async () => {
    if (!countryId) {
      toast.error('Selecciona un país.');
      return;
    }
    const parsed = Number(amount);
    if (amount === '' || Number.isNaN(parsed) || parsed < 0) {
      toast.error('Ingresa un monto válido (>= 0).');
      return;
    }
    const dto: CreateKitBonusInput = {
      countryId,
      bonusAmount: parsed,
      recipientRole,
      currencyCode: currency ? currency.toUpperCase() : undefined,
      notes: notes.trim() || undefined,
    };
    const existsCurrent = currentBonuses.find(
      (b) => b.countryId === countryId && b.recipientRole === recipientRole,
    );
    try {
      await createBonus.mutateAsync(dto);
      toast.success(
        existsCurrent
          ? 'Bono actualizado (la regla anterior pasó al histórico).'
          : 'Bono creado.',
      );
      resetForm();
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'No se pudo crear el bono.';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const startEdit = (b: KitBonus) => {
    setEditingId(b.id);
    setEditAmount(Number(b.bonusAmount).toString());
    setEditNotes(b.notes ?? '');
  };

  const handleUpdate = async (bonusId: string) => {
    const parsed = Number(editAmount);
    if (editAmount === '' || Number.isNaN(parsed) || parsed < 0) {
      toast.error('Ingresa un monto válido (>= 0).');
      return;
    }
    try {
      await updateBonus.mutateAsync({
        bonusId,
        dto: { bonusAmount: parsed, notes: editNotes.trim() || undefined },
      });
      toast.success('Bono actualizado.');
      setEditingId(null);
    } catch (e) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'No se pudo actualizar el bono.';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const handleDeactivate = async (b: KitBonus) => {
    if (
      !window.confirm(
        `¿Cerrar el bono de ${b.countryName} (${RECIPIENT_LABEL[b.recipientRole]})? ` +
          'Dejará de pagarse a partir de hoy. El histórico se conserva.',
      )
    ) {
      return;
    }
    try {
      await deactivateBonus.mutateAsync(b.id);
      toast.success('Bono desactivado.');
    } catch {
      toast.error('No se pudo desactivar el bono.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado + explicacion */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <GiftIcon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Bono de inscripción
            </h3>
            <p className="max-w-2xl text-sm text-gray-500">
              Monto que se paga al patrocinador (o línea superior / compañía)
              cuando se inscribe a un nuevo distribuidor con este kit. Hay una
              regla vigente por país y destinatario.
            </p>
          </div>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="shrink-0">
            <PlusIcon className="mr-1 h-4 w-4" />
            Agregar bono
          </Button>
        )}
      </div>

      {!isEnrollmentKit && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <InformationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Este kit no está marcado como <strong>kit de inscripción</strong>.
            El bono solo se paga en el flujo de inscripción de distribuidores;
            configúralo si aplica.
          </span>
        </div>
      )}

      {/* Form de alta */}
      {showForm && (
        <Card className="border-primary/30">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Nueva regla de bono</h4>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <XMarkIcon className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  País
                </label>
                <SearchableSelect
                  options={countryOptions}
                  value={countryId}
                  onChange={onCountryChange}
                  placeholder="Selecciona un país"
                  showAllOption={false}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Destinatario
                </label>
                <SearchableSelect
                  options={RECIPIENT_OPTIONS}
                  value={recipientRole}
                  onChange={(v) => setRecipientRole(v as BonusRecipientRole)}
                  showAllOption={false}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Monto del bono
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Moneda
                </label>
                <Input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  placeholder="MXN"
                  maxLength={3}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Por defecto la moneda del país.
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Notas (opcional)
                </label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. vigente desde campaña 2026"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={createBonus.isPending}>
                {createBonus.isPending && (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                )}
                Guardar bono
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reglas vigentes */}
      <div>
        <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Reglas vigentes
        </h4>
        {currentBonuses.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">
            No hay bonos configurados para este kit.
          </div>
        ) : (
          <div className="space-y-2">
            {currentBonuses.map((b) => (
              <Card key={b.id}>
                <CardContent className="p-4">
                  {editingId === b.id ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                        <Badge variant="info">{b.countryName}</Badge>
                        <Badge variant="secondary">
                          {RECIPIENT_LABEL[b.recipientRole]}
                        </Badge>
                        <span className="text-gray-400">{b.currencyCode}</span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700">
                            Monto
                          </label>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-700">
                            Notas
                          </label>
                          <Input
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(null)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUpdate(b.id)}
                          disabled={updateBonus.isPending}
                        >
                          {updateBonus.isPending ? (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckIcon className="mr-1 h-4 w-4" />
                          )}
                          Guardar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-lg font-semibold text-gray-900">
                          {formatMoney(b.bonusAmount, b.currencyCode)}
                        </span>
                        <Badge variant="info">{b.countryName}</Badge>
                        <Badge variant="secondary">
                          {RECIPIENT_LABEL[b.recipientRole]}
                        </Badge>
                        <Badge variant="success">Vigente</Badge>
                        {b.notes && (
                          <span className="text-xs text-gray-400">
                            {b.notes}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(b)}
                        >
                          <PencilSquareIcon className="mr-1 h-4 w-4" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeactivate(b)}
                          disabled={deactivateBonus.isPending}
                        >
                          <XMarkIcon className="mr-1 h-4 w-4" />
                          Desactivar
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Historico */}
      {historicBonuses.length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
            <ClockIcon className="h-4 w-4" />
            Histórico
          </h4>
          <div className="space-y-1.5">
            {historicBonuses.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-100 bg-gray-50 px-4 py-2 text-sm text-gray-500"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-gray-600">
                    {formatMoney(b.bonusAmount, b.currencyCode)}
                  </span>
                  <span>{b.countryName}</span>
                  <span className="text-gray-400">
                    · {RECIPIENT_LABEL[b.recipientRole]}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {b.validFrom?.slice(0, 10)} →{' '}
                  {b.validUntil ? b.validUntil.slice(0, 10) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
