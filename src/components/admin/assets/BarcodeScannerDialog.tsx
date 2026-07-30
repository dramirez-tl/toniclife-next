'use client';

// BarcodeScannerDialog - Lee la etiqueta con la cámara del celular.
//
// Quien inventaría anda con el teléfono en la mano: apunta al código de barras
// y el número se llena solo.
//
// Dos motores, en este orden:
//   1. BarcodeDetector nativo del navegador (Chrome en Android). Es el más
//      rápido y no descarga nada.
//   2. ZXing, cargado SOLO al abrir el escáner (import dinámico) para no
//      inflar el bundle. Es el que salva a Safari en iPhone, que no tiene
//      BarcodeDetector.
//
// La cámara exige HTTPS. En producción (Vercel) se cumple; en desarrollo hay
// que entrar por localhost o el navegador la bloquea.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, X, SwitchCamera } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface BarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama con el código leído. El diálogo se cierra solo. */
  onDetected: (code: string) => void;
  title?: string;
  description?: string;
}

/** Formatos que puede traer una etiqueta de activo. */
const NATIVE_FORMATS = ['code_128', 'code_39', 'ean_13', 'ean_8', 'itf', 'codabar'];

type NativeBarcodeDetector = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};

type DetectorCtor = new (opts: { formats: string[] }) => NativeBarcodeDetector;

function getNativeDetectorCtor(): DetectorCtor | null {
  if (typeof window === 'undefined') return null;
  const ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  return typeof ctor === 'function' ? ctor : null;
}

export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onDetected,
  title = 'Escanear etiqueta',
  description = 'Apunta la cámara al código de barras de la etiqueta.',
}: BarcodeScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const stoppedRef = useRef(false);

  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting');
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  /** Apaga cámara y motores. Idempotente: se llama al cerrar y al desmontar. */
  const stopAll = useCallback(() => {
    stoppedRef.current = true;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    try {
      zxingControlsRef.current?.stop();
    } catch {
      /* el motor ya estaba detenido */
    }
    zxingControlsRef.current = null;
    // Apagar la cámara explícitamente: sin esto el LED del teléfono se queda
    // encendido y el navegador mantiene el dispositivo tomado.
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const handleHit = useCallback(
    (raw: string) => {
      const code = raw.replace(/[^0-9]/g, '').trim();
      if (!code) return;
      stopAll();
      // Vibración corta como confirmación: en la mano se siente antes de mirar.
      try {
        navigator.vibrate?.(60);
      } catch {
        /* no todos los dispositivos vibran */
      }
      onDetected(code);
      onOpenChange(false);
    },
    [onDetected, onOpenChange, stopAll],
  );

  useEffect(() => {
    if (!open) {
      stopAll();
      return;
    }

    stoppedRef.current = false;
    setStatus('starting');
    setError('');

    const start = async () => {
      // 1) Cámara
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode } },
          audio: false,
        });
      } catch (e) {
        if (stoppedRef.current) return;
        const err = e as { name?: string };
        setStatus('error');
        setError(
          err?.name === 'NotAllowedError'
            ? 'No diste permiso para usar la cámara. Habilítalo en el navegador y vuelve a intentar.'
            : err?.name === 'NotFoundError'
              ? 'Este dispositivo no tiene cámara disponible.'
              : 'No se pudo abrir la cámara. Si estás en una conexión sin HTTPS, el navegador la bloquea.',
        );
        return;
      }
      if (stoppedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true'); // iOS: no abrir en pantalla completa
      try {
        await video.play();
      } catch {
        /* algunos navegadores reproducen solo tras interacción; el usuario ya tocó el botón */
      }
      if (stoppedRef.current) return;
      setStatus('scanning');

      // 2) Motor nativo si existe
      const Ctor = getNativeDetectorCtor();
      if (Ctor) {
        const detector = new Ctor({ formats: NATIVE_FORMATS });
        const tick = async () => {
          if (stoppedRef.current || !videoRef.current) return;
          try {
            const found = await detector.detect(videoRef.current);
            if (found?.length) {
              handleHit(found[0].rawValue);
              return;
            }
          } catch {
            /* frame sin código o aún sin dimensiones: seguir intentando */
          }
          rafRef.current = requestAnimationFrame(() => void tick());
        };
        rafRef.current = requestAnimationFrame(() => void tick());
        return;
      }

      // 3) ZXing (iPhone y navegadores sin BarcodeDetector)
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        if (stoppedRef.current) return;
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoElement(video, (result) => {
          if (result) handleHit(result.getText());
        });
        if (stoppedRef.current) {
          controls.stop();
          return;
        }
        zxingControlsRef.current = controls;
      } catch {
        if (stoppedRef.current) return;
        setStatus('error');
        setError('No se pudo iniciar el lector. Teclea el número de la etiqueta a mano.');
      }
    };

    void start();
    return stopAll;
  }, [open, facingMode, handleHit, stopAll]);

  return (
    // Al cerrar (Esc o el botón), el efecto de arriba apaga la cámara en su
    // cleanup, así que aquí basta con propagar el cambio.
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[calc(100%-1rem)] sm:max-w-md"
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Cerrar"
              className="rounded-xs opacity-70 hover:opacity-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-black">
          <video
            ref={videoRef}
            muted
            playsInline
            className="h-full w-full object-cover"
          />

          {/* Guía de encuadre */}
          {status === 'scanning' && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-24 w-4/5 rounded-lg border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          )}

          {status === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Abriendo la cámara…</p>
            </div>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-white">
              <Camera className="h-8 w-8 opacity-70" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        {status === 'scanning' && (
          <p className="text-center text-xs text-muted-foreground">
            Acerca el código hasta que quede dentro del recuadro.
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setFacingMode((f) => (f === 'environment' ? 'user' : 'environment'))}
            disabled={status === 'error'}
          >
            <SwitchCamera className="mr-2 h-4 w-4" />
            Cambiar cámara
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
