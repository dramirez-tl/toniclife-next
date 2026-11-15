import { describe, expect, it } from 'vitest';
import {
  beneficiaryErrorKey,
  beneficiaryLabel,
  beneficiaryPayload,
  canBuyForOther,
  distributorNumberInput,
  isBeneficiaryRejection,
  numberProblem,
} from './buy-for-other';

/** Error de axios como lo entrega el API: { statusCode, code, message, details }. */
const apiError = (status: number, code?: string, reason?: string) => ({
  response: { status, data: { statusCode: status, code, message: 'x', details: reason ? { reason } : undefined } },
});

describe('comprar para otro distribuidor · ¿se ofrece?', () => {
  it('solo a un distribuidor y solo si el servidor dice que sí', () => {
    expect(canBuyForOther({ buyer: { isDistributor: true }, buyForOther: { available: true } })).toBe(true);
    expect(canBuyForOther({ buyer: { isDistributor: true }, buyForOther: { available: false } })).toBe(false);
    expect(canBuyForOther({ buyer: { isDistributor: false }, buyForOther: { available: true } })).toBe(false);
  });

  it('API anterior (sin el dato) o resumen aún cargando: no', () => {
    expect(canBuyForOther({ buyer: { isDistributor: true } })).toBe(false);
    expect(canBuyForOther({ buyer: { isDistributor: true }, buyForOther: null })).toBe(false);
    expect(canBuyForOther({})).toBe(false);
    expect(canBuyForOther(null)).toBe(false);
    expect(canBuyForOther(undefined)).toBe(false);
  });
});

describe('comprar para otro distribuidor · el número que se teclea', () => {
  it('se queda solo con los dígitos', () => {
    expect(distributorNumberInput('#1771306')).toBe('1771306');
    expect(distributorNumberInput(' 1 771 306 ')).toBe('1771306');
    expect(distributorNumberInput('17-71.306a')).toBe('1771306');
    expect(distributorNumberInput('')).toBe('');
    expect(distributorNumberInput(null)).toBe('');
    expect(distributorNumberInput('1'.repeat(30))).toHaveLength(12);
  });

  it('vacío no se busca; el propio número tampoco', () => {
    expect(numberProblem('', '1759927')).toBe('empty');
    expect(numberProblem('  ', '1759927')).toBe('empty');
    expect(numberProblem('000', '1759927')).toBe('empty');
    expect(numberProblem('1759927', '1759927')).toBe('own');
    expect(numberProblem('#1759927', ' 1759927 ')).toBe('own');
    expect(numberProblem('01759927', '1759927')).toBe('own');
    expect(numberProblem('1771306', '1759927')).toBeNull();
    expect(numberProblem('1771306', null)).toBeNull();
  });
});

describe('comprar para otro distribuidor · lo que contesta el API', () => {
  it('cada motivo tiene su texto', () => {
    const not = 'CHK_BENEFICIARY_NOT_ELIGIBLE';
    expect(beneficiaryErrorKey(apiError(422, not, 'not_found'))).toBe('notFound');
    expect(beneficiaryErrorKey(apiError(422, not, 'self'))).toBe('self');
    expect(beneficiaryErrorKey(apiError(422, not, 'inactive'))).toBe('inactive');
    expect(beneficiaryErrorKey(apiError(422, not, 'no_kit'))).toBe('noKit');
    expect(beneficiaryErrorKey(apiError(422, not, 'other_country'))).toBe('otherCountry');
    expect(beneficiaryErrorKey(apiError(422, not, 'other_price_list'))).toBe('otherPriceList');
    expect(beneficiaryErrorKey(apiError(422, not, 'other_store'))).toBe('otherStore');
    // Un motivo que la tienda aún no conoce: se trata como "no encontrado".
    expect(beneficiaryErrorKey(apiError(422, not, 'algo_nuevo'))).toBe('notFound');
    expect(beneficiaryErrorKey(apiError(422, not))).toBe('notFound');
  });

  it('la función no está disponible para esta compra', () => {
    const off = 'CHK_BUY_FOR_OTHER_UNAVAILABLE';
    expect(beneficiaryErrorKey(apiError(422, off, 'disabled'))).toBe('disabled');
    expect(beneficiaryErrorKey(apiError(422, off, 'migration_pending'))).toBe('disabled');
    expect(beneficiaryErrorKey(apiError(422, off, 'buyer_not_eligible'))).toBe('buyerNotEligible');
    expect(beneficiaryErrorKey(apiError(422, off, 'kit_in_cart'))).toBe('kitInCart');
    expect(beneficiaryErrorKey(apiError(422, off))).toBe('disabled');
  });

  it('demasiadas búsquedas y errores ajenos', () => {
    expect(beneficiaryErrorKey(apiError(429, 'CHK_BENEFICIARY_LOOKUP_LIMIT'))).toBe('tooMany');
    expect(beneficiaryErrorKey(apiError(429))).toBe('tooMany');
    expect(beneficiaryErrorKey(apiError(500))).toBe('generic');
    expect(beneficiaryErrorKey(new Error('sin red'))).toBe('generic');
    expect(beneficiaryErrorKey(null)).toBe('generic');
  });

  it('reconoce el rechazo por el beneficiario al pagar', () => {
    expect(isBeneficiaryRejection(apiError(422, 'CHK_BENEFICIARY_NOT_ELIGIBLE', 'inactive'))).toBe(true);
    expect(isBeneficiaryRejection(apiError(422, 'CHK_BUY_FOR_OTHER_UNAVAILABLE', 'kit_in_cart'))).toBe(true);
    expect(isBeneficiaryRejection(apiError(422, 'CHK_ADDRESS_NOT_USABLE'))).toBe(false);
    expect(isBeneficiaryRejection(apiError(409, 'CHK_COUNTRY_MISMATCH'))).toBe(false);
    expect(isBeneficiaryRejection(null)).toBe(false);
  });
});

describe('comprar para otro distribuidor · lo que viaja al pagar', () => {
  const ana = { customerNumber: '1771306', name: 'ANA PEREZ LOPEZ' };

  it('sin beneficiario no viaja nada: compra normal', () => {
    expect(beneficiaryPayload(null, { isPickup: false })).toEqual({});
    expect(beneficiaryPayload(null, { isPickup: true, name: 'Juan', phone: '+524621234567' })).toEqual({});
    expect(beneficiaryPayload({ customerNumber: '', name: 'x' }, { isPickup: true, name: 'Juan' })).toEqual({});
  });

  it('envío a domicilio: solo el número (quién recibe va con la dirección)', () => {
    expect(beneficiaryPayload(ana, { isPickup: false, name: 'Juan', phone: '+524621234567' })).toEqual({
      forCustomerNumber: '1771306',
    });
  });

  it('recoger: el número y quién pasa por el pedido', () => {
    expect(beneficiaryPayload(ana, { isPickup: true, name: '  Marta   Ruiz ', phone: ' +524627778899 ' })).toEqual({
      forCustomerNumber: '1771306',
      recipientName: 'Marta Ruiz',
      recipientPhone: '+524627778899',
    });
    // Vacío: no se manda; el servidor pone a quien paga.
    expect(beneficiaryPayload(ana, { isPickup: true, name: ' ', phone: '' })).toEqual({ forCustomerNumber: '1771306' });
  });

  it('etiqueta con número y nombre', () => {
    expect(beneficiaryLabel(ana)).toBe('#1771306 ANA PEREZ LOPEZ');
    expect(beneficiaryLabel({ customerNumber: '1771306', name: ' ' })).toBe('#1771306');
    expect(beneficiaryLabel(null)).toBe('');
  });
});
