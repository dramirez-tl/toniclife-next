'use client';

// Admin → Comercial → Formularios: análisis de las respuestas del formulario
// público "Oportunidad de Negocio" (formulario.<dominio>). Métricas, tabla
// con filtros y export CSV. Datos: /marketing/leads (+/stats).

import { Suspense, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  ClipboardDocumentListIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import {
  useMarketingLeads,
  useMarketingLeadStats,
} from '@/hooks/useMarketingLeads';
import { marketingService } from '@/services/marketing.service';

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/** Solo dígitos (con lada) para armar el link de WhatsApp. */
const waDigits = (phone?: string) => {
  const d = (phone ?? '').replace(/\D/g, '');
  if (d.length < 10) return null;
  return d.length === 10 ? `52${d}` : d;
};

export default function FormulariosPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <FormulariosContent />
    </Suspense>
  );
}

function FormulariosContent() {
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const params = useMemo(
    () => ({
      formSlug: 'oportunidad',
      search: appliedSearch || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      page,
      limit: 20,
    }),
    [appliedSearch, fromDate, toDate, page],
  );
  const { data: leads, isLoading, isError, error } = useMarketingLeads(params);
  const { data: stats } = useMarketingLeadStats('oportunidad');
  // 403 = el rol no está autorizado para leer respuestas (la sección
  // Comercial del sidebar se gatea por permisos, no por este rol).
  const isForbidden =
    isError &&
    (error as { response?: { status?: number } })?.response?.status === 403;

  const applyFilters = () => {
    setAppliedSearch(search.trim());
    setPage(1);
  };

  // Export CSV: trae hasta 500 filas con los filtros vigentes.
  async function handleExport() {
    setExporting(true);
    try {
      const all = await marketingService.getLeads({
        ...params,
        page: 1,
        limit: 500,
      });
      // Escape CSV + NEUTRALIZACIÓN de fórmulas (CWE-1236): los datos vienen
      // de un formulario PÚBLICO — una celda que empiece con = + - @ (o
      // tab/CR) se ejecutaría como fórmula al abrir el CSV en Excel. Se
      // antepone apóstrofo para que Excel la trate como texto.
      const esc = (v: string | undefined) => {
        let s = (v ?? '').replace(/[\r\n\t]/g, ' ');
        if (/^[=+\-@]/.test(s)) s = `'${s}`;
        return `"${s.replace(/"/g, '""')}"`;
      };
      const rows = [
        ['Fecha (CDMX)', 'Nombre completo', 'Ciudad y país', 'Teléfono/WhatsApp', 'Invitado por', 'Origen'].join(','),
        ...all.data.map((l) =>
          [
            esc(fmtDateTime(l.createdAt)),
            esc(l.fullName),
            esc(l.cityCountry),
            esc(l.phone),
            esc(l.invitedBy),
            esc(l.sourceHost),
          ].join(','),
        ),
      ];
      const blob = new Blob(['﻿' + rows.join('\n')], {
        type: 'text/csv;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `oportunidad-respuestas-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exportadas ${all.data.length} respuestas`);
    } catch {
      toast.error('No se pudo exportar');
    } finally {
      setExporting(false);
    }
  }

  const maxDay = Math.max(1, ...(stats?.byDay.map((d) => d.count) ?? [1]));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-2 flex items-center gap-3">
            <ClipboardDocumentListIcon className="h-9 w-9" />
            <h1 className="text-3xl font-bold sm:text-4xl">Formularios</h1>
          </div>
          <p className="text-base text-white/80 sm:text-lg">
            Respuestas del formulario público “Oportunidad de Negocio”
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Métricas + mini gráfica de 14 días */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Total de respuestas</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats?.total ?? '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Hoy</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats?.today ?? '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Últimos 7 días</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats?.last7Days ?? '—'}
              </p>
            </CardContent>
          </Card>
        </div>

        {stats && stats.byDay.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <p className="mb-3 text-sm font-semibold text-gray-900">
                Respuestas por día (últimos 14 días)
              </p>
              <div className="flex h-24 items-end gap-1.5">
                {stats.byDay.map((d) => (
                  <div
                    key={d.day}
                    className="group relative flex-1"
                    title={`${d.day}: ${d.count}`}
                  >
                    <div
                      className="w-full rounded-t bg-[#3E667D]/80 transition-colors group-hover:bg-[#3E667D]"
                      style={{
                        height: `${Math.max(4, (d.count / maxDay) * 88)}px`,
                      }}
                    />
                    <p className="mt-1 text-center text-[9px] text-muted-foreground">
                      {d.day.slice(8)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filtros */}
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 p-5">
            <div className="min-w-56 flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">
                Buscar (nombre, ciudad, teléfono, invitado por)
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                  placeholder="Ej. Guadalajara, 331234…, Redes Sociales"
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Desde</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Hasta</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Button onClick={applyFilters}>Buscar</Button>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exporting || !leads || leads.total === 0}
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              {exporting ? 'Exportando…' : 'Exportar CSV'}
            </Button>
          </CardContent>
        </Card>

        {/* Tabla de respuestas */}
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">
                Respuestas{' '}
                <span className="font-normal text-muted-foreground">
                  ({leads?.total ?? 0})
                </span>
              </p>
              {leads && leads.totalPages > 1 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </Button>
                  <span>
                    {page} / {leads.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= leads.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </div>

            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : isError ? (
              <p className="py-10 text-center text-sm font-medium text-red-600">
                {isForbidden
                  ? 'Tu rol no tiene acceso a las respuestas de formularios. Pide a Sistemas que lo habilite.'
                  : 'No se pudieron cargar las respuestas. Recarga la página o revisa tu conexión.'}
              </p>
            ) : !leads || leads.data.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Sin respuestas con estos filtros. Comparte el formulario para
                empezar a recibirlas.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Nombre completo</TableHead>
                      <TableHead>Ciudad y país</TableHead>
                      <TableHead>Teléfono / WhatsApp</TableHead>
                      <TableHead>Invitado por</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.data.map((l) => {
                      const wa = waDigits(l.phone);
                      const socialMedia = /redes\s+sociales/i.test(
                        l.invitedBy ?? '',
                      );
                      return (
                        <TableRow key={l.id}>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {fmtDateTime(l.createdAt)}
                          </TableCell>
                          <TableCell className="font-medium text-gray-900">
                            {l.fullName}
                          </TableCell>
                          <TableCell className="text-sm">
                            {l.cityCountry || '—'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {l.phone ? (
                              wa ? (
                                <a
                                  href={`https://wa.me/${wa}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline"
                                  title="Abrir WhatsApp"
                                >
                                  <LinkIcon className="h-3.5 w-3.5" />
                                  {l.phone}
                                </a>
                              ) : (
                                l.phone
                              )
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {socialMedia ? (
                              <Badge className="bg-sky-100 text-sky-700">
                                Redes Sociales
                              </Badge>
                            ) : (
                              l.invitedBy || '—'
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
