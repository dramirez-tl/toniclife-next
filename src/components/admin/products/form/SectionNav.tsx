'use client';

// SectionNav — navegación de la ficha: lista lateral en escritorio (lg) y
// `Select` en móvil. El punto ámbar marca las secciones con cambios sin guardar.

import { useId } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ProductSectionId } from '../lib/labels';

export interface SectionNavItem {
  id: ProductSectionId;
  label: string;
  description: string;
}

interface SectionNavProps {
  items: SectionNavItem[];
  active: ProductSectionId;
  dirty: Partial<Record<ProductSectionId, boolean>>;
  onSelect: (id: ProductSectionId) => void;
}

export function SectionNav({ items, active, dirty, onSelect }: SectionNavProps) {
  const selectId = useId();
  return (
    <>
      <div className="lg:hidden">
        <Label htmlFor={selectId} className="mb-1.5 block">
          Sección
        </Label>
        <Select value={active} onValueChange={(v) => onSelect(v as ProductSectionId)}>
          <SelectTrigger id={selectId} className="w-full bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
                {dirty[item.id] ? ' (sin guardar)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav aria-label="Secciones de la ficha" className="hidden lg:block">
        <ul className="sticky top-44 space-y-1">
          {items.map((item) => {
            const isActive = item.id === active;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E667D]',
                    isActive ? 'bg-[#3E667D] font-semibold text-white' : 'text-gray-700 hover:bg-gray-100',
                  )}
                >
                  <span>{item.label}</span>
                  {dirty[item.id] ? (
                    <span className="flex items-center" title="Cambios sin guardar">
                      <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden />
                      <span className="sr-only">Cambios sin guardar</span>
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
