// parity.test.ts — es.json y en.json tienen EXACTAMENTE las mismas claves (next-intl
// no avisa en build: una clave que falta en un idioma sale como texto crudo en la UI).

import { describe, expect, it } from 'vitest';
import en from './en.json';
import es from './es.json';

type Tree = { [key: string]: string | Tree };

function leafKeys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : leafKeys(value, `${prefix}${key}.`),
  );
}

function leaf(tree: Tree, path: string): string | undefined {
  const value = path.split('.').reduce<string | Tree | undefined>((node, key) => (typeof node === 'object' ? node[key] : undefined), tree);
  return typeof value === 'string' ? value : undefined;
}

/** Nombres de los argumentos ICU (`{zone}`, `{count, plural…}`) de un mensaje. */
const icuArguments = (message: string): string[] =>
  Array.from(message.matchAll(/\{\s*([A-Za-z0-9_]+)/g), (m) => m[1]).sort();

describe('paridad ES/EN de los mensajes', () => {
  it('las mismas claves hoja en los dos idiomas', () => {
    const esKeys = leafKeys(es as Tree).sort();
    const enKeys = leafKeys(en as Tree).sort();
    expect(enKeys.filter((k) => !esKeys.includes(k))).toEqual([]);
    expect(esKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
  });

  it('el aviso de zona de precios existe en ambos idiomas con el mismo argumento {zone}', () => {
    const key = 'storefront.common.priceZone.message';
    expect(leaf(es as Tree, key)).toBe('Tus precios corresponden a la zona {zone}');
    expect(leaf(en as Tree, key)).toBe('Your prices are for the {zone} zone');
    expect(icuArguments(leaf(es as Tree, key) ?? '')).toEqual(['zone']);
    expect(icuArguments(leaf(en as Tree, key) ?? '')).toEqual(['zone']);
  });
});
