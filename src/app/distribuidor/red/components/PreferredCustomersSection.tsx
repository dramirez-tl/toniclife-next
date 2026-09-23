'use client';

// PreferredCustomersSection — Clientes preferentes del distribuidor (no son
// parte del árbol MLM). Sección de siempre (contrato /distribuidor/red §5.8),
// con la fecha de alta formateada por idioma (useLocale) en vez de 'es-MX' fijo.
// En móvil (< sm) se muestran como tarjetas para no hacer scroll horizontal.

import { useLocale, useTranslations } from 'next-intl';
import { UserPlusIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePreferredCustomers } from '@/hooks/useDistributor';
import { fmtDate } from '@/lib/network/format';

export function PreferredCustomersSection({ onAdd }: { onAdd: () => void }) {
  const t = useTranslations('distributor.network.preferred');
  const locale = useLocale();
  const { data: preferred = [], isLoading } = usePreferredCustomers();

  return (
    <Card>
      <CardContent className="p-4 lg:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{t('title')}</h3>
            <p className="text-sm text-gray-500">{t('subtitle')}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onAdd} className="shrink-0">
            <UserPlusIcon className="h-4 w-4" aria-hidden="true" />
            {t('add')}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          </div>
        ) : preferred.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center">
            <p className="text-sm text-gray-500">{t('empty')}</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={onAdd}>
              <UserPlusIcon className="h-4 w-4" aria-hidden="true" />
              {t('enrollFirst')}
            </Button>
          </div>
        ) : (
          <>
            {/* Escritorio/tablet: tabla */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="py-2 pr-4 font-medium">{t('columns.id')}</th>
                    <th className="py-2 pr-4 font-medium">{t('columns.name')}</th>
                    <th className="py-2 pr-4 font-medium">{t('columns.email')}</th>
                    <th className="py-2 pr-4 font-medium">{t('columns.phone')}</th>
                    <th className="py-2 pr-4 font-medium">{t('columns.joinDate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {preferred.map((c) => (
                    <tr key={c.customerId} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5 pr-4 font-mono text-[#3E667D]">{c.customerNumber || '—'}</td>
                      <td className="py-2.5 pr-4 font-medium text-gray-900">{c.fullName}</td>
                      <td className="py-2.5 pr-4 text-gray-600">{c.email}</td>
                      <td className="py-2.5 pr-4 text-gray-600">{c.phone || '—'}</td>
                      <td className="py-2.5 pr-4 tabular-nums text-gray-500">{c.createdAt ? fmtDate(c.createdAt, locale) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Teléfono: tarjetas */}
            <ul className="space-y-2 sm:hidden">
              {preferred.map((c) => (
                <li key={c.customerId} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-semibold text-gray-900">{c.fullName}</p>
                    <span className="shrink-0 font-mono text-xs text-[#3E667D]">{c.customerNumber || '—'}</span>
                  </div>
                  <p className="mt-1 break-all text-xs text-gray-600">{c.email}</p>
                  <p className="text-xs text-gray-600">
                    {c.phone || '—'}
                    {c.createdAt ? ` · ${fmtDate(c.createdAt, locale)}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
