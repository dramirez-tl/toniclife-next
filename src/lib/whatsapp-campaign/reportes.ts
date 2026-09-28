// reportes.ts - Funciones PURAS de los bloques de reportes del tablero
// Comercial → WhatsApp (/admin/comercial/whatsapp): impacto extendido (regla
// de decisión del plan §6, retorno, CACE, subestratos, sensibilidades), ventas
// del cierre contra cierres anteriores, derrame ("¿pasaron la voz?") y
// campañas hijas (ola extra). Sin React ni DOM: se prueban con vitest.
//
// Los reportes son DATOS importados (whatsapp_campaign_reports): una llave que
// falta vale null/[]; una forma que no cuadra devuelve null y el panel pinta
// su estado vacío en vez de romper la página. Las cifras ya vienen calculadas
// y redondeadas por el API; aquí solo se formatean y se arman textos.

import type {
  CaceImpacto,
  CampaignImpacto,
  CampaignListItem,
  ComplementoItem,
  DecisionResultado,
  DerrameBlock,
  DerrameEstimate,
  DerrameFila,
  DerrameLid,
  DerrameLidConocido,
  DerramePoblacion,
  DerrameSucursalLado,
  DerrameSucursales,
  DerrameSucursalTotales,
  DerrameTabla,
  DerrameTiempo,
  DerrameTiempoLectura,
  DerrameTiempoPar,
  DerrameUnidad,
  DerrameVecindario,
  DerrameVecinosLado,
  DerrameVecinosUnicos,
  DerrameVeredicto,
  EffectEstimate,
  ImpactoTipo,
  ReglaDecision,
  RetornoCampana,
  SensibilidadImpacto,
  SubestratoImpacto,
  VentasCierreRow,
  VentasCierresBlock,
  VentasComparacion,
  VentasDiaCompleto,
  VentasDiaSemana,
  VentasMetrica,
  VentasOla,
  VentasParticipacion,
  VentasPeriodoRow,
  VentasPorHora,
  VentasSegBaseDiff,
  VentasSegBaseLado,
  VentasSegBaseRow,
  VentasSerieDia,
  VentasTPV,
  VentasVentana,
} from '@/types/whatsappCampaign';
import { VENTAS_METRICAS, VENTAS_VENTANAS } from '@/types/whatsappCampaign';
import type { BadgeTone } from './format';
import { isNum, money, n, signed } from './numeros';

// ── Utilería ───────────────────────────────────────────────────────────────

type Loose = Record<string, unknown>;
const obj = (v: unknown): Loose => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Loose) : {});
const isObj = (v: unknown): v is Loose => !!v && typeof v === 'object' && !Array.isArray(v);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const num = (v: unknown): number | null => (isNum(v) ? v : null);
const bool = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);
const strList = (v: unknown): string[] => arr(v).filter((x): x is string => typeof x === 'string');

// ── Estimaciones de efecto ─────────────────────────────────────────────────

/**
 * Estimación en cualquiera de las formas que producen los medidores:
 * {efecto, ic_bajo, ic_alto, p} (API), {efecto, ic95: [lo, hi], p_perm}
 * (reporte) o {est|dif, lo, hi} (ola extra). null si no trae ningún número.
 */
export function estimacion(raw: unknown): EffectEstimate | null {
  if (!isObj(raw)) return null;
  const ic = Array.isArray(raw.ic95) ? raw.ic95 : [];
  const efecto = num(raw.efecto) ?? num(raw.est) ?? num(raw.dif);
  const lo = num(raw.ic_bajo) ?? num(raw.lo) ?? num(ic[0]);
  const hi = num(raw.ic_alto) ?? num(raw.hi) ?? num(ic[1]);
  const p = num(raw.p) ?? num(raw.p_perm);
  if (efecto == null && lo == null && hi == null && p == null) return null;
  return { efecto, ic_bajo: lo, ic_alto: hi, p };
}

/** 'de -38 a +89 pts'; '—' si falta un extremo. */
export function icTexto(
  e: Pick<EffectEstimate, 'ic_bajo' | 'ic_alto'> | null | undefined,
  dec = 0,
  suf = '',
): string {
  if (!e || !isNum(e.ic_bajo) || !isNum(e.ic_alto)) return '—';
  return `de ${signed(e.ic_bajo, dec)} a ${signed(e.ic_alto, dec)}${suf}`;
}

/** 'p = 0.27'; '' si no hay p. */
export function pTexto(p: number | null | undefined): string {
  return isNum(p) ? `p = ${p.toFixed(2)}` : '';
}

// ── Regla de decisión (PLAN-MEDICION §6) ───────────────────────────────────

/** Efecto mínimo que importa (puntos por persona). */
export const EFECTO_MINIMO_RELEVANTE_PTS = 100;

/** Las cuatro reglas, en orden. Se usan si el reporte no trae las suyas. */
export const REGLAS_DECISION: readonly string[] = [
  'Si el límite inferior del intervalo (IC95) queda por encima de 0: "Funcionó". Se reportan el efecto, los puntos incrementales, la venta incremental y el retorno.',
  'Si el límite superior queda por debajo de 0: "Hizo daño". Hay que revisar bajas y calidad del número.',
  `Si el límite superior queda por debajo de ${EFECTO_MINIMO_RELEVANTE_PTS} puntos por persona (el efecto mínimo que importa): "No funcionó, o el efecto es demasiado chico para importar".`,
  'En cualquier otro caso (el intervalo incluye el 0): "No concluyente". Se reporta el MDE y se guarda el resultado para acumularlo con el siguiente cierre; no se dice que no funcionó.',
];

const DECISION_RESULTADOS: readonly DecisionResultado[] = ['funciono', 'hizo_dano', 'no_funciono', 'no_concluyente'];

/** Aplica la regla §6 al IC95 de puntos por persona (respaldo si el API no la manda). */
export function reglaDecision(
  icBajo: number | null | undefined,
  icAlto: number | null | undefined,
  minimo = EFECTO_MINIMO_RELEVANTE_PTS,
): DecisionResultado | null {
  if (!isNum(icBajo) || !isNum(icAlto)) return null;
  if (icBajo > 0) return 'funciono';
  if (icAlto < 0) return 'hizo_dano';
  if (icAlto < minimo) return 'no_funciono';
  return 'no_concluyente';
}

export interface ResultadoRegla {
  texto: string;
  variant: BadgeTone;
  /** Índice (0..3) de la regla que aplicó, para resaltarla en la lista; null si no hay. */
  indice: number | null;
  /** Qué sigue, en llano. */
  siguiente: string;
}

const RESULTADO_REGLA: Record<DecisionResultado, ResultadoRegla> = {
  funciono: {
    texto: 'Funcionó',
    variant: 'success',
    indice: 0,
    siguiente: 'Se reportan el efecto, los puntos incrementales, la venta incremental y el retorno.',
  },
  hizo_dano: {
    texto: 'Hizo daño',
    variant: 'destructive',
    indice: 1,
    siguiente: 'Revisar bajas, quejas y calidad del número antes de volver a escribir.',
  },
  no_funciono: {
    texto: 'No funcionó, o el efecto es demasiado chico',
    variant: 'warning',
    indice: 2,
    siguiente: 'El límite superior del intervalo queda por debajo del efecto mínimo que importa.',
  },
  no_concluyente: {
    texto: 'No concluyente',
    variant: 'info',
    indice: 3,
    siguiente:
      'No se puede decir que funcionó ni que no funcionó. El resultado se guarda para acumularlo con el siguiente cierre; con un control del 20% en dos cierres sí se podría medir un efecto de este tamaño.',
  },
};

/** Texto, tono e índice de la regla que aplicó ('Sin veredicto' si no hay). */
export function resultadoRegla(r: DecisionResultado | string | null | undefined): ResultadoRegla {
  if (r && (DECISION_RESULTADOS as readonly string[]).includes(r)) {
    return RESULTADO_REGLA[r as DecisionResultado];
  }
  return {
    texto: 'Sin veredicto',
    variant: 'outline',
    indice: null,
    siguiente: 'Todavía no hay una lectura que decida.',
  };
}

function adaptarRegla(raw: unknown): ReglaDecision | null {
  if (!isObj(raw)) return null;
  const r = str(raw.resultado);
  const resultado = r && (DECISION_RESULTADOS as readonly string[]).includes(r) ? (r as DecisionResultado) : null;
  const texto = str(raw.texto);
  if (!resultado && !texto) return null;
  const reglas = strList(raw.reglas);
  return { resultado, texto, reglas: reglas.length ? reglas : [...REGLAS_DECISION] };
}

// ── Impacto extendido ──────────────────────────────────────────────────────

const IMPACTO_TIPOS: readonly ImpactoTipo[] = ['interino', 'preliminar', 'oficial'];

export function adaptarRetorno(raw: unknown): RetornoCampana | null {
  if (!isObj(raw)) return null;
  const out: RetornoCampana = {
    venta_incremental_mxn: estimacion(raw.venta_incremental_mxn),
    venta_sin_recorte_mxn: estimacion(raw.venta_sin_recorte_mxn),
    pts_incrementales: estimacion(raw.pts_incrementales),
    costo_meta_mxn: num(raw.costo_meta_mxn),
    costo_lid_mxn: num(raw.costo_lid_mxn),
    costo_total_campana_mxn: num(raw.costo_total_campana_mxn),
    venta_por_peso: estimacion(raw.venta_por_peso),
    retorno: num(raw.retorno),
    nota: str(raw.nota),
  };
  return Object.values(out).every((x) => x == null) ? null : out;
}

function adaptarCace(raw: unknown): CaceImpacto | null {
  if (!isObj(raw)) return null;
  const e = estimacion(raw);
  const out: CaceImpacto = {
    pct_entregado: num(raw.pct_entregado),
    efecto: e?.efecto ?? null,
    ic_bajo: e?.ic_bajo ?? null,
    ic_alto: e?.ic_alto ?? null,
    efecto_leido: num(raw.efecto_leido),
  };
  return out.efecto == null && out.pct_entregado == null ? null : out;
}

function subestrato(raw: unknown): SubestratoImpacto | null {
  if (!isObj(raw)) return null;
  const sub = str(raw.sub) ?? str(raw.id);
  if (!sub) return null;
  return {
    sub,
    nt: num(raw.nt),
    nc: num(raw.nc),
    media_t: num(raw.media_t),
    media_c: num(raw.media_c),
    efecto: num(raw.efecto),
    ic_bajo: num(raw.ic_bajo),
    ic_alto: num(raw.ic_alto),
    ic_bonf_bajo: num(raw.ic_bonf_bajo),
    ic_bonf_alto: num(raw.ic_bonf_alto),
  };
}

function sensibilidad(raw: unknown): SensibilidadImpacto | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  if (!id) return null;
  const e = estimacion(raw);
  return {
    id,
    nombre: str(raw.nombre) ?? id,
    efecto: e?.efecto ?? null,
    ic_bajo: e?.ic_bajo ?? null,
    ic_alto: e?.ic_alto ?? null,
    p: e?.p ?? null,
  };
}

const mdeTexto = (v: unknown): string | null => (typeof v === 'string' ? v : isNum(v) ? String(v) : null);

/**
 * Bloque `impacto` (v1 o extendido) → CampaignImpacto completo. null si no
 * tiene forma de impacto (sin `tipo` válido). Una lectura intermedia nunca
 * trae regla de decisión; en las demás, si el API no la manda, se deriva del
 * IC95 de puntos.
 */
export function adaptarImpacto(raw: unknown): CampaignImpacto | null {
  if (!isObj(raw)) return null;
  const t = str(raw.tipo);
  if (!t || !(IMPACTO_TIPOS as readonly string[]).includes(t)) return null;
  const tipo = t as ImpactoTipo;
  const puntos = estimacion(raw.puntos);
  let regla = adaptarRegla(raw.regla_decision);
  if (!regla && tipo !== 'interino') {
    const resultado = reglaDecision(puntos?.ic_bajo, puntos?.ic_alto);
    regla = resultado ? { resultado, texto: null, reglas: [...REGLAS_DECISION] } : null;
  }
  return {
    tipo,
    corte: str(raw.corte),
    puntos,
    calificacion_pp: estimacion(raw.calificacion_pp),
    compra_pp: estimacion(raw.compra_pp),
    veredicto: str(raw.veredicto),
    mde_pts: mdeTexto(raw.mde_pts),
    mde_pp: mdeTexto(raw.mde_pp),
    lectura: str(raw.lectura),
    regla_decision: tipo === 'interino' ? null : regla,
    retorno: adaptarRetorno(raw.retorno),
    cace: adaptarCace(raw.cace),
    por_subestrato: arr(raw.por_subestrato).map(subestrato).filter((x): x is SubestratoImpacto => !!x),
    sensibilidades: arr(raw.sensibilidades).map(sensibilidad).filter((x): x is SensibilidadImpacto => !!x),
    venta_confiable: bool(raw.venta_confiable),
  };
}

// ── Deltas en porcentaje (ya vienen en puntos de %) ────────────────────────

export interface DeltaPct {
  texto: string;
  tono: 'bien' | 'mal' | 'neutro';
}

/** 4.3 → '+4.3%' (bien); -3.4 → '-3.4%' (mal); 0 → '0.0%'; null → '—'. */
export function deltaPct(v: number | null | undefined, dec = 1): DeltaPct {
  if (!isNum(v)) return { texto: '—', tono: 'neutro' };
  return { texto: `${signed(v, dec)}%`, tono: v > 0 ? 'bien' : v < 0 ? 'mal' : 'neutro' };
}

// ── Ventas del cierre contra cierres anteriores ────────────────────────────

function tpv(raw: unknown): VentasTPV | null {
  if (!isObj(raw)) return null;
  const out = { tickets: num(raw.tickets), pts: num(raw.pts), venta: num(raw.venta) };
  return out.tickets == null && out.pts == null && out.venta == null ? null : out;
}

const tpvLista = (raw: unknown): VentasTPV[] =>
  arr(raw).map((x) => tpv(x) ?? { tickets: null, pts: null, venta: null });

function serieDia(raw: unknown): VentasSerieDia | null {
  if (!isObj(raw)) return null;
  return { fecha: str(raw.fecha), dia: str(raw.dia), serie: tpvLista(raw.serie) };
}

function porHora(raw: unknown): VentasPorHora | null {
  if (!isObj(raw)) return null;
  return {
    horas: strList(raw.horas),
    hoy: tpvLista(raw.hoy),
    promedio_cierres: tpvLista(raw.promedio_cierres),
    ayer: serieDia(raw.ayer),
    viernes_anterior: serieDia(raw.viernes_anterior),
  };
}

function cierreRow(raw: unknown): VentasCierreRow | null {
  if (!isObj(raw)) return null;
  const nn = num(raw.n);
  const fecha = str(raw.fecha);
  if (nn == null && !fecha) return null;
  return { n: nn, nombre: str(raw.nombre), fecha, dia: str(raw.dia), al_corte: tpv(raw.al_corte), total_dia: tpv(raw.total_dia) };
}

function diaSemana(raw: unknown): VentasDiaSemana | null {
  if (!isObj(raw)) return null;
  const t = tpv(raw);
  return {
    fecha: str(raw.fecha),
    dia: str(raw.dia),
    es_hoy: raw.es_hoy === true,
    tickets: t?.tickets ?? null,
    pts: t?.pts ?? null,
    venta: t?.venta ?? null,
  };
}

function ventasOla(raw: unknown): VentasOla | null {
  if (!isObj(raw)) return null;
  const id = str(raw.ola) ?? str(raw.id);
  if (!id) return null;
  return { ola: id, desde: str(raw.desde), hasta: str(raw.hasta), n: num(raw.n) };
}

function comparacion(raw: unknown): VentasComparacion | null {
  if (!isObj(raw)) return null;
  return {
    actual: num(raw.actual),
    mediana_prev: num(raw.mediana_prev),
    media_prev: num(raw.media_prev),
    min_prev: num(raw.min_prev),
    max_prev: num(raw.max_prev),
    rango_de_7: num(raw.rango_de_7),
    vs_mediana_pct: num(raw.vs_mediana_pct),
    vs_media_pct: num(raw.vs_media_pct),
  };
}

function participacion(raw: unknown): Record<VentasMetrica, VentasParticipacion | null> | null {
  if (!isObj(raw)) return null;
  const uno = (x: unknown): VentasParticipacion | null =>
    isObj(x) ? { dia_cierre_pct: num(x.dia_cierre_pct), ult5_pct: num(x.ult5_pct) } : null;
  return { tickets: uno(raw.tickets), pts: uno(raw.pts), venta: uno(raw.venta) };
}

function periodoRow(raw: unknown): VentasPeriodoRow | null {
  if (!isObj(raw)) return null;
  const nn = num(raw.n);
  if (nn == null) return null;
  return {
    n: nn,
    nombre: str(raw.nombre),
    ini: str(raw.ini),
    fin: str(raw.fin),
    dow_cierre: str(raw.dow_cierre),
    es_actual: raw.es_actual === true,
    dia_cierre: tpv(raw.dia_cierre),
    ult2: tpv(raw.ult2),
    ult5: tpv(raw.ult5),
    previos4: tpv(raw.previos4),
    periodo: tpv(raw.periodo),
    compradores: num(raw.compradores),
    compradores_dia_cierre: num(raw.compradores_dia_cierre),
    calificados: num(raw.calificados),
    pct_calif_de_con_puntos: num(raw.pct_calif_de_con_puntos),
    participacion: participacion(raw.participacion),
  };
}

function diaCompleto(raw: unknown): VentasDiaCompleto | null {
  if (!isObj(raw)) return null;
  const comps = obj(raw.comparaciones);
  const comparaciones: VentasDiaCompleto['comparaciones'] = {};
  for (const w of VENTAS_VENTANAS) {
    const bloque = comps[w];
    if (!isObj(bloque)) continue;
    comparaciones[w] = {
      tickets: comparacion(bloque.tickets),
      pts: comparacion(bloque.pts),
      venta: comparacion(bloque.venta),
    };
  }
  const periodos = arr(raw.periodos)
    .map(periodoRow)
    .filter((x): x is VentasPeriodoRow => !!x)
    .sort((a, b) => (a.n ?? 0) - (b.n ?? 0));
  if (!periodos.length && !Object.keys(comparaciones).length) return null;
  return { actual: num(raw.actual), comparaciones, periodos };
}

function segLado(raw: unknown): VentasSegBaseLado | null {
  if (!isObj(raw)) return null;
  return {
    n: num(raw.n),
    pct_califica: num(raw.pct_califica),
    pct_compra: num(raw.pct_compra),
    dpts_media: num(raw.dpts_media),
    venta_mxn_media: num(raw.venta_mxn_media),
  };
}

function segDiff(raw: unknown): VentasSegBaseDiff | null {
  if (!isObj(raw)) return null;
  return { trat_vs_base: num(raw.trat_vs_base), ctrl_vs_base: num(raw.ctrl_vs_base), trat_vs_ctrl: num(raw.trat_vs_ctrl) };
}

function segBaseRow(raw: unknown): VentasSegBaseRow | null {
  if (!isObj(raw)) return null;
  const id = str(raw.id);
  if (!id) return null;
  return {
    id,
    tratados: segLado(raw.tratados),
    control: segLado(raw.control),
    base_pct_califica: num(raw.base_pct_califica),
    base_pct_compra: num(raw.base_pct_compra),
    base_dpts_media: num(raw.base_dpts_media),
    califica_pp: segDiff(raw.califica_pp),
    compra_pp: segDiff(raw.compra_pp),
  };
}

function segmentosVsBase(raw: unknown): VentasCierresBlock['segmentos_vs_base'] {
  if (!isObj(raw)) return null;
  const segmentos = arr(raw.segmentos).map(segBaseRow).filter((x): x is VentasSegBaseRow => !!x);
  const total = segBaseRow(raw.total);
  return segmentos.length || total ? { segmentos, total } : null;
}

/**
 * Bloque `ventas_cierres` del API → VentasCierresBlock. null si no trae ni
 * "hoy al corte", ni cierres anteriores, ni el día completo (no hay nada que
 * pintar).
 */
export function adaptarVentasCierres(raw: unknown): VentasCierresBlock | null {
  if (!isObj(raw)) return null;
  const hoy = obj(raw.hoy);
  const alCorte = tpv(hoy.al_corte);
  const cierres = arr(raw.cierres).map(cierreRow).filter((x): x is VentasCierreRow => !!x);
  const dc = diaCompleto(raw.dia_completo);
  if (!alCorte && !cierres.length && !dc) return null;
  return {
    version: num(raw.version) ?? 1,
    lectura: str(raw.lectura),
    fuente: str(raw.fuente),
    generado_cdmx: str(raw.generado_cdmx),
    corte_hoy: str(raw.corte_hoy),
    hoy: { fecha: str(hoy.fecha), dia: str(hoy.dia), al_corte: alCorte },
    mediana_al_corte: tpv(raw.mediana_al_corte),
    media_al_corte: tpv(raw.media_al_corte),
    hoy_vs_mediana_pct: tpv(raw.hoy_vs_mediana_pct),
    hoy_vs_media_pct: tpv(raw.hoy_vs_media_pct),
    cierres,
    semana: arr(raw.semana).map(diaSemana).filter((x): x is VentasDiaSemana => !!x),
    por_hora: porHora(raw.por_hora),
    olas: arr(raw.olas).map(ventasOla).filter((x): x is VentasOla => !!x),
    dia_completo: dc,
    segmentos_vs_base: segmentosVsBase(raw.segmentos_vs_base),
    notas: strList(raw.notas),
  };
}

/** 'YYYY-MM-DD HH:MM[:SS]' → 'HH:MM'; 'HH:MM' se respeta; '—' si no hay. */
export function horaDe(s: string | null | undefined): string {
  const m = /(?:^|\s|T)(\d{2}:\d{2})/.exec(s ?? '');
  return m ? m[1] : '—';
}

/** 'AGOSTO 2026' → 'Agosto' (sin año, con mayúscula inicial). */
export function tituloCierre(nombre: string | null | undefined): string {
  const s = String(nombre ?? '')
    .replace(/\s*\d{4}$/, '')
    .trim()
    .toLowerCase();
  if (!s) return '—';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Tickets acumulados por hora; null después de `hastaHora` (índice de la hora en curso). */
export function acumularTickets(serie: VentasTPV[] | null | undefined, hastaHora: number): (number | null)[] {
  let acc = 0;
  return (serie ?? []).map((x, i) => {
    acc += x?.tickets ?? 0;
    return i <= hastaHora ? acc : null;
  });
}

export interface PuntoCurva {
  /** Hora decimal (7 = 07:00). Cada punto es el acumulado al FINAL de esa hora. */
  x: number;
  hoy: number | null;
  promedio: number | null;
  viernes: number | null;
}

export interface CurvaTickets {
  puntos: PuntoCurva[];
  olas: { id: string; x: number; etiqueta: string }[];
  ultimo: { x: number; y: number } | null;
  corte: string;
  hCorte: number;
  viernesDia: string | null;
  h0: number;
  h1: number;
}

export const etiquetaOla = (ola: string): string =>
  ola === 'felicitacion' ? 'Felicitación' : ola === 'extra' ? 'Ola extra' : `Ola ${ola}`;

/**
 * Datos de la gráfica "Tickets acumulados en el día": hoy (hasta el corte,
 * con el último punto a la hora exacta del corte), promedio de cierres
 * anteriores y viernes anterior, entre h0 y h1; más las marcas de los envíos
 * de hoy. null si no hay serie por hora.
 */
export function curvaTickets(v: VentasCierresBlock | null | undefined, h0 = 7, h1 = 21): CurvaTickets | null {
  const ph = v?.por_hora;
  if (!v || !ph || !ph.hoy.length) return null;
  const corte = horaDe(v.corte_hoy);
  const hh = parseInt(corte.slice(0, 2), 10);
  const hCorte = Number.isFinite(hh) ? hh : 23;
  const mCorte = parseInt(corte.slice(3, 5), 10) || 0;
  const hoy = acumularTickets(ph.hoy, hCorte);
  const prom = acumularTickets(ph.promedio_cierres, 23);
  const vie = ph.viernes_anterior ? acumularTickets(ph.viernes_anterior.serie, 23) : null;
  const puntos: PuntoCurva[] = [];
  for (let k = h0 - 1; k < h1; k++) {
    const x = k + 1;
    const enCurso = k === hCorte;
    const hoyK = k < hCorte || (enCurso && mCorte === 0) ? (hoy[k] ?? null) : null;
    puntos.push({ x, hoy: hoyK, promedio: prom[k] ?? null, viernes: vie ? (vie[k] ?? null) : null });
    if (enCurso && mCorte > 0) {
      const xc = hCorte + mCorte / 60;
      if (xc >= h0 && xc <= h1 && hoy[k] != null) {
        puntos.push({ x: xc, hoy: hoy[k], promedio: null, viernes: null });
      }
    }
  }
  puntos.sort((a, b) => a.x - b.x);
  const hoyYmd = v.hoy.fecha;
  const olas = v.olas
    .map((o) => {
      if (!o.desde || !hoyYmd || o.desde.slice(0, 10) !== hoyYmd) return null;
      const x = parseInt(o.desde.slice(11, 13), 10) + (parseInt(o.desde.slice(14, 16), 10) || 0) / 60;
      if (!Number.isFinite(x) || x < h0 || x > h1) return null;
      return { id: o.ola, x, etiqueta: etiquetaOla(o.ola) };
    })
    .filter((x): x is { id: string; x: number; etiqueta: string } => !!x);
  let ultimo: CurvaTickets['ultimo'] = null;
  for (const p of puntos) if (p.hoy != null) ultimo = { x: p.x, y: p.hoy };
  return { puntos, olas, ultimo, corte, hCorte, viernesDia: ph.viernes_anterior?.dia ?? null, h0, h1 };
}

export const VENTANA_LABELS: Record<VentasVentana, string> = {
  dia_cierre: 'Día del cierre',
  ult2: 'Últimos 2 días',
  ult5: 'Últimos 5 días',
  previos4: '4 días previos al cierre',
  periodo: 'Periodo completo',
};

export const METRICA_LABELS: Record<VentasMetrica, string> = {
  tickets: 'Tickets',
  pts: 'Puntos',
  venta: 'Venta',
};

/** Tickets y puntos como enteros; venta en pesos. */
export function formatoMetrica(m: VentasMetrica, v: number | null | undefined): string {
  return m === 'venta' ? money(v) : n(v);
}

/** '4.º de 7'; '—' si no hay rango. */
export function rangoTexto(r: number | null | undefined, de = 7): string {
  return isNum(r) ? `${Math.round(r)}.º de ${de}` : '—';
}

export interface ComparacionResumen {
  ventana: VentasVentana;
  ventanaNombre: string;
  metrica: VentasMetrica;
  metricaNombre: string;
  actual: string;
  mediana: string;
  delta: DeltaPct;
  rango: string;
}

/** Filas "actual vs mediana de cierres anteriores" por ventana × métrica. */
export function comparacionesResumen(
  dc: VentasDiaCompleto | null | undefined,
  ventanas: readonly VentasVentana[] = ['dia_cierre', 'periodo'],
): ComparacionResumen[] {
  if (!dc) return [];
  const out: ComparacionResumen[] = [];
  for (const w of ventanas) {
    const bloque = dc.comparaciones[w];
    if (!bloque) continue;
    for (const m of VENTAS_METRICAS) {
      const c = bloque[m];
      if (!c) continue;
      out.push({
        ventana: w,
        ventanaNombre: VENTANA_LABELS[w],
        metrica: m,
        metricaNombre: METRICA_LABELS[m],
        actual: formatoMetrica(m, c.actual),
        mediana: formatoMetrica(m, c.mediana_prev),
        delta: deltaPct(c.vs_mediana_pct),
        rango: rangoTexto(c.rango_de_7),
      });
    }
  }
  return out;
}

// ── Derrame: "¿pasaron la voz?" ────────────────────────────────────────────

export interface VeredictoDerrameInfo {
  texto: string;
  variant: BadgeTone;
  tono: 'bien' | 'mal' | 'neutro';
}

const VEREDICTOS_DERRAME: readonly DerrameVeredicto[] = ['DERRAME_POSITIVO', 'DERRAME_NEGATIVO', 'NO_CONCLUYENTE', 'SIN_DATOS'];

const VEREDICTO_DERRAME: Record<DerrameVeredicto, VeredictoDerrameInfo> = {
  DERRAME_POSITIVO: { texto: 'Sí pasaron la voz', variant: 'success', tono: 'bien' },
  DERRAME_NEGATIVO: { texto: 'Derrame negativo', variant: 'destructive', tono: 'mal' },
  NO_CONCLUYENTE: { texto: 'No concluyente', variant: 'info', tono: 'neutro' },
  SIN_DATOS: { texto: 'Sin datos', variant: 'outline', tono: 'neutro' },
};

/** 'NO_CONCLUYENTE' | 'no concluyente' → DerrameVeredicto (desconocido = SIN_DATOS). */
export function claveVeredictoDerrame(v: unknown): DerrameVeredicto {
  const s = String(v ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]+/g, '_');
  return (VEREDICTOS_DERRAME as readonly string[]).includes(s) ? (s as DerrameVeredicto) : 'SIN_DATOS';
}

/** Texto y tono del veredicto de derrame. */
export function veredictoDerrame(v: DerrameVeredicto | string | null | undefined): VeredictoDerrameInfo {
  return VEREDICTO_DERRAME[claveVeredictoDerrame(v)];
}

export const VECINDARIO_LABELS: Record<DerrameVecindario, { nombre: string; ayuda: string }> = {
  frontales: { nombre: 'Sus frontales (nivel 1)', ayuda: 'La gente que patrocina directamente la persona con mensaje.' },
  nivel2: { nombre: 'Segundo nivel', ayuda: 'Los frontales de sus frontales.' },
  patrocinador: { nombre: 'Su patrocinador (1 arriba)', ayuda: 'Quien patrocina a la persona con mensaje.' },
  union: { nombre: 'Los tres juntos', ayuda: 'Frontales, segundo nivel y patrocinador, sin repetir.' },
};

export const UNIDAD_LABELS: Record<DerrameUnidad, string> = {
  suma_por_indice: 'Por persona con mensaje',
  por_vecino: 'Por vecino',
};

export const POBLACION_LABELS: Record<DerramePoblacion, string> = {
  principal: 'Campaña principal',
  extra: 'Ola extra',
};

export const nombreVecindario = (f: Pick<DerrameFila, 'vecindario' | 'nombre'>): string =>
  VECINDARIO_LABELS[f.vecindario as DerrameVecindario]?.nombre ?? f.nombre;

function derrameEstimate(raw: unknown): DerrameEstimate | null {
  const e = estimacion(raw);
  if (!e || !isObj(raw)) return null;
  return { ...e, media_t: num(raw.media_t), media_c: num(raw.media_c), mde: num(raw.mde), n_t: num(raw.n_t), n_c: num(raw.n_c) };
}

function derrameFila(raw: unknown): DerrameFila | null {
  if (!isObj(raw)) return null;
  const vecindario = str(raw.vecindario);
  if (!vecindario) return null;
  return {
    vecindario,
    nombre: str(raw.nombre) ?? vecindario,
    n_t: num(raw.n_t),
    n_c: num(raw.n_c),
    con_vecinos_t: num(raw.con_vecinos_t),
    con_vecinos_c: num(raw.con_vecinos_c),
    vecinos_t: num(raw.vecinos_t),
    vecinos_c: num(raw.vecinos_c),
    pts: derrameEstimate(raw.pts),
    compraron: derrameEstimate(raw.compraron),
    cruzaron: derrameEstimate(raw.cruzaron),
    venta: derrameEstimate(raw.venta),
    pts_sin_cuped: derrameEstimate(raw.pts_sin_cuped),
    pts_sin_recorte: derrameEstimate(raw.pts_sin_recorte),
  };
}

const derrameFilas = (raw: unknown): DerrameFila[] =>
  arr(raw).map(derrameFila).filter((x): x is DerrameFila => !!x);

function derrameTabla(raw: unknown): DerrameTabla | null {
  if (!isObj(raw)) return null;
  const poblacion = str(raw.poblacion);
  const unidad = str(raw.unidad);
  if (!poblacion || !unidad) return null;
  return { poblacion, unidad, filas: derrameFilas(raw.filas) };
}

function lidConocido(raw: unknown): DerrameLidConocido | null {
  if (!isObj(raw)) return null;
  const e = estimacion(raw);
  return {
    fuente: str(raw.fuente),
    metrica: str(raw.metrica),
    efecto: e?.efecto ?? null,
    ic_bajo: e?.ic_bajo ?? null,
    ic_alto: e?.ic_alto ?? null,
    p: e?.p ?? null,
    n_t: num(raw.n_t),
    n_c: num(raw.n_c),
    frontales_calif: estimacion(raw.frontales_calif),
  };
}

function derrameLid(raw: unknown): DerrameLid | null {
  if (!isObj(raw)) return null;
  return {
    conocido: lidConocido(raw.conocido),
    sin_mensaje: derrameFilas(raw.sin_mensaje),
    con_lid_7_estratos: derrameFilas(raw.con_lid_7_estratos),
  };
}

function vecinosLado(raw: unknown): DerrameVecinosLado | null {
  if (!isObj(raw)) return null;
  const pi = isObj(raw.por_indice) ? raw.por_indice : null;
  return {
    vecinos: num(raw.vecinos),
    dpts: num(raw.dpts),
    compraron: num(raw.compraron),
    cruzaron: num(raw.cruzaron),
    venta: num(raw.venta),
    por_indice: pi ? { vecinos: num(pi.vecinos), dpts: num(pi.dpts), compraron: num(pi.compraron), venta: num(pi.venta) } : null,
  };
}

function vecinosUnicos(raw: unknown): Record<string, DerrameVecinosUnicos> {
  const out: Record<string, DerrameVecinosUnicos> = {};
  if (!isObj(raw)) return out;
  for (const [k, x] of Object.entries(raw)) {
    if (!isObj(x)) continue;
    out[k] = {
      unicos_t: num(x.unicos_t),
      unicos_c: num(x.unicos_c),
      en_ambos_grupos: num(x.en_ambos_grupos),
      con_mas_de_un_indice: num(x.con_mas_de_un_indice),
      solo_t: vecinosLado(x.solo_t),
      solo_c: vecinosLado(x.solo_c),
    };
  }
  return out;
}

const TIEMPO_KEYS: (keyof DerrameTiempo)[] = [
  'indices',
  'con_lectura',
  'vecinos',
  'docs_antes',
  'docs_despues',
  'pts_antes',
  'pts_despues',
  'tasa_docs_h_antes',
  'tasa_docs_h_despues',
  'share_pts_despues',
  'vecinos_compraron_despues',
  'docs_24h',
  'horas_antes_media',
];

function tiempo(raw: unknown): DerrameTiempo | null {
  if (!isObj(raw)) return null;
  const out = {} as DerrameTiempo;
  for (const k of TIEMPO_KEYS) out[k] = num(raw[k]);
  return out;
}

function tiempoPar(raw: unknown): DerrameTiempoPar | null {
  if (!isObj(raw)) return null;
  return { tratados: tiempo(raw.tratados), control_lectura_ficticia: tiempo(raw.control_lectura_ficticia) };
}

function tiempoLectura(raw: unknown): DerrameTiempoLectura | null {
  if (!isObj(raw)) return null;
  return { principal: tiempoPar(raw.principal), extra: tiempoPar(raw.extra), nota: str(raw.nota) };
}

function sucursalLado(raw: unknown): DerrameSucursalLado | null {
  return isObj(raw) ? { compradores: num(raw.compradores), pts: num(raw.pts), tickets: num(raw.tickets) } : null;
}

function sucursalTotales(raw: unknown): DerrameSucursalTotales | null {
  if (!isObj(raw)) return null;
  const ven = strList(raw.ventana);
  return { ventana: ven.length >= 2 ? [ven[0], ven[1]] : null, sin_msg: sucursalLado(raw.sin_msg), con_msg: sucursalLado(raw.con_msg) };
}

function derrameSucursales(raw: unknown): DerrameSucursales | null {
  if (!isObj(raw)) return null;
  const totales: Record<string, DerrameSucursalTotales> = {};
  for (const [k, x] of Object.entries(obj(raw.totales))) {
    const t = sucursalTotales(x);
    if (t) totales[k] = t;
  }
  return {
    totales,
    corr_tratados_vs_cambio: num(raw.corr_tratados_vs_cambio),
    sucursales_con_datos: num(raw.sucursales_con_datos),
    nota: str(raw.nota),
  };
}

/**
 * Bloque `derrame` del API → DerrameBlock. null si no trae `tablas` y
 * `veredicto` (no tiene forma de lectura de derrame).
 */
export function adaptarDerrame(raw: unknown): DerrameBlock | null {
  if (!isObj(raw)) return null;
  if (raw.tipo != null && raw.tipo !== 'derrame') return null;
  if (!Array.isArray(raw.tablas) || typeof raw.veredicto !== 'string') return null;
  return {
    version: num(raw.version) ?? 1,
    tipo: 'derrame',
    lectura: str(raw.lectura),
    campana: str(raw.campana),
    corte: str(raw.corte),
    t0_cdmx: str(raw.t0_cdmx),
    t0_extra_cdmx: str(raw.t0_extra_cdmx),
    generado_cdmx: str(raw.generado_cdmx),
    fuente_red: str(raw.fuente_red),
    excluidos_con_mensaje: num(raw.excluidos_con_mensaje),
    veredicto: claveVeredictoDerrame(raw.veredicto),
    veredicto_texto: str(raw.veredicto_texto),
    mde_pts: num(raw.mde_pts),
    tablas: raw.tablas.map(derrameTabla).filter((x): x is DerrameTabla => !!x),
    lid: derrameLid(raw.lid),
    vecinos_unicos: vecinosUnicos(raw.vecinos_unicos),
    tiempo_lectura: tiempoLectura(raw.tiempo_lectura),
    sucursales: derrameSucursales(raw.sucursales),
    notas: strList(raw.notas),
  };
}

/** Poblaciones con tabla, en orden de aparición (principal, extra). */
export function poblacionesDerrame(d: DerrameBlock | null | undefined): DerramePoblacion[] {
  const out: DerramePoblacion[] = [];
  for (const t of d?.tablas ?? []) {
    const p = t.poblacion as DerramePoblacion;
    if ((p === 'principal' || p === 'extra') && !out.includes(p)) out.push(p);
  }
  return out;
}

/** Tabla de una población y unidad; null si no existe. */
export function tablaDerrame(
  d: DerrameBlock | null | undefined,
  poblacion: DerramePoblacion | string,
  unidad: DerrameUnidad | string,
): DerrameTabla | null {
  return d?.tablas.find((t) => t.poblacion === poblacion && t.unidad === unidad) ?? null;
}

/** La fila que decide el veredicto: campaña principal, suma por persona, frontales. */
export function filaPrincipalDerrame(d: DerrameBlock | null | undefined): DerrameFila | null {
  return tablaDerrame(d, 'principal', 'suma_por_indice')?.filas.find((f) => f.vecindario === 'frontales') ?? null;
}

// ── Campañas hijas (ola extra) ─────────────────────────────────────────────

export function adaptarComplementos(raw: unknown): ComplementoItem[] {
  return arr(raw)
    .map((x): ComplementoItem | null => {
      if (!isObj(x)) return null;
      const key = str(x.key);
      if (!key) return null;
      return {
        key,
        nombre: str(x.nombre) ?? key,
        t0_cdmx: str(x.t0_cdmx) ?? '',
        tratados: num(x.tratados) ?? 0,
        control: num(x.control) ?? 0,
      };
    })
    .filter((x): x is ComplementoItem => !!x);
}

/** Campañas principales (sin padre); las hijas se abren por enlace. */
export const campanasPrincipales = (list: readonly CampaignListItem[]): CampaignListItem[] =>
  list.filter((c) => c.padre == null);

export const esCampanaHija = (list: readonly CampaignListItem[], key: string | null | undefined): boolean =>
  !!key && !!list.find((c) => c.key === key)?.padre;

/**
 * Opciones del selector: las principales y, si la seleccionada es una hija
 * (abierta por enlace), también ella, para que el selector la muestre.
 */
export function opcionesSelector(
  list: readonly CampaignListItem[],
  seleccionada: string | null | undefined,
): CampaignListItem[] {
  const out = campanasPrincipales(list);
  const hija = seleccionada ? list.find((c) => c.key === seleccionada && c.padre != null) : null;
  return hija ? [...out, hija] : out;
}
