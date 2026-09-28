'use client';

// AssetParentSelect — selector del equipo donde va instalado un componente
// (el NVR de un disco duro, la laptop de un cargador). Busca en el API
// (GET /it-assets/search: etiqueta, nombre, serie, marca o modelo) sobre
// Popover + Command como DistributorSearchSelect, con opciones asíncronas y
// debounce de 300 ms. Solo ofrece activos vivos de categorías de equipo.
//
// Accesible: botón `role=combobox` con `id` para `<Label htmlFor>`,
// `aria-expanded`, `aria-describedby`; la lista anuncia la carga con `aria-live`.

import { useEffect, useState } from 'react';
import { Check, ChevronsUpDown, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAssetSearch } from '@/hooks/useAssets';
import type { AssetSearchHit } from '@/types/asset';

/** Lo que el consumidor necesita del equipo elegido (heredar sucursal, pintar el chip). */
export interface AssetParentOption {
  id: string;
  assetTag: string | null;
  name: string;
  branchId: string | null;
  locationId: string | null;
  branchName: string | null;
  categoryCode: string | null;
}

export function toParentOption(hit: AssetSearchHit): AssetParentOption {
  return {
    id: hit.id,
    assetTag: hit.assetTag,
    name: hit.name,
    branchId: hit.branchId,
    locationId: hit.locationId,
    branchName: hit.branchName,
    categoryCode: hit.categoryCode,
  };
}

interface AssetParentSelectProps {
  value: AssetParentOption | null;
  onChange: (option: AssetParentOption | null) => void;
  /** El activo que se edita: nunca se ofrece a sí mismo. */
  excludeId?: string;
  /** Códigos de categoría admitidos en MAYÚSCULAS, ej. 'DVR,SERVIDOR'. */
  categoryCodes?: string;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

const MIN_CHARS = 2;

export function AssetParentSelect({
  value,
  onChange,
  excludeId,
  categoryCodes,
  id,
  disabled = false,
  placeholder = 'Etiqueta, nombre o serie del equipo…',
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: AssetParentSelectProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [term, setTerm] = useState('');

  // Retraso de 300 ms para no golpear el API por tecla.
  useEffect(() => {
    const t = setTimeout(() => setTerm(draft.trim()), 300);
    return () => clearTimeout(t);
  }, [draft]);

  const tooShort = term.length < MIN_CHARS;
  const { data: hits = [], isFetching, isError } = useAssetSearch(
    { q: term, limit: 20, excludeId, categoryCodes },
    open && !tooShort,
  );

  const select = (hit: AssetSearchHit) => {
    onChange(toParentOption(hit));
    setOpen(false);
    setDraft('');
    setTerm('');
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            id={id}
            aria-expanded={open}
            aria-describedby={ariaDescribedBy}
            aria-invalid={ariaInvalid || undefined}
            disabled={disabled}
            className={cn(
              'h-12 w-full justify-between font-normal sm:h-10',
              !value && 'text-muted-foreground',
            )}
          >
            <span className="flex-1 truncate text-left">
              {value ? (
                <>
                  <span className="font-mono text-foreground">
                    {value.assetTag ?? 'Sin etiqueta'}
                  </span>
                  <span className="text-foreground"> · {value.name}</span>
                  {value.branchName ? (
                    <span className="ml-2 text-xs text-muted-foreground">{value.branchName}</span>
                  ) : null}
                </>
              ) : (
                placeholder
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Escribe 2+ caracteres de la etiqueta, nombre o serie"
              value={draft}
              onValueChange={setDraft}
            />
            <CommandList className="overscroll-contain">
              <div aria-live="polite" className="sr-only">
                {isFetching ? 'Buscando equipos' : `${hits.length} resultados`}
              </div>
              {tooShort && (
                <p className="px-3 py-3 text-xs text-muted-foreground">
                  Escribe al menos {MIN_CHARS} caracteres de la etiqueta, el nombre o la serie.
                </p>
              )}
              {!tooShort && isFetching && (
                <p className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Buscando…
                </p>
              )}
              {!tooShort && isError && (
                <p className="px-3 py-3 text-xs text-destructive">
                  No se pudo buscar. Intenta de nuevo.
                </p>
              )}
              {!tooShort && !isFetching && !isError && hits.length === 0 && (
                <CommandEmpty>Sin coincidencias</CommandEmpty>
              )}
              {hits.length > 0 && (
                <CommandGroup>
                  {hits.map((hit) => (
                    <CommandItem key={hit.id} value={hit.id} onSelect={() => select(hit)}>
                      <Check
                        className={cn(
                          'h-4 w-4 shrink-0',
                          value?.id === hit.id ? 'opacity-100' : 'opacity-0',
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block break-words">
                          <span className="font-mono">{hit.assetTag ?? 'Sin etiqueta'}</span> ·{' '}
                          {hit.name}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {hit.categoryName} · {hit.branchName ?? 'Sin sucursal'}
                          {hit.serialNumber ? ` · S/N ${hit.serialNumber}` : ''}
                        </span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 px-2"
          onClick={() => onChange(null)}
          aria-label="Quitar el equipo padre"
          title="Quitar"
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      )}
    </div>
  );
}
