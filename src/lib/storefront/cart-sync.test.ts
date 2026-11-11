import { describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import type { Cart } from '@/types/cart';
import { cartKeys } from './cart-query-keys';
import {
  applyCartMutation,
  cartChangeElsewhere,
  cartMoved,
  cartSummaryMismatch,
  createCartActivity,
  readCartInSync,
  resolveCartRead,
  settleCartMutation,
} from './cart-sync';

const line = (id: string, quantity: number | string = 1) => ({ id, quantity });

/** Carrito mínimo con lo que estas reglas leen. */
function cart(lines: Array<{ id: string; quantity: number | string }>, over: Partial<Cart> = {}): Cart {
  const itemCount = lines.reduce((sum, l) => sum + Number(l.quantity), 0);
  return {
    id: 'cart-1',
    customerId: 'cust-1',
    subtotal: (itemCount * 363).toFixed(2),
    itemCount,
    updatedAt: `t-${lines.map((l) => `${l.id}x${l.quantity}`).join(',') || 'vacio'}`,
    items: lines,
    ...over,
  } as unknown as Cart;
}

describe('cartChangeElsewhere (lo que cambió y esta pantalla NO hizo)', () => {
  it('caso real: en esta pantalla había dos productos y la otra computadora quitó los dos', () => {
    const before = cart([line('fresa'), line('mgo')]);
    expect(cartChangeElsewhere(before, cart([]))).toBe('emptied');
  });

  it('se quitó uno, se agregó uno o cambió una cantidad en otra sesión: "changed"', () => {
    const before = cart([line('fresa'), line('mgo')]);
    expect(cartChangeElsewhere(before, cart([line('fresa')]))).toBe('changed');
    expect(cartChangeElsewhere(before, cart([line('fresa'), line('mgo'), line('ability')]))).toBe('changed');
    expect(cartChangeElsewhere(before, cart([line('fresa', 3), line('mgo')]))).toBe('changed');
  });

  it('el mismo carrito con las mismas líneas no avisa (la cantidad puede venir como texto)', () => {
    const before = cart([line('fresa', 2), line('mgo')]);
    expect(cartChangeElsewhere(before, cart([line('mgo', '1'), line('fresa', '2')]))).toBeNull();
    expect(cartChangeElsewhere(cart([]), cart([]))).toBeNull();
  });

  it('lo que tocó la acción en curso no cuenta: agregar, cambiar o quitar la línea propia', () => {
    const before = cart([line('fresa')]);
    expect(cartChangeElsewhere(before, cart([line('fresa'), line('capuchino')]), ['capuchino'])).toBeNull();
    expect(cartChangeElsewhere(before, cart([line('fresa', 4)]), ['fresa'])).toBeNull();
    expect(cartChangeElsewhere(before, cart([]), ['fresa'])).toBeNull();
    expect(cartChangeElsewhere(before, cart([line('fresa')]), [undefined, null])).toBeNull();
  });

  it('caso real: agrego Capuchino y la respuesta ya no trae lo que la otra sesión quitó', () => {
    const before = cart([line('fresa'), line('mgo')]);
    expect(cartChangeElsewhere(before, cart([line('capuchino')]), ['capuchino'])).toBe('changed');
    // Quito el mío y, además, alguien quitó el otro: el carrito quedó vacío por la otra sesión.
    expect(cartChangeElsewhere(before, cart([]), ['fresa'])).toBe('emptied');
  });

  it('sin lectura previa o con OTRO carrito (inicio de sesión, pedido creado) no hay qué comparar', () => {
    expect(cartChangeElsewhere(undefined, cart([line('fresa')]))).toBeNull();
    expect(cartChangeElsewhere(cart([line('fresa')]), null)).toBeNull();
    expect(cartChangeElsewhere(cart([line('fresa')], { id: 'invitado' }), cart([], { id: 'cuenta' }))).toBeNull();
  });
});

describe('cartMoved (¿la lectura trae un carrito distinto?)', () => {
  it('sin copia previa no hay nada derivado que volver a pedir', () => {
    expect(cartMoved(undefined, cart([line('fresa')]))).toBe(false);
  });

  it('otra fecha de modificación, otro subtotal, otras piezas u otro carrito: sí', () => {
    const before = cart([line('fresa')]);
    expect(cartMoved(before, cart([line('fresa')]))).toBe(false);
    expect(cartMoved(before, cart([line('fresa')], { updatedAt: 'después' }))).toBe(true);
    expect(cartMoved(before, cart([line('fresa')], { subtotal: '300.00' }))).toBe(true);
    expect(cartMoved(before, cart([line('fresa')], { itemCount: 2 }))).toBe(true);
    expect(cartMoved(before, cart([line('fresa')], { id: 'otro' }))).toBe(true);
  });
});

describe('createCartActivity (lo que ESTA pestaña le hace al carrito)', () => {
  it('una lectura sin cambios propios alrededor es limpia: la diferencia es de otra sesión', () => {
    const activity = createCartActivity();
    expect(activity.readFinished(activity.readStarted())).toBe('clean');
  });

  it('un cambio propio que empieza o termina durante la lectura la vuelve "raced"', () => {
    const started = createCartActivity();
    const t1 = started.readStarted();
    started.mutationStarted();
    expect(started.readFinished(t1)).toBe('raced');

    const settled = createCartActivity();
    settled.mutationStarted();
    const t2 = settled.readStarted();
    expect(settled.mutationSettled(true)).toBe(false);
    expect(settled.readFinished(t2)).toBe('raced');
    // La siguiente lectura, ya sin nada en vuelo, vuelve a ser limpia.
    expect(settled.readFinished(settled.readStarted())).toBe('clean');
  });

  it('un solo cambio propio en vuelo se puede comparar; dos encimados ya no', () => {
    const activity = createCartActivity();
    expect(activity.mutationIsComparable()).toBe(false);
    activity.mutationStarted();
    expect(activity.mutationIsComparable()).toBe(true);
    activity.mutationStarted();
    expect(activity.mutationIsComparable()).toBe(false);
  });

  it('dos cambios propios encimados dejan la copia dudosa: al terminar el último toca releer, sin aviso', () => {
    const activity = createCartActivity();
    activity.mutationStarted();
    activity.mutationStarted();
    expect(activity.mutationSettled(true)).toBe(false); // aún queda uno en vuelo
    expect(activity.mutationIsComparable()).toBe(false); // el que queda no se compara: hay dudas
    expect(activity.mutationSettled(true)).toBe(true); // ya no queda ninguno: releer
    expect(activity.readFinished(activity.readStarted())).toBe('reconciled');
    expect(activity.readFinished(activity.readStarted())).toBe('clean');
  });

  it('un cambio propio que falló pudo aplicarse a medias: releer, sin aviso', () => {
    const activity = createCartActivity();
    activity.mutationStarted();
    expect(activity.mutationSettled(false)).toBe(true);
    expect(activity.readFinished(activity.readStarted())).toBe('reconciled');
    // Y un cambio propio sin dudas no pide releer.
    activity.mutationStarted();
    expect(activity.mutationSettled(true)).toBe(false);
  });
});

describe('resolveCartRead (qué carrito queda en pantalla al terminar una lectura)', () => {
  it('lectura limpia: gana lo que dijo el servidor y la diferencia se atribuye a otra sesión', () => {
    const seen = cart([line('fresa')]);
    const next = cart([]);
    expect(resolveCartRead({ seen, current: seen, next, outcome: 'clean' })).toEqual({ cart: next, change: 'emptied' });
  });

  it('esta pestaña escribió el carrito mientras se leía: su respuesta es más nueva y no se pisa', () => {
    const seen = cart([line('fresa')]);
    const current = cart([line('fresa', 2)]); // respuesta de un cambio propio
    const next = cart([line('fresa')]); // lectura que salió antes del cambio
    expect(resolveCartRead({ seen, current, next, outcome: 'raced' })).toEqual({ cart: current, change: null });
    // Aunque nadie lo hubiera registrado como actividad, lo escrito durante la lectura gana.
    expect(resolveCartRead({ seen, current, next, outcome: 'clean' })).toEqual({ cart: current, change: null });
  });

  it('lectura que pone al día una copia dudosa, o cruzada con un cambio propio: gana el servidor, sin aviso', () => {
    const seen = cart([line('fresa')]);
    const next = cart([line('fresa'), line('mgo')]);
    expect(resolveCartRead({ seen, current: seen, next, outcome: 'reconciled' })).toEqual({ cart: next, change: null });
    expect(resolveCartRead({ seen, current: seen, next, outcome: 'raced' })).toEqual({ cart: next, change: null });
  });

  it('al iniciar sesión el carrito es OTRO: gana el de la cuenta y no se avisa', () => {
    const guest = cart([line('taza')], { id: 'invitado' });
    const account = cart([line('fresa')], { id: 'cuenta' });
    const merged = cart([line('taza')], { id: 'invitado-2' });
    expect(resolveCartRead({ seen: guest, current: guest, next: account, outcome: 'clean' })).toEqual({ cart: account, change: null });
    // Aunque la caché se haya escrito durante la lectura, si es de otro carrito gana la lectura.
    expect(resolveCartRead({ seen: guest, current: merged, next: account, outcome: 'raced' })).toEqual({ cart: account, change: null });
  });
});

describe('readCartInSync / applyCartMutation / settleCartMutation (sobre la caché real)', () => {
  function setup() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const activity = createCartActivity();
    const notify = vi.fn();
    const read = (answer: Cart | Promise<Cart>) =>
      queryClient.fetchQuery({
        queryKey: cartKeys.cart(),
        queryFn: () => readCartInSync(queryClient, () => Promise.resolve(answer), notify, activity),
        staleTime: 0,
      });
    const invalidated = (key: readonly unknown[]) => queryClient.getQueryState(key)?.isInvalidated;
    return { queryClient, activity, notify, read, invalidated };
  }

  it('primera lectura: queda en caché, sin aviso', async () => {
    const { queryClient, notify, read } = setup();
    const first = cart([line('fresa')]);
    await expect(read(first)).resolves.toEqual(first);
    expect(queryClient.getQueryData(cartKeys.cart())).toEqual(first);
    expect(notify).not.toHaveBeenCalled();
  });

  it('caso real: la otra computadora vació el carrito; al releer se avisa y se vuelve a pedir el resumen', async () => {
    const { queryClient, notify, read, invalidated } = setup();
    await read(cart([line('fresa'), line('mgo')]));
    const summaryKey = cartKeys.checkoutSummary();
    queryClient.setQueryData(cartKeys.summary(), { itemCount: 2 });
    queryClient.setQueryData(summaryKey, { total: '876.00' });

    const emptied = cart([]);
    await read(emptied);

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith('emptied', emptied);
    expect(queryClient.getQueryData<Cart>(cartKeys.cart())?.items).toEqual([]);
    expect(invalidated(cartKeys.summary())).toBe(true);
    expect(invalidated(summaryKey)).toBe(true);
  });

  it('releer el mismo carrito no avisa ni vuelve a pedir nada', async () => {
    const { queryClient, notify, read, invalidated } = setup();
    await read(cart([line('fresa')]));
    queryClient.setQueryData(cartKeys.summary(), { itemCount: 1 });
    await read(cart([line('fresa')]));
    expect(notify).not.toHaveBeenCalled();
    expect(invalidated(cartKeys.summary())).toBe(false);
  });

  it('una lectura que sale antes de un cambio propio y llega después NO pisa la respuesta del cambio', async () => {
    const { queryClient, activity, notify, read } = setup();
    await read(cart([line('fresa')]));

    let release: (value: Cart) => void = () => undefined;
    const slow = new Promise<Cart>((resolve) => {
      release = resolve;
    });
    const reading = read(slow); // lectura en vuelo (vio 1 pieza)

    // Mientras tanto, esta pestaña sube la cantidad a 2 y el API responde.
    activity.mutationStarted();
    const answered = cart([line('fresa', 2)]);
    applyCartMutation(queryClient, answered, ['fresa'], notify, activity);
    settleCartMutation(queryClient, true, activity);

    release(cart([line('fresa')])); // llega la lectura vieja
    await reading;

    expect(queryClient.getQueryData<Cart>(cartKeys.cart())?.items).toEqual([line('fresa', 2)]);
    expect(notify).not.toHaveBeenCalled();
  });

  it('un cambio propio limpio no avisa; si la respuesta trae además cambios de otra sesión, sí', () => {
    const { queryClient, activity, notify } = setup();
    queryClient.setQueryData(cartKeys.cart(), cart([line('fresa'), line('mgo')]));

    activity.mutationStarted();
    applyCartMutation(queryClient, cart([line('fresa'), line('mgo'), line('capuchino')]), ['capuchino'], notify, activity);
    settleCartMutation(queryClient, true, activity);
    expect(notify).not.toHaveBeenCalled();

    // Caso real: agrego Chocolate y la respuesta ya no trae lo que la otra sesión quitó.
    activity.mutationStarted();
    const answered = cart([line('chocolate')]);
    applyCartMutation(queryClient, answered, ['chocolate'], notify, activity);
    settleCartMutation(queryClient, true, activity);
    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith('changed', answered);
    expect(queryClient.getQueryData(cartKeys.cart())).toEqual(answered);
  });

  it('vaciar el carrito o cambiarlo de país es propio de principio a fin: nunca avisa', () => {
    const { queryClient, activity, notify } = setup();
    queryClient.setQueryData(cartKeys.cart(), cart([line('fresa'), line('mgo')]));
    activity.mutationStarted();
    applyCartMutation(queryClient, cart([]), 'all', notify, activity);
    settleCartMutation(queryClient, true, activity);
    expect(notify).not.toHaveBeenCalled();
    expect(queryClient.getQueryData<Cart>(cartKeys.cart())?.items).toEqual([]);
  });

  it('dos cambios propios encimados: ninguno avisa y, al terminar el último, el carrito se relee', () => {
    const { queryClient, activity, notify, invalidated } = setup();
    queryClient.setQueryData(cartKeys.cart(), cart([line('fresa'), line('mgo')]));

    activity.mutationStarted(); // quitar fresa
    activity.mutationStarted(); // quitar mgo
    // Llega primero la respuesta del segundo (ya sin los dos) y luego la del primero (vieja).
    applyCartMutation(queryClient, cart([]), ['mgo'], notify, activity);
    settleCartMutation(queryClient, true, activity);
    expect(invalidated(cartKeys.cart())).toBe(false);
    applyCartMutation(queryClient, cart([line('mgo')]), ['fresa'], notify, activity);
    settleCartMutation(queryClient, true, activity);

    expect(notify).not.toHaveBeenCalled();
    expect(invalidated(cartKeys.cart())).toBe(true); // se relee para quedarse con lo último
  });

  it('un cambio propio que falla deja el carrito marcado para releer', () => {
    const { queryClient, activity, invalidated } = setup();
    queryClient.setQueryData(cartKeys.cart(), cart([line('fresa')]));
    activity.mutationStarted();
    settleCartMutation(queryClient, false, activity);
    expect(invalidated(cartKeys.cart())).toBe(true);
  });

  it('la respuesta de un cambio propio siempre vuelve a pedir el resumen del checkout', () => {
    const { queryClient, activity, notify, invalidated } = setup();
    const summaryKey = cartKeys.checkoutSummary();
    queryClient.setQueryData(cartKeys.cart(), cart([line('fresa')]));
    queryClient.setQueryData(summaryKey, { total: '513.00' });
    activity.mutationStarted();
    applyCartMutation(queryClient, cart([line('fresa', 2)]), ['fresa'], notify, activity);
    expect(invalidated(summaryKey)).toBe(true);
    expect(invalidated(cartKeys.cart())).toBe(false);
  });
});

describe('cartSummaryMismatch (¿el resumen del checkout y el carrito hablan de lo mismo?)', () => {
  it('caso real: en pantalla 1 pieza y $363.00; el resumen recién cotizado ya dice 0 piezas y $0.00', () => {
    const signature = cartSummaryMismatch({ itemCount: 1, subtotal: '363.00' }, { itemCount: 0, subtotal: '0.00' });
    expect(signature).toBe('1|36300|0|0');
  });

  it('mismas piezas y mismo subtotal (aunque el formato cambie): hablan de lo mismo', () => {
    expect(cartSummaryMismatch({ itemCount: 2, subtotal: '726.00' }, { itemCount: 2, subtotal: '726' })).toBeNull();
    expect(cartSummaryMismatch({ itemCount: 0, subtotal: '0' }, { itemCount: 0, subtotal: '0.00' })).toBeNull();
  });

  it('basta que no coincida una de las dos cosas', () => {
    expect(cartSummaryMismatch({ itemCount: 2, subtotal: '726.00' }, { itemCount: 3, subtotal: '726.00' })).not.toBeNull();
    expect(cartSummaryMismatch({ itemCount: 2, subtotal: '726.00' }, { itemCount: 2, subtotal: '700.00' })).not.toBeNull();
  });

  it('la firma es la misma mientras el desacuerdo sea el mismo (se vuelve a pedir UNA vez, no en bucle)', () => {
    const a = cartSummaryMismatch({ itemCount: 1, subtotal: '363.00' }, { itemCount: 0, subtotal: '0.00' });
    const b = cartSummaryMismatch({ itemCount: 1, subtotal: '363' }, { itemCount: 0, subtotal: '0' });
    expect(a).toBe(b);
    expect(cartSummaryMismatch({ itemCount: 2, subtotal: '726.00' }, { itemCount: 0, subtotal: '0.00' })).not.toBe(a);
  });

  it('sin carrito, sin resumen o con un dato que no se puede leer: no hay desacuerdo que atender', () => {
    expect(cartSummaryMismatch(undefined, { itemCount: 0, subtotal: '0.00' })).toBeNull();
    expect(cartSummaryMismatch({ itemCount: 1, subtotal: '363.00' }, null)).toBeNull();
    const unreadable = { itemCount: undefined, subtotal: undefined } as unknown as { itemCount: number; subtotal: string };
    expect(cartSummaryMismatch({ itemCount: 1, subtotal: '363.00' }, unreadable)).toBeNull();
  });
});
