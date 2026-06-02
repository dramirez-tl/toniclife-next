// constants/ranks.ts - Colores y labels de rangos MLM
import { RankType } from '@/types/network';

export const RANK_COLORS: Record<RankType, string> = {
  distribuidor: '#9CA3AF',      // gray-400
  bronce: '#CD7F32',            // bronze
  plata: '#C0C0C0',             // silver
  oro: '#FFD700',               // gold
  platino: '#E5E4E2',           // platinum
  diamante: '#B9F2FF',          // diamond blue
  doble_diamante: '#87CEEB',    // sky blue
  triple_diamante: '#4169E1',   // royal blue
  sirius: '#9400D3',            // dark violet
  azul: '#0000CD',              // medium blue
};

export const RANK_LABELS: Record<RankType, string> = {
  distribuidor: 'Distribuidor',
  bronce: 'Bronce',
  plata: 'Plata',
  oro: 'Oro',
  platino: 'Platino',
  diamante: 'Diamante',
  doble_diamante: 'Doble Diamante',
  triple_diamante: 'Triple Diamante',
  sirius: 'Sirius',
  azul: 'Azul',
};

export const RANK_BG_COLORS: Record<RankType, string> = {
  distribuidor: '#F3F4F6',      // gray-100
  bronce: '#FEF3E2',            // orange-50
  plata: '#F9FAFB',             // gray-50
  oro: '#FFFBEB',               // yellow-50
  platino: '#F5F5F5',           // neutral-100
  diamante: '#EFF6FF',          // blue-50
  doble_diamante: '#F0F9FF',    // sky-50
  triple_diamante: '#EEF2FF',   // indigo-50
  sirius: '#FAF5FF',            // purple-50
  azul: '#EFF6FF',              // blue-50
};

export const RANK_TEXT_COLORS: Record<RankType, string> = {
  distribuidor: '#6B7280',      // gray-500
  bronce: '#92400E',            // amber-800
  plata: '#374151',             // gray-700
  oro: '#92400E',               // amber-800
  platino: '#525252',           // neutral-600
  diamante: '#1E40AF',          // blue-800
  doble_diamante: '#0369A1',    // sky-700
  triple_diamante: '#3730A3',   // indigo-800
  sirius: '#6B21A8',            // purple-800
  azul: '#1E3A8A',              // blue-900
};

// Orden de rangos para sorting
export const RANK_ORDER: RankType[] = [
  'distribuidor',
  'bronce',
  'plata',
  'oro',
  'platino',
  'diamante',
  'doble_diamante',
  'triple_diamante',
  'sirius',
  'azul',
];

export function getRankIndex(rank: RankType): number {
  return RANK_ORDER.indexOf(rank);
}

export function compareRanks(a: RankType, b: RankType): number {
  return getRankIndex(a) - getRankIndex(b);
}

// Medallas oficiales de cada rango (public/images/rangos).
export const RANK_IMAGES: Record<RankType, string> = {
  distribuidor: '/images/rangos/distribuidor.png',
  bronce: '/images/rangos/bronce.PNG',
  plata: '/images/rangos/plata.PNG',
  oro: '/images/rangos/oro.PNG',
  platino: '/images/rangos/platino.PNG',
  diamante: '/images/rangos/diamante.PNG',
  doble_diamante: '/images/rangos/doble_diamante.PNG',
  triple_diamante: '/images/rangos/triple_diamante.PNG',
  sirius: '/images/rangos/diamante_sirius.PNG',
  azul: '/images/rangos/diamante_azul.PNG',
};

// Alias de códigos heredados: la migración 004 usó "diamante_sirius"/"diamante_azul"
// mientras que la 008 usó "sirius"/"azul". Ambos deben resolver a la misma medalla.
const RANK_CODE_ALIASES: Record<string, RankType> = {
  diamante_sirius: 'sirius',
  diamante_azul: 'azul',
};

// Devuelve la ruta de la medalla para cualquier código de rango (canónico o alias).
// Cae a la medalla de distribuidor si el código es desconocido o nulo.
export function getRankImage(code: string | null | undefined): string {
  if (!code) return RANK_IMAGES.distribuidor;
  const normalized = RANK_CODE_ALIASES[code] ?? (code as RankType);
  return RANK_IMAGES[normalized] ?? RANK_IMAGES.distribuidor;
}
