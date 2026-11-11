import { describe, expect, it } from 'vitest';
import {
  filesOfItem,
  generalFiles,
  groupItemsByDay,
  parseAmount,
  proofTotals,
  submitWarnings,
  type ProofItem,
} from './viaticos-proof';
import type { ViaticoFile, ViaticoItem } from '@/types/viaticos';

const item = (id: string, date: string, label: string, amount: number, spent: number | null = null): ViaticoItem => ({
  id,
  conceptCode: label.toLowerCase(),
  conceptLabel: label,
  category: 'other',
  date,
  amount,
  spentAmount: spent,
  proofNote: null,
});

const file = (id: string, kind: ViaticoFile['kind'], itemId: string | null = null): ViaticoFile => ({
  id,
  kind,
  itemId,
  fileName: `${id}.jpg`,
  mimeType: 'image/jpeg',
  sizeBytes: 1000,
  createdAt: '2026-11-10T18:00:00.000Z',
});

const money = (n: number) => `$${n.toFixed(2)}`;

describe('comprobación de viáticos (caja chica)', () => {
  const items = [
    item('i-gas', '2026-11-16', 'Gasolina', 600),
    item('i-est', '2026-11-16', 'Estacionamiento', 92),
    item('i-com', '2026-11-17', 'Comida', 300),
    item('i-cas', '2026-11-17', 'Casetas', 254),
  ];
  const files = [
    file('f1', 'receipt', 'i-gas'),
    file('f2', 'receipt', 'i-gas'),
    file('f3', 'invoice', 'i-gas'),
    file('f4', 'invoice', 'i-com'),
    file('f5', 'invoice'),
    file('f6', 'refund'),
  ];

  it('agrupa los gastos por día, en orden, con lo solicitado de cada día', () => {
    const days = groupItemsByDay([...items].reverse());
    expect(days.map((d) => [d.date, d.requested, d.items.map((i) => i.conceptLabel)])).toEqual([
      ['2026-11-16', 692, ['Estacionamiento', 'Gasolina']],
      ['2026-11-17', 554, ['Casetas', 'Comida']],
    ]);
    // Un gasto sin id (API anterior a la mig 199) no se puede comprobar por gasto.
    expect(groupItemsByDay([{ ...items[0], id: undefined }])).toEqual([]);
  });

  it('separa los archivos de cada gasto por tipo, y los generales', () => {
    expect(filesOfItem(files, 'i-gas', 'receipt').map((f) => f.id)).toEqual(['f1', 'f2']);
    expect(filesOfItem(files, 'i-gas', 'invoice').map((f) => f.id)).toEqual(['f3']);
    expect(filesOfItem(files, 'i-est', 'receipt')).toEqual([]);
    expect(generalFiles(files, 'invoice').map((f) => f.id)).toEqual(['f5']);
    expect(generalFiles(files, 'receipt')).toEqual([]);
  });

  it('parseAmount: vacío = sin capturar; acepta comas de miles', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('  ')).toBeNull();
    expect(parseAmount('1,250.5')).toBe(1250.5);
    expect(parseAmount('0')).toBe(0);
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount(undefined)).toBeNull();
  });

  it('autorizado − (gastado + no previstos) = sobrante; cuenta gastos con comprobante y sin capturar', () => {
    const spent: Record<string, number | null> = { 'i-gas': 580.5, 'i-est': null, 'i-com': 310, 'i-cas': 254 };
    const t = proofTotals({
      authorized: 1300,
      items: items as ProofItem[],
      files,
      spentOf: (it) => spent[it.id],
      extra: 50,
    });
    expect(t).toMatchObject({
      spentItems: 1144.5,
      extra: 50,
      total: 1194.5,
      balance: 105.5,
      itemsCount: 4,
      itemsWithProof: 2,
      itemsWithoutAmount: 1,
      // Casetas tiene monto y ningún archivo; la gasolina y la comida sí traen.
      itemsSpentWithoutProof: 1,
    });
  });

  it('gastó de más: saldo negativo; un gasto en $0 no pide comprobante', () => {
    const t = proofTotals({
      authorized: 500,
      items: items.slice(0, 2) as ProofItem[],
      files: [],
      spentOf: (it) => (it.id === 'i-gas' ? 650 : 0),
      extra: null,
    });
    expect(t.balance).toBe(-150);
    expect(t.itemsSpentWithoutProof).toBe(1);
    expect(t.itemsWithoutAmount).toBe(0);
  });

  it('avisos antes de enviar: sin monto, sin comprobante y sobrante sin ficha', () => {
    const base = proofTotals({
      authorized: 1000,
      items: items as ProofItem[],
      files: [],
      spentOf: (it) => (it.id === 'i-est' ? null : 100),
      extra: null,
    });
    expect(submitWarnings(base, 0, money)).toEqual([
      '1 gasto no tiene capturado lo gastado (contará como $0).',
      '3 gastos no tienen recibo ni factura.',
      'Te sobran $700.00 y no subiste la ficha de devolución.',
    ]);
    // Con la ficha subida ya no avisa del sobrante.
    expect(submitWarnings(base, 1, money)).toHaveLength(2);

    const exacto = proofTotals({
      authorized: 600,
      items: items.slice(0, 1) as ProofItem[],
      files: [file('f1', 'receipt', 'i-gas')],
      spentOf: () => 600,
      extra: null,
    });
    expect(submitWarnings(exacto, 0, money)).toEqual([]);
  });
});
