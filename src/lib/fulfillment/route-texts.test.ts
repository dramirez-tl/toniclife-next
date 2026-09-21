import { describe, expect, it } from 'vitest';
import type { FulfillmentAppliedChange } from '@/types/fulfillment';
import {
  GAINING_STOCK_NOTE,
  PROPAGATION_NOTE,
  SAVE_SUMMARY_DESCRIPTION,
  appliedNoticeMessages,
  noOnlineShippingText,
  routingSubtitle,
} from './route-texts';

const applied = (overrides: Partial<FulfillmentAppliedChange>): FulfillmentAppliedChange => ({
  type: 'paused',
  countryCode: 'MX',
  branchId: 'b-999',
  branchCode: '999',
  branchName: 'Sucursal cerrada',
  fromPriority: 2,
  toPriority: 2,
  ...overrides,
});

describe('route-texts · cuánto tarda un cambio (M-1)', () => {
  it('no promete el catálogo en menos de un minuto', () => {
    expect(PROPAGATION_NOTE).toContain('El pedido y el carrito aplican en menos de un minuto');
    expect(PROPAGATION_NOTE).toContain('el catálogo de la tienda puede tardar unos minutos');
    expect(SAVE_SUMMARY_DESCRIPTION).toContain(PROPAGATION_NOTE);
    expect(SAVE_SUMMARY_DESCRIPTION).not.toContain('Aplica en la tienda en menos de un minuto');
    expect(GAINING_STOCK_NOTE).toContain('en su carrito, en menos de un minuto');
    expect(GAINING_STOCK_NOTE).toContain('catálogo puede tardar unos minutos');
  });
});

describe('route-texts · subtítulo según el modo (L-4)', () => {
  it('pedido completo vs siempre el primero; sin modo no afirma ninguno', () => {
    expect(routingSubtitle('full_order')).toContain('el primero de la lista que pueda surtir el pedido completo');
    expect(routingSubtitle('first_active')).toContain('se usa siempre el primero de la lista');
    expect(routingSubtitle('first_active')).not.toContain('pedido completo');
    expect(routingSubtitle(null)).not.toContain('pedido completo');
    expect(routingSubtitle(undefined)).toContain('el orden de la lista decide');
  });
});

describe('route-texts · "Nadie podrá pedir…" (L-5)', () => {
  it('habla de la tienda en línea y aclara kit y carrito compartido', () => {
    const text = noOnlineShippingText('a México', 'haya un almacén activo en esta lista');
    expect(text).toBe(
      'Nadie podrá pedir en la tienda en línea con envío a domicilio a México hasta que haya un almacén activo en esta lista. El kit de inscripción y el carrito compartido no dependen de estas rutas.',
    );
  });
});

describe('route-texts · avisos del guardado (L-2)', () => {
  it('paused_branch_inactive: dice qué ruta quedó en pausa y por qué', () => {
    const [notice, ...rest] = appliedNoticeMessages([applied({ notice: 'paused_branch_inactive' })], { MX: 'México' });
    expect(rest).toEqual([]);
    expect(notice.notice).toBe('paused_branch_inactive');
    expect(notice.message).toBe(
      '999 · Sucursal cerrada → México quedó en pausa porque esa sucursal está desactivada. Actívala en Sucursales y después quítale la pausa aquí.',
    );
  });

  it('varias rutas en pausa = un solo aviso; convive con el de entre países', () => {
    const out = appliedNoticeMessages([
      applied({ notice: 'paused_branch_inactive' }),
      applied({ notice: 'paused_branch_inactive', countryCode: 'FN', branchId: 'b-998', branchCode: '998' }),
      applied({ type: 'added', notice: 'cross_country_blocked', countryCode: 'CO' }),
      applied({ type: 'reordered' }),
    ]);
    expect(out.map((n) => n.notice)).toEqual(['paused_branch_inactive', 'cross_country_blocked']);
    expect(out[0].message).toContain('Estas rutas quedaron en pausa');
    expect(out[0].message).toContain('998 · Sucursal cerrada → FN');
    expect(out[1].message).toContain('todavía no surte pedidos');
  });

  it('sin avisos, sin applied o con un notice desconocido no dice nada', () => {
    expect(appliedNoticeMessages([applied({})])).toEqual([]);
    expect(appliedNoticeMessages(undefined)).toEqual([]);
    expect(appliedNoticeMessages(null)).toEqual([]);
    expect(appliedNoticeMessages([applied({ notice: 'otro' as never })])).toEqual([]);
  });
});
