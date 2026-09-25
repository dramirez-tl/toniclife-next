'use client';

// SegmentsTable - "Por grupo de distribuidores" (bloques v1 `segmentos` y
// `total`): con campaña vs control, con la base histórica como marca.

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { n, pct, ratio } from '@/lib/whatsapp-campaign/format';
import type { CampaignDashboard, CampaignGroupBlock } from '@/types/whatsappCampaign';
import { CompareBar } from './CompareBar';
import { EmptyNote, Panel } from './Panel';

function Cells({ s }: { s: CampaignGroupBlock }) {
  return (
    <>
      <TableCell className="text-right">{n(s.tratados)}</TableCell>
      <TableCell className="text-right">{n(s.control)}</TableCell>
      <TableCell className="text-right">{pct(ratio(s.leyeron, s.tratados))}</TableCell>
      <TableCell>
        <div className="grid min-w-[140px] gap-1">
          <CompareBar size="sm" tone="trat" value={s.pct_califican_trat} base={s.base_historica_califica} label="Con campaña" />
          <CompareBar size="sm" tone="ctrl" value={s.pct_califican_ctrl} base={s.base_historica_califica} label="Control" />
        </div>
      </TableCell>
      <TableCell className="text-right">
        <strong>{pct(s.pct_califican_trat)}</strong> / {pct(s.pct_califican_ctrl)}
      </TableCell>
      <TableCell className="text-right">{pct(s.base_historica_califica)}</TableCell>
      <TableCell className="text-right">
        {pct(s.pct_compraron_trat)} / {pct(s.pct_compraron_ctrl)}
      </TableCell>
    </>
  );
}

export function SegmentsTable({ data }: { data: CampaignDashboard }) {
  const umbral = n(data.periodo.umbral);
  return (
    <Panel
      id="t-seg"
      title="Por grupo de distribuidores"
      aside={`Ya llegaron a ${umbral} = de los que estaban debajo al primer aviso`}
    >
      {data.segmentos.length === 0 ? (
        <EmptyNote>Sin segmentos todavía.</EmptyNote>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Grupo</TableHead>
                <TableHead className="text-right">Con campaña</TableHead>
                <TableHead className="text-right">Control</TableHead>
                <TableHead className="text-right">Leyeron</TableHead>
                <TableHead>Ya llegaron a {umbral}</TableHead>
                <TableHead className="text-right">Campaña / control</TableHead>
                <TableHead className="text-right">Sin campaña (hist.)</TableHead>
                <TableHead className="text-right">Compraron (camp. / ctrl)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="tabular-nums">
              {data.segmentos.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="whitespace-normal">
                    {s.nombre}
                    {s.id === 'LID' && (
                      <div className="text-xs text-muted-foreground">
                        Casi todos ya calificados; su efecto está en sus frontales
                      </div>
                    )}
                  </TableCell>
                  <Cells s={s} />
                </TableRow>
              ))}
              {data.total && (
                <TableRow className="bg-muted/50 font-semibold hover:bg-muted/50">
                  <TableCell>Todos (sin líderes)</TableCell>
                  <Cells s={data.total} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </Panel>
  );
}
