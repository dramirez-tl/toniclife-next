// whatsappCampaign.ts - Contrato de Comercial → WhatsApp (campañas medibles).
//
// OJO: las llaves van en snake_case A PROPÓSITO. Son el espejo exacto del JSON
// `version: 2` que devuelve GET /whatsapp/campaigns/:key/dashboard, que a su vez
// es el JSON v1 de `tablero/tablero-datos.json` (el tablero de la campaña de
// cierre) más las llaves nuevas `campana`, `periodo.cerrado`,
// `corte.sync_en_curso`, `historial`, `atribucion` y
// `respuestas.opt_out_desde_t0` (SPEC §3.6, decisión D4), más los bloques de
// reportes por tipo: `impacto` extendido (regla de decisión, retorno, CACE,
// subestratos, sensibilidades), `ventas_cierres` (el día de cierre contra
// cierres anteriores), `derrame` ("¿pasaron la voz?") y las campañas hijas
// (`campana.padre`, `complementos`: la ola extra). Mantenerlas iguales
// permite comparar 1:1 contra el script y reusar el mismo diseño.
//
// Todas las horas llegan ya formateadas en CDMX (`*_cdmx`); el front no
// calcula límites de negocio con `new Date()`. El periodo (26→25) sale de
// tonic.commission_periods en el API.

// ── Lista de campañas (GET /whatsapp/campaigns) ────────────────────────────

export type CampaignStatus = 'borrador' | 'activa' | 'cerrada' | 'archivada';

export interface CampaignListItem {
  key: string;
  nombre: string;
  estado: CampaignStatus;
  periodo: {
    numero: number;
    nombre: string;
    inicio: string; // YYYY-MM-DD (26 del mes anterior)
    fin: string; // YYYY-MM-DD (25, o recorrido a día hábil)
    cerrado: boolean;
  };
  t0_cdmx: string;
  tratados: number;
  control: number;
  ultimo_envio_cdmx: string | null;
  /** ➕ v2: clave de la campaña padre (null = campaña principal; la ola extra es hija). */
  padre: string | null;
}

// ── Tablero (GET /whatsapp/campaigns/:key/dashboard) ───────────────────────

export type OlaEstado = 'enviada' | 'en curso' | 'programada';

export interface OlaPlantilla {
  plantilla: string;
  nombre: string;
  intentos: number;
  recibidos: number;
  leidos: number;
}

/**
 * Una ola de envíos. En una ola `programada` todos los contadores son `null`.
 * Invariante: intentos = recibidos + sin_whatsapp + tope_meta +
 * experimento_meta + otros_fallos + pendientes (`recibidos` incluye leídos).
 */
export interface CampaignOla {
  id: string;
  nombre: string;
  cuando: string;
  estado: OlaEstado;
  intentos: number | null;
  recibidos: number | null;
  leidos: number | null;
  sin_whatsapp: number | null;
  tope_meta: number | null;
  experimento_meta: number | null;
  otros_fallos: number | null;
  pendientes: number | null;
  por_plantilla: OlaPlantilla[] | null;
}

export interface CampaignEmbudo {
  elegibles: number;
  control: number;
  tratados: number;
  contactados: number;
  recibieron: number;
  leyeron: number;
  respondieron: number;
}

/** Bloque por grupo (v1): tratado vs control. Los `pct_*` son fracciones 0..1 o null. */
export interface CampaignGroupBlock {
  tratados: number;
  control: number;
  recibieron: number;
  leyeron: number;
  pp_t0_trat: number | null;
  pp_t0_ctrl: number | null;
  base_trat: number;
  base_ctrl: number;
  califican_trat: number;
  califican_ctrl: number;
  pct_califican_trat: number | null;
  pct_califican_ctrl: number | null;
  compraron_trat: number;
  compraron_ctrl: number;
  pct_compraron_trat: number | null;
  pct_compraron_ctrl: number | null;
  pts_ganados_prom_trat: number | null;
  pts_ganados_prom_ctrl: number | null;
  base_historica_califica: number | null;
  base_historica_compra: number | null;
}

export interface CampaignSegmento extends CampaignGroupBlock {
  id: string;
  nombre: string;
}

export interface LecturaHora {
  hora: string; // 'jue 17:00'
  entregados: number;
  leidos: number;
}

export interface RespuestaCategoria {
  id: string;
  nombre: string;
  n: number;
}

/**
 * Respuestas de INTEGRANTES de esta campaña (el API las liga por cliente o
 * teléfono): dos campañas del mismo periodo (padre y ola extra) no se cuentan
 * las respuestas la una a la otra.
 */
export interface CampaignRespuestas {
  personas: number;
  mensajes: number;
  por_contestar: number;
  bajas: number;
  por_categoria: RespuestaCategoria[];
  /** ➕ v2: teléfonos que escribieron en la ventana sin ser de esta campaña (no cuentan arriba). */
  sin_identificar?: number | null;
  /** ➕ v2: integrantes con whatsapp_opt_out_at ≥ T0. */
  opt_out_desde_t0?: number | null;
}

export interface EffectEstimate {
  efecto: number | null;
  ic_bajo: number | null;
  ic_alto: number | null;
  p?: number | null;
}

export type ImpactoTipo = 'interino' | 'preliminar' | 'oficial';

/** Resultado de la regla de decisión del plan de medición (§6) sobre el IC95 de puntos. */
export type DecisionResultado = 'funciono' | 'hizo_dano' | 'no_funciono' | 'no_concluyente';

export interface ReglaDecision {
  resultado: DecisionResultado | null;
  /** Texto en español, tal cual lo manda el API. */
  texto: string | null;
  /** Las cuatro reglas, en orden (vacío si el reporte no las trae: el front usa las suyas). */
  reglas: string[];
}

/** Retorno de la campaña. Sin margen: todavía no hay costo de producto. */
export interface RetornoCampana {
  venta_incremental_mxn: EffectEstimate | null;
  venta_sin_recorte_mxn: EffectEstimate | null;
  pts_incrementales: EffectEstimate | null;
  costo_meta_mxn: number | null;
  costo_lid_mxn: number | null;
  costo_total_campana_mxn: number | null;
  venta_por_peso: EffectEstimate | null;
  retorno: number | null;
  nota: string | null;
}

/** Efecto entre quienes sí recibieron el mensaje (CACE) y entre quienes lo leyeron. */
export interface CaceImpacto {
  pct_entregado: number | null;
  efecto: number | null;
  ic_bajo: number | null;
  ic_alto: number | null;
  efecto_leido: number | null;
}

export interface SubestratoImpacto {
  sub: string;
  nt: number | null;
  nc: number | null;
  media_t: number | null;
  media_c: number | null;
  efecto: number | null;
  ic_bajo: number | null;
  ic_alto: number | null;
  ic_bonf_bajo: number | null;
  ic_bonf_alto: number | null;
}

export interface SensibilidadImpacto extends EffectEstimate {
  id: string;
  nombre: string;
}

/**
 * Último reporte de impacto (interino, preliminar u oficial). Las llaves v1
 * (tipo…mde_pp) son las del tablero original; las demás llegan con el
 * reporte extendido y el adaptador las rellena (null / []) si faltan.
 */
export interface CampaignImpacto {
  tipo: ImpactoTipo;
  corte: string | null;
  puntos: EffectEstimate | null;
  calificacion_pp: EffectEstimate | null;
  compra_pp: EffectEstimate | null;
  veredicto: string | null;
  mde_pts: string | null;
  mde_pp: string | null;
  /** 'OFICIAL (lunes 28 o después)', etc. */
  lectura: string | null;
  /** null en una lectura intermedia (no decide nada). */
  regla_decision: ReglaDecision | null;
  retorno: RetornoCampana | null;
  cace: CaceImpacto | null;
  por_subestrato: SubestratoImpacto[];
  sensibilidades: SensibilidadImpacto[];
  /** Solo la ola extra: si la venta incremental es confiable. */
  venta_confiable: boolean | null;
}

// ── ➕ Ventas del cierre contra cierres anteriores (reporte 'ventas_cierres') ──

export type VentasMetrica = 'tickets' | 'pts' | 'venta';
export const VENTAS_METRICAS: readonly VentasMetrica[] = ['tickets', 'pts', 'venta'];

export type VentasVentana = 'dia_cierre' | 'ult2' | 'ult5' | 'previos4' | 'periodo';
export const VENTAS_VENTANAS: readonly VentasVentana[] = ['dia_cierre', 'ult2', 'ult5', 'previos4', 'periodo'];

/** Tickets, puntos y venta (MXN equivalentes) de una ventana. */
export interface VentasTPV {
  tickets: number | null;
  pts: number | null;
  venta: number | null;
}

export interface VentasCierreRow {
  n: number | null;
  nombre: string | null;
  fecha: string | null;
  dia: string | null;
  al_corte: VentasTPV | null;
  total_dia: VentasTPV | null;
}

export interface VentasDiaSemana extends VentasTPV {
  fecha: string | null;
  dia: string | null;
  es_hoy: boolean;
}

export interface VentasSerieDia {
  fecha: string | null;
  dia: string | null;
  serie: VentasTPV[];
}

export interface VentasPorHora {
  horas: string[];
  hoy: VentasTPV[];
  promedio_cierres: VentasTPV[];
  ayer: VentasSerieDia | null;
  viernes_anterior: VentasSerieDia | null;
}

export interface VentasOla {
  ola: string;
  desde: string | null;
  hasta: string | null;
  n: number | null;
}

export interface VentasComparacion {
  actual: number | null;
  mediana_prev: number | null;
  media_prev: number | null;
  min_prev: number | null;
  max_prev: number | null;
  /** Lugar del periodo actual entre los 7 (1 = el más alto). */
  rango_de_7: number | null;
  vs_mediana_pct: number | null;
  vs_media_pct: number | null;
}

export interface VentasParticipacion {
  dia_cierre_pct: number | null;
  ult5_pct: number | null;
}

export interface VentasPeriodoRow {
  n: number | null;
  nombre: string | null;
  ini: string | null;
  fin: string | null;
  dow_cierre: string | null;
  es_actual: boolean;
  dia_cierre: VentasTPV | null;
  ult2: VentasTPV | null;
  ult5: VentasTPV | null;
  previos4: VentasTPV | null;
  periodo: VentasTPV | null;
  compradores: number | null;
  compradores_dia_cierre: number | null;
  calificados: number | null;
  pct_calif_de_con_puntos: number | null;
  participacion: Record<VentasMetrica, VentasParticipacion | null> | null;
}

export interface VentasSegBaseLado {
  n: number | null;
  pct_califica: number | null;
  pct_compra: number | null;
  dpts_media: number | null;
  venta_mxn_media: number | null;
}

export interface VentasSegBaseDiff {
  trat_vs_base: number | null;
  ctrl_vs_base: number | null;
  trat_vs_ctrl: number | null;
}

/** Segmento del experimento contra su base histórica (puntos porcentuales). */
export interface VentasSegBaseRow {
  id: string;
  tratados: VentasSegBaseLado | null;
  control: VentasSegBaseLado | null;
  base_pct_califica: number | null;
  base_pct_compra: number | null;
  base_dpts_media: number | null;
  califica_pp: VentasSegBaseDiff | null;
  compra_pp: VentasSegBaseDiff | null;
}

export interface VentasDiaCompleto {
  actual: number | null;
  comparaciones: Partial<Record<VentasVentana, Record<VentasMetrica, VentasComparacion | null>>>;
  periodos: VentasPeriodoRow[];
}

/** Describe, no demuestra: el efecto de la campaña es contra el control. */
export interface VentasCierresBlock {
  version: number;
  lectura: string | null;
  fuente: string | null;
  generado_cdmx: string | null;
  corte_hoy: string | null;
  hoy: { fecha: string | null; dia: string | null; al_corte: VentasTPV | null };
  mediana_al_corte: VentasTPV | null;
  media_al_corte: VentasTPV | null;
  hoy_vs_mediana_pct: VentasTPV | null;
  hoy_vs_media_pct: VentasTPV | null;
  cierres: VentasCierreRow[];
  semana: VentasDiaSemana[];
  por_hora: VentasPorHora | null;
  olas: VentasOla[];
  dia_completo: VentasDiaCompleto | null;
  segmentos_vs_base: { segmentos: VentasSegBaseRow[]; total: VentasSegBaseRow | null } | null;
  notas: string[];
}

// ── ➕ Derrame: "¿pasaron la voz?" (reporte 'derrame') ────────────────────

export type DerrameVeredicto = 'DERRAME_POSITIVO' | 'DERRAME_NEGATIVO' | 'NO_CONCLUYENTE' | 'SIN_DATOS';

export interface DerrameEstimate extends EffectEstimate {
  media_t: number | null;
  media_c: number | null;
  mde: number | null;
  n_t: number | null;
  n_c: number | null;
}

export type DerrameVecindario = 'frontales' | 'nivel2' | 'patrocinador' | 'union';

export interface DerrameFila {
  vecindario: DerrameVecindario | string;
  nombre: string;
  n_t: number | null;
  n_c: number | null;
  con_vecinos_t: number | null;
  con_vecinos_c: number | null;
  vecinos_t: number | null;
  vecinos_c: number | null;
  pts: DerrameEstimate | null;
  compraron: DerrameEstimate | null;
  cruzaron: DerrameEstimate | null;
  venta: DerrameEstimate | null;
  pts_sin_cuped: DerrameEstimate | null;
  pts_sin_recorte: DerrameEstimate | null;
}

export type DerramePoblacion = 'principal' | 'extra';
export type DerrameUnidad = 'suma_por_indice' | 'por_vecino';

export interface DerrameTabla {
  poblacion: DerramePoblacion | string;
  unidad: DerrameUnidad | string;
  filas: DerrameFila[];
}

export interface DerrameLidConocido {
  fuente: string | null;
  metrica: string | null;
  efecto: number | null;
  ic_bajo: number | null;
  ic_alto: number | null;
  p: number | null;
  n_t: number | null;
  n_c: number | null;
  frontales_calif: EffectEstimate | null;
}

export interface DerrameLid {
  conocido: DerrameLidConocido | null;
  sin_mensaje: DerrameFila[];
  con_lid_7_estratos: DerrameFila[];
}

export interface DerrameVecinosLado {
  vecinos: number | null;
  dpts: number | null;
  compraron: number | null;
  cruzaron: number | null;
  venta: number | null;
  por_indice: { vecinos: number | null; dpts: number | null; compraron: number | null; venta: number | null } | null;
}

export interface DerrameVecinosUnicos {
  unicos_t: number | null;
  unicos_c: number | null;
  en_ambos_grupos: number | null;
  con_mas_de_un_indice: number | null;
  solo_t: DerrameVecinosLado | null;
  solo_c: DerrameVecinosLado | null;
}

export interface DerrameTiempo {
  indices: number | null;
  con_lectura: number | null;
  vecinos: number | null;
  docs_antes: number | null;
  docs_despues: number | null;
  pts_antes: number | null;
  pts_despues: number | null;
  tasa_docs_h_antes: number | null;
  tasa_docs_h_despues: number | null;
  share_pts_despues: number | null;
  vecinos_compraron_despues: number | null;
  docs_24h: number | null;
  horas_antes_media: number | null;
}

export interface DerrameTiempoPar {
  tratados: DerrameTiempo | null;
  control_lectura_ficticia: DerrameTiempo | null;
}

export interface DerrameTiempoLectura {
  principal: DerrameTiempoPar | null;
  extra: DerrameTiempoPar | null;
  nota: string | null;
}

export interface DerrameSucursalLado {
  compradores: number | null;
  pts: number | null;
  tickets: number | null;
}

export interface DerrameSucursalTotales {
  ventana: [string, string] | null;
  sin_msg: DerrameSucursalLado | null;
  con_msg: DerrameSucursalLado | null;
}

export interface DerrameSucursales {
  /** Por número de periodo ('71', '72', '73'). */
  totales: Record<string, DerrameSucursalTotales>;
  corr_tratados_vs_cambio: number | null;
  sucursales_con_datos: number | null;
  nota: string | null;
}

export interface DerrameBlock {
  version: number;
  tipo: 'derrame';
  lectura: string | null;
  campana: string | null;
  corte: string | null;
  t0_cdmx: string | null;
  t0_extra_cdmx: string | null;
  generado_cdmx: string | null;
  fuente_red: string | null;
  excluidos_con_mensaje: number | null;
  veredicto: DerrameVeredicto;
  veredicto_texto: string | null;
  mde_pts: number | null;
  tablas: DerrameTabla[];
  lid: DerrameLid | null;
  vecinos_unicos: Record<string, DerrameVecinosUnicos>;
  tiempo_lectura: DerrameTiempoLectura | null;
  sucursales: DerrameSucursales | null;
  notas: string[];
}

/** ➕ Campaña hija (ola extra): otra población con su propio control. */
export interface ComplementoItem {
  key: string;
  nombre: string;
  t0_cdmx: string;
  tratados: number;
  control: number;
}

export interface CampaignSucursal {
  nombre: string;
  contactados: number;
  calificaron: number;
  compraron: number;
}

/** ➕ v2: una foto por corrida de sync ("Cómo avanza el día"). */
export interface CampaignHistorialPunto {
  generado: string;
  generado_cdmx: string;
  pct_califican_trat: number | null;
  pct_califican_ctrl: number | null;
  contactados?: number | null;
  recibieron?: number | null;
  leyeron?: number | null;
}

// ── ➕ Atribución (SPEC §3.7) ──────────────────────────────────────────────

export interface AttributionFields {
  // Tratados
  tratados: number;
  recibieron: number;
  leyeron: number;
  no_leyeron: number;
  base_recibieron: number;
  calificaron_recibieron: number;
  pct_calificaron_recibieron: number | null;
  compraron_despues_de_leer: number;
  compraron_mismo_dia_sin_hora: number;
  pct_compraron_despues_de_leer: number | null;
  base_leyeron: number;
  calificaron_despues_de_leer: number;
  calificaron_mismo_dia_sin_hora: number;
  pct_calificaron_despues_de_leer: number | null;
  compraron_sin_leer: number;
  pct_compraron_sin_leer: number | null;
  compraron_desde_t0_trat: number;
  compraron_desde_t0_trat_sin_hora: number;
  pct_compraron_desde_t0_trat: number | null;
  base_trat: number;
  calificaron_trat: number;
  pct_calificaron_trat: number | null;
  // Control (nunca recibe mensajes: no existe "después de leer")
  control: number;
  compraron_desde_t0_ctrl: number;
  compraron_desde_t0_ctrl_sin_hora: number;
  pct_compraron_desde_t0_ctrl: number | null;
  base_ctrl: number;
  calificaron_ctrl: number;
  pct_calificaron_ctrl: number | null;
  /** Califican Y compraron (con hora) desde el primer aviso; base = base_trat/base_ctrl. */
  calificaron_desde_t0_trat?: number;
  pct_calificaron_desde_t0_trat?: number | null;
  calificaron_desde_t0_ctrl?: number;
  pct_calificaron_desde_t0_ctrl?: number | null;
}

export interface AttributionSegmento extends AttributionFields {
  id: string;
  nombre: string;
}

export interface AttributionOla {
  id: string;
  nombre: string;
  es_aviso: boolean;
  recibieron: number;
  leyeron: number;
  mediana_min_lectura: number | null;
  compraron_despues: number;
  compraron_mismo_dia_sin_hora: number;
  pct_compraron_despues: number | null;
  /** null en olas que no son aviso (felicitación). */
  base_leyeron: number | null;
  calificaron_despues: number | null;
  pct_calificaron_despues: number | null;
}

export interface CampaignAtribucion {
  t0_cdmx: string;
  olas_aviso: string[];
  evidencia: {
    compras_hora_exacta: number;
    compras_solo_dia: number;
    /** M- con hora real / M- en la ventana; null si no hay M-. */
    cobertura_hora_legacy: number | null;
  };
  segmentos: AttributionSegmento[];
  /** Excluye config.total_excluye_segmentos (LID). */
  total: AttributionFields;
  olas: AttributionOla[];
  notas: string[];
}

// ── Tablero completo ───────────────────────────────────────────────────────

export interface CampaignDashboard {
  version: number;
  generado: string;
  generado_cdmx: string;
  corte: {
    sync_fin_cdmx: string | null;
    watermark_legacy: string | null;
    /** ➕ v2 */
    sync_en_curso: boolean;
  };
  periodo: {
    nombre: string;
    inicio: string;
    fin: string;
    umbral: number;
    /** ➕ v2: is_closed ∨ hoy_cdmx > fin */
    cerrado: boolean;
  };
  /** ➕ v2 */
  campana: {
    key: string;
    nombre: string;
    estado: CampaignStatus;
    t0_cdmx: string;
    pct_control: number;
    /** ➕ clave de la campaña padre si esta es complementaria (ola extra). */
    padre: string | null;
  };
  estado_campana: string;
  olas: CampaignOla[];
  embudo: CampaignEmbudo;
  segmentos: CampaignSegmento[];
  total: CampaignGroupBlock | null;
  lecturas_por_hora: LecturaHora[];
  respuestas: CampaignRespuestas | null;
  impacto: CampaignImpacto | null;
  /** ➕ último reporte 'ventas_cierres' (describe, no demuestra). */
  ventas_cierres: VentasCierresBlock | null;
  /** ➕ último reporte 'derrame' ("pasaron la voz"). */
  derrame: DerrameBlock | null;
  sucursales: CampaignSucursal[];
  /** ➕ v2 */
  historial: CampaignHistorialPunto[];
  /** ➕ v2 (null si el API aún no la calcula) */
  atribucion: CampaignAtribucion | null;
  /** ➕ campañas hijas (ola extra); cada una tiene su propio tablero por key. */
  complementos: ComplementoItem[];
  notas: string[];
}

// ── Personas (GET /whatsapp/campaigns/:key/members) — CON datos personales ──

export const CAMPAIGN_MEMBER_FILTERS = [
  'leyeron_compraron',
  'leyeron_calificaron',
  'leyeron_mismo_dia_sin_hora',
  'leyeron_no_compraron',
  'recibieron_calificaron',
  'compraron_sin_leer',
  'no_recibieron',
  'respondieron',
  'por_contestar',
  'bajas',
  'control_compraron',
  'control_calificaron',
  'todos',
] as const;

export type CampaignMemberFilter = (typeof CAMPAIGN_MEMBER_FILTERS)[number];

export const CAMPAIGN_GROUPS = ['tratado', 'control', 'excluido'] as const;
export type CampaignGroup = (typeof CAMPAIGN_GROUPS)[number];

export type CampaignEvidence = 'exacta' | 'dia' | 'mismo_dia_sin_hora';

export interface CampaignMember {
  customer_number: string;
  nombre: string | null;
  telefono: string | null;
  sucursal: string | null;
  segmento: string;
  grupo: CampaignGroup;
  pp_t0: number;
  pp_ahora: number;
  faltan: number;
  recibio: boolean;
  leyo: boolean;
  primer_leido_cdmx: string | null;
  ola_leida: string | null;
  primera_compra_tras_leer_cdmx: string | null;
  evidencia: CampaignEvidence | null;
  /** La spec usa la llave con acento; se acepta también sin acento. */
  'calificó'?: boolean;
  califico?: boolean;
  categoria_respuesta: string | null;
  ultima_respuesta_cdmx: string | null;
  opt_out: boolean;
}

export interface CampaignMembersParams {
  filtro?: CampaignMemberFilter;
  segmento?: string;
  ola?: string;
  grupo?: CampaignGroup;
  /** 'total' = solo los segmentos que entran al total del tablero (sin líderes). */
  alcance?: 'total';
  page?: number;
  limit?: number;
}

/** Respuesta normalizada del servicio (el API usa paginate(): data + totalPages). */
export interface CampaignMembersPage {
  items: CampaignMember[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
