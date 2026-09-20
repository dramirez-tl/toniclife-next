// mx-ids.test.mjs - Pruebas del espejo src/lib/mx-ids.ts (Next no tiene jest).
// Ejecutar: node --test scripts/mx-ids.test.mjs   (Node >= 22.6 con
// type-stripping nativo; Node 24 lo trae por defecto). Mismos vectores que
// toniclife-api/src/common/validators/*.spec.ts para que ambos lados no diverjan.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  accountLast4,
  bankFromClabe,
  clabeCheckDigit,
  curpCheckDigit,
  findBank,
  isGenericRfc,
  isValidAbaRouting,
  isValidClabe,
  isValidCurp,
  isValidRfc,
  maskAccount,
  maskCurp,
  maskRfc,
  normalizeId,
  rfcCheckDigit,
  rfcMatchesCurp,
  BANKS_MX,
} from '../src/lib/mx-ids.ts';

const CURP_OK = 'BADD110313HCMLNS06';

test('normalizeId', () => {
  assert.equal(normalizeId(' gode-561231 gr8 '), 'GODE561231GR8');
  assert.equal(normalizeId(null), '');
});

test('CURP válida con la tabla RENAPO (incluye Ñ)', () => {
  assert.deepEqual(isValidCurp(CURP_OK), { ok: true, normalized: CURP_OK });
  assert.equal(curpCheckDigit(CURP_OK), 6);
  assert.equal(isValidCurp(' badd110313hcmlns06 ').ok, true);
});

test('CURP inválidas por dígito, formato y fecha', () => {
  assert.equal(isValidCurp('BADD110313HCMLNS09').reason, 'CHECK_DIGIT');
  assert.equal(isValidCurp('BADD110313HCMLNS0').reason, 'FORMAT');
  assert.equal(isValidCurp('BADD110313XCMLNS06').reason, 'FORMAT');
  assert.equal(isValidCurp('BADD110231HCMLNS06').reason, 'DATE');
  assert.equal(isValidCurp('').reason, 'FORMAT');
});

test('siglo por la homoclave (29-feb-2000 sí, 29-feb-1900 no)', () => {
  const b2000 = 'BADD000229HCMLNSA';
  assert.equal(isValidCurp(b2000 + curpCheckDigit(b2000)).ok, true);
  const b1900 = 'BADD000229HCMLNS0';
  assert.equal(isValidCurp(b1900 + curpCheckDigit(b1900)).reason, 'DATE');
});

test('RFC válidos (SAT test vectors) y dígito', () => {
  for (const [rfc, personType] of [
    ['GODE561231GR8', 'fisica'],
    ['CACX7605101P8', 'fisica'],
    ['XOJI740919U48', 'fisica'],
    ['EKU9003173C9', 'moral'],
    ['IIA040805DZ4', 'moral'],
  ]) {
    assert.deepEqual(isValidRfc(rfc), { ok: true, normalized: rfc, personType });
  }
  assert.equal(rfcCheckDigit('GODE561231GR8'), '8');
  assert.equal(rfcCheckDigit('AAA010101AAA'), '1');
});

test('RFC inválidos y genéricos', () => {
  assert.equal(isValidRfc('GODE561231GR7').reason, 'CHECK_DIGIT');
  assert.equal(isValidRfc('GODE561231GR').reason, 'FORMAT');
  assert.equal(isValidRfc('GODE561331GR8').reason, 'FORMAT');
  assert.equal(isValidRfc('XAXX010101000').reason, 'GENERIC');
  assert.equal(isValidRfc('xexx010101000').reason, 'GENERIC');
  assert.equal(isValidRfc('XAXX010101000', { allowGeneric: true }).ok, true);
  assert.equal(isGenericRfc('GODE561231GR8'), false);
});

test('cruce CURP↔RFC y máscaras', () => {
  assert.equal(rfcMatchesCurp('BADD110313AB9', CURP_OK), true);
  assert.equal(rfcMatchesCurp('GODE561231GR8', CURP_OK), false);
  assert.equal(rfcMatchesCurp('EKU9003173C9', CURP_OK), false);
  assert.equal(maskRfc('GODE561231GR8'), 'GOD*******GR8');
  assert.equal(maskCurp(CURP_OK), 'BADD************06');
});

test('CLABE: dígito 3-7-1 y banco por prefijo', () => {
  for (const [clabe, bank] of [
    ['002010077777777771', 'Banamex'],
    ['646180110400000007', 'STP'],
    ['137180000000000000', 'BanCoppel'],
  ]) {
    const r = isValidClabe(clabe);
    assert.equal(r.ok, true, clabe);
    assert.equal(r.bank?.shortName, bank);
  }
  assert.equal(clabeCheckDigit('00201007777777777'), 1);
  assert.equal(isValidClabe('0020 1007 7777 7777 71').ok, true);
  assert.equal(isValidClabe('012180001234567897').reason, 'CHECK_DIGIT');
  assert.equal(isValidClabe('012180001234567897').bank?.shortName, 'BBVA');
  assert.equal(isValidClabe('00201007777777777').reason, 'LENGTH');
  assert.equal(isValidClabe('00201007777777777X').reason, 'DIGITS');
  assert.equal(bankFromClabe('012')?.shortName, 'BBVA');
  assert.equal(bankFromClabe('01'), null);
  assert.equal(bankFromClabe('999180000000000000'), null);
});

test('catálogo de bancos sin duplicados y con los del legacy', () => {
  const codes = BANKS_MX.map((b) => b.code);
  assert.equal(new Set(codes).size, codes.length);
  for (const c of codes) assert.match(c, /^\d{3}$/);
  for (const [code, name] of [['012', 'BBVA'], ['137', 'BanCoppel'], ['127', 'Azteca'], ['002', 'Banamex'], ['072', 'Banorte'], ['014', 'Santander'], ['646', 'STP'], ['021', 'HSBC'], ['638', 'Nu'], ['728', 'Spin']]) {
    assert.equal(findBank(code)?.shortName, name);
  }
  assert.equal(findBank('12')?.code, '012');
  assert.equal(findBank('abc'), null);
});

test('ABA routing', () => {
  for (const r of ['021000021', '011000015', '121000248', '026009593']) assert.equal(isValidAbaRouting(r), true, r);
  for (const r of ['123456789', '000000000', '02100002', '', '990000009']) assert.equal(isValidAbaRouting(r), false, r);
  assert.equal(isValidAbaRouting('0210-0002-1'), true);
});

test('máscara de cuenta', () => {
  assert.equal(maskAccount('002010077777777771'), '****7771');
  assert.equal(maskAccount(''), '');
  assert.equal(accountLast4('002010077777777771'), '7771');
});
