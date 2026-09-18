'use client';

// Pestaña Formas de pago: a cada forma de pago activa del sistema se le asigna
// su c_FormaPago del SAT (01 Efectivo, 04 Tarjeta de crédito…) y el método
// (PUE contado / PPD crédito). Sin esto el CFDI no sabe qué poner en
// FormaPago/MetodoPago y el PAC lo rechaza. Guardado por fila.

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReadinessPaymentMethods, useUpdatePaymentMethodFiscal } from '@/hooks/useBilling';
import { billingErrorMessage } from '@/lib/billing-error';
import {
  SAT_PAYMENT_FORMS,
  SAT_PAYMENT_METHODS,
  type ReadinessPaymentMethod,
  type SatPaymentMethodCode,
} from '@/types/billing';

interface Draft {
  form: string;
  method: SatPaymentMethodCode | '';
}

const FORM_OPTIONS = SAT_PAYMENT_FORMS.map((f) => ({ value: f.Value, label: `${f.Value} — ${f.Name}` }));

function isMethod(v: string): v is SatPaymentMethodCode {
  return v === 'PUE' || v === 'PPD';
}

export function PaymentMethodsTab({ canManage }: { canManage: boolean }) {
  const { data, isLoading, error, refetch } = useReadinessPaymentMethods();
  const update = useUpdatePaymentMethodFiscal();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const rows = data ?? [];

  const draftOf = (row: ReadinessPaymentMethod): Draft =>
    drafts[row.id] ?? { form: row.satPaymentFormCode ?? '', method: row.satPaymentMethodCode ?? '' };

  const isDirty = (row: ReadinessPaymentMethod) => {
    const d = draftOf(row);
    return d.form !== (row.satPaymentFormCode ?? '') || d.method !== (row.satPaymentMethodCode ?? '');
  };

  const setDraft = (row: ReadinessPaymentMethod, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [row.id]: { ...draftOf(row), ...patch } }));

  const save = async (row: ReadinessPaymentMethod) => {
    const d = draftOf(row);
    setSavingId(row.id);
    try {
      await update.mutateAsync({
        id: row.id,
        data: {
          satPaymentFormCode: d.form || undefined,
          satPaymentMethodCode: d.method || undefined,
        },
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
    } catch {
      // El hook ya avisó.
    } finally {
      setSavingId(null);
    }
  };

  const columns: DataTableColumn<ReadinessPaymentMethod>[] = [
    {
      key: 'name',
      header: 'Forma de pago',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.name}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {row.code}
            {row.availableForPos ? ' · POS' : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'satForm',
      header: 'Forma SAT (c_FormaPago)',
      render: (row) => (
        <div className="min-w-[260px]">
          <SearchableSelect
            id={`pm-form-${row.id}`}
            aria-label={`Forma de pago SAT de ${row.name}`}
            options={FORM_OPTIONS}
            value={draftOf(row).form}
            onChange={(val) => setDraft(row, { form: val })}
            showAllOption={false}
            placeholder="Elige la forma SAT"
            disabled={!canManage}
          />
        </div>
      ),
    },
    {
      key: 'satMethod',
      header: 'Método (PUE/PPD)',
      render: (row) => (
        <div className="min-w-[220px]">
          <Select
            value={draftOf(row).method || undefined}
            onValueChange={(val) => setDraft(row, { method: isMethod(val) ? val : '' })}
            disabled={!canManage}
          >
            <SelectTrigger id={`pm-method-${row.id}`} className="w-full" aria-label={`Método de pago SAT de ${row.name}`}>
              <SelectValue placeholder="Elige PUE o PPD" />
            </SelectTrigger>
            <SelectContent>
              {SAT_PAYMENT_METHODS.map((m) => (
                <SelectItem key={m.Value} value={m.Value}>
                  {m.Name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row) =>
        row.ready ? (
          <Badge variant="success">Lista</Badge>
        ) : (
          <div className="flex flex-wrap gap-1">
            {!row.satPaymentFormCode && <Badge variant="destructive">Sin forma SAT</Badge>}
            {!row.satPaymentMethodCode && <Badge variant="destructive">Sin método</Badge>}
          </div>
        ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      headerClassName: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <Button
          size="sm"
          onClick={() => void save(row)}
          disabled={!canManage || !isDirty(row) || savingId === row.id}
        >
          {savingId === row.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar
        </Button>
      ),
    },
  ];

  if (error && !data) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span className="text-destructive">
            {billingErrorMessage(error, 'No se pudieron cargar las formas de pago')}
          </span>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Cada forma de pago del sistema necesita su clave SAT (<span className="font-mono">c_FormaPago</span>)
        y el método: <strong>PUE</strong> cuando se paga en el momento, <strong>PPD</strong> solo para crédito
        (después se emite complemento de pago). Sin estos dos datos el CFDI no se puede timbrar.
      </p>
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={rows}
            getRowKey={(row) => row.id}
            isLoading={isLoading}
            emptyMessage="No hay formas de pago activas."
          />
        </CardContent>
      </Card>
    </div>
  );
}
