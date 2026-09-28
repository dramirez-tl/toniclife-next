// format.ts - Funciones PURAS del tablero Comercial → WhatsApp
// (/admin/comercial/whatsapp). Sin React ni DOM: se prueban con vitest.
//
// Las cifras y horas vienen ya calculadas por el API (JSON v2, horas en CDMX);
// aquí solo se formatean, se validan y se arman textos. La única hora que se
// calcula en el front es la cuenta regresiva del chip de cierre
// (chipCierre), contra `periodo.fin` de tonic.commission_periods.
// Los bloques de reportes (impacto extendido, ventas del cierre, derrame y
// campañas hijas) viven en reportes.ts; los números en numeros.ts.

import {
  CAMPAIGN_GROUPS,
  CAMPAIGN_MEMBER_FILTERS,
  type AttributionFields,
  type CampaignDashboard,
  type CampaignEvidence,
  type CampaignGroup,
  type CampaignMember,
  type CampaignMemberFilter,
  type CampaignOla,
  type ImpactoTipo,
  type OlaEstado,
} from '@/types/whatsappCampaign';
import { clamp01, isNum, n, pct, ratio } from './numeros';
import { adaptarComplementos, adaptarDerrame, adaptarImpacto, adaptarVentasCierres } from './reportes';

export type BadgeTone =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'info'
  | 'warning';

/** Color del grupo de control (el de la campaña es var(--chart-1)). */
export const CONTROL_COLOR = '#C0862C';
export const TRATADO_COLOR = 'var(--chart-1)';

export const WHATSAPP_ADMIN_PATH = '/admin/comercial/whatsapp';

// ── Números (es-MX) ────────────────────────────────────────────────────────
// Viven en numeros.ts (sin ciclos con reportes.ts); se reexportan aquí para
// que los componentes sigan importando todo de format.ts.

export { clamp01, money, moneyCorto, n, pct, ratio, signed, toneEfecto } from './numeros';

// ── Tonos ──────────────────────────────────────────────────────────────────

export interface OlaTone {
  texto: string;
  variant: BadgeTone;
  pulso: boolean;
}

export function toneOla(estado: OlaEstado | string): OlaTone {
  if (estado === 'enviada') return { texto: 'Enviada', variant: 'success', pulso: false };
  if (estado === 'en curso') return { texto: 'En curso', variant: 'warning', pulso: true };
  return { texto: 'Programada', variant: 'outline', pulso: false };
}

export type CategoriaTone = 'alerta' | 'accion' | 'normal';

const CATEGORIAS_ALERTA: ReadonlySet<string> = new Set(['baja', 'numero_equivocado', 'molesto']);
const CATEGORIAS_ACCION: ReadonlySet<string> = new Set(['pregunta', 'confusion', 'audio', 'saludo']);

/** alerta = no volver a escribir (rojo); accion = hay que contestar (ámbar). */
export function toneCategoria(id: string | null | undefined): CategoriaTone {
  if (!id) return 'normal';
  if (CATEGORIAS_ALERTA.has(id)) return 'alerta';
  if (CATEGORIAS_ACCION.has(id)) return 'accion';
  return 'normal';
}

/**
 * Clase extra para las insignias: la variante `success` del Badge compartido
 * (texto blanco sobre verde claro) no tiene contraste suficiente; aquí se
 * oscurece el texto sin tocar el componente compartido.
 */
export function badgeContraste(variant: BadgeTone | string | null | undefined): string | undefined {
  return variant === 'success'
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
    : undefined;
}

export function badgeImpacto(tipo: ImpactoTipo | string | null | undefined): {
  texto: string;
  variant: BadgeTone;
} {
  if (tipo === 'interino') return { texto: 'Lectura intermedia', variant: 'info' };
  if (tipo === 'preliminar') return { texto: 'Resultado preliminar', variant: 'warning' };
  if (tipo === 'oficial') return { texto: 'Resultado oficial', variant: 'success' };
  return { texto: 'Medición', variant: 'info' };
}

// ── Olas ───────────────────────────────────────────────────────────────────

export type TramoId = 'leidos' | 'entregados' | 'pendientes' | 'sin_whatsapp' | 'limite' | 'otros';

export interface TramoOla {
  id: TramoId;
  etiqueta: string;
  n: number;
  /** Fracción de `intentos` (0..1). */
  frac: number;
}

export const TRAMO_ETIQUETAS: Record<TramoId, string> = {
  leidos: 'Leídos',
  entregados: 'Entregados sin leer',
  pendientes: 'En camino',
  sin_whatsapp: 'Sin WhatsApp',
  limite: 'Límite de envíos de WhatsApp',
  otros: 'Otros fallos',
};

/**
 * Tramos de la barra apilada de una ola, en orden. Una ola programada (sin
 * intentos) no tiene tramos. LANZA si las piezas no suman `intentos`: sería
 * un error de cálculo del API y la barra mentiría.
 */
export function tramosOla(ola: CampaignOla): TramoOla[] {
  if (ola.intentos == null) return [];
  const leidos = ola.leidos ?? 0;
  const recibidos = ola.recibidos ?? 0;
  const piezas: Array<[TramoId, number]> = [
    ['leidos', leidos],
    ['entregados', recibidos - leidos],
    ['pendientes', ola.pendientes ?? 0],
    ['sin_whatsapp', ola.sin_whatsapp ?? 0],
    ['limite', (ola.tope_meta ?? 0) + (ola.experimento_meta ?? 0)],
    ['otros', ola.otros_fallos ?? 0],
  ];
  if (piezas.some(([, v]) => v < 0)) {
    throw new Error(`Ola ${ola.id}: hay un tramo negativo (leídos > recibidos)`);
  }
  const suma = piezas.reduce((acc, [, v]) => acc + v, 0);
  if (suma !== ola.intentos) {
    throw new Error(`Ola ${ola.id}: los tramos suman ${suma} y los intentos son ${ola.intentos}`);
  }
  const tot = ola.intentos || 1;
  return piezas.map(([id, v]) => ({ id, etiqueta: TRAMO_ETIQUETAS[id], n: v, frac: v / tot }));
}

/** Versión que no lanza (para pintar): null si la ola no cuadra. */
export function tramosOlaSeguro(ola: CampaignOla): TramoOla[] | null {
  try {
    return tramosOla(ola);
  } catch {
    return null;
  }
}

export const hayOlaEnCurso = (olas: CampaignOla[] | null | undefined): boolean =>
  (olas ?? []).some((o) => o.estado === 'en curso');

// ── Chip de cierre del periodo (26→25) ─────────────────────────────────────

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** 'YYYY-MM-DD' → '25 de septiembre' (fecha civil, sin zona horaria). */
export function fechaLarga(ymd: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd ?? '');
  if (!m) return ymd ?? '—';
  return `${Number(m[3])} de ${MESES[Number(m[2]) - 1] ?? m[2]}`;
}

export interface ChipCierre {
  texto: string;
  tono: BadgeTone;
}

/**
 * Chip del encabezado. El fin es el de tonic.commission_periods (P74 termina
 * el 26-oct porque se recorre a día hábil): nunca se calcula a mano.
 * `ahoraMs` se inyecta para poder probarlo.
 */
export function chipCierre(
  periodo: { nombre: string; fin: string; cerrado?: boolean } | null | undefined,
  ahoraMs: number,
): ChipCierre | null {
  if (!periodo?.fin) return null;
  if (periodo.cerrado) return { texto: `Periodo ${periodo.nombre} cerrado`, tono: 'outline' };
  const fin = Date.parse(`${periodo.fin}T23:59:59-06:00`);
  if (!Number.isFinite(fin)) return null;
  const ms = fin - ahoraMs;
  if (ms <= 0) return { texto: `Periodo ${periodo.nombre} cerrado`, tono: 'outline' };
  const h = Math.floor(ms / 3_600_000);
  if (h < 24) {
    return {
      texto: `Hoy cierra ${periodo.nombre} · ${h < 1 ? 'queda menos de 1 h' : `quedan ${h} h`}`,
      tono: 'warning',
    };
  }
  return { texto: `${periodo.nombre} cierra el ${fechaLarga(periodo.fin)}`, tono: 'info' };
}

// ── Filtros de la pestaña Personas ─────────────────────────────────────────

export const FILTRO_LABELS: Record<CampaignMemberFilter, string> = {
  leyeron_compraron: 'Leyeron y después compraron',
  leyeron_calificaron: 'Leyeron y después calificaron',
  leyeron_mismo_dia_sin_hora: 'Leyeron, compra el mismo día sin hora',
  leyeron_no_compraron: 'Leyeron y no han comprado',
  recibieron_calificaron: 'Recibieron y ya calificaron',
  compraron_sin_leer: 'Compraron sin leer',
  no_recibieron: 'No les llegó',
  respondieron: 'Contestaron',
  por_contestar: 'Por contestar',
  bajas: 'Pidieron baja',
  control_compraron: 'Control: compraron',
  control_calificaron: 'Control: calificaron',
  todos: 'Todos',
};

export const etiquetaFiltro = (id: string | null | undefined): string =>
  (id && FILTRO_LABELS[id as CampaignMemberFilter]) || FILTRO_LABELS.todos;

export const isCampaignMemberFilter = (v: unknown): v is CampaignMemberFilter =>
  typeof v === 'string' && (CAMPAIGN_MEMBER_FILTERS as readonly string[]).includes(v);

export const isCampaignGroup = (v: unknown): v is CampaignGroup =>
  typeof v === 'string' && (CAMPAIGN_GROUPS as readonly string[]).includes(v);

export const GRUPO_LABELS: Record<CampaignGroup, string> = {
  tratado: 'Con campaña',
  control: 'Control',
  excluido: 'Excluidos',
};

// ── Parámetros de la URL ───────────────────────────────────────────────────

export type WhatsAppTab = 'tablero' | 'personas';

export const CAMPAIGN_KEY_RE = /^[a-z0-9][a-z0-9-]{1,58}$/;
const SEGMENTO_RE = /^[A-Z0-9_]{1,20}$/;
const OLA_RE = /^[a-z0-9_-]{1,30}$/;

export interface WhatsAppParams {
  campana: string | null;
  tab: WhatsAppTab;
  filtro: CampaignMemberFilter;
  segmento: string | null;
  ola: string | null;
  grupo: CampaignGroup | null;
  /** 'total' = la lista excluye los segmentos que no entran al total (líderes). */
  alcance: 'total' | null;
  page: number;
  /** true si algún parámetro presente era inválido (hay que normalizar la URL). */
  invalido: boolean;
}

interface ParamSource {
  get(name: string): string | null;
}

/**
 * Lee ?campana, tab, filtro, segmento, ola, grupo y page. Los valores
 * inválidos caen al default y marcan `invalido` para que la página haga
 * router.replace con la URL limpia.
 */
export function normalizarParams(search: ParamSource): WhatsAppParams {
  let invalido = false;
  const leer = <T>(name: string, ok: (v: string) => boolean, map: (v: string) => T, def: T): T => {
    const raw = search.get(name);
    if (raw === null || raw === '') return def;
    if (!ok(raw)) {
      invalido = true;
      return def;
    }
    return map(raw);
  };
  const id = (v: string) => v;
  const campana = leer<string | null>('campana', (v) => CAMPAIGN_KEY_RE.test(v), id, null);
  const tab = leer<WhatsAppTab>('tab', (v) => v === 'tablero' || v === 'personas', (v) => v as WhatsAppTab, 'tablero');
  const filtro = leer<CampaignMemberFilter>('filtro', isCampaignMemberFilter, (v) => v as CampaignMemberFilter, 'todos');
  const segmento = leer<string | null>('segmento', (v) => SEGMENTO_RE.test(v), id, null);
  const ola = leer<string | null>('ola', (v) => OLA_RE.test(v), id, null);
  const grupo = leer<CampaignGroup | null>('grupo', isCampaignGroup, (v) => v as CampaignGroup, null);
  const alcance = leer<'total' | null>('alcance', (v) => v === 'total', () => 'total', null);
  const page = leer<number>(
    'page',
    (v) => /^\d{1,6}$/.test(v) && Number(v) >= 1,
    Number,
    1,
  );
  return { campana, tab, filtro, segmento, ola, grupo, alcance, page, invalido };
}

/** Query string canónica (sin defaults) de la página. */
export function construirQuery(p: Partial<Omit<WhatsAppParams, 'invalido'>>): string {
  const q = new URLSearchParams();
  if (p.campana) q.set('campana', p.campana);
  const tab = p.tab ?? 'tablero';
  if (tab !== 'tablero') q.set('tab', tab);
  if (tab === 'personas') {
    if (p.filtro && p.filtro !== 'todos') q.set('filtro', p.filtro);
    if (p.segmento) q.set('segmento', p.segmento);
    if (p.ola) q.set('ola', p.ola);
    if (p.grupo) q.set('grupo', p.grupo);
    if (p.alcance === 'total') q.set('alcance', 'total');
    if (p.page && p.page > 1) q.set('page', String(p.page));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

/** Enlace "Ver personas" desde una cifra del tablero. */
export function hrefPersonas(
  campana: string,
  filtro: CampaignMemberFilter,
  extra: {
    segmento?: string | null;
    ola?: string | null;
    grupo?: CampaignGroup | null;
    alcance?: 'total' | null;
  } = {},
): string {
  return `${WHATSAPP_ADMIN_PATH}${construirQuery({ campana, tab: 'personas', filtro, ...extra })}`;
}

// ── Evidencia de la compra ─────────────────────────────────────────────────

export function evidenciaBadge(
  e: CampaignEvidence | string | null | undefined,
): { texto: string; variant: BadgeTone; ayuda: string } | null {
  if (e === 'exacta') {
    return { texto: 'Hora exacta', variant: 'success', ayuda: 'La compra tiene hora de captura real.' };
  }
  if (e === 'dia') {
    return {
      texto: 'Día posterior',
      variant: 'info',
      ayuda: 'Venta del sistema anterior todavía sin hora de captura, de un día posterior a la lectura.',
    };
  }
  if (e === 'mismo_dia_sin_hora') {
    return {
      texto: 'Mismo día, sin hora',
      variant: 'warning',
      ayuda: 'Venta del sistema anterior del mismo día de la lectura, todavía sin hora: no se sabe si fue antes o después.',
    };
  }
  return null;
}

/** La spec escribe la llave con acento; se acepta con o sin acento. */
export const califico = (m: Pick<CampaignMember, 'calificó' | 'califico'>): boolean =>
  Boolean(m['calificó'] ?? m.califico);

// ── Bloques derivados del tablero ──────────────────────────────────────────

export interface KpiTile {
  id: string;
  etiqueta: string;
  valor: string;
  detalle: string;
}

/** Las 5 cifras clave (mismos textos que renderKpis del artefacto). */
export function kpisTablero(d: Pick<CampaignDashboard, 'embudo' | 'respuestas'>): KpiTile[] {
  const e = d.embudo;
  const r = d.respuestas;
  return [
    {
      id: 'contactados',
      etiqueta: 'Distribuidores contactados',
      valor: n(e?.contactados),
      detalle: `de ${n(e?.tratados)} en la campaña`,
    },
    {
      id: 'recibieron',
      etiqueta: 'Lo recibieron',
      valor: n(e?.recibieron),
      detalle: `${pct(ratio(e?.recibieron, e?.contactados))} de los contactados`,
    },
    {
      id: 'leyeron',
      etiqueta: 'Lo leyeron',
      valor: n(e?.leyeron),
      detalle: `${pct(ratio(e?.leyeron, e?.recibieron))} de quienes lo recibieron`,
    },
    {
      id: 'respondieron',
      etiqueta: 'Contestaron',
      valor: n(e?.respondieron),
      detalle: `${n(r?.por_contestar)} esperan respuesta`,
    },
    {
      id: 'bajas',
      etiqueta: 'Pidieron baja',
      valor: n(r?.bajas),
      detalle: `${pct(ratio(r?.bajas, e?.contactados), 1)} de los contactados`,
    },
  ];
}

export interface PasoEmbudo {
  id: string;
  etiqueta: string;
  n: number;
  /** Fracción de `recibieron` (ancho de la barra). */
  frac: number;
  filtro: CampaignMemberFilter | null;
}

/** Embudo de atribución: Recibieron → Leyeron → Compraron / Calificaron después de leer. */
export function embudoAtribucion(t: AttributionFields | null | undefined): PasoEmbudo[] {
  if (!t) return [];
  const base = t.recibieron || 0;
  const paso = (id: string, etiqueta: string, v: number, filtro: CampaignMemberFilter | null): PasoEmbudo => ({
    id,
    etiqueta,
    n: v,
    frac: base > 0 ? clamp01(v / base) : 0,
    filtro,
  });
  return [
    paso('recibieron', 'Recibieron', t.recibieron, null),
    paso('leyeron', 'Leyeron', t.leyeron, null),
    paso('compraron', 'Compraron después de leer', t.compraron_despues_de_leer, 'leyeron_compraron'),
    paso('calificaron', 'Calificaron después de leer', t.calificaron_despues_de_leer, 'leyeron_calificaron'),
  ];
}

/** Mediana simple (para pruebas de la tabla por ola y usos locales). */
export function mediana(vals: number[]): number | null {
  const v = vals.filter(isNum).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

// ── Adaptador del JSON (v1/v2 → v2 completo) ───────────────────────────────

type Loose = Record<string, unknown>;
const obj = (v: unknown): Loose => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Loose) : {});
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const str = (v: unknown, def = ''): string => (typeof v === 'string' ? v : def);
const numOr = (v: unknown, def: number): number => (isNum(v) ? v : def);

/**
 * Normaliza la respuesta del tablero: acepta el JSON v1 del artefacto y el v2
 * del API, y rellena las llaves ➕ que falten (historial vacío, atribución
 * null, sync_en_curso false, ventas_cierres/derrame null, complementos [],
 * impacto con sus llaves extendidas...). Así la página no se rompe si el API
 * todavía no calcula algún bloque o si el reporte importado es de una versión
 * anterior.
 */
export function adaptarDashboard(raw: unknown, fallbackKey = ''): CampaignDashboard {
  const d = obj(raw);
  const corte = obj(d.corte);
  const periodo = obj(d.periodo);
  const campana = obj(d.campana);
  const embudo = obj(d.embudo);
  const respuestas = d.respuestas == null ? null : obj(d.respuestas);
  const estado = str(campana.estado, 'activa');
  return {
    version: numOr(d.version, 1),
    generado: str(d.generado),
    generado_cdmx: str(d.generado_cdmx),
    corte: {
      sync_fin_cdmx: typeof corte.sync_fin_cdmx === 'string' ? corte.sync_fin_cdmx : null,
      watermark_legacy: typeof corte.watermark_legacy === 'string' ? corte.watermark_legacy : null,
      sync_en_curso: corte.sync_en_curso === true,
    },
    periodo: {
      nombre: str(periodo.nombre),
      inicio: str(periodo.inicio),
      fin: str(periodo.fin),
      umbral: numOr(periodo.umbral, 3300),
      cerrado: periodo.cerrado === true,
    },
    campana: {
      key: str(campana.key, fallbackKey),
      nombre: str(campana.nombre),
      estado: (['borrador', 'activa', 'cerrada', 'archivada'].includes(estado)
        ? estado
        : 'activa') as CampaignDashboard['campana']['estado'],
      t0_cdmx: str(campana.t0_cdmx),
      pct_control: numOr(campana.pct_control, 0),
      padre: typeof campana.padre === 'string' && campana.padre ? campana.padre : null,
    },
    estado_campana: str(d.estado_campana),
    olas: arr(d.olas),
    embudo: {
      elegibles: numOr(embudo.elegibles, 0),
      control: numOr(embudo.control, 0),
      tratados: numOr(embudo.tratados, 0),
      contactados: numOr(embudo.contactados, 0),
      recibieron: numOr(embudo.recibieron, 0),
      leyeron: numOr(embudo.leyeron, 0),
      respondieron: numOr(embudo.respondieron, 0),
    },
    segmentos: arr(d.segmentos),
    total: d.total == null ? null : (obj(d.total) as unknown as CampaignDashboard['total']),
    lecturas_por_hora: arr(d.lecturas_por_hora),
    respuestas: respuestas
      ? {
          personas: numOr(respuestas.personas, 0),
          mensajes: numOr(respuestas.mensajes, 0),
          por_contestar: numOr(respuestas.por_contestar, 0),
          bajas: numOr(respuestas.bajas, 0),
          por_categoria: arr(respuestas.por_categoria),
          sin_identificar: isNum(respuestas.sin_identificar) ? respuestas.sin_identificar : null,
          opt_out_desde_t0: isNum(respuestas.opt_out_desde_t0) ? respuestas.opt_out_desde_t0 : null,
        }
      : null,
    impacto: adaptarImpacto(d.impacto),
    ventas_cierres: adaptarVentasCierres(d.ventas_cierres),
    derrame: adaptarDerrame(d.derrame),
    sucursales: arr(d.sucursales),
    historial: arr(d.historial),
    atribucion: adaptarAtribucion(d.atribucion),
    complementos: adaptarComplementos(d.complementos),
    notas: arr<unknown>(d.notas).filter((x): x is string => typeof x === 'string'),
  };
}

/**
 * Atribución (SPEC §3.7). Sin `total` no hay nada que pintar → null. Los
 * arreglos y la evidencia faltantes se rellenan; las cifras faltantes se
 * muestran como '—'.
 */
function adaptarAtribucion(raw: unknown): CampaignDashboard['atribucion'] {
  if (raw == null) return null;
  const a = obj(raw);
  // Forma de la SPEC §3.7: total + evidencia + olas. Otra forma (p. ej. un
  // bloque de otra versión) se trata como ausente en vez de pintar '—'.
  if (!a.total || typeof a.total !== 'object') return null;
  if (!a.evidencia || typeof a.evidencia !== 'object' || !Array.isArray(a.olas)) return null;
  const ev = obj(a.evidencia);
  return {
    t0_cdmx: str(a.t0_cdmx),
    olas_aviso: arr<unknown>(a.olas_aviso).filter((x): x is string => typeof x === 'string'),
    evidencia: {
      compras_hora_exacta: numOr(ev.compras_hora_exacta, 0),
      compras_solo_dia: numOr(ev.compras_solo_dia, 0),
      cobertura_hora_legacy: isNum(ev.cobertura_hora_legacy) ? ev.cobertura_hora_legacy : null,
    },
    segmentos: arr(a.segmentos),
    total: a.total as AttributionFields,
    olas: arr(a.olas),
    notas: arr<unknown>(a.notas).filter((x): x is string => typeof x === 'string'),
  };
}

/** Puntos del historial con dato (para la gráfica "Cómo avanza el día"). */
export function puntosHistorial(d: Pick<CampaignDashboard, 'historial'>) {
  return (d.historial ?? [])
    .filter((x) => isNum(x.pct_califican_trat))
    .slice()
    .sort((a, b) => String(a.generado).localeCompare(String(b.generado)));
}

/** Categorías de respuesta ordenadas de mayor a menor, con su tono. */
export function categoriasOrdenadas(d: Pick<CampaignDashboard, 'respuestas'>) {
  const cats = (d.respuestas?.por_categoria ?? []).slice().sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...cats.map((c) => c.n));
  return cats.map((c) => ({ ...c, frac: c.n / max, tono: toneCategoria(c.id) }));
}
