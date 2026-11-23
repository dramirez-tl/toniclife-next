// Formas de pago de una venta de CAJA (pos_sales.payment_method). Son las que se pueden asignar al
// corregir el método de una venta (EditPaymentModal) y las del filtro de Reportes › Ventas.
//
// Vive aparte del modal (archivo sin React) para poder probarlo. "Stripe" NO va aquí a propósito
// (Sistemas, 23-nov-2026): no es una forma de pago del POS; es un filtro exclusivo de Reportes › Ventas
// que lista los cobros de la tienda en línea (ver src/lib/stripe-payments.ts).

export const PAYMENT_METHOD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'credit', label: 'Crédito' },
  { value: 'mixed', label: 'Mixto' },
  { value: 'cashback', label: 'Cashback' },
  { value: 'promotion', label: 'Promoción' },
  { value: 'mercado_pago', label: 'Mercado Pago' },
  { value: 'usd_cash', label: 'Pago en Dólares' },
  { value: 'undefined', label: 'Por definir' },
];
