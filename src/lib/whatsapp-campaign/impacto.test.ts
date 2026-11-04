import { describe, expect, it } from 'vitest';
import {
  adaptarImpactoPeriodo,
  adaptarResumenImpacto,
  efectoVentaTexto,
  fechaCorta,
  filasConsentimiento,
  filasRecorridos,
  hayEnvios,
  icDinero,
  kpisDinero,
  kpisImpacto,
  puntosPorDia,
} from './impacto';
import { money, usd } from './numeros';

// Fixture = SOLO agregados con la forma de GET /whatsapp/campaigns/periods/:n
// (SPEC Recorridos §6). Cifras inventadas y redondeadas; sin personas.
function impactoRaw() {
  return {
    periodo: { numero: 75, nombre: 'NOVIEMBRE 2026', inicio: '2026-11-01', fin: '2026-11-30', cerrado: false },
    generado_cdmx: 'mié 4 nov 09:12',
    totales: {
      enviados: 1200,
      entregados: 1000,
      leidos: 800,
      respondieron: 40,
      bajas: 5,
      solo_cuenta: 3,
      costo_usd: 30.5,
      costo_mxn: 573.4,
      compraron_despues: 120,
      venta_atribuida_mxn: 98150,
      venta_incremental_mxn: { efecto: 12000, ic_bajo: -3000, ic_alto: 27000, p: 0.12 },
      venta_por_peso: { efecto: 1.37, ic_bajo: 0.6, ic_alto: 2.1 },
    },
    recorridos: [
      {
        key: 'j12-preferencias-p75',
        codigo: 'J12',
        nombre: 'Preferencias',
        categoria: 'MARKETING',
        plantilla: 'cuenta_preferencias',
        estado: 'activa',
        tratados: 1200,
        control: 0,
        enviados: 1000,
        entregados: 850,
        leidos: 700,
        respondieron: 35,
        bajas: 5,
        sin_whatsapp: 100,
        tope_meta: 20,
        otros_fallos: 30,
        costo_usd: 25.9,
        costo_mxn: 487,
        compraron_despues: 100,
        venta_atribuida_mxn: 80000,
        impacto: null,
        ultimo_envio_cdmx: 'mar 3 nov 10:04',
      },
      {
        key: 'j7-te-extranamos-p75',
        codigo: 'J7',
        nombre: 'Te extrañamos',
        categoria: 'MARKETING',
        plantilla: 'regreso_te_extranamos',
        estado: 'activa',
        tratados: 240,
        control: 60,
        enviados: 200,
        entregados: 150,
        leidos: 100,
        respondieron: 5,
        bajas: 0,
        sin_whatsapp: 40,
        tope_meta: 5,
        otros_fallos: 5,
        costo_usd: 4.6,
        costo_mxn: 86.4,
        compraron_despues: 20,
        venta_atribuida_mxn: 18150,
        impacto: {
          tipo: 'preliminar',
          veredicto: 'No concluyente: el intervalo incluye el 0.',
          puntos: { efecto: 50, ic_bajo: -20, ic_alto: 120 },
          compra_pp: { efecto: 1.2, ic_bajo: -0.5, ic_alto: 2.9 },
          venta_incremental_mxn: { efecto: 12000, ic_bajo: -3000, ic_alto: 27000 },
          venta_por_peso: { efecto: 21, ic_bajo: -5, ic_alto: 47 },
          regla_decision: { resultado: 'no_concluyente', texto: 'No concluyente', reglas: [] },
        },
        ultimo_envio_cdmx: 'mar 10 nov 11:02',
      },
      { nombre: 'sin clave ni código' },
    ],
    consentimiento: { opt_in_total: 350, solo_cuenta_total: 12, baja_total: 9, ganados: { todos: 350, solo_cuenta: 12, nada: 0 } },
    por_dia: [
      { fecha: '2026-11-03', enviados: 700, entregados: 600, leidos: 500, respuestas: 30 },
      { fecha: '2026-11-02', enviados: 500, entregados: 400, leidos: 300, respuestas: 10 },
      { fecha: 'ayer', enviados: 1 },
    ],
    notas: ['Costo = entregados × tarifa por categoría y país × tipo de cambio del periodo.', 7],
  };
}

describe('adaptarImpactoPeriodo', () => {
  it('conserva los bloques, ordena recorridos (J1…J12) y días, descarta formas raras', () => {
    const d = adaptarImpactoPeriodo(impactoRaw());
    expect(d.periodo).toEqual({ numero: 75, nombre: 'NOVIEMBRE 2026', inicio: '2026-11-01', fin: '2026-11-30', cerrado: false });
    expect(d.generado_cdmx).toBe('mié 4 nov 09:12');
    expect(d.totales.venta_incremental_mxn).toEqual({ efecto: 12000, ic_bajo: -3000, ic_alto: 27000, p: 0.12 });
    expect(d.recorridos.map((r) => r.codigo)).toEqual(['J7', 'J12']);
    expect(d.recorridos[0].impacto?.regla_decision?.resultado).toBe('no_concluyente');
    expect(d.recorridos[0].impacto?.regla_decision?.reglas.length).toBe(4);
    expect(d.recorridos[1].impacto).toBeNull();
    expect(d.por_dia.map((x) => x.fecha)).toEqual(['2026-11-02', '2026-11-03']);
    expect(d.consentimiento?.ganados.todos).toBe(350);
    expect(d.notas).toEqual(['Costo = entregados × tarifa por categoría y país × tipo de cambio del periodo.']);
  });

  it('llave ausente = null / []; basura no rompe', () => {
    const d = adaptarImpactoPeriodo('x');
    expect(d.periodo).toEqual({ numero: null, nombre: '', inicio: '', fin: '', cerrado: false });
    expect(d.totales.enviados).toBeNull();
    expect(d.totales.venta_incremental_mxn).toBeNull();
    expect(d.recorridos).toEqual([]);
    expect(d.consentimiento).toBeNull();
    expect(d.por_dia).toEqual([]);
    expect(hayEnvios(d)).toBe(false);
    expect(hayEnvios(adaptarImpactoPeriodo({ recorridos: [{ key: 'k', enviados: 3 }] }))).toBe(true);
  });

  it('resumen de impacto: la lectura intermedia no trae regla; sin datos es null', () => {
    const interino = adaptarResumenImpacto({ tipo: 'interino', puntos: { efecto: 1, ic_bajo: 0, ic_alto: 2 }, regla_decision: { resultado: 'funciono' } });
    expect(interino?.regla_decision).toBeNull();
    expect(adaptarResumenImpacto({})).toBeNull();
    expect(adaptarResumenImpacto({ tipo: 'raro' })).toBeNull();
    expect(adaptarResumenImpacto({ veredicto: 'x' })?.tipo).toBeNull();
  });
});

describe('bloques derivados', () => {
  const d = adaptarImpactoPeriodo(impactoRaw());

  it('mosaicos de mensajes', () => {
    const k = kpisImpacto(d);
    expect(k.map((x) => x.etiqueta)).toEqual(['Mensajes enviados', 'Entregados', 'Leídos', 'Contestaron', 'Pidieron baja']);
    expect(k[0]).toMatchObject({ valor: '1,200', detalle: '2 recorridos con envíos' });
    expect(k[1].detalle).toBe('83% de los enviados');
    expect(k[2].detalle).toBe('80% de los entregados');
    expect(k[4].detalle).toBe('0.5% de los entregados · 3 solo avisos de cuenta');
  });

  it('mosaicos de dinero (sin la palabra ganancias)', () => {
    const k = kpisDinero(d);
    expect(k.map((x) => x.id)).toEqual(['costo', 'compraron', 'venta', 'venta_por_peso']);
    expect(k[0].valor).toBe('$573');
    expect(k[0].detalle).toContain('US$30.50');
    expect(k[1].detalle).toBe('12.0% de quienes lo recibieron, en la ventana de atribución');
    expect(k[2].valor).toBe('$98,150');
    // Cociente con centavos: $1.37 vendidos por cada $1 gastado (no '$1 por $1').
    expect(k[3]).toMatchObject({ valor: '$1.37 por $1', detalle: 'Intervalo 95%: de $0.60 a $2.10' });
    expect(JSON.stringify(k).toLowerCase()).not.toContain('ganancia');
    expect(kpisDinero(adaptarImpactoPeriodo({}))[3].detalle).toBe('Solo con grupo de control');
    const negativo = kpisDinero(adaptarImpactoPeriodo({ totales: { venta_por_peso: { efecto: -0.4, ic_bajo: -1.25, ic_alto: 0.45 } } }));
    expect(negativo[3]).toMatchObject({ valor: '-$0.40 por $1', detalle: 'Intervalo 95%: de -$1.25 a $0.45' });
  });

  it('tabla por recorrido con porcentajes y efecto', () => {
    const f = filasRecorridos(d);
    expect(f[0].codigo).toBe('J7');
    expect(f[0].pct_entregados).toBeCloseTo(0.75, 6);
    expect(f[0].pct_leidos).toBeCloseTo(100 / 150, 6);
    expect(f[0].efecto_texto).toBe('+$12,000 (de -$3,000 a +$27,000)');
    expect(f[0].efecto_tono).toBe('neutro');
    expect(f[1].efecto_texto).toBe('Sin control');
    const sinLectura = filasRecorridos({ recorridos: [{ ...d.recorridos[0], impacto: null }] });
    expect(sinLectura[0].efecto_texto).toBe('Sin lectura');
  });

  it('gráfica por día y fecha corta sin zona horaria', () => {
    expect(fechaCorta('2026-11-25')).toBe('25 nov');
    expect(fechaCorta('2026-02-01')).toBe('1 feb');
    expect(fechaCorta('x')).toBe('x');
    expect(puntosPorDia(d).map((p) => p.dia)).toEqual(['2 nov', '3 nov']);
  });

  it('efecto de venta y consentimientos', () => {
    expect(efectoVentaTexto(d.totales.venta_incremental_mxn)).toEqual({ valor: '+$12,000', detalle: 'Intervalo 95%: de -$3,000 a +$27,000 · p = 0.12' });
    expect(icDinero({ ic_bajo: null, ic_alto: 5 })).toBe('—');
    expect(icDinero({ ic_bajo: 0.6, ic_alto: 2.1 }, { dec: 2, signo: false })).toBe('de $0.60 a $2.10');
    expect(icDinero({ ic_bajo: 0.6, ic_alto: 2.1 }, { dec: 2 })).toBe('de +$0.60 a +$2.10');
    expect(efectoVentaTexto(null).valor).toBe('—');
    const c = filasConsentimiento(d.consentimiento);
    expect(c.map((x) => x.etiqueta)).toEqual(['Aceptan promociones', 'Solo avisos de cuenta', 'Baja total']);
    expect(c[0]).toMatchObject({ valor: '350', detalle: '+350 en el periodo' });
    expect(c[2].detalle).toBe('0 en el periodo');
    expect(filasConsentimiento(null)).toEqual([]);
  });
});

describe('money con decimales', () => {
  it('conserva centavos solo con dec; -0.001 no es negativo', () => {
    expect(money(1.37, { dec: 2 })).toBe('$1.37');
    expect(money(1234.5, { dec: 2 })).toBe('$1,234.50');
    expect(money(-0.4, { dec: 2 })).toBe('-$0.40');
    expect(money(-0.001, { dec: 2 })).toBe('$0.00');
    expect(money(2.1, { dec: 2, signo: true })).toBe('+$2.10');
    expect(money(1.37)).toBe('$1');
  });
});

describe('usd', () => {
  it('dólares con centavos y prefijo US$', () => {
    expect(usd(30.5)).toBe('US$30.50');
    expect(usd(1234.567)).toBe('US$1,234.57');
    expect(usd(0.0305, 4)).toBe('US$0.0305');
    expect(usd(-12)).toBe('-US$12.00');
    expect(usd(-0.001)).toBe('US$0.00');
    expect(usd(null)).toBe('—');
  });
});

describe('privacidad del fixture', () => {
  it('solo agregados: sin teléfonos, números de cliente, correos, UUID ni wamid', () => {
    const txt = JSON.stringify(impactoRaw());
    expect(txt).not.toMatch(/\d{6,}/);
    expect(txt).not.toMatch(/wamid/i);
    expect(txt).not.toMatch(/@/);
    expect(txt).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
    expect(txt).not.toMatch(/\+\d/);
  });
});
