'use client';

// PayrollReceiverSheet — completar los datos del recibo de nómina de un
// distribuidor SIN salir de la pantalla (Tesorería, Diego, 27-nov-2026): panel
// lateral al 80 % del ancho con dos pestañas:
//   - "Datos del recibo": el formulario (PayrollReceiverPanel) y, si el pago ya
//     está registrado, timbrar desde ahí.
//   - "Régimen y documentos": la revisión de Validación de datos, tal cual, para
//     asignar el régimen de comisión a un patrocinador apartado.

import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PayrollReceiverPanel, type PayrollReceiverStampContext } from './PayrollReceiverPanel';
import { PaymentReadinessReview } from './readiness/PaymentReadinessReview';

export type { PayrollReceiverStampContext } from './PayrollReceiverPanel';

export type PayrollReceiverSheetTab = 'recibo' | 'regimen';

function PayrollReceiverSheetBody({
  customerId,
  initialTab,
  stamp,
  readOnly,
  onStamped,
}: {
  customerId: string;
  initialTab: PayrollReceiverSheetTab;
  stamp?: PayrollReceiverStampContext | null;
  readOnly?: boolean;
  onStamped: () => void;
}) {
  const [tab, setTab] = useState<PayrollReceiverSheetTab>(initialTab);
  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as PayrollReceiverSheetTab)} className="px-4 pb-6">
      <TabsList>
        <TabsTrigger value="recibo">Datos del recibo</TabsTrigger>
        <TabsTrigger value="regimen">Régimen y documentos</TabsTrigger>
      </TabsList>
      <TabsContent value="recibo" className="pt-3">
        <PayrollReceiverPanel customerId={customerId} stamp={stamp} readOnly={readOnly} onStamped={onStamped} />
      </TabsContent>
      <TabsContent value="regimen" className="pt-3">
        {/* La revisión de Validación de datos, tal cual: asignar el régimen de comisión, validar documentos y cuenta. */}
        {tab === 'regimen' && <PaymentReadinessReview customerId={customerId} />}
      </TabsContent>
    </Tabs>
  );
}

interface PayrollReceiverSheetProps {
  /** null = cerrado. */
  customerId: string | null;
  customerNumber?: string | null;
  customerName?: string | null;
  /** Pestaña con la que abre. */
  initialTab?: PayrollReceiverSheetTab;
  stamp?: PayrollReceiverStampContext | null;
  readOnly?: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Panel lateral al 80 % del ancho: datos del recibo y, en otra pestaña, régimen y documentos. */
export function PayrollReceiverSheet({
  customerId,
  customerNumber,
  customerName,
  initialTab = 'recibo',
  stamp,
  readOnly,
  onOpenChange,
}: PayrollReceiverSheetProps) {
  return (
    <Sheet open={!!customerId} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-none lg:w-[80vw]">
        <SheetHeader className="pb-2">
          <SheetTitle>Datos fiscales para timbrar</SheetTitle>
          <SheetDescription>
            {customerNumber ? <span className="font-semibold text-[#3E667D]">#{customerNumber}</span> : null}
            {customerNumber && customerName ? ' · ' : null}
            {customerName}
            <span className="block">Completa lo que falta y timbra sin salir de esta pantalla. Escape cierra.</span>
          </SheetDescription>
        </SheetHeader>
        {customerId && (
          // `key`: cada apertura (otro distribuidor u otra pestaña inicial) empieza de cero.
          <PayrollReceiverSheetBody
            key={`${customerId}:${initialTab}`}
            customerId={customerId}
            initialTab={initialTab}
            stamp={stamp}
            readOnly={readOnly}
            onStamped={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
