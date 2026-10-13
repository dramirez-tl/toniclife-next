'use client';

// QrScanner - Lee códigos QR con la cámara (entrada al evento).
//
// Mismo esquema que BarcodeScannerDialog (activos): la cámara se abre con
// getUserMedia y ZXing se carga SOLO al encender el escáner (import dinámico)
// para no inflar el bundle. Aquí no hay diálogo: el video vive dentro de la
// pantalla de entrada y sigue leyendo QR tras QR; quien decide qué hacer con
// cada lectura (y evitar repetidas) es el padre vía `onDecoded`.
//
// La cámara exige HTTPS (en Vercel se cumple; en desarrollo, localhost).

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, SwitchCamera } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QrScannerProps {
  /** Texto decodificado del QR (la liga del boleto). Se llama en cada lectura. */
  onDecoded: (text: string) => void;
  className?: string;
}

export function QrScanner({ onDecoded, className = '' }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const stoppedRef = useRef(false);
  const onDecodedRef = useRef(onDecoded);
  onDecodedRef.current = onDecoded;

  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting');
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  /** Apaga cámara y lector. Idempotente. */
  const stopAll = useCallback(() => {
    stoppedRef.current = true;
    try {
      controlsRef.current?.stop();
    } catch {
      /* el lector ya estaba detenido */
    }
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    stoppedRef.current = false;
    setStatus('starting');
    setError('');

    const start = async () => {
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
      video.setAttribute('playsinline', 'true');
      try {
        await video.play();
      } catch {
        /* algunos navegadores reproducen solo tras interacción; el usuario ya tocó el botón */
      }
      if (stoppedRef.current) return;
      setStatus('scanning');

      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser');
        if (stoppedRef.current) return;
        const reader = new BrowserQRCodeReader(undefined, {
          // Pausa corta entre intentos: suficiente para leer al vuelo sin
          // saturar la CPU del teléfono.
          delayBetweenScanAttempts: 150,
          delayBetweenScanSuccess: 800,
        });
        const controls = await reader.decodeFromVideoElement(video, (result) => {
          if (result && !stoppedRef.current) onDecodedRef.current(result.getText());
        });
        if (stoppedRef.current) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      } catch {
        if (stoppedRef.current) return;
        setStatus('error');
        setError('No se pudo iniciar el lector de QR. Teclea el número del boleto.');
      }
    };

    void start();
    return stopAll;
  }, [facingMode, stopAll]);

  return (
    <div className={className}>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-black">
        <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
        {status === 'scanning' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-3/5 w-3/5 max-w-[260px] rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
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
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-gray-500">
          {status === 'scanning' ? 'Apunta al QR del boleto; se registra solo.' : ''}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setFacingMode((f) => (f === 'environment' ? 'user' : 'environment'))}
          disabled={status === 'error'}
        >
          <SwitchCamera className="mr-1.5 h-4 w-4" />
          Cambiar cámara
        </Button>
      </div>
    </div>
  );
}
