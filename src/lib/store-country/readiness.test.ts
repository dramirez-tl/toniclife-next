import { describe, expect, it } from 'vitest';
import { storeCountry } from './countries';
import {
  READINESS_LINKS,
  buildReadiness,
  joinList,
  readinessVerdict,
  type ReadinessInput,
  type ReadinessItem,
} from './readiness';

const mexico = storeCountry('MX');
const colombia = storeCountry('CO');
const usa = storeCountry('US');

/** México como está hoy: todo en orden salvo Frontera sin almacén, la migración 200 y las compras apagadas. */
const today: ReadinessInput = {
  country: mexico,
  warehouses: [
    { code: 'MX', name: 'México', isZone: false, status: 'ready', warehouse: '164 · Irapuato Almacén General' },
    { code: 'FN', name: 'Frontera', isZone: true, status: 'no_warehouse', warehouse: null },
  ],
  stripe: { mx: true, us: true },
  shipping: { origin: { kind: 'own' }, standardCost: '$150.00 MXN' },
  carriers: { kind: 'pending_migration' },
  purchasesEnabled: false,
};

const byId = (items: ReadinessItem[], id: string): ReadinessItem => {
  const found = items.find((i) => i.id === id);
  if (!found) throw new Error(`sin renglón ${id}`);
  return found;
};

describe('store-country/readiness · renglones', () => {
  it('México hoy: separa México de Frontera y dice dónde se arregla cada cosa', () => {
    const items = buildReadiness(today);
    expect(items.map((i) => i.id)).toEqual(['store', 'warehouse', 'warehouse:FN', 'payments', 'shipping', 'carriers', 'purchases']);
    expect(items.every((i) => !i.pending)).toBe(true);

    expect(byId(items, 'store')).toMatchObject({ state: 'ok', title: 'Tienda publicada' });
    expect(byId(items, 'warehouse')).toMatchObject({
      state: 'ok',
      title: 'Almacén que surte a México',
      detail: 'Los pedidos salen de 164 · Irapuato Almacén General.',
    });

    // Frontera sin almacén propio NO es algo que falte: compra en la tienda de México y le
    // surte el almacén de México. Solo se avisa lo que cambia (su carrito no revisa existencias).
    const frontera = byId(items, 'warehouse:FN');
    expect(frontera.state).toBe('attention');
    expect(frontera.title).toBe('Almacén que surte a Frontera');
    expect(frontera.detail).toBe(
      'Frontera compra en la tienda de México y sus pedidos salen del almacén de México. Como no tiene almacén asignado, su carrito no revisa las existencias: un producto agotado se le avisa hasta el momento de pagar. Para que lo vea antes, en Almacenes y envíos elige «Usar los mismos almacenes que México».',
    );
    expect(frontera.action).toEqual({ label: 'Abrir Almacenes y envíos', href: READINESS_LINKS.routes });

    expect(byId(items, 'payments')).toMatchObject({
      state: 'ok',
      detail: 'Se cobra con tarjeta por Stripe, en la cuenta de México.',
    });
    expect(byId(items, 'shipping')).toMatchObject({
      state: 'ok',
      detail: 'Tiene sus costos capturados: el envío estándar cuesta $150.00 MXN.',
    });

    const carriers = byId(items, 'carriers');
    expect(carriers.state).toBe('attention');
    expect(carriers.detail).toBe(
      'Falta aplicar la migración 200 para guardar paqueterías. Mientras tanto, la paquetería se escribe a mano en cada envío.',
    );

    const purchases = byId(items, 'purchases');
    expect(purchases.state).toBe('attention');
    // La palabra del estado dice lo que pasa, no un "Revisar" genérico.
    expect(purchases.label).toBe('Apagadas');
    expect(purchases.detail).toContain('apagadas para todos los países');
    expect(purchases.action?.href).toBe('/admin/sistema?tab=liberaciones');
    expect(byId(buildReadiness({ ...today, purchasesEnabled: true }), 'purchases')).toMatchObject({
      state: 'ok',
      label: 'Encendidas',
      detail: 'Las compras en línea están encendidas.',
    });
    // Los demás renglones usan la palabra genérica de su estado.
    expect(items.filter((i) => i.key !== 'purchases').every((i) => i.label === undefined)).toBe(true);
  });

  it('un país sin zonas tiene un solo renglón de almacén', () => {
    const items = buildReadiness({
      ...today,
      country: usa,
      warehouses: [{ code: 'US', name: 'Estados Unidos', isZone: false, status: 'ready', warehouse: '205 · Dallas' }],
    });
    expect(items.filter((i) => i.key === 'warehouse').map((i) => [i.id, i.title])).toEqual([['warehouse', 'Almacén que surte']]);
    expect(byId(items, 'payments').detail).toBe('Se cobra con tarjeta por Stripe, en la cuenta de Estados Unidos.');
  });

  it('almacén: cada estado dice por qué no se puede enviar', () => {
    const row = (status: 'no_warehouse' | 'paused' | 'branch_inactive' | 'cross_pending') =>
      byId(
        buildReadiness({
          ...today,
          country: colombia,
          warehouses: [{ code: 'CO', name: 'Colombia', isZone: false, status, warehouse: null }],
        }),
        'warehouse',
      );
    expect(row('no_warehouse')).toMatchObject({
      state: 'missing',
      detail: 'No tiene almacén asignado: no se pueden enviar pedidos a domicilio.',
    });
    expect(row('paused').detail).toContain('en pausa');
    expect(row('branch_inactive').detail).toContain('desactivada');
    expect(row('cross_pending').detail).toContain('entre países');
    for (const status of ['no_warehouse', 'paused', 'branch_inactive', 'cross_pending'] as const) {
      expect(row(status).state).toBe('missing');
      expect(row(status).action?.href).toBe(READINESS_LINKS.routes);
    }
  });

  it('cobro: cuenta de Stripe sin llaves, Mercado Pago pendiente y país sin pasarela', () => {
    expect(byId(buildReadiness({ ...today, stripe: { mx: false, us: true } }), 'payments')).toMatchObject({
      state: 'missing',
      detail: 'La cuenta de Stripe de México no tiene sus llaves en el servidor: hoy no se puede cobrar. Las configura Sistemas.',
    });
    expect(byId(buildReadiness({ ...today, country: colombia }), 'payments')).toMatchObject({
      state: 'missing',
      detail: 'Todavía no hay forma de cobrar en línea en Colombia. Se usará Mercado Pago cuando se conecte.',
    });
    // Colombia y Guatemala no dependen de Stripe: no esperan su consulta ni les afecta que falle.
    const guatemala = byId(buildReadiness({ ...today, country: storeCountry('GT'), stripe: undefined }), 'payments');
    expect(guatemala.pending).toBe(false);
    expect(guatemala.state).toBe('missing');
    expect(guatemala.detail).toContain('falta elegir y conectar un servicio de cobro');
  });

  it('costos de envío: propios, de fábrica y los de México en otra moneda', () => {
    const shipping = (origin: NonNullable<ReadinessInput['shipping']>['origin'], standardCost: string | null) =>
      byId(buildReadiness({ ...today, country: colombia, shipping: { origin, standardCost } }), 'shipping');

    expect(shipping({ kind: 'defaults', mexicoAmounts: true }, '$150.00 COP')).toMatchObject({
      state: 'missing',
      detail:
        'No tiene costos propios: cobraría los montos de México en su moneda ($150.00 COP de envío estándar). Hay que capturarlos antes de abrir.',
      action: { label: 'Ir a costos de envío', href: '#costos-envio' },
    });
    expect(shipping({ kind: 'defaults', mexicoAmounts: false }, '$12.00 USD')).toMatchObject({
      state: 'attention',
      detail: 'Usa los montos iniciales del sistema (envío estándar de $12.00 USD). Revísalos y guárdalos para dejarlos confirmados.',
    });
    // Sin poder leer los montos, igual se dice de dónde salen.
    expect(shipping({ kind: 'defaults', mexicoAmounts: true }, null).detail).toBe(
      'No tiene costos propios: cobraría los montos de México en su moneda. Hay que capturarlos antes de abrir.',
    );
    expect(shipping({ kind: 'own' }, null)).toMatchObject({ state: 'ok', detail: 'Tiene sus costos de envío capturados.' });
    expect(shipping({ kind: 'inherited', from: 'MX' }, null).detail).toBe('Usa los costos de envío de México.');
    expect(shipping({ kind: 'unknown' }, '$150.00 COP').state).toBe('unknown');
  });

  it('paquetería: sin catálogo, sin ninguna, sin predeterminada y con predeterminada', () => {
    const carriers = (value: ReadinessInput['carriers']) => byId(buildReadiness({ ...today, carriers: value }), 'carriers');
    expect(carriers({ kind: 'unavailable' })).toMatchObject({ state: 'attention' });
    expect(carriers({ kind: 'unavailable' }).detail).toContain('todavía no está disponible en el servidor');
    expect(carriers({ kind: 'catalog', active: 0, defaultName: null }).detail).toBe(
      'No hay paqueterías registradas: Almacén escribe la paquetería a mano en cada envío.',
    );
    expect(carriers({ kind: 'catalog', active: 1, defaultName: null }).detail).toContain('Hay 1 paquetería activa, pero ninguna predeterminada');
    expect(carriers({ kind: 'catalog', active: 3, defaultName: null }).detail).toContain('Hay 3 paqueterías activas');
    expect(carriers({ kind: 'catalog', active: 2, defaultName: 'FedEx' })).toMatchObject({
      state: 'ok',
      detail: 'FedEx es la predeterminada (2 activas).',
    });
    expect(carriers({ kind: 'catalog', active: 1, defaultName: 'FedEx' }).detail).toBe('FedEx es la predeterminada.');
  });

  it('lo que todavía se consulta sale como pendiente y lo que falló dice que no se pudo', () => {
    const loading = buildReadiness({
      country: mexico,
      warehouses: undefined,
      stripe: undefined,
      shipping: undefined,
      carriers: undefined,
      purchasesEnabled: undefined,
    });
    // La tienda publicada no depende de ninguna consulta.
    expect(loading.filter((i) => i.pending).map((i) => i.id)).toEqual([
      'warehouse',
      'warehouse:FN',
      'payments',
      'shipping',
      'carriers',
      'purchases',
    ]);
    expect(loading.filter((i) => i.pending).every((i) => i.state === 'unknown' && i.detail === 'Consultando…')).toBe(true);

    const failed = buildReadiness({
      country: mexico,
      warehouses: null,
      stripe: null,
      shipping: null,
      carriers: null,
      purchasesEnabled: null,
    });
    expect(failed.filter((i) => i.state === 'unknown' && !i.pending).map((i) => i.id)).toEqual([
      'warehouse',
      'warehouse:FN',
      'payments',
      'shipping',
      'carriers',
      'purchases',
    ]);
    expect(byId(failed, 'warehouse:FN').detail).toBe('No se pudieron consultar los almacenes.');
    expect(byId(failed, 'purchases').detail).toBe('No se pudo consultar si las compras en línea están encendidas.');
  });
});

describe('store-country/readiness · veredicto', () => {
  const verdictOf = (input: ReadinessInput) => readinessVerdict(buildReadiness(input), input.country.name);
  const complete: ReadinessInput = {
    ...today,
    warehouses: [
      { code: 'MX', name: 'México', isZone: false, status: 'ready', warehouse: '164 · Irapuato' },
      { code: 'FN', name: 'Frontera', isZone: true, status: 'ready', warehouse: '164 · Irapuato' },
    ],
    carriers: { kind: 'catalog', active: 2, defaultName: 'FedEx' },
    purchasesEnabled: true,
  };

  /** México con su almacén en pausa: eso sí le impide vender. */
  const paused: ReadinessInput = {
    ...today,
    warehouses: [
      { code: 'MX', name: 'México', isZone: false, status: 'paused', warehouse: null },
      { code: 'FN', name: 'Frontera', isZone: true, status: 'no_warehouse', warehouse: null },
    ],
  };

  it('México hoy: no le falta nada; Frontera sin almacén propio y la paquetería son puntos por revisar', () => {
    expect(verdictOf(today)).toEqual({
      state: 'attention',
      pending: false,
      title: 'Lista, pero con las compras apagadas',
      detail:
        'Nadie puede comprar todavía porque las compras en línea están apagadas para todos los países. Antes de encenderlas conviene revisar el almacén de Frontera y la paquetería.',
    });
  });

  it('lo que falta manda, y las compras apagadas se dicen aparte', () => {
    expect(verdictOf(paused)).toEqual({
      state: 'missing',
      pending: false,
      title: 'Todavía no está lista para vender',
      detail: 'Falta resolver el almacén de México. Además, las compras en línea están apagadas para todos los países.',
    });
    const co = verdictOf({
      ...today,
      country: colombia,
      warehouses: [{ code: 'CO', name: 'Colombia', isZone: false, status: 'ready', warehouse: '400 · Bogotá' }],
      shipping: { origin: { kind: 'defaults', mexicoAmounts: true }, standardCost: '$150.00 COP' },
      purchasesEnabled: true,
    });
    expect(co.state).toBe('missing');
    expect(co.detail).toBe('Falta resolver la publicación de la tienda, el cobro en línea y los costos de envío.');
  });

  it('con todo en orden y las compras encendidas está lista', () => {
    expect(verdictOf(complete)).toMatchObject({ state: 'ok', title: 'Lista para vender' });
  });

  it('con todo en orden pero las compras apagadas lo dice así', () => {
    expect(verdictOf({ ...complete, purchasesEnabled: false })).toMatchObject({
      state: 'attention',
      title: 'Lista, pero con las compras apagadas',
      detail: 'A México no le falta nada. Nadie puede comprar todavía porque las compras en línea están apagadas para todos los países.',
    });
    // Y si además hay algo por revisar, lo nombra.
    const withReview = verdictOf({ ...complete, purchasesEnabled: false, carriers: { kind: 'pending_migration' } });
    expect(withReview.title).toBe('Lista, pero con las compras apagadas');
    expect(withReview.detail).toContain('conviene revisar la paquetería');
  });

  it('con puntos por revisar puede vender', () => {
    expect(
      verdictOf({ ...complete, carriers: { kind: 'catalog', active: 0, defaultName: null }, shipping: { origin: { kind: 'defaults', mexicoAmounts: false }, standardCost: null } }),
    ).toMatchObject({
      state: 'attention',
      title: 'Puede vender, con puntos por revisar',
      detail: 'Conviene revisar los costos de envío y la paquetería.',
    });
  });

  it('mientras se consulta no adelanta un "lista"; lo que no se pudo leer se dice', () => {
    expect(verdictOf({ ...complete, stripe: undefined })).toMatchObject({ state: 'unknown', pending: true, title: 'Revisando…' });
    // Pero algo que ya se sabe que falta no espera a lo demás.
    expect(verdictOf({ ...paused, stripe: undefined })).toMatchObject({ state: 'missing', pending: true });
    expect(verdictOf({ ...complete, stripe: null })).toMatchObject({
      state: 'unknown',
      pending: false,
      title: 'No se pudo revisar todo',
    });
    expect(verdictOf({ ...complete, stripe: null }).detail).toContain('No se pudo consultar el cobro en línea.');
  });

  it('une listas en español', () => {
    expect(joinList([])).toBe('');
    expect(joinList(['a'])).toBe('a');
    expect(joinList(['a', 'b'])).toBe('a y b');
    expect(joinList(['a', 'b', 'c'])).toBe('a, b y c');
  });
});
