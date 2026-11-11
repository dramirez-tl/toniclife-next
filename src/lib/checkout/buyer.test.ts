import { describe, expect, it } from 'vitest';
import { buyerDistributorNumber, fillContactFromBuyer } from './buyer';

describe('buyer · número de distribuidor en "Datos"', () => {
  it('solo para un distribuidor con número', () => {
    expect(
      buyerDistributorNumber({ buyer: { isDistributor: true, customerNumber: '1784011', name: 'Ana', phone: null } }),
    ).toBe('1784011');
    expect(buyerDistributorNumber({ buyer: { isDistributor: true, customerNumber: ' 1784011 ' } })).toBe('1784011');
  });

  it('público en general, sin número o sin dato: nada', () => {
    expect(buyerDistributorNumber({ buyer: { isDistributor: false, customerNumber: '2020595' } })).toBeNull();
    expect(buyerDistributorNumber({ buyer: { isDistributor: true, customerNumber: null } })).toBeNull();
    expect(buyerDistributorNumber({ buyer: { isDistributor: true, customerNumber: '  ' } })).toBeNull();
    // API anterior (sin `buyer`) o resumen aún cargando.
    expect(buyerDistributorNumber({})).toBeNull();
    expect(buyerDistributorNumber({ buyer: null })).toBeNull();
    expect(buyerDistributorNumber(undefined)).toBeNull();
    expect(buyerDistributorNumber(null)).toBeNull();
  });

  it('tolera el número como número', () => {
    const buyer = { isDistributor: true, customerNumber: 1784011 as unknown as string };
    expect(buyerDistributorNumber({ buyer })).toBe('1784011');
  });
});

describe('buyer · datos de contacto con los de la cuenta', () => {
  const buyer = { isDistributor: true, customerNumber: '1', name: ' Ana López ', phone: '+522221234567' };

  it('rellena solo lo vacío', () => {
    expect(fillContactFromBuyer({ email: 'a@b.mx', name: '', phone: '' }, buyer)).toEqual({
      email: 'a@b.mx',
      name: 'Ana López',
      phone: '+522221234567',
    });
    expect(fillContactFromBuyer({ name: 'Otra persona', phone: '' }, buyer)).toEqual({
      name: 'Otra persona',
      phone: '+522221234567',
    });
  });

  it('no pisa lo escrito ni cambia la referencia si no hay nada que rellenar', () => {
    const contact = { name: 'Ana', phone: '+525512345678' };
    expect(fillContactFromBuyer(contact, buyer)).toBe(contact);
    const empty = { name: '', phone: '' };
    expect(fillContactFromBuyer(empty, null)).toBe(empty);
    expect(fillContactFromBuyer(empty, { name: null, phone: null })).toBe(empty);
  });
});
