'use client';

// Diálogo de preferencias del usuario (engrane del bloque de cuenta del
// sidebar). Hoy: tamaño de letra; se guarda por usuario en el navegador y se
// aplica al instante (ver lib/preferences.ts).

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_PREFERENCES,
  FONT_SCALE_OPTIONS,
  applyPreferences,
  loadPreferences,
  savePreferences,
  type AdminPreferences,
  type FontScale,
} from '@/lib/preferences';

interface PreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null | undefined;
}

export function PreferencesDialog({ open, onOpenChange, userId }: PreferencesDialogProps) {
  // Estado inicial desde el navegador; el padre monta este diálogo con key={userId}
  // para que al cambiar de usuario se vuelva a leer.
  const [prefs, setPrefs] = useState<AdminPreferences>(() =>
    typeof window === 'undefined' ? DEFAULT_PREFERENCES : loadPreferences(userId),
  );

  const choose = (fontScale: FontScale) => {
    const next = { ...prefs, fontScale };
    setPrefs(next);
    applyPreferences(next);
    savePreferences(userId, next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Preferencias</DialogTitle>
          <DialogDescription>
            Se guardan para tu usuario en este navegador y aplican a todo el admin (inventario, entradas, salidas,
            traspasos…).
          </DialogDescription>
        </DialogHeader>

        <div>
          <p className="text-sm font-medium text-gray-900">Tamaño de letra</p>
          <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tamaño de letra">
            {FONT_SCALE_OPTIONS.map((opt) => {
              const active = prefs.fontScale === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => choose(opt.value)}
                  className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors ${
                    active
                      ? 'border-[#3E667D] bg-[#3E667D]/10 text-[#2f5165]'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-sm font-semibold">{opt.label}</span>
                  <span className="text-xs text-gray-500">{opt.hint}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            El cambio se ve al momento; puedes volver a ajustarlo cuando quieras.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => choose(1)} disabled={prefs.fontScale === 1}>
            Restablecer
          </Button>
          <Button onClick={() => onOpenChange(false)}>Listo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
