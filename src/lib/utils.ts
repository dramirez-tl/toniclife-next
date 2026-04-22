import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';
import { DEFAULT_TIMEZONE } from '@/lib/timezone-utils';

/**
 * Combina clases de Tailwind de manera inteligente
 * Usa clsx para combinar clases condicionales y twMerge para resolver conflictos
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea un precio con el formato de moneda mexicana
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

/**
 * Formatea una fecha en formato legible
 */
export function formatDate(date: Date | string, timezone: string = DEFAULT_TIMEZONE): string {
  return new Date(date).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: timezone,
  });
}

/**
 * Formatea fecha y hora
 */
export function formatDateTime(date: Date | string, timezone: string = DEFAULT_TIMEZONE): string {
  return new Date(date).toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  });
}

/**
 * Trunca un texto a una longitud máxima
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * Genera un ID único simple
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Shows a confirmation toast and returns a promise that resolves to true/false.
 */
export function confirmAction(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    toast(message, {
      duration: Infinity,
      action: {
        label: 'Confirmar',
        onClick: () => resolve(true),
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => resolve(false),
      },
      onDismiss: () => resolve(false),
    });
  });
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
