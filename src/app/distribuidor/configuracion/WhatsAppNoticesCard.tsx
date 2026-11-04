'use client';

// WhatsAppNoticesCard — "Avisos por WhatsApp" del panel del distribuidor.
// Preferencia PERSISTIDA con GET/PATCH /distributor/preferences
// (whatsappMarketing: all | account | none | unknown; el API la guarda con
// fuente 'panel'). Mientras el API no mande el campo (despliegue pendiente)
// el bloque se ve deshabilitado con el aviso "disponible muy pronto": nunca
// finge guardar. Textos en messages/{es,en}.json → distributor.settings.whatsapp.

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { distributorKeys } from '@/hooks/useDistributor';
import { distributorApi, type DistributorPreferences } from '@/services/distributorApi';

/** Lo que puede elegir el distribuidor ('unknown' solo se lee: nunca respondió). */
const CHOICES = ['all', 'account', 'none'] as const;
type Choice = (typeof CHOICES)[number];

interface WhatsAppNoticesCardProps {
  prefs: DistributorPreferences | undefined;
  loading: boolean;
}

export function WhatsAppNoticesCard({ prefs, loading }: WhatsAppNoticesCardProps) {
  const t = useTranslations('distributor.settings.whatsapp');
  const queryClient = useQueryClient();
  const current = prefs?.whatsappMarketing;
  // El API anterior responde solo { language }: sin el campo no hay nada que guardar.
  const available = current !== undefined;

  const mutation = useMutation({
    mutationFn: (value: Choice) => distributorApi.updateWhatsAppMarketing(value),
    onSuccess: (data) => {
      queryClient.setQueryData<DistributorPreferences>(
        distributorKeys.preferences(),
        (old) => ({ ...(old ?? { language: 'es' }), ...data }),
      );
      toast.success(t('saved'));
    },
    onError: () => toast.error(t('error')),
  });

  const disabled = loading || !available || mutation.isPending;

  return (
    <Card id="whatsapp">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-2">
          <ChatBubbleLeftRightIcon className="h-6 w-6 text-[#3E667D]" />
          <h2 className="text-2xl font-bold text-gray-900">{t('title')}</h2>
        </div>
        <p className="text-sm text-gray-600 mb-6">{t('desc')}</p>

        {!loading && !available && (
          <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {t('unavailable')}
          </p>
        )}
        {available && current === 'unknown' && (
          <p className="mb-4 text-sm text-gray-600">{t('unknownHint')}</p>
        )}

        <RadioGroup
          // 'unknown' no coincide con ninguna opción: nada marcado, sin perder el control.
          value={current ?? 'unknown'}
          onValueChange={(value) => mutation.mutate(value as Choice)}
          disabled={disabled}
          aria-label={t('title')}
          className="gap-3"
        >
          {CHOICES.map((value) => {
            const selected = current === value;
            return (
              <label
                key={value}
                htmlFor={`whatsapp-${value}`}
                className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${
                  selected ? 'border-[#3E667D] bg-blue-50' : 'border-gray-200 bg-gray-50'
                } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-gray-100'}`}
              >
                <RadioGroupItem id={`whatsapp-${value}`} value={value} className="mt-1" />
                <span className="min-w-0">
                  <span className="block font-medium text-gray-900">
                    {t(`options.${value}.label`)}
                  </span>
                  <span className="block text-sm text-gray-600">
                    {t(`options.${value}.desc`)}
                  </span>
                </span>
              </label>
            );
          })}
        </RadioGroup>

        <p className="mt-4 text-xs text-gray-500" aria-live="polite">
          {mutation.isPending ? t('saving') : t('footnote')}
        </p>
      </CardContent>
    </Card>
  );
}
