'use client';

// IncludedProductPicker - Busca un producto del catálogo (clave o nombre) y lo
// deja elegido como "producto incluido" del boleto (informativo: se imprime
// como "Incluye: 1 × …").

import { useEffect, useRef, useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useProductSearch } from '@/hooks/useProducts';

interface IncludedProductPickerProps {
  productId: string;
  /** "CLAVE — Nombre" del producto elegido (solo para mostrar). */
  productLabel: string;
  onChange: (next: { productId: string; productLabel: string }) => void;
  disabled?: boolean;
  id?: string;
}

export function IncludedProductPicker({
  productId,
  productLabel,
  onChange,
  disabled = false,
  id,
}: IncludedProductPickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const debounced = useDebouncedValue(query.trim(), 300);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { data, isFetching } = useProductSearch(debounced, { limit: 10, isActive: true });
  const results = data?.data ?? [];

  // Cerrar la lista al hacer clic fuera.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (productId) {
    return (
      <div className="flex min-h-9 flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className="gap-1 border-[#a7c1e2] bg-[#C8DDF2]/30 py-1 text-sm font-normal text-[#2f5165]"
        >
          {productLabel || productId}
          {!disabled && (
            <button
              type="button"
              className="ml-1 rounded-full p-0.5 text-[#2f5165]/60 hover:bg-white hover:text-red-600"
              onClick={() => onChange({ productId: '', productLabel: '' })}
              title="Quitar producto"
              aria-label="Quitar producto incluido"
            >
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </Badge>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input
        id={id}
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar por clave o nombre…"
        className="pl-9"
        autoComplete="off"
      />
      {isFetching && (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
      )}
      {open && debounced.length >= 2 && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-500">
              {isFetching ? 'Buscando…' : 'Sin resultados'}
            </p>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                onClick={() => {
                  onChange({ productId: p.id, productLabel: `${p.code} — ${p.name}` });
                  setQuery('');
                  setOpen(false);
                }}
              >
                <span className="font-mono text-xs text-gray-500">{p.code}</span>
                <span className="min-w-0 flex-1 truncate text-gray-800">{p.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
