'use client';

// MI TARJETA DE RUTA (IMPULSA · Victoria 1), la misma de la tarjeta impresa pero viva: cada casilla
// se marca y se queda guardada, y Comercial y el Patrocinador ven el avance. Los textos vienen del
// API (son los aprobados). Los renglones de los Días 2 a 6 se usan como en papel: una casilla cada
// vez que lo hago; tocar una vacía suma una y tocar una marcada la quita.

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CheckCircleIcon, MinusIcon, PlusIcon, StarIcon } from '@heroicons/react/24/solid';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useImpulsaAddActivity,
  useImpulsaSetCheck,
  useImpulsaSetCommitment,
  useImpulsaSetNextAction,
} from '@/hooks/useImpulsa';
import { boxClickDelta, counterBoxes } from '@/lib/impulsa';
import { cn } from '@/lib/utils';
import type { ImpulsaCard, ImpulsaCardCheck, ImpulsaCardCounter } from '@/types/impulsa';

interface ImpulsaRouteCardProps {
  /** Victoria a la que pertenece la tarjeta (hoy, la 1). */
  victoryNumber: number;
  card: ImpulsaCard;
  /** false = el avance todavía no se guarda (la tarjeta se ve, pero no se puede marcar). */
  ready: boolean;
}

function CheckRow({
  check,
  disabled,
  onToggle,
  prefix,
}: {
  check: ImpulsaCardCheck;
  disabled: boolean;
  onToggle: (key: string, checked: boolean) => void;
  prefix?: string;
}) {
  const id = `impulsa-${check.key}`;
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={id}
        checked={check.checked}
        disabled={disabled}
        onCheckedChange={(value) => onToggle(check.key, value === true)}
        className="mt-0.5 size-5 rounded-md"
      />
      <Label htmlFor={id} className={cn('text-sm font-normal leading-snug', check.checked && 'text-muted-foreground')}>
        {prefix ? <span className="mr-2 font-semibold text-primary">{prefix}</span> : null}
        {check.label}
      </Label>
    </div>
  );
}

function CounterRow({
  counter,
  disabled,
  onChange,
}: {
  counter: ImpulsaCardCounter;
  disabled: boolean;
  onChange: (metric: ImpulsaCardCounter['metric'], delta: 1 | -1) => void;
}) {
  const t = useTranslations('distributor.impulsa.card');
  const { boxes, extra } = counterBoxes(counter.total, counter.boxes);
  return (
    <div className="flex flex-col gap-2 border-t border-border py-3 first:border-t-0 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <p className="text-sm text-foreground">{counter.label}</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold tabular-nums text-foreground">{counter.total}</span>
          {counter.today > 0 ? ` · ${t('todayCount', { count: counter.today })}` : ''}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          disabled={disabled || counter.total === 0}
          onClick={() => onChange(counter.metric, -1)}
          aria-label={t('remove', { label: counter.label })}
        >
          <MinusIcon className="h-4 w-4" />
        </Button>
        <div className="flex flex-wrap gap-1">
          {boxes.map((marked, index) => (
            <button
              key={index}
              type="button"
              disabled={disabled}
              onClick={() => onChange(counter.metric, boxClickDelta(index, counter.total))}
              aria-label={t('box', { label: counter.label, index: index + 1 })}
              aria-pressed={marked}
              className={cn(
                'grid size-7 place-content-center rounded-md border text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                marked
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background hover:border-primary/60',
              )}
            >
              {marked ? '✓' : ''}
            </button>
          ))}
        </div>
        {extra > 0 && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {t('extra', { count: extra })}
          </span>
        )}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          disabled={disabled}
          onClick={() => onChange(counter.metric, 1)}
          aria-label={t('add', { label: counter.label })}
        >
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/** Día 7: la fecha y la nota de la siguiente acción. Guarda con su botón. */
function NextActionForm({
  savedDate,
  savedNote,
  ready,
  busy,
  onSave,
}: {
  savedDate: string | null;
  savedNote: string | null;
  ready: boolean;
  busy: boolean;
  onSave: (date: string | null, note: string | null) => void;
}) {
  const t = useTranslations('distributor.impulsa.card');
  const [date, setDate] = useState(savedDate ?? '');
  const [note, setNote] = useState(savedNote ?? '');
  const changed = date !== (savedDate ?? '') || note.trim() !== (savedNote ?? '');
  return (
    <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-[180px_1fr_auto] sm:items-end">
      <div>
        <Label htmlFor="impulsa-next-date" className="text-xs text-muted-foreground">
          {t('nextActionTitle')} · {t('nextActionDate')}
        </Label>
        <Input
          id="impulsa-next-date"
          type="date"
          value={date}
          disabled={!ready}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="impulsa-next-note" className="text-xs text-muted-foreground">
          {t('nextActionNote')}
        </Label>
        <Input
          id="impulsa-next-note"
          value={note}
          maxLength={200}
          disabled={!ready}
          placeholder={t('nextActionPlaceholder')}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1"
        />
      </div>
      <Button type="button" disabled={busy || !changed} onClick={() => onSave(date || null, note.trim() || null)}>
        {t('save')}
      </Button>
    </div>
  );
}

export function ImpulsaRouteCard({ victoryNumber, card, ready }: ImpulsaRouteCardProps) {
  const t = useTranslations('distributor.impulsa.card');
  const setCheck = useImpulsaSetCheck(victoryNumber);
  const addActivity = useImpulsaAddActivity(victoryNumber);
  const setNextAction = useImpulsaSetNextAction(victoryNumber);
  const setCommitment = useImpulsaSetCommitment(victoryNumber);
  const busy = setCheck.isPending || addActivity.isPending || setNextAction.isPending || setCommitment.isPending;
  const disabled = !ready || busy;

  const onError = () => toast.error(t('saveError'));
  const toggle = (key: string, checked: boolean) => setCheck.mutate({ key, checked }, { onError });
  const change = (metric: ImpulsaCardCounter['metric'], delta: 1 | -1) => addActivity.mutate({ metric, delta }, { onError });

  const day0 = card.checks.filter((c) => c.section === 'day0');
  const session = card.checks.filter((c) => c.section === 'session');
  const day7 = card.checks.filter((c) => c.section === 'day7');
  const { summary } = card;
  const accepted = card.commitment.acceptedAt !== null;

  return (
    <Card id="tarjeta-de-ruta" className="overflow-hidden scroll-mt-24 py-0" data-testid="impulsa-route-card">
      <CardContent className="p-0">
        <div className="bg-impulsa-blue px-6 py-5 text-white">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">{card.title}</h2>
              <p className="mt-1 text-sm text-white/90">{card.subtitle}</p>
            </div>
            <div className="w-full max-w-[220px]">
              <p className="mb-1 text-right text-xs font-semibold text-white">
                {t('progress', { done: summary.checksDone, total: summary.checksTotal })}
              </p>
              <div
                className="h-2 w-full overflow-hidden rounded-full bg-white/20"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={summary.percent}
                aria-label={card.title}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-impulsa-yellow to-impulsa-orange transition-all"
                  style={{ width: `${summary.percent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {!ready && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
              {t('notReady')}
            </p>
          )}
          {summary.victoryCompleted && (
            <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
              <CheckCircleIcon className="h-5 w-5 text-emerald-600" aria-hidden />
              {t('completed')}
            </p>
          )}

          {/* Día 0 */}
          <section className="rounded-xl border border-border p-4">
            {day0.map((check) => (
              <CheckRow key={check.key} check={check} disabled={disabled} onToggle={toggle} prefix={t('day0')} />
            ))}
          </section>

          {/* Día 1 (máximo Día 2): Sesión de Arranque */}
          <section className="rounded-xl border-2 border-impulsa-blue/40 p-4">
            <h3 className="text-base font-bold text-foreground">
              {card.sessionTitle} <span className="text-sm font-normal text-muted-foreground">· {card.sessionNote}</span>
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {session.map((check) => (
                <CheckRow key={check.key} check={check} disabled={disabled} onToggle={toggle} />
              ))}
            </div>
          </section>

          {/* Días 2 a 6: lo de todos los días */}
          <section className="rounded-xl border border-border bg-muted/30 p-4">
            <h3 className="text-base font-bold text-foreground">{card.dailyTitle}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{card.dailyNote}</p>
            <div className="mt-2">
              {card.counters.map((counter) => (
                <CounterRow key={counter.metric} counter={counter} disabled={disabled} onChange={change} />
              ))}
            </div>
          </section>

          {/* Día 7 */}
          <section className="space-y-4 rounded-xl border border-border p-4">
            {day7.map((check) => (
              <CheckRow key={check.key} check={check} disabled={disabled} onToggle={toggle} prefix={t('day7')} />
            ))}
            {/* La llave reinicia el formulario cuando cambia lo guardado (al guardar o desde otro equipo). */}
            <NextActionForm
              key={`${card.nextAction.date ?? ''}|${card.nextAction.note ?? ''}`}
              savedDate={card.nextAction.date}
              savedNote={card.nextAction.note}
              ready={ready}
              busy={disabled}
              onSave={(date, note) =>
                setNextAction.mutate({ date, note }, { onError, onSuccess: () => toast.success(t('saved')) })
              }
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{t('commitmentTitle')}</p>
                <p className="text-sm text-muted-foreground">{card.commitment.text}</p>
              </div>
              <Button
                type="button"
                variant={accepted ? 'outline' : 'default'}
                disabled={disabled}
                onClick={() => setCommitment.mutate(!accepted, { onError })}
                aria-pressed={accepted}
              >
                {accepted ? (
                  <>
                    <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
                    {t('commitmentAccepted')}
                  </>
                ) : (
                  t('commitmentAccept')
                )}
              </Button>
            </div>
          </section>

          {/* Mi meta de arranque */}
          <section className="flex items-start gap-3 rounded-xl border border-impulsa-yellow bg-impulsa-yellow/15 p-4">
            <StarIcon className="mt-0.5 h-7 w-7 shrink-0 text-impulsa-orange" aria-hidden />
            <div>
              <p className="text-base font-bold text-impulsa-blue">{card.goalTitle}</p>
              <p className="text-sm text-foreground/90">{card.goalText}</p>
            </div>
          </section>

          {/* Resultado al Día 7 */}
          <section>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('resultsTitle')}</h3>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {card.day7Results.map((result) => (
                <li key={result.label} className="flex items-start gap-2 text-sm">
                  <CheckCircleIcon
                    className={cn('mt-0.5 h-4 w-4 shrink-0', result.done ? 'text-emerald-600' : 'text-muted-foreground/40')}
                    aria-hidden
                  />
                  <span className={result.done ? 'text-foreground' : 'text-muted-foreground'}>{result.label}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
