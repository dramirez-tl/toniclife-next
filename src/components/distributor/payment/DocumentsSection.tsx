'use client';

// DocumentsSection.tsx — tarjetas de documentos requeridos por país (más los
// opcionales que ya tengan archivo), cada una con subida inmediata.

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import type { FileUploadTexts } from '@/components/ui/FileUpload';
import { localeLanguage } from '@/i18n/config';
import type { PaymentCatalogs, PaymentDataResponse, PaymentDocumentKey } from '@/types/distributor-payment';
import { PAYMENT_DOCUMENT_KEYS } from '@/types/distributor-payment';
import { SectionCard } from './SectionCard';
import { DocumentCard } from './DocumentCard';
import { rejectionReasonLabel, requiredDocuments } from './paymentUtils';

interface DocumentsSectionProps {
  data: PaymentDataResponse;
  catalogs: PaymentCatalogs | undefined;
  consentBlocked: boolean;
  privacyConsent: boolean;
}

export function DocumentsSection({ data, catalogs, consentBlocked, privacyConsent }: DocumentsSectionProps) {
  const t = useTranslations('distributor.payments');
  const lang = localeLanguage(useLocale());

  const uploadTexts = useMemo<Partial<FileUploadTexts>>(
    () => ({
      statusPending: t('documents.status.pending'),
      statusValidated: t('documents.status.validated'),
      statusRejected: t('documents.status.rejected'),
      statusExpired: t('documents.status.expired'),
      reasonPrefix: t('documents.upload.reasonPrefix'),
      viewCurrent: t('documents.preview'),
      dropHint: t('documents.upload.dropHint'),
      selectFile: t('documents.upload.selectFile'),
      allowedHint: t('documents.upload.allowedHint'),
      errorTooLarge: t('documents.upload.errorTooLarge'),
      errorType: t('documents.upload.errorType'),
      removeFile: t('documents.upload.removeFile'),
      uploading: t('documents.upload.uploading'),
    }),
    [t],
  );

  const keys = useMemo(() => {
    const required = requiredDocuments(data);
    const extra = PAYMENT_DOCUMENT_KEYS.filter(
      (k) => !required.includes(k) && data.documents?.[k]?.status,
    );
    return [...required, ...extra] as PaymentDocumentKey[];
  }, [data]);

  return (
    <SectionCard
      id="section-documents"
      dataTour="d-payments-documents"
      title={t('documents.title')}
      description={t('documents.description')}
      icon={DocumentDuplicateIcon}
      tooltip={t('documents.tooltip')}
      tooltipAriaLabel={t('common.help', { field: t('documents.title') })}
    >
      {keys.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('documents.none')}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {keys.map((key) => {
            const doc = data.documents[key];
            return (
              <DocumentCard
                key={key}
                docKey={key}
                doc={doc}
                reasonLabel={rejectionReasonLabel(
                  catalogs?.rejectionReasons,
                  doc.rejectionReasonCode,
                  lang,
                  doc.rejectionReasonLabel,
                )}
                consentBlocked={consentBlocked}
                privacyConsent={privacyConsent}
                uploadTexts={uploadTexts}
              />
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
