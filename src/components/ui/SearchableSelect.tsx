'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface SearchableSelectOption {
  value: string;
  label: string;
  /**
   * Segunda línea, más chica y tenue. Para el contexto de una opción cuyo
   * nombre solo no basta: la ruta de una ubicación, la categoría padre, la
   * sucursal a la que pertenece.
   *
   * Existe porque meter la ruta completa en `label` produce renglones de 60+
   * caracteres que en un teléfono se cortan justo donde está el dato que
   * distingue una opción de otra. Partirlo en dos líneas deja el nombre
   * legible y el contexto debajo. El buscador también mira aquí.
   */
  hint?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allLabel?: string;
  showAllOption?: boolean;
  allValue?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Buscar...',
  allLabel = 'Todos',
  showAllOption = true,
  allValue = '',
  disabled = false,
  className = '',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);

  const isAllSelected = value === allValue;
  const selectedOption = options.find((o) => o.value === value);

  // Label shown in the trigger: selected option's label first. If nothing is
  // selected, show the "all" label only when the all-option exists; otherwise
  // fall back to the placeholder (e.g. period selectors with showAllOption=false).
  const triggerLabel =
    selectedOption?.label ??
    (isAllSelected && showAllOption ? allLabel : placeholder);
  const isPlaceholder = !selectedOption && !(isAllSelected && showAllOption);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            isPlaceholder && 'text-muted-foreground',
            className
          )}
        >
          <span
            className="flex-1 truncate text-left"
            title={
              selectedOption?.hint
                ? `${selectedOption.label} · ${selectedOption.hint}`
                : undefined
            }
          >
            {triggerLabel}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      {/* max-w evita que el panel se salga de la pantalla en móvil cuando el
          disparador vive dentro de un diálogo ancho. */}
      <PopoverContent
        className="w-[--radix-popover-trigger-width] max-w-[calc(100vw-2rem)] min-w-[220px] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>Sin resultados</CommandEmpty>
            <CommandGroup>
              {showAllOption && (
                <CommandItem
                  value={allLabel}
                  onSelect={() => handleSelect(allValue)}
                >
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0',
                      isAllSelected ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="min-w-0 flex-1 break-words whitespace-normal">
                    {allLabel}
                  </span>
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  // El buscador de cmdk filtra por este string, así que el hint
                  // va incluido: si la ruta se muestra abajo, teclear el nombre
                  // del sitio tiene que seguir encontrando la opción.
                  value={`${option.label} ${option.hint ?? ''} ${option.value}`}
                  onSelect={() => handleSelect(option.value)}
                >
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {/* min-w-0 es lo que permite encoger por debajo del ancho del
                      texto; sin él la línea desborda y CommandList la recorta
                      con su overflow-x-hidden en vez de envolverla. */}
                  <span className="min-w-0 flex-1">
                    <span className="block break-words whitespace-normal">
                      {option.label}
                    </span>
                    {option.hint ? (
                      <span className="mt-0.5 block break-words whitespace-normal text-xs text-muted-foreground">
                        {option.hint}
                      </span>
                    ) : null}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
