import { describe, expect, it } from 'vitest';
import type { SavedAddress } from '@/types/cart';
import {
  EMPTY_ADDRESS_DRAFT,
  INITIAL_SHIPPING_ADDRESS_STATE,
  activeAddressDraft,
  addressFormMode,
  buildCheckoutAddress,
  buildShippingAddressPayload,
  checkoutAddressFields,
  chooseAddress,
  cityWithState,
  clearDraftStates,
  defaultAddressChoice,
  draftAddressParts,
  draftFromSavedAddress,
  editAddressDraft,
  formatAddressLine,
  interiorNeedsPrefix,
  isStoreCountryAddress,
  isValidPostalCode,
  matchStateValue,
  normalizeSavedAddresses,
  padPostalCode,
  pinAddressChoice,
  rejectSavedAddress,
  resolveAddressChoice,
  sameAddressChoice,
  savedAddressOptions,
  savedAddressStatus,
  shippingAreaOf,
  stateSelectOptions,
  stateValueIsCode,
  streetWithNumber,
  validateAddressDraft,
  type AddressDraft,
  type SavedAddressContext,
} from './shipping-address';

function saved(over: Partial<SavedAddress> = {}): SavedAddress {
  return {
    id: 'a-1',
    street: 'Av. Reforma',
    extNumber: '1250',
    intNumber: '4B',
    neighborhood: 'La Paz',
    city: 'Puebla',
    state: 'Puebla',
    postalCode: '72160',
    countryId: 'mx-uuid',
    countryCode: 'MX',
    phone: '+522221234567',
    reference: 'Portón negro',
    isDefault: false,
    isComplete: true,
    createdAt: '2026-10-02T18:00:00.000Z',
    ...over,
  };
}

function draft(over: Partial<AddressDraft> = {}): AddressDraft {
  return {
    street: 'Av. Reforma',
    extNumber: '1250',
    intNumber: '',
    neighborhood: 'La Paz',
    city: 'Puebla',
    state: 'Puebla',
    zipCode: '72160',
    reference: '',
    ...over,
  };
}

const MX: SavedAddressContext = { countryCode: 'MX' };
const MX_STATES = [
  { code: 'PUE', name: 'Puebla' },
  { code: 'MEX', name: 'México' },
  { code: 'CMX', name: 'Ciudad de México' },
];
const US_STATES = [
  { code: 'TX', name: 'Texas' },
  { code: 'CA', name: 'California' },
];
const US: SavedAddressContext = { countryCode: 'US', states: US_STATES };

describe('shipping-address · respuesta de GET /checkout/addresses', () => {
  it('lee el contrato y deja en null lo vacío', () => {
    const [a] = normalizeSavedAddresses([
      { ...saved(), intNumber: '   ', neighborhood: '', phone: null, countryCode: 'mx', isDefault: true },
    ]);
    expect(a).toMatchObject({
      id: 'a-1',
      street: 'Av. Reforma',
      extNumber: '1250',
      intNumber: null,
      neighborhood: null,
      phone: null,
      countryCode: 'MX',
      isDefault: true,
      isComplete: true,
    });
  });

  it('descarta lo que no es una dirección y los ids repetidos', () => {
    expect(normalizeSavedAddresses(null)).toEqual([]);
    expect(normalizeSavedAddresses({ data: [] })).toEqual([]);
    const list = normalizeSavedAddresses([null, 'x', { street: 'sin id' }, saved(), saved({ street: 'Repetida' })]);
    expect(list.map((a) => a.street)).toEqual(['Av. Reforma']);
  });

  it('contra un API anterior (filas crudas) todo queda incompleto: nunca se usa tal cual', () => {
    const [old] = normalizeSavedAddresses([
      { id: 'a-9', street: 'Calle 1', ext_number: '5', city: 'Puebla', state: 'Puebla', zip_code: '72000', is_default: true },
    ]);
    expect(old.isComplete).toBe(false);
    expect(old.postalCode).toBeNull();
    expect(savedAddressStatus(old, MX)).toBe('incomplete');
  });
});

describe('shipping-address · qué guardadas se ofrecen', () => {
  it('Frontera (FN) cuenta como México; otro país no se ofrece; sin país guardado se deja pasar', () => {
    expect(isStoreCountryAddress('FN', 'MX')).toBe(true);
    expect(isStoreCountryAddress('mx', 'MX')).toBe(true);
    expect(isStoreCountryAddress('US', 'MX')).toBe(false);
    expect(isStoreCountryAddress('MX', 'US')).toBe(false);
    expect(isStoreCountryAddress(null, 'MX')).toBe(true);
    expect(savedAddressStatus(saved({ countryCode: 'FN' }), MX)).toBe('ready');
    expect(savedAddressStatus(saved({ countryCode: 'US' }), MX)).toBe('other_country');
    expect(savedAddressStatus(saved({ countryCode: null, countryId: null }), MX)).toBe('ready');
  });

  it('incompleta: lo dice el API, falta un dato o el código postal no es del país', () => {
    expect(savedAddressStatus(saved({ isComplete: false }), MX)).toBe('incomplete');
    expect(savedAddressStatus(saved({ postalCode: null }), MX)).toBe('incomplete');
    expect(savedAddressStatus(saved({ city: null }), MX)).toBe('incomplete');
    // Código postal de 4 dígitos (cero inicial perdido en el sistema anterior).
    expect(savedAddressStatus(saved({ postalCode: '1000' }), MX)).toBe('incomplete');
    expect(savedAddressStatus(saved(), MX)).toBe('ready');
  });

  it('las importadas del sistema anterior (calle, número y colonia en un renglón) se usan tal cual', () => {
    const imported = saved({
      street: 'MADERO 15 CENTRO',
      extNumber: null,
      intNumber: null,
      neighborhood: null,
      city: 'IRAPUATO',
      state: 'GUANAJUATO',
      postalCode: '36500',
      phone: null,
      reference: null,
      isDefault: true,
    });
    expect(savedAddressStatus(imported, MX)).toBe('ready');
    expect(defaultAddressChoice(savedAddressOptions([imported], MX))).toEqual({ kind: 'saved', id: 'a-1' });
    expect(formatAddressLine(imported)).toBe('MADERO 15 CENTRO, IRAPUATO, GUANAJUATO 36500');
  });

  it('una guardada que el API rechazó al pagar ya no se ofrece tal cual', () => {
    expect(savedAddressStatus(saved(), { ...MX, rejectedIds: ['a-1'] })).toBe('incomplete');
  });

  it('EE. UU.: el estado guardado debe ser el código del catálogo (el sales tax se busca por código)', () => {
    const usAddress = saved({ countryCode: 'US', state: 'TX', postalCode: '76234' });
    expect(savedAddressStatus(usAddress, US)).toBe('ready');
    expect(savedAddressStatus({ ...usAddress, state: 'tx ' }, US)).toBe('ready');
    expect(savedAddressStatus({ ...usAddress, state: 'Texas' }, US)).toBe('incomplete');
    // Sin catálogo no se puede revisar: no se bloquea.
    expect(savedAddressStatus({ ...usAddress, state: 'Texas' }, { countryCode: 'US' })).toBe('ready');
    expect(savedAddressStatus({ ...usAddress, state: 'Texas' }, { countryCode: 'US', states: [] })).toBe('ready');
    // En México viaja el nombre: no se exige que esté en el catálogo.
    expect(savedAddressStatus(saved({ state: 'PUEBLA' }), { ...MX, states: MX_STATES })).toBe('ready');
  });

  it('primero las que se pueden usar y después las incompletas, en el orden del API; las de otro país no salen', () => {
    const list = [
      saved({ id: 'inc', isComplete: false, postalCode: null }),
      saved({ id: 'us', countryCode: 'US' }),
      saved({ id: 'def', isDefault: true }),
      saved({ id: 'old' }),
    ];
    expect(savedAddressOptions(list, MX).map((o) => `${o.address.id}:${o.status}`)).toEqual([
      'def:ready',
      'old:ready',
      'inc:incomplete',
    ]);
    expect(savedAddressOptions(undefined, MX)).toEqual([]);
  });

  it('a la incompleta se le dice si le FALTAN datos o si hay que REVISAR los que tiene', () => {
    const issueOf = (address: SavedAddress, ctx: SavedAddressContext = MX) => savedAddressOptions([address], ctx)[0]?.issue;
    expect(issueOf(saved())).toBeUndefined();
    expect(issueOf(saved({ postalCode: null, isComplete: false }))).toBe('missing');
    expect(issueOf(saved({ postalCode: '1000' }))).toBe('review');
    expect(issueOf(saved(), { ...MX, rejectedIds: ['a-1'] })).toBe('review');
    expect(issueOf(saved({ countryCode: 'US', state: 'Texas', postalCode: '76234' }), US)).toBe('review');
    // Rechazada por el API y además sin código postal: lo que falta manda.
    expect(issueOf(saved({ postalCode: null }), { ...MX, rejectedIds: ['a-1'] })).toBe('missing');
  });
});

describe('shipping-address · elección', () => {
  const options = savedAddressOptions(
    [saved({ id: 'def', isDefault: true }), saved({ id: 'old' }), saved({ id: 'inc', isComplete: false })],
    MX,
  );

  it('sin elección del cliente: la primera que se puede usar; si ninguna, la primera llega para completarse; sin guardadas, una nueva', () => {
    expect(defaultAddressChoice(options)).toEqual({ kind: 'saved', id: 'def' });
    expect(defaultAddressChoice(options.filter((o) => o.status === 'incomplete'))).toEqual({ kind: 'complete', id: 'inc' });
    expect(defaultAddressChoice([])).toEqual({ kind: 'new' });
    expect(resolveAddressChoice(null, options)).toEqual({ kind: 'saved', id: 'def' });
  });

  it('quien solo tiene una dirección con el código postal mal guardado la ve abierta y prellenada, no un formulario vacío', () => {
    const ctx: SavedAddressContext = { countryCode: 'MX', states: MX_STATES };
    const only = savedAddressOptions(
      [saved({ id: 'cdmx', street: 'INSURGENTES SUR 1234 DEL VALLE', extNumber: null, neighborhood: null, state: 'CIUDAD DE MEXICO', postalCode: '3100' })],
      ctx,
    );
    const choice = resolveAddressChoice(null, only);
    expect(choice).toEqual({ kind: 'complete', id: 'cdmx' });
    const prefilled = activeAddressDraft(INITIAL_SHIPPING_ADDRESS_STATE, choice, only, ctx);
    expect(prefilled).toMatchObject({
      street: 'INSURGENTES SUR 1234 DEL VALLE',
      extNumber: '',
      neighborhood: '',
      state: 'Ciudad de México',
      zipCode: '03100',
    });
    // Tal como quedó prellenada ya se puede continuar: no se le pide capturar otra vez número y colonia.
    expect(validateAddressDraft('MX', prefilled, addressFormMode(choice))).toBeNull();
    // Como dirección NUEVA sí se pedirían en su propio campo.
    expect(validateAddressDraft('MX', prefilled)).toEqual({ field: 'extNumber', reason: 'required' });
  });

  it('respeta lo que eligió el cliente mientras siga en la lista', () => {
    expect(resolveAddressChoice({ kind: 'saved', id: 'old' }, options)).toEqual({ kind: 'saved', id: 'old' });
    expect(resolveAddressChoice({ kind: 'new' }, options)).toEqual({ kind: 'new' });
    expect(resolveAddressChoice({ kind: 'complete', id: 'inc' }, options)).toEqual({ kind: 'complete', id: 'inc' });
  });

  it('una guardada eliminada vuelve a la de por defecto; una que dejó de servir pasa a completarse', () => {
    expect(resolveAddressChoice({ kind: 'saved', id: 'borrada' }, options)).toEqual({ kind: 'saved', id: 'def' });
    expect(resolveAddressChoice({ kind: 'complete', id: 'borrada' }, [])).toEqual({ kind: 'new' });
    expect(resolveAddressChoice({ kind: 'saved', id: 'inc' }, options)).toEqual({ kind: 'complete', id: 'inc' });
  });

  it('compara elecciones', () => {
    expect(sameAddressChoice({ kind: 'new' }, { kind: 'new' })).toBe(true);
    expect(sameAddressChoice({ kind: 'saved', id: 'a' }, { kind: 'saved', id: 'a' })).toBe(true);
    expect(sameAddressChoice({ kind: 'saved', id: 'a' }, { kind: 'saved', id: 'b' })).toBe(false);
    expect(sameAddressChoice({ kind: 'saved', id: 'a' }, { kind: 'complete', id: 'a' })).toBe(false);
    expect(sameAddressChoice({ kind: 'saved', id: 'a' }, { kind: 'new' })).toBe(false);
    expect(sameAddressChoice(null, null)).toBe(true);
    expect(sameAddressChoice(null, { kind: 'new' })).toBe(false);
  });
});

describe('shipping-address · estado de la pantalla', () => {
  const incomplete = saved({ id: 'inc', isComplete: false, postalCode: null, state: 'PUEBLA' });
  const ctx: SavedAddressContext = { countryCode: 'MX', states: MX_STATES };
  const options = savedAddressOptions([saved({ id: 'def' }), incomplete], ctx);

  it('"Usar otra dirección" parte de un formulario vacío y marca guardar', () => {
    const state = chooseAddress(INITIAL_SHIPPING_ADDRESS_STATE, { kind: 'new' });
    expect(state.saveAddress).toBe(true);
    expect(activeAddressDraft(state, { kind: 'new' }, options, ctx)).toEqual(EMPTY_ADDRESS_DRAFT);
  });

  it('elegir una incompleta abre el formulario prellenado con sus datos', () => {
    const choice = { kind: 'complete', id: 'inc' } as const;
    const state = chooseAddress(INITIAL_SHIPPING_ADDRESS_STATE, choice);
    expect(activeAddressDraft(state, choice, options, ctx)).toMatchObject({
      street: 'Av. Reforma',
      extNumber: '1250',
      neighborhood: 'La Paz',
      city: 'Puebla',
      state: 'Puebla',
      zipCode: '',
    });
  });

  it('lo escrito al completar se conserva al ir a "otra dirección" y volver; cada formulario guarda lo suyo', () => {
    const complete = { kind: 'complete', id: 'inc' } as const;
    let state = chooseAddress(INITIAL_SHIPPING_ADDRESS_STATE, complete);
    state = editAddressDraft(state, complete, { zipCode: '74200' }, options, ctx);
    state = chooseAddress(state, { kind: 'new' });
    state = editAddressDraft(state, { kind: 'new' }, { street: 'Otra calle' }, options, ctx);
    expect(activeAddressDraft(state, { kind: 'new' }, options, ctx)).toMatchObject({ street: 'Otra calle', zipCode: '' });
    state = chooseAddress(state, complete);
    expect(activeAddressDraft(state, complete, options, ctx)).toMatchObject({ street: 'Av. Reforma', zipCode: '74200' });
  });

  it('completar OTRA guardada parte de los datos de esa otra', () => {
    const other = saved({ id: 'inc2', street: 'Calle 2', isComplete: false, postalCode: null });
    const both = savedAddressOptions([incomplete, other], ctx);
    let state = chooseAddress(INITIAL_SHIPPING_ADDRESS_STATE, { kind: 'complete', id: 'inc' });
    state = editAddressDraft(state, { kind: 'complete', id: 'inc' }, { zipCode: '74200' }, both, ctx);
    state = chooseAddress(state, { kind: 'complete', id: 'inc2' });
    expect(activeAddressDraft(state, { kind: 'complete', id: 'inc2' }, both, ctx)).toMatchObject({
      street: 'Calle 2',
      zipCode: '',
    });
  });

  it('escribir FIJA la elección: una guardada que aparezca después no reemplaza lo que se está capturando', () => {
    // Sin guardadas la elección por defecto es "nueva" (choice = null).
    const state = editAddressDraft(INITIAL_SHIPPING_ADDRESS_STATE, { kind: 'new' }, { street: 'Calle 9' }, [], ctx);
    expect(state.choice).toEqual({ kind: 'new' });
    // Llega una guardada lista: sigue la nueva.
    expect(resolveAddressChoice(state.choice, options)).toEqual({ kind: 'new' });
    // Sin haber escrito, sí se habría elegido la guardada.
    expect(resolveAddressChoice(INITIAL_SHIPPING_ADDRESS_STATE.choice, options)).toEqual({ kind: 'saved', id: 'def' });
  });

  it('al continuar se fija lo que el cliente vio, también la elección por defecto que no tocó', () => {
    // Guardada por defecto (nunca la eligió a mano).
    const savedChoice = resolveAddressChoice(null, options);
    expect(pinAddressChoice(INITIAL_SHIPPING_ADDRESS_STATE, savedChoice, options, ctx).choice).toEqual({
      kind: 'saved',
      id: 'def',
    });
    // Incompleta prellenada que ya estaba bien: su formulario queda guardado aunque no escribió nada.
    const complete = { kind: 'complete', id: 'inc' } as const;
    const pinned = pinAddressChoice(chooseAddress(INITIAL_SHIPPING_ADDRESS_STATE, complete), complete, options, ctx);
    expect(pinned.choice).toEqual(complete);
    expect(pinned.completion).toMatchObject({ id: 'inc', draft: { street: 'Av. Reforma', state: 'Puebla' } });
    // Si esa guardada desaparece de la lista, la elección fijada ya no coincide con la vigente.
    expect(sameAddressChoice(pinned.choice, resolveAddressChoice(pinned.choice, []))).toBe(false);
  });

  it('con una guardada elegida no hay formulario que editar', () => {
    const state = chooseAddress(INITIAL_SHIPPING_ADDRESS_STATE, { kind: 'saved', id: 'def' });
    expect(editAddressDraft(state, { kind: 'saved', id: 'def' }, { street: 'x' }, options, ctx)).toBe(state);
  });

  it('rechazo del API al pagar: la guardada pasa a completarse y deja de ofrecerse tal cual', () => {
    const state = rejectSavedAddress(chooseAddress(INITIAL_SHIPPING_ADDRESS_STATE, { kind: 'saved', id: 'def' }), 'def');
    expect(state.choice).toEqual({ kind: 'complete', id: 'def' });
    expect(state.rejectedIds).toEqual(['def']);
    const after = savedAddressOptions([saved({ id: 'def' })], { ...ctx, rejectedIds: state.rejectedIds });
    expect(after[0].status).toBe('incomplete');
    expect(rejectSavedAddress(state, 'def').rejectedIds).toEqual(['def']);
  });

  it('al cambiar el país de la tienda se limpia el estado capturado (es de otro catálogo)', () => {
    let state = editAddressDraft(INITIAL_SHIPPING_ADDRESS_STATE, { kind: 'new' }, { state: 'Puebla', city: 'Puebla' }, [], ctx);
    state = clearDraftStates(state);
    expect(state.newDraft).toMatchObject({ state: '', city: 'Puebla' });
    expect(clearDraftStates(state)).toBe(state);
  });
});

describe('shipping-address · formulario por país', () => {
  const keys = (cc: string) => checkoutAddressFields(cc).map((f) => f.key);
  const field = (cc: string, key: string) => checkoutAddressFields(cc).find((f) => f.key === key)!;

  it('México: calle, números, colonia, código postal, municipio, estado y referencias', () => {
    expect(keys('MX')).toEqual(['street', 'extNumber', 'intNumber', 'neighborhood', 'zipCode', 'city', 'state', 'reference']);
    expect(field('MX', 'extNumber').required).toBe(true);
    expect(field('MX', 'neighborhood').required).toBe(true);
    expect(field('MX', 'intNumber').required).toBe(false);
    expect(field('MX', 'reference').required).toBe(false);
  });

  it('EE. UU. no pide número exterior ni colonia; Guatemala y Colombia tampoco el interior', () => {
    expect(keys('US')).toEqual(['street', 'intNumber', 'city', 'state', 'zipCode', 'reference']);
    expect(keys('GT')).toEqual(['street', 'neighborhood', 'city', 'state', 'zipCode', 'reference']);
    expect(keys('CO')).toEqual(['street', 'neighborhood', 'city', 'state', 'zipCode', 'reference']);
    expect(keys('ZZ')).toEqual(['street', 'city', 'state', 'zipCode', 'reference']);
  });

  it('el código postal es obligatorio en todos (el API lo exige), aunque el alta lo deje opcional', () => {
    for (const cc of ['MX', 'US', 'GT', 'CO', 'ZZ']) expect(field(cc, 'zipCode').required).toBe(true);
    expect(field('CO', 'neighborhood').required).toBe(false);
    expect(field('GT', 'neighborhood').required).toBe(true);
  });

  it('las longitudes no pasan de las del DTO del checkout', () => {
    expect(field('MX', 'street').maxLength).toBe(200);
    expect(field('MX', 'reference').maxLength).toBe(255);
    expect(field('MX', 'zipCode').maxLength).toBe(5);
    expect(field('US', 'zipCode').maxLength).toBe(10);
    expect(field('MX', 'state').maxLength).toBe(100);
  });

  it('rejilla: la calle comparte renglón con su campo corto; ciudad, estado y C. P. a tercios', () => {
    const spans = (cc: string) => Object.fromEntries(checkoutAddressFields(cc).map((f) => [f.key, f.span]));
    expect(spans('MX')).toEqual({
      street: 'wide',
      extNumber: 'companion',
      intNumber: 'half',
      neighborhood: 'half',
      zipCode: 'third',
      city: 'third',
      state: 'third',
      reference: 'full',
    });
    expect(spans('US')).toMatchObject({ street: 'wide', intNumber: 'companion', city: 'third', state: 'third', zipCode: 'third' });
    expect(spans('ZZ')).toMatchObject({ street: 'full', city: 'third', state: 'third', zipCode: 'third' });
  });
});

describe('shipping-address · completar una guardada pide menos que una nueva', () => {
  const requiredOf = (country: string, mode?: 'new' | 'complete') =>
    checkoutAddressFields(country, mode)
      .filter((f) => f.required)
      .map((f) => f.key);

  it('nueva: lo que pide el país; completar: solo calle, ciudad, estado y código postal', () => {
    expect(requiredOf('MX')).toEqual(['street', 'extNumber', 'neighborhood', 'zipCode', 'city', 'state']);
    expect(requiredOf('MX', 'complete')).toEqual(['street', 'zipCode', 'city', 'state']);
    expect(requiredOf('GT', 'complete')).toEqual(['street', 'city', 'state', 'zipCode']);
    expect(requiredOf('US', 'complete')).toEqual(requiredOf('US'));
  });

  it('los campos, su orden y sus formatos son los mismos en los dos modos', () => {
    const strip = (country: string, mode?: 'new' | 'complete') =>
      checkoutAddressFields(country, mode).map(({ key, maxLength, pattern, span }) => ({ key, maxLength, pattern, span }));
    expect(strip('MX', 'complete')).toEqual(strip('MX'));
    // El formato del código postal se sigue revisando al completar.
    expect(validateAddressDraft('MX', draft({ extNumber: '', neighborhood: '', zipCode: '3100' }), 'complete')).toEqual({
      field: 'zipCode',
      reason: 'pattern',
    });
    expect(validateAddressDraft('MX', draft({ city: '' }), 'complete')).toEqual({ field: 'city', reason: 'required' });
  });

  it('el modo sale de la elección vigente', () => {
    expect(addressFormMode({ kind: 'complete', id: 'a-1' })).toBe('complete');
    expect(addressFormMode({ kind: 'new' })).toBe('new');
    expect(addressFormMode({ kind: 'saved', id: 'a-1' })).toBe('new');
  });
});

describe('shipping-address · validación antes de continuar', () => {
  it('México: completa pasa; falta un obligatorio o el estado', () => {
    expect(validateAddressDraft('MX', draft())).toBeNull();
    expect(validateAddressDraft('MX', draft({ street: '  ' }))).toEqual({ field: 'street', reason: 'required' });
    expect(validateAddressDraft('MX', draft({ extNumber: '' }))).toEqual({ field: 'extNumber', reason: 'required' });
    expect(validateAddressDraft('MX', draft({ neighborhood: '' }))).toEqual({ field: 'neighborhood', reason: 'required' });
    expect(validateAddressDraft('MX', draft({ state: '' }))).toEqual({ field: 'state', reason: 'required' });
    expect(validateAddressDraft('MX', EMPTY_ADDRESS_DRAFT)).toEqual({ field: 'street', reason: 'required' });
  });

  it('código postal con el formato del país', () => {
    expect(validateAddressDraft('MX', draft({ zipCode: '7216' }))).toEqual({ field: 'zipCode', reason: 'pattern' });
    expect(validateAddressDraft('MX', draft({ zipCode: '72160-1' }))).toEqual({ field: 'zipCode', reason: 'pattern' });
    expect(validateAddressDraft('MX', draft({ zipCode: '' }))).toEqual({ field: 'zipCode', reason: 'required' });
    const us = draft({ extNumber: '', neighborhood: '', state: 'TX', zipCode: '76234' });
    expect(validateAddressDraft('US', us)).toBeNull();
    expect(validateAddressDraft('US', { ...us, zipCode: '76234-1234' })).toBeNull();
    expect(validateAddressDraft('US', { ...us, zipCode: '7623' })).toEqual({ field: 'zipCode', reason: 'pattern' });
    expect(validateAddressDraft('CO', { ...us, state: 'Antioquia', zipCode: '05001' })).toEqual({ field: 'zipCode', reason: 'pattern' });
    expect(validateAddressDraft('CO', { ...us, state: 'Antioquia', zipCode: '050001' })).toBeNull();
  });

  it('isValidPostalCode: el mismo formato para las guardadas', () => {
    expect(isValidPostalCode('MX', '72160')).toBe(true);
    expect(isValidPostalCode('MX', ' 72160 ')).toBe(true);
    expect(isValidPostalCode('MX', '1000')).toBe(false);
    expect(isValidPostalCode('MX', '')).toBe(false);
    expect(isValidPostalCode('MX', null)).toBe(false);
    expect(isValidPostalCode('US', '76234-1234')).toBe(true);
    // País sin formato definido: cualquiera que no esté vacío.
    expect(isValidPostalCode('ZZ', 'AB-123')).toBe(true);
  });
});

describe('shipping-address · código postal con su cero inicial', () => {
  it('el sistema anterior lo guardaba como número: "1000" es "01000"', () => {
    expect(padPostalCode('MX', '1000')).toBe('01000');
    expect(padPostalCode('MX', ' 3100 ')).toBe('03100');
    expect(padPostalCode('US', '2134')).toBe('02134');
    expect(padPostalCode('CO', '54321')).toBe('054321');
  });

  it('no toca lo que ya está bien ni lo que un cero no arregla', () => {
    expect(padPostalCode('MX', '72160')).toBe('72160');
    expect(padPostalCode('MX', '123')).toBe('123');
    expect(padPostalCode('MX', '721600')).toBe('721600');
    expect(padPostalCode('MX', '7216A')).toBe('7216A');
    expect(padPostalCode('US', '76234-1234')).toBe('76234-1234');
    expect(padPostalCode('MX', null)).toBe('');
    // País sin formato definido: cualquier valor vale tal cual.
    expect(padPostalCode('PE', '1500')).toBe('1500');
  });

  it('al prellenar el formulario de una guardada', () => {
    expect(draftFromSavedAddress(saved({ postalCode: '1000' }), MX).zipCode).toBe('01000');
    expect(draftFromSavedAddress(saved({ countryCode: 'US', state: 'MA', postalCode: '2134' }), US).zipCode).toBe('02134');
  });
});

describe('shipping-address · estados del catálogo', () => {
  it('en EE. UU. viaja el código de 2 letras; en el resto, el nombre', () => {
    expect(stateValueIsCode('US')).toBe(true);
    expect(stateValueIsCode('us')).toBe(true);
    expect(stateValueIsCode('MX')).toBe(false);
    expect(stateSelectOptions(US_STATES, 'US')).toEqual([
      { value: 'TX', label: 'Texas' },
      { value: 'CA', label: 'California' },
    ]);
    expect(stateSelectOptions(MX_STATES, 'MX')[0]).toEqual({ value: 'Puebla', label: 'Puebla' });
    expect(stateSelectOptions(null, 'MX')).toEqual([]);
  });

  it('un estado antiguo que no está en el catálogo se conserva como opción (solo donde viaja el nombre)', () => {
    expect(stateSelectOptions(MX_STATES, 'MX', 'Estado de México')[0]).toEqual({
      value: 'Estado de México',
      label: 'Estado de México',
    });
    expect(stateSelectOptions(MX_STATES, 'MX', 'Puebla')).toHaveLength(3);
    expect(stateSelectOptions(US_STATES, 'US', 'Texas')).toHaveLength(2);
    // Sin catálogo no hay selector (la pantalla usa un campo de texto).
    expect(stateSelectOptions([], 'MX', 'Puebla')).toEqual([]);
  });

  it('reconoce el estado escrito como sea', () => {
    expect(matchStateValue(MX_STATES, 'PUEBLA', 'MX')).toBe('Puebla');
    expect(matchStateValue(MX_STATES, ' mexico ', 'MX')).toBe('México');
    expect(matchStateValue(MX_STATES, 'pue', 'MX')).toBe('Puebla');
    expect(matchStateValue(MX_STATES, 'Estado de México', 'MX')).toBeNull();
    expect(matchStateValue(US_STATES, 'Texas', 'US')).toBe('TX');
    expect(matchStateValue(US_STATES, 'tx', 'US')).toBe('TX');
    expect(matchStateValue(US_STATES, '', 'US')).toBeNull();
    expect(matchStateValue(undefined, 'Texas', 'US')).toBeNull();
  });
});

describe('shipping-address · formulario prellenado con una guardada', () => {
  it('México: cada dato en su campo y el estado con el nombre del catálogo', () => {
    expect(draftFromSavedAddress(saved({ state: 'PUEBLA' }), { countryCode: 'MX', states: MX_STATES })).toEqual({
      street: 'Av. Reforma',
      extNumber: '1250',
      intNumber: '4B',
      neighborhood: 'La Paz',
      city: 'Puebla',
      state: 'Puebla',
      zipCode: '72160',
      reference: 'Portón negro',
    });
  });

  it('un estado que no está en el catálogo se conserva tal cual (México) o queda por elegir (EE. UU.)', () => {
    expect(draftFromSavedAddress(saved({ state: 'Edo. Mex.' }), { countryCode: 'MX', states: MX_STATES }).state).toBe('Edo. Mex.');
    expect(draftFromSavedAddress(saved({ countryCode: 'US', state: 'Tejas' }), US).state).toBe('');
    expect(draftFromSavedAddress(saved({ countryCode: 'US', state: 'Texas' }), US).state).toBe('TX');
  });

  it('EE. UU. no tiene campo de número: va en la línea de la calle y no se pierde', () => {
    const d = draftFromSavedAddress(
      saved({ countryCode: 'US', street: 'Wheelis Lp', extNumber: '141', intNumber: null, state: 'TX', postalCode: '76234' }),
      US,
    );
    expect(d).toMatchObject({ street: 'Wheelis Lp 141', extNumber: '', neighborhood: '', state: 'TX', zipCode: '76234' });
  });

  it('recorta lo que no cabe en el pedido y tolera vacíos', () => {
    const long = draftFromSavedAddress(saved({ street: 'x'.repeat(300), reference: 'y'.repeat(600), postalCode: '721600000' }), MX);
    expect(long.street).toHaveLength(200);
    expect(long.reference).toHaveLength(255);
    expect(long.zipCode).toBe('72160');
    const empty = draftFromSavedAddress(
      saved({ street: null, extNumber: null, intNumber: null, neighborhood: null, city: null, state: null, postalCode: null, reference: null }),
      MX,
    );
    expect(empty).toEqual(EMPTY_ADDRESS_DRAFT);
  });
});

describe('shipping-address · cuerpo del pedido', () => {
  const recipient = { name: '  Ana López ', phone: '+522221234567' };
  const mexico = { code: 'MX', name: 'México' };

  it('guardada: id + quién recibe, sin dirección ni "guardar"', () => {
    const payload = buildShippingAddressPayload({
      choice: { kind: 'saved', id: 'a-1' },
      draft: draft({ street: 'no debe viajar' }),
      recipient,
      country: mexico,
      saveAddress: true,
    });
    expect(payload).toEqual({ shippingAddressId: 'a-1', recipientName: 'Ana López', recipientPhone: '+522221234567' });
    expect('shippingAddress' in payload).toBe(false);
    expect('saveShippingAddress' in payload).toBe(false);
  });

  it('nueva: la dirección con la forma de siempre y la casilla de guardar', () => {
    const payload = buildShippingAddressPayload({
      choice: { kind: 'new' },
      draft: draft({ street: ' Av. Reforma ', intNumber: ' 4B ', reference: 'Portón negro' }),
      recipient,
      country: mexico,
      saveAddress: false,
    });
    expect(payload).toEqual({
      shippingAddress: {
        fullName: 'Ana López',
        phone: '+522221234567',
        street: 'Av. Reforma',
        exteriorNumber: '1250',
        interiorNumber: '4B',
        neighborhood: 'La Paz',
        city: 'Puebla',
        state: 'Puebla',
        postalCode: '72160',
        country: 'México',
        references: 'Portón negro',
      },
      saveShippingAddress: false,
    });
    expect('shippingAddressId' in payload).toBe(false);
  });

  it('completar una guardada viaja como dirección nueva y, al guardar, reemplaza a la original', () => {
    const payload = buildShippingAddressPayload({
      choice: { kind: 'complete', id: 'a-1' },
      draft: draft(),
      recipient,
      country: mexico,
      saveAddress: true,
    });
    expect(payload.shippingAddressId).toBeUndefined();
    expect(payload.shippingAddress?.postalCode).toBe('72160');
    expect(payload.saveShippingAddress).toBe(true);
    expect(payload.replaceShippingAddressId).toBe('a-1');
  });

  it('sin "guardar" la original no se toca; una dirección nueva nunca reemplaza a otra', () => {
    const notSaved = buildShippingAddressPayload({
      choice: { kind: 'complete', id: 'a-1' },
      draft: draft(),
      recipient,
      country: mexico,
      saveAddress: false,
    });
    expect(notSaved.saveShippingAddress).toBe(false);
    expect('replaceShippingAddressId' in notSaved).toBe(false);
    const fresh = buildShippingAddressPayload({
      choice: { kind: 'new' },
      draft: draft(),
      recipient,
      country: mexico,
      saveAddress: true,
    });
    expect('replaceShippingAddressId' in fresh).toBe(false);
  });

  it('los opcionales vacíos no viajan y los campos que el país no pide tampoco', () => {
    const us = buildCheckoutAddress(
      draft({ street: '141 Wheelis Lp', extNumber: '99', neighborhood: 'Sobra', city: 'Decatur', state: 'TX', zipCode: '76234' }),
      recipient,
      { code: 'US', name: 'United States' },
    );
    expect(us).toEqual({
      fullName: 'Ana López',
      phone: '+522221234567',
      street: '141 Wheelis Lp',
      exteriorNumber: undefined,
      interiorNumber: undefined,
      neighborhood: undefined,
      city: 'Decatur',
      state: 'TX',
      postalCode: '76234',
      country: 'United States',
      references: undefined,
    });
    expect(JSON.parse(JSON.stringify(us))).not.toHaveProperty('exteriorNumber');
  });
});

describe('shipping-address · presentación y cotización', () => {
  it('dirección en un renglón, sin huecos', () => {
    expect(formatAddressLine(saved())).toBe('Av. Reforma 1250, La Paz, Puebla, Puebla 72160');
    expect(formatAddressLine(saved({ extNumber: null, neighborhood: null }))).toBe('Av. Reforma, Puebla, Puebla 72160');
    expect(formatAddressLine(saved({ city: null, postalCode: null }))).toBe('Av. Reforma 1250, La Paz, Puebla');
    expect(formatAddressLine(draftAddressParts(draft()))).toBe('Av. Reforma 1250, La Paz, Puebla, Puebla 72160');
    expect(formatAddressLine(draftAddressParts(EMPTY_ADDRESS_DRAFT))).toBe('');
    expect(streetWithNumber({ street: 'Av. Reforma', extNumber: null })).toBe('Av. Reforma');
    expect(cityWithState({ city: null, state: 'Puebla' })).toBe('Puebla');
  });

  it('el interior lleva prefijo solo si no dice ya lo que es', () => {
    expect(interiorNeedsPrefix('4B')).toBe(true);
    expect(interiorNeedsPrefix(' 12 ')).toBe(true);
    expect(interiorNeedsPrefix('Suite 300')).toBe(false);
    expect(interiorNeedsPrefix('Depto 5')).toBe(false);
  });

  it('el resumen se cotiza con el C. P. y el estado de la guardada elegida, tal cual están guardados', () => {
    const options = savedAddressOptions([saved({ id: 'a-1', state: 'PUEBLA' })], MX);
    expect(shippingAreaOf({ kind: 'saved', id: 'a-1' }, options, draft({ zipCode: '00000', state: 'Otro' }))).toEqual({
      postalCode: '72160',
      state: 'PUEBLA',
    });
  });

  it('con dirección nueva (o por completar) se cotiza con lo capturado', () => {
    const options = savedAddressOptions([saved({ id: 'a-1' })], MX);
    const d = draft({ zipCode: '74200', state: 'Puebla' });
    expect(shippingAreaOf({ kind: 'new' }, options, d)).toEqual({ postalCode: '74200', state: 'Puebla' });
    expect(shippingAreaOf({ kind: 'complete', id: 'a-1' }, options, d)).toEqual({ postalCode: '74200', state: 'Puebla' });
    // Guardada que ya no está en la lista: lo capturado.
    expect(shippingAreaOf({ kind: 'saved', id: 'x' }, options, d)).toEqual({ postalCode: '74200', state: 'Puebla' });
  });
});
