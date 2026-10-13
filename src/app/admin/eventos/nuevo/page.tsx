'use client';

// Alta de evento. Al crearlo el API da de alta el producto de tipo 'event';
// la venta arranca cuando se asignan sucursales y se activa el evento.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeftIcon, TicketIcon } from '@heroicons/react/24/outline';
import { EventForm } from '@/components/admin/events/EventForm';
import { useCreateEvent } from '@/hooks/useEvents';
import { eventErrorMessage } from '@/lib/events/format';
import { toCreateInput, type EventFormValues } from '@/lib/events/form';

export default function NuevoEventoPage() {
  const router = useRouter();
  const createMutation = useCreateEvent();

  const handleSubmit = async (values: EventFormValues) => {
    try {
      const ev = await createMutation.mutateAsync(toCreateInput(values));
      toast.success('Evento creado; asigna sucursales para empezar a vender');
      router.push(`/admin/eventos/${ev.id}?tab=sucursales`);
    } catch (e) {
      toast.error(eventErrorMessage(e, 'No se pudo crear el evento.'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/eventos"
              className="rounded-lg p-2 transition-colors hover:bg-gray-100"
              aria-label="Regresar a Eventos"
            >
              <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
            </Link>
            <div className="flex items-center gap-3">
              <TicketIcon className="h-8 w-8 text-[#3E667D]" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Nuevo evento</h1>
                <p className="text-sm text-gray-500">
                  Se crea en borrador; después asigna sucursales y actívalo para vender.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <EventForm
          mode="create"
          onSubmit={handleSubmit}
          isPending={createMutation.isPending}
          onCancel={() => router.push('/admin/eventos')}
        />
      </div>
    </div>
  );
}
