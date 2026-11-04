// whatsappImpact.ts - Contrato del "Impacto del periodo" de WhatsApp
// (Comercial → WhatsApp): GET /whatsapp/campaigns/periods/:numero.
//
// OJO: las llaves van en snake_case A PROPÓSITO, como el resto de los
// contratos de campañas (espejo exacto del JSON del API, SPEC Recorridos §6)
// para poder comparar 1:1 contra los reportes. Todas las horas llegan ya
// formateadas en hora del centro de México (`*_cdmx`); el periodo es el de
// tonic.commission_periods (numero, nombre, inicio, fin, cerrado).
//
// Solo agregados: ningún bloque trae nombres, teléfonos ni números de cliente
// (el API lo garantiza con assertAggregatesOnly). El adaptador tolerante que
// rellena llaves ausentes (null / []) vive en lib/whatsapp-campaign/impacto.ts.
//
// Sin margen: no hay costo de producto en el sistema, así que se reporta venta
// atribuida, venta incremental contra el control y venta por peso gastado;
// nunca "ganancias".

import type { EffectEstimate, ImpactoTipo, ReglaDecision } from './whatsappCampaign';

export type ImpactoCategoria = 'MARKETING' | 'UTILITY';

export interface ImpactoPeriodoInfo {
  numero: number | null;
  nombre: string;
  /** YYYY-MM-DD (start_date / end_date de commission_periods). */
  inicio: string;
  fin: string;
  cerrado: boolean;
}

export interface ImpactoTotales {
  enviados: number | null;
  entregados: number | null;
  leidos: number | null;
  /** Escribieron en las 72 h siguientes al aviso. */
  respondieron: number | null;
  /** Baja total (whatsapp_opt_out_at ≥ T0). */
  bajas: number | null;
  /** Pidieron solo avisos de cuenta (whatsapp_marketing_opt_out_at ≥ T0). */
  solo_cuenta: number | null;
  costo_usd: number | null;
  costo_mxn: number | null;
  /** Tratados con compra completada entre el primer entregado y +attributionDays. */
  compraron_despues: number | null;
  venta_atribuida_mxn: number | null;
  /** Solo recorridos con grupo de control. */
  venta_incremental_mxn: EffectEstimate | null;
  venta_por_peso: EffectEstimate | null;
}

/** Resumen del último reporte de impacto del recorrido (oficial > preliminar > interino). */
export interface ImpactoRecorridoResumen {
  tipo: ImpactoTipo | null;
  veredicto: string | null;
  puntos: EffectEstimate | null;
  compra_pp: EffectEstimate | null;
  venta_incremental_mxn: EffectEstimate | null;
  venta_por_peso: EffectEstimate | null;
  regla_decision: ReglaDecision | null;
}

export interface ImpactoRecorrido {
  /** campaign_key de la campaña del recorrido en el periodo ('j3-cierre-p75'). */
  key: string;
  /** 'J3'. */
  codigo: string;
  nombre: string;
  categoria: ImpactoCategoria | null;
  plantilla: string | null;
  estado: string | null;
  tratados: number | null;
  control: number | null;
  enviados: number | null;
  entregados: number | null;
  leidos: number | null;
  respondieron: number | null;
  bajas: number | null;
  sin_whatsapp: number | null;
  tope_meta: number | null;
  otros_fallos: number | null;
  costo_usd: number | null;
  costo_mxn: number | null;
  compraron_despues: number | null;
  venta_atribuida_mxn: number | null;
  impacto: ImpactoRecorridoResumen | null;
  ultimo_envio_cdmx: string | null;
}

export interface ImpactoConsentimiento {
  /** Conteos actuales de customers. */
  opt_in_total: number | null;
  solo_cuenta_total: number | null;
  baja_total: number | null;
  /** Cambios registrados dentro del periodo [inicio, fin]. */
  ganados: {
    todos: number | null;
    solo_cuenta: number | null;
    nada: number | null;
  };
}

export interface ImpactoDia {
  /** YYYY-MM-DD (fecha local). */
  fecha: string;
  enviados: number;
  entregados: number;
  leidos: number;
  respuestas: number;
}

export interface ImpactoPeriodo {
  periodo: ImpactoPeriodoInfo;
  generado_cdmx: string;
  totales: ImpactoTotales;
  recorridos: ImpactoRecorrido[];
  consentimiento: ImpactoConsentimiento | null;
  por_dia: ImpactoDia[];
  notas: string[];
}
