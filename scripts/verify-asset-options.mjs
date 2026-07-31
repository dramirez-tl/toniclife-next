// Verifica groupByRoot() contra la estructura real de categorías y ubicaciones.
//
// Corre con:  node scripts/verify-asset-options.mjs
//
// Lo que importa: que agrupar NO pierda opciones. La queja que originó esto fue
// "ya no veo los departamentos", así que la prueba central es que la cuenta de
// entrada y la de salida coincidan siempre, incluso con datos torcidos.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Node 24 despoja los tipos solo. El módulo únicamente importa un `import type`
// (que el despojado borra), así que no hace falta bundler ni resolver el alias.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src/lib/asset-select-options.ts');

const { groupByRoot } = await import('file://' + SRC.replace(/\\/g, '/'));

let ok = 0, bad = 0;
const R = (cond, label, detail = '') => {
  if (cond) { ok++; console.log(`  OK    ${label}`); }
  else { bad++; console.log(`  FALLA ${label}${detail ? '  -> ' + detail : ''}`); }
};

const n = (id, name, parentId, parentName, extra = {}) =>
  ({ id, name, parentId, parentName, ...extra });

// ---------------------------------------------------------------
// Datos reales, tomados de la BD el 30-jul-2026
// ---------------------------------------------------------------
const CORP = 'loc-corp';
const DEPTOS = [
  'Estacionamiento TL', 'Piso 1 - Dpto. Comercial', 'Piso 1 - Dpto. Contabilidad',
  'Piso 1 - Dpto. Dirección', 'Piso 1 - Dpto. Jurídico', 'Piso 1 - Dpto. RRHH',
  'Piso 1 - Dpto. Sistemas', 'Piso 1 - Dpto. Tesorería', 'Planta Baja - Bodega 01',
  'Planta Baja - Bodega 02', 'Planta Baja - Dpto. Call Center',
  'Planta Baja - Dpto. CEDEAS', 'Planta Baja - Dpto. Marketing',
  'Planta Baja - Dpto. Operaciones', 'Planta Baja - Imprenta',
  'Planta Baja - Recepción',
];
const ubicaciones = [
  n(CORP, 'Corporativo Irapuato', null, null, { branchName: null }),
  ...DEPTOS.map((d, i) => n(`loc-${i}`, d, CORP, 'Corporativo Irapuato', { branchName: null })),
];

const CATS = {
  'Computo': ['Laptop', 'CPU / Computadora de escritorio', 'All-in-One', 'Servidor', 'Tablet'],
  'Pantallas y proyeccion': ['Monitor', 'Pantalla plana / TV', 'Canon / Proyector'],
  'Impresion y captura': ['Impresora termica', 'Impresora laser / tinta', 'Multifuncional', 'Escaner', 'Lector de codigo de barras'],
  'Video y vigilancia': ['DVR / NVR', 'Camara de seguridad', 'Camara web'],
  'Perifericos y accesorios': ['Mouse', 'Teclado', 'Diadema de call center', 'Microfono', 'Bocinas', 'Docking station / Base', 'Adaptador / Convertidor', 'Cargador / Eliminador', 'Cable / Extension'],
  'Energia': ['Regulador', 'No-break (UPS)'],
  'Redes y comunicaciones': ['Switch de red', 'Router', 'Access point', 'Modem'],
  'Movilidad': ['Celular'],
  'Otros': ['Otro equipo'],
};
const categorias = [];
let ci = 0;
for (const [raiz, hijas] of Object.entries(CATS)) {
  const rid = `cat-${raiz}`;
  categorias.push(n(rid, raiz, null, null));
  for (const h of hijas) categorias.push(n(`cat-${ci++}`, h, rid, raiz));
}

// ---------------------------------------------------------------
console.log('=== UBICACIONES (17 reales) ===');
const lo = groupByRoot(ubicaciones, (r) => r.name);
R(lo.length === ubicaciones.length, 'no se pierde ni se duplica ninguna',
  `entraron ${ubicaciones.length}, salieron ${lo.length}`);
R(new Set(lo.map((o) => o.value)).size === lo.length, 'sin ids repetidos');
R(lo.every((o) => o.group === 'Corporativo Irapuato'),
  'las 17 quedan bajo el encabezado del sitio');
R(lo[0].label === 'Corporativo Irapuato', 'el sitio va primero', lo[0].label);
R(lo.filter((o) => o.hint).length === 0,
  'ningun renglon repite el padre (para eso esta el encabezado)');
for (const d of ['Piso 1 - Dpto. Sistemas', 'Planta Baja - Dpto. CEDEAS', 'Estacionamiento TL']) {
  R(lo.some((o) => o.label === d), `sigue apareciendo: ${d}`);
}
console.log(`  · encabezados: ${[...new Set(lo.map((o) => o.group))].join(' | ')}`);

console.log('\n=== CATEGORIAS (42 reales) ===');
const co = groupByRoot(categorias, (r) => r.name);
R(co.length === categorias.length, 'no se pierde ninguna',
  `entraron ${categorias.length}, salieron ${co.length}`);
const heads = [...new Set(co.map((o) => o.group))];
R(heads.length === 9, '9 encabezados, uno por categoria raiz', `hay ${heads.length}`);
R(co[0].label === 'Computo' && co[1].label === 'Laptop',
  'cada raiz va seguida de sus hijas', `${co[0].label} -> ${co[1].label}`);
R(heads[0] === 'Computo' && heads[1] === 'Pantallas y proyeccion',
  'se respeta el orden que manda la API (sort_order)', heads.slice(0, 2).join(' | '));
console.log(`  · ${heads.map((h) => `${h}(${co.filter((o) => o.group === h).length})`).join('  ')}`);

console.log('\n=== CASOS TORCIDOS ===');
// Al filtrar por sucursal, el padre puede quedar fuera de la lista. La hija NO
// debe desaparecer: se trata como raiz.
const huerfana = [n('h1', 'Bodega de sucursal', 'padre-que-no-vino', 'Otro sitio')];
const ho = groupByRoot(huerfana, (r) => r.name);
R(ho.length === 1, 'una hija sin su padre no se pierde');
R(ho[0].group === 'Bodega de sucursal', 'se vuelve su propio encabezado', ho[0].group);

// Datos con un ciclo: no debe colgarse ni perder nodos.
const ciclo = [n('a', 'A', 'b', 'B'), n('b', 'B', 'a', 'A')];
const cy = groupByRoot(ciclo, (r) => r.name);
R(cy.length === 2, 'un ciclo no pierde nodos ni cuelga', `salieron ${cy.length}`);

// Tres niveles: el encabezado ya no alcanza, el padre inmediato baja al hint.
const tres = [
  n('r', 'Sitio', null, null),
  n('m', 'Piso 1', 'r', 'Sitio'),
  n('h', 'Sala A', 'm', 'Piso 1'),
];
const to = groupByRoot(tres, (r) => r.name);
R(to.length === 3, '3 niveles salen completos');
R(to.find((o) => o.label === 'Sala A')?.hint === 'Piso 1',
  'el nieto muestra su padre inmediato abajo',
  to.find((o) => o.label === 'Sala A')?.hint);
R(to.find((o) => o.label === 'Piso 1')?.hint === undefined,
  'la hija directa no lo repite (ya esta en el encabezado)');

R(groupByRoot([], (r) => r.name).length === 0, 'lista vacia no truena');

console.log(`\n================ ${ok} OK · ${bad} FALLAS ================\n`);
process.exit(bad > 0 ? 1 : 0);
