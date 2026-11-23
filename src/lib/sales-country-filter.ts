// Filtro por PAÍS de Reportes › Ventas por sucursal (Sistemas, 23-nov-2026: "quiero poder filtrar
// por país en el Excel: todos los países, o México y Frontera, o Colombia y Guatemala").
//
// El país es el de la SUCURSAL que vendió (Frontera es su propio "país", FN). Aplica a la pantalla, al
// CSV y a los tres Excel; el API recibe la lista en `countries` ("MX,FN") y no recibe nada cuando son
// todos. Reglas puras: el nombre del archivo se arma aquí igual que en el API (Content-Disposition no
// se expone por CORS).

export interface SalesCountryOption {
  /** countries.code del API. */
  code: string;
  label: string;
}

/** Países con sucursales, en el orden en que se muestran. */
export const SALES_COUNTRIES: readonly SalesCountryOption[] = [
  { code: 'MX', label: 'México' },
  { code: 'FN', label: 'Frontera' },
  { code: 'US', label: 'Estados Unidos' },
  { code: 'CO', label: 'Colombia' },
  { code: 'GT', label: 'Guatemala' },
];

export const ALL_SALES_COUNTRIES_LABEL = 'Todos los países';

/** Deja solo claves conocidas, sin repetir y en el orden del catálogo. Todas = ninguna (sin filtro). */
export function normalizeSalesCountries(selected: readonly string[]): string[] {
  const wanted = new Set(selected.map((c) => c.trim().toUpperCase()));
  const ordered = SALES_COUNTRIES.map((c) => c.code).filter((code) => wanted.has(code));
  return ordered.length === SALES_COUNTRIES.length ? [] : ordered;
}

/** Marca o desmarca un país. Con todos marcados vuelve a "Todos los países" (lista vacía). */
export function toggleSalesCountry(selected: readonly string[], code: string): string[] {
  const current = normalizeSalesCountries(selected);
  const key = code.trim().toUpperCase();
  return normalizeSalesCountries(current.includes(key) ? current.filter((c) => c !== key) : [...current, key]);
}

/** Lo que viaja al API: nada cuando son todos; "MX,FN" cuando se eligieron países. */
export function salesCountriesParam(selected: readonly string[]): string | undefined {
  const codes = normalizeSalesCountries(selected);
  return codes.length > 0 ? codes.join(',') : undefined;
}

/** Sufijo del nombre de los archivos: '' con todos; "_MX-FN" con filtro (igual que el API). */
export function salesCountrySuffix(countries?: string | null): string {
  const codes = normalizeSalesCountries((countries ?? '').split(','));
  return codes.length > 0 ? `_${codes.join('-')}` : '';
}

/** "Todos los países" · "México, Frontera". */
export function salesCountriesLabel(selected: readonly string[]): string {
  const codes = normalizeSalesCountries(selected);
  if (codes.length === 0) return ALL_SALES_COUNTRIES_LABEL;
  return SALES_COUNTRIES.filter((c) => codes.includes(c.code))
    .map((c) => c.label)
    .join(', ');
}
