'use client';

// SimulatorSheet — "Probar un pedido" (contrato §6.5 / §7.3-8). Solo lectura:
// país + productos → qué almacén lo surtiría y por qué, con los pasos por
// almacén y lo que faltó. Puede probar con los cambios SIN guardar.

import { useId, useState } from 'react';
import { CircleCheck, CircleX, Loader2, Plus, Search, SkipForward, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useSimulateFulfillment } from '@/hooks/useFulfillment';
import { useProducts } from '@/hooks/useProducts';
import { fulfillmentErrorMessage } from '@/lib/fulfillment/fulfillment-error';
import { buildSimulateDraft, type RouteDraft } from '@/lib/fulfillment/route-draft';
import type {
  FulfillmentCountry,
  FulfillmentResolutionCandidate,
  FulfillmentSimulateResponse,
  FulfillmentSkipReason,
} from '@/types/fulfillment';
import { numberFormat, warehouseLabel } from './fulfillment-ui';

const MAX_ITEMS = 30;
const MAX_QUANTITY = 999;

const SKIP_REASON_LABELS: Record<FulfillmentSkipReason, string> = {
  route_paused: 'está en pausa',
  branch_inactive: 'la sucursal está desactivada',
  cross_country_blocked: 'los envíos de un país a otro aún no están habilitados',
  insufficient_stock: 'no tiene todo el pedido',
};

interface SimItem {
  productId: string;
  code: string;
  name: string;
  quantity: number;
}

interface SimulatorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  countries: FulfillmentCountry[];
  draft: RouteDraft | null;
  isDirty: boolean;
}

export function SimulatorSheet({ open, onOpenChange, countries, draft, isDirty }: SimulatorSheetProps) {
  const id = useId();
  const [countryCode, setCountryCode] = useState('');
  const [items, setItems] = useState<SimItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [term, setTerm] = useState('');
  const [useDraft, setUseDraft] = useState(true);
  const [result, setResult] = useState<FulfillmentSimulateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const simulate = useSimulateFulfillment();
  const search = useProducts({ search: term, limit: 8, isActive: true }, { enabled: open && term.length >= 2 });
  const found = term.length >= 2 ? (search.data?.data ?? []) : [];

  const selectable = countries.filter((c) => c.sellableProducts > 0 || c.routes.length > 0 || (draft?.countries[c.countryCode]?.length ?? 0) > 0);
  const country = countries.find((c) => c.countryCode === countryCode) ?? null;
  const withDraft = isDirty && useDraft && !!draft;

  const clearResult = () => {
    setResult(null);
    setError(null);
  };

  const addItem = (product: { id: string; code: string; name: string }) => {
    clearResult();
    setItems((prev) =>
      prev.some((i) => i.productId === product.id) || prev.length >= MAX_ITEMS
        ? prev
        : [...prev, { productId: product.id, code: product.code, name: product.name, quantity: 1 }],
    );
  };

  const run = () => {
    if (!countryCode) return;
    clearResult();
    simulate.mutate(
      {
        countryCode,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        ...(withDraft && draft ? { draft: buildSimulateDraft(draft, countryCode) } : {}),
      },
      {
        onSuccess: (data) => setResult(data),
        onError: (err) => setError(fulfillmentErrorMessage(err, 'No se pudo hacer la prueba.')),
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Probar un pedido</SheetTitle>
          <SheetDescription>
            Elige un país y, si quieres, algunos productos. Te decimos qué almacén lo surtiría y por qué. Es solo una
            prueba: no crea ningún pedido.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-6">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-pais`}>País de envío</Label>
            <Select
              value={countryCode}
              onValueChange={(value) => {
                setCountryCode(value);
                clearResult();
              }}
            >
              <SelectTrigger id={`${id}-pais`} className="h-10 w-full">
                <SelectValue placeholder="Elige un país…" />
              </SelectTrigger>
              <SelectContent>
                {selectable.map((c) => (
                  <SelectItem key={c.countryCode} value={c.countryCode}>
                    {c.countryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <form
              className="space-y-1.5"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                setTerm(searchText.trim());
              }}
            >
              <Label htmlFor={`${id}-buscar`}>Productos del pedido (opcional)</Label>
              <div className="flex gap-2">
                <Input
                  id={`${id}-buscar`}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Nombre o clave del producto"
                  className="h-10"
                />
                <Button type="submit" variant="outline" className="h-10" disabled={searchText.trim().length < 2}>
                  <Search aria-hidden /> Buscar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Sin productos solo se revisa qué almacén le toca al país. Con productos también se revisan existencias.
              </p>
            </form>

            <div aria-live="polite">
              {search.isFetching && term.length >= 2 && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 aria-hidden className="size-4 animate-spin" /> Buscando…
                </p>
              )}
              {!search.isFetching && term.length >= 2 && found.length === 0 && (
                <p className="text-sm text-muted-foreground">No encontramos productos con “{term}”.</p>
              )}
            </div>
            {found.length > 0 && (
              <ul className="divide-y rounded-md border" aria-label="Resultados de la búsqueda">
                {found.map((p) => {
                  const added = items.some((i) => i.productId === p.id);
                  return (
                    <li key={p.id} className="flex items-center gap-2 p-2 text-sm">
                      <span className="min-w-0 flex-1 break-words">
                        <span className="font-mono text-xs text-muted-foreground">{p.code}</span> {p.name}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 shrink-0"
                        onClick={() => addItem(p)}
                        disabled={added || items.length >= MAX_ITEMS}
                        aria-label={`Agregar ${p.name} a la prueba`}
                      >
                        <Plus aria-hidden /> {added ? 'Agregado' : 'Agregar'}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}

            {items.length > 0 && (
              <ul className="space-y-2" aria-label="Productos de la prueba">
                {items.map((item) => (
                  <li key={item.productId} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                    <span className="min-w-0 flex-1 break-words">
                      <span className="font-mono text-xs text-muted-foreground">{item.code}</span> {item.name}
                    </span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_QUANTITY}
                      value={item.quantity}
                      onChange={(e) => {
                        const n = Math.min(MAX_QUANTITY, Math.max(1, Math.floor(Number(e.target.value) || 1)));
                        clearResult();
                        setItems((prev) => prev.map((i) => (i.productId === item.productId ? { ...i, quantity: n } : i)));
                      }}
                      className="h-10 w-20"
                      aria-label={`Cantidad de ${item.name}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-lg"
                      onClick={() => {
                        clearResult();
                        setItems((prev) => prev.filter((i) => i.productId !== item.productId));
                      }}
                      aria-label={`Quitar ${item.name} de la prueba`}
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {items.length >= MAX_ITEMS && (
              <p className="text-xs text-muted-foreground">La prueba admite hasta {MAX_ITEMS} productos.</p>
            )}
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id={`${id}-borrador`}
              checked={withDraft}
              disabled={!isDirty}
              onCheckedChange={(value) => {
                setUseDraft(value === true);
                clearResult();
              }}
              className="mt-0.5 size-5"
            />
            <div className="text-sm">
              <Label htmlFor={`${id}-borrador`} className="font-medium">
                Probar con mis cambios sin guardar
              </Label>
              <p className="text-muted-foreground">
                {isDirty ? 'Si la apagas, la prueba usa lo que está guardado.' : 'No tienes cambios sin guardar: se usa lo guardado.'}
              </p>
            </div>
          </div>

          <Button type="button" className="h-10 w-full" onClick={run} disabled={!countryCode || simulate.isPending}>
            {simulate.isPending && <Loader2 aria-hidden className="animate-spin" />}
            {simulate.isPending ? 'Probando…' : 'Probar'}
          </Button>

          <div aria-live="polite" className="space-y-3">
            {error && (
              <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                {error}
              </p>
            )}
            {result && <SimulationResult result={result} countryName={country?.countryName ?? result.countryCode} />}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SimulationResult({ result, countryName }: { result: FulfillmentSimulateResponse; countryName: string }) {
  const ok = !!result.branchId;
  return (
    <div className="space-y-3">
      <div
        className={`flex gap-2 rounded-md border p-3 text-sm ${
          ok ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'
        }`}
      >
        {ok ? <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0" /> : <CircleX aria-hidden className="mt-0.5 size-5 shrink-0" />}
        <div>
          <p className="font-semibold">{ok ? 'Sí se puede enviar' : `Hoy no se podría enviar a ${countryName}`}</p>
          <p>{result.messageEs}</p>
        </div>
      </div>

      {result.candidates.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-foreground">Paso a paso</h3>
          <ol className="space-y-2">
            {result.candidates.map((c, index) => (
              <CandidateStep key={c.routeId || c.branchId} candidate={c} index={index} />
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function CandidateStep({ candidate, index }: { candidate: FulfillmentResolutionCandidate; index: number }) {
  const Icon = candidate.status === 'chosen' ? CircleCheck : candidate.status === 'skipped' ? SkipForward : null;
  const text =
    candidate.status === 'chosen'
      ? 'Lo surtiría este almacén.'
      : candidate.status === 'skipped'
        ? `Se salta porque ${candidate.skipReason ? SKIP_REASON_LABELS[candidate.skipReason] ?? 'no puede surtir' : 'no puede surtir'}.`
        : 'No hizo falta revisarlo.';
  return (
    <li className="rounded-md border p-3 text-sm">
      <p className="font-medium text-foreground">
        {index + 1}. {warehouseLabel(candidate)}
      </p>
      <p className={`flex items-center gap-1.5 ${candidate.status === 'chosen' ? 'text-emerald-800' : 'text-muted-foreground'}`}>
        {Icon && <Icon aria-hidden className="size-4 shrink-0" />}
        {text}
      </p>
      {candidate.shortages.length > 0 && (
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground" aria-label="Lo que le falta">
          {candidate.shortages.map((s) => (
            <li key={s.productId}>
              {s.name}: se piden {numberFormat.format(s.need)} y tiene {numberFormat.format(s.available)}.
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
