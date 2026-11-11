'use client';

// useShippingSettingsForm — Formulario de costos de envío y envío gratis de UN país.
//
// Lo comparten Configuración › Envíos y Tienda en línea por país: lee los ajustes del
// país (`GET /config/shipping-settings?country=`), los pasa al formulario y los guarda
// (`PATCH`). Las reglas (qué viaja, qué es un cambio) viven en
// `lib/store-country/shipping-costs`; los campos, en `ShippingSettingsFields`.

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { configKeys, useShippingSettings, useUpdateShippingSettings } from '@/hooks/useConfig';
import { fulfillmentKeys } from '@/hooks/useFulfillment';
import type { ShippingSettings } from '@/services/config.service';
import {
  DEFAULT_SHIPPING_FORM,
  buildShippingPayload,
  isShippingFormDirty,
  shippingFlagsSupported,
  shippingFormValues,
  type ShippingFormValues,
} from '@/lib/store-country/shipping-costs';

export function useShippingSettingsForm(countryCode: string) {
  const queryClient = useQueryClient();
  const query = useShippingSettings(countryCode);
  const update = useUpdateShippingSettings(countryCode);
  const data = query.data;

  const [values, setValues] = useState<ShippingFormValues>(DEFAULT_SHIPPING_FORM);
  // Última respuesta del servidor que ya se pasó al formulario. Cuando llega otra (otro
  // país, o lo recién guardado) el formulario se pone al día durante el render.
  const [synced, setSynced] = useState<ShippingSettings | null>(null);
  if (data && data !== synced) {
    setSynced(data);
    setValues(shippingFormValues(data));
  }

  const flagsSupported = shippingFlagsSupported(data);

  const change = (patch: Partial<ShippingFormValues>) => setValues((prev) => ({ ...prev, ...patch }));

  /** Descarta lo escrito y vuelve a lo último guardado. */
  const reset = () => {
    if (data) setValues(shippingFormValues(data));
  };

  const save = () => {
    // Sin los ajustes del país en pantalla (aún cargan o no se pudieron leer) se
    // guardarían los del país anterior o los de fábrica, interruptores incluidos.
    if (!data) {
      toast.error('Aún no se cargan los ajustes de envío de este país. Espera un momento o recarga la página.');
      return;
    }
    update.mutate(buildShippingPayload(values, flagsSupported), {
      onSuccess: () => {
        toast.success('Ajustes de envío actualizados');
        // Frontera cobra lo de México mientras no tenga lo suyo, y el diagnóstico de
        // rutas dice de dónde salen los montos de cada país: se releen los dos.
        queryClient.invalidateQueries({ queryKey: [...configKeys.all, 'shipping-settings'] });
        queryClient.invalidateQueries({ queryKey: fulfillmentKeys.diagnostics() });
      },
      onError: () => toast.error('No se pudieron guardar los ajustes de envío'),
    });
  };

  return {
    values,
    change,
    /** Ajustes del país tal como los dio el servidor; undefined mientras cargan o si falló. */
    data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    flagsSupported,
    dirty: isShippingFormDirty(values, data),
    isSaving: update.isPending,
    save,
    reset,
  };
}

export type ShippingSettingsForm = ReturnType<typeof useShippingSettingsForm>;
