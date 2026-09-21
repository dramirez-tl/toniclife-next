// Paridad ES/EN de src/messages (contrato ecommerce 7.7).
//   node scripts/check-i18n-parity.mjs            → todas las claves
//   node scripts/check-i18n-parity.mjs storefront → solo ese namespace
// Falla (exit 1) si una clave existe en un idioma y no en el otro, si un valor
// está vacío o si los argumentos ICU ({name}, {count, plural, …}) no coinciden.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../src/messages/', import.meta.url));
const load = (lang) => JSON.parse(readFileSync(`${root}${lang}.json`, 'utf8'));
const scope = process.argv[2] ?? '';

function flatten(node, prefix = '', out = new Map()) {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') flatten(value, path, out);
    else out.set(path, String(value ?? ''));
  }
  return out;
}

/** Nombres de argumentos ICU de primer nivel: "{count, plural, one {# x}}" → count. */
function icuArgs(message) {
  const args = new Set();
  let depth = 0;
  let token = '';
  for (const ch of message) {
    if (ch === '{') {
      depth += 1;
      if (depth === 1) token = '';
    } else if (ch === '}') {
      if (depth === 1 && token.trim()) args.add(token.split(',')[0].trim());
      depth = Math.max(0, depth - 1);
    } else if (depth === 1) {
      token += ch;
    }
  }
  return [...args].sort();
}

const inScope = (key) => !scope || key === scope || key.startsWith(`${scope}.`);
const es = flatten(load('es'));
const en = flatten(load('en'));
const problems = [];

for (const key of es.keys()) if (inScope(key) && !en.has(key)) problems.push(`solo en es: ${key}`);
for (const key of en.keys()) if (inScope(key) && !es.has(key)) problems.push(`solo en en: ${key}`);
for (const [key, value] of es) {
  if (!inScope(key) || !en.has(key)) continue;
  if (!value.trim()) problems.push(`vacío en es: ${key}`);
  if (!en.get(key).trim()) problems.push(`vacío en en: ${key}`);
  const a = icuArgs(value).join(',');
  const b = icuArgs(en.get(key)).join(',');
  if (a !== b) problems.push(`argumentos distintos en ${key}: es{${a}} en{${b}}`);
}

const count = (map) => [...map.keys()].filter(inScope).length;
console.log(`i18n ${scope || '(todo)'}: es ${count(es)} · en ${count(en)} · problemas ${problems.length}`);
for (const problem of problems) console.log(` - ${problem}`);
process.exit(problems.length ? 1 : 0);
