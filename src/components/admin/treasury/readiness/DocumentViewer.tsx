'use client';

// DocumentViewer — visor del documento en revisión: imagen con zoom/rotación
// o PDF en iframe, SIEMPRE desde la URL firmada (15 min) del endpoint con
// permiso (nunca /storage/file/*). Sin innerHTML; si la URL vence se vuelve a
// pedir con "Actualizar". "Abrir en pestaña" usa la misma URL firmada.

import { useEffect, useState } from 'react';
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ArrowsPointingOutIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DocumentUrlResult, PaymentDocumentKey } from '@/types/treasury-readiness';
import { formatDateTime } from '../treasury-format';
import { treasuryErrorMessage } from '../treasury-error';
import { DOCUMENT_LONG_LABELS } from './readiness-labels';

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

function isPdf(res: DocumentUrlResult | null): boolean {
  if (!res) return false;
  if (res.contentType) return res.contentType.toLowerCase().includes('pdf');
  return /\.pdf(\?|#|$)/i.test(res.url);
}

function isImage(res: DocumentUrlResult | null): boolean {
  if (!res) return false;
  if (res.contentType) return res.contentType.toLowerCase().startsWith('image/');
  return /\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(res.url);
}

interface DocumentViewerProps {
  document: PaymentDocumentKey | null;
  /** Resultado de la URL firmada para `document` (o null mientras carga / sin documento). */
  signed: DocumentUrlResult | null;
  isLoading: boolean;
  error: unknown;
  /** Estado del documento (para el mensaje "no subido"). */
  uploaded: boolean;
  onRefresh: () => void;
}

/** Cada documento/URL arranca en 100 % sin rotación: se remonta por `key` (sin resetear en useEffect). */
export function DocumentViewer(props: DocumentViewerProps) {
  return <DocumentViewerBody key={`${props.document ?? ''}|${props.signed?.url ?? ''}`} {...props} />;
}

function DocumentViewerBody({ document, signed, isLoading, error, uploaded, onRefresh }: DocumentViewerProps) {
  const [zoomIdx, setZoomIdx] = useState(2);
  const [rotation, setRotation] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);

  // Vencimiento sin Date.now() en render: un temporizador marca la URL vencida.
  const [expiredUrl, setExpiredUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!signed?.expiresAt) return;
    const t = new Date(signed.expiresAt).getTime();
    if (!Number.isFinite(t)) return;
    const url = signed.url;
    const delay = Math.max(0, t - Date.now());
    const timer = setTimeout(() => setExpiredUrl(url), delay);
    return () => clearTimeout(timer);
  }, [signed]);
  const expired = !!signed && expiredUrl === signed.url;

  const zoom = ZOOM_STEPS[zoomIdx];
  const title = document ? DOCUMENT_LONG_LABELS[document] : 'Documento';
  const pdf = isPdf(signed);
  const image = !pdf && (isImage(signed) || !!signed);

  return (
    <section
      className="flex h-full min-h-[320px] flex-col rounded-lg border border-border bg-muted/30"
      aria-label={`Visor: ${title}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
          {signed?.uploadedAt && (
            <p className="text-[11px] text-muted-foreground">Subido {formatDateTime(signed.uploadedAt)}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {image && signed && !imgFailed && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
                disabled={zoomIdx === 0}
                aria-label="Alejar"
                title="Alejar"
              >
                <MagnifyingGlassMinusIcon className="h-4 w-4" aria-hidden />
              </Button>
              <span className="w-12 text-center text-xs tabular-nums text-muted-foreground" aria-live="polite">
                {Math.round(zoom * 100)} %
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => setZoomIdx((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
                disabled={zoomIdx === ZOOM_STEPS.length - 1}
                aria-label="Acercar"
                title="Acercar"
              >
                <MagnifyingGlassPlusIcon className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                aria-label="Girar 90 grados"
                title="Girar"
              >
                <ArrowsPointingOutIcon className="h-4 w-4" aria-hidden />
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2"
            onClick={onRefresh}
            disabled={!document || !uploaded || isLoading}
            aria-label="Actualizar URL firmada"
            title="Actualizar (nueva URL firmada)"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden />
          </Button>
          {signed && !expired && (
            <Button type="button" variant="outline" size="sm" className="h-8" asChild>
              <a href={signed.url} target="_blank" rel="noopener noreferrer">
                <ArrowTopRightOnSquareIcon className="mr-1 h-4 w-4" aria-hidden />
                Abrir en pestaña
              </a>
            </Button>
          )}
        </div>
      </header>

      <div className="relative flex-1 overflow-auto p-3">
        {!document ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Elige un documento en la lista para verlo aquí.
          </p>
        ) : !uploaded ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            El distribuidor todavía no sube este documento.
          </p>
        ) : isLoading && !signed ? (
          <div className="flex h-full min-h-[240px] items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
            Obteniendo URL firmada…
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 p-6 text-center text-sm">
            <p className="text-destructive">
              {treasuryErrorMessage(error, 'No se pudo obtener la URL firmada del documento')}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
              Reintentar
            </Button>
          </div>
        ) : !signed ? null : expired ? (
          <div className="flex flex-col items-center gap-3 p-6 text-center text-sm">
            <p className="text-muted-foreground">La URL firmada venció (15 min).</p>
            <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
              Actualizar
            </Button>
          </div>
        ) : pdf ? (
          <iframe
            src={signed.url}
            title={title}
            className="h-[70vh] min-h-[420px] w-full rounded border border-border bg-white"
          />
        ) : imgFailed ? (
          // Sin extensión ni content-type: se intenta como PDF embebido.
          <iframe
            src={signed.url}
            title={title}
            className="h-[70vh] min-h-[420px] w-full rounded border border-border bg-white"
          />
        ) : (
          <div className="flex min-h-[240px] items-start justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- documento privado por URL firmada, sin optimización */}
            <img
              key={signed.url}
              src={signed.url}
              alt={title}
              onError={() => setImgFailed(true)}
              className="max-w-none rounded shadow-sm transition-transform"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'top center',
                maxWidth: zoom <= 1 ? '100%' : undefined,
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
