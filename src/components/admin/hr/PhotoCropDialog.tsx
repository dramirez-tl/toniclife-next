'use client';

// PhotoCropDialog - Recortar la foto del expediente antes de subirla, como el
// recorte de foto de perfil de Facebook: se arrastra y se acerca hasta que el
// rostro queda dentro del marco, y lo que se sube es SOLO ese marco, ya con la
// proporción y el tamaño de la credencial (ver lib/badge-photo.ts).
//
// Por qué aquí y no en el API: las fotos de la sesión pesan 22 MB y el API
// acepta 5; recortar en el navegador manda ~150 KB y deja a RRHH decidir el
// encuadre viendo la foto, que una máquina no sabe hacer bien.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Cropper, { type Area, type MediaSize } from 'react-easy-crop';
import { toast } from 'sonner';
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import {
  BADGE_PHOTO_ASPECT,
  BADGE_PHOTO_DEFAULT_FILL,
  BADGE_PHOTO_OUTPUT,
  cropToBadgeJpeg,
  detectEdgeFill,
} from '@/lib/badge-photo';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

/**
 * Recuadro de recorte de tamaño FIJO (no depende del ancho del diálogo) para
 * que la silueta guía quede siempre encima, igual en todas las fotos: así el
 * rostro sale en la misma posición y tamaño en todas las credenciales.
 */
const CROP_HEIGHT = 280;
const CROP_WIDTH = Math.round(CROP_HEIGHT * BADGE_PHOTO_ASPECT);

/** Silueta guía (cabeza, línea de ojos y hombros) en coordenadas del recuadro. */
function FaceGuide() {
  const w = CROP_WIDTH;
  const h = CROP_HEIGHT;
  // Cabeza un poco arriba del centro (como en las fotos de la sesion y en las
  // credenciales): del 11 % al 61 % del alto, ojos al 34 %, hombros desde el 70 %.
  const headCx = w / 2;
  const headCy = h * 0.36;
  const headRx = w * 0.21;
  const headRy = h * 0.25;
  const eyesY = h * 0.34;
  const shoulders = `M ${w * 0.04} ${h} C ${w * 0.08} ${h * 0.78}, ${w * 0.34} ${h * 0.7}, ${w * 0.5} ${h * 0.7} C ${w * 0.66} ${h * 0.7}, ${w * 0.92} ${h * 0.78}, ${w * 0.96} ${h}`;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        fill="none"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth={2}
        strokeDasharray="7 5"
        style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.9))' }}
      >
        <ellipse cx={headCx} cy={headCy} rx={headRx} ry={headRy} />
        <line x1={headCx - headRx * 0.75} y1={eyesY} x2={headCx + headRx * 0.75} y2={eyesY} />
        <path d={shoulders} />
      </svg>
    </div>
  );
}

interface PhotoCropDialogProps {
  /** Archivo elegido; null = diálogo cerrado. */
  file: File | null;
  /** La subida va en curso (el padre la hace): se bloquean los botones. */
  uploading?: boolean;
  onCancel: () => void;
  /** Recibe el JPEG recortado; si lanza, el diálogo se queda abierto. */
  onConfirm: (cropped: File) => Promise<void>;
}

export function PhotoCropDialog({ file, uploading = false, onCancel, onConfirm }: PhotoCropDialogProps) {
  const src = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
  }, [src]);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [minZoom, setMinZoom] = useState(MIN_ZOOM);
  const [area, setArea] = useState<Area | null>(null);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [encoding, setEncoding] = useState(false);
  /**
   * Color del fondo de la foto (franja superior): con él se pinta lo que la
   * foto no cubra, aquí y en el JPEG que se guarda. Antes era blanco fijo y en
   * una foto con fondo gris quedaba una franja blanca arriba.
   */
  const [fill, setFill] = useState(BADGE_PHOTO_DEFAULT_FILL);

  // Cada archivo empieza centrado y sin acercar.
  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(MIN_ZOOM);
    setMinZoom(MIN_ZOOM);
    setArea(null);
    setNatural(null);
    setFill(BADGE_PHOTO_DEFAULT_FILL);
    if (!file) return;
    let vivo = true;
    detectEdgeFill(file)
      .then((color) => {
        if (vivo) setFill(color);
      })
      .catch(() => {
        // Sin muestra se queda el blanco; el recorte en sí lo reintenta.
      });
    return () => {
      vivo = false;
    };
  }, [file]);

  // La credencial se imprime a 372 × 406 px (300 dpi); si la parte elegida de la
  // foto trae menos pixeles que eso, se agranda y sale pixelada. Pasa cuando se
  // sube una copia reducida (WhatsApp, captura) en vez de la original.
  const lowRes =
    !!area && (area.width < BADGE_PHOTO_OUTPUT.width / 2 || area.height < BADGE_PHOTO_OUTPUT.height / 2);

  // El recuadro se sale de la foto (se bajó o se movió): lo que no cubra se
  // rellena con el color del fondo, y conviene decirlo porque sobre un fondo
  // claro el hueco casi no se distingue.
  const uncovered =
    !!area &&
    !!natural &&
    (area.x < -0.5 ||
      area.y < -0.5 ||
      area.x + area.width > natural.width + 0.5 ||
      area.y + area.height > natural.height + 0.5);

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  // El zoom minimo es el que cubre el recuadro; de ahi en adelante la foto se
  // puede mover libremente (restrictPosition=false): si el cabello viene pegado
  // al borde, se baja y el hueco que queda arriba sale blanco, como el fondo.
  const onMediaLoaded = useCallback((media: MediaSize) => {
    setNatural({ width: media.naturalWidth, height: media.naturalHeight });
    const cover = Math.max(CROP_WIDTH / media.width, CROP_HEIGHT / media.height);
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.ceil(cover * 100) / 100));
    setMinZoom(z);
    setZoom(z);
  }, []);

  const busy = uploading || encoding;

  const confirm = async () => {
    if (!file || !area || busy) return;
    setEncoding(true);
    try {
      const cropped = await cropToBadgeJpeg(file, area, fill);
      await onConfirm(cropped);
    } catch (err) {
      // Un error de red lo reporta el padre con su propio toast; aquí solo
      // los del recorte (archivo corrupto, navegador sin canvas).
      if (err instanceof Error && !('response' in err)) {
        toast.error(err.message || 'No se pudo procesar la foto');
      }
    } finally {
      setEncoding(false);
    }
  };

  return (
    <Dialog
      open={!!file}
      onOpenChange={(open) => {
        if (!open && !busy) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>Ajustar la foto</DialogTitle>
          <DialogDescription>
            Mueve la foto y acércala hasta que la cara llene la silueta y los ojos queden sobre la
            línea: así todas las credenciales salen con el rostro en el mismo lugar y tamaño. Si el
            cabello queda pegado al borde, baja la foto: el hueco que quede arriba se rellena con
            el color del fondo de la foto.
          </DialogDescription>
        </DialogHeader>

        {/* El mismo color de relleno que lleva el JPEG: lo que se ve es lo que se guarda. */}
        <div
          className="relative h-80 w-full overflow-hidden rounded-lg border"
          style={{ backgroundColor: fill }}
        >
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              minZoom={minZoom}
              maxZoom={MAX_ZOOM}
              aspect={BADGE_PHOTO_ASPECT}
              cropSize={{ width: CROP_WIDTH, height: CROP_HEIGHT }}
              cropShape="rect"
              showGrid={false}
              objectFit="contain"
              restrictPosition={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              onMediaLoaded={onMediaLoaded}
            />
          )}
          {src && <FaceGuide />}
        </div>

        <div className="flex items-center gap-3 px-1">
          <ZoomOut className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <Slider
            aria-label="Acercar la foto"
            min={minZoom}
            max={MAX_ZOOM}
            step={0.01}
            value={[zoom]}
            onValueChange={(v) => setZoom(v[0] ?? minZoom)}
            disabled={busy}
          />
          <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </div>

        <p className="text-xs text-muted-foreground">
          Se guarda solo el recorte, a la proporción de la credencial y reducido a JPEG. La foto
          original no se modifica.
          {natural ? ` Foto original: ${natural.width} × ${natural.height} px.` : ''}
        </p>
        {uncovered && (
          <p className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs text-muted-foreground">
            <span
              className="inline-block h-4 w-4 shrink-0 rounded border"
              style={{ backgroundColor: fill }}
              aria-hidden
            />
            La foto no cubre todo el recuadro: el hueco se rellena con el color del fondo de la
            foto. Si no quieres relleno, acércala o súbela un poco.
          </p>
        )}
        {lowRes && area && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            La parte elegida tiene solo {Math.round(area.width)} × {Math.round(area.height)} px y la
            credencial necesita al menos {BADGE_PHOTO_OUTPUT.width / 2} × {BADGE_PHOTO_OUTPUT.height / 2}:
            saldrá pixelada. Usa la foto original de la sesión (no una copia reducida) o acerca menos.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={() => void confirm()} disabled={!area || busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {uploading ? 'Subiendo…' : encoding ? 'Recortando…' : 'Guardar foto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
