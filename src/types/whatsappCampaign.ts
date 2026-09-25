// whatsappCampaign.ts - Contrato de Comercial → WhatsApp (campañas medibles).
//
// OJO: las llaves van en snake_case A PROPÓSITO. Son el espejo exacto del JSON
// `version: 2` que devuelve GET /whatsapp/campaigns/:key/dashboard, que a su vez
// es el JSON v1 de `tablero/tablero-datos.json` (el tablero de la campaña de
// cierre) más las llaves nuevas `campana`, `periodo.cerrado`,
// `corte.sync_en_curso`, `historial`, `atribucion` y
// `respuestas.opt_out_desde_t0` (SPEC §3.6, decisión D4). Mantenerlas iguales
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

export interface CampaignRespuestas {
  personas: number;
  mensajes: number;
  por_contestar: number;
  bajas: number;
  por_categoria: RespuestaCategoria[];
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

export interface CampaignImpacto {
  tipo: ImpactoTipo;
  corte: string | null;
  puntos: EffectEstimate | null;
  calificacion_pp: EffectEstimate | null;
  compra_pp: EffectEstimate | null;
  veredicto: string | null;
  mde_pts: string | null;
  mde_pp: string | null;
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
  };
  estado_campana: string;
  olas: CampaignOla[];
  embudo: CampaignEmbudo;
  segmentos: CampaignSegmento[];
  total: CampaignGroupBlock | null;
  lecturas_por_hora: LecturaHora[];
  respuestas: CampaignRespuestas | null;
  impacto: CampaignImpacto | null;
  sucursales: CampaignSucursal[];
  /** ➕ v2 */
  historial: CampaignHistorialPunto[];
  /** ➕ v2 (null si el API aún no la calcula) */
  atribucion: CampaignAtribucion | null;
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
