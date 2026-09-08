'use client';

// FormResponses - Respuestas de UN formulario público de marketing,
// parametrizado por slug ('oportunidad' | 'induccion'): métricas, gráfica de
// 14 días, tarjeta del enlace (reunión / taller), filtros, tabla y export CSV.
// Datos: /marketing/leads (+/stats) y /marketing/forms/config?formSlug=.

import { useEffect, useMemo, useState } from 'react';
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
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import {
  useMarketingLeads,
  useMarketingLeadStats,
  useMarketingFormConfig,
  useUpdateMarketingFormConfig,
} from '@/hooks/useMarketingLeads';
import {
  marketingService,
  type MarketingFormSlug,
} from '@/services/marketing.service';
import InduccionCampaignPanel from './InduccionCampaignPanel';

/** Textos que cambian según el formulario. */
interface FormCopy {
  /** Nombre corto para toasts y encabezados. */
  label: string;
  meetingTitle: string;
  meetingHelp: string;
  meetingSavedToast: string;
  searchLabel: string;
  searchPlaceholder: string;
  emptyText: string;
  csvPrefix: string;
  /** Columna "Distribuidor" (asistente del taller; solo inducción, mig 128/129). */
  showMember: boolean;
}

const FORM_COPY: Record<MarketingFormSlug, FormCopy> = {
  oportunidad: {
    label: 'Oportunidad de Negocio',
    meetingTitle: 'Enlace de la reunión / transmisión',
    meetingHelp:
      'Los afiliados que verifiquen su número de ID en el formulario son ' +
      'enviados directo a este enlace. Déjalo vacío para desactivarlo ' +
      '(verán un aviso de “se publicará pronto”).',
    meetingSavedToast: 'Enlace de la reunión guardado',
    searchLabel: 'Buscar (nombre, ciudad, teléfono, invitado por)',
    searchPlaceholder: 'Ej. Guadalajara, 331234…, Redes Sociales',
    emptyText:
      'Sin respuestas con estos filtros. Comparte el formulario para empezar a recibirlas.',
    csvPrefix: 'oportunidad-respuestas',
    showMember: false,
  },
  induccion: {
    label: 'Taller de Inducción',
    meetingTitle: 'Enlace del Taller de Inducción',
    meetingHelp:
      'Los asistentes son enviados a este enlace (Zoom u otra plataforma) al ' +
      'terminar su registro. Déjalo vacío para desactivarlo (verán un aviso ' +
      'de “se publicará pronto”).',
    meetingSavedToast: 'Enlace del taller guardado',
    searchLabel: 'Buscar (nombre, ciudad, teléfono, invitado por, distribuidor)',
    searchPlaceholder: 'Ej. Monterrey, 811234…, 12345 (distribuidor), Redes Sociales',
    emptyText:
      'Sin respuestas con estos filtros. Comparte la invitación al taller para empezar a recibirlas.',
    csvPrefix: 'induccion-respuestas',
    showMember: true,
  },
};

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

interface FormResponsesProps {
  slug: MarketingFormSlug;
}

export default function FormResponses({ slug }: FormResponsesProps) {
  const copy = FORM_COPY[slug];

  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const params = useMemo(
    () => ({
      formSlug: slug,
      search: appliedSearch || undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      page,
      limit: 20,
    }),
    [slug, appliedSearch, fromDate, toDate, page],
  );
  const { data: leads, isLoading, isError, error } = useMarketingLeads(params);
  const { data: stats } = useMarketingLeadStats(slug);

  // Enlace al que se manda a quien completa el formulario (reunión / taller).
  const { data: formConfig } = useMarketingFormConfig(slug);
  const updateConfig = useUpdateMarketingFormConfig();
  const [meetingUrl, setMeetingUrl] = useState('');
  useEffect(() => {
    if (formConfig) setMeetingUrl(formConfig.meetingUrl ?? '');
  }, [formConfig]);

  async function handleSaveMeetingUrl() {
    const url = meetingUrl.trim();
    if (url && !/^https?:\/\/\S+$/.test(url)) {
      toast.error('El enlace debe iniciar con http:// o https://');
      return;
    }
    try {
      await updateConfig.mutateAsync({ formSlug: slug, meetingUrl: url });
      toast.success(url ? copy.meetingSavedToast : 'Enlace eliminado');
    } catch {
      toast.error('No se pudo guardar el enlace');
    }
  }

  // 403 = el rol no está autorizado para leer respuestas (la sección
  // Comercial del sidebar se gatea por permisos, no por este rol).
  const errorStatus = (error as { response?: { status?: number } } | null)
    ?.response?.status;
  const isForbidden = isError && errorStatus === 403;
  // 503 = el API avisa que el formulario aún no está habilitado (p. ej. la
  // migración 128/129 del Taller de Inducción sin aplicar): se muestra su mensaje.
  const unavailableMessage =
    isError && errorStatus === 503
      ? (error as { response?: { data?: { message?: unknown } } } | null)
          ?.response?.data?.message
      : undefined;

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
      // de un formulario PÚBLICO - una celda que empiece con = + - @ (o
      // tab/CR) se ejecutaría como fórmula al abrir el CSV en Excel. Se
      // antepone apóstrofo para que Excel la trate como texto.
      const esc = (v: string | undefined) => {
        let s = (v ?? '').replace(/[\r\n\t]/g, ' ');
        if (/^[=+\-@]/.test(s)) s = `'${s}`;
        return `"${s.replace(/"/g, '""')}"`;
      };
      const header = [
        'Fecha (CDMX)',
        'Nombre completo',
        'Ciudad y país',
        'Teléfono/WhatsApp',
        'Invitado por',
        ...(copy.showMember
          ? ['Distribuidor (número)', 'Distribuidor (nombre)']
          : []),
        'Origen',
      ];
      const rows = [
        header.join(','),
        ...all.data.map((l) =>
          [
            esc(fmtDateTime(l.createdAt)),
            esc(l.fullName),
            esc(l.cityCountry),
            esc(l.phone),
            esc(l.invitedBy),
            ...(copy.showMember ? [esc(l.memberNumber), esc(l.memberName)] : []),
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
      a.download = `${copy.csvPrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exportadas ${all.data.length} respuestas de ${copy.label}`);
    } catch {
      toast.error('No se pudo exportar');
    } finally {
      setExporting(false);
    }
  }

  const maxDay = Math.max(1, ...(stats?.byDay.map((d) => d.count) ?? [1]));

  return (
    <div className="space-y-6">
      {/* Campaña de WhatsApp del Taller de Inducción (solo induccion), arriba
          de las métricas de respuestas. */}
      {slug === 'induccion' && <InduccionCampaignPanel />}

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

      {/* Enlace de la reunión / taller */}
      <Card>
        <CardContent className="p-5">
          <div className="mb-1 flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-[#3E667D]" />
            <p className="text-sm font-semibold text-gray-900">
              {copy.meetingTitle}
            </p>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">{copy.meetingHelp}</p>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://us02web.zoom.us/j/…"
              className="min-w-64 flex-1"
            />
            <Button
              onClick={handleSaveMeetingUrl}
              disabled={
                updateConfig.isPending ||
                meetingUrl.trim() === (formConfig?.meetingUrl ?? '')
              }
            >
              {updateConfig.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-5">
          <div className="min-w-56 flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">
              {copy.searchLabel}
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                placeholder={copy.searchPlaceholder}
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
                : typeof unavailableMessage === 'string' && unavailableMessage
                  ? unavailableMessage
                  : 'No se pudieron cargar las respuestas. Recarga la página o revisa tu conexión.'}
            </p>
          ) : !leads || leads.data.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {copy.emptyText}
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
                    {copy.showMember && <TableHead>Distribuidor</TableHead>}
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
                        {copy.showMember && (
                          <TableCell className="text-sm">
                            {l.memberNumber ? (
                              <span className="inline-flex flex-wrap items-baseline gap-x-2">
                                <span className="font-mono text-xs font-semibold text-gray-900">
                                  {l.memberNumber}
                                </span>
                                {l.memberName && (
                                  <span className="text-muted-foreground">
                                    {l.memberName}
                                  </span>
                                )}
                              </span>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                        )}
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
  );
}
