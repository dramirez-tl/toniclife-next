'use client';

// EventCheckInTab - Entrada al evento el día de la función: número de boleto
// tecleado (o leído con pistola) o QR con la cámara del teléfono. Cada lectura
// llama POST /events/:id/check-in; el resultado se pinta en grande (verde /
// ámbar / rojo) y se lleva la lista de las últimas entradas de esta sesión.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  CameraIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  QrCodeIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCheckIn } from '@/hooks/useEvents';
import { eventErrorMessage, formatEventTimestamp } from '@/lib/events/format';
import { parseCheckInValue } from '@/lib/events/form';
import type { CheckInResultCode, CheckInResultDto, EventDto } from '@/types/events';
import { QrScanner } from './QrScanner';

/** Misma lectura repetida dentro de esta ventana se ignora (QR frente a la cámara). */
const DUPLICATE_WINDOW_MS = 3000;
const HISTORY_SIZE = 20;

interface HistoryEntry {
  id: number;
  at: Date;
  input: string;
  result: CheckInResultCode | 'error';
  message: string;
  ticketNumber: string | null;
  attendeeName: string | null;
}

type Tone = 'ok' | 'warn' | 'bad';

function toneOf(result: CheckInResultCode | 'error'): Tone {
  if (result === 'ok') return 'ok';
  if (result === 'already_used' || result === 'dry_run') return 'warn';
  return 'bad';
}

const TONE_CLASS: Record<Tone, string> = {
  ok: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  warn: 'border-amber-300 bg-amber-50 text-amber-900',
  bad: 'border-red-300 bg-red-50 text-red-900',
};

const TONE_DOT: Record<Tone, string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-red-500',
};

const RESULT_TITLE: Record<CheckInResultCode | 'error', string> = {
  ok: 'Entrada registrada',
  already_used: 'Este boleto ya ingresó',
  cancelled: 'Boleto cancelado',
  other_event: 'El boleto es de otro evento',
  not_found: 'Boleto no encontrado',
  dry_run: 'Boleto consultado',
  error: 'No se pudo registrar',
};

export function EventCheckInTab({ event }: { event: EventDto }) {
  const checkIn = useCheckIn();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [last, setLast] = useState<HistoryEntry | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [sessionCount, setSessionCount] = useState(0);

  const lastScanRef = useRef<{ text: string; at: number } | null>(null);
  const busyRef = useRef(false);
  const seqRef = useRef(0);

  // El foco vive en el campo: la pistola lectora teclea y manda Enter.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const pushEntry = useCallback((entry: HistoryEntry) => {
    setLast(entry);
    setHistory((h) => [entry, ...h].slice(0, HISTORY_SIZE));
  }, []);

  const process = useCallback(
    async (raw: string) => {
      const parsed = parseCheckInValue(raw, event.code);
      if (!parsed || busyRef.current) return;
      busyRef.current = true;
      const id = ++seqRef.current;
      try {
        const res: CheckInResultDto = await checkIn.mutateAsync({ id: event.id, input: parsed });
        const entry: HistoryEntry = {
          id,
          at: new Date(),
          input: raw.trim(),
          result: res.result,
          message: res.message ?? '',
          ticketNumber: res.ticket?.ticketNumber ?? parsed.ticketNumber ?? null,
          attendeeName: res.ticket?.attendeeName ?? null,
        };
        pushEntry(entry);
        if (res.checkedIn) {
          setSessionCount((n) => n + 1);
          try {
            navigator.vibrate?.(80);
          } catch {
            /* no todos los dispositivos vibran */
          }
        } else {
          try {
            navigator.vibrate?.([60, 60, 60]);
          } catch {
            /* idem */
          }
        }
      } catch (e) {
        pushEntry({
          id,
          at: new Date(),
          input: raw.trim(),
          result: 'error',
          message: eventErrorMessage(e, 'Revisa la conexión e intenta de nuevo.'),
          ticketNumber: parsed.ticketNumber ?? null,
          attendeeName: null,
        });
      } finally {
        busyRef.current = false;
      }
    },
    [checkIn, event.code, event.id, pushEntry],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = value;
    if (!raw.trim()) return;
    setValue('');
    await process(raw);
    inputRef.current?.focus();
  };

  const handleDecoded = useCallback(
    (text: string) => {
      const now = Date.now();
      const prev = lastScanRef.current;
      if (prev && prev.text === text && now - prev.at < DUPLICATE_WINDOW_MS) return;
      lastScanRef.current = { text, at: now };
      void process(text);
    },
    [process],
  );

  const stats = event.stats;
  const lastTone = last ? toneOf(last.result) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {/* Captura */}
        <Card>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-3">
              <label htmlFor="checkin-input" className="block text-sm font-medium text-gray-700">
                Número de boleto o QR
              </label>
              <div className="flex gap-2">
                <Input
                  id="checkin-input"
                  ref={inputRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={`${event.code}-00012, solo el número (12) o la liga del QR`}
                  className="h-14 flex-1 font-mono text-lg"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={checkIn.isPending}
                />
                <Button type="submit" size="lg" className="h-14 px-6" disabled={checkIn.isPending || !value.trim()}>
                  {checkIn.isPending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : 'Registrar'}
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                Enter registra la entrada. Con una pistola lectora basta con escanear el QR o el número.
              </p>
            </form>

            <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4">
              <Button
                type="button"
                variant={cameraOn ? 'default' : 'outline'}
                onClick={() => setCameraOn((v) => !v)}
              >
                <CameraIcon className="mr-2 h-5 w-5" />
                {cameraOn ? 'Apagar cámara' : 'Escanear con cámara'}
              </Button>
              <p className="text-xs text-gray-500">
                Usa la cámara del teléfono para leer el QR del boleto (requiere HTTPS).
              </p>
            </div>
            {cameraOn && <QrScanner onDecoded={handleDecoded} className="max-w-md" />}
          </CardContent>
        </Card>

        {/* Resultado */}
        {last && lastTone && (
          <div
            className={`rounded-2xl border-2 p-5 sm:p-6 ${TONE_CLASS[lastTone]}`}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-4">
              {lastTone === 'ok' ? (
                <CheckCircleIcon className="h-12 w-12 shrink-0" />
              ) : lastTone === 'warn' ? (
                <ExclamationTriangleIcon className="h-12 w-12 shrink-0" />
              ) : (
                <XCircleIcon className="h-12 w-12 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold leading-tight sm:text-3xl">{RESULT_TITLE[last.result]}</p>
                {last.attendeeName && (
                  <p className="mt-1 truncate text-xl font-semibold">{last.attendeeName}</p>
                )}
                <p className="mt-1 font-mono text-lg">
                  {last.ticketNumber ?? last.input}
                </p>
                {last.message && last.result !== 'ok' && (
                  <p className="mt-2 text-sm opacity-90">{last.message}</p>
                )}
                <p className="mt-2 text-xs opacity-70">
                  {last.at.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        )}
        {!last && (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center text-gray-400">
            <QrCodeIcon className="mx-auto mb-2 h-10 w-10" />
            <p className="text-sm">Aquí aparece el resultado de cada boleto.</p>
          </div>
        )}
      </div>

      {/* Contadores + historial */}
      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-3xl font-bold text-emerald-600">{stats.ticketsCheckedIn.toLocaleString('es-MX')}</p>
                <p className="text-xs uppercase tracking-wide text-gray-500">Ingresados</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-[#3E667D]">{stats.ticketsIssued.toLocaleString('es-MX')}</p>
                <p className="text-xs uppercase tracking-wide text-gray-500">Emitidos</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-700">{sessionCount.toLocaleString('es-MX')}</p>
                <p className="text-xs uppercase tracking-wide text-gray-500">En esta sesión</p>
              </div>
            </div>
            {stats.ticketsIssued > 0 && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(100, Math.round((stats.ticketsCheckedIn / stats.ticketsIssued) * 100))}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-semibold text-gray-800">Últimas entradas (esta sesión)</p>
            </div>
            {history.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">Todavía no hay lecturas.</p>
            ) : (
              <ul className="max-h-[520px] divide-y divide-gray-100 overflow-y-auto">
                {history.map((h) => {
                  const tone = toneOf(h.result);
                  return (
                    <li key={h.id} className="flex items-start gap-3 px-4 py-2.5">
                      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${TONE_DOT[tone]}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">
                          {h.attendeeName || h.ticketNumber || h.input}
                        </p>
                        <p className="truncate text-xs text-gray-500">
                          {h.ticketNumber && h.attendeeName ? `${h.ticketNumber} · ` : ''}
                          {RESULT_TITLE[h.result]}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-gray-400">
                        {h.at.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-gray-400">
          Contadores del evento al {formatEventTimestamp(event.updatedAt, event.timezone)}; se actualizan con cada entrada registrada.
        </p>
      </div>
    </div>
  );
}
