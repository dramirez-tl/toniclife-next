'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import {
  DocumentChartBarIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  FunnelIcon,
  DocumentTextIcon,
  TableCellsIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';

const reportTemplates = [
  {
    id: '1',
    name: 'Reporte de Ventas Mensual',
    description: 'Desglose completo de ventas personales y de equipo',
    category: 'Ventas',
    fields: ['Fecha', 'Producto', 'Cantidad', 'Monto', 'Cliente', 'Comisión'],
    icon: ChartBarIcon,
    color: 'blue',
  },
  {
    id: '2',
    name: 'Reporte de Comisiones',
    description: 'Detalle de comisiones ganadas por nivel',
    category: 'Finanzas',
    fields: ['Periodo', 'Nivel', 'Ventas', 'Porcentaje', 'Comisión'],
    icon: DocumentTextIcon,
    color: 'green',
  },
  {
    id: '3',
    name: 'Análisis de Red',
    description: 'Estructura y performance de tu red de distribuidores',
    category: 'Red',
    fields: ['Distribuidor', 'Nivel', 'Ventas', 'Equipo', 'Rango'],
    icon: TableCellsIcon,
    color: 'purple',
  },
  {
    id: '4',
    name: 'Productos Más Vendidos',
    description: 'Top productos por volumen y revenue',
    category: 'Ventas',
    fields: ['Producto', 'Unidades', 'Revenue', 'Margen', 'Tendencia'],
    icon: ChartBarIcon,
    color: 'orange',
  },
  {
    id: '5',
    name: 'Estado de Prospectos',
    description: 'Pipeline de prospectos y conversiones',
    category: 'Prospectos',
    fields: ['Prospecto', 'Estado', 'Fuente', 'Última Interacción', 'Notas'],
    icon: DocumentTextIcon,
    color: 'pink',
  },
  {
    id: '6',
    name: 'Reporte Fiscal',
    description: 'Información para declaración de impuestos',
    category: 'Finanzas',
    fields: ['Periodo', 'Ingresos', 'Retenciones', 'Comisiones', 'Total'],
    icon: DocumentChartBarIcon,
    color: 'red',
  },
];

const mockGeneratedReports = [
  {
    id: '1',
    name: 'Ventas Enero 2025',
    template: 'Reporte de Ventas Mensual',
    date: '2025-01-25',
    format: 'PDF',
    size: '2.4 MB',
    status: 'completed',
  },
  {
    id: '2',
    name: 'Comisiones Q4 2024',
    template: 'Reporte de Comisiones',
    date: '2025-01-20',
    format: 'Excel',
    size: '1.8 MB',
    status: 'completed',
  },
  {
    id: '3',
    name: 'Red Diciembre 2024',
    template: 'Análisis de Red',
    date: '2025-01-15',
    format: 'PDF',
    size: '3.2 MB',
    status: 'completed',
  },
  {
    id: '4',
    name: 'Top Productos 2024',
    template: 'Productos Más Vendidos',
    date: '2025-01-10',
    format: 'Excel',
    size: '950 KB',
    status: 'completed',
  },
];

const exportFormats = [
  { id: 'pdf', name: 'PDF', description: 'Documento portable, ideal para compartir', icon: '📄' },
  { id: 'excel', name: 'Excel (XLSX)', description: 'Hoja de cálculo editable', icon: '📊' },
  { id: 'csv', name: 'CSV', description: 'Valores separados por comas', icon: '📋' },
  { id: 'json', name: 'JSON', description: 'Formato de datos estructurado', icon: '🔧' },
];

export default function ReportesPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [dateRange, setDateRange] = useState({
    start: '2025-01-01',
    end: '2025-01-31',
  });
  const [filterCategory, setFilterCategory] = useState('all');

  const filteredTemplates = reportTemplates.filter(template => {
    if (filterCategory === 'all') return true;
    return template.category === filterCategory;
  });

  const handleGenerateReport = () => {
    if (!selectedTemplate) {
      toast.error('Por favor selecciona una plantilla de reporte');
      return;
    }

    const template = reportTemplates.find(t => t.id === selectedTemplate);
    toast.success(`Generando reporte: ${template?.name}`, {
      description: `Formato: ${selectedFormat.toUpperCase()} • Periodo: ${dateRange.start} - ${dateRange.end}`,
    });

    // Simulate report generation
    setTimeout(() => {
      toast.success('¡Reporte generado exitosamente!', {
        description: 'El reporte está listo para descargar',
      });
    }, 2000);
  };

  const handleDownloadReport = (reportName: string, format: string) => {
    toast.success(`Descargando: ${reportName}.${format.toLowerCase()}`);
  };

  const handleScheduleReport = () => {
    toast.info('Función de programación próximamente disponible');
  };

  const categories = ['all', ...Array.from(new Set(reportTemplates.map(t => t.category)))];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003B7A] to-[#003B7A]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <DocumentChartBarIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Reportes y Exportación</h1>
              </div>
              <p className="text-white/80 text-lg">
                Genera reportes personalizados y exporta tus datos
              </p>
            </div>
            <Link href="/distribuidor">
              <Button variant="secondary">
                Volver al Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Plantillas</p>
                  <p className="text-3xl font-bold text-gray-900">{reportTemplates.length}</p>
                </div>
                <DocumentTextIcon className="h-12 w-12 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Reportes Generados</p>
                  <p className="text-3xl font-bold text-gray-900">{mockGeneratedReports.length}</p>
                </div>
                <CheckCircleIcon className="h-12 w-12 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Este Mes</p>
                  <p className="text-3xl font-bold text-gray-900">12</p>
                </div>
                <CalendarIcon className="h-12 w-12 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#7AB82E] to-[#7AB82E]/90 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80 mb-1">Programados</p>
                  <p className="text-3xl font-bold">3</p>
                </div>
                <ClockIcon className="h-12 w-12 text-white/80" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Report Builder */}
          <div className="lg:col-span-2 space-y-6">
            {/* Report Builder */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Generar Nuevo Reporte</h2>

                {/* Category Filter */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(category => (
                      <button
                        key={category}
                        onClick={() => setFilterCategory(category)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          filterCategory === category
                            ? 'bg-[#003B7A] text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                      >
                        {category === 'all' ? 'Todas' : category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Templates Grid */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Selecciona una Plantilla
                  </label>
                  <div className="grid md:grid-cols-2 gap-4">
                    {filteredTemplates.map((template) => {
                      const IconComponent = template.icon;
                      return (
                        <div
                          key={template.id}
                          onClick={() => setSelectedTemplate(template.id)}
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            selectedTemplate === template.id
                              ? 'border-[#7AB82E] bg-green-50 shadow-md'
                              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              template.color === 'blue' ? 'bg-blue-100' :
                              template.color === 'green' ? 'bg-green-100' :
                              template.color === 'purple' ? 'bg-purple-100' :
                              template.color === 'orange' ? 'bg-orange-100' :
                              template.color === 'pink' ? 'bg-pink-100' :
                              'bg-red-100'
                            }`}>
                              <IconComponent className={`h-5 w-5 ${
                                template.color === 'blue' ? 'text-blue-600' :
                                template.color === 'green' ? 'text-green-600' :
                                template.color === 'purple' ? 'text-purple-600' :
                                template.color === 'orange' ? 'text-orange-600' :
                                template.color === 'pink' ? 'text-pink-600' :
                                'text-red-600'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {template.name}
                              </h3>
                              <p className="text-xs text-gray-600 mb-2">
                                {template.description}
                              </p>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                template.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                                template.color === 'green' ? 'bg-green-100 text-green-800' :
                                template.color === 'purple' ? 'bg-purple-100 text-purple-800' :
                                template.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                                template.color === 'pink' ? 'bg-pink-100 text-pink-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {template.category}
                              </span>
                            </div>
                            {selectedTemplate === template.id && (
                              <CheckCircleIcon className="h-6 w-6 text-[#7AB82E] flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Date Range */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Periodo
                  </label>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Fecha Inicio</label>
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Fecha Fin</label>
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7AB82E] focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Export Format */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Formato de Exportación
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {exportFormats.map((format) => (
                      <div
                        key={format.id}
                        onClick={() => setSelectedFormat(format.id)}
                        className={`border rounded-lg p-3 cursor-pointer text-center transition-all ${
                          selectedFormat === format.id
                            ? 'border-[#7AB82E] bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{format.icon}</div>
                        <p className="font-semibold text-sm text-gray-900">{format.name}</p>
                        <p className="text-xs text-gray-600 mt-1">{format.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selected Template Details */}
                {selectedTemplate && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Campos Incluidos:</h4>
                    <div className="flex flex-wrap gap-2">
                      {reportTemplates.find(t => t.id === selectedTemplate)?.fields.map(field => (
                        <span key={field} className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-white text-gray-700 border border-gray-300">
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    className="flex-1"
                    leftIcon={<DocumentChartBarIcon className="h-5 w-5" />}
                    onClick={handleGenerateReport}
                  >
                    Generar Reporte
                  </Button>
                  <Button
                    variant="outline"
                    leftIcon={<ClockIcon className="h-5 w-5" />}
                    onClick={handleScheduleReport}
                  >
                    Programar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Presets */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Reportes Rápidos</h3>
                <div className="grid md:grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => toast.info('Generando reporte semanal')}
                  >
                    📊 Esta Semana
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => toast.info('Generando reporte mensual')}
                  >
                    📅 Este Mes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => toast.info('Generando reporte trimestral')}
                  >
                    📈 Este Trimestre
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Generated Reports */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Reportes Recientes</h3>
                <div className="space-y-3">
                  {mockGeneratedReports.map((report) => (
                    <div key={report.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center flex-shrink-0">
                          <CheckCircleIcon className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm text-gray-900 truncate">
                            {report.name}
                          </h4>
                          <p className="text-xs text-gray-600">{report.template}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                        <span>{new Date(report.date).toLocaleDateString('es-MX')}</span>
                        <span>{report.size}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                        onClick={() => handleDownloadReport(report.name, report.format)}
                      >
                        Descargar {report.format}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-gray-900 mb-3">💡 Tips de Reportes</h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>• Genera reportes mensuales para seguimiento</li>
                  <li>• Usa Excel para análisis personalizados</li>
                  <li>• PDF es mejor para compartir con equipo</li>
                  <li>• Programa reportes automáticos</li>
                </ul>
              </CardContent>
            </Card>

            {/* Export All Data */}
            <Card className="bg-gradient-to-br from-[#003B7A] to-[#003B7A]/90 text-white">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-2">Exportación Completa</h3>
                <p className="text-white/90 text-sm mb-4">
                  Descarga todos tus datos en un solo archivo
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                  onClick={() => toast.info('Preparando exportación completa')}
                >
                  Exportar Todo
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
