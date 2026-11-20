'use client';

// BranchChecklist - "Sucursales que puede ver" del formulario de usuario, para
// los roles acotados por sucursal (CEDEAS Supervisor, Dueño de CEDEA,
// Supervisión de zona). Son ~70 sucursales: lleva buscador por nombre o número,
// contador de marcadas y "ver solo las marcadas" (pedido de Sistemas,
// 20-nov-2026). Filtrar no desmarca nada: lo marcado se conserva aunque no se vea.

import { useMemo, useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { checkedBranchesLabel, filterBranchChoices, type BranchChoice } from '@/lib/branch-scope';

interface BranchChecklistProps {
  branches: BranchChoice[];
  checkedIds: string[];
  onToggle: (id: string) => void;
}

export function BranchChecklist({ branches, checkedIds, onToggle }: BranchChecklistProps) {
  const [search, setSearch] = useState('');
  const [onlyChecked, setOnlyChecked] = useState(false);

  const visible = useMemo(
    () => filterBranchChoices(branches, search, onlyChecked ? checkedIds : null),
    [branches, search, onlyChecked, checkedIds],
  );
  const loading = branches.length === 0;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="relative min-w-0 flex-1 basis-56">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o número"
            aria-label="Buscar sucursal"
            className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={onlyChecked}
            onChange={(e) => setOnlyChecked(e.target.checked)}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          Ver solo las marcadas
        </label>
      </div>

      <div className="max-h-56 overflow-y-auto rounded-lg border border-input p-2">
        {loading ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">Cargando sucursales...</p>
        ) : visible.length === 0 ? (
          <p className="px-2 py-1 text-sm text-muted-foreground">
            {search.trim()
              ? `Ninguna sucursal coincide con «${search.trim()}»${onlyChecked ? ' entre las marcadas' : ''}.`
              : 'Todavía no hay sucursales marcadas.'}
          </p>
        ) : (
          visible.map((b) => (
            <label
              key={b.id}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={checkedIds.includes(b.id)}
                onChange={() => onToggle(b.id)}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              <span className="font-mono text-xs text-muted-foreground">{b.code}</span>
              <span>{b.name}</span>
            </label>
          ))
        )}
      </div>

      <p className="mt-1 text-xs font-medium text-foreground" aria-live="polite">
        {checkedBranchesLabel(checkedIds.length)}
        {!loading && visible.length !== branches.length ? (
          <span className="font-normal text-muted-foreground">
            {' '}
            · mostrando {visible.length} de {branches.length}
          </span>
        ) : null}
      </p>
    </div>
  );
}
