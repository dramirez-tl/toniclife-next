import { describe, expect, it } from 'vitest';
import { priceZoneDisplayName, viewerPriceZone } from './price-zone';

describe('viewerPriceZone', () => {
  it('sin zona (anónimo, cuenta de país o API previo) => null', () => {
    expect(viewerPriceZone(undefined)).toBeNull();
    expect(viewerPriceZone(null)).toBeNull();
    expect(viewerPriceZone({ tier: 'distributor', showPoints: true } as { priceZone?: string })).toBeNull();
    expect(viewerPriceZone({ priceZone: '' })).toBeNull();
    expect(viewerPriceZone({ priceZone: '   ', priceZoneName: 'Frontera MX-USA' })).toBeNull();
  });

  it('cuenta de Frontera: código en mayúsculas y nombre del API si viene', () => {
    expect(viewerPriceZone({ priceZone: 'fn' })).toEqual({ code: 'FN', name: null });
    expect(viewerPriceZone({ priceZone: 'FN', priceZoneName: ' Frontera MX-USA ' })).toEqual({
      code: 'FN',
      name: 'Frontera MX-USA',
    });
    expect(viewerPriceZone({ priceZone: 'FN', priceZoneName: '' })).toEqual({ code: 'FN', name: null });
  });
});

describe('priceZoneDisplayName', () => {
  it('usa el nombre del API cuando viene', () => {
    expect(priceZoneDisplayName({ code: 'FN', name: 'Frontera MX-USA' }, 'es')).toBe('Frontera MX-USA');
    expect(priceZoneDisplayName({ code: 'FN', name: 'MX-USA Border' }, 'en')).toBe('MX-USA Border');
  });

  it('sin nombre: Frontera / Border para FN; el código para una zona desconocida', () => {
    expect(priceZoneDisplayName({ code: 'FN', name: null }, 'es')).toBe('Frontera');
    expect(priceZoneDisplayName({ code: 'FN', name: null }, 'en')).toBe('Border');
    expect(priceZoneDisplayName({ code: 'ZZ', name: null }, 'es')).toBe('ZZ');
  });
});
