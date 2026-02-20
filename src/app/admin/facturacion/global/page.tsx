// app/admin/facturacion/global/page.tsx - Factura Global
// Ref: TONIC_LIFE_2.0_MASTER.md - Sección 5.5 Facturación
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  GlobeAltIcon,
  ArrowLeftIcon,
  CalendarIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useCreateGlobalInvoice, useStampGlobalInvoice } from '@/hooks/useBilling';
import { PERIODICITIES, formatCurrency } from '@/types/billing';

const MONTHS = [
  { value: '01', name: 'Enero' },
  { value: '02', name: 'Febrero' },
  { value: '03', name: 'Marzo' },
  { value: '04', name: 'Abril' },
  { value: '05', name: 'Mayo' },
  { value: '06', name: 'Junio' },
  { value: '07', name: 'Julio' },
  { value: '08', name: 'Agosto' },
  { value: '09', name: 'Septiembre' },
  { value: '10', name: 'Octubre' },
  { value: '11', name: 'Noviembre' },
  { value: '12', name: 'Diciembre' },
];

export default function GlobalInvoicePage() {
  const router = useRouter();
  const createGlobalInvoice = useCreateGlobalInvoice();
  const stampGlobalInvoice = useStampGlobalInvoice();

  const currentDate = new Date();
  const [formData, setFormData] = useState({
    periodicity: '04', // Mensual por defecto
    month: String(currentDate.getMonth() + 1).padStart(2, '0'),
    year: String(currentDate.getFullYear()),
  });

  const [createdInvoice, setCreatedInvoice] = useState<{
    id: string;
    totalOrders: number;
    subtotal: string;
    taxAmount: string;
    total: string;
    status: string;
  } | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.periodicity) {
      newErrors.periodicity = 'Selecciona la periodicidad';
    }
    if (!formData.month) {
      newErrors.month = 'Selecciona el mes';
    }
    if (!formData.year) {
      newErrors.year = 'Ingresa el año';
    }

    // Validate year range
    const year = parseInt(formData.year);
    if (year < 2020 || year > currentDate.getFullYear()) {
      newErrors.year = `El año debe estar entre 2020 y ${currentDate.getFullYear()}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      const result = await createGlobalInvoice.mutateAsync({
        periodicity: formData.periodicity,
        month: formData.month,
        year: formData.year,
      });
      setCreatedInvoice({
        id: result.id,
        totalOrders: result.totalOrders,
        subtotal: result.subtotal,
        taxAmount: result.taxAmount,
        total: result.total,
        status: result.status,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleStamp = async () => {
    if (!createdInvoice) return;

    try {
      await stampGlobalInvoice.mutateAsync(createdInvoice.id);
      toast.success('Factura global timbrada correctamente');
      router.push('/admin/facturacion');
    } catch (error) {
      // Error handled by mutation
    }
  };

  const getPeriodicityLabel = () => {
    const periodicity = PERIODICITIES.find((p) => p.Value === formData.periodicity);
    const month = MONTHS.find((m) => m.value === formData.month);
    return `${periodicity?.Name || ''} - ${month?.name || ''} ${formData.year}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/facturacion"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <GlobeAltIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Factura Global</h1>
              </div>
              <p className="text-white/80 text-lg">
                Generar factura global para ventas al público en general
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Card */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <DocumentTextIcon className="h-6 w-6 text-blue-600 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Sobre la Factura Global</p>
                <p>
                  La factura global se emite para amparar las ventas realizadas a clientes
                  que no solicitaron factura individual. Se emite a nombre del{' '}
                  <strong>PUBLICO EN GENERAL</strong> con RFC genérico XAXX010101000.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {!createdInvoice ? (
          /* Form */
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-[#003B7A]" />
                Seleccionar Período
              </h2>

              <div className="grid md:grid-cols-3 gap-6">
                {/* Periodicity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Periodicidad *
                  </label>
                  <select
                    value={formData.periodicity}
                    onChange={(e) =>
                      setFormData({ ...formData, periodicity: e.target.value })
                    }
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent ${
                      errors.periodicity ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    {PERIODICITIES.map((p) => (
                      <option key={p.Value} value={p.Value}>
                        {p.Name}
                      </option>
                    ))}
                  </select>
                  {errors.periodicity && (
                    <p className="mt-1 text-sm text-red-500">{errors.periodicity}</p>
                  )}
                </div>

                {/* Month */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mes *
                  </label>
                  <select
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent ${
                      errors.month ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  {errors.month && (
                    <p className="mt-1 text-sm text-red-500">{errors.month}</p>
                  )}
                </div>

                {/* Year */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Año *
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    min="2020"
                    max={currentDate.getFullYear()}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#003B7A] focus:border-transparent ${
                      errors.year ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.year && (
                    <p className="mt-1 text-sm text-red-500">{errors.year}</p>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Se generará una factura global para el período:
                </p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {getPeriodicityLabel()}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-4 mt-6 pt-6 border-t">
                <Link href="/admin/facturacion">
                  <Button variant="outline">Cancelar</Button>
                </Link>
                <Button
                  variant="primary"
                  onClick={handleCreate}
                  isLoading={createGlobalInvoice.isPending}
                  leftIcon={<GlobeAltIcon className="h-5 w-5" />}
                >
                  Generar Factura Global
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Result */
          <Card>
            <CardContent className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  Factura Global Generada
                </h2>
                <p className="text-gray-600 mt-1">{getPeriodicityLabel()}</p>
              </div>

              {/* Stats */}
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600">Pedidos Incluidos</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {createdInvoice.totalOrders}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600">Subtotal</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(createdInvoice.subtotal)}
                  </p>
                </div>
                <div className="p-4 bg-[#003B7A]/5 rounded-lg text-center">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-bold text-[#003B7A]">
                    {formatCurrency(createdInvoice.total)}
                  </p>
                </div>
              </div>

              {/* Warning */}
              {createdInvoice.status === 'pending' && (
                <Card className="border-yellow-200 bg-yellow-50 mb-6">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 flex-shrink-0" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-semibold">Factura pendiente de timbrar</p>
                        <p>
                          Esta factura no ha sido timbrada aún. Presiona el botón
                          &quot;Timbrar&quot; para enviarla al SAT.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex items-center justify-center gap-4">
                <Link href="/admin/facturacion">
                  <Button variant="outline">Ver Lista de Facturas</Button>
                </Link>
                {createdInvoice.status === 'pending' && (
                  <Button
                    variant="primary"
                    onClick={handleStamp}
                    isLoading={stampGlobalInvoice.isPending}
                    leftIcon={<CheckCircleIcon className="h-5 w-5" />}
                  >
                    Timbrar Factura
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
