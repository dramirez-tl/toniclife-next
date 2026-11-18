import { describe, expect, it } from 'vitest';

import {
  DELIVERY_MODE_FILTER_OPTIONS,
  deliveryModeQueryValue,
  deliveryModeUrlValue,
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
