'use client';

// CompensationPlanParams — "Parámetros del plan de compensación" dentro de
// Actividad por Periodo (ficha del distribuidor en el admin, 31-oct-2026).
//
// Muestra, con el nombre que usa el motor, TODO lo que decide la calificación,
// el rango y lo que paga la comisión en el periodo: puntos personales (≥ 3,300),
// calificados de primer nivel, puntos de grupo sin tope y con tope por pierna
// (roll over), tope aplicado, piernas, kit de inicio, rango del periodo vs rango
// proyectado, la escalera completa con requisitos y los porcentajes por nivel y
// generación. Los números vienen de GET /customers/:id/network/rank-roadmap,
// que reusa las reglas canónicas del motor (commission-rules.lib). Solo lectura.

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowPathRoundedSquareIcon,
  BoltIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CubeIcon,
  ScaleIcon,
  TrophyIcon,
  UserGroupIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useCustomerRankRoadmap } from '@/hooks/useDistributorPeriodStats';
import type { RankRoadmapRankStep, RankRoadmapResponse } from '@/types/distributor';

interface Props {
  customerId: string;
  periodId: string | null;
}

function n(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString('es-MX');
}

function pct(value: number): string {
  return `${(value * 100).toLocaleString('es-MX', { maximumFractionDigits: 2 })} %`;
}

const KIT_LABEL: Record<string, string> = {
  basic: 'Básico',
  premium: 'Premium',
};

function Req({ met, text }: { met: boolean; text: string }) {
  return (
    <span className={`inline-flex items-center gap-1 ${met ? 'text-emerald-700' : 'text-gray-700'}`}>
      {met ? (
        <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
      ) : (
        <XCircleIcon className="h-3.5 w-3.5 text-gray-300" aria-hidden="true" />
      )}
      {text}
    </span>
  );
}

function ParamCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'default',
}: {
  icon: typeof BoltIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'good' | 'warn';
}) {
  const border =
    tone === 'good'
      ? 'border-emerald-200 bg-emerald-50/40'
      : tone === 'warn'
        ? 'border-amber-200 bg-amber-50/40'
        : 'border-gray-200 bg-white';
  return (
    <div className={`rounded-lg border p-3 ${border}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="h-4 w-4 text-[#3E667D]" aria-hidden="true" />
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</p>
      </div>
      <p className="text-base font-bold leading-tight text-gray-900">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-gray-500">{hint}</p> : null}
    </div>
  );
}

function stepState(step: RankRoadmapRankStep): { label: string; cls: string } {
  if (step.isCurrent) return { label: 'Rango del periodo', cls: 'bg-amber-50 text-amber-800 border-amber-200' };
  if (step.isAchieved) return { label: 'Alcanzado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (step.isNext) return { label: 'Siguiente', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
  return { label: `Cumple ${step.metCount}/3`, cls: 'bg-gray-100 text-gray-600 border-gray-200' };
}

export function CompensationPlanParams({ customerId, periodId }: Props) {
  const { data, isLoading, error } = useCustomerRankRoadmap(customerId, periodId);
  const [showLadder, setShowLadder] = useState(true);
  const [showLegs, setShowLegs] = useState(false);

  const topLegs = useMemo(
    () => (data ? [...data.legs].sort((a, b) => b.legVolume - a.legVolume).slice(0, 8) : []),
    [data],
  );

  if (!periodId) return null;

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-1">
        <ScaleIcon className="h-5 w-5 text-[#3E667D]" aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-700">
          Parámetros del plan de compensación
        </p>
      </div>
      <p className="mb-3 text-[11px] text-gray-500">
        Así decide el motor en cada periodo: calificas con <strong>puntos personales ≥ 3,300</strong>; el
        rango exige además <strong>calificados de 1er nivel</strong> (directos con ≥ 3,300) y{' '}
        <strong>puntos de grupo con tope por pierna</strong> (cada línea directa cuenta hasta el tope del
        rango ya alcanzado; lo que excede no cuenta = roll over). Sin kit premium la escalera se detiene en
        Distribuidor. La comisión se paga sobre el <strong>valor de negocio</strong> de la red, en los
        niveles y generaciones que da el rango.
      </p>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : error || !data ? (
        <p className="text-sm text-gray-400">No se pudieron cargar los parámetros del periodo.</p>
      ) : (
        <ParamsBody
          data={data}
          customerId={customerId}
          showLadder={showLadder}
          setShowLadder={setShowLadder}
          showLegs={showLegs}
          setShowLegs={setShowLegs}
          topLegs={topLegs}
        />
      )}
    </div>
  );
}

function ParamsBody({
  data,
  customerId,
  showLadder,
  setShowLadder,
  showLegs,
  setShowLegs,
  topLegs,
}: {
  data: RankRoadmapResponse;
  customerId: string;
  showLadder: boolean;
  setShowLadder: (v: boolean) => void;
  showLegs: boolean;
  setShowLegs: (v: boolean) => void;
  topLegs: RankRoadmapResponse['legs'];
}) {
  const cap = data.currentRank.rollOverLimit;
  const kit = data.kitType ? (KIT_LABEL[data.kitType] ?? data.kitType) : 'Sin kit';
  const projectedName = data.projectedRank?.name ?? 'Sin rango';
  const sameRank = (data.projectedRank?.rankNumber ?? 0) === (data.rankResolvedFromPeriod ? data.currentRank.rankNumber : 0);
  const achieved = data.ranks.find((r) => r.isCurrent) ?? null;
  const levels = data.levelCommissions ?? [];
  const generations = data.generationCommissions ?? [];

  return (
    <>
      {/* Valores del distribuidor con el nombre que usa el motor */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <ParamCard
          icon={TrophyIcon}
          label="Rango del periodo"
          value={data.rankResolvedFromPeriod ? data.currentRank.name : 'Sin rango'}
          hint={
            data.rankResolvedFromPeriod
              ? 'Asignado en la última corrida (cada 4 h y al cierre)'
              : 'Aún sin corrida con rango: se evalúa como Distribuidor'
          }
          tone={data.rankResolvedFromPeriod ? 'default' : 'warn'}
        />
        <ParamCard
          icon={TrophyIcon}
          label="Rango proyectado hoy"
          value={projectedName}
          hint={sameRank ? 'Coincide con el rango del periodo' : 'Lo que el motor asignaría con los números de ahora'}
          tone={sameRank ? 'good' : 'warn'}
        />
        <ParamCard
          icon={BoltIcon}
          label="Puntos personales"
          value={`${n(data.personalPoints)} / ${n(data.qualificationThreshold)}`}
          hint={data.isQualified ? 'Calificado' : `Faltan ${n(data.pointsToQualify)} para calificar`}
          tone={data.isQualified ? 'good' : 'warn'}
        />
        <ParamCard
          icon={CubeIcon}
          label="Kit de inicio"
          value={kit}
          hint={data.kitType === 'premium' ? 'Abre toda la escalera de rangos' : 'Sin premium: tope en Distribuidor'}
          tone={data.kitType === 'premium' ? 'good' : 'warn'}
        />
        <ParamCard
          icon={UserGroupIcon}
          label="Calificados de 1er nivel"
          value={`${n(data.qualifiedFirstLevel)} de ${n(data.directCount)} directos`}
          hint={
            data.nextRank
              ? `${data.nextRank.name} pide ${n(data.nextRank.qualifiers.required)}`
              : 'Directos con ≥ 3,300 puntos personales'
          }
        />
        <ParamCard
          icon={UserGroupIcon}
          label="Puntos de grupo (sin tope)"
          value={n(data.groupVolumeRaw)}
          hint="Suma de puntos personales de toda la red"
        />
        <ParamCard
          icon={ArrowPathRoundedSquareIcon}
          label="Puntos de grupo con tope (roll over)"
          value={n(data.groupCounted)}
          hint={cap > 0 ? `Tope por pierna ${n(cap)} (rango ${data.currentRank.name})` : 'Sin tope'}
        />
        <ParamCard
          icon={ArrowPathRoundedSquareIcon}
          label="Excedente que no cuenta"
          value={n(data.groupRolledOver)}
          hint={`${n(data.legs.filter((l) => l.atCap).length)} línea(s) al tope`}
        />
      </div>

      {/* Qué paga el rango alcanzado */}
      {achieved ? (
        <p className="mt-3 text-[11px] text-gray-600">
          Con rango <strong>{achieved.name}</strong> cobra{' '}
          <strong>{achieved.levelMax ?? 0} nivel{(achieved.levelMax ?? 0) === 1 ? '' : 'es'}</strong>
          {(achieved.generationMax ?? 0) > 0 ? (
            <>
              {' '}y <strong>{achieved.generationMax} generación{(achieved.generationMax ?? 0) === 1 ? '' : 'es'}</strong>
            </>
          ) : null}
          . Porcentajes por nivel:{' '}
          {levels.map((l, i) => (
            <span key={l.level}>
              {i > 0 ? ' · ' : ''}N{l.level} {pct(l.basePercentage)}
              {l.upgradedPercentage > 0
                ? ` (${pct(l.upgradedPercentage)} con ≥ ${l.qualifiersRequired} calificados de 1er nivel)`
                : ''}
            </span>
          ))}
          {generations.length > 0 ? (
            <>
              {' '}· por generación:{' '}
              {generations.map((g, i) => (
                <span key={g.generation}>
                  {i > 0 ? ' · ' : ''}G{g.generation} {pct(g.percentage)}
                </span>
              ))}
            </>
          ) : null}
          .
        </p>
      ) : null}

      {/* Escalera de rangos */}
      <button
        type="button"
        onClick={() => setShowLadder(!showLadder)}
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#3E667D] hover:underline"
      >
        {showLadder ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
        Escalera de rangos y requisitos
      </button>
      {showLadder ? (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-1.5 pr-2 font-medium">Rango</th>
                <th className="py-1.5 pr-2 font-medium">Puntos personales</th>
                <th className="py-1.5 pr-2 font-medium">Calificados 1er nivel</th>
                <th className="py-1.5 pr-2 font-medium">Puntos de grupo con tope</th>
                <th className="py-1.5 pr-2 font-medium">Tope por pierna</th>
                <th className="py-1.5 pr-2 font-medium">Paga</th>
                <th className="py-1.5 pr-2 font-medium">Kit</th>
                <th className="py-1.5 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.ranks.map((step) => {
                const st = stepState(step);
                return (
                  <tr key={step.id} className={`border-b border-gray-100 ${step.isCurrent ? 'bg-amber-50/40' : ''}`}>
                    <td className="py-1.5 pr-2 font-semibold text-gray-900">{step.name}</td>
                    <td className="py-1.5 pr-2">
                      <Req met={step.personal.met} text={`${n(step.personal.current)} / ${n(step.personal.required)}`} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <Req met={step.qualifiers.met} text={`${n(step.qualifiers.current)} / ${n(step.qualifiers.required)}`} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <Req met={step.group.met} text={`${n(step.group.current)} / ${n(step.group.required)}`} />
                    </td>
                    <td className="py-1.5 pr-2 text-gray-700">
                      {step.capApplied > 0 ? n(step.capApplied) : '—'}
                      {step.capApplied !== step.rollOverLimit ? (
                        <span className="text-gray-400"> → {n(step.rollOverLimit)} al subir</span>
                      ) : null}
                    </td>
                    <td className="py-1.5 pr-2 text-gray-700">
                      {step.levelMax ?? 0} niv.
                      {(step.generationMax ?? 0) > 0 ? ` + ${step.generationMax} gen.` : ''}
                    </td>
                    <td className="py-1.5 pr-2 text-gray-700">{step.rankNumber === 1 ? 'Cualquiera' : 'Premium'}</td>
                    <td className="py-1.5">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-1 text-[10px] text-gray-400">
            El requisito de grupo de cada peldaño se evalúa con el tope del rango anterior (el ya alcanzado);
            al subir, el tope por pierna crece al del rango nuevo. Mismo criterio que el motor y que pagaba el
            sistema anterior.
          </p>
        </div>
      ) : null}

      {/* Piernas (líneas directas) */}
      <button
        type="button"
        onClick={() => setShowLegs(!showLegs)}
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[#3E667D] hover:underline"
      >
        {showLegs ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
        Líneas directas ({n(data.directCount)}) y cuánto cuenta cada una
      </button>
      {showLegs ? (
        <div className="mt-2 overflow-x-auto">
          {topLegs.length === 0 ? (
            <p className="text-sm text-gray-400">Sin líneas directas.</p>
          ) : (
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-1.5 pr-2 font-medium">Directo</th>
                  <th className="py-1.5 pr-2 font-medium">Puntos personales</th>
                  <th className="py-1.5 pr-2 font-medium">Calificado</th>
                  <th className="py-1.5 pr-2 font-medium">Volumen de la pierna</th>
                  <th className="py-1.5 pr-2 font-medium">Cuenta (con tope)</th>
                  <th className="py-1.5 font-medium">No cuenta (roll over)</th>
                </tr>
              </thead>
              <tbody>
                {topLegs.map((l) => (
                  <tr key={l.memberId} className="border-b border-gray-100">
                    <td className="py-1.5 pr-2 text-gray-900">
                      <span className="font-mono text-gray-500">{l.customerNumber}</span> {l.name}
                    </td>
                    <td className="py-1.5 pr-2">{n(l.personalPoints)}</td>
                    <td className="py-1.5 pr-2">
                      <Req met={l.isQualified} text={l.isQualified ? 'Sí' : `Faltan ${n(l.pointsToQualify)}`} />
                    </td>
                    <td className="py-1.5 pr-2">{n(l.legVolume)}</td>
                    <td className="py-1.5 pr-2 font-semibold">{n(l.counted)}</td>
                    <td className="py-1.5">{n(l.rolledOver)}{l.atCap ? ' (al tope)' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-1 text-[10px] text-gray-400">
            Se muestran las {n(topLegs.length)} piernas de mayor volumen.{' '}
            <Link href={`/admin/distribuidores/${customerId}/red`} className="text-[#3E667D] hover:underline">
              Ver todas en Mi red
            </Link>
          </p>
        </div>
      ) : null}
    </>
  );
}
