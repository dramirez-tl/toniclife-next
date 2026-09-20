'use client';

// DistributorSearchSelect — selector de distribuidor con búsqueda en el API
// (nombre parcial o nº exacto), sobre Popover + Command como SearchableSelect
// pero con opciones asíncronas. El valor es el id del cliente; el consumidor
// recibe también nombre/número/país para pintar el chip elegido.
//
// Accesible: botón `role=combobox` con `id` para `<Label htmlFor>`,
// `aria-expanded`, `aria-describedby`; la lista anuncia el estado de carga
// con `aria-live`.

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import { customersService } from '@/services/customers.service';
import type { Customer } from '@/types/customer';

export interface DistributorOption {
  id: string;
  name: string;
  number: string | null;
  countryCode?: string | null;
}

interface DistributorSearchSelectProps {
  value: DistributorOption | null;
  onChange: (option: DistributorOption | null) => void;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

function toOption(c: Customer): DistributorOption {
  const country = (c as { countryCode?: string | null; country?: { code?: string | null } | null })
    .countryCode;
  return {
    id: c.id,
    name: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || 'Sin nombre',
    number: c.customerNumber ?? null,
    countryCode: country ?? null,
  };
}

export function DistributorSearchSelect({
  value,
  onChange,
  id,
  disabled = false,
  placeholder = 'Nombre o nº de distribuidor…',
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: DistributorSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [term, setTerm] = useState('');

  // Retraso de 300 ms para no golpear el API por tecla.
  useEffect(() => {
    if (draft.trim() === term) return;
    const t = setTimeout(() => setTerm(draft.trim()), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const isNumeric = /^\d{1,12}$/.test(term);

  const byName = useQuery({
    queryKey: ['treasury', 'distributor-search', 'name', term],
    queryFn: () => customersService.getAll({ search: term, limit: 10 }),
    enabled: open && term.length >= 2,
    staleTime: 30 * 1000,
    retry: false,
  });
  const byNumber = useQuery({
    queryKey: ['treasury', 'distributor-search', 'number', term],
    queryFn: () => customersService.getAll({ customerNumber: term, limit: 1 }),
    enabled: open && isNumeric,
    staleTime: 30 * 1000,
    retry: false,
  });

  const options = useMemo(() => {
    const seen = new Set<string>();
    const out: Array<DistributorOption & { exact: boolean }> = [];
    for (const c of byNumber.data?.data ?? []) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push({ ...toOption(c), exact: true });
    }
    for (const c of byName.data?.data ?? []) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      out.push({ ...toOption(c), exact: false });
    }
    return out;
  }, [byName.data, byNumber.data]);

  const isFetching = byName.isFetching || byNumber.isFetching;
  const hasError = byName.isError || byNumber.isError;
  const tooShort = term.length < 2 && !isNumeric;

  const select = (opt: DistributorOption) => {
    onChange(opt);
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
            className={cn('w-full justify-between font-normal', !value && 'text-muted-foreground')}
          >
            <span className="flex-1 truncate text-left">
              {value ? (
                <>
                  <span className="font-medium text-foreground">{value.name}</span>
                  {value.number && <span className="ml-2 font-mono text-xs text-muted-foreground">#{value.number}</span>}
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
              placeholder="Escribe nombre (2+ letras) o nº exacto"
              value={draft}
              onValueChange={setDraft}
            />
            <CommandList className="overscroll-contain">
              <div aria-live="polite" className="sr-only">
                {isFetching ? 'Buscando distribuidores' : `${options.length} resultados`}
              </div>
              {tooShort && (
                <p className="px-3 py-3 text-xs text-muted-foreground">
                  Escribe al menos 2 letras del nombre o el número exacto.
                </p>
              )}
              {!tooShort && isFetching && (
                <p className="flex items-center gap-2 px-3 py-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Buscando…
                </p>
              )}
              {!tooShort && hasError && (
                <p className="px-3 py-3 text-xs text-destructive">No se pudo buscar. Intenta de nuevo.</p>
              )}
              {!tooShort && !isFetching && !hasError && options.length === 0 && (
                <CommandEmpty>Sin coincidencias</CommandEmpty>
              )}
              {options.length > 0 && (
                <CommandGroup>
                  {options.map((opt) => (
                    <CommandItem key={opt.id} value={opt.id} onSelect={() => select(opt)}>
                      <Check
                        className={cn('h-4 w-4 shrink-0', value?.id === opt.id ? 'opacity-100' : 'opacity-0')}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block break-words">{opt.name}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {opt.number ? `#${opt.number}` : 'Sin número'}
                          {opt.countryCode ? ` · ${opt.countryCode}` : ''}
                          {opt.exact ? ' · coincidencia exacta' : ''}
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
          aria-label="Quitar distribuidor seleccionado"
          title="Quitar"
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      )}
    </div>
  );
}
