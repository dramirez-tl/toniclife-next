import { describe, expect, it } from 'vitest';
import { tramosOla } from './format';
import {
  AVISO_MARKETING_PAUSA,
  CONTROL_OPCIONES,
  FX_SUGERIDO,
  MAX_MONITORES,
  TARIFAS_SUGERIDAS,
  adaptarPreview,
  adaptarPromo,
  adaptarRecorridos,
  adaptarRunResult,
  adaptarRuns,
  adaptarSettings,
  adaptarTestResult,
  ajustesDe,
  algunoEncendido,
  camposParams,
  conValoresSugeridos,
  controlTexto,
  esBloqueoInformativo,
  estadoPlantilla,
  etiquetaCategoria,
  etiquetaMotivo,
  etiquetaMotivoCorrida,
  gateRecorrido,
  motivosOrdenados,
  olaDeCorrida,
  omitidosNetos,
  ordenCodigo,
  patchDeAjustes,
  payloadSettings,
  plantillaDeCanal,
  resumenCorrida,
  sinWhatsAppDe,
  telefonosDePrueba,
  toneCategoriaRecorrido,
  validarAjustes,
  validarSettings,
  valorOpcion,
} from './recorridos';
import type { JourneyItem, JourneysSettings } from '@/types/whatsappJourneys';

// Fixture = SOLO agregados con la forma de GET /whatsapp/journeys (SPEC §5).
// Sin teléfonos reales, nombres ni números de cliente.
// Contabilidad real del API (RunCounts): `failed` = SOLO fallos reales de Meta
// (131049 ×2, 130472 ×1, 131053 ×1 = 4); 131026 (×6) va aparte en byError y
// `skipped` incluye también 'sin_whatsapp' y 'fallido'.
function overviewRaw() {
  return {
    period: { number: 75, name: 'NOVIEMBRE 2026', startDate: '2026-11-01', endDate: '2026-11-30', isClosed: false },
    settings: {
      enabled: true,
      quietStart: '09:00',
      quietEnd: '20:00',
      hourlyCap: 5000,
      attributionDays: 7,
      monitorRecipients: [{ name: 'Monitor Uno', phone: '+521111111111', customerNumber: '12' }],
      costs: { marketingUsdMx: 0.0305, utilityUsdMx: 0.0034, utilityUsdUs: 0.0085, marketingUsdUs: 0.0305 },
    },
    migrationPending: false,
    marketingPaused: false,
    whatsappEnabled: true,
    cronEnabled: true,
    optInCount: 0,
    journeys: [
      {
        code: 'J12',
        name: 'Preferencias',
        category: 'MARKETING',
        template: { name: 'cuenta_preferencias', status: 'APPROVED', category: 'MARKETING', language: 'es_MX', quality: 'GREEN' },
        templateName: 'cuenta_preferencias',
        enabled: true,
        sendTime: '10:00',
        scheduleText: 'Diario a las 10:00 hora local',
        nextRunCdmx: 'mié 4 nov 10:00',
        lastRun: {
          startedCdmx: 'mar 3 nov 10:00',
          finishedCdmx: 'mar 3 nov 10:04',
          status: 'done',
          sent: 120,
          failed: 4,
          skipped: 60,
          byReason: { control: 0, rampa: 30, opt_out: 20, sin_whatsapp: 6, fallido: 4 },
          byError: { '131026': 6, '131049': 2, '130472': 1, '131053': 1 },
        },
        audienceEstimate: 1800,
        controlPct: 0,
        dailyCap: 2000,
        rampPct: 100,
        rampBranchIds: [],
        params: {},
        campaignKey: 'j12-preferencias-p75',
        blockReason: null,
      },
      {
        code: 'J3',
        name: 'Cierre del periodo',
        category: 'MARKETING',
        template: null,
        templateName: 'periodo_por_calificar',
        enabled: false,
        sendTime: '10:00',
        scheduleText: 'Día 25 del periodo, 10:00 hora local',
        nextRunCdmx: null,
        lastRun: null,
        audienceEstimate: null,
        controlPct: 0.2,
        dailyCap: 2000,
        rampPct: 100,
        rampBranchIds: ['b1'],
        params: { minPts: 2000 },
        campaignKey: 'j3-cierre-p75',
        blockReason: 'La plantilla no existe en Meta',
      },
      {
        code: 'J2',
        name: 'Avance del periodo',
        category: 'UTILITY',
        template: { name: 'cuenta_avance_periodo', status: 'APPROVED', category: 'UTILITY', language: 'es_MX', quality: 'UNKNOWN' },
        enabled: false,
        sendTime: '10:00',
        scheduleText: 'Día 15 del periodo, 10:00 hora local',
        nextRunCdmx: 'dom 15 nov 10:00',
        lastRun: null,
        audienceEstimate: 9500,
        controlPct: 0,
        dailyCap: 2000,
        rampPct: 20,
        rampBranchIds: [],
        params: {},
        campaignKey: 'j2-avance-p75',
        blockReason: null,
      },
      { code: 'X9', name: 'no es un recorrido' },
      'basura',
    ],
  };
}

describe('adaptarRecorridos', () => {
  it('normaliza y ordena J1…J12; descarta lo que no es recorrido', () => {
    const o = adaptarRecorridos(overviewRaw());
    expect(o.period).toEqual({
      number: 75,
      name: 'NOVIEMBRE 2026',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      isClosed: false,
    });
    expect(o.journeys.map((j) => j.code)).toEqual(['J2', 'J3', 'J12']);
    expect(o.settings.enabled).toBe(true);
    expect(o.settings.monitorRecipients).toEqual([{ name: 'Monitor Uno', phone: '+521111111111', customerNumber: '12' }]);
    expect(o.settings.costs.marketingUsdMx).toBe(0.0305);
    expect(o.settings.fxUsdMxnFallback).toBeNull();
    expect(o.optInCount).toBe(0);
    expect(o.whatsappEnabled).toBe(true);
    expect(o.cronEnabled).toBe(true);
    const j12 = o.journeys[2];
    expect(j12.templateName).toBe('cuenta_preferencias');
    expect(j12.lastRun?.byError['131026']).toBe(6);
    expect(j12.lastRun?.delivered).toBeNull();
    const j3 = o.journeys[1];
    expect(j3.template).toBeNull();
    // El nombre configurado llega aunque la plantilla no exista en Meta.
    expect(j3.templateName).toBe('periodo_por_calificar');
    expect(j3.params).toEqual({ minPts: 2000 });
    expect(j3.rampBranchIds).toEqual(['b1']);
    // API viejo sin templateName: se cae al nombre de la plantilla de Meta.
    const viejo = adaptarRecorridos({ journeys: [{ code: 'J5', template: { name: 'cuenta_calificaste' } }] }).journeys[0];
    expect(viejo.templateName).toBe('cuenta_calificaste');
  });

  it('llave ausente = null / [] / apagado; basura no rompe', () => {
    const o = adaptarRecorridos('hola');
    expect(o.period).toBeNull();
    expect(o.journeys).toEqual([]);
    expect(o.settings).toMatchObject({ enabled: false, quietStart: '09:00', quietEnd: '20:00', hourlyCap: 5000, attributionDays: 7, monitorRecipients: [] });
    expect(o.settings.costs).toEqual({ marketingUsdMx: null, utilityUsdMx: null, utilityUsdUs: null, marketingUsdUs: null });
    expect(o.migrationPending).toBe(false);
    expect(o.optInCount).toBeNull();
    // Sin las banderas del servidor se asume habilitado (sin alertas falsas).
    expect(o.whatsappEnabled).toBe(true);
    expect(o.cronEnabled).toBe(true);
    expect(adaptarRecorridos({ whatsappEnabled: false, cronEnabled: false })).toMatchObject({ whatsappEnabled: false, cronEnabled: false });
    // skipped como mapa (forma alterna) también cuenta.
    const alt = adaptarRecorridos({ journeys: [{ code: 'J1', lastRun: { sent: 1, failed: 0, skipped: { control: 2, rampa: 3 } } }] });
    expect(alt.journeys[0].lastRun).toMatchObject({ skipped: 5, byReason: { control: 2, rampa: 3 } });
    expect(alt.journeys[0].category).toBe('UTILITY');
  });

  it('orden de códigos', () => {
    expect(['J10', 'J2', 'J1', 'J12'].sort((a, b) => ordenCodigo(a) - ordenCodigo(b))).toEqual(['J1', 'J2', 'J10', 'J12']);
    expect(ordenCodigo('nope')).toBe(999);
  });

  it('settings aislados y monitores recortados a 10', () => {
    const s = adaptarSettings({ monitorRecipients: Array.from({ length: 12 }, (_, i) => ({ name: `M${i}`, phone: '+521111111111' })) });
    expect(s.monitorRecipients).toHaveLength(MAX_MONITORES);
    expect(adaptarSettings(null).enabled).toBe(false);
  });
});

describe('etiquetas', () => {
  it('categoría, motivo, estado de corrida', () => {
    expect(etiquetaCategoria('MARKETING')).toBe('Marketing');
    expect(etiquetaCategoria('UTILITY')).toBe('Utilidad');
    expect(etiquetaCategoria(null)).toBe('—');
    expect(toneCategoriaRecorrido('MARKETING')).toBe('warning');
    expect(toneCategoriaRecorrido('UTILITY')).toBe('info');
    expect(etiquetaMotivo('sin_opt_in')).toBe('Sin consentimiento de promociones');
    expect(etiquetaMotivo('motivo_nuevo')).toBe('motivo nuevo');
    expect(motivosOrdenados({ control: 0, rampa: 30, opt_out: 20, raro: -1 })).toEqual([
      { id: 'rampa', etiqueta: 'Fuera de la rampa', n: 30 },
      { id: 'opt_out', etiqueta: 'Pidió baja total', n: 20 },
    ]);
    // Omitidos = skipped (60) − fallido (4) − sin_whatsapp (6) − detenido (0) = 50; "sin WhatsApp" aparte.
    expect(resumenCorrida(adaptarRecorridos(overviewRaw()).journeys[2].lastRun)).toBe(
      'mar 3 nov 10:00 · Terminada · 120 enviados · 4 fallidos · 6 sin WhatsApp · 50 omitidos',
    );
    expect(resumenCorrida(null)).toBe('Sin corridas todavía');
    const detenida = adaptarRecorridos({
      journeys: [{ code: 'J9', lastRun: { startedCdmx: 'x', status: 'stopped', sent: 20, failed: 9, skipped: 40, byReason: { fallido: 9, detenido: 30, control: 1 }, byError: {} } }],
    }).journeys[0].lastRun;
    expect(resumenCorrida(detenida)).toBe('x · Detenida (muchos fallos) · 20 enviados · 9 fallidos · 1 omitidos · 30 sin intentar');
    expect(omitidosNetos({ fallido: 2, sin_whatsapp: 3, detenido: 4, control: 5 })).toBe(5);
    expect(omitidosNetos({ fallido: 2, control: 5 }, 10)).toBe(8);
    expect(omitidosNetos({ fallido: 9 }, 3)).toBe(0);
    expect(sinWhatsAppDe({ '131026': 6 })).toBe(6);
    expect(sinWhatsAppDe(null)).toBe(0);
    expect(etiquetaMotivo('sin_whatsapp')).toBe('Sin WhatsApp (131026)');
    expect(etiquetaMotivo('detenido')).toBe('Sin intentar (la corrida se detuvo)');
    expect(controlTexto(0.2)).toBe('20% de control');
    expect(controlTexto(0)).toBe('Sin control');
    expect(CONTROL_OPCIONES).toEqual([0, 0.1, 0.2]);
  });

  it('estado de la plantilla en Meta y respaldo en la salud del canal', () => {
    expect(estadoPlantilla(null)).toMatchObject({ texto: 'No existe en Meta', variant: 'destructive', aprobada: false });
    expect(estadoPlantilla({ name: 'x', status: 'APPROVED', category: 'UTILITY', language: 'es_MX', quality: 'GREEN' })).toEqual({
      texto: 'Aprobada · calidad alta',
      variant: 'success',
      aprobada: true,
    });
    expect(estadoPlantilla({ name: 'x', status: 'PENDING', category: 'UTILITY', language: 'es_MX', quality: '' }).variant).toBe('warning');
    expect(estadoPlantilla({ name: 'x', status: 'APPROVED', category: 'UTILITY', language: 'es_MX', quality: 'RED' }).variant).toBe('warning');
    const canal = { templates: { items: [{ name: 'promo_mes', status: 'PENDING', category: 'MARKETING', language: 'es_MX', quality: 'UNKNOWN' }] } };
    expect(plantillaDeCanal(canal as never, 'promo_mes')?.status).toBe('PENDING');
    expect(plantillaDeCanal(canal as never, 'otra')).toBeNull();
    expect(plantillaDeCanal(undefined, 'promo_mes')).toBeNull();
  });
});

describe('gateRecorrido', () => {
  const base = () => adaptarRecorridos(overviewRaw());
  const input = (item: JourneyItem, extra: Partial<Parameters<typeof gateRecorrido>[0]> = {}) => ({
    item,
    canManage: true,
    masterEnabled: true,
    marketingPaused: false,
    optInCount: 10,
    migrationPending: false,
    ...extra,
  });

  it('sin permiso → bloqueado con motivo del permiso', () => {
    const g = gateRecorrido(input(base().journeys[2], { canManage: false }));
    expect(g.puede).toBe(false);
    expect(g.motivo).toContain('whatsapp:manage');
    expect(g.needsConfirm).toBe(false);
  });

  it('migración pendiente → bloqueado, y se explica antes que el permiso', () => {
    const g = gateRecorrido(input(base().journeys[2], { migrationPending: true }));
    expect(g.puede).toBe(false);
    expect(g.motivo).toMatch(/migración 185/);
    const sinPermiso = gateRecorrido(input(base().journeys[2], { migrationPending: true, canManage: false }));
    expect(sinPermiso.puede).toBe(false);
    expect(sinPermiso.motivo).toMatch(/migración 185/);
    expect(sinPermiso.motivo).not.toContain('whatsapp:manage');
  });

  it("'Marketing en pausa' es informativo: se puede encender con confirmación y un solo aviso", () => {
    const j12 = { ...base().journeys[2], enabled: false, blockReason: 'Marketing en pausa' };
    expect(esBloqueoInformativo(j12.blockReason)).toBe(true);
    const g = gateRecorrido(input(j12, { marketingPaused: true, optInCount: 10 }));
    expect(g).toMatchObject({ puede: true, motivo: null, needsConfirm: true });
    expect(g.avisos.filter((a) => a === AVISO_MARKETING_PAUSA)).toHaveLength(1);
    // Aunque la bandera global no venga, el blockReason del API basta para el aviso.
    const soloBlock = gateRecorrido(input(j12, { marketingPaused: false, optInCount: 10 }));
    expect(soloBlock.puede).toBe(true);
    expect(soloBlock.avisos).toEqual([AVISO_MARKETING_PAUSA]);
  });

  it('blockReason duro del API → bloqueado tal cual; apagar siempre se puede', () => {
    const j3 = base().journeys[1];
    const g = gateRecorrido(input(j3));
    expect(g).toMatchObject({ puede: false, motivo: 'La plantilla no existe en Meta', needsConfirm: false });
    // Encendido con bloqueo nuevo: se puede apagar y el bloqueo es aviso.
    const g2 = gateRecorrido(input({ ...j3, enabled: true }));
    expect(g2.puede).toBe(true);
    expect(g2.avisos).toContain('La plantilla no existe en Meta');
  });

  it('0 opt-in es informativo: se puede encender con confirmación y aviso', () => {
    const j12 = { ...base().journeys[2], blockReason: 'Sin consentimientos registrados (0 opt-in)' };
    expect(esBloqueoInformativo(j12.blockReason)).toBe(true);
    const g = gateRecorrido(input(j12, { optInCount: 0 }));
    expect(g.puede).toBe(true);
    expect(g.needsConfirm).toBe(true);
    expect(g.avisos.some((a) => /0 consentimientos/.test(a))).toBe(true);
    expect(g.avisos.filter((a) => /0 consentimientos/.test(a))).toHaveLength(1);
  });

  it('avisos de maestro apagado y marketing en pausa (solo Marketing)', () => {
    const g = gateRecorrido(input(base().journeys[2], { masterEnabled: false, marketingPaused: true }));
    expect(g.puede).toBe(true);
    expect(g.avisos.some((a) => /maestro/.test(a))).toBe(true);
    expect(g.avisos.some((a) => /pausa/.test(a))).toBe(true);
    const u = gateRecorrido(input(base().journeys[0], { marketingPaused: true, optInCount: 0 }));
    expect(u.avisos).toEqual([]);
  });

  it('algunoEncendido', () => {
    expect(algunoEncendido(base().journeys)).toBe(true);
    expect(algunoEncendido([{ enabled: false }])).toBe(false);
    expect(algunoEncendido(undefined)).toBe(false);
  });
});

describe('olaDeCorrida (OlaCard)', () => {
  it('mapea los códigos de Meta a tramos y cumple el invariante (failed = solo fallos reales)', () => {
    const j12 = adaptarRecorridos(overviewRaw()).journeys[2];
    const ola = olaDeCorrida(j12)!;
    // intentos = sent 120 + failed 4 + 131026 ×6 + network 0 = 130.
    expect(ola).toMatchObject({
      estado: 'enviada',
      intentos: 130,
      recibidos: 0,
      leidos: 0,
      sin_whatsapp: 6,
      tope_meta: 2,
      experimento_meta: 1,
      otros_fallos: 1,
      pendientes: 120,
      por_plantilla: null,
    });
    const tramos = tramosOla(ola);
    expect(tramos.reduce((a, t) => a + t.n, 0)).toBe(130);
    expect(tramos.find((t) => t.id === 'limite')?.n).toBe(3);
  });

  it('sent 120, failed 0, 131026: 6 → no lanza y cuadra', () => {
    const j = adaptarRecorridos({
      journeys: [{ code: 'J12', name: 'Preferencias', lastRun: { sent: 120, failed: 0, byError: { '131026': 6 } } }],
    }).journeys[0];
    const ola = olaDeCorrida(j)!;
    expect(ola).toMatchObject({ intentos: 126, sin_whatsapp: 6, otros_fallos: 0, pendientes: 120, tope_meta: 0 });
    expect(() => tramosOla(ola)).not.toThrow();
    expect(tramosOla(ola).reduce((a, t) => a + t.n, 0)).toBe(126);
  });

  it("'network' (incierto) suma a los intentos y queda en camino", () => {
    const j = adaptarRecorridos({
      journeys: [{ code: 'J2', name: 'Avance', lastRun: { sent: 50, failed: 2, delivered: 40, read: 10, byError: { network: 3, '131049': 2 } } }],
    }).journeys[0];
    const ola = olaDeCorrida(j)!;
    // intentos = 50 + 2 + 0 + 3 = 55; pendientes = 50 − 40 + 3 = 13; otros = 2 − 2 = 0.
    expect(ola).toMatchObject({ intentos: 55, recibidos: 40, leidos: 10, pendientes: 13, tope_meta: 2, otros_fallos: 0 });
    expect(tramosOla(ola).reduce((a, t) => a + t.n, 0)).toBe(55);
  });

  it('con entregas cruzadas: entregados y leídos salen del cruce', () => {
    const j = adaptarRecorridos({
      journeys: [{ code: 'J5', name: 'Calificaste', lastRun: { sent: 100, failed: 5, delivered: 80, read: 60, byError: { '131026': 5, '131053': 5 } } }],
    }).journeys[0];
    const ola = olaDeCorrida(j)!;
    expect(ola).toMatchObject({ intentos: 110, recibidos: 80, leidos: 60, pendientes: 20, sin_whatsapp: 5, otros_fallos: 5 });
    expect(() => tramosOla(ola)).not.toThrow();
    expect(olaDeCorrida({ code: 'J1', name: 'x', lastRun: null })).toBeNull();
  });

  it('corrida en curso', () => {
    const j = adaptarRecorridos({ journeys: [{ code: 'J9', name: 'Cumple', lastRun: { status: 'running', sent: 3, failed: 0 } }] }).journeys[0];
    expect(olaDeCorrida(j)?.estado).toBe('en curso');
  });
});

describe('ajustes de la tarjeta', () => {
  const j3 = adaptarRecorridos(overviewRaw()).journeys[1];

  it('borrador desde el recorrido y campos de params conocidos', () => {
    expect(camposParams('J9').map((c) => c.key)).toEqual(['giftText']);
    expect(camposParams('J1')).toEqual([]);
    const a = ajustesDe(j3);
    expect(a).toEqual({
      controlPct: 0.2,
      dailyCap: '2000',
      rampPct: '100',
      sendTime: '10:00',
      rampBranchIds: ['b1'],
      params: { minPts: '2000' },
      templateName: 'periodo_por_calificar',
    });
  });

  it('valida y arma el PATCH solo con lo que cambió', () => {
    const a = ajustesDe(j3);
    expect(validarAjustes(a)).toEqual([]);
    expect(patchDeAjustes(j3, a)).toEqual({});
    const b = { ...a, dailyCap: '500', sendTime: '11:30', params: { minPts: '2500' }, rampBranchIds: ['b1'] };
    expect(patchDeAjustes(j3, b)).toEqual({ dailyCap: 500, sendTime: '11:30', params: { minPts: 2500 } });
    // Un campo vaciado viaja como null: el API borra ese parámetro.
    const c = { ...a, params: { minPts: '' }, rampBranchIds: [] };
    expect(patchDeAjustes(j3, c)).toEqual({ rampBranchIds: [], params: { minPts: null } });
    expect(validarAjustes({ ...a, dailyCap: '0', rampPct: '101', sendTime: '25:00', controlPct: 0.5 })).toHaveLength(4);
  });

  it('plantilla en Meta: solo va en el PATCH si cambia; vacía = no tocarla; nombre inválido se rechaza', () => {
    const a = ajustesDe(j3);
    expect(patchDeAjustes(j3, { ...a, templateName: ' periodo_por_calificar_v2 ' })).toEqual({ templateName: 'periodo_por_calificar_v2' });
    expect(patchDeAjustes(j3, { ...a, templateName: '' })).toEqual({});
    expect(validarAjustes({ ...a, templateName: '' })).toEqual([]);
    expect(validarAjustes({ ...a, templateName: 'Promo Mes' })).toHaveLength(1);
    expect(validarAjustes({ ...a, templateName: 'promo_mes_2026' })).toEqual([]);
    // Sin nombre en el API (viejo) el borrador arranca vacío y no manda nada.
    const sinNombre = { ...j3, templateName: null, template: null };
    expect(ajustesDe(sinNombre).templateName).toBe('');
    expect(patchDeAjustes(sinNombre, ajustesDe(sinNombre))).toEqual({});
  });
});

describe('configuración global', () => {
  const settings = (): JourneysSettings => adaptarRecorridos(overviewRaw()).settings;

  it('valida horas, topes, monitores y tarifas', () => {
    expect(validarSettings(settings())).toEqual([]);
    const malo = settings();
    malo.quietStart = '21:00';
    malo.hourlyCap = 0;
    malo.attributionDays = 90;
    malo.monitorRecipients = [{ name: '', phone: '123' }];
    malo.costs.utilityUsdMx = -1;
    malo.fxUsdMxnFallback = 0;
    const errores = validarSettings(malo);
    expect(errores.length).toBe(7);
    expect(errores.some((e) => /inicio debe ser menor/.test(e))).toBe(true);
  });

  it('payload con solo las llaves del contrato; sin las cuatro tarifas no se manda costs', () => {
    const completo = payloadSettings(settings());
    expect(Object.keys(completo).sort()).toEqual(['attributionDays', 'costs', 'enabled', 'hourlyCap', 'monitorRecipients', 'quietEnd', 'quietStart']);
    expect(Object.keys(completo.costs ?? {}).sort()).toEqual(['marketingUsdMx', 'marketingUsdUs', 'utilityUsdMx', 'utilityUsdUs']);
    // JourneysCostsDto del API exige las cuatro: con una vacía no se manda `costs` y validarSettings lo reporta.
    const s = settings();
    s.costs.utilityUsdUs = null;
    const p = payloadSettings(s);
    expect(Object.keys(p).sort()).toEqual(['attributionDays', 'enabled', 'hourlyCap', 'monitorRecipients', 'quietEnd', 'quietStart']);
    expect(validarSettings(s)).toEqual(['Falta la tarifa de Utilidad · EE. UU. (USD por mensaje).']);
    expect(p.monitorRecipients).toEqual([{ name: 'Monitor Uno', phone: '+521111111111', customerNumber: '12' }]);
    expect(telefonosDePrueba([{ name: 'a', phone: '+521111111111' }, { name: 'b', phone: '55' }])).toHaveLength(1);
  });

  it('valores sugeridos: las cuatro tarifas y el tipo de cambio de respaldo; lo demás intacto', () => {
    expect(TARIFAS_SUGERIDAS).toEqual({ marketingUsdMx: 0.0305, utilityUsdMx: 0.0034, marketingUsdUs: 0.0305, utilityUsdUs: 0.0085 });
    expect(FX_SUGERIDO).toBe(18.8);
    const s = settings();
    s.costs = { marketingUsdMx: null, utilityUsdMx: 1, utilityUsdUs: null, marketingUsdUs: null };
    s.fxUsdMxnFallback = null;
    const r = conValoresSugeridos(s);
    expect(r.costs).toEqual(TARIFAS_SUGERIDAS);
    expect(r.costs).not.toBe(TARIFAS_SUGERIDAS);
    expect(r.fxUsdMxnFallback).toBe(18.8);
    expect(r.monitorRecipients).toEqual(s.monitorRecipients);
    expect(validarSettings(r)).toEqual([]);
    expect(payloadSettings(r).costs).toEqual(TARIFAS_SUGERIDAS);
  });
});

describe('preview, corridas y prueba', () => {
  it('preview tolerante con muestra recortada a 20 y alcance completo (audience) aparte de los evaluados', () => {
    const p = adaptarPreview({
      period: { number: 75, name: 'NOVIEMBRE 2026' },
      eligible: 100,
      byReason: { control: 20, rampa: 'x' },
      wouldSend: 80,
      control: 20,
      audience: 4500,
      sample: Array.from({ length: 25 }, (_, i) => ({ customerNumber: `${i}`, firstName: 'N', branch: 'S', points: i, reason: null })),
    });
    expect(p.period?.number).toBe(75);
    expect(p.byReason).toEqual({ control: 20 });
    expect(p.sample).toHaveLength(20);
    expect(p.audience).toBe(4500);
    expect(adaptarPreview(null)).toMatchObject({ eligible: 0, wouldSend: 0, control: 0, audience: null, sample: [], period: null });
    expect(adaptarPreview({ eligible: 5, audience: 'muchos' }).audience).toBeNull();
  });

  it('corridas: arreglo o {data}', () => {
    const runs = adaptarRuns({
      data: [
        { id: 'r1', code: 'J3', status: 'done', source: 'cron', startedCdmx: 'x', counts: { sent: 1, skipped: { control: 2 } } },
        { id: 'r2', status: 'done' },
      ],
    });
    expect(runs).toHaveLength(1);
    expect(runs[0].counts).toMatchObject({ sent: 1, skipped: { control: 2 }, failed: null });
    // Tabla de corridas: omitidos netos y "sin WhatsApp" desde los contadores del API.
    const corrida = adaptarRuns([
      { id: 'r3', code: 'J7', status: 'done', counts: { sent: 10, failed: 2, skipped: { control: 3, fallido: 2, sin_whatsapp: 4, detenido: 0, limite: 1 }, byError: { '131026': 4, '131049': 2 } } },
    ])[0];
    expect(omitidosNetos(corrida.counts.skipped)).toBe(4);
    expect(sinWhatsAppDe(corrida.counts.byError)).toBe(4);
    expect(adaptarRuns([{ runKey: 'J1:p75', journeyCode: 'J1', status: 'raro' }])[0]).toMatchObject({ id: 'J1:p75', code: 'J1', status: 'raro' });
    expect(adaptarRuns('x')).toEqual([]);
    expect(adaptarRunResult({ status: 'stopped', counts: { sent: 20 }, error: 'muchos fallos' })).toMatchObject({ status: 'stopped', error: 'muchos fallos' });
    expect(adaptarRunResult(null)).toEqual({ status: null, counts: null, error: null, message: null });
    // JourneyRunOutcome del API: ran:false + reason (200), monitores como {sent, failed, skipped}.
    expect(
      adaptarRunResult({
        code: 'J3',
        ran: false,
        reason: 'sin_candidatos',
        runKey: null,
        runId: null,
        status: 'skipped',
        counts: { sent: 0, monitors: { sent: 1, failed: 0, skipped: 0 } },
      }),
    ).toMatchObject({
      status: 'skipped',
      error: null,
      message: 'No había a quién enviarle (nadie cumple el segmento hoy)',
      counts: { sent: 0, monitors: 1 },
    });
    expect(
      adaptarRunResult({ ran: true, runId: 'r9', code: 'J3', status: 'stopped', reason: 'fallos_mayores_30pct', counts: {} }),
    ).toMatchObject({ status: 'stopped', message: 'Se detuvo: más del 30 % de los intentos fallaron en Meta' });
    expect(adaptarRunResult({ status: 'done', reason: 'motivo_nuevo' }).message).toBe('motivo nuevo');
  });

  it('resultado de la prueba', () => {
    expect(adaptarTestResult({ success: true, wamid: 'w' })).toEqual({
      success: true,
      wamid: 'w',
      errorCode: null,
      error: null,
      messages: [],
    });
    // J8 dice qué promoción mandó (solo la de hoy).
    expect(adaptarTestResult({ success: true, wamid: 'w', messages: ['Hoy: 3x2 Buen Fin sábado 14', 7] }).messages).toEqual([
      'Hoy: 3x2 Buen Fin sábado 14',
    ]);
    expect(adaptarTestResult(undefined).success).toBe(false);
  });
});

describe('privacidad del fixture', () => {
  it('solo agregados: sin teléfonos reales, correos, UUID ni wamid', () => {
    const txt = JSON.stringify(overviewRaw()).replace(/\+521111111111/g, '');
    const sinCodigos = txt.replace(/\b(131026|131049|130472|131053)\b/g, '');
    expect(sinCodigos).not.toMatch(/\d{7,}/);
    expect(txt).not.toMatch(/wamid/i);
    expect(txt).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    expect(txt).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });
});

describe('J8: promoción del día (Productos › Temporadas)', () => {
  const promoRaw = {
    source: 'temporadas',
    frequency: 'una',
    sundays: true,
    today: {
      date: '2026-11-14',
      seasonName: 'Buen Fin 2026',
      title: '3x2 Buen Fin sábado 14',
      text: 'Sucursales, e-commerce y Call Center. Hasta agotar existencias.',
      validity: 'solo hoy, sábado 14 de noviembre',
      imageUrl: 'https://api.example.com/promo-sabado.png',
      promoCodes: ['BUENFIN2026-3X2BUENFINSABADO'],
    },
  };
  const j8 = (over: Record<string, unknown> = {}): JourneyItem =>
    adaptarRecorridos({
      journeys: [{ code: 'J8', name: 'Promoción del mes', category: 'MARKETING', templateName: 'promo_mes', params: {}, promo: promoRaw, ...over }],
    }).journeys[0];

  it('adapta el bloque promo y lo deja en null en los demás recorridos o con un API anterior', () => {
    const item = j8();
    expect(item.promo).toEqual({
      source: 'temporadas',
      frequency: 'una',
      sundays: true,
      today: promoRaw.today,
      notice: null,
    });
    // Solo la de HOY: aunque un API viejo mande la siguiente, la web no la conserva ni la enseña.
    const conSiguiente = j8({
      promo: { ...promoRaw, next: { date: '2026-11-15', seasonName: 'Buen Fin 2026', title: '3x2 Buen Fin domingo 15' } },
    });
    expect(conSiguiente.promo).not.toHaveProperty('next');
    expect(JSON.stringify(conSiguiente.promo)).not.toMatch(/domingo 15/);
    // Frecuencia: 'una' por defecto (también con un valor desconocido); las otras dos se respetan.
    expect(j8({ promo: { ...promoRaw, frequency: undefined } }).promo?.frequency).toBe('una');
    expect(j8({ promo: { ...promoRaw, frequency: 'semanal' } }).promo?.frequency).toBe('una');
    expect(j8({ promo: { ...promoRaw, frequency: 'alterna' } }).promo?.frequency).toBe('alterna');
    expect(j8({ promo: { ...promoRaw, frequency: 'diaria' } }).promo?.frequency).toBe('diaria');
    // Promoción de hoy sin arte usable: imageUrl queda en null.
    expect(j8({ promo: { ...promoRaw, today: { ...promoRaw.today, imageUrl: '' } } }).promo?.today?.imageUrl).toBeNull();
    expect(j8({ promo: { ...promoRaw, notice: 'La hora de envío de hoy ya pasó' } }).promo?.notice).toBe(
      'La hora de envío de hoy ya pasó',
    );
    expect(j8({ promo: undefined }).promo).toBeNull();
    expect(adaptarRecorridos(overviewRaw()).journeys.every((j) => j.promo === null)).toBe(true);
    expect(adaptarPromo({ source: 'manual', frequency: 'diaria', sundays: false, today: { title: 'sin fecha' } })).toEqual({
      source: 'manual',
      frequency: 'diaria',
      sundays: false,
      today: null,
      notice: null,
    });
    expect(adaptarPromo('x')).toBeNull();
  });

  it('los ajustes de J8 arrancan con sus valores por defecto (Temporadas, una sola por temporada, domingos sí)', () => {
    expect(camposParams('J8').map((c) => c.key)).toEqual([
      'temporadas',
      'frecuencia',
      'domingos',
      'date',
      'title',
      'validity',
      'bodyText',
      'imageUrl',
    ]);
    const a = ajustesDe(j8());
    expect(a.params).toEqual({
      temporadas: 'si',
      frecuencia: 'una',
      domingos: 'si',
      date: '',
      title: '',
      validity: '',
      bodyText: '',
      imageUrl: '',
    });
    // Sin tocar nada no se manda nada (los valores por defecto no se guardan solos).
    expect(patchDeAjustes(j8(), a)).toEqual({});
  });

  it('una opción viaja siempre con su valor (también al volver a la de por defecto) y un texto vaciado viaja como null', () => {
    const item = j8({ params: { frecuencia: 'diaria', domingos: 'no', date: '2026-11-20', bodyText: '2x1' } });
    const a = ajustesDe(item);
    expect(a.params).toMatchObject({ frecuencia: 'diaria', domingos: 'no', temporadas: 'si', date: '2026-11-20' });
    expect(
      patchDeAjustes(item, { ...a, params: { ...a.params, frecuencia: 'una', domingos: 'si', date: '', bodyText: '' } }),
    ).toEqual({
      params: { frecuencia: 'una', domingos: 'si', date: null, bodyText: null },
    });
    // Un "alterna" guardado antes se respeta (no se pisa con el valor por defecto nuevo).
    const guardado = j8({ params: { frecuencia: 'alterna' } });
    expect(ajustesDe(guardado).params.frecuencia).toBe('alterna');
    expect(patchDeAjustes(guardado, ajustesDe(guardado))).toEqual({});
    expect(patchDeAjustes(j8(), { ...ajustesDe(j8()), params: { ...ajustesDe(j8()).params, frecuencia: 'diaria' } })).toEqual({
      params: { frecuencia: 'diaria' },
    });
  });

  it('valorOpcion entiende true/false guardados por API y cae al valor por defecto con algo raro', () => {
    const [temporadas, frecuencia] = camposParams('J8');
    expect(valorOpcion(temporadas, false)).toBe('no');
    expect(valorOpcion(temporadas, true)).toBe('si');
    expect(valorOpcion(temporadas, undefined)).toBe('si');
    expect(valorOpcion(frecuencia, 'semanal')).toBe('una');
    expect(valorOpcion(frecuencia, undefined)).toBe('una');
    expect(valorOpcion(frecuencia, 'una')).toBe('una');
    expect(valorOpcion(frecuencia, 'alterna')).toBe('alterna');
    expect(valorOpcion(frecuencia, 'diaria')).toBe('diaria');
    expect(frecuencia.opciones?.map((o) => o.value)).toEqual(['una', 'alterna', 'diaria']);
  });

  it('etiquetas de los motivos nuevos', () => {
    expect(etiquetaMotivo('otro_dia')).toMatch(/otro día de la temporada/);
    expect(etiquetaMotivo('una_por_temporada')).toMatch(/Ya recibió su promoción/);
    expect(etiquetaMotivoCorrida('promocion_sin_empezar')).toMatch(/todavía no empieza/);
    expect(etiquetaMotivoCorrida('sin_promocion')).toMatch(/Productos › Temporadas/);
    expect(etiquetaMotivoCorrida('plantilla_no_valida')).toMatch(/arte/);
  });
});
