// components/commissions/CommissionTable.tsx
'use client';

import { Commission, CommissionType, CommissionStatus } from '@/types/commissions';
import {
  CalendarIcon,
  UserIcon,
  ArrowsRightLeftIcon,
  TrophyIcon,
  ShoppingBagIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { Fragment, useState } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

interface CommissionTableProps {
  commissions: Commission[];
  showTaxDetails?: boolean;
  currencyCode?: string;
}

const typeConfig: Record<CommissionType, { label: string; icon: typeof UserIcon; color: string }> = {
  mlm: {
    label: 'MLM',
    icon: ArrowsRightLeftIcon,
    color: 'text-blue-600 bg-blue-50',
  },
  cedea_bonus: {
    label: 'Generación',
    icon: TrophyIcon,
    color: 'text-green-600 bg-green-50',
  },
  auto_bonus: {
    label: 'Auto Bono',
    icon: ShoppingBagIcon,
    color: 'text-yellow-600 bg-yellow-50',
  },
  adjustment: {
    label: 'Ajuste',
    icon: AdjustmentsHorizontalIcon,
    color: 'text-purple-600 bg-purple-50',
  },
};

const statusConfig: Record<CommissionStatus, { label: string; color: string }> = {
  calculated: { label: 'Calculada', color: 'bg-gray-100 text-gray-700' },
  approved: { label: 'Aprobada', color: 'bg-blue-100 text-blue-700' },
  paid: { label: 'Pagada', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
};

export function CommissionTable({ commissions, showTaxDetails = false, currencyCode = 'MXN' }: CommissionTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const isUsd = currencyCode === 'USD';

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat(isUsd ? 'en-US' : 'es-MX', {
      style: 'currency',
      currency: currencyCode,
    }).format(num);
  };

  const CurrBadge = () => (
    <span className="inline-flex text-[9px] font-semibold px-1 py-0.5 rounded bg-gray-100 text-gray-400 ml-1">
      {currencyCode}
    </span>
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  if (commissions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No hay comisiones para mostrar
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="w-full">
        <TableHeader>
          <TableRow className="border-b border-gray-200 hover:bg-transparent">
            <TableHead className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
              Fecha
            </TableHead>
            <TableHead className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
              Tipo
            </TableHead>
            <TableHead className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
              Distribuidor
            </TableHead>
            <TableHead className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
              Subtotal
            </TableHead>
            {showTaxDetails && (
              <>
                <TableHead className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                  IVA
                </TableHead>
                <TableHead className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                  Ret. IVA
                </TableHead>
              </>
            )}
            <TableHead className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
              Total
            </TableHead>
            <TableHead className="text-center py-3 px-4 text-sm font-semibold text-gray-600">
              Estado
            </TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {commissions.map((commission) => {
            const type = typeConfig[commission.commissionType];
            const status = statusConfig[commission.status];
            const TypeIcon = type.icon;
            const isExpanded = expandedRow === commission.id;

            return (
              <Fragment key={commission.id}>
                <TableRow
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => toggleExpand(commission.id)}
                >
                  <TableCell className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {formatDate(commission.createdAt)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-4">
                    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium ${type.color}`}>
                      <TypeIcon className="h-3.5 w-3.5" />
                      <span>{type.label}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-4">
                    <div className="text-sm">
                      <p className="text-gray-900 font-medium">
                        {commission.customerName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {commission.periodCode}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-4 text-right">
                    <span className="text-sm text-gray-900">
                      {formatCurrency(commission.subtotalEarnings)}<CurrBadge />
                    </span>
                  </TableCell>
                  {showTaxDetails && (
                    <>
                      <TableCell className="py-4 px-4 text-right">
                        <span className="text-sm text-gray-600">
                          +{formatCurrency(commission.ivaAmount || '0')}<CurrBadge />
                        </span>
                      </TableCell>
                      <TableCell className="py-4 px-4 text-right">
                        <span className="text-sm text-red-600">
                          -{formatCurrency(commission.ivaWithholding || '0')}<CurrBadge />
                        </span>
                      </TableCell>
                    </>
                  )}
                  <TableCell className="py-4 px-4 text-right">
                    <span className="text-sm font-bold text-[#3E667D]">
                      {formatCurrency(commission.totalAmount)}<CurrBadge />
                    </span>
                  </TableCell>
                  <TableCell className="py-4 px-4 text-center">
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 px-2">
                    {isExpanded ? (
                      <ChevronUpIcon className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </TableCell>
                </TableRow>

                {/* Expanded details row */}
                {isExpanded && (
                  <TableRow key={`${commission.id}-details`} className="bg-gray-50 hover:bg-gray-50">
                    <TableCell colSpan={showTaxDetails ? 9 : 7} className="px-4 py-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs">ID Comision</p>
                          <p className="font-mono text-gray-900">{commission.id}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Subtotal Comisiones</p>
                          <p className="text-gray-900">{formatCurrency(commission.subtotalEarnings)}<CurrBadge /></p>
                        </div>
                        {commission.autoBonus && (
                          <div>
                            <p className="text-gray-500 text-xs">Auto Bono</p>
                            <p className="text-green-600">+{formatCurrency(commission.autoBonus)}<CurrBadge /></p>
                          </div>
                        )}
                        <div>
                          <p className="text-gray-500 text-xs">IVA</p>
                          <p className="text-green-600">+{formatCurrency(commission.ivaAmount || '0')}<CurrBadge /></p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">Ret. IVA</p>
                          <p className="text-red-600">-{formatCurrency(commission.ivaWithholding || '0')}<CurrBadge /></p>
                        </div>
                        {parseFloat(commission.isrAmount || '0') > 0 && (
                          <div>
                            <p className="text-gray-500 text-xs">ISR</p>
                            <p className="text-red-600">-{formatCurrency(commission.isrAmount || '0')}<CurrBadge /></p>
                          </div>
                        )}
                        {parseFloat(commission.resicoAmount || '0') > 0 && (
                          <div>
                            <p className="text-gray-500 text-xs">RESICO (1.25%)</p>
                            <p className="text-red-600">-{formatCurrency(commission.resicoAmount || '0')}<CurrBadge /></p>
                          </div>
                        )}
                        <div>
                          <p className="text-gray-500 text-xs">Total Neto</p>
                          <p className="font-bold text-[#3E667D]">{formatCurrency(commission.totalAmount)}<CurrBadge /></p>
                        </div>
                        {commission.approvedAt && (
                          <div>
                            <p className="text-gray-500 text-xs">Fecha de Aprobacion</p>
                            <p className="text-gray-900">{formatDate(commission.approvedAt)}</p>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="bg-gray-100 font-bold hover:bg-gray-100">
            <TableCell colSpan={showTaxDetails ? 6 : 4} className="py-4 px-4 text-right text-gray-700">
              Total:
            </TableCell>
            <TableCell className="py-4 px-4 text-right text-[#3E667D]">
              {formatCurrency(commissions.reduce((sum, c) => sum + parseFloat(c.totalAmount), 0))}<CurrBadge />
            </TableCell>
            <TableCell colSpan={2}></TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
