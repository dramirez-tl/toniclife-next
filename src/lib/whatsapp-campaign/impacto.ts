// impacto.ts - Lógica PURA del "Impacto del periodo" (Comercial → WhatsApp).
// Sin React ni DOM: se prueba con vitest (impacto.test.ts).
//
// adaptarImpactoPeriodo() normaliza GET /whatsapp/campaigns/periods/:numero
// (snake_case, SPEC Recorridos §6) con el mismo criterio que adaptarDashboard:
// llave ausente = null / [], forma rara = null, basura = tablero vacío; nunca
// rompe la página. Las demás funciones arman los mosaicos, la tabla por
// recorrido y la gráfica por día con los formatos es-MX de numeros.ts.
//
// Sin margen (no hay costo de producto): venta atribuida, venta incremental
// contra el control y venta por peso gastado. Nunca "ganancias".

import type { EffectEstimate, ImpactoTipo, ReglaDecision } from '@/types/whatsappCampaign';
import type {
  ImpactoConsentimiento,
  ImpactoDia,
  ImpactoPeriodo,
  ImpactoPeriodoInfo,
  ImpactoRecorrido,
  ImpactoRecorridoResumen,
  ImpactoTotales,
} from '@/types/whatsappImpact';
import type { KpiTile } from './format';
import { isNum, money, n, pct, ratio, signed, toneEfecto, usd } from './numeros';
import { ordenCodigo } from './recorridos';
import { REGLAS_DECISION, estimacion } from './reportes';

// ── Utilería ───────────────────────────────────────────────────────────────

type Loose = Record<string, unknown>;
const isObj = (v: unknown): v is Loose => !!v && typeof v === 'object' && !Array.isArray(v);
const obj = (v: unknown): Loose => (isObj(v) ? v : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const num = (v: unknown): number | null => (isNum(v) ? v : null);
const strList = (v: unknown): string[] => arr(v).filter((x): x is string => typeof x === 'string');

const IMPACTO_TIPOS: readonly string[] = ['interino', 'preliminar', 'oficial'];
const DECISIONES: readonly string[] = ['funciono', 'hizo_dano', 'no_funciono', 'no_concluyente'];

// ── Adaptador ──────────────────────────────────────────────────────────────

function adaptarPeriodoInfo(raw: unknown): ImpactoPeriodoInfo {
  const p = obj(raw);
  return {
    numero: num(p.numero),
    nombre: str(p.nombre) ?? '',
    inicio: str(p.inicio) ?? '',
    fin: str(p.fin) ?? '',
    cerrado: p.cerrado === true,
  };
}

function adaptarTotales(raw: unknown): ImpactoTotales {
  const t = obj(raw);
  return {
    enviados: num(t.enviados),
    entregados: num(t.entregados),
    leidos: num(t.leidos),
    respondieron: num(t.respondieron),
    bajas: num(t.bajas),
    solo_cuenta: num(t.solo_cuenta),
    costo_usd: num(t.costo_usd),
    costo_mxn: num(t.costo_mxn),
    compraron_despues: num(t.compraron_despues),
    venta_atribuida_mxn: num(t.venta_atribuida_mxn),
    venta_incremental_mxn: estimacion(t.venta_incremental_mxn),
    venta_por_peso: estimacion(t.venta_por_peso),
  };
}

function adaptarRegla(raw: unknown): ReglaDecision | null {
  if (!isObj(raw)) return null;
  const r = str(raw.resultado);
  const resultado = r && DECISIONES.includes(r) ? (r as ReglaDecision['resultado']) : null;
  const texto = str(raw.texto);
  if (!resultado && !texto) return null;
  const reglas = strList(raw.reglas);
  return { resultado, texto, reglas: reglas.length ? reglas : [...REGLAS_DECISION] };
}

/** Resumen de impacto de un recorrido; null si no hay ninguna lectura. */
export function adaptarResumenImpacto(raw: unknown): ImpactoRecorridoResumen | null {
  if (!isObj(raw)) return null;
  const t = str(raw.tipo);
  const tipo = t && IMPACTO_TIPOS.includes(t) ? (t as ImpactoTipo) : null;
  const out: ImpactoRecorridoResumen = {
    tipo,
    veredicto: str(raw.veredicto),
    puntos: estimacion(raw.puntos),
    compra_pp: estimacion(raw.compra_pp),
    venta_incremental_mxn: estimacion(raw.venta_incremental_mxn),
    venta_por_peso: estimacion(raw.venta_por_peso),
    // Una lectura intermedia no decide nada.
    regla_decision: tipo === 'interino' ? null : adaptarRegla(raw.regla_decision),
  };
  return Object.values(out).every((x) => x == null) ? null : out;
}

/** Fila por recorrido; null si no trae clave ni código. */
export function adaptarRecorridoImpacto(raw: unknown): ImpactoRecorrido | null {
  if (!isObj(raw)) return null;
  const key = str(raw.key) ?? '';
  const codigo = str(raw.codigo) ?? '';
  if (!key && !codigo) return null;
  const categoria = raw.categoria;
  return {
    key: key || codigo,
    codigo: codigo || key,
    nombre: str(raw.nombre) ?? codigo ?? key,
    categoria: categoria === 'MARKETING' || categoria === 'UTILITY' ? categoria : null,
    plantilla: str(raw.plantilla),
    estado: str(raw.estado),
    tratados: num(raw.tratados),
    control: num(raw.control),
    enviados: num(raw.enviados),
    entregados: num(raw.entregados),
    leidos: num(raw.leidos),
    respondieron: num(raw.respondieron),
    bajas: num(raw.bajas),
    sin_whatsapp: num(raw.sin_whatsapp),
    tope_meta: num(raw.tope_meta),
    otros_fallos: num(raw.otros_fallos),
    costo_usd: num(raw.costo_usd),
    costo_mxn: num(raw.costo_mxn),
    compraron_despues: num(raw.compraron_despues),
    venta_atribuida_mxn: num(raw.venta_atribuida_mxn),
    impacto: adaptarResumenImpacto(raw.impacto),
    ultimo_envio_cdmx: str(raw.ultimo_envio_cdmx),
  };
}

function adaptarConsentimiento(raw: unknown): ImpactoConsentimiento | null {
  if (!isObj(raw)) return null;
  const g = obj(raw.ganados);
  return {
    opt_in_total: num(raw.opt_in_total),
    solo_cuenta_total: num(raw.solo_cuenta_total),
    baja_total: num(raw.baja_total),
    ganados: { todos: num(g.todos), solo_cuenta: num(g.solo_cuenta), nada: num(g.nada) },
  };
}

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

function adaptarDia(raw: unknown): ImpactoDia | null {
  if (!isObj(raw)) return null;
  const fecha = str(raw.fecha);
  if (!fecha || !FECHA_RE.test(fecha)) return null;
  return {
    fecha,
    enviados: num(raw.enviados) ?? 0,
    entregados: num(raw.entregados) ?? 0,
    leidos: num(raw.leidos) ?? 0,
    respuestas: num(raw.respuestas) ?? 0,
  };
}

/**
 * GET /whatsapp/campaigns/periods/:numero → ImpactoPeriodo completo. Los
 * recorridos quedan ordenados por código (J1…J12) y los días por fecha.
 */
export function adaptarImpactoPeriodo(raw: unknown): ImpactoPeriodo {
  const d = obj(raw);
  return {
    periodo: adaptarPeriodoInfo(d.periodo),
    generado_cdmx: str(d.generado_cdmx) ?? '',
    totales: adaptarTotales(d.totales),
    recorridos: arr(d.recorridos)
      .map(adaptarRecorridoImpacto)
      .filter((x): x is ImpactoRecorrido => !!x)
      .sort((a, b) => ordenCodigo(a.codigo) - ordenCodigo(b.codigo) || a.key.localeCompare(b.key)),
    consentimiento: adaptarConsentimiento(d.consentimiento),
    por_dia: arr(d.por_dia)
      .map(adaptarDia)
      .filter((x): x is ImpactoDia => !!x)
      .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    notas: strList(d.notas),
  };
}

// ── Bloques derivados ──────────────────────────────────────────────────────

/** Hay algo que pintar: algún mensaje enviado en el periodo. */
export function hayEnvios(imp: Pick<ImpactoPeriodo, 'totales' | 'recorridos'>): boolean {
  if ((imp.totales.enviados ?? 0) > 0) return true;
  return imp.recorridos.some((r) => (r.enviados ?? 0) > 0);
}

/** Fila 1: mensajes enviados · entregados · leídos · respuestas · bajas. */
export function kpisImpacto(imp: Pick<ImpactoPeriodo, 'totales' | 'recorridos'>): KpiTile[] {
  const t = imp.totales;
  const activos = imp.recorridos.filter((r) => (r.enviados ?? 0) > 0).length;
  return [
    {
      id: 'enviados',
      etiqueta: 'Mensajes enviados',
      valor: n(t.enviados),
      detalle: `${n(activos)} ${activos === 1 ? 'recorrido con envíos' : 'recorridos con envíos'}`,
    },
    {
      id: 'entregados',
      etiqueta: 'Entregados',
      valor: n(t.entregados),
      detalle: `${pct(ratio(t.entregados, t.enviados))} de los enviados`,
    },
    {
      id: 'leidos',
      etiqueta: 'Leídos',
      valor: n(t.leidos),
      detalle: `${pct(ratio(t.leidos, t.entregados))} de los entregados`,
    },
    {
      id: 'respuestas',
      etiqueta: 'Contestaron',
      valor: n(t.respondieron),
      detalle: 'en las 72 h siguientes al aviso',
    },
    {
      id: 'bajas',
      etiqueta: 'Pidieron baja',
      valor: n(t.bajas),
      detalle: `${pct(ratio(t.bajas, t.entregados), 1)} de los entregados · ${n(t.solo_cuenta)} solo avisos de cuenta`,
    },
  ];
}

/** Fila 2: costo · compraron después · venta atribuida · venta por peso. */
export function kpisDinero(imp: Pick<ImpactoPeriodo, 'totales'>): KpiTile[] {
  const t = imp.totales;
  const vpp = t.venta_por_peso;
  return [
    {
      id: 'costo',
      etiqueta: 'Costo de los mensajes',
      valor: money(t.costo_mxn),
      detalle: `${usd(t.costo_usd)} · por mensaje entregado (Meta), al tipo de cambio del periodo`,
    },
    {
      id: 'compraron',
      etiqueta: 'Compraron después',
      valor: n(t.compraron_despues),
      detalle: `${pct(ratio(t.compraron_despues, t.entregados), 1)} de quienes lo recibieron, en la ventana de atribución`,
    },
    {
      id: 'venta',
      etiqueta: 'Venta atribuida',
      valor: money(t.venta_atribuida_mxn),
      detalle: 'compras completadas después del aviso (describe, no demuestra)',
    },
    {
      id: 'venta_por_peso',
      etiqueta: 'Venta por peso gastado',
      // Es un cociente (pesos vendidos por cada peso gastado): con centavos,
      // si no '$1.37' se vería como '$1'.
      valor: vpp?.efecto != null ? `${money(vpp.efecto, { dec: 2 })} por $1` : '—',
      detalle: vpp ? `Intervalo 95%: ${icDinero(vpp, { dec: 2, signo: false })}` : 'Solo con grupo de control',
    },
  ];
}

/**
 * Intervalo en pesos con separador de miles: 'de -$3,000 a +$27,000'; con
 * `dec` conserva decimales y con `signo: false` omite el '+' ('de $0.60 a
 * $2.10'). '—' si falta un extremo.
 */
export function icDinero(
  e: Pick<EffectEstimate, 'ic_bajo' | 'ic_alto'> | null | undefined,
  opts: { dec?: number; signo?: boolean } = {},
): string {
  if (!e || !isNum(e.ic_bajo) || !isNum(e.ic_alto)) return '—';
  const fmt = { signo: opts.signo ?? true, dec: opts.dec ?? 0 };
  return `de ${money(e.ic_bajo, fmt)} a ${money(e.ic_alto, fmt)}`;
}

export interface FilaRecorrido extends ImpactoRecorrido {
  pct_entregados: number | null;
  pct_leidos: number | null;
  /** Venta incremental contra el control (del último reporte), si hay control. */
  efecto: EffectEstimate | null;
  efecto_texto: string;
  efecto_tono: 'bien' | 'mal' | 'neutro';
}

/** Tabla por recorrido (orden J1…J12) con porcentajes y efecto listos para pintar. */
export function filasRecorridos(imp: Pick<ImpactoPeriodo, 'recorridos'>): FilaRecorrido[] {
  return imp.recorridos.map((r) => {
    const efecto = r.impacto?.venta_incremental_mxn ?? null;
    const conControl = (r.control ?? 0) > 0;
    const efecto_texto = !conControl
      ? 'Sin control'
      : efecto?.efecto != null
        ? `${money(efecto.efecto, { signo: true })} (${icDinero(efecto)})`
        : 'Sin lectura';
    return {
      ...r,
      pct_entregados: ratio(r.entregados, r.enviados),
      pct_leidos: ratio(r.leidos, r.entregados),
      efecto,
      efecto_texto,
      efecto_tono: efecto ? toneEfecto(efecto.ic_bajo, efecto.ic_alto) : 'neutro',
    };
  });
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** 'YYYY-MM-DD' → '25 nov' (fecha civil, sin zona horaria). */
export function fechaCorta(ymd: string | null | undefined): string {
  const m = FECHA_RE.test(ymd ?? '') ? (ymd as string).split('-') : null;
  if (!m) return ymd ?? '—';
  return `${Number(m[2])} ${MESES_CORTOS[Number(m[1]) - 1] ?? m[1]}`;
}

export interface PuntoDia extends ImpactoDia {
  /** Etiqueta del eje: '25 nov'. */
  dia: string;
}

/** Serie por día para la gráfica (solo días con algún movimiento al inicio y al final). */
export function puntosPorDia(imp: Pick<ImpactoPeriodo, 'por_dia'>): PuntoDia[] {
  return imp.por_dia.map((d) => ({ ...d, dia: fechaCorta(d.fecha) }));
}

/** Texto del efecto total para el mosaico: '+$98,150' y su intervalo. */
export function efectoVentaTexto(e: EffectEstimate | null | undefined): { valor: string; detalle: string } {
  if (!e || e.efecto == null) return { valor: '—', detalle: 'Solo con grupo de control (recorridos de Marketing).' };
  return {
    valor: money(e.efecto, { signo: true }),
    detalle: `Intervalo 95%: ${icDinero(e)}${isNum(e.p) ? ` · p = ${e.p.toFixed(2)}` : ''}`,
  };
}

/** Cifras del bloque "Consentimientos" (etiquetas en llano). */
export function filasConsentimiento(c: ImpactoConsentimiento | null): Array<{ id: string; etiqueta: string; valor: string; detalle: string }> {
  if (!c) return [];
  return [
    {
      id: 'todos',
      etiqueta: 'Aceptan promociones',
      valor: n(c.opt_in_total),
      detalle: `${signed(c.ganados.todos, 0)} en el periodo`,
    },
    {
      id: 'solo_cuenta',
      etiqueta: 'Solo avisos de cuenta',
      valor: n(c.solo_cuenta_total),
      detalle: `${signed(c.ganados.solo_cuenta, 0)} en el periodo`,
    },
    {
      id: 'baja',
      etiqueta: 'Baja total',
      valor: n(c.baja_total),
      detalle: `${signed(c.ganados.nada, 0)} en el periodo`,
    },
  ];
}
