import { QueryClient, QueryObserver, focusManager } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PickupBranch } from '@/types/cart';
import {
  PICKUP_AVAILABILITY_STALE_MS,
  PICKUP_BRANCH_UNAVAILABLE_CODE,
  PICKUP_LIST_STALE_MS,
  branchPlace,
  cleanBranchPhone,
  cleanBranchText,
  filterPickupBranches,
  findPickupBranch,
  foldSearchText,
  isPickupBranchSelectable,
  isPickupCheckoutRejection,
  matchesPickupSearch,
  missingItemsSummary,
  noPickupBranchAvailable,
  pickupAddressLine,
  pickupBranchesRefreshPolicy,
  pickupCartSignature,
  pickupCityState,
  pickupMapUrl,
  pickupPhoneHref,
  pickupPlace,
  pickupSelectionProblem,
  sortPickupBranches,
} from './pickup-branches';

/** Sucursal como la manda el API a la tienda de México. */
function branch(over: Partial<PickupBranch> = {}): PickupBranch {
  return {
    id: 'b-164',
    code: '164',
    name: 'Puebla Centro',
    addressStreet: 'Av. Juárez 123',
    addressCity: 'Puebla',
    addressState: 'Puebla',
    addressZip: '72000',
    phone: '222 123 4567',
    latitude: 19.0414,
    longitude: -98.2063,
    countryCode: 'MX',
    countryName: 'México',
    ...over,
  };
}

const tehuacan = branch({
  id: 'b-201',
  code: '201',
  name: 'Tehuacán',
  addressStreet: 'Reforma Sur 10',
  addressCity: 'Tehuacán',
  addressZip: '75700',
  latitude: null,
  longitude: null,
});
const merida = branch({
  id: 'b-310',
  code: '310',
  name: 'Mérida Norte',
  addressStreet: '.',
  addressCity: 'Mérida',
  addressState: 'Yucatán',
  addressZip: '97000',
  phone: null,
  latitude: null,
  longitude: null,
});

describe('checkout/pickup-branches · limpieza de lo capturado', () => {
  it('"." , guiones, vacío y "sin dato" escritos = sin dato', () => {
    for (const dirty of ['.', ' . ', '-', '--', '..', ',', '', '   ', 'N/A', 'n/a', 'NA', 'S/D', 'null', 'undefined']) {
      expect(cleanBranchText(dirty)).toBe('');
    }
    expect(cleanBranchText(null)).toBe('');
    expect(cleanBranchText(undefined)).toBe('');
    expect(cleanBranchText({})).toBe('');
    expect(cleanBranchText(Number.NaN)).toBe('');
  });

  it('lo que sí es un dato se conserva, sin espacios de sobra', () => {
    expect(cleanBranchText('  Av.  Juárez   123 ')).toBe('Av. Juárez 123');
    expect(cleanBranchText('S/N')).toBe('S/N');
    expect(cleanBranchText(72000)).toBe('72000');
  });

  it('teléfono: sin 7 dígitos o con puros ceros no es un teléfono', () => {
    expect(cleanBranchPhone('222 123 4567')).toBe('222 123 4567');
    expect(cleanBranchPhone('.')).toBe('');
    expect(cleanBranchPhone('0')).toBe('');
    expect(cleanBranchPhone('0000000000')).toBe('');
    expect(cleanBranchPhone('12345')).toBe('');
    expect(cleanBranchPhone(null)).toBe('');
  });

  it('enlace para marcar: solo dígitos, sin extensión ni prefijos viejos', () => {
    expect(pickupPhoneHref('222 123 4567')).toBe('tel:2221234567');
    expect(pickupPhoneHref('(222) 123-4567 ext. 12')).toBe('tel:2221234567');
    expect(pickupPhoneHref('222 123 4567 Ext 1234567')).toBe('tel:2221234567');
    expect(pickupPhoneHref('+52 222 123 4567')).toBe('tel:+522221234567');
    expect(pickupPhoneHref('01 222 123 4567')).toBe('tel:2221234567');
    expect(pickupPhoneHref('045 222 123 4567')).toBe('tel:2221234567');
  });

  it('enlace para marcar: con varios teléfonos, el primero que sea un número completo', () => {
    expect(pickupPhoneHref('2221234567 / 2227654321')).toBe('tel:2221234567');
    expect(pickupPhoneHref('2221234567 y 2227654321')).toBe('tel:2221234567');
    expect(pickupPhoneHref('123, 2221234567')).toBe('tel:2221234567');
    expect(pickupPhoneHref('.')).toBeNull();
    expect(pickupPhoneHref('12345')).toBeNull();
    expect(pickupPhoneHref(null)).toBeNull();
  });

  it('la sucursal limpia: sin nombre usa la clave; las coordenadas van las dos o ninguna', () => {
    expect(pickupPlace(branch())).toEqual({
      name: 'Puebla Centro',
      street: 'Av. Juárez 123',
      city: 'Puebla',
      state: 'Puebla',
      zip: '72000',
      phone: '222 123 4567',
      latitude: 19.0414,
      longitude: -98.2063,
      country: 'México',
    });
    const dirty = pickupPlace(
      branch({ name: ' . ', addressStreet: '.', addressCity: '', addressState: '.', addressZip: null, phone: '.', longitude: null }),
    );
    expect(dirty).toEqual({
      name: '164',
      street: '',
      city: '',
      state: '',
      zip: '',
      phone: '',
      latitude: null,
      longitude: null,
      country: 'México',
    });
  });

  it('código postal: sin la etiqueta que a veces viene capturada con él', () => {
    const zip = (value: unknown) => branchPlace({ zip: value }).zip;
    expect(zip('72000')).toBe('72000');
    expect(zip(72000)).toBe('72000');
    expect(zip('C.P. 72000')).toBe('72000');
    expect(zip('CP: 72000')).toBe('72000');
    expect(zip('c. p. 72000')).toBe('72000');
    expect(zip('CP')).toBe('');
    expect(zip('.')).toBe('');
    // Así el renglón no dice "C. P. C.P. 72000".
    expect(pickupAddressLine(branchPlace({ street: 'Av. Juárez 123', zip: 'C.P. 72000' }))).toBe('Av. Juárez 123, C. P. 72000');
  });

  it('coordenadas: acepta texto numérico; 0, fuera de rango o basura = sin coordenadas', () => {
    const coords = (latitude: unknown, longitude: unknown) => {
      const place = branchPlace({ latitude, longitude });
      return [place.latitude, place.longitude];
    };
    expect(coords('19.0414', '-98.2063')).toEqual([19.0414, -98.2063]);
    expect(coords(0, 0)).toEqual([null, null]);
    expect(coords(19.04, 0)).toEqual([null, null]);
    // Latitud y longitud capturadas al revés: -98 no es una latitud.
    expect(coords(-98.2063, 19.0414)).toEqual([null, null]);
    expect(coords('abc', '')).toEqual([null, null]);
    expect(coords(undefined, undefined)).toEqual([null, null]);
    expect(branchPlace(null).name).toBe('');
  });
});

describe('checkout/pickup-branches · cómo se pinta la sucursal', () => {
  it('"Ciudad, Estado" sin huecos ni comas sueltas', () => {
    expect(pickupCityState({ city: 'Tehuacán', state: 'Puebla' })).toBe('Tehuacán, Puebla');
    expect(pickupCityState({ city: 'Puebla', state: 'Puebla' })).toBe('Puebla, Puebla');
    expect(pickupCityState({ city: '', state: 'Puebla' })).toBe('Puebla');
    expect(pickupCityState({ city: 'Tehuacán', state: '' })).toBe('Tehuacán');
    expect(pickupCityState({ city: '', state: '' })).toBe('');
  });

  it('si la ciudad ya trae el estado al final, no se repite', () => {
    expect(pickupCityState({ city: 'Tehuacán, Puebla', state: 'Puebla' })).toBe('Tehuacán, Puebla');
    expect(pickupCityState({ city: 'TEHUACAN PUEBLA', state: 'Puebla' })).toBe('TEHUACAN PUEBLA');
    // "Puebla de Zaragoza" no termina en el estado: van los dos.
    expect(pickupCityState({ city: 'Puebla de Zaragoza', state: 'Puebla' })).toBe('Puebla de Zaragoza, Puebla');
  });

  it('renglón de dirección: calle, ciudad y estado, C. P.; lo que falta no deja hueco', () => {
    expect(pickupAddressLine(pickupPlace(branch()))).toBe('Av. Juárez 123, Puebla, Puebla, C. P. 72000');
    expect(pickupAddressLine(pickupPlace(merida))).toBe('Mérida, Yucatán, C. P. 97000');
    expect(pickupAddressLine(pickupPlace(branch({ addressCity: '.', addressState: '', addressZip: '' })))).toBe('Av. Juárez 123');
    expect(pickupAddressLine({ street: '', city: '', state: '', zip: '' })).toBe('');
  });

  it('la etiqueta del código postal la pone la pantalla (idioma)', () => {
    expect(pickupAddressLine(pickupPlace(branch()), (zip) => `ZIP ${zip}`)).toBe('Av. Juárez 123, Puebla, Puebla, ZIP 72000');
  });

  it('mapa: por coordenadas si las tiene', () => {
    expect(pickupMapUrl(pickupPlace(branch()))).toBe(
      'https://www.google.com/maps/search/?api=1&query=19.0414%2C-98.2063',
    );
  });

  it('mapa: sin coordenadas, por dirección (con el país); sin calle no hay enlace', () => {
    expect(pickupMapUrl(pickupPlace(tehuacan))).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Reforma Sur 10, Tehuacán, Puebla, 75700, México')}`,
    );
    // Mis pedidos: la sucursal del pedido no trae coordenadas ni país.
    expect(pickupMapUrl(branchPlace({ street: 'Reforma Sur 10', city: 'Tehuacán', state: 'Puebla', zip: '75700' }))).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Reforma Sur 10, Tehuacán, Puebla, 75700')}`,
    );
    expect(pickupMapUrl(pickupPlace(merida))).toBeNull();
    expect(pickupMapUrl({ street: '', city: '', state: '', zip: '' })).toBeNull();
  });
});

describe('checkout/pickup-branches · búsqueda', () => {
  const all = [branch(), tehuacan, merida];
  const ids = (query: string) => filterPickupBranches(all, query).map((b) => b.id);

  it('sin acentos ni mayúsculas ni signos', () => {
    expect(foldSearchText('  Tehuacán, PUE. ')).toBe('tehuacan pue');
    expect(foldSearchText('Peñón')).toBe('penon');
    expect(foldSearchText(null)).toBe('');
  });

  it('por nombre, ciudad, estado, código postal o clave', () => {
    expect(ids('tehuacan')).toEqual(['b-201']);
    expect(ids('MÉRIDA')).toEqual(['b-310']);
    expect(ids('yucatan')).toEqual(['b-310']);
    expect(ids('puebla')).toEqual(['b-164', 'b-201']);
    expect(ids('75700')).toEqual(['b-201']);
    expect(ids('164')).toEqual(['b-164']);
  });

  it('cada palabra escrita debe aparecer; el orden no importa', () => {
    expect(ids('puebla centro')).toEqual(['b-164']);
    expect(ids('centro puebla')).toEqual(['b-164']);
    expect(ids('puebla norte')).toEqual([]);
    expect(matchesPickupSearch(merida, 'norte, yucatán')).toBe(true);
  });

  it('sin texto salen todas; no se busca en la calle ni en el teléfono', () => {
    expect(ids('')).toEqual(['b-164', 'b-201', 'b-310']);
    expect(ids('   ')).toEqual(['b-164', 'b-201', 'b-310']);
    expect(ids('juarez')).toEqual([]);
    expect(ids('2221234567')).toEqual([]);
    expect(filterPickupBranches(undefined, 'puebla')).toEqual([]);
  });

  it('un dato sucio no estorba la búsqueda', () => {
    const dirty = branch({ id: 'b-9', name: 'Cholula', addressCity: '.', addressState: '.', addressZip: '' });
    expect(matchesPickupSearch(dirty, 'cholula')).toBe(true);
    expect(matchesPickupSearch(dirty, '.')).toBe(true);
  });
});

describe('checkout/pickup-branches · disponibilidad', () => {
  const available = branch({ id: 'a', availability: 'available', missingItems: [] });
  const unknown = branch({ id: 'u' });
  const unavailable = branch({ id: 'x', name: 'Atlixco', availability: 'unavailable', missingItems: ['Jimmy Coffee'] });

  it('se puede elegir salvo que el API diga que no alcanza; sin dato, se puede', () => {
    expect(isPickupBranchSelectable(available)).toBe(true);
    expect(isPickupBranchSelectable(unknown)).toBe(true);
    expect(isPickupBranchSelectable(unavailable)).toBe(false);
  });

  it('las que no tienen todo van al final; dentro de cada grupo, el orden del API', () => {
    const second = branch({ id: 'x2', availability: 'unavailable' });
    const sorted = sortPickupBranches([unavailable, available, second, unknown]);
    expect(sorted.map((b) => b.id)).toEqual(['a', 'u', 'x', 'x2']);
    expect(sortPickupBranches(undefined)).toEqual([]);
  });

  it('ninguna tiene todo el pedido: solo si hay sucursales y todas dicen que no', () => {
    expect(noPickupBranchAvailable([unavailable])).toBe(true);
    expect(noPickupBranchAvailable([unavailable, available])).toBe(false);
    expect(noPickupBranchAvailable([unavailable, unknown])).toBe(false);
    expect(noPickupBranchAvailable([])).toBe(false);
    expect(noPickupBranchAvailable(undefined)).toBe(false);
  });

  it('lo que falta: hasta 3 nombres y cuántos más', () => {
    expect(missingItemsSummary(['Jimmy Coffee', 'Omega 3'])).toEqual({ names: ['Jimmy Coffee', 'Omega 3'], more: 0 });
    expect(missingItemsSummary(['A', 'B', 'C', 'D', 'E'])).toEqual({ names: ['A', 'B', 'C'], more: 2 });
    expect(missingItemsSummary(['A', 'B', 'C', 'D'], 2)).toEqual({ names: ['A', 'B'], more: 2 });
  });

  it('lo que falta: sin nombres repetidos ni vacíos; sin dato no se pinta', () => {
    expect(missingItemsSummary([' Jimmy Coffee ', 'Jimmy Coffee', '', '.', null])).toEqual({
      names: ['Jimmy Coffee'],
      more: 0,
    });
    expect(missingItemsSummary([])).toBeNull();
    expect(missingItemsSummary(undefined)).toBeNull();
    expect(missingItemsSummary(null)).toBeNull();
  });
});

describe('checkout/pickup-branches · la sucursal elegida', () => {
  const available = branch({ id: 'a', availability: 'available' });
  const unavailable = branch({ id: 'x', name: 'Atlixco', availability: 'unavailable', missingItems: ['Jimmy Coffee'] });

  it('se encuentra por id; sin id o sin lista, nada', () => {
    expect(findPickupBranch([available, unavailable], 'x')).toBe(unavailable);
    expect(findPickupBranch([available], 'otra')).toBeUndefined();
    expect(findPickupBranch([available], '')).toBeUndefined();
    expect(findPickupBranch(undefined, 'a')).toBeUndefined();
  });

  it('sigue sirviendo: disponible o sin dato de disponibilidad', () => {
    expect(pickupSelectionProblem([available, unavailable], 'a')).toBeNull();
    expect(pickupSelectionProblem([branch({ id: 'u' })], 'u')).toBeNull();
  });

  it('tras volver a pedir la lista: ya no tiene existencias, o ya no se ofrece', () => {
    expect(pickupSelectionProblem([available, unavailable], 'x')).toEqual({ kind: 'unavailable', name: 'Atlixco' });
    expect(pickupSelectionProblem([available], 'x')).toEqual({ kind: 'gone' });
    expect(pickupSelectionProblem([], 'x')).toEqual({ kind: 'gone' });
  });

  it('sin sucursal elegida o sin lista todavía no hay nada que avisar', () => {
    expect(pickupSelectionProblem([unavailable], '')).toBeNull();
    expect(pickupSelectionProblem([unavailable], null)).toBeNull();
    expect(pickupSelectionProblem(undefined, 'x')).toBeNull();
    expect(pickupSelectionProblem(null, 'x')).toBeNull();
  });
});

describe('checkout/pickup-branches · cuándo se vuelve a pedir la lista', () => {
  it('checkout (con país): vale 30 s y se vuelve a pedir al regresar a la ventana', () => {
    expect(PICKUP_AVAILABILITY_STALE_MS).toBe(30_000);
    expect(pickupBranchesRefreshPolicy('pais-mx')).toEqual({ staleTime: 30_000, refetchOnWindowFocus: true });
  });

  it('lista sola (sin país): vale 10 min y no se vuelve a pedir al regresar', () => {
    expect(PICKUP_LIST_STALE_MS).toBe(600_000);
    for (const none of [undefined, null, '']) {
      expect(pickupBranchesRefreshPolicy(none)).toEqual({ staleTime: 600_000, refetchOnWindowFocus: false });
    }
  });

  // Caso real (12-nov-2026): el checkout pidió la lista a las 09:06; a las 09:22 una sucursal
  // empezó a ofrecerse y a las 09:25 seguía sin aparecer en esa pantalla. La app apaga el
  // "volver a pedir al regresar a la ventana" para todas las consultas (QueryProvider), así
  // que la del checkout tiene que encenderlo expresamente.
  describe('con la configuración de la app (QueryProvider: refetchOnWindowFocus = false)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      focusManager.setFocused(undefined);
      vi.useRealTimers();
    });

    /** Una pantalla que muestra la lista con estas opciones; `away` = irse a otra ventana y volver. */
    async function watchList(options: { staleTime: number; refetchOnWindowFocus?: boolean }) {
      const client = new QueryClient({
        defaultOptions: { queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false } },
      });
      client.mount();
      const request = vi.fn(async () => [] as PickupBranch[]);
      const observer = new QueryObserver(client, { queryKey: ['pickup-branches'], queryFn: request, ...options });
      const unsubscribe = observer.subscribe(() => {});
      await vi.advanceTimersByTimeAsync(1);
      return {
        request,
        async away(ms: number) {
          focusManager.setFocused(false);
          await vi.advanceTimersByTimeAsync(ms);
          focusManager.setFocused(true);
          await vi.advanceTimersByTimeAsync(1);
        },
        close() {
          unsubscribe();
          client.unmount();
          client.clear();
        },
      };
    }

    it('checkout: al volver pasados 30 s la lista se pide de nuevo; antes de eso, no', async () => {
      const screen = await watchList(pickupBranchesRefreshPolicy('pais-mx'));
      expect(screen.request).toHaveBeenCalledTimes(1);
      await screen.away(10_000);
      expect(screen.request).toHaveBeenCalledTimes(1);
      await screen.away(31_000);
      expect(screen.request).toHaveBeenCalledTimes(2);
      await screen.away(16 * 60_000);
      expect(screen.request).toHaveBeenCalledTimes(3);
      screen.close();
    });

    it('lista sola: no se vuelve a pedir al regresar, ni pasados sus 10 min', async () => {
      const screen = await watchList(pickupBranchesRefreshPolicy(undefined));
      await screen.away(11 * 60_000);
      expect(screen.request).toHaveBeenCalledTimes(1);
      screen.close();
    });

    it('control: con solo los 30 s (como estaba) la lista NO se volvía a pedir al regresar', async () => {
      const screen = await watchList({ staleTime: 30_000 });
      await screen.away(16 * 60_000);
      expect(screen.request).toHaveBeenCalledTimes(1);
      screen.close();
    });
  });
});

describe('checkout/pickup-branches · firma del carrito', () => {
  it('productos y piezas, sin depender del orden de las líneas', () => {
    const a = pickupCartSignature([
      { productId: 'p-2', quantity: 1 },
      { productId: 'p-1', quantity: 3 },
    ]);
    const b = pickupCartSignature([
      { productId: 'p-1', quantity: 3 },
      { productId: 'p-2', quantity: 1 },
    ]);
    expect(a).toBe('p-1:3|p-2:1');
    expect(b).toBe(a);
  });

  it('cambia con una cantidad, un producto nuevo o uno que se quita', () => {
    const base = pickupCartSignature([{ productId: 'p-1', quantity: 3 }]);
    expect(pickupCartSignature([{ productId: 'p-1', quantity: 4 }])).not.toBe(base);
    expect(pickupCartSignature([{ productId: 'p-1', quantity: 3 }, { productId: 'p-2', quantity: 1 }])).not.toBe(base);
    expect(pickupCartSignature([])).not.toBe(base);
  });

  it('dos líneas del mismo producto (otra personalización) suman', () => {
    expect(
      pickupCartSignature([
        { productId: 'p-1', quantity: 1 },
        { productId: 'p-1', quantity: 2 },
      ]),
    ).toBe('p-1:3');
  });

  it('carrito vacío o sin cargar = firma vacía; la cantidad puede venir como texto', () => {
    expect(pickupCartSignature([])).toBe('');
    expect(pickupCartSignature(undefined)).toBe('');
    expect(pickupCartSignature(null)).toBe('');
    expect(pickupCartSignature([{ productId: 'p-1', quantity: '2' }])).toBe('p-1:2');
    expect(pickupCartSignature([{ productId: 'p-1', quantity: 0 }])).toBe('');
  });
});

describe('checkout/pickup-branches · rechazo del API al pagar', () => {
  it('400 con el código de sucursal no disponible', () => {
    const failure = { status: 400, code: PICKUP_BRANCH_UNAVAILABLE_CODE, message: 'La sucursal no está disponible' };
    expect(PICKUP_BRANCH_UNAVAILABLE_CODE).toBe('CHK_PICKUP_BRANCH_UNAVAILABLE');
    expect(isPickupCheckoutRejection(failure, true)).toBe(true);
    expect(isPickupCheckoutRejection(failure, false)).toBe(true);
  });

  it('400 "Stock insuficiente…" solo cuenta estando en recoger', () => {
    const failure = { status: 400, code: null, message: 'Stock insuficiente para: Jimmy Coffee' };
    expect(isPickupCheckoutRejection(failure, true)).toBe(true);
    expect(isPickupCheckoutRejection(failure, false)).toBe(false);
    expect(isPickupCheckoutRejection({ ...failure, message: ['Stock insuficiente para: Jimmy Coffee'] }, true)).toBe(true);
    expect(isPickupCheckoutRejection({ ...failure, message: '  stock insuficiente para: X' }, true)).toBe(true);
  });

  it('otro estado u otro mensaje no es un rechazo de la sucursal', () => {
    expect(isPickupCheckoutRejection({ status: 422, code: PICKUP_BRANCH_UNAVAILABLE_CODE, message: null }, true)).toBe(false);
    expect(isPickupCheckoutRejection({ status: 409, code: 'CHK_COUNTRY_MISMATCH', message: 'Stock insuficiente' }, true)).toBe(false);
    expect(isPickupCheckoutRejection({ status: 400, code: null, message: 'El cupón no es válido' }, true)).toBe(false);
    expect(isPickupCheckoutRejection({ status: 400, code: null, message: undefined }, true)).toBe(false);
    expect(isPickupCheckoutRejection({ status: null, code: null, message: null }, true)).toBe(false);
  });
});
