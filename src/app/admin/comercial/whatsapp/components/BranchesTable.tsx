'use client';

// BranchesTable - "Sucursales con más avisos" (top 10 por contactados).

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { n } from '@/lib/whatsapp-campaign/format';
import type { CampaignSucursal } from '@/types/whatsappCampaign';
import { EmptyNote, Panel } from './Panel';

export function BranchesTable({ data }: { data: CampaignSucursal[] }) {
  return (
    <Panel id="t-suc" title="Sucursales con más avisos" aside="Avance desde el primer aviso">
      {data.length === 0 ? (
        <EmptyNote>Sin datos.</EmptyNote>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sucursal</TableHead>
                <TableHead className="text-right">Avisados</TableHead>
                <TableHead className="text-right">Ya llegaron</TableHead>
                <TableHead className="text-right">Compraron</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="tabular-nums">
              {data.map((s) => (
                <TableRow key={s.nombre}>
                  <TableCell className="whitespace-normal">{s.nombre}</TableCell>
                  <TableCell className="text-right">{n(s.contactados)}</TableCell>
                  <TableCell className="text-right">{n(s.calificaron)}</TableCell>
                  <TableCell className="text-right">{n(s.compraron)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Panel>
  );
}
