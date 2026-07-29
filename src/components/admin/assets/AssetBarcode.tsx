'use client';

// AssetBarcode - Vista previa del código de barras de la etiqueta del activo.
//
// Usa jsbarcode en formato CODE128, la misma simbología y librería que ya usa el
// ticket del POS (src/lib/generate-pos-ticket.ts). La impresión física de las
// etiquetas será un proyecto Electron aparte; aquí solo se previsualiza para
// verificar el código y poder escanearlo desde pantalla.

import { useEffect, useRef, useState } from 'react';

interface AssetBarcodeProps {
  value: string;
  /** Alto de las barras en px. */
  height?: number;
  /** Grosor de la barra más delgada. */
  width?: number;
  showValue?: boolean;
  className?: string;
}

export function AssetBarcode({
  value,
  height = 60,
  width = 2,
  showValue = true,
  className,
}: AssetBarcodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      if (!canvasRef.current || !value) return;
      try {
        const JsBarcode = (await import('jsbarcode')).default;
        if (cancelled || !canvasRef.current) return;
        JsBarcode(canvasRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue: showValue,
          fontSize: 14,
          margin: 8,
          background: '#ffffff',
          lineColor: '#000000',
        });
        setError(false);
      } catch {
        if (!cancelled) setError(true);
      }
    };

    void render();
    return () => {
      cancelled = true;
    };
  }, [value, height, width, showValue]);

  if (!value) return null;

  if (error) {
    return (
      <p className="text-sm text-destructive">
        No se pudo generar el código de barras para {value}.
      </p>
    );
  }

  return (
    <div className={className}>
      <canvas ref={canvasRef} className="max-w-full rounded-md bg-white" />
    </div>
  );
}
