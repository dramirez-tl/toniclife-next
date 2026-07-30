'use client';

// LabelCodeField - Captura del código de la etiqueta física, tecleado o escaneado.
//
// Las etiquetas se imprimen ANTES de tener el equipo. Aquí se captura el número
// que trae pegado el aparato y se valida contra el inventario de etiquetas:
// si no existe o ya está en uso, se dice de inmediato y con el nombre del equipo
// que la trae.
//
// Un lector de código de barras se comporta como un teclado: teclea el número y
// manda Enter. Por eso basta un input normal que valide al Enter y al salir del
// campo, sin librerías de escaneo.

import { useEffect, useRef, useState } from 'react';
import { Barcode, Check, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { assetsService } from '@/services/assets.service';
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
  const inputRef = useRef<HTMLInputElement>(null);
  // Evita pisar el resultado de una consulta más nueva con una más vieja.
  const lastQueried = useRef('');

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
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
      // Descartar respuestas viejas
      if (lastQueried.current !== code) return;
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
    inputRef.current?.focus();
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
            placeholder="Escanea la etiqueta o teclea el número"
            className="pl-9 font-mono tracking-wider"
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
        {value ? (
          <Button type="button" variant="outline" onClick={clear} disabled={disabled}>
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {result && !checking ? (
        result.usable ? (
          <p className="flex items-center gap-1.5 text-xs text-emerald-600">
            <Check className="h-3.5 w-3.5" />
            Etiqueta {result.code} disponible
            {result.label?.batchNumber ? ` · ${result.label.batchNumber}` : ''}
          </p>
        ) : (
          <p className="flex items-start gap-1.5 text-xs text-destructive">
            <X className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {result.reason}
          </p>
        )
      ) : (
        <p className="text-xs text-muted-foreground">
          {hint ??
            'Opcional. Si el equipo aún no trae etiqueta pegada, déjalo vacío y vincúlala después.'}
        </p>
      )}
    </div>
  );
}
