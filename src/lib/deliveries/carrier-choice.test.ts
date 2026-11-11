import { describe, expect, it } from 'vitest';
import type { DeliveryCarrierOption } from '@/types/deliveries';
import {
  OTHER_CARRIER,
  carriersForDelivery,
  deliveryStoreCountry,
  normalizeDeliveryCarriers,
  pickCarrier,
  resolveCarrierChoice,
} from './carrier-choice';

const FEDEX: DeliveryCarrierOption = { id: 'mx-fedex', countryCode: 'MX', name: 'FedEx', isDefault: true };
const ESTAFETA: DeliveryCarrierOption = { id: 'mx-estafeta', countryCode: 'MX', name: 'Estafeta', isDefault: false };
const UPS: DeliveryCarrierOption = { id: 'us-ups', countryCode: 'US', name: 'UPS', isDefault: true };
const US_FEDEX: DeliveryCarrierOption = { id: 'us-fedex', countryCode: 'US', name: 'Fed Ex', isDefault: false };
const CATALOG = [ESTAFETA, FEDEX, UPS, US_FEDEX];
const MX = [FEDEX, ESTAFETA];

describe('deliveries/carrier-choice · catálogo', () => {
  it('lee { carriers } o la lista suelta e ignora lo que no sirve', () => {
    expect(normalizeDeliveryCarriers({ carriers: [FEDEX, { id: '', name: 'X' }, null, { id: 'a', name: ' DHL ', countryCode: 'us' }, FEDEX] })).toEqual([
      FEDEX,
      { id: 'a', name: 'DHL', countryCode: 'US', isDefault: false },
    ]);
    expect(normalizeDeliveryCarriers([UPS])).toEqual([UPS]);
  });

  it('sin catálogo (API anterior, migración pendiente o ninguna registrada) la lista queda vacía', () => {
    expect(normalizeDeliveryCarriers({ carriers: [] })).toEqual([]);
    expect(normalizeDeliveryCarriers(undefined)).toEqual([]);
    expect(normalizeDeliveryCarriers({ message: 'Not Found' })).toEqual([]);
  });

  it('el país del envío es el de la dirección (Frontera = México) o, sin él, el de la moneda', () => {
    expect(deliveryStoreCountry({ addressCountryCode: 'MX', currencyCode: 'MXN' })).toBe('MX');
    expect(deliveryStoreCountry({ addressCountryCode: 'fn', currencyCode: 'MXN' })).toBe('MX');
    expect(deliveryStoreCountry({ addressCountryCode: null, currencyCode: 'usd' })).toBe('US');
    // Un país sin tienda no decide: manda la moneda de la venta.
    expect(deliveryStoreCountry({ addressCountryCode: 'SV', currencyCode: 'GTQ' })).toBe('GT');
    expect(deliveryStoreCountry({ addressCountryCode: null, currencyCode: 'EUR' })).toBeNull();
    expect(deliveryStoreCountry({})).toBeNull();
  });

  it('ofrece las del país del envío, con la predeterminada primero', () => {
    expect(carriersForDelivery(CATALOG, 'MX')).toEqual([FEDEX, ESTAFETA]);
    expect(carriersForDelivery(CATALOG, 'us')).toEqual([UPS, US_FEDEX]);
    // País sin paqueterías registradas: se escribe a mano.
    expect(carriersForDelivery(CATALOG, 'CO')).toEqual([]);
  });

  it('sin saber el país las ofrece todas, una vez cada nombre y sin predeterminada', () => {
    const all = carriersForDelivery(CATALOG, null);
    expect(all.map((o) => o.name)).toEqual(['Estafeta', 'FedEx', 'UPS']);
    expect(all.every((o) => !o.isDefault)).toBe(true);
  });
});

describe('deliveries/carrier-choice · qué se muestra y qué se guarda', () => {
  const untouched = { typed: null, other: null };

  it('sin catálogo queda el campo de texto de siempre, con lo que ya tenía el envío', () => {
    expect(resolveCarrierChoice({ options: [], saved: 'DHL', ...untouched })).toEqual({
      mode: 'text',
      selectValue: '',
      showOtherInput: false,
      carrier: 'DHL',
    });
    expect(resolveCarrierChoice({ options: [], saved: null, ...untouched }).carrier).toBe('');
    expect(resolveCarrierChoice({ options: [], saved: 'DHL', typed: 'Estafeta', other: null }).carrier).toBe('Estafeta');
  });

  it('envío sin paquetería: sale elegida la predeterminada del país', () => {
    expect(resolveCarrierChoice({ options: MX, saved: '', ...untouched })).toEqual({
      mode: 'select',
      selectValue: 'mx-fedex',
      showOtherInput: false,
      carrier: 'FedEx',
    });
    expect(resolveCarrierChoice({ options: MX, saved: null, ...untouched }).carrier).toBe('FedEx');
  });

  it('sin predeterminada no se elige ninguna por la persona', () => {
    expect(resolveCarrierChoice({ options: [ESTAFETA], saved: '', ...untouched })).toEqual({
      mode: 'select',
      selectValue: '',
      showOtherInput: false,
      carrier: '',
    });
  });

  it('respeta la paquetería que ya tenía el envío, aunque esté escrita distinto', () => {
    expect(resolveCarrierChoice({ options: MX, saved: 'ESTAFETA', ...untouched })).toEqual({
      mode: 'select',
      selectValue: 'mx-estafeta',
      showOtherInput: false,
      carrier: 'ESTAFETA',
    });
  });

  it('una paquetería guardada que no está en el catálogo aparece como "Otra…" con su texto', () => {
    expect(resolveCarrierChoice({ options: MX, saved: 'Paquetexpress', ...untouched })).toEqual({
      mode: 'select',
      selectValue: OTHER_CARRIER,
      showOtherInput: true,
      carrier: 'Paquetexpress',
    });
  });

  it('elegir de la lista guarda el nombre del catálogo; "Otra…" empieza en blanco y guarda lo escrito', () => {
    expect(pickCarrier(MX, 'mx-estafeta')).toEqual({ typed: 'Estafeta', other: false });
    expect(resolveCarrierChoice({ options: MX, saved: '', ...pickCarrier(MX, 'mx-estafeta') })).toMatchObject({
      selectValue: 'mx-estafeta',
      carrier: 'Estafeta',
    });

    const other = pickCarrier(MX, OTHER_CARRIER);
    expect(other).toEqual({ typed: '', other: true });
    expect(resolveCarrierChoice({ options: MX, saved: 'FedEx', ...other })).toEqual({
      mode: 'select',
      selectValue: OTHER_CARRIER,
      showOtherInput: true,
      carrier: '',
    });
    expect(resolveCarrierChoice({ options: MX, saved: 'FedEx', typed: 'Redpack', other: true }).carrier).toBe('Redpack');
    // Aunque escriba el nombre de una del catálogo, sigue en "Otra…" (no brinca mientras teclea).
    expect(resolveCarrierChoice({ options: MX, saved: '', typed: 'FedEx', other: true }).selectValue).toBe(OTHER_CARRIER);
  });

  it('si el catálogo llega cuando ya se había escrito algo, no se pierde lo escrito', () => {
    expect(resolveCarrierChoice({ options: MX, saved: '', typed: 'Paq', other: null })).toEqual({
      mode: 'select',
      selectValue: OTHER_CARRIER,
      showOtherInput: true,
      carrier: 'Paq',
    });
    expect(resolveCarrierChoice({ options: MX, saved: '', typed: 'fedex', other: null })).toMatchObject({
      selectValue: 'mx-fedex',
      carrier: 'fedex',
    });
    // Borró el campo a propósito: no se le vuelve a poner la predeterminada.
    expect(resolveCarrierChoice({ options: MX, saved: 'FedEx', typed: '', other: null })).toMatchObject({
      selectValue: '',
      carrier: '',
    });
  });
});
