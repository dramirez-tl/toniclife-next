import { describe, expect, it } from 'vitest';

import {
  DELIVERY_MODE_FILTER_OPTIONS,
  branchInDeliveryCountry,
  deliveryCountryCount,
  deliveryCountryQueryValue,
  deliveryCountryTabs,
  deliveryCountryUrlValue,
  deliveryModeQueryValue,
  deliveryModeUrlValue,
  parseDeliveryCountryFilter,
  parseDeliveryModeFilter,
} from './list-filters';

describe('filtro "Forma de entrega" de la bandeja de entregas', () => {
  it('ofrece Todas, Envío a domicilio y Recoger en sucursal, con los mismos nombres que la lista', () => {
    expect(DELIVERY_MODE_FILTER_OPTIONS).toEqual([
      { value: 'all', label: 'Todas' },
      { value: 'shipping', label: 'Envío a domicilio' },
      { value: 'pickup', label: 'Recoger en sucursal' },
    ]);
  });

  it('lee el parámetro de la URL', () => {
    expect(parseDeliveryModeFilter('shipping')).toBe('shipping');
    expect(parseDeliveryModeFilter('pickup')).toBe('pickup');
  });

  it('sin parámetro, vacío o con un valor que no existe muestra todas', () => {
    expect(parseDeliveryModeFilter(undefined)).toBe('all');
    expect(parseDeliveryModeFilter(null)).toBe('all');
    expect(parseDeliveryModeFilter('')).toBe('all');
    expect(parseDeliveryModeFilter('all')).toBe('all');
    expect(parseDeliveryModeFilter('PICKUP')).toBe('all');
    expect(parseDeliveryModeFilter('domicilio')).toBe('all');
  });

  it('"Todas" no deja parámetro en la URL ni se manda al API', () => {
    expect(deliveryModeUrlValue('all')).toBe('');
    expect(deliveryModeQueryValue('all')).toBeUndefined();
  });

  it('una forma de entrega va tal cual a la URL y al API', () => {
    expect(deliveryModeUrlValue('pickup')).toBe('pickup');
    expect(deliveryModeUrlValue('shipping')).toBe('shipping');
    expect(deliveryModeQueryValue('pickup')).toBe('pickup');
    expect(deliveryModeQueryValue('shipping')).toBe('shipping');
  });
});

describe('pestañas por país de la bandeja de entregas', () => {
  it('son Todas y un país por tienda en línea; México nombra también a Frontera', () => {
    expect(deliveryCountryTabs()).toEqual([
      { value: 'all', label: 'Todas' },
      { value: 'MX', label: 'México/Frontera' },
      { value: 'US', label: 'Estados Unidos' },
      { value: 'CO', label: 'Colombia' },
      { value: 'GT', label: 'Guatemala' },
    ]);
  });

  it('lee el país de la URL, también en minúsculas o con espacios', () => {
    expect(parseDeliveryCountryFilter('US')).toBe('US');
    expect(parseDeliveryCountryFilter('mx')).toBe('MX');
    expect(parseDeliveryCountryFilter(' gt ')).toBe('GT');
  });

  it('el código de Frontera abre la pestaña de México', () => {
    expect(parseDeliveryCountryFilter('FN')).toBe('MX');
  });

  it('sin parámetro o con un país sin tienda en línea muestra todas', () => {
    expect(parseDeliveryCountryFilter(undefined)).toBe('all');
    expect(parseDeliveryCountryFilter(null)).toBe('all');
    expect(parseDeliveryCountryFilter('')).toBe('all');
    expect(parseDeliveryCountryFilter('all')).toBe('all');
    expect(parseDeliveryCountryFilter('SV')).toBe('all');
    expect(parseDeliveryCountryFilter('México')).toBe('all');
  });

  it('"Todas" no deja parámetro en la URL ni se manda al API; un país va tal cual', () => {
    expect(deliveryCountryUrlValue('all')).toBe('');
    expect(deliveryCountryQueryValue('all')).toBeUndefined();
    expect(deliveryCountryUrlValue('US')).toBe('US');
    expect(deliveryCountryQueryValue('MX')).toBe('MX');
  });

  it('el número de cada pestaña sale del conteo por país; "Todas" los suma', () => {
    const counts = { MX: 925, US: 8 };
    expect(deliveryCountryCount(counts, 'all')).toBe(933);
    expect(deliveryCountryCount(counts, 'MX')).toBe(925);
    expect(deliveryCountryCount(counts, 'US')).toBe(8);
    expect(deliveryCountryCount(counts, 'CO')).toBe(0);
    expect(deliveryCountryCount({}, 'all')).toBe(0);
  });

  it('si Frontera llegara suelta se suma a México; un país sin tienda solo cuenta en "Todas"', () => {
    const counts = { MX: 10, FN: 2, US: 3, XX: 1 };
    expect(deliveryCountryCount(counts, 'MX')).toBe(12);
    expect(deliveryCountryCount(counts, 'all')).toBe(16);
  });

  it('sin conteo (API anterior) la pestaña sale sin número', () => {
    expect(deliveryCountryCount(undefined, 'all')).toBeNull();
    expect(deliveryCountryCount(null, 'MX')).toBeNull();
  });

  it('el selector de sucursal solo ofrece las del país de la pestaña (Frontera va con México)', () => {
    expect(branchInDeliveryCountry('MX', 'MX')).toBe(true);
    expect(branchInDeliveryCountry('FN', 'MX')).toBe(true);
    expect(branchInDeliveryCountry('fn', 'MX')).toBe(true);
    expect(branchInDeliveryCountry('US', 'MX')).toBe(false);
    expect(branchInDeliveryCountry('US', 'US')).toBe(true);
    expect(branchInDeliveryCountry(null, 'US')).toBe(false);
    expect(branchInDeliveryCountry(undefined, 'all')).toBe(true);
    expect(branchInDeliveryCountry('SV', 'all')).toBe(true);
  });
});
