import { describe, expect, it } from 'vitest';
import tableroV1 from './__fixtures__/tablero-v1.json';
import {
  FILTRO_LABELS,
  adaptarDashboard,
  badgeContraste,
  badgeImpacto,
  califico,
  categoriasOrdenadas,
  chipCierre,
  construirQuery,
  embudoAtribucion,
  etiquetaFiltro,
  evidenciaBadge,
  fechaLarga,
  hayOlaEnCurso,
  hrefPersonas,
  kpisTablero,
  n,
  normalizarParams,
  pct,
  puntosHistorial,
  ratio,
  signed,
  toneCategoria,
  toneEfecto,
  toneOla,
  tramosOla,
  tramosOlaSeguro,
} from './format';
import { normalizeMembersPage } from '@/services/whatsapp-campaigns.service';
import {
  CAMPAIGN_MEMBER_FILTERS,
  type AttributionFields,
  type CampaignOla,
} from '@/types/whatsappCampaign';

// Fixture = tablero/tablero-datos.json v1 de la campaña cierre-p73 (solo
// agregados). El mock v2 le agrega las llaves ➕ del contrato (SPEC §3.6).
const v1 = tableroV1 as unknown;

const totalAtribucion: AttributionFields = {
  tratados: 1895,
  recibieron: 1397,
  leyeron: 1137,
  no_leyeron: 758,
  base_recibieron: 1300,
  calificaron_recibieron: 40,
  pct_calificaron_recibieron: 0.0308,
  compraron_despues_de_leer: 30,
  compraron_mismo_dia_sin_hora: 12,
  pct_compraron_despues_de_leer: 0.0264,
  base_leyeron: 1050,
  calificaron_despues_de_leer: 20,
  calificaron_mismo_dia_sin_hora: 5,
  pct_calificaron_despues_de_leer: 0.019,
  compraron_sin_leer: 9,
  pct_compraron_sin_leer: 0.0119,
  compraron_desde_t0_trat: 71,
  compraron_desde_t0_trat_sin_hora: 10,
  pct_compraron_desde_t0_trat: 0.0375,
  base_trat: 1895,
  calificaron_trat: 46,
  pct_calificaron_trat: 0.0243,
  control: 214,
  compraron_desde_t0_ctrl: 7,
  compraron_desde_t0_ctrl_sin_hora: 0,
  pct_compraron_desde_t0_ctrl: 0.0327,
  base_ctrl: 214,
  calificaron_ctrl: 6,
  pct_calificaron_ctrl: 0.028,
};

function mockV2() {
  const base = JSON.parse(JSON.stringify(tableroV1)) as Record<string, unknown>;
  return {
    ...base,
    version: 2,
    corte: { ...(base.corte as object), sync_en_curso: true },
    periodo: { ...(base.periodo as object), cerrado: false },
    campana: {
      key: 'cierre-p73',
      nombre: 'Cierre de septiembre 2026',
      estado: 'activa',
      t0_cdmx: 'jue 24 17:13',
      pct_control: 0.1,
    },
    respuestas: { ...(base.respuestas as object), opt_out_desde_t0: 7 },
    historial: [
      { generado: '2026-09-25T11:52:00-06:00', generado_cdmx: 'vie 25 11:52', pct_califican_trat: 0.03, pct_califican_ctrl: 0.03 },
      { generado: '2026-09-25T09:52:00-06:00', generado_cdmx: 'vie 25 09:52', pct_califican_trat: 0.0243, pct_califican_ctrl: 0.028 },
      { generado: '2026-09-25T10:52:00-06:00', generado_cdmx: 'vie 25 10:52', pct_califican_trat: null, pct_califican_ctrl: 0.028 },
    ],
    atribucion: {
      t0_cdmx: 'jue 24 17:13',
      olas_aviso: ['1', '2', '3'],
      evidencia: { compras_hora_exacta: 412, compras_solo_dia: 37, cobertura_hora_legacy: 0.93 },
      segmentos: [{ id: 'P1', nombre: 'Les faltan 1–500 pts', ...totalAtribucion }],
      total: totalAtribucion,
      olas: [],
      notas: ['Atribución = lo que pasó después de leer; describe, no prueba causa.'],
    },
  };
}

describe('números es-MX', () => {
  it('formatea enteros, porcentajes y signos; — sin dato', () => {
    expect(n(2021)).toBe('2,021');
    expect(n(1234.6)).toBe('1,235');
    expect(n(null)).toBe('—');
    expect(n(Number.NaN)).toBe('—');
    expect(pct(0.0243, 1)).toBe('2.4%');
    expect(pct(0.5)).toBe('50%');
    expect(pct(null)).toBe('—');
    expect(ratio(1, 4)).toBe(0.25);
    expect(ratio(1, 0)).toBeNull();
    expect(ratio(null, 4)).toBeNull();
    expect(signed(-20.2, 1)).toBe('-20.2');
    expect(signed(1.3, 1, ' pp')).toBe('+1.3 pp');
    expect(signed(0)).toBe('0');
    expect(signed(undefined)).toBe('—');
  });
});

describe('tramosOla', () => {
  const d = adaptarDashboard(v1);

  it('las piezas de cada ola enviada suman los intentos (fixture real)', () => {
    const enviadas = d.olas.filter((o) => o.intentos != null);
    expect(enviadas.length).toBeGreaterThan(0);
    for (const o of enviadas) {
      const tramos = tramosOla(o);
      expect(tramos.map((t) => t.id)).toEqual([
        'leidos',
        'entregados',
        'pendientes',
        'sin_whatsapp',
        'limite',
        'otros',
      ]);
      expect(tramos.reduce((a, t) => a + t.n, 0)).toBe(o.intentos);
      expect(tramos.reduce((a, t) => a + t.frac, 0)).toBeCloseTo(1, 6);
      expect(tramos[0].n).toBe(o.leidos);
      expect(tramos[1].n).toBe((o.recibidos ?? 0) - (o.leidos ?? 0));
    }
  });

  it('una ola programada no tiene tramos', () => {
    const programada = d.olas.find((o) => o.estado === 'programada');
    expect(programada).toBeDefined();
    expect(tramosOla(programada!)).toEqual([]);
  });

  it('lanza si no cuadra, y la versión segura regresa null', () => {
    const mala: CampaignOla = { ...d.olas[0], intentos: (d.olas[0].intentos ?? 0) + 1 };
    expect(() => tramosOla(mala)).toThrow(/suman/);
    expect(tramosOlaSeguro(mala)).toBeNull();
    const negativa: CampaignOla = { ...d.olas[0], leidos: (d.olas[0].recibidos ?? 0) + 1 };
    expect(() => tramosOla(negativa)).toThrow(/negativo/);
  });
});

describe('tonos', () => {
  it('ola', () => {
    expect(toneOla('enviada')).toMatchObject({ variant: 'success', pulso: false });
    expect(toneOla('en curso')).toMatchObject({ variant: 'warning', pulso: true });
    expect(toneOla('programada')).toMatchObject({ variant: 'outline', texto: 'Programada' });
    expect(hayOlaEnCurso([{ estado: 'en curso' } as CampaignOla])).toBe(true);
    expect(hayOlaEnCurso(adaptarDashboard(v1).olas)).toBe(false);
  });

  it('categoría de respuesta', () => {
    expect(toneCategoria('baja')).toBe('alerta');
    expect(toneCategoria('numero_equivocado')).toBe('alerta');
    expect(toneCategoria('molesto')).toBe('alerta');
    expect(toneCategoria('pregunta')).toBe('accion');
    expect(toneCategoria('audio')).toBe('accion');
    expect(toneCategoria('agradece')).toBe('normal');
    expect(toneCategoria(null)).toBe('normal');
  });

  it('impacto y efecto', () => {
    expect(badgeImpacto('interino').variant).toBe('info');
    expect(badgeImpacto('preliminar').variant).toBe('warning');
    expect(badgeImpacto('oficial').variant).toBe('success');
    expect(toneEfecto(1, 5)).toBe('bien');
    expect(toneEfecto(-5, -1)).toBe('mal');
    expect(toneEfecto(-90.6, 28.9)).toBe('neutro');
  });
});

describe('chipCierre (periodo 26→25 de commission_periods)', () => {
  const periodo = { nombre: 'SEPTIEMBRE 2026', fin: '2026-09-25', cerrado: false };

  it('más de 24 h: fecha larga del fin, sin mes fijo', () => {
    const chip = chipCierre(periodo, Date.parse('2026-09-20T12:00:00-06:00'));
    expect(chip).toEqual({ texto: 'SEPTIEMBRE 2026 cierra el 25 de septiembre', tono: 'info' });
    // P74 termina el 26-oct (recorrido a día hábil): el texto sale del fin real.
    const p74 = chipCierre(
      { nombre: 'OCTUBRE 2026', fin: '2026-10-26' },
      Date.parse('2026-10-01T12:00:00-06:00'),
    );
    expect(p74?.texto).toBe('OCTUBRE 2026 cierra el 26 de octubre');
  });

  it('menos de 24 h: aviso con horas restantes', () => {
    const chip = chipCierre(periodo, Date.parse('2026-09-25T11:25:00-06:00'));
    expect(chip).toEqual({ texto: 'Hoy cierra SEPTIEMBRE 2026 · quedan 12 h', tono: 'warning' });
    const casi = chipCierre(periodo, Date.parse('2026-09-25T23:30:00-06:00'));
    expect(casi?.texto).toContain('menos de 1 h');
  });

  it('cerrado: por bandera o por hora', () => {
    expect(chipCierre({ ...periodo, cerrado: true }, Date.parse('2026-09-20T12:00:00-06:00'))?.texto).toBe(
      'Periodo SEPTIEMBRE 2026 cerrado',
    );
    expect(chipCierre(periodo, Date.parse('2026-09-26T00:00:01-06:00'))?.tono).toBe('outline');
    expect(chipCierre(null, 0)).toBeNull();
  });

  it('fechaLarga no depende de la zona horaria', () => {
    expect(fechaLarga('2026-08-26')).toBe('26 de agosto');
    expect(fechaLarga('xx')).toBe('xx');
  });
});

describe('filtros y URL', () => {
  it('hay etiqueta en español para los 13 filtros', () => {
    expect(CAMPAIGN_MEMBER_FILTERS).toHaveLength(13);
    for (const f of CAMPAIGN_MEMBER_FILTERS) {
      expect(FILTRO_LABELS[f]).toMatch(/\S/);
    }
    expect(etiquetaFiltro('leyeron_compraron')).toBe('Leyeron y después compraron');
    expect(etiquetaFiltro('control_calificaron')).toBe('Control: calificaron');
    expect(etiquetaFiltro('nope')).toBe('Todos');
  });

  const qs = (s: string) => new URLSearchParams(s);

  it('normaliza valores inválidos al default y lo marca', () => {
    const p = normalizarParams(qs('tab=foo&filtro=hack&page=0&segmento=p1&ola=UNO&grupo=x&campana=../x'));
    expect(p).toMatchObject({
      campana: null,
      tab: 'tablero',
      filtro: 'todos',
      segmento: null,
      ola: null,
      grupo: null,
      page: 1,
      invalido: true,
    });
  });

  it('acepta valores válidos', () => {
    const p = normalizarParams(
      qs('campana=cierre-p73&tab=personas&filtro=leyeron_compraron&segmento=P1&ola=felicitacion&grupo=control&page=3'),
    );
    expect(p).toEqual({
      campana: 'cierre-p73',
      tab: 'personas',
      filtro: 'leyeron_compraron',
      segmento: 'P1',
      ola: 'felicitacion',
      grupo: 'control',
      alcance: null,
      page: 3,
      invalido: false,
    });
    expect(normalizarParams(qs('')).invalido).toBe(false);
  });

  it('construye la query canónica y los enlaces "Ver personas"', () => {
    expect(construirQuery({ campana: 'cierre-p73', tab: 'tablero', filtro: 'bajas', page: 4 })).toBe(
      '?campana=cierre-p73',
    );
    expect(construirQuery({ campana: 'cierre-p73', tab: 'personas', filtro: 'todos', page: 1 })).toBe(
      '?campana=cierre-p73&tab=personas',
    );
    expect(hrefPersonas('cierre-p73', 'leyeron_compraron', { segmento: 'P1' })).toBe(
      '/admin/comercial/whatsapp?campana=cierre-p73&tab=personas&filtro=leyeron_compraron&segmento=P1',
    );
  });
});

describe('evidencia y personas', () => {
  it('badge de evidencia', () => {
    expect(evidenciaBadge('exacta')?.variant).toBe('success');
    expect(evidenciaBadge('dia')?.texto).toBe('Día posterior');
    expect(evidenciaBadge('mismo_dia_sin_hora')?.variant).toBe('warning');
    expect(evidenciaBadge(null)).toBeNull();
  });

  it('calificó con o sin acento', () => {
    expect(califico({ 'calificó': true })).toBe(true);
    expect(califico({ califico: true })).toBe(true);
    expect(califico({})).toBe(false);
  });

  it('normaliza la página de /members (data de paginate() o items)', () => {
    const a = normalizeMembersPage({ data: [{}, {}], total: 120, page: 2, limit: 50, totalPages: 3 });
    expect(a).toMatchObject({ total: 120, page: 2, limit: 50, totalPages: 3 });
    expect(a.items).toHaveLength(2);
    const b = normalizeMembersPage({ items: [{}], total: 9, page: 1, limit: 50 });
    expect(b).toMatchObject({ total: 9, totalPages: 1 });
    expect(normalizeMembersPage(null, { page: 1, limit: 50 })).toMatchObject({ items: [], total: 0 });
  });
});

describe('adaptarDashboard', () => {
  it('v1 del artefacto: conserva los bloques y rellena las llaves ➕', () => {
    const d = adaptarDashboard(v1, 'cierre-p73');
    expect(d.version).toBe(1);
    expect(d.periodo).toMatchObject({ nombre: 'SEPTIEMBRE 2026', inicio: '2026-08-26', fin: '2026-09-25', umbral: 3300, cerrado: false });
    expect(d.corte.sync_en_curso).toBe(false);
    expect(d.campana.key).toBe('cierre-p73');
    expect(d.campana.estado).toBe('activa');
    expect(d.historial).toEqual([]);
    expect(d.atribucion).toBeNull();
    expect(d.embudo.tratados).toBe(2021);
    expect(d.embudo.control).toBe(230);
    expect(d.segmentos.map((s) => s.id)).toEqual(['P1', 'P2', 'P4', 'LID', 'REG', 'NUE']);
    expect(d.sucursales.length).toBeLessThanOrEqual(10);
    expect(d.respuestas?.opt_out_desde_t0).toBeNull();
    expect(d.notas.length).toBeGreaterThan(0);
  });

  it('v2: respeta las llaves nuevas', () => {
    const d = adaptarDashboard(mockV2());
    expect(d.version).toBe(2);
    expect(d.corte.sync_en_curso).toBe(true);
    expect(d.campana).toMatchObject({ key: 'cierre-p73', pct_control: 0.1, t0_cdmx: 'jue 24 17:13' });
    expect(d.respuestas?.opt_out_desde_t0).toBe(7);
    expect(d.atribucion?.evidencia.cobertura_hora_legacy).toBe(0.93);
    expect(d.atribucion?.total.compraron_despues_de_leer).toBe(30);
  });

  it('una atribución sin evidencia u olas (forma de otra versión) se trata como ausente', () => {
    const v = mockV2();
    expect(adaptarDashboard({ ...v, atribucion: { ...v.atribucion, evidencia: undefined } }).atribucion).toBeNull();
    expect(adaptarDashboard({ ...v, atribucion: { ...v.atribucion, olas: undefined } }).atribucion).toBeNull();
    expect(
      adaptarDashboard({ ...v, atribucion: { total: {}, por_ola: [], compras_disponibles: true } }).atribucion,
    ).toBeNull();
  });

  it('una atribución sin `total` (forma distinta) se trata como ausente', () => {
    const d = adaptarDashboard({ ...mockV2(), atribucion: { t0_cdmx: 'x', segmentos: [] } });
    expect(d.atribucion).toBeNull();
  });

  it('basura no rompe', () => {
    const d = adaptarDashboard('hola', 'k');
    expect(d.olas).toEqual([]);
    expect(d.total).toBeNull();
    expect(d.respuestas).toBeNull();
    expect(d.campana.key).toBe('k');
  });
});

describe('bloques derivados', () => {
  it('cifras clave con los textos del artefacto', () => {
    const d = adaptarDashboard(v1);
    const k = kpisTablero(d);
    expect(k.map((x) => x.etiqueta)).toEqual([
      'Distribuidores contactados',
      'Lo recibieron',
      'Lo leyeron',
      'Contestaron',
      'Pidieron baja',
    ]);
    expect(k[0]).toMatchObject({ valor: '2,021', detalle: 'de 2,021 en la campaña' });
    expect(k[1].detalle).toBe(`${pct(ratio(d.embudo.recibieron, d.embudo.contactados))} de los contactados`);
    expect(k[4].detalle).toMatch(/^\d+\.\d% de los contactados$/);
  });

  it('embudo de atribución proporcional a quienes recibieron', () => {
    const pasos = embudoAtribucion(totalAtribucion);
    expect(pasos.map((p) => p.n)).toEqual([1397, 1137, 30, 20]);
    expect(pasos[0].frac).toBe(1);
    expect(pasos[1].frac).toBeCloseTo(1137 / 1397, 6);
    expect(pasos[2].filtro).toBe('leyeron_compraron');
    expect(pasos[3].filtro).toBe('leyeron_calificaron');
    expect(embudoAtribucion({ ...totalAtribucion, recibieron: 0 })[1].frac).toBe(0);
    expect(embudoAtribucion(null)).toEqual([]);
  });

  it('historial ordenado y sin puntos vacíos', () => {
    const pts = puntosHistorial(adaptarDashboard(mockV2()));
    expect(pts.map((p) => p.generado_cdmx)).toEqual(['vie 25 09:52', 'vie 25 11:52']);
  });

  it('categorías de respuesta de mayor a menor, con tono', () => {
    const cats = categoriasOrdenadas(adaptarDashboard(v1));
    expect(cats.length).toBeGreaterThan(0);
    for (let i = 1; i < cats.length; i++) expect(cats[i - 1].n).toBeGreaterThanOrEqual(cats[i].n);
    expect(cats[0].frac).toBe(1);
    expect(cats.find((c) => c.id === 'baja')?.tono).toBe('alerta');
  });
});

describe('privacidad del fixture', () => {
  it('el mock es solo de agregados (sin teléfonos, números de cliente, correos, UUID ni wamid)', () => {
    const txt = JSON.stringify(mockV2());
    const sinCodigos = txt.replace(/\b(131026|131049|130472|131050)\b/g, '');
    expect(sinCodigos).not.toMatch(/\d{7,}/);
    expect(txt).not.toMatch(/wamid/i);
    expect(txt).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
    expect(txt).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(txt).not.toMatch(/\+52\d/);
  });
});

describe('alcance=total y enlaces a Personas', () => {
  it('normalizarParams acepta solo alcance=total; construirQuery y hrefPersonas lo conservan', () => {
    const p = normalizarParams(new URLSearchParams('campana=cierre-p73&tab=personas&alcance=total&ola=2'));
    expect(p.alcance).toBe('total');
    expect(p.invalido).toBe(false);
    expect(normalizarParams(new URLSearchParams('alcance=lid')).invalido).toBe(true);
    expect(construirQuery({ ...p })).toContain('alcance=total');
    expect(hrefPersonas('cierre-p73', 'leyeron_compraron', { ola: '2', alcance: 'total' })).toBe(
      '/admin/comercial/whatsapp?campana=cierre-p73&tab=personas&filtro=leyeron_compraron&ola=2&alcance=total',
    );
  });

  it('badgeContraste oscurece solo la variante success', () => {
    expect(badgeContraste('success')).toContain('text-emerald-800');
    expect(badgeContraste('info')).toBeUndefined();
  });
});

