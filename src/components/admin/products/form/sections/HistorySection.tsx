'use client';

// (14) Historial — línea de tiempo paginada (GET /products/:id/history):
// producto, precios, imágenes, contenido y, en kits, la receta (componentes) y
// las reglas de bono de inscripción. Sin correos: solo nombres. El filtro por
// fuente se aplica a la página cargada (el API no filtra por fuente).

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { productAdminErrorMessage } from '../../lib/errors';
import { HISTORY_SOURCES, HISTORY_SOURCE_LABEL } from '../../lib/labels';
import { useProductHistory } from '../../useProductsAdmin';
import { useProductForm } from '../ProductFormContext';
import { SectionCard } from '../SectionCard';

const PAGE_SIZE = 20;

const SOURCE_CLASS: Record<string, string> = {
  product: 'bg-blue-100 text-blue-800',
  price: 'bg-emerald-100 text-emerald-800',
  image: 'bg-purple-100 text-purple-800',
  content: 'bg-amber-100 text-amber-800',
  components: 'bg-teal-100 text-teal-800',
  bonus: 'bg-pink-100 text-pink-800',
};

const ACTION_LABEL: Record<string, string> = {
  INSERT: 'Alta',
  UPDATE: 'Cambio',
  DELETE: 'Baja',
  PRODUCT_DUPLICATE: 'Duplicado',
  PRODUCT_BULK_UPDATE: 'Acción masiva',
  PRODUCT_SLUG_CHANGE: 'Cambio de URL',
  PRODUCT_CODE_CHANGE: 'Cambio de clave',
  PRODUCT_FISCAL_CHANGE: 'Cambio fiscal',
  KIT_OWN_STOCK_ZEROED: 'Existencia propia en cero',
};

/** Verbo por fuente cuando la acción es la genérica del trigger (INSERT/UPDATE/DELETE). */
const SOURCE_ACTION_LABEL: Record<string, Partial<Record<'INSERT' | 'UPDATE' | 'DELETE', string>>> = {
  components: { INSERT: 'Componente agregado', UPDATE: 'Componente modificado', DELETE: 'Componente quitado' },
  bonus: { INSERT: 'Regla de bono creada', UPDATE: 'Regla de bono modificada', DELETE: 'Regla de bono eliminada' },
  price: { INSERT: 'Precio capturado', UPDATE: 'Precio modificado', DELETE: 'Precio eliminado' },
  image: { INSERT: 'Imagen agregada', UPDATE: 'Imagen modificada', DELETE: 'Imagen quitada' },
};

export function actionLabel(source: string, action: string): string {
  const bySource = SOURCE_ACTION_LABEL[source]?.[action as 'INSERT' | 'UPDATE' | 'DELETE'];
  return bySource ?? ACTION_LABEL[action] ?? action;
}

function showValue(v: string | number | boolean | null): string {
  if (v === null || v === '') return 'vacío';
  if (typeof v === 'boolean') return v ? 'sí' : 'no';
  const text = String(v);
  return text.length > 140 ? `${text.slice(0, 139)}…` : text;
}

export function HistorySection() {
  const { productId } = useProductForm();
  const [page, setPage] = useState(1);
  const [source, setSource] = useState<string>('');
  const history = useProductHistory(productId, page, PAGE_SIZE);
  const total = history.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allEntries = useMemo(() => history.data?.data ?? [], [history.data]);
  const entries = useMemo(() => (source ? allEntries.filter((e) => e.source === source) : allEntries), [allEntries, source]);
  // Solo se ofrecen las fuentes que aparecen en la página (más "Todo").
  const presentSources = useMemo(() => HISTORY_SOURCES.filter((s) => allEntries.some((e) => e.source === s)), [allEntries]);

  return (
    <SectionCard
      title="Historial"
      description="Quién cambió qué y cuándo. Los cambios más recientes aparecen primero."
      actions={
        presentSources.length > 1 ? (
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filtrar por fuente">
            {['', ...presentSources].map((s) => (
              <button
                key={s || 'all'}
                type="button"
                aria-pressed={source === s}
                onClick={() => setSource(s)}
                className={`min-h-8 rounded-full px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E667D] ${
                  source === s ? 'bg-[#3E667D] text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {s ? (HISTORY_SOURCE_LABEL[s] ?? s) : 'Todo'}
              </button>
            ))}
          </div>
        ) : undefined
      }
    >
      {history.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-gray-600" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cargando historial…
        </p>
      ) : history.isError ? (
        <p className="text-sm text-red-700" role="alert">
          {productAdminErrorMessage(history.error, 'No se pudo cargar el historial del producto.')}
        </p>
      ) : allEntries.length === 0 ? (
        <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-700">
          Aún no hay cambios registrados para este producto.
        </p>
      ) : (
        <>
          {entries.length === 0 ? (
            <p className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-700">
              En esta página no hay cambios de {HISTORY_SOURCE_LABEL[source] ?? source}. Revisa otras páginas o quita el filtro.
            </p>
          ) : (
            <ol className={`relative space-y-4 border-l border-gray-200 pl-5 ${history.isFetching ? 'opacity-60' : ''}`} aria-busy={history.isFetching}>
              {entries.map((entry, index) => (
                <li key={`${entry.at}-${index}`} className="relative">
                  <span className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-[#3E667D]" aria-hidden />
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_CLASS[entry.source] ?? 'bg-gray-100 text-gray-800'}`}
                    >
                      {HISTORY_SOURCE_LABEL[entry.source] ?? entry.source}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{actionLabel(entry.source, entry.action)}</span>
                    <span className="text-xs text-gray-600">
                      {entry.at ? new Date(entry.at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                      {' · '}
                      {entry.userName ?? 'Sistema'}
                    </span>
                  </div>
                  {entry.changes.length > 0 ? (
                    <ul className="mt-1.5 space-y-1 text-sm text-gray-800">
                      {entry.changes.map((change, i) => (
                        <li key={`${change.field}-${i}`} className="break-words">
                          <span className="font-mono text-xs text-gray-700">{change.field}</span>:{' '}
                          <span className="text-gray-600 line-through decoration-gray-400">{showValue(change.from)}</span>
                          {' → '}
                          <span className="font-medium">{showValue(change.to)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ol>
          )}

          {totalPages > 1 ? (
            <nav className="mt-5 flex items-center justify-between gap-3 border-t border-gray-100 pt-4" aria-label="Paginación del historial">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1 || history.isFetching} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Más recientes
              </Button>
              <p className="text-sm text-gray-700" aria-live="polite">
                Página {page} de {totalPages} · {total} cambios
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages || history.isFetching}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Más antiguos
              </Button>
            </nav>
          ) : null}
        </>
      )}
    </SectionCard>
  );
}
