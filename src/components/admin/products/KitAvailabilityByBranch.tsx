'use client';

// KitAvailabilityByBranch — "Disponibilidad por sucursal" de un kit/paquete en
// la ficha (sección Inventario). SOLO LECTURA: responde en claro dónde se puede
// vender hoy, cuántos y qué componente lo deja en cero; con una sucursal
// elegida, las existencias de cada componente.
//
// Fuente: GET /products/:id/kit-availability (sin branchId = todas las
// sucursales; con branchId = componentes de esa sucursal). Contrato kits §4.1.
// Si el servidor aún no lo expone (404) el panel lo dice y no rompe la ficha.

import { useMemo, useRef, useState } from 'react';
import { BuildingStorefrontIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Loader2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useActiveBranches } from '@/hooks/useBranches';
import { useKitAvailability } from '@/hooks/useKitAvailability';
import { useKitBranchChoice } from '@/stores/kit-branch-choice.store';
import {
  AVAILABILITY_TONE_CLASS,
  availabilitySentence,
  availabilityTone,
  branchSentence,
  fmt,
  limitingSentence,
  missingForOne,
  phantomSentence,
  recipeHeadline,
  stockModeLabel,
  summarizeBranches,
  type KitAvailabilityBranchRow,
  type KitStockMode,
} from '@/lib/kits/kit-availability';

interface KitAvailabilityByBranchProps {
  productId: string;
  productCode: string;
  stockMode: KitStockMode;
}

const UNAVAILABLE_TEXT =
  'Este servidor aún no calcula la disponibilidad de kits. Se activará cuando se despliegue el API; mientras, el POS sigue validando cada componente al vender.';

export function KitAvailabilityByBranch({ productId, productCode, stockMode }: KitAvailabilityByBranchProps) {
  const allQuery = useKitAvailability(productId);
  const { data: branches = [] } = useActiveBranches();
  const branchId = useKitBranchChoice((s) => s.branchId);
  const setBranchId = useKitBranchChoice((s) => s.setBranchId);
  const branchQuery = useKitAvailability(productId, branchId || undefined, !!branchId);
  const componentsRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState('');
  const [onlyShort, setOnlyShort] = useState(false);

  const detail = allQuery.data;
  const rows: KitAvailabilityBranchRow[] = useMemo(() => detail?.branches ?? [], [detail]);
  const componentNames = useMemo(
    () => new Map((detail?.components ?? []).map((c) => [c.code, c.name] as const)),
    [detail],
  );
  const summary = useMemo(() => summarizeBranches(rows, componentNames), [rows, componentNames]);
  const tone = availabilityTone({ branchesTotal: summary.total, branchesSellable: summary.sellable });
  const limiting = limitingSentence(summary.limiting);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((b) => (!onlyShort || b.sellable <= 0) && (!q || b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)))
      .sort((a, b) => (a.sellable > 0 ? 1 : 0) - (b.sellable > 0 ? 1 : 0) || a.name.localeCompare(b.name));
  }, [rows, search, onlyShort]);

  const branchOptions = useMemo(
    () =>
      [...branches]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((b) => ({ value: b.id, label: `${b.code ? `${b.code} · ` : ''}${b.name}${b.isWarehouse ? ' (almacén)' : ''}` })),
    [branches],
  );
  const chosenBranch = branches.find((b) => b.id === branchId) ?? rows.find((b) => b.branchId === branchId);
  const chosenName = chosenBranch?.name ?? 'la sucursal';

  const pickBranch = (id: string) => {
    setBranchId(id);
    if (id) componentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const isAssemble = stockMode === 'assemble_on_sale';
  const title = 'Disponibilidad por sucursal';

  // ---------- Estados ----------
  if (allQuery.isLoading) {
    return (
      <Card className="p-0">
        <CardContent className="p-6">
          <p className="flex items-center gap-2 text-sm text-gray-600" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Calculando dónde se puede vender…
          </p>
        </CardContent>
      </Card>
    );
  }

  if (allQuery.isError || detail === null || detail === undefined) {
    return (
      <Card className="p-0">
        <CardContent className="space-y-3 p-6">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          {detail === null ? (
            <p className="text-sm text-gray-700" role="status">
              {UNAVAILABLE_TEXT}
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-gray-700" role="status">
                No se pudo calcular la disponibilidad de este kit.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => void allQuery.refetch()}>
                Reintentar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const branchDetail = branchQuery.data;
  const components = branchDetail?.components ?? [];

  return (
    <Card className="p-0">
      <CardContent className="space-y-5 p-4 sm:p-6">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <BuildingStorefrontIcon className="h-5 w-5 text-[#3E667D]" aria-hidden />
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
              {stockModeLabel(stockMode)}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {isAssemble
              ? 'Este kit se arma al vender: cuenta solo lo que hay de cada componente en la sucursal. Si falta uno solo, no se puede vender.'
              : 'Este kit es prearmado: cada sucursal vende con su propia existencia del kit.'}
          </p>
        </div>

        {/* Encabezado en claro */}
        <div className={`rounded-lg px-4 py-3 ${AVAILABILITY_TONE_CLASS[tone]}`} role="status">
          <p className="text-sm font-semibold">{availabilitySentence({ branchesTotal: summary.total, branchesSellable: summary.sellable }, productCode)}</p>
          {limiting ? <p className="mt-1 text-sm">{limiting}</p> : null}
          {summary.total > 0 && summary.sellable > 0 ? (
            <p className="mt-1 text-xs opacity-90">Máximo en una sola sucursal: {fmt(summary.maxSellable)}.</p>
          ) : null}
        </div>

        {isAssemble && detail.ownStockPhantom ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p>
              <strong>Existencia fantasma.</strong> {phantomSentence(detail.ownStockPhantom)} Se deja en cero con un ajuste
              formal (pendiente de liberar).
            </p>
          </div>
        ) : null}

        {!isAssemble && detail.hasKardex === false ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            <p>
              <strong>Existencia sin respaldo.</strong> Hay {detail.ownStock !== null ? `${fmt(detail.ownStock)} piezas` : 'piezas'} registradas
              sin movimientos de kardex que las respalden. Confírmalas con un conteo o una entrada de inventario antes de fiarte
              de este número.
            </p>
          </div>
        ) : null}

        {/* Tabla por sucursal */}
        {rows.length === 0 ? (
          <p className="rounded-lg border-2 border-dashed border-gray-200 py-6 text-center text-sm text-gray-600">
            No hay sucursales con punto de venta y precio vigente para este kit.
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <label htmlFor={`kit-branch-search-${productId}`} className="sr-only">
                  Buscar sucursal por nombre o código
                </label>
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
                <input
                  id={`kit-branch-search-${productId}`}
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar sucursal…"
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-transparent focus:ring-2 focus:ring-[#3E667D]"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setOnlyShort((v) => !v)}
                  aria-pressed={onlyShort}
                  className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                    onlyShort ? 'border-red-600 bg-red-50 text-red-800' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className={`inline-block h-2 w-2 rounded-full ${onlyShort ? 'bg-red-600' : 'bg-gray-300'}`} aria-hidden />
                  Solo agotadas
                </button>
                <span className="whitespace-nowrap text-sm text-gray-500">
                  {visible.length} de {rows.length}
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200">
              <div className="max-h-[480px] overflow-auto">
                <Table className="w-full text-sm">
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 hover:bg-transparent">
                      <TableHead className="sticky top-0 z-10 bg-gray-100 px-3 py-2.5 text-xs font-medium uppercase text-gray-500">
                        Sucursal
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 bg-gray-100 px-3 py-2.5 text-right text-xs font-medium uppercase text-gray-500">
                        {isAssemble ? 'Se pueden vender' : 'Existencia'}
                      </TableHead>
                      {isAssemble ? (
                        <TableHead className="sticky top-0 z-10 bg-gray-100 px-3 py-2.5 text-xs font-medium uppercase text-gray-500">
                          Componente que limita
                        </TableHead>
                      ) : null}
                      <TableHead className="sticky top-0 z-10 bg-gray-100 px-3 py-2.5 text-right text-xs font-medium uppercase text-gray-500">
                        <span className="sr-only">Acciones</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((b) => {
                      const short = b.sellable <= 0;
                      return (
                        <TableRow key={b.branchId} className={`border-b border-gray-100 ${short ? 'bg-red-50/40' : ''}`}>
                          <TableCell className="px-3 py-2">
                            <span className="font-medium text-gray-900">{b.name}</span>
                            <span className="ml-2 font-mono text-xs text-gray-500">{b.code}</span>
                            {b.isWarehouse ? (
                              <span className="ml-2 rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700">Almacén</span>
                            ) : null}
                          </TableCell>
                          <TableCell className={`px-3 py-2 text-right font-semibold tabular-nums ${short ? 'text-red-700' : 'text-gray-900'}`}>
                            <span aria-label={branchSentence(b)}>{short ? 'Agotado' : fmt(b.sellable)}</span>
                          </TableCell>
                          {isAssemble ? (
                            <TableCell className="px-3 py-2 text-gray-700">
                              {short && b.limitingCode ? (
                                <>
                                  <span className="font-mono text-xs">{b.limitingCode}</span>
                                  {componentNames.get(b.limitingCode) ? (
                                    <span className="ml-1 text-xs text-gray-600">— {componentNames.get(b.limitingCode)}</span>
                                  ) : null}
                                </>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </TableCell>
                          ) : null}
                          <TableCell className="px-3 py-2 text-right">
                            {isAssemble ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 text-[#3E667D]"
                                onClick={() => pickBranch(b.branchId)}
                                aria-label={`Ver componentes en ${b.name}`}
                              >
                                Ver componentes
                              </Button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {visible.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={isAssemble ? 4 : 3} className="px-3 py-6 text-center text-sm text-gray-600">
                          {onlyShort ? 'Ninguna sucursal está agotada con este filtro.' : 'Sin sucursales que coincidan.'}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}

        {/* Componentes en la sucursal elegida (solo kits que se arman) */}
        {isAssemble ? (
          <div ref={componentsRef} className="scroll-mt-24 space-y-3 border-t border-gray-100 pt-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div className="w-full sm:max-w-md">
                <label htmlFor={`kit-branch-pick-${productId}`} className="mb-1 block text-xs font-medium text-gray-500">
                  Componentes en la sucursal
                </label>
                <SearchableSelect
                  id={`kit-branch-pick-${productId}`}
                  options={branchOptions}
                  value={branchId}
                  onChange={pickBranch}
                  allLabel="Elige una sucursal…"
                  allValue=""
                  className="w-full"
                />
              </div>
            </div>

            {!branchId ? (
              <p className="text-sm text-gray-600">{recipeHeadline(null, chosenName)}</p>
            ) : branchQuery.isLoading ? (
              <p className="flex items-center gap-2 text-sm text-gray-600" role="status">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Consultando existencias en {chosenName}…
              </p>
            ) : branchQuery.isError || !branchDetail ? (
              <p className="text-sm text-gray-700" role="status">
                No se pudieron consultar las existencias en {chosenName}.
              </p>
            ) : (
              <>
                <p className="text-sm font-semibold text-gray-900" role="status">
                  {recipeHeadline(branchDetail.sellable ?? 0, chosenName)}
                </p>
                {components.length === 0 ? (
                  <p className="text-sm text-red-700">Este kit no tiene receta: no hay qué armar.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <Table className="w-full text-sm">
                      <TableHeader>
                        <TableRow className="border-b border-gray-200 hover:bg-transparent">
                          <TableHead className="bg-gray-100 px-3 py-2 text-xs font-medium uppercase text-gray-500">Componente</TableHead>
                          <TableHead className="bg-gray-100 px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">Requiere</TableHead>
                          <TableHead className="bg-gray-100 px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">Hay</TableHead>
                          <TableHead className="bg-gray-100 px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">Se pueden armar</TableHead>
                          <TableHead className="bg-gray-100 px-3 py-2 text-right text-xs font-medium uppercase text-gray-500">Falta</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {components.map((c) => {
                          const missing = missingForOne(c);
                          const bad = missing > 0 || !c.isActive;
                          return (
                            <TableRow key={c.productId || c.code} className={`border-b border-gray-100 ${bad ? 'bg-red-50/40' : ''}`}>
                              <TableCell className="px-3 py-2">
                                <span className="font-medium text-gray-900">{c.name || c.code}</span>
                                <span className="ml-2 font-mono text-xs text-gray-500">{c.code}</span>
                                {!c.isActive ? (
                                  <span className="ml-2 rounded-full bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-800">
                                    Inactivo
                                  </span>
                                ) : null}
                                {c.hasPriceInKitCountries === false ? (
                                  <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
                                    Sin precio en un país del kit
                                  </span>
                                ) : null}
                              </TableCell>
                              <TableCell className="px-3 py-2 text-right tabular-nums">{fmt(c.qtyPerUnit)}</TableCell>
                              <TableCell className="px-3 py-2 text-right tabular-nums">
                                <span className={missing > 0 ? 'font-semibold text-red-700' : 'text-gray-900'}>{fmt(c.available)}</span>
                                {c.reserved > 0 ? (
                                  <span className="block text-[11px] text-gray-500">{fmt(c.onHand)} en piso · {fmt(c.reserved)} apartadas</span>
                                ) : null}
                              </TableCell>
                              <TableCell className="px-3 py-2 text-right tabular-nums">{fmt(c.buildable)}</TableCell>
                              <TableCell className="px-3 py-2 text-right tabular-nums">
                                {missing > 0 ? <span className="font-semibold text-red-700">{fmt(missing)}</span> : <span className="text-gray-400">—</span>}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
