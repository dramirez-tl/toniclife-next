'use client';

// SatCodeSearch — combobox ASÍNCRONO contra el catálogo del SAT que expone el
// PAC (`/billing/catalogs/product-codes|unit-codes?keyword=`).
//
// `SearchableSelect` no sirve aquí: filtra en memoria una lista ya cargada, y
// c_ClaveProdServ tiene ~52,000 claves. Este componente pide al API conforme
// se teclea (300 ms de retraso, mínimo 3 caracteres) y deja escribir el
// código directo aunque la búsqueda tarde.
//
// Dato verificado contra Facturama: el catálogo del PAC encuentra por CÓDIGO
// COMPLETO (10101500, H87) o por PALABRA de la descripción ("suplemento"); un
// prefijo de código ("5017") devuelve 0 resultados. Por eso la ayuda lo dice
// así y, cuando lo tecleado ya tiene forma de clave, se ofrece usarla tal cual.

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSatCodeSearch } from '@/hooks/useBilling';
import { billingErrorMessage } from '@/lib/billing-error';
import {
  SUGGESTED_SAT_UNITS,
  isValidSatProductCode,
  isValidSatUnitCode,
  type SatCodeKind,
  type SatCodeSearchResult,
} from '@/types/billing';

const MIN_CHARS = 3;
const DEBOUNCE_MS = 300;

const KIND_TEXT: Record<
  SatCodeKind,
  { placeholder: string; searchHint: string; empty: string }
> = {
  product: {
    placeholder: 'Buscar clave de producto SAT',
    searchHint: 'Código completo (8 dígitos) o una palabra de la descripción',
    empty:
      'Sin resultados. El catálogo del SAT solo encuentra por código completo (8 dígitos) o por una palabra de la descripción, no por prefijo.',
  },
  unit: {
    placeholder: 'Buscar unidad SAT',
    searchHint: 'Código completo (H87, E48) o una palabra (pieza, servicio)',
    empty:
      'Sin resultados. Escribe el código completo de la unidad (H87, E48, KGM) o una palabra de su descripción.',
  },
};

function normalizeCode(kind: SatCodeKind, raw: string): string {
  const value = raw.trim();
  return kind === 'unit' ? value.toUpperCase() : value;
}

function isDirectCode(kind: SatCodeKind, raw: string): boolean {
  return kind === 'product' ? isValidSatProductCode(raw) : isValidSatUnitCode(raw);
}

export interface SatCodeSearchProps {
  kind: SatCodeKind;
  /** Código seleccionado ('' = vacío). */
  value: string;
  /** Recibe el código y, cuando viene del catálogo, el elemento completo. */
  onChange: (code: string, item?: SatCodeSearchResult) => void;
  /** Descripción ya conocida del valor actual (para no volver a buscarla). */
  description?: string | null;
  /** Opciones fijas arriba de la lista; por defecto H87/E48 para unidades. */
  suggestions?: SatCodeSearchResult[];
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
}

export function SatCodeSearch({
  kind,
  value,
  onChange,
  description,
  suggestions,
  id,
  placeholder,
  disabled = false,
  allowClear = true,
  className,
}: SatCodeSearchProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [keyword, setKeyword] = useState('');
  // Elemento elegido aquí (código + descripción). Solo cuenta mientras `value`
  // siga siendo ese código: si el valor cambia desde fuera, deja de aplicar.
  const [picked, setPicked] = useState<SatCodeSearchResult | null>(null);

  const text = KIND_TEXT[kind];
  const fixed = suggestions ?? (kind === 'unit' ? SUGGESTED_SAT_UNITS : []);

  useEffect(() => {
    const t = setTimeout(() => setKeyword(input.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [input]);

  const { data, isFetching, isError, error } = useSatCodeSearch(kind, keyword);
  const results = data ?? [];

  const listRef = useRef<HTMLDivElement>(null);
  // Mismo remedio que SearchableSelect: dentro de un Dialog, react-remove-scroll
  // bloquea la rueda/el dedo sobre un panel que vive en un Portal.
  useEffect(() => {
    const node = listRef.current;
    if (!open || !node) return;
    const stop = (e: Event) => e.stopPropagation();
    node.addEventListener('touchmove', stop, { passive: true });
    node.addEventListener('wheel', stop, { passive: true });
    return () => {
      node.removeEventListener('touchmove', stop);
      node.removeEventListener('wheel', stop);
    };
  }, [open]);

  const currentDescription =
    (picked && picked.code === value ? picked.description : null) ??
    description ??
    fixed.find((s) => s.code === value)?.description ??
    null;

  const pick = (code: string, item?: SatCodeSearchResult) => {
    onChange(code, item);
    setPicked(item ?? null);
    setOpen(false);
    setInput('');
  };

  const typed = normalizeCode(kind, input);
  const typedIsCode = typed.length > 0 && isDirectCode(kind, typed);
  const typedInResults = results.some((r) => r.code === typed);
  const trimmedLen = input.trim().length;
  const searching = trimmedLen >= MIN_CHARS;

  const triggerLabel = value
    ? `${value}${currentDescription ? ` — ${currentDescription}` : ''}`
    : placeholder ?? text.placeholder;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setInput('');
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={placeholder ?? text.placeholder}
            disabled={disabled}
            className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground')}
          >
            <span className="flex-1 truncate text-left" title={triggerLabel}>
              {triggerLabel}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] min-w-[320px] max-w-[calc(100vw-2rem)] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={text.searchHint}
              value={input}
              onValueChange={setInput}
              aria-label={text.searchHint}
            />
            <CommandList ref={listRef} className="overscroll-contain">
              {typedIsCode && !typedInResults && (
                <CommandGroup heading="Usar tal cual">
                  <CommandItem value={`direct:${typed}`} onSelect={() => pick(typed)}>
                    <Check className={cn('h-4 w-4 shrink-0', value === typed ? 'opacity-100' : 'opacity-0')} />
                    <span className="min-w-0 flex-1">
                      Usar <span className="font-mono font-medium">{typed}</span> como clave
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        El API la valida contra el catálogo del SAT al guardar.
                      </span>
                    </span>
                  </CommandItem>
                </CommandGroup>
              )}

              {fixed.length > 0 && trimmedLen === 0 && (
                <CommandGroup heading="Sugeridas">
                  {fixed.map((s) => (
                    <CommandItem key={`fixed:${s.code}`} value={`fixed:${s.code}`} onSelect={() => pick(s.code, s)}>
                      <Check className={cn('h-4 w-4 shrink-0', value === s.code ? 'opacity-100' : 'opacity-0')} />
                      <span className="min-w-0 flex-1 break-words">
                        <span className="font-mono font-medium">{s.code}</span> — {s.description}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {!searching && (
                <p className="px-3 py-3 text-xs text-muted-foreground">
                  {trimmedLen === 0
                    ? text.searchHint
                    : `Escribe al menos ${MIN_CHARS} caracteres para buscar en el catálogo del SAT.`}
                </p>
              )}

              {searching && isFetching && (
                <p className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground" role="status">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Buscando en el catálogo del SAT…
                </p>
              )}

              {searching && !isFetching && isError && (
                <p className="px-3 py-3 text-xs text-destructive" role="alert">
                  {billingErrorMessage(error, 'No se pudo consultar el catálogo del SAT')}
                </p>
              )}

              {searching && !isFetching && !isError && results.length === 0 && (
                <p className="px-3 py-3 text-xs text-muted-foreground">{text.empty}</p>
              )}

              {searching && results.length > 0 && (
                <CommandGroup heading={`Catálogo del SAT (${results.length})`}>
                  {results.map((r) => (
                    <CommandItem key={`sat:${r.code}`} value={`sat:${r.code}`} onSelect={() => pick(r.code, r)}>
                      <Check className={cn('h-4 w-4 shrink-0', value === r.code ? 'opacity-100' : 'opacity-0')} />
                      <span className="min-w-0 flex-1 break-words">
                        <span className="font-mono font-medium">{r.code}</span> — {r.description}
                        {r.complement ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">{r.complement}</span>
                        ) : null}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {allowClear && value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Quitar clave"
          title="Quitar clave"
          onClick={() => pick('')}
          className="h-9 w-9 shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
