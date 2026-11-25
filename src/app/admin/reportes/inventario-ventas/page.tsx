'use client';

// Reportes › Inventario y Ventas — pedido de la jefatura de Operaciones México
// (24-nov-2026): por producto, "cuánto entró en almacén, inventario inicial en
// almacén y en tiendas, ventas del mes e inventarios al cierre en almacén y
// sucursales… de los top 15 más vendidos… todo esto en piezas".
//
// Los números los calcula el servidor (GET /reports/inventory-flow) con el
// periodo de comisiones que se elija; aquí solo se muestran. Lo ven quienes ya
// ven Piezas por Producto (reports:read o reports:product_sales). Es de toda la
// operación: una sesión acotada a sus sucursales no lo consulta.

import { Fragment, Suspense, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { PermissionGuard } from '@/components/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useInventoryFlow } from '@/hooks/useReports';
import { reportsService } from '@/services/reports.service';
import {
  branchListLabel,
  closingTitle,
  filterProducts,
  INVENTORY_FLOW_DEFAULT_TOP,
  INVENTORY_FLOW_GROUP_LABEL,
  INVENTORY_FLOW_NOTES,
  INVENTORY_FLOW_TOPS,
  INVENTORY_FLOW_ZONES,
  inventoryFlowErrorMessage,
  inventoryFlowFilename,
  openingTitle,
  periodLabel,
  periodStateLabel,
  pieces,
  shortDate,
  signedPieces,
} from '@/lib/reports/inventory-flow';
import type {
  InventoryFlowCurrency,
  InventoryFlowProductRow,
  InventoryFlowResponse,
} from '@/types/reports';

const TH = 'px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap';
// Los títulos numéricos se parten en dos renglones para que las 12 columnas quepan sin desplazar.
const TH_NUM =
  'h-auto w-[5.5rem] px-2.5 py-2 text-right align-bottom text-xs font-semibold uppercase leading-tight tracking-wide text-muted-foreground whitespace-normal';
const TD_NUM = 'px-2.5 py-2.5 text-right text-sm tabular-nums whitespace-nowrap';
// Encabezados fijos (Diego, 25-nov-2026): el contenedor de cada tabla es el que se desplaza (tiene alto
// máximo) y cada celda del encabezado se queda pegada arriba, con fondo sólido para que no se
// transparente lo que pasa por debajo. La tabla principal tiene dos renglones de encabezado: el de
// grupos mide 2.25rem exactos y el de columnas se pega justo debajo.
const STICKY_LINE = 'shadow-[inset_0_-1px_0_0_var(--border)]';
const TH_GROUP = `${TH} sticky top-0 z-20 h-9 py-0 bg-slate-100 ${STICKY_LINE}`;
const TH_HEAD = `${TH} sticky top-9 z-20 bg-slate-100 ${STICKY_LINE}`;
const TH_HEAD_NUM = `${TH_NUM} sticky top-9 z-20 bg-slate-100 ${STICKY_LINE}`;
const TH_DETAIL = `${TH} sticky top-0 z-10 bg-slate-50 ${STICKY_LINE}`;
const TH_DETAIL_NUM = `${TH_NUM} sticky top-0 z-10 bg-slate-50 ${STICKY_LINE}`;
// El componente Table envuelve la tabla en un contenedor con desplazamiento horizontal propio; se le
// quita para que el desplazamiento (y lo fijo del encabezado) sea el del contenedor de aquí.
const SCROLL_BOX = '[&_[data-slot=table-container]]:overflow-visible overflow-auto';
/** Columnas de la tabla principal (para el renglón del desglose). */
const COLUMNS = 16;

export default function InventarioVentasPage() {
  return (
    <PermissionGuard permissions={['reports:read', 'reports:product_sales']}>
      <Suspense fallback={<InventarioVentasSkeleton />}>
        <InventarioVentasContent />
      </Suspense>
    </PermissionGuard>
  );
}

function InventarioVentasSkeleton() {
  return (
    <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function InventarioVentasContent() {
  // Sin periodo elegido el servidor abre el que está en curso.
  const [periodId, setPeriodId] = useState<string | undefined>(undefined);
  const [currency, setCurrency] = useState<InventoryFlowCurrency>('MXN');
  const [top, setTop] = useState<number>(INVENTORY_FLOW_DEFAULT_TOP);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [makingPdf, setMakingPdf] = useState(false);

  const { data, isLoading, isFetching, error, refetch } = useInventoryFlow({ periodId, currency, top });

  const rows = useMemo(() => filterProducts(data?.rows ?? [], search), [data, search]);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleDownload = async () => {
    if (!data) return;
    setDownloading(true);
    try {
      await reportsService.downloadInventoryFlowXlsx(
        { periodId: data.period.id, currency: data.currency, top: data.top },
        inventoryFlowFilename(data),
      );
    } catch {
      toast.error('No se pudo descargar el Excel');
    } finally {
      setDownloading(false);
    }
  };

  // Informe membretado de lo que se ve en la tabla (zona, periodo y productos filtrados). Se arma en
  // el navegador; jsPDF se carga hasta que se pide.
  const handlePdf = async () => {
    if (!data || rows.length === 0) return;
    setMakingPdf(true);
    try {
      const { downloadInventoryFlowPdf } = await import('@/lib/reports/inventory-flow-pdf');
      await downloadInventoryFlowPdf(data, rows);
    } catch {
      toast.error('No se pudo generar el informe PDF');
    } finally {
      setMakingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-2 flex items-center gap-3">
            <ClipboardDocumentListIcon className="h-9 w-9" />
            <h1 className="text-3xl font-bold sm:text-4xl">Inventario y Ventas</h1>
          </div>
          <p className="text-base text-white/80 sm:text-lg">
            De los productos más vendidos del periodo: con cuánto empezó el almacén y las tiendas, cuánto entró
            a almacén, cuánto se vendió y cuánto queda. Todo en piezas.
          </p>
        </div>
      </div>

      <div className="space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Filtros */}
        <Card className="py-0">
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
              <div className="w-full lg:w-96">
                <Label htmlFor="inventory-flow-period" className="mb-1.5 block text-xs text-muted-foreground">
                  Periodo
                </Label>
                <Select
                  value={data?.period.id ?? periodId ?? ''}
                  onValueChange={(v) => {
                    setPeriodId(v);
                    setOpen(new Set());
                  }}
                  disabled={!data || data.periods.length === 0}
                >
                  <SelectTrigger id="inventory-flow-period" className="w-full">
                    <SelectValue placeholder="Periodo en curso" />
                  </SelectTrigger>
                  <SelectContent>
                    {(data?.periods ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {periodLabel(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <span className="mb-1.5 block text-xs text-muted-foreground">Zona</span>
                <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1" role="group" aria-label="Zona">
                  {INVENTORY_FLOW_ZONES.map((z) => (
                    <Button
                      key={z.key}
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-pressed={currency === z.key}
                      onClick={() => {
                        setCurrency(z.key);
                        setOpen(new Set());
                      }}
                      className={
                        currency === z.key
                          ? 'bg-background text-primary shadow-sm hover:bg-background'
                          : 'text-muted-foreground'
                      }
                    >
                      {z.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="w-full sm:w-40">
                <Label htmlFor="inventory-flow-top" className="mb-1.5 block text-xs text-muted-foreground">
                  Productos
                </Label>
                <Select value={String(top)} onValueChange={(v) => setTop(Number(v))}>
                  <SelectTrigger id="inventory-flow-top" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVENTORY_FLOW_TOPS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        Top {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 lg:ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  title="Actualizar"
                  aria-label="Actualizar"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePdf}
                  disabled={!data || rows.length === 0 || makingPdf}
                  title="Informe membretado de los productos que se ven en la tabla, con lo que debe haber en cada sucursal para el conteo"
                >
                  <DocumentTextIcon className="h-4 w-4" />
                  {makingPdf ? 'Generando…' : 'Informe PDF'}
                </Button>
                <Button
                  type="button"
                  onClick={handleDownload}
                  disabled={!data || data.rows.length === 0 || downloading}
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  {downloading ? 'Descargando…' : 'Excel'}
                </Button>
              </div>
            </div>

            {data && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{data.period.name}</span> ·{' '}
                {shortDate(data.period.startDate)} a {shortDate(data.period.endDate)} · {periodStateLabel(data)}
              </p>
            )}
          </CardContent>
        </Card>

        {error && !isFetching && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {inventoryFlowErrorMessage(error)}
          </div>
        )}

        {isLoading && (
          <div className="space-y-4" aria-busy="true" aria-label="Cargando el reporte">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        )}

        {data && (
          <>
            <Totals report={data} />

            <Card className="gap-0 overflow-hidden py-0">
              <CardContent className="p-0">
                <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative sm:w-96">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Filtrar por clave o nombre"
                      className="pl-9"
                      aria-label="Filtrar por clave o nombre"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {rows.length === data.rows.length
                      ? `${data.rows.length} producto${data.rows.length === 1 ? '' : 's'} · ${data.region}`
                      : `${rows.length} de ${data.rows.length}`}
                  </p>
                </div>

                {data.rows.length === 0 ? (
                  <p className="p-10 text-center text-sm text-muted-foreground">
                    No hubo ventas con salida de inventario en {data.region} durante {data.period.name}.
                  </p>
                ) : rows.length === 0 ? (
                  <p className="p-10 text-center text-sm text-muted-foreground">
                    Ningún producto del reporte coincide con “{search}”.
                  </p>
                ) : (
                  <div className={`max-h-[calc(100vh-5rem)] ${SCROLL_BOX} ${isFetching ? 'opacity-60' : ''}`}>
                    <Table>
                      <TableHeader className="[&_tr]:border-b-0">
                        <TableRow className="bg-slate-100 hover:bg-slate-100">
                          <TableHead className={TH_GROUP} colSpan={4} />
                          <TableHead className={`${TH_GROUP} border-l text-center`} colSpan={4}>
                            {openingTitle(data)}
                          </TableHead>
                          <TableHead className={`${TH_GROUP} border-l text-center`} colSpan={3}>
                            Durante el periodo
                          </TableHead>
                          <TableHead className={`${TH_GROUP} border-l text-center`} colSpan={4}>
                            {closingTitle(data)}
                          </TableHead>
                          <TableHead className={`${TH_GROUP} border-l`} />
                        </TableRow>
                        <TableRow className="bg-slate-100 hover:bg-slate-100">
                          <TableHead className={`${TH_HEAD} w-8`}>
                            <span className="sr-only">Ver sucursales</span>
                          </TableHead>
                          <TableHead className={TH_HEAD}>#</TableHead>
                          <TableHead className={TH_HEAD}>Clave</TableHead>
                          <TableHead className={TH_HEAD}>Producto</TableHead>
                          <TableHead className={`${TH_HEAD_NUM} border-l`}>Almacén general</TableHead>
                          <TableHead className={TH_HEAD_NUM}>Otros almacenes</TableHead>
                          <TableHead className={TH_HEAD_NUM}>Tiendas</TableHead>
                          <TableHead className={TH_HEAD_NUM}>En camino</TableHead>
                          <TableHead className={`${TH_HEAD_NUM} border-l`}>Entró a almacén</TableHead>
                          <TableHead className={TH_HEAD_NUM}>Ventas</TableHead>
                          <TableHead className={TH_HEAD_NUM}>Otros mov.</TableHead>
                          <TableHead className={`${TH_HEAD_NUM} border-l`}>Almacén general</TableHead>
                          <TableHead className={TH_HEAD_NUM}>Otros almacenes</TableHead>
                          <TableHead className={TH_HEAD_NUM}>Tiendas</TableHead>
                          <TableHead className={TH_HEAD_NUM}>En camino</TableHead>
                          <TableHead className={`${TH_HEAD_NUM} border-l`}>Total al cierre</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => (
                          <ProductRows
                            key={row.productId}
                            row={row}
                            report={data}
                            isOpen={open.has(row.productId)}
                            onToggle={() => toggle(row.productId)}
                          />
                        ))}
                        {rows.length === data.rows.length && data.rows.length > 1 && (
                          <TableRow className="bg-muted/40 font-semibold hover:bg-muted/40">
                            <TableCell className="px-3 py-3" colSpan={4}>
                              Total de los {data.totals.products} productos
                            </TableCell>
                            <TableCell className={`${TD_NUM} border-l`}>{pieces(data.totals.opening.general)}</TableCell>
                            <TableCell className={TD_NUM}>{pieces(data.totals.opening.warehouses)}</TableCell>
                            <TableCell className={TD_NUM}>{pieces(data.totals.opening.stores)}</TableCell>
                            <TableCell className={TD_NUM}>{pieces(data.totals.opening.transit)}</TableCell>
                            <TableCell className={`${TD_NUM} border-l`}>{pieces(data.totals.entries)}</TableCell>
                            <TableCell className={TD_NUM}>{pieces(data.totals.sales)}</TableCell>
                            <TableCell className={TD_NUM}>{signedPieces(data.totals.other)}</TableCell>
                            <TableCell className={`${TD_NUM} border-l`}>{pieces(data.totals.closing.general)}</TableCell>
                            <TableCell className={TD_NUM}>{pieces(data.totals.closing.warehouses)}</TableCell>
                            <TableCell className={TD_NUM}>{pieces(data.totals.closing.stores)}</TableCell>
                            <TableCell className={TD_NUM}>{pieces(data.totals.closing.transit)}</TableCell>
                            <TableCell className={`${TD_NUM} border-l`}>{pieces(data.totals.closing.total)}</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <HowToRead report={data} />
          </>
        )}
      </div>
    </div>
  );
}

function Totals({ report }: { report: InventoryFlowResponse }) {
  const t = report.totals;
  const cards = [
    {
      label: `Inicial en almacén general · ${shortDate(report.period.startDate)}`,
      value: pieces(t.opening.general),
      hint: `Tiendas: ${pieces(t.opening.stores)}`,
    },
    { label: 'Entró a almacén', value: pieces(t.entries), hint: 'Producción y compras' },
    { label: 'Ventas del periodo', value: pieces(t.sales), hint: `${t.products} producto${t.products === 1 ? '' : 's'}` },
    {
      label: report.inProgress ? 'Hoy en almacén general' : 'Cierre en almacén general',
      value: pieces(t.closing.general),
      hint: `Tiendas: ${pieces(t.closing.stores)}`,
    },
    { label: 'En camino a sucursales', value: pieces(t.closing.transit), hint: 'Enviado y sin recibir' },
  ];
  return (
    <section aria-label="Totales de los productos del reporte" className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Suma de los {t.products} producto{t.products === 1 ? '' : 's'} del reporte, en piezas
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label} className="py-0">
            <CardContent className="p-4">
              <p className="text-2xl font-bold tabular-nums text-foreground">{c.value}</p>
              <p className="text-xs font-medium text-foreground">{c.label}</p>
              <p className="text-xs text-muted-foreground">{c.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function ProductRows({
  row,
  report,
  isOpen,
  onToggle,
}: {
  row: InventoryFlowProductRow;
  report: InventoryFlowResponse;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const detailId = `inventory-flow-detail-${row.productId}`;
  return (
    <Fragment>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell className="px-2.5 py-2.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-expanded={isOpen}
            aria-controls={detailId}
            aria-label={`${isOpen ? 'Ocultar' : 'Ver'} sucursales de ${row.code}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {isOpen ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
          </Button>
        </TableCell>
        <TableCell className="px-2.5 py-2.5 text-sm text-muted-foreground tabular-nums">{row.rank}</TableCell>
        <TableCell className="px-2.5 py-2.5 font-mono text-sm font-medium whitespace-nowrap">{row.code}</TableCell>
        <TableCell className="max-w-[15rem] truncate px-2.5 py-2.5 text-sm" title={row.name}>
          {row.name}
        </TableCell>
        <TableCell className={`${TD_NUM} border-l`}>{pieces(row.opening.general)}</TableCell>
        <TableCell className={`${TD_NUM} text-muted-foreground`}>{pieces(row.opening.warehouses)}</TableCell>
        <TableCell className={TD_NUM}>{pieces(row.opening.stores)}</TableCell>
        <TableCell className={`${TD_NUM} text-muted-foreground`}>{pieces(row.opening.transit)}</TableCell>
        <TableCell className={`${TD_NUM} border-l`}>{pieces(row.entries)}</TableCell>
        <TableCell className={`${TD_NUM} font-semibold`}>{pieces(row.sales)}</TableCell>
        <TableCell className={`${TD_NUM} text-muted-foreground`}>{signedPieces(row.other)}</TableCell>
        <TableCell className={`${TD_NUM} border-l font-medium`}>{pieces(row.closing.general)}</TableCell>
        <TableCell className={`${TD_NUM} text-muted-foreground`}>{pieces(row.closing.warehouses)}</TableCell>
        <TableCell className={`${TD_NUM} font-medium`}>{pieces(row.closing.stores)}</TableCell>
        <TableCell className={`${TD_NUM} text-muted-foreground`}>{pieces(row.closing.transit)}</TableCell>
        <TableCell className={`${TD_NUM} border-l font-semibold`}>{pieces(row.closing.total)}</TableCell>
      </TableRow>
      {isOpen && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={COLUMNS} className="p-0" id={detailId}>
            <BranchDetail row={row} report={report} />
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
}

function BranchDetail({ row, report }: { row: InventoryFlowProductRow; report: InventoryFlowResponse }) {
  if (row.branches.length === 0) {
    return <p className="px-6 py-4 text-sm text-muted-foreground">Sin existencias ni movimientos por sucursal.</p>;
  }
  return (
    <div className="max-w-5xl px-4 py-4 sm:px-6">
      <p className="mb-2 text-sm font-medium">
        {row.code} · {row.name}: sucursal por sucursal
        {row.saleReturns > 0 && (
          <span className="ml-2 font-normal text-muted-foreground">
            (salieron {pieces(row.salesGross)} por venta y regresaron {pieces(row.saleReturns)} por cancelación)
          </span>
        )}
      </p>
      <div className={`max-h-[28rem] ${SCROLL_BOX} rounded-md border bg-background`}>
        <Table>
          <TableHeader className="[&_tr]:border-b-0">
            <TableRow className="hover:bg-transparent">
              <TableHead className={TH_DETAIL}>Tipo</TableHead>
              <TableHead className={TH_DETAIL}>Sucursal</TableHead>
              <TableHead className={TH_DETAIL_NUM}>Inicial</TableHead>
              <TableHead className={TH_DETAIL_NUM}>Entradas</TableHead>
              <TableHead className={TH_DETAIL_NUM}>Traspasos recibidos</TableHead>
              <TableHead className={TH_DETAIL_NUM}>Traspasos enviados</TableHead>
              <TableHead className={TH_DETAIL_NUM}>Ventas</TableHead>
              <TableHead className={TH_DETAIL_NUM}>Otros mov.</TableHead>
              <TableHead className={TH_DETAIL_NUM}>{report.inProgress ? 'Actual' : 'Cierre'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {row.branches.map((b) => (
              <TableRow key={b.branchId}>
                <TableCell className="px-3 py-2">
                  <Badge variant={b.group === 'store' ? 'secondary' : b.group === 'general' ? 'default' : 'outline'}>
                    {INVENTORY_FLOW_GROUP_LABEL[b.group]}
                  </Badge>
                </TableCell>
                <TableCell className="px-3 py-2 text-sm whitespace-nowrap">
                  <span className="font-mono text-xs text-muted-foreground">{b.code}</span> {b.name}
                </TableCell>
                <TableCell className={TD_NUM}>{pieces(b.opening)}</TableCell>
                <TableCell className={TD_NUM}>{pieces(b.entries)}</TableCell>
                <TableCell className={TD_NUM}>{pieces(b.received)}</TableCell>
                <TableCell className={TD_NUM}>{pieces(b.sent)}</TableCell>
                <TableCell className={`${TD_NUM} font-medium`}>{pieces(b.sales)}</TableCell>
                <TableCell className={`${TD_NUM} text-muted-foreground`}>{signedPieces(b.other)}</TableCell>
                <TableCell className={`${TD_NUM} font-semibold`}>{pieces(b.closing)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        En camino: {pieces(row.opening.transit)} al inicio y {pieces(row.closing.transit)}{' '}
        {report.inProgress ? 'ahora' : 'al cierre'}. Cada sucursal cuadra: inicial + entradas + recibidos −
        enviados − ventas + otros = {report.inProgress ? 'actual' : 'cierre'}.
      </p>
    </div>
  );
}

function HowToRead({ report }: { report: InventoryFlowResponse }) {
  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4 sm:p-6">
        <h2 className="text-base font-semibold">Cómo leer el reporte</h2>
        <dl className="grid gap-x-8 gap-y-3 text-sm lg:grid-cols-2">
          {INVENTORY_FLOW_NOTES.map((n) => (
            <div key={n.term}>
              <dt className="font-medium">{n.term}</dt>
              <dd className="text-muted-foreground">{n.text}</dd>
            </div>
          ))}
        </dl>
        <dl className="space-y-2 border-t pt-4 text-sm">
          <div>
            <dt className="font-medium">Almacén general</dt>
            <dd className="text-muted-foreground">{branchListLabel(report.groups.general)}</dd>
          </div>
          <div>
            <dt className="font-medium">Otros almacenes</dt>
            <dd className="text-muted-foreground">{branchListLabel(report.groups.warehouse)}</dd>
          </div>
          <div>
            <dt className="font-medium">Tiendas ({report.groups.store.length})</dt>
            <dd className="text-muted-foreground">
              Todas las sucursales y CEDEAS con punto de venta. Abre un producto para verlas una por una.
            </dd>
          </div>
          {report.excluded.length > 0 && (
            <div>
              <dt className="font-medium">No se cuentan</dt>
              <dd className="text-muted-foreground">{branchListLabel(report.excluded)}</dd>
            </div>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
