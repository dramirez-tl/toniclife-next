import { describe, expect, it } from 'vitest';
import { ShippingMethod } from '@/types/cart';
import { standardShippingInfo } from './shipping-method';

/** Resumen como lo manda el API desde que la tienda dejó de ofrecer exprés: estándar y recoger en tienda. */
const summary = (over: Record<string, unknown> = {}) => ({
  shippingAmount: '150.00',
  shippingOptions: [
    { method: ShippingMethod.STANDARD, name: 'Envío estándar', description: 'Entrega en 3 a 5 días hábiles', cost: '150.00', estimatedDays: 5 },
    { method: ShippingMethod.PICKUP, name: 'Recoger en tienda', description: 'Recoge tu pedido en nuestra sucursal', cost: '0.00', estimatedDays: 1 },
  ],
  ...over,
});

describe('checkout/shipping-method · envío estándar a domicilio (el único que se ofrece)', () => {
  it('muestra lo que se va a cobrar y los días del envío estándar', () => {
    expect(standardShippingInfo(summary(), ShippingMethod.STANDARD)).toEqual({ cost: 150, days: 5 });
  });

  it('el costo es el del resumen: ya trae el envío gratis por monto o por cupón', () => {
    // Cupón de envío gratis: la opción sigue diciendo $150, pero lo que se cobra es $0.
    expect(standardShippingInfo(summary({ shippingAmount: '0.00' }), ShippingMethod.STANDARD)).toEqual({ cost: 0, days: 5 });
  });

  it('mientras no llega el resumen no inventa un costo', () => {
    expect(standardShippingInfo(undefined, ShippingMethod.STANDARD)).toEqual({ cost: null, days: 0 });
    expect(standardShippingInfo(null, ShippingMethod.STANDARD)).toEqual({ cost: null, days: 0 });
    expect(standardShippingInfo(summary({ shippingAmount: '' }), ShippingMethod.STANDARD).cost).toBeNull();
    expect(standardShippingInfo(summary({ shippingAmount: 'abc' }), ShippingMethod.STANDARD).cost).toBeNull();
  });

  it('si lo cotizado es recoger en sucursal, usa el costo de la opción estándar', () => {
    // El resumen de "recoger" trae $0 de envío: no es lo que costaría el envío a domicilio.
    expect(standardShippingInfo(summary({ shippingAmount: '0.00' }), ShippingMethod.PICKUP)).toEqual({ cost: 150, days: 5 });
  });

  it('tolera un resumen sin opciones o sin días (API anterior): solo no muestra los días', () => {
    expect(standardShippingInfo({ shippingAmount: '150.00', shippingOptions: [] }, ShippingMethod.STANDARD)).toEqual({
      cost: 150,
      days: 0,
    });
    const noDays = summary({
      shippingOptions: [{ method: ShippingMethod.STANDARD, name: 'Envío estándar', description: '', cost: '150.00', estimatedDays: 0 }],
    });
    expect(standardShippingInfo(noDays, ShippingMethod.STANDARD).days).toBe(0);
  });

  it('una lista vieja que todavía traiga el exprés no cambia nada: solo se lee la opción estándar', () => {
    const old = summary({
      shippingOptions: [
        { method: ShippingMethod.EXPRESS, name: 'Envio express', description: '', cost: '250.00', estimatedDays: 2 },
        { method: ShippingMethod.STANDARD, name: 'Envio estandar', description: '', cost: '150.00', estimatedDays: 5 },
      ],
    });
    expect(standardShippingInfo(old, ShippingMethod.STANDARD)).toEqual({ cost: 150, days: 5 });
  });
});
