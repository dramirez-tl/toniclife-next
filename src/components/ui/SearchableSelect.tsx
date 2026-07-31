'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  /**
   * Encabezado del bloque donde va la opción. Las opciones que comparten
   * `group` salen juntas bajo un solo título.
   *
   * Para catálogos jerárquicos esto es mejor que repetir el padre en cada
   * renglón (`hint`): con 16 departamentos colgando de "Corporativo Irapuato",
   * el hint escribía ese nombre 16 veces y la lista se leía plana. Con el
   * encabezado el padre se dice una vez y las hijas se ven como hijas.
   *
   * cmdk esconde solo los grupos que se quedan sin resultados al buscar.
   */
  group?: string;
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

  const listRef = useRef<HTMLDivElement>(null);

  /**
   * Deja desplazar la lista con el dedo (y con la rueda) cuando el selector
   * vive dentro de un diálogo.
   *
   * El Dialog modal de Radix envuelve su contenido en react-remove-scroll, que
   * cuelga de `document` un `touchmove`/`wheel` no pasivo. Ese manejador ignora
   * los gestos nacidos dentro del DialogContent, pero este panel se renderiza
   * en un Portal, o sea FUERA de él: cae en la rama "outside" y ahí llama
   * `preventDefault()` sin siquiera revisar si el elemento puede desplazarse.
   * Resultado: la lista no se mueve con el dedo.
   *
   * Se detiene la propagación con un listener NATIVO sobre el nodo, no con el
   * `onTouchMove` de React: al estar el panel en un Portal, el evento sintético
   * viaja por el árbol de React y no está garantizado que corra antes que el de
   * `document`. Sobre el nodo sí, porque el evento pasa por aquí primero.
   *
   * Solo se detiene la propagación, nunca se llama preventDefault, así que los
   * listeners pueden quedar pasivos y el navegador desplaza de forma nativa.
   */
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

  /**
   * Agrupa respetando el orden en que llegan: el primer grupo que aparece en
   * `options` es el primero de la lista. Así quien arma las opciones decide el
   * orden (por ejemplo raíz y luego sus hijas) sin que el componente reordene
   * nada por su cuenta.
   *
   * Las opciones sin `group` caen en un bloque sin encabezado. Como la mayoría
   * de los ~236 usos no manda `group`, ese es el camino de siempre y se ve
   * igual que antes.
   */
  const groups = useMemo(() => {
    const out: { heading?: string; items: SearchableSelectOption[] }[] = [];
    const seen = new Map<string, number>();
    for (const option of options) {
      const key = option.group ?? '';
      let at = seen.get(key);
      if (at === undefined) {
        at = out.length;
        seen.set(key, at);
        out.push({ heading: option.group, items: [] });
      }
      out[at].items.push(option);
    }
    return out;
  }, [options]);

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
          <CommandList ref={listRef} className="overscroll-contain">
            <CommandEmpty>Sin resultados</CommandEmpty>
            {/* "Todos" va en su propio bloque para que quede fijo hasta arriba
                y no se lo lleve el encabezado del primer grupo. */}
            {showAllOption && (
              <CommandGroup>
                <CommandItem value={allLabel} onSelect={() => handleSelect(allValue)}>
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
              </CommandGroup>
            )}
            {groups.map((group, i) => (
              <CommandGroup key={group.heading ?? `__sin-grupo-${i}`} heading={group.heading}>
                {group.items.map((option) => (
                  <CommandItem
                    key={option.value}
                    // El buscador de cmdk filtra por este string, así que el
                    // hint y el grupo van incluidos: al mover el padre al
                    // encabezado, teclear "corporativo" tiene que seguir
                    // encontrando sus departamentos.
                    value={`${option.label} ${option.hint ?? ''} ${option.group ?? ''} ${option.value}`}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0',
                        value === option.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {/* min-w-0 es lo que permite encoger por debajo del ancho
                        del texto; sin él la línea desborda y CommandList la
                        recorta con su overflow-x-hidden en vez de envolverla. */}
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
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
