'use client';

// KitBonusesSection — bono de inscripción del kit (kit_enrollment_bonuses),
// bloque 5 de la sección Kit (contrato de kits §5.2). Una regla VIGENTE por
// (país, destinatario, moneda). Backend: /products/:id/bonuses con supersede:
//   - crear una regla cierra la vigente de esa combinación (sin hueco);
//   - cambiar el importe o la moneda NO edita en sitio: el API cierra la
//     vigente (ayer) y crea una nueva desde hoy (devuelve la nueva);
//   - solo las notas se editan en sitio (`notes: null` las borra);
//   - una regla histórica es de solo lectura (409 KIT_BONUS_CLOSED).
// Solo los kits de INSCRIPCIÓN admiten escrituras (400 en el API).
// El importe se lee con parseMoney (coma de MILES como en es-MX: «1,380» =
// 1380, no 1.38 como en parseQuantity) y se muestra la vista previa "Se
// guardará $1,380.00 MXN" antes de guardar.
// shadcn: Card, Badge, Input, SearchableSelect y AlertDialog (KitConfirmDialog).

import { useId, useMemo, useState } from 'react';
import { Clock, Gift, Info, Loader2, Pencil, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useActiveCountries } from '@/hooks/useConfig';
import { useCreateKitBonus, useDeactivateKitBonus, useKitBonuses, useUpdateKitBonus } from '@/hooks/useKits';
import { moneyPreview, parseMoney } from '@/lib/kits/kit-editor';
import type { BonusRecipientRole, CreateKitBonusInput, KitBonus } from '@/types/kit';
import { KitConfirmDialog } from './KitConfirmDialog';
import { productAdminErrorMessage } from './lib/errors';

interface KitBonusesSectionProps {
  kitId: string;
  /** Solo los kits de inscripción admiten reglas nuevas (el API responde 400 si no). */
  isEnrollmentKit?: boolean;
  /** Sin products:kits_manage / products:update: solo lectura. */
  readOnly?: boolean;
  /** Tras cualquier escritura (readiness: "Sin bono en FN"). */
  onChanged?: () => void;
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
  return `${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

const day = (iso: string | null | undefined): string => (iso ? iso.slice(0, 10) : '—');

export function KitBonusesSection({ kitId, isEnrollmentKit = false, readOnly = false, onChanged }: KitBonusesSectionProps) {
  const ids = useId();
  const { data: bonuses, isLoading, isError, error } = useKitBonuses(kitId);
  const { data: countries } = useActiveCountries();
  const createBonus = useCreateKitBonus(kitId);
  const updateBonus = useUpdateKitBonus(kitId);
  const deactivateBonus = useDeactivateKitBonus(kitId);
  const canWrite = !readOnly && isEnrollmentKit;

  // -------- alta --------
  const [showForm, setShowForm] = useState(false);
  const [countryId, setCountryId] = useState('');
  const [recipientRole, setRecipientRole] = useState<BonusRecipientRole>('sponsor');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('');
  const [notes, setNotes] = useState('');

  // -------- edición de la vigente --------
  const [editing, setEditing] = useState<KitBonus | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [closing, setClosing] = useState<KitBonus | null>(null);

  const countryOptions = useMemo(
    () => (countries ?? []).map((c) => ({ value: c.id, label: `${c.name} (${c.code})` })),
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
    setCurrency(countries?.find((x) => x.id === id)?.currencyCode ?? '');
  };

  // Dinero, no cantidad de receta: «1,380» es 1380 (coma de miles), y se avisa antes de guardar.
  const parsedAmount = (text: string): number | null => {
    const n = parseMoney(text);
    return n === null || Number.isNaN(n) || n < 0 ? null : n;
  };
  const amountPreview = moneyPreview(amount, currency);
  const editPreview = editing ? moneyPreview(editAmount, editing.currencyCode) : null;
  const previewClass = (p: { valid: boolean } | null) => (p && !p.valid ? 'text-xs font-medium text-red-700' : 'text-xs text-gray-600');

  const handleCreate = async () => {
    if (!countryId) {
      toast.error('Selecciona un país.');
      return;
    }
    const value = parsedAmount(amount);
    if (value === null) {
      toast.error('Escribe un importe válido (0 o más).');
      return;
    }
    const dto: CreateKitBonusInput = {
      countryId,
      bonusAmount: value,
      recipientRole,
      currencyCode: currency ? currency.toUpperCase() : undefined,
      notes: notes.trim() || undefined,
    };
    const replaces = currentBonuses.some((b) => b.countryId === countryId && b.recipientRole === recipientRole);
    try {
      await createBonus.mutateAsync(dto);
      toast.success(replaces ? 'Nueva regla creada; la anterior pasó al histórico.' : 'Bono creado.');
      resetForm();
      onChanged?.();
    } catch (err) {
      toast.error(productAdminErrorMessage(err, 'No se pudo crear el bono.'));
    }
  };

  const startEdit = (b: KitBonus) => {
    setEditing(b);
    setEditAmount(Number(b.bonusAmount).toString());
    setEditNotes(b.notes ?? '');
  };

  const handleUpdate = async () => {
    if (!editing) return;
    const value = parsedAmount(editAmount);
    if (value === null) {
      toast.error('Escribe un importe válido (0 o más).');
      return;
    }
    const amountChanged = value !== Number(editing.bonusAmount);
    const trimmed = editNotes.trim();
    const notesChanged = trimmed !== (editing.notes ?? '');
    if (!amountChanged && !notesChanged) {
      setEditing(null);
      return;
    }
    try {
      const result = await updateBonus.mutateAsync({
        bonusId: editing.id,
        dto: {
          ...(amountChanged ? { bonusAmount: value } : {}),
          // '' explícito = borrar las notas (el API entiende `null`).
          ...(notesChanged ? { notes: trimmed === '' ? null : trimmed } : {}),
        },
      });
      toast.success(
        amountChanged && result.id !== editing.id
          ? 'Importe cambiado: se creó una regla nueva desde hoy y la anterior quedó en el histórico.'
          : 'Bono actualizado.',
      );
      setEditing(null);
      onChanged?.();
    } catch (err) {
      toast.error(productAdminErrorMessage(err, 'No se pudo actualizar el bono.'));
    }
  };

  const handleClose = async () => {
    if (!closing) return;
    try {
      await deactivateBonus.mutateAsync(closing.id);
      toast.success('Bono cerrado. El histórico se conserva.');
      setClosing(null);
      onChanged?.();
    } catch (err) {
      toast.error(productAdminErrorMessage(err, 'No se pudo cerrar el bono.'));
    }
  };

  return (
    <Card className="p-0">
      <CardContent className="space-y-5 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-[#3E667D]/10 p-2 text-[#3E667D]">
              <Gift className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Bono de inscripción</h2>
              <p className="max-w-2xl text-sm text-gray-600">
                Importe para el patrocinador (o línea superior / compañía) al inscribir a un distribuidor con este kit. Una regla
                vigente por país y destinatario; cambiar el importe crea una regla nueva y la anterior queda en el histórico.
              </p>
            </div>
          </div>
          {canWrite && !showForm ? (
            <Button type="button" onClick={() => setShowForm(true)} className="shrink-0">
              <Plus className="mr-1 h-4 w-4" aria-hidden />
              Agregar bono
            </Button>
          ) : null}
        </div>

        <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900" role="note">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            <strong>Bono informativo.</strong> Hoy este sistema no lo paga: se guarda al activar al distribuidor para que se pueda
            liquidar aparte.
          </p>
        </div>

        {!isEnrollmentKit ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              Este kit no está marcado como <strong>kit de inscripción</strong>: el bono solo aplica al inscribir distribuidores.
              Márcalo arriba y guarda para poder capturar reglas.
            </p>
          </div>
        ) : null}

        {showForm && canWrite ? (
          <div className="space-y-4 rounded-lg border border-[#3E667D]/30 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Nueva regla de bono</h3>
              <Button type="button" variant="ghost" size="sm" onClick={resetForm} aria-label="Cerrar formulario">
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${ids}-country`}>País</Label>
                <SearchableSelect
                  id={`${ids}-country`}
                  options={countryOptions}
                  value={countryId}
                  onChange={onCountryChange}
                  placeholder="Selecciona un país"
                  showAllOption={false}
                  className="w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${ids}-recipient`}>Destinatario</Label>
                <SearchableSelect
                  id={`${ids}-recipient`}
                  options={RECIPIENT_OPTIONS}
                  value={recipientRole}
                  onChange={(v) => setRecipientRole(v as BonusRecipientRole)}
                  showAllOption={false}
                  className="w-full"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${ids}-amount`}>Importe del bono</Label>
                <Input
                  id={`${ids}-amount`}
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Ej.: 1,380.00"
                  autoComplete="off"
                  aria-describedby={`${ids}-amount-help`}
                  aria-invalid={amountPreview?.valid === false}
                />
                <p id={`${ids}-amount-help`} className={previewClass(amountPreview)} role={amountPreview?.valid === false ? 'alert' : 'status'}>
                  {amountPreview ? amountPreview.text : 'La coma separa miles y el punto los decimales: 1,380 es mil trescientos ochenta.'}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${ids}-currency`}>Moneda</Label>
                <Input
                  id={`${ids}-currency`}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  placeholder="MXN"
                  maxLength={3}
                  className="font-mono"
                  autoComplete="off"
                />
                <p className="text-xs text-gray-600">Por defecto, la moneda del país.</p>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor={`${ids}-notes`}>Notas (opcional)</Label>
                <Input
                  id={`${ids}-notes`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej.: vigente desde la campaña 2026"
                  maxLength={1000}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={resetForm} disabled={createBonus.isPending}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => void handleCreate()} disabled={createBonus.isPending} aria-busy={createBonus.isPending}>
                {createBonus.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> : null}
                Guardar bono
              </Button>
            </div>
          </div>
        ) : null}

        {/* Vigentes */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Reglas vigentes</h3>
          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-gray-600" role="status">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cargando bonos…
            </p>
          ) : isError ? (
            <p className="text-sm text-red-700" role="alert">
              {productAdminErrorMessage(error, 'No se pudieron cargar los bonos del kit.')}
            </p>
          ) : currentBonuses.length === 0 ? (
            <div className="rounded-md border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-600">
              No hay bonos vigentes para este kit.
            </div>
          ) : (
            <ul className="space-y-2">
              {currentBonuses.map((b) => (
                <li key={b.id} className="rounded-lg border border-gray-200 p-3">
                  {editing?.id === b.id ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                        <Badge variant="info">{b.countryName}</Badge>
                        <Badge variant="secondary">{RECIPIENT_LABEL[b.recipientRole]}</Badge>
                        <span className="font-mono text-xs text-gray-600">{b.currencyCode}</span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor={`${ids}-edit-amount`}>Importe</Label>
                          <Input
                            id={`${ids}-edit-amount`}
                            inputMode="decimal"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            autoComplete="off"
                            aria-describedby={`${ids}-edit-amount-help`}
                            aria-invalid={editPreview?.valid === false}
                          />
                          <p id={`${ids}-edit-amount-help`} className={previewClass(editPreview)} role={editPreview?.valid === false ? 'alert' : 'status'}>
                            {editPreview ? `${editPreview.text} ` : ''}
                            Cambiarlo crea una regla nueva desde hoy; esta pasa al histórico.
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`${ids}-edit-notes`}>Notas</Label>
                          <Input id={`${ids}-edit-notes`} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} maxLength={1000} />
                          <p className="text-xs text-gray-600">Se editan en sitio; vacías = se borran.</p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(null)} disabled={updateBonus.isPending}>
                          Cancelar
                        </Button>
                        <Button type="button" size="sm" onClick={() => void handleUpdate()} disabled={updateBonus.isPending} aria-busy={updateBonus.isPending}>
                          {updateBonus.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> : null}
                          Guardar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-semibold text-gray-900">{formatMoney(b.bonusAmount, b.currencyCode)}</span>
                        <Badge variant="info">{b.countryName}</Badge>
                        <Badge variant="secondary">{RECIPIENT_LABEL[b.recipientRole]}</Badge>
                        <Badge variant="success">Vigente desde {day(b.validFrom)}</Badge>
                        {b.notes ? <span className="text-xs text-gray-600">{b.notes}</span> : null}
                      </div>
                      {canWrite ? (
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(b)}>
                            <Pencil className="mr-1 h-4 w-4" aria-hidden />
                            Editar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-700 hover:text-red-800"
                            onClick={() => setClosing(b)}
                            disabled={deactivateBonus.isPending}
                          >
                            <X className="mr-1 h-4 w-4" aria-hidden />
                            Cerrar
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Histórico (solo lectura) */}
        {historicBonuses.length > 0 ? (
          <div>
            <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <Clock className="h-4 w-4" aria-hidden />
              Histórico (solo lectura)
            </h3>
            <ul className="space-y-1.5">
              {historicBonuses.map((b) => (
                <li
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-600"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-gray-700">{formatMoney(b.bonusAmount, b.currencyCode)}</span>
                    <span>{b.countryName}</span>
                    <span className="text-gray-500">· {RECIPIENT_LABEL[b.recipientRole]}</span>
                    {b.notes ? <span className="text-xs text-gray-500">· {b.notes}</span> : null}
                  </div>
                  <span className="text-xs text-gray-500">
                    {day(b.validFrom)} → {day(b.validUntil)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>

      <KitConfirmDialog
        open={!!closing}
        onOpenChange={(open) => {
          if (!open) setClosing(null);
        }}
        title="Cerrar regla de bono"
        description={
          closing
            ? `El bono de ${closing.countryName} (${RECIPIENT_LABEL[closing.recipientRole]}) dejará de aplicar a partir de hoy. El histórico se conserva.`
            : ''
        }
        confirmLabel="Cerrar bono"
        destructive
        isPending={deactivateBonus.isPending}
        onConfirm={handleClose}
      />
    </Card>
  );
}
