'use client';

// LabelCodeField - Captura del código de la etiqueta: cámara, lector o tecleado.
//
// Las etiquetas se imprimen ANTES de tener el equipo. Aquí se captura el número
// que trae pegado el aparato y se valida contra el inventario de etiquetas:
// si no existe o ya está en uso, se dice de inmediato y con el nombre del equipo
// que la trae.
//
// Tres formas de capturar, pensadas para quien anda con el celular en la mano:
//   1. Botón de CÁMARA: escanea el código de barras y llena el campo solo.
//   2. Lector de mano: se comporta como teclado (teclea y manda Enter), por eso
//      el input valida al Enter; no hace falta librería.
//   3. A mano, tecleando el número.

import { useEffect, useRef, useState } from 'react';
import { Barcode, Camera, Check, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { assetsService } from '@/services/assets.service';
import { BarcodeScannerDialog } from './BarcodeScannerDialog';
import type { LabelCheckResult } from '@/types/asset';

interface LabelCodeFieldProps {
  value: string;
  onChange: (code: string) => void;
  /** Se avisa al padre si el código sirve, para bloquear el guardado. */
  onValidityChange?: (state: { code: string; usable: boolean }) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function LabelCodeField({
  value,
  onChange,
  onValidityChange,
  label = 'Etiqueta física',
  hint,
  disabled,
  autoFocus,
}: LabelCodeFieldProps) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<LabelCheckResult | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Evita pisar el resultado de una consulta más nueva con una más vieja.
  const lastQueried = useRef('');

  useEffect(() => {
    // En móvil NO enfocamos solo: abriría el teclado y taparía media pantalla.
    const isCoarse =
      typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
    if (autoFocus && !isCoarse) inputRef.current?.focus();
  }, [autoFocus]);

  // Si el padre limpia el campo, se limpia el estado de validación.
  useEffect(() => {
    if (!value) {
      setResult(null);
      lastQueried.current = '';
    }
  }, [value]);

  const check = async (raw: string) => {
    const code = raw.trim();
    if (!code) {
      setResult(null);
      onValidityChange?.({ code: '', usable: true }); // sin etiqueta es válido
      return;
    }
    if (code === lastQueried.current) return;
    lastQueried.current = code;

    setChecking(true);
    try {
      const res = await assetsService.checkLabel(code);
      if (lastQueried.current !== code) return; // llegó tarde: descartar
      setResult(res);
      onValidityChange?.({ code, usable: res.usable });
    } catch {
      const failed: LabelCheckResult = {
        found: false,
        usable: false,
        code,
        reason: 'No se pudo verificar la etiqueta. Revisa tu conexión.',
        label: null,
      };
      setResult(failed);
      onValidityChange?.({ code, usable: false });
    } finally {
      setChecking(false);
    }
  };

  const clear = () => {
    onChange('');
    setResult(null);
    lastQueried.current = '';
    onValidityChange?.({ code: '', usable: true });
  };

  /** Al escanear: se llena el campo y se valida sin que el usuario haga nada más. */
  const handleScanned = (code: string) => {
    onChange(code);
    void check(code);
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor="label-code">{label}</Label>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Barcode className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="label-code"
            ref={inputRef}
            value={value}
            disabled={disabled}
            inputMode="numeric"
            autoComplete="off"
            placeholder="Escanea o teclea el número"
            className="h-12 pl-9 font-mono text-base tracking-wider sm:h-10 sm:text-sm"
            onChange={(e) => {
              // El lector manda solo dígitos; se filtra por si teclean de más.
              const clean = e.target.value.replace(/[^0-9]/g, '');
              onChange(clean);
              if (result) setResult(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault(); // el lector manda Enter: no enviar el formulario
                void check(value);
              }
            }}
            onBlur={() => void check(value)}
          />
          {checking ? (
            <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        {/* Botón de cámara: el camino rápido en celular */}
        <Button
          type="button"
          variant="outline"
          onClick={() => setScannerOpen(true)}
          disabled={disabled}
          className="h-12 shrink-0 px-4 sm:h-10 sm:px-3"
          aria-label="Escanear con la cámara"
          title="Escanear con la cámara"
        >
          <Camera className="h-5 w-5 sm:h-4 sm:w-4" />
          <span className="ml-2 sm:hidden">Escanear</span>
        </Button>

        {value ? (
          <Button
            type="button"
            variant="outline"
            onClick={clear}
            disabled={disabled}
            className="h-12 shrink-0 px-3 sm:h-10"
            aria-label="Quitar el código"
          >
            <X className="h-5 w-5 sm:h-4 sm:w-4" />
          </Button>
        ) : null}
      </div>

      {result && !checking ? (
        result.usable ? (
          <p className="flex items-center gap-1.5 text-sm text-emerald-600 sm:text-xs">
            <Check className="h-4 w-4 shrink-0 sm:h-3.5 sm:w-3.5" />
            Etiqueta {result.code} disponible
            {result.label?.batchNumber ? ` · ${result.label.batchNumber}` : ''}
          </p>
        ) : (
          <p className="flex items-start gap-1.5 text-sm text-destructive sm:text-xs">
            <X className="mt-0.5 h-4 w-4 shrink-0 sm:h-3.5 sm:w-3.5" />
            {result.reason}
          </p>
        )
      ) : (
        <p className="text-xs text-muted-foreground">
          {hint ??
            'Opcional. Si el equipo aún no trae etiqueta pegada, déjalo vacío y vincúlala después.'}
        </p>
      )}

      <BarcodeScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDetected={handleScanned}
      />
    </div>
  );
}
