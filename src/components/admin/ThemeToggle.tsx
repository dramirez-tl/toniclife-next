'use client';

import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  theme: 'light' | 'dark';
  onToggle: () => void;
  className?: string;
}

/**
 * Pill switch sol↔luna para alternar el tema del panel admin.
 * El estado vive en AdminLayout (se persiste en localStorage y aplica la clase
 * `dark` al contenedor del admin). Aquí solo es la UI del control.
 */
export function ThemeToggle({ theme, onToggle, className }: ThemeToggleProps) {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onClick={onToggle}
      className={cn(
        'group relative inline-flex h-8 w-[3.75rem] items-center rounded-full border border-border',
        'bg-muted/70 transition-colors duration-300 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'hover:border-foreground/20',
        className,
      )}
    >
      {/* Iconos de fondo en los extremos del riel */}
      <Sun
        className={cn(
          'pointer-events-none absolute left-2 h-3.5 w-3.5 transition-opacity duration-300',
          isDark ? 'opacity-40 text-muted-foreground' : 'opacity-0',
        )}
        strokeWidth={2}
      />
      <Moon
        className={cn(
          'pointer-events-none absolute right-2 h-3.5 w-3.5 transition-opacity duration-300',
          isDark ? 'opacity-0' : 'opacity-40 text-muted-foreground',
        )}
        strokeWidth={2}
      />

      {/* Knob deslizante con el icono activo */}
      <span
        className={cn(
          'relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-card shadow-sm ring-1 ring-black/5',
          'transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'motion-reduce:transition-none',
          isDark ? 'translate-x-[1.875rem]' : 'translate-x-1',
        )}
      >
        <Sun
          className={cn(
            'absolute h-3.5 w-3.5 text-amber-500 transition-all duration-300 motion-reduce:transition-none',
            isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100',
          )}
          strokeWidth={2.25}
        />
        <Moon
          className={cn(
            'absolute h-3.5 w-3.5 text-primary transition-all duration-300 motion-reduce:transition-none',
            isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0',
          )}
          strokeWidth={2.25}
        />
      </span>
    </button>
  );
}
