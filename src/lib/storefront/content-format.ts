// Formato de LECTURA del contenido de la ficha. Gemela de
// `toniclife-api/src/modules/products/lib/content-sanitize.lib.ts` (contrato 5.6):
// el API guarda TEXTO PLANO saneado; aquí solo se parte en párrafos y viñetas.
// El resultado se pinta SIEMPRE como nodos de texto de React (jamás
// `dangerouslySetInnerHTML`), así que ninguna etiqueta puede ejecutarse.

export type ContentBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

const BULLET_RE = /^\s*(?:[-*•·–]\s+|\d{1,2}[.)]\s+)/u;
// Caracteres de control salvo el salto de línea (\n = U+000A).
const CONTROL_RE = new RegExp('[\\u0000-\\u0009\\u000B-\\u001F\\u007F]', 'g');

function clean(text: string | null | undefined): string {
  return (text ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_RE, ' ')
    .replace(/[ \t]+/g, ' ');
}

/**
 * Texto plano → bloques. Líneas en blanco separan párrafos; líneas con prefijo
 * de viñeta (`- `, `* `, `• `, `1. `) se agrupan en una lista. Los saltos simples
 * dentro de un párrafo se conservan (se pintan con `whitespace-pre-line`).
 */
export function toBlocks(text: string | null | undefined): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) blocks.push({ type: 'paragraph', text: paragraph.join('\n') });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length > 0) blocks.push({ type: 'list', items: list });
    list = [];
  };

  for (const raw of clean(text).split('\n')) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    if (BULLET_RE.test(line)) {
      flushParagraph();
      const item = line.replace(BULLET_RE, '').trim();
      if (item) list.push(item);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return blocks;
}

/** Viñetas ya partidas por el API (`benefits: string[]`): limpia vacías y prefijos. */
export function toBulletItems(items: readonly string[] | null | undefined): string[] {
  return (items ?? [])
    .map((item) => clean(item).replace(BULLET_RE, '').trim())
    .filter((item) => item.length > 0);
}

export function hasText(text: string | null | undefined): text is string {
  return typeof text === 'string' && text.trim().length > 0;
}

// ─── Nombre en formato título ────────────────────────────────────────────────
// El catálogo legado guarda los nombres EN MAYÚSCULAS ("CREMA CORPORAL SPECTRA
// 500ML"). Solo se transforma lo que viene todo en mayúsculas: un nombre ya
// capturado con mayúsculas y minúsculas se respeta tal cual.

const SMALL_WORDS = new Set([
  'de', 'del', 'la', 'las', 'el', 'los', 'y', 'e', 'o', 'u', 'con', 'sin', 'para', 'por', 'en', 'a', 'al',
  'of', 'and', 'or', 'the', 'with', 'for', 'in', 'to',
]);
const ACRONYMS = new Set([
  'TL', 'USA', 'US', 'MX', 'ADN', 'DNA', 'XL', 'XXL', 'UV', 'SPF', 'FPS', 'CBD', 'MSM', 'HMB',
]);
const UNIT_RE = /^(\d+(?:[.,]\d+)?)(ml|l|g|gr|kg|mg|mcg|oz|lb|pz|pzas|caps|tabs|cm|mm)$/i;
const VOWEL_RE = /[aeiouáéíóúü]/i;
const EDGE_PUNCT_RE = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;
const NON_ALNUM_RE = /[^\p{L}\p{N}]/gu;

function capitalize(word: string): string {
  const lower = word.toLocaleLowerCase('es');
  return lower.charAt(0).toLocaleUpperCase('es') + lower.slice(1);
}

function formatToken(token: string, isFirst: boolean): string {
  const bare = token.replace(EDGE_PUNCT_RE, '');
  if (!bare) return token;
  const unit = UNIT_RE.exec(bare);
  if (unit) return token.replace(bare, `${unit[1]}${unit[2].toLowerCase()}`);
  if (ACRONYMS.has(bare.toUpperCase())) return token;
  // Claves tipo B12, Q10, OMEGA3: con dígitos se quedan como vienen.
  if (/\d/.test(bare)) return token;
  const lower = bare.toLocaleLowerCase('es');
  if (SMALL_WORDS.has(lower)) return token.replace(bare, isFirst ? capitalize(bare) : lower);
  // Siglas sin vocales (p. ej. "TLC"): se quedan en mayúsculas.
  if (bare.length >= 2 && bare.length <= 4 && !VOWEL_RE.test(bare)) return token;
  return token.replace(bare, capitalize(bare));
}

/** "CREMA CORPORAL SPECTRA 500ML" → "Crema Corporal Spectra 500ml". */
export function formatProductName(name: string | null | undefined): string {
  const text = (name ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const letters = text.match(/\p{L}/gu) ?? [];
  const hasLower = letters.some((ch) => ch !== ch.toLocaleUpperCase('es'));
  if (hasLower || letters.length === 0) return text;
  let first = true;
  return text
    .split(' ')
    .map((word) =>
      word
        .split(/([-/])/)
        .map((part) => {
          if (part === '-' || part === '/' || part === '') return part;
          const out = formatToken(part, first);
          first = false;
          return out;
        })
        .join(''),
    )
    .join(' ');
}

/** Iniciales para el respaldo de imagen ("Crema Spectra" → "CS"). */
export function productInitials(name: string | null | undefined): string {
  const words = (name ?? '')
    .split(/\s+/)
    .map((w) => w.replace(NON_ALNUM_RE, ''))
    .filter((w) => w.length > 0);
  if (words.length === 0) return 'TL';
  const initials = words.length >= 2 ? words[0].charAt(0) + words[1].charAt(0) : words[0].slice(0, 2);
  return initials.toLocaleUpperCase('es');
}
