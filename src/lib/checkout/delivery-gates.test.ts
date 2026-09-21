import { describe, expect, it } from 'vitest';
import {
  isDeliveryBlocked,
  isHomeDeliveryUnavailable,
  shouldWaitForStoreCountry,
  storeCountryName,
} from './delivery-gates';

describe('delivery-gates · envío a domicilio según las rutas (M-3)', () => {
  it('solo un false EXPRESO deshabilita; API viejo o señal ausente = como hoy', () => {
    expect(isHomeDeliveryUnavailable({ delivery: { shippingAvailable: false } })).toBe(true);
    expect(isHomeDeliveryUnavailable({ delivery: { shippingAvailable: true } })).toBe(false);
    expect(isHomeDeliveryUnavailable({ delivery: {} })).toBe(false);
    expect(isHomeDeliveryUnavailable({ delivery: null })).toBe(false);
    expect(isHomeDeliveryUnavailable({})).toBe(false);
    expect(isHomeDeliveryUnavailable(undefined)).toBe(false);
    expect(isHomeDeliveryUnavailable(null)).toBe(false);
  });

  it('bloquea solo el envío a domicilio: recoger en sucursal sigue igual', () => {
    const off = { delivery: { shippingAvailable: false } };
    expect(isDeliveryBlocked('delivery', off)).toBe(true);
    expect(isDeliveryBlocked('pickup', off)).toBe(false);
    expect(isDeliveryBlocked('delivery', { delivery: { shippingAvailable: true } })).toBe(false);
    expect(isDeliveryBlocked('delivery', undefined)).toBe(false);
  });
});

describe('delivery-gates · país de la tienda (L-1)', () => {
  it('espera mientras CARGA; si FALLÓ (ya no carga) deja pagar sin countryId', () => {
    expect(shouldWaitForStoreCountry({ countryId: undefined, isLoading: true })).toBe(true);
    expect(shouldWaitForStoreCountry({ countryId: undefined, isLoading: false })).toBe(false);
    expect(shouldWaitForStoreCountry({ countryId: 'uuid-mx', isLoading: false })).toBe(false);
    // Con el país ya resuelto un refetch en curso no bloquea.
    expect(shouldWaitForStoreCountry({ countryId: 'uuid-mx', isLoading: true })).toBe(false);
  });

  it('nombre del país en el idioma de la interfaz', () => {
    expect(storeCountryName('US', 'es')).toBe('Estados Unidos');
    expect(storeCountryName('US', 'en')).toBe('United States');
    expect(storeCountryName('MX', 'en')).toBe('Mexico');
  });
});
