'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PermissionGuard } from '@/components/auth';
import { useSendNotification, useSendBulkNotification } from '@/hooks/useNotifications';
import type {
  SendNotificationDto,
  SendBulkNotificationDto,
  NotificationChannel,
  NotificationCategory,
  NotificationPriority,
} from '@/types/notification';
import {
  BellIcon,
  PaperAirplaneIcon,
  MegaphoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UserGroupIcon,
  SignalIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { DataTable, type DataTableColumn } from '@/components/ui';

// ================================
// CONSTANTS
// ================================

const CHANNEL_OPTIONS: { value: NotificationChannel; label: string }[] = [
  { value: 'IN_APP', label: 'In-App' },
  { value: 'EMAIL', label: 'Correo' },
  { value: 'SMS', label: 'SMS' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
];

const CATEGORY_OPTIONS: { value: NotificationCategory; label: string }[] = [
  { value: 'system', label: 'Sistema' },
  { value: 'orders', label: 'Pedidos' },
  { value: 'mlm', label: 'MLM / Red' },
  { value: 'commission', label: 'Comisiones' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'billing', label: 'Facturacion' },
  { value: 'inventory', label: 'Inventario' },
  { value: 'alert', label: 'Alertas' },
  { value: 'general', label: 'General' },
  { value: 'custom', label: 'Personalizada' },
];

const PRIORITY_OPTIONS: { value: NotificationPriority; label: string }[] = [
  { value: 'LOW', label: 'Baja' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
];

const TARGET_GROUP_OPTIONS = [
  { value: 'all', label: 'Todos los usuarios' },
  { value: 'distributors', label: 'Distribuidores' },
  { value: 'admins', label: 'Administradores' },
  { value: 'customers', label: 'Clientes' },
];

// Shape of a sent-notification history row (placeholder until the admin
// endpoint is integrated). Mirrors the historical table columns.
interface NotificationHistoryItem {
  id: string;
  title: string;
  channel: string;
  recipients: string;
  priority: NotificationPriority;
  date: string;
  status: string;
}

// ================================
// MAIN PAGE COMPONENT
// ================================

export default function NotificacionesAdminPage() {
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');
  const [sendMode, setSendMode] = useState<'bulk' | 'specific'>('bulk');

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [channel, setChannel] = useState<NotificationChannel>('IN_APP');
  const [category, setCategory] = useState<NotificationCategory>('general');
  const [priority, setPriority] = useState<NotificationPriority>('NORMAL');
  const [targetGroup, setTargetGroup] = useState<'all' | 'distributors' | 'admins' | 'customers'>('all');
  const [userIds, setUserIds] = useState('');

  // Hooks
  const sendNotification = useSendNotification();
  const sendBulkNotification = useSendBulkNotification();

  const isSending = sendNotification.isPending || sendBulkNotification.isPending;

  // ================================
  // HANDLERS
  // ================================

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setChannel('IN_APP');
    setCategory('general');
    setPriority('NORMAL');
    setTargetGroup('all');
    setUserIds('');
  };

  const handleSend = async () => {
    // Validation
    if (!title.trim()) {
      toast.error('El titulo es obligatorio');
      return;
    }
    if (!message.trim()) {
      toast.error('El mensaje es obligatorio');
      return;
    }

    try {
      if (sendMode === 'specific') {
        const ids = userIds
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean);

        if (ids.length === 0) {
          toast.error('Ingresa al menos un ID de usuario');
          return;
        }

        const dto: SendNotificationDto = {
          userIds: ids,
          title: title.trim(),
          message: message.trim(),
          channel,
          category,
          priority,
        };
        await sendNotification.mutateAsync(dto);
        toast.success(`Notificacion enviada a ${ids.length} usuario(s)`);
      } else {
        const dto: SendBulkNotificationDto = {
          targetGroup,
          title: title.trim(),
          message: message.trim(),
          channel,
          category,
          priority,
        };
        const result = await sendBulkNotification.mutateAsync(dto);
        toast.success(`Notificacion masiva enviada a ${result.sent} usuarios`);
      }

      resetForm();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Error al enviar la notificacion'
      );
    }
  };

  // ================================
  // RENDER HELPERS
  // ================================

  const inputClassName =
    'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3E667D] focus:border-transparent text-gray-900';

  const getPriorityBadge = (p: NotificationPriority) => {
    const styles: Record<NotificationPriority, string> = {
      LOW: 'bg-gray-100 text-gray-700',
      NORMAL: 'bg-blue-100 text-blue-700',
      HIGH: 'bg-orange-100 text-orange-700',
      URGENT: 'bg-red-100 text-red-700',
    };
    const labels: Record<NotificationPriority, string> = {
      LOW: 'Baja',
      NORMAL: 'Normal',
      HIGH: 'Alta',
      URGENT: 'Urgente',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[p]}`}>
        {labels[p]}
      </span>
    );
  };

  const historyColumns: DataTableColumn<NotificationHistoryItem>[] = [
    {
      key: 'title',
      header: 'Titulo',
      render: (item) => item.title,
    },
    {
      key: 'channel',
      header: 'Canal',
      render: (item) => item.channel,
    },
    {
      key: 'recipients',
      header: 'Destinatarios',
      render: (item) => item.recipients,
    },
    {
      key: 'priority',
      header: 'Prioridad',
      render: (item) => getPriorityBadge(item.priority),
    },
    {
      key: 'date',
      header: 'Fecha',
      render: (item) => item.date,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (item) => item.status,
    },
  ];

  return (
    <PermissionGuard permissions={['notifications:read']}>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#3E667D]/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BellIcon className="h-10 w-10" />
                <h1 className="text-4xl font-bold">Centro de Notificaciones</h1>
              </div>
              <p className="text-white/80 text-lg">
                Envia y administra notificaciones para usuarios del sistema
              </p>
            </div>
            <div className="flex gap-3">
              <Link href="/admin">
                <Button variant="secondary">Volver al Panel Principal</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Enviadas</p>
                  <p className="text-3xl font-bold text-gray-900">0</p>
                  <p className="text-xs text-gray-500 mt-1">Conectar con analytics</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <EnvelopeIcon className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">No Leidas</p>
                  <p className="text-3xl font-bold text-orange-600">0</p>
                  <p className="text-xs text-gray-500 mt-1">En todas las cuentas</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Canales Activos</p>
                  <p className="text-3xl font-bold text-green-600">4</p>
                  <p className="text-xs text-gray-500 mt-1">En App, Correo, SMS, WhatsApp</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <SignalIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('send')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'send'
                ? 'bg-[#3E667D] text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <PaperAirplaneIcon className="h-5 w-5" />
            Enviar Notificacion
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'history'
                ? 'bg-[#3E667D] text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <TableCellsIcon className="h-5 w-5" />
            Historial de Envios
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'send' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Send Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <MegaphoneIcon className="h-6 w-6 text-[#3E667D]" />
                    <h2 className="text-xl font-bold text-gray-900">
                      Nueva Notificacion
                    </h2>
                  </div>

                  <div className="space-y-5">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Titulo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ej: Actualizacion importante del sistema"
                        className={inputClassName}
                        maxLength={200}
                      />
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mensaje <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Escribe el contenido de la notificacion..."
                        rows={4}
                        className={inputClassName + ' resize-none'}
                        maxLength={1000}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {message.length}/1000 caracteres
                      </p>
                    </div>

                    {/* Send Mode Toggle */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Modo de envio
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSendMode('bulk')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            sendMode === 'bulk'
                              ? 'bg-[#3E667D] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <UserGroupIcon className="h-4 w-4" />
                          Envio Masivo
                        </button>
                        <button
                          type="button"
                          onClick={() => setSendMode('specific')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            sendMode === 'specific'
                              ? 'bg-[#3E667D] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <ChatBubbleLeftRightIcon className="h-4 w-4" />
                          Usuarios Especificos
                        </button>
                      </div>
                    </div>

                    {/* Target Group (Bulk) or User IDs (Specific) */}
                    {sendMode === 'bulk' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Grupo Destino
                        </label>
                        <SearchableSelect
                          options={TARGET_GROUP_OPTIONS.map((opt) => ({
                            value: opt.value,
                            label: opt.label,
                          }))}
                          value={targetGroup}
                          onChange={(val) =>
                            setTargetGroup(
                              val as 'all' | 'distributors' | 'admins' | 'customers'
                            )
                          }
                          showAllOption={false}
                          className="w-full"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          IDs de Usuario <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={userIds}
                          onChange={(e) => setUserIds(e.target.value)}
                          placeholder="uuid-1, uuid-2, uuid-3"
                          className={inputClassName}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Separa los IDs con comas
                        </p>
                      </div>
                    )}

                    {/* Channel, Category, Priority in a grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Channel */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Canal
                        </label>
                        <SearchableSelect
                          options={CHANNEL_OPTIONS.map((opt) => ({
                            value: opt.value,
                            label: opt.label,
                          }))}
                          value={channel}
                          onChange={(val) =>
                            setChannel(val as NotificationChannel)
                          }
                          showAllOption={false}
                          className="w-full"
                        />
                      </div>

                      {/* Category */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Categoria
                        </label>
                        <SearchableSelect
                          options={CATEGORY_OPTIONS.map((opt) => ({
                            value: opt.value,
                            label: opt.label,
                          }))}
                          value={category}
                          onChange={(val) =>
                            setCategory(val as NotificationCategory)
                          }
                          showAllOption={false}
                          className="w-full"
                        />
                      </div>

                      {/* Priority */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Prioridad
                        </label>
                        <SearchableSelect
                          options={PRIORITY_OPTIONS.map((opt) => ({
                            value: opt.value,
                            label: opt.label,
                          }))}
                          value={priority}
                          onChange={(val) =>
                            setPriority(val as NotificationPriority)
                          }
                          showAllOption={false}
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Send Button */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                      <Button variant="outline" onClick={resetForm} disabled={isSending}>
                        Limpiar
                      </Button>
                      <Button
                        variant="default"
                        onClick={handleSend}
                        disabled={isSending}
                      >
                        <PaperAirplaneIcon className="h-5 w-5" />
                        {isSending ? 'Enviando...' : 'Enviar Notificacion'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview Panel */}
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Vista Previa</h3>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {title || message ? (
                      <div className="space-y-3">
                        {/* Preview notification */}
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <BellIcon className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 text-sm">
                              {title || 'Titulo de la notificacion'}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              {message || 'Contenido del mensaje...'}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {getPriorityBadge(priority)}
                              <span className="text-xs text-gray-500">
                                {CHANNEL_OPTIONS.find((c) => c.value === channel)?.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <BellIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">
                          Completa el formulario para ver la vista previa
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Send details summary */}
                  <div className="mt-6 space-y-3">
                    <h4 className="font-semibold text-gray-900 text-sm">
                      Resumen de Envio
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Modo:</span>
                        <span className="text-gray-900 font-medium">
                          {sendMode === 'bulk' ? 'Masivo' : 'Especifico'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Destino:</span>
                        <span className="text-gray-900 font-medium">
                          {sendMode === 'bulk'
                            ? TARGET_GROUP_OPTIONS.find((t) => t.value === targetGroup)?.label
                            : userIds
                              ? `${userIds.split(',').filter((id) => id.trim()).length} usuario(s)`
                              : 'Sin especificar'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Canal:</span>
                        <span className="text-gray-900 font-medium">
                          {CHANNEL_OPTIONS.find((c) => c.value === channel)?.label}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Categoria:</span>
                        <span className="text-gray-900 font-medium">
                          {CATEGORY_OPTIONS.find((c) => c.value === category)?.label}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Prioridad:</span>
                        {getPriorityBadge(priority)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <ClockIcon className="h-6 w-6 text-[#3E667D]" />
                <h2 className="text-xl font-bold text-gray-900">
                  Historial de Notificaciones Enviadas
                </h2>
              </div>

              {/* Placeholder table */}
              <DataTable<NotificationHistoryItem>
                columns={historyColumns}
                data={[]}
                getRowKey={(item, i) => String(item.id ?? i)}
                emptyState={
                  <div className="text-center py-16">
                    <ClockIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Sin historial de envios
                    </h3>
                    <p className="text-gray-600 mb-4">
                      El historial de notificaciones aparecera aqui cuando se integre el endpoint de administracion.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setActiveTab('send')}
                    >
                      <PaperAirplaneIcon className="h-4 w-4" />
                      Enviar Primera Notificacion
                    </Button>
                  </div>
                }
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
    </PermissionGuard>
  );
}
