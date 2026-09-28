import { describe, expect, it } from 'vitest';
import tableroV1 from './__fixtures__/tablero-v1.json';
import { adaptarDashboard, toneEfecto } from './format';
import { money, moneyCorto } from './numeros';
import {
  REGLAS_DECISION,
  acumularTickets,
  adaptarComplementos,
  adaptarDerrame,
  adaptarImpacto,
  adaptarVentasCierres,
  campanaSeleccionada,
  campanasPrincipales,
  claveVeredictoDerrame,
  comparacionesResumen,
  curvaTickets,
  deltaPct,
  esCampanaHija,
  estimacion,
  filaPrincipalDerrame,
  horaDe,
  icTexto,
  opcionesSelector,
  pTexto,
  poblacionesDerrame,
  rangoTexto,
  reglaDecision,
  resultadoRegla,
  tablaDerrame,
  tituloCierre,
  veredictoDerrame,
} from './reportes';
import type { CampaignListItem, VentasTPV } from '@/types/whatsappCampaign';

// Fixtures = SOLO agregados, con la forma que devuelve el API (los reportes
// oficiales del cierre de septiembre 2026, redondeados). Sin personas.

const impactoV1 = {
  tipo: 'oficial',
  corte: '2026-09-25 23:59',
  puntos: { efecto: 70.2, ic_bajo: -86.4, ic_alto: 211.9, p: 0.41 },
  calificacion_pp: { efecto: 4.8, ic_bajo: -0.7, ic_alto: 10.2, p: 0.09 },
  compra_pp: { efecto: 5.6, ic_bajo: -0.2, ic_alto: 11.4 },
  veredicto: 'NO CONCLUYENTE: el intervalo incluye el 0.',
  mde_pts: '230',
  mde_pp: '8.3',
};

const impactoExtendido = {
  ...impactoV1,
  lectura: 'OFICIAL (lunes 28 o después)',
  regla_decision: {
    resultado: 'no_concluyente',
    texto: 'No concluyente: el IC95 incluye el 0.',
    reglas: ['r1', 'r2', 'r3', 'r4'],
  },
  retorno: {
    venta_incremental_mxn: { efecto: 98150, ic_bajo: -210601, ic_alto: 398090, p: null },
    venta_sin_recorte_mxn: { efecto: 78761, ic95: [-264549, 403503] },
    pts_incrementales: { efecto: 131909, ic_bajo: -162643, ic_alto: 402472, p: null },
    costo_meta_mxn: 1504.26,
    costo_lid_mxn: 37.87,
    costo_total_campana_mxn: 2356.08,
    venta_por_peso: { efecto: 65.25, ic_bajo: -140, ic_alto: 264.64, p: null },
    retorno: null,
    nota: 'Sin margen: no hay costo de producto.',
  },
  cace: { pct_entregado: 0.7404, efecto: 94, ic_bajo: -115.9, ic_alto: 286.9, efecto_leido: 112.8 },
  por_subestrato: [
    { sub: 'P4', nt: 217, nc: 16, media_t: 923.5, media_c: 498.9, efecto: 344.5, ic_bajo: -150.1, ic_alto: 795.9, ic_bonf_bajo: -330.4, ic_bonf_alto: 903.9 },
    { nope: true },
  ],
  sensibilidades: [
    { id: 'sens_sin_contagio', nombre: 'Sin contagio', efecto: 94.5, ic_bajo: -65, ic_alto: 233.9, p: 0.289 },
    { id: 'sens_sin_cuped', efecto: 70.2, ic95: [-83.7, 218], p_perm: 0.416 },
  ],
  venta_confiable: null,
};

const ventasApi = {
  version: 1,
  lectura: 'oficial',
  fuente: 'legacy (hora real de captura)',
  generado_cdmx: '2026-09-28 13:20',
  corte_hoy: '2026-09-25 23:50',
  hoy: { fecha: '2026-09-25', dia: 'vie 25', al_corte: { tickets: 3318, pts: 3584294, venta: 4105159 } },
  mediana_al_corte: { tickets: 3182, pts: 3211168, venta: 4087180 },
  media_al_corte: { tickets: 3367, pts: 3429165, venta: 4430909 },
  hoy_vs_mediana_pct: { tickets: 4.3, pts: 11.6, venta: 0.4 },
  hoy_vs_media_pct: { tickets: -1.5, pts: 4.5, venta: -7.4 },
  cierres: [
    { n: 72, nombre: 'AGOSTO 2026', fecha: '2026-08-25', dia: 'mar 25', al_corte: { tickets: 3332, pts: 3333474, venta: 3994278 }, total_dia: { tickets: 3334, pts: 3337374, venta: 3998551 } },
    { n: 71, nombre: 'JULIO 2026', fecha: '2026-07-25', dia: 'sáb 25', al_corte: { tickets: 2652, pts: 2460391, venta: 4012194 }, total_dia: { tickets: 2653, pts: 2461017, venta: 4012920 } },
    { basura: true },
  ],
  semana: [
    { fecha: '2026-09-24', dia: 'jue 24', es_hoy: false, tickets: 1824, pts: 1629270, venta: 1821770 },
    { fecha: '2026-09-25', dia: 'vie 25', es_hoy: true, tickets: 3318, pts: 3584294, venta: 4105159 },
  ],
  por_hora: {
    horas: Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`),
    hoy: Array.from({ length: 24 }, (_, h) => ({ tickets: h >= 8 && h <= 20 ? 100 : 0, pts: 0, venta: 0 })),
    promedio_cierres: Array.from({ length: 24 }, (_, h) => ({ tickets: h >= 9 && h <= 21 ? 90 : 0, pts: 0, venta: 0 })),
    ayer: null,
    viernes_anterior: { fecha: '2026-09-18', dia: 'vie 18', serie: Array.from({ length: 24 }, () => ({ tickets: 10, pts: 0, venta: 0 })) },
  },
  olas: [
    { ola: '1', desde: '2026-09-24 17:13', hasta: '2026-09-24 18:07', n: 2021 },
    { ola: '2', desde: '2026-09-25 08:07', hasta: '2026-09-25 08:46', n: 1426 },
    { ola: 'felicitacion', desde: '2026-09-25 09:44', hasta: '2026-09-25 15:38', n: 132 },
    { ola: '3', desde: '2026-09-25 13:33', hasta: '2026-09-25 13:55', n: 831 },
    { ola: 'extra', desde: '2026-09-25 19:31', hasta: '2026-09-25 20:09', n: 2528 },
  ],
  dia_completo: {
    actual: 73,
    comparaciones: {
      dia_cierre: {
        tickets: { actual: 3318, mediana_prev: 3183, media_prev: 3368, min_prev: 2410, max_prev: 4876, rango_de_7: 4, vs_mediana_pct: 4.2, vs_media_pct: -1.5 },
        pts: { actual: 3584294, mediana_prev: 3213118, media_prev: 3430993, min_prev: 2461017, max_prev: 5088861, rango_de_7: 3, vs_mediana_pct: 11.6, vs_media_pct: 4.5 },
        venta: { actual: 4105159, mediana_prev: 4248293, media_prev: 4486263, min_prev: 2186360, max_prev: 6318341, rango_de_7: 4, vs_mediana_pct: -3.4, vs_media_pct: -8.5 },
      },
      periodo: {
        tickets: { actual: 38409, mediana_prev: 37015, media_prev: 36440, min_prev: 31695, max_prev: 39104, rango_de_7: 2, vs_mediana_pct: 3.8, vs_media_pct: 5.4 },
        pts: null,
        venta: { actual: 44023384, mediana_prev: 45486411, media_prev: 46041291, min_prev: 40749320, max_prev: 51944765, rango_de_7: 5, vs_mediana_pct: -3.2, vs_media_pct: -4.4 },
      },
      rara: { tickets: {} },
    },
    periodos: [
      { n: 73, nombre: 'SEPTIEMBRE 2026', ini: '2026-08-26', fin: '2026-09-25', dow_cierre: 'vie', es_actual: true, dia_cierre: { tickets: 3318, pts: 3584294, venta: 4105159 }, ult2: null, ult5: null, previos4: null, periodo: { tickets: 38409, pts: 36359105, venta: 44023384 }, compradores: 10983, compradores_dia_cierre: null, calificados: 6125, pct_calif_de_con_puntos: 58.6, participacion: { tickets: { dia_cierre_pct: 8.6, ult5_pct: 27 }, pts: null, venta: null } },
      { n: 67, nombre: 'MARZO 2026', ini: '2026-02-26', fin: '2026-03-25', dow_cierre: 'mié', es_actual: false, dia_cierre: { tickets: 3032, pts: 3088862, venta: 5917742 }, ult2: null, ult5: null, previos4: null, periodo: null, compradores: null, compradores_dia_cierre: null, calificados: 5178, pct_calif_de_con_puntos: 54.8, participacion: null },
    ],
  },
  segmentos_vs_base: {
    segmentos: [
      { id: 'P4', tratados: { n: 217, pct_califica: 35.6, pct_compra: 45.6, dpts_media: 939, venta_mxn_media: 1016 }, control: { n: 16, pct_califica: 28.6, pct_compra: 31.3, dpts_media: 499, venta_mxn_media: 547 }, base_pct_califica: 32.7, base_pct_compra: 43.2, base_dpts_media: 760, califica_pp: { trat_vs_base: 2.9, ctrl_vs_base: -4.1, trat_vs_ctrl: 7 }, compra_pp: { trat_vs_base: 2.4, ctrl_vs_base: -11.9, trat_vs_ctrl: 14.3 } },
    ],
    total: { id: 'total', tratados: { n: 1895, pct_califica: 20, pct_compra: 23.9, dpts_media: 504.6, venta_mxn_media: 514.3 }, control: { n: 214, pct_califica: 14.8, pct_compra: 18.3, dpts_media: 424.5, venta_mxn_media: 440.2 }, base_pct_califica: 19.3, base_pct_compra: 23.6, base_dpts_media: 461.4, califica_pp: { trat_vs_base: 0.7, ctrl_vs_base: -4.5, trat_vs_ctrl: 5.2 }, compra_pp: { trat_vs_base: 0.3, ctrl_vs_base: -5.3, trat_vs_ctrl: 5.6 } },
  },
  notas: ['Fuente: sistema anterior.', 42],
};

const filaFrontales = {
  vecindario: 'frontales',
  nombre: 'Frontales (nivel 1)',
  n_t: 1895,
  n_c: 214,
  con_vecinos_t: 199,
  con_vecinos_c: 19,
  vecinos_t: 1540,
  vecinos_c: 260,
  pts: { media_t: 40.4, media_c: 4.2, efecto: 31, ic_bajo: -37.9, ic_alto: 88.8, p: 0.27, mde: 88.1, n_t: 1895, n_c: 214 },
  compraron: { media_t: 0.025, media_c: 0.014, efecto: 0.008, ic_bajo: -0.017, ic_alto: 0.028, p: 0.506, mde: 0.032, n_t: 1895, n_c: 214 },
  cruzaron: null,
  venta: { media_t: 43.1, media_c: 4.2, efecto: 33.7, ic_bajo: -38.9, ic_alto: 95.1, p: 0.263, mde: 93.1, n_t: 1895, n_c: 214 },
  pts_sin_cuped: null,
  pts_sin_recorte: null,
};

const derrameApi = {
  version: 1,
  tipo: 'derrame',
  lectura: 'oficial',
  campana: 'cierre-p73',
  corte: '2026-09-25 23:59:59',
  t0_cdmx: '2026-09-24 17:13:20',
  t0_extra_cdmx: '2026-09-25 19:31:00',
  generado_cdmx: '2026-09-28 14:55',
  fuente_red: 'legacy t_period_red nivel 1 y 2',
  excluidos_con_mensaje: 5972,
  veredicto: 'NO_CONCLUYENTE',
  veredicto_texto: 'No concluyente: +31 pts por índice (IC95 -38 a +89; p = 0.27).',
  mde_pts: 88.1,
  tablas: [
    { poblacion: 'principal', unidad: 'suma_por_indice', filas: [filaFrontales, { ...filaFrontales, vecindario: 'patrocinador', nombre: 'Patrocinador (1 arriba)' }, { sin_vecindario: 1 }] },
    { poblacion: 'principal', unidad: 'por_vecino', filas: [{ ...filaFrontales, n_t: 199, n_c: 19 }] },
    { poblacion: 'extra', unidad: 'suma_por_indice', filas: [{ ...filaFrontales, n_t: 2553, n_c: 295 }] },
    { poblacion: 'principal' },
  ],
  lid: {
    conocido: { fuente: 'reporte-final-…', metrica: 'pts de sus frontales', efecto: -453.1, ic95: [-1921.2, 734.2], p: 0.406, n_t: 126, n_c: 16, frontales_calif: { efecto: -0.1, ic95: [-0.7, 0.5], p: 0.769 } },
    sin_mensaje: [],
    con_lid_7_estratos: [],
  },
  vecinos_unicos: {
    frontales: { unicos_t: 1540, unicos_c: 260, en_ambos_grupos: 0, con_mas_de_un_indice: 0, solo_t: { vecinos: 1540, dpts: 76532, compraron: 48, cruzaron: 13, venta: 81714.02, por_indice: { vecinos: 0.81, dpts: 40.4, compraron: 0.025, venta: 43.1 } }, solo_c: null },
  },
  tiempo_lectura: {
    principal: {
      tratados: { indices: 1895, con_lectura: 1195, vecinos: 2392, docs_antes: 9, docs_despues: 208, pts_antes: 15445, pts_despues: 403385, tasa_docs_h_antes: 0.002, tasa_docs_h_despues: 0.007, share_pts_despues: 0.963, vecinos_compraron_despues: 175, docs_24h: 178, horas_antes_media: 4.2 },
      control_lectura_ficticia: { indices: 214, con_lectura: 214, vecinos: 770, docs_antes: 1, docs_despues: 35, pts_antes: 782, pts_despues: 115252, tasa_docs_h_antes: 0.001, tasa_docs_h_despues: 0.006, share_pts_despues: 0.993, vecinos_compraron_despues: 32, docs_24h: 27, horas_antes_media: 4.8 },
    },
    extra: null,
    nota: 'Descriptivo.',
  },
  sucursales: {
    totales: {
      '73': { ventana: ['2026-09-24 17:13:20', '2026-09-25 23:59:59'], sin_msg: { compradores: 1364, pts: 2421917, tickets: 2300 }, con_msg: { compradores: 939, pts: 1469561, tickets: 1342 } },
      '72': { ventana: ['2026-08-24 17:13:20', '2026-08-25 23:59:59'], sin_msg: { compradores: 1337, pts: 2012176, tickets: 2163 }, con_msg: null },
    },
    corr_tratados_vs_cambio: -0.07,
    sucursales_con_datos: 60,
    nota: 'Descriptivo: no hay sucursales sin campaña.',
  },
  notas: ['Control del 10%: intervalos anchos.', 'Un vecino con mensaje nunca cuenta.'],
};

const lista: CampaignListItem[] = [
  { key: 'cierre-p73', nombre: 'Cierre de septiembre 2026', estado: 'activa', periodo: { numero: 73, nombre: 'SEPTIEMBRE 2026', inicio: '2026-08-26', fin: '2026-09-25', cerrado: true }, t0_cdmx: 'jue 24 17:13', tratados: 2021, control: 230, ultimo_envio_cdmx: 'vie 25 15:37', padre: null },
  { key: 'cierre-p73-extra', nombre: 'Última llamada (ola extra)', estado: 'activa', periodo: { numero: 73, nombre: 'SEPTIEMBRE 2026', inicio: '2026-08-26', fin: '2026-09-25', cerrado: true }, t0_cdmx: 'vie 25 19:31', tratados: 2553, control: 295, ultimo_envio_cdmx: 'vie 25 20:09', padre: 'cierre-p73' },
];

describe('estimaciones', () => {
  it('acepta las tres formas y devuelve null sin números', () => {
    expect(estimacion({ efecto: 1, ic_bajo: -1, ic_alto: 2, p: 0.5 })).toEqual({ efecto: 1, ic_bajo: -1, ic_alto: 2, p: 0.5 });
    expect(estimacion({ efecto: 70.2, ic95: [-86.4, 211.9], p_perm: 0.41 })).toEqual({ efecto: 70.2, ic_bajo: -86.4, ic_alto: 211.9, p: 0.41 });
    expect(estimacion({ est: 26548, lo: -33071, hi: 86167 })).toEqual({ efecto: 26548, ic_bajo: -33071, ic_alto: 86167, p: null });
    expect(estimacion({ dif: -0.3, lo: -2.3, hi: 0.5 })?.efecto).toBe(-0.3);
    expect(estimacion({ nota: 'x' })).toBeNull();
    expect(estimacion(null)).toBeNull();
    expect(estimacion([1, 2])).toBeNull();
  });

  it('textos del intervalo y de p', () => {
    expect(icTexto({ ic_bajo: -37.9, ic_alto: 88.8 }, 0, ' pts')).toBe('de -38 a +89 pts');
    expect(icTexto({ ic_bajo: null, ic_alto: 1 })).toBe('—');
    expect(icTexto(null)).toBe('—');
    expect(pTexto(0.27)).toBe('p = 0.27');
    expect(pTexto(null)).toBe('');
  });
});

describe('regla de decisión (plan §6)', () => {
  it('aplica las cuatro reglas en orden', () => {
    expect(reglaDecision(10, 200)).toBe('funciono');
    expect(reglaDecision(-200, -10)).toBe('hizo_dano');
    expect(reglaDecision(-10, 50)).toBe('no_funciono');
    expect(reglaDecision(-86.4, 211.9)).toBe('no_concluyente');
    expect(reglaDecision(null, 5)).toBeNull();
  });

  it('resultadoRegla da texto, tono e índice; desconocido = sin veredicto', () => {
    expect(resultadoRegla('funciono')).toMatchObject({ texto: 'Funcionó', variant: 'success', indice: 0 });
    expect(resultadoRegla('hizo_dano')).toMatchObject({ variant: 'destructive', indice: 1 });
    expect(resultadoRegla('no_funciono')).toMatchObject({ variant: 'warning', indice: 2 });
    expect(resultadoRegla('no_concluyente')).toMatchObject({ texto: 'No concluyente', variant: 'info', indice: 3 });
    expect(resultadoRegla('no_concluyente').siguiente).toMatch(/20%/);
    expect(resultadoRegla('x')).toMatchObject({ texto: 'Sin veredicto', variant: 'outline', indice: null });
    expect(resultadoRegla(null).indice).toBeNull();
    expect(REGLAS_DECISION).toHaveLength(4);
  });
});

describe('adaptarImpacto', () => {
  it('v1 sin llaves nuevas: las rellena y deriva la regla del IC de puntos', () => {
    const im = adaptarImpacto(impactoV1)!;
    expect(im.tipo).toBe('oficial');
    expect(im.puntos).toEqual({ efecto: 70.2, ic_bajo: -86.4, ic_alto: 211.9, p: 0.41 });
    expect(im.compra_pp?.p).toBeNull();
    expect(im.lectura).toBeNull();
    expect(im.regla_decision).toEqual({ resultado: 'no_concluyente', texto: null, reglas: [...REGLAS_DECISION] });
    expect(im.retorno).toBeNull();
    expect(im.cace).toBeNull();
    expect(im.por_subestrato).toEqual([]);
    expect(im.sensibilidades).toEqual([]);
    expect(im.venta_confiable).toBeNull();
    expect(im.mde_pts).toBe('230');
  });

  it('extendido: respeta la regla del API, retorno, CACE, subestratos y sensibilidades', () => {
    const im = adaptarImpacto(impactoExtendido)!;
    expect(im.lectura).toBe('OFICIAL (lunes 28 o después)');
    expect(im.regla_decision).toEqual({ resultado: 'no_concluyente', texto: 'No concluyente: el IC95 incluye el 0.', reglas: ['r1', 'r2', 'r3', 'r4'] });
    expect(im.retorno?.venta_incremental_mxn).toEqual({ efecto: 98150, ic_bajo: -210601, ic_alto: 398090, p: null });
    expect(im.retorno?.venta_sin_recorte_mxn?.ic_alto).toBe(403503);
    expect(im.retorno?.costo_total_campana_mxn).toBe(2356.08);
    expect(im.retorno?.venta_por_peso?.efecto).toBe(65.25);
    expect(im.retorno?.retorno).toBeNull();
    expect(im.cace).toEqual({ pct_entregado: 0.7404, efecto: 94, ic_bajo: -115.9, ic_alto: 286.9, efecto_leido: 112.8 });
    expect(im.por_subestrato).toHaveLength(1);
    expect(im.por_subestrato[0]).toMatchObject({ sub: 'P4', nt: 217, ic_bonf_alto: 903.9 });
    expect(im.sensibilidades.map((s) => s.id)).toEqual(['sens_sin_contagio', 'sens_sin_cuped']);
    expect(im.sensibilidades[1]).toMatchObject({ nombre: 'sens_sin_cuped', ic_bajo: -83.7, ic_alto: 218, p: 0.416 });
  });

  it('una lectura intermedia nunca decide; un mde numérico se vuelve texto', () => {
    const im = adaptarImpacto({ ...impactoExtendido, tipo: 'interino', mde_pts: 230 })!;
    expect(im.regla_decision).toBeNull();
    expect(im.mde_pts).toBe('230');
  });

  it('sin tipo válido no hay impacto', () => {
    expect(adaptarImpacto({ tipo: 'final', puntos: {} })).toBeNull();
    expect(adaptarImpacto(null)).toBeNull();
    expect(adaptarImpacto('x')).toBeNull();
  });
});

describe('dinero y deltas', () => {
  it('money en es-MX sin centavos, con signo opcional', () => {
    expect(money(4105159)).toBe('$4,105,159');
    expect(money(-210601)).toBe('-$210,601');
    expect(money(98150, { signo: true })).toBe('+$98,150');
    expect(money(0, { signo: true })).toBe('$0');
    expect(money(null)).toBe('—');
    expect(moneyCorto(4105159)).toBe('$4,105k');
    expect(moneyCorto(-3500000)).toBe('-$3,500k');
    expect(moneyCorto(2356.08)).toBe('$2,356');
    expect(moneyCorto(undefined)).toBe('—');
  });

  it('deltaPct: los valores ya vienen en puntos de %', () => {
    expect(deltaPct(4.3)).toEqual({ texto: '+4.3%', tono: 'bien' });
    expect(deltaPct(-3.4, 0)).toEqual({ texto: '-3%', tono: 'mal' });
    expect(deltaPct(0)).toEqual({ texto: '0.0%', tono: 'neutro' });
    expect(deltaPct(null)).toEqual({ texto: '—', tono: 'neutro' });
  });
});

describe('ventas del cierre', () => {
  const v = adaptarVentasCierres(ventasApi)!;

  it('adapta hoy, cierres (sin filas basura), semana, por hora, olas y notas de texto', () => {
    expect(v.hoy).toEqual({ fecha: '2026-09-25', dia: 'vie 25', al_corte: { tickets: 3318, pts: 3584294, venta: 4105159 } });
    expect(v.mediana_al_corte?.tickets).toBe(3182);
    expect(v.hoy_vs_mediana_pct?.pts).toBe(11.6);
    expect(v.cierres.map((c) => c.n)).toEqual([72, 71]);
    expect(v.cierres[0].total_dia?.tickets).toBe(3334);
    expect(v.semana).toHaveLength(2);
    expect(v.semana[1].es_hoy).toBe(true);
    expect(v.por_hora?.hoy).toHaveLength(24);
    expect(v.por_hora?.viernes_anterior?.dia).toBe('vie 18');
    expect(v.por_hora?.ayer).toBeNull();
    expect(v.olas.map((o) => o.ola)).toEqual(['1', '2', 'felicitacion', '3', 'extra']);
    expect(v.notas).toEqual(['Fuente: sistema anterior.']);
    expect(v.lectura).toBe('oficial');
  });

  it('día completo: comparaciones solo de ventanas conocidas y periodos ordenados', () => {
    const dc = v.dia_completo!;
    expect(dc.actual).toBe(73);
    expect(Object.keys(dc.comparaciones).sort()).toEqual(['dia_cierre', 'periodo']);
    expect(dc.comparaciones.dia_cierre?.tickets?.rango_de_7).toBe(4);
    expect(dc.comparaciones.periodo?.pts).toBeNull();
    expect(dc.periodos.map((p) => p.n)).toEqual([67, 73]);
    expect(dc.periodos[1]).toMatchObject({ es_actual: true, calificados: 6125, pct_calif_de_con_puntos: 58.6 });
    expect(dc.periodos[1].participacion?.tickets).toEqual({ dia_cierre_pct: 8.6, ult5_pct: 27 });
    expect(dc.periodos[0].participacion).toBeNull();
  });

  it('segmentos contra la base', () => {
    expect(v.segmentos_vs_base?.segmentos[0]).toMatchObject({ id: 'P4', base_pct_califica: 32.7 });
    expect(v.segmentos_vs_base?.segmentos[0].compra_pp?.trat_vs_ctrl).toBe(14.3);
    expect(v.segmentos_vs_base?.total?.tratados?.pct_califica).toBe(20);
  });

  it('sin nada que pintar → null; con solo cierres → bloque mínimo', () => {
    expect(adaptarVentasCierres(null)).toBeNull();
    expect(adaptarVentasCierres({ notas: ['x'] })).toBeNull();
    const min = adaptarVentasCierres({ cierres: [{ n: 72, fecha: '2026-08-25' }] })!;
    expect(min.hoy.al_corte).toBeNull();
    expect(min.dia_completo).toBeNull();
    expect(min.segmentos_vs_base).toBeNull();
    expect(min.por_hora).toBeNull();
  });

  it('resumen de comparaciones: actual vs mediana con delta y rango', () => {
    const filas = comparacionesResumen(v.dia_completo);
    expect(filas.map((f) => `${f.ventana}/${f.metrica}`)).toEqual([
      'dia_cierre/tickets',
      'dia_cierre/pts',
      'dia_cierre/venta',
      'periodo/tickets',
      'periodo/venta',
    ]);
    expect(filas[0]).toMatchObject({ ventanaNombre: 'Día del cierre', metricaNombre: 'Tickets', actual: '3,318', mediana: '3,183', rango: '4.º de 7' });
    expect(filas[0].delta).toEqual({ texto: '+4.2%', tono: 'bien' });
    expect(filas[2]).toMatchObject({ actual: '$4,105,159', mediana: '$4,248,293' });
    expect(filas[2].delta.tono).toBe('mal');
    expect(comparacionesResumen(null)).toEqual([]);
    expect(rangoTexto(null)).toBe('—');
  });

  it('horaDe y tituloCierre', () => {
    expect(horaDe('2026-09-25 23:50')).toBe('23:50');
    expect(horaDe('2026-09-24 17:13:20')).toBe('17:13');
    expect(horaDe('08:07')).toBe('08:07');
    expect(horaDe(null)).toBe('—');
    expect(tituloCierre('AGOSTO 2026')).toBe('Agosto');
    expect(tituloCierre('septiembre')).toBe('Septiembre');
    expect(tituloCierre(null)).toBe('—');
  });

  it('acumularTickets corta después de la hora en curso', () => {
    const serie: VentasTPV[] = [
      { tickets: 1, pts: 0, venta: 0 },
      { tickets: 2, pts: 0, venta: 0 },
      { tickets: null, pts: 0, venta: 0 },
      { tickets: 4, pts: 0, venta: 0 },
    ];
    expect(acumularTickets(serie, 2)).toEqual([1, 3, 3, null]);
    expect(acumularTickets(serie, 9)).toEqual([1, 3, 3, 7]);
    expect(acumularTickets(null, 1)).toEqual([]);
  });

  it('curvaTickets: puntos de 7 a 21, hoy hasta el corte, marcas de las olas de hoy', () => {
    const c = curvaTickets(v)!;
    expect(c.corte).toBe('23:50');
    expect(c.hCorte).toBe(23);
    expect(c.puntos[0].x).toBe(7);
    expect(c.puntos[c.puntos.length - 1].x).toBe(21);
    expect(c.puntos.every((p) => p.x >= 7 && p.x <= 21)).toBe(true);
    // hoy: 100 tickets/h de las 8 a las 20 → acumulado al final de la hora k.
    expect(c.puntos.find((p) => p.x === 8)?.hoy).toBe(0);
    expect(c.puntos.find((p) => p.x === 9)?.hoy).toBe(100);
    expect(c.puntos.find((p) => p.x === 21)?.hoy).toBe(1300);
    expect(c.puntos.find((p) => p.x === 21)?.promedio).toBe(90 * 12);
    expect(c.puntos.find((p) => p.x === 21)?.viernes).toBe(210);
    expect(c.ultimo).toEqual({ x: 21, y: 1300 });
    // Solo las olas de hoy dentro del rango: 2 (08:07), felicitación (09:44), 3 (13:33), extra (19:31); la 1 fue ayer.
    expect(c.olas.map((o) => o.etiqueta)).toEqual(['Ola 2', 'Felicitación', 'Ola 3', 'Ola extra']);
    expect(c.olas[0].x).toBeCloseTo(8 + 7 / 60, 6);
    expect(c.viernesDia).toBe('vie 18');
  });

  it('curvaTickets: con corte a media hora, el último punto de hoy va a la hora exacta', () => {
    const c = curvaTickets(adaptarVentasCierres({ ...ventasApi, corte_hoy: '2026-09-25 13:50' })!)!;
    const ult = c.puntos.filter((p) => p.hoy != null).pop()!;
    expect(ult.x).toBeCloseTo(13 + 50 / 60, 6);
    expect(ult.hoy).toBe(600);
    expect(ult.promedio).toBeNull();
    expect(c.puntos.find((p) => p.x === 14)?.hoy).toBeNull();
    expect(c.puntos.find((p) => p.x === 14)?.promedio).toBe(450);
    expect(c.ultimo).toEqual({ x: ult.x, y: 600 });
    expect(curvaTickets(adaptarVentasCierres({ ...ventasApi, por_hora: null })!)).toBeNull();
    expect(curvaTickets(null)).toBeNull();
  });
});

describe('derrame ("¿pasaron la voz?")', () => {
  const d = adaptarDerrame(derrameApi)!;

  it('adapta veredicto, tablas (sin filas ni tablas sin forma), LID, vecinos, tiempo y sucursales', () => {
    expect(d.veredicto).toBe('NO_CONCLUYENTE');
    expect(d.mde_pts).toBe(88.1);
    expect(d.tablas).toHaveLength(3);
    expect(d.tablas[0].filas.map((f) => f.vecindario)).toEqual(['frontales', 'patrocinador']);
    expect(d.tablas[0].filas[0].pts).toMatchObject({ efecto: 31, ic_bajo: -37.9, ic_alto: 88.8, p: 0.27, media_t: 40.4, media_c: 4.2, mde: 88.1 });
    expect(d.tablas[0].filas[0].cruzaron).toBeNull();
    expect(d.lid?.conocido).toMatchObject({ efecto: -453.1, ic_bajo: -1921.2, ic_alto: 734.2, p: 0.406, n_t: 126, n_c: 16 });
    expect(d.lid?.conocido?.frontales_calif).toEqual({ efecto: -0.1, ic_bajo: -0.7, ic_alto: 0.5, p: 0.769 });
    expect(d.vecinos_unicos.frontales.solo_t?.por_indice?.dpts).toBe(40.4);
    expect(d.vecinos_unicos.frontales.solo_c).toBeNull();
    expect(d.tiempo_lectura?.principal?.tratados?.share_pts_despues).toBe(0.963);
    expect(d.tiempo_lectura?.extra).toBeNull();
    expect(Object.keys(d.sucursales?.totales ?? {}).sort()).toEqual(['72', '73']);
    expect(d.sucursales?.totales['73'].ventana).toEqual(['2026-09-24 17:13:20', '2026-09-25 23:59:59']);
    expect(d.sucursales?.totales['72'].con_msg).toBeNull();
    expect(d.sucursales?.corr_tratados_vs_cambio).toBe(-0.07);
    expect(d.notas).toHaveLength(2);
  });

  it('veredictos: tolerante con mayúsculas y separadores; desconocido = sin datos', () => {
    expect(claveVeredictoDerrame('derrame positivo')).toBe('DERRAME_POSITIVO');
    expect(claveVeredictoDerrame('No concluyente')).toBe('NO_CONCLUYENTE');
    expect(claveVeredictoDerrame('otro')).toBe('SIN_DATOS');
    expect(veredictoDerrame('DERRAME_POSITIVO')).toMatchObject({ texto: 'Sí pasaron la voz', variant: 'success', tono: 'bien' });
    expect(veredictoDerrame('DERRAME_NEGATIVO').tono).toBe('mal');
    expect(veredictoDerrame('NO_CONCLUYENTE')).toMatchObject({ variant: 'info', tono: 'neutro' });
    expect(veredictoDerrame(null).texto).toBe('Sin datos');
    expect(adaptarDerrame({ ...derrameApi, veredicto: 'derrame negativo' })?.veredicto).toBe('DERRAME_NEGATIVO');
  });

  it('tablas por población y unidad; fila que decide el veredicto', () => {
    expect(poblacionesDerrame(d)).toEqual(['principal', 'extra']);
    expect(tablaDerrame(d, 'principal', 'por_vecino')?.filas[0].n_t).toBe(199);
    expect(tablaDerrame(d, 'extra', 'por_vecino')).toBeNull();
    expect(filaPrincipalDerrame(d)?.pts?.efecto).toBe(31);
    expect(toneEfecto(filaPrincipalDerrame(d)?.pts?.ic_bajo, filaPrincipalDerrame(d)?.pts?.ic_alto)).toBe('neutro');
    expect(poblacionesDerrame(null)).toEqual([]);
  });

  it('sin tablas o sin veredicto no hay derrame; otro tipo tampoco', () => {
    expect(adaptarDerrame({ veredicto: 'NO_CONCLUYENTE' })).toBeNull();
    expect(adaptarDerrame({ tablas: [] })).toBeNull();
    expect(adaptarDerrame({ ...derrameApi, tipo: 'impacto' })).toBeNull();
    expect(adaptarDerrame(null)).toBeNull();
  });
});

describe('campañas hijas (ola extra)', () => {
  it('adaptarComplementos: solo entradas con key', () => {
    expect(adaptarComplementos([{ key: 'cierre-p73-extra', nombre: 'Ola extra', t0_cdmx: 'vie 25 19:31', tratados: 2553, control: 295 }, { nombre: 'sin key' }, 'x'])).toEqual([
      { key: 'cierre-p73-extra', nombre: 'Ola extra', t0_cdmx: 'vie 25 19:31', tratados: 2553, control: 295 },
    ]);
    expect(adaptarComplementos(null)).toEqual([]);
  });

  it('la campaña seleccionada: la de la URL si existe; si no, la primera principal', () => {
    expect(campanaSeleccionada(lista, 'cierre-p73-extra')).toBe('cierre-p73-extra');
    expect(campanaSeleccionada(lista, 'no-existe')).toBe('cierre-p73');
    expect(campanaSeleccionada(lista, null)).toBe('cierre-p73');
    expect(campanaSeleccionada([lista[1], lista[0]], null)).toBe('cierre-p73');
    expect(campanaSeleccionada([lista[1]], null)).toBe('cierre-p73-extra');
    expect(campanaSeleccionada([], null)).toBeNull();
  });

  it('el selector lista cada principal seguida de sus hijas; una hija huérfana solo si está abierta', () => {
    expect(campanasPrincipales(lista).map((c) => c.key)).toEqual(['cierre-p73']);
    expect(esCampanaHija(lista, 'cierre-p73-extra')).toBe(true);
    expect(esCampanaHija(lista, 'cierre-p73')).toBe(false);
    expect(esCampanaHija(lista, null)).toBe(false);
    expect(opcionesSelector(lista, 'cierre-p73').map((c) => c.key)).toEqual(['cierre-p73', 'cierre-p73-extra']);
    // La hija va debajo de su padre aunque el API la mande antes.
    expect(opcionesSelector([lista[1], lista[0]], null).map((c) => c.key)).toEqual(['cierre-p73', 'cierre-p73-extra']);
    const huerfana = { ...lista[1], padre: 'otra' };
    expect(opcionesSelector([lista[0], huerfana], null).map((c) => c.key)).toEqual(['cierre-p73']);
    expect(opcionesSelector([lista[0], huerfana], 'cierre-p73-extra').map((c) => c.key)).toEqual(['cierre-p73', 'cierre-p73-extra']);
  });
});

describe('adaptarDashboard con los bloques nuevos', () => {
  it('v1 sin bloques nuevos: ventas y derrame null, complementos vacíos, sin padre', () => {
    const d = adaptarDashboard(tableroV1 as unknown, 'cierre-p73');
    expect(d.ventas_cierres).toBeNull();
    expect(d.derrame).toBeNull();
    expect(d.complementos).toEqual([]);
    expect(d.campana.padre).toBeNull();
    // El impacto v1 del fixture (si lo trae) queda con las llaves extendidas rellenas.
    if (d.impacto) {
      expect(d.impacto.por_subestrato).toEqual([]);
      expect(d.impacto.sensibilidades).toEqual([]);
    }
  });

  it('v2 completo: respeta padre, complementos, ventas y derrame', () => {
    const base = JSON.parse(JSON.stringify(tableroV1)) as Record<string, unknown>;
    const d = adaptarDashboard({
      ...base,
      version: 2,
      campana: { key: 'cierre-p73', nombre: 'Cierre', estado: 'activa', t0_cdmx: 'jue 24 17:13', pct_control: 0.1, padre: null },
      impacto: impactoExtendido,
      ventas_cierres: ventasApi,
      derrame: derrameApi,
      complementos: [{ key: 'cierre-p73-extra', nombre: 'Ola extra', t0_cdmx: 'vie 25 19:31', tratados: 2553, control: 295 }],
    });
    expect(d.campana.padre).toBeNull();
    expect(d.complementos[0].key).toBe('cierre-p73-extra');
    expect(d.ventas_cierres?.cierres).toHaveLength(2);
    expect(d.derrame?.veredicto).toBe('NO_CONCLUYENTE');
    expect(d.impacto?.retorno?.costo_total_campana_mxn).toBe(2356.08);
    const hija = adaptarDashboard({ ...base, campana: { key: 'cierre-p73-extra', padre: 'cierre-p73' } });
    expect(hija.campana.padre).toBe('cierre-p73');
    expect(adaptarDashboard({ ...base, campana: { padre: '' } }).campana.padre).toBeNull();
  });
});

describe('privacidad de los fixtures', () => {
  it('ningún TEXTO trae corridas de 6+ dígitos, correos, UUID ni wamid (los números son agregados)', () => {
    const textos: string[] = [];
    const recorrer = (v: unknown) => {
      if (typeof v === 'string') textos.push(v);
      else if (Array.isArray(v)) v.forEach(recorrer);
      else if (v && typeof v === 'object') Object.values(v).forEach(recorrer);
    };
    recorrer({ impactoExtendido, ventasApi, derrameApi, lista });
    const txt = textos.join('\n');
    expect(txt).not.toMatch(/\d{6,}/);
    expect(txt).not.toMatch(/wamid/i);
    expect(txt).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    expect(txt).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(txt).not.toMatch(/\+52\d/);
  });
});
