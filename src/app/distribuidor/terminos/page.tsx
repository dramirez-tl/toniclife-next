'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  DocumentTextIcon,
  ShieldCheckIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { distributorApi } from '@/services/distributorApi';
import { myOrdersKeys } from '@/hooks/useMyOrders';

// Documentos que el miembro debe aceptar (links a las páginas públicas).
const DOCS = [
  { key: 'terms', label: 'los Términos y Condiciones', href: '/terminos' },
  { key: 'privacy', label: 'el Aviso de Privacidad', href: '/privacidad' },
  {
    key: 'contract',
    label: 'el Contrato de Distribuidor',
    href: '/contrato-distribuidor',
  },
] as const;

type DocKey = (typeof DOCS)[number]['key'];

export default function TerminosInscripcionPage() {
  const queryClient = useQueryClient();
  const [checked, setChecked] = useState<Record<DocKey, boolean>>({
    terms: false,
    privacy: false,
    contract: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const allChecked = DOCS.every((d) => checked[d.key]);

  const handleAccept = async () => {
    if (!allChecked) return;
    setSubmitting(true);
    try {
      await distributorApi.acceptTerms();
      // Refresca el gating (needsTerms pasa a false) y entra al panel.
      await queryClient.invalidateQueries({ queryKey: myOrdersKeys.onboarding });
      toast.success('¡Gracias! Tu cuenta quedó lista.');
      window.location.href = '/distribuidor';
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          'No se pudo registrar tu aceptación. Intenta de nuevo.',
      );
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl py-2">
      {/* Encabezado */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#3E667D] to-[#0A4B94] p-6 text-white shadow-lg">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="h-6 w-6" />
          <h1 className="text-xl font-bold sm:text-2xl">Último paso</h1>
        </div>
        <p className="mt-1 text-sm text-white/85">
          Para activar tu negocio, lee y acepta los documentos de Tonic Life.
        </p>
      </div>

      <Card className="border border-gray-200">
        <CardContent className="p-6">
          <div className="mb-5 flex items-start gap-3 rounded-lg bg-[#3E667D]/5 p-4">
            <DocumentTextIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#3E667D]" />
            <p className="text-sm text-gray-600">
              Revisa cada documento (se abre en una pestaña nueva) y marca la
              casilla para confirmar que lo aceptas.
            </p>
          </div>

          <div className="space-y-3">
            {DOCS.map((doc) => (
              <label
                key={doc.key}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-4 transition hover:border-[#3E667D]/40"
              >
                <Checkbox
                  checked={checked[doc.key]}
                  onCheckedChange={(v) =>
                    setChecked((prev) => ({ ...prev, [doc.key]: v === true }))
                  }
                  disabled={submitting}
                  className="mt-0.5"
                />
                <span className="text-sm text-gray-700">
                  He leído y acepto{' '}
                  <Link
                    href={doc.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 font-medium text-[#3E667D] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {doc.label}
                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                  </Link>{' '}
                  de Tonic Life.
                </span>
              </label>
            ))}
          </div>

          <Button
            size="lg"
            className="mt-6 w-full"
            disabled={!allChecked || submitting}
            onClick={handleAccept}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? 'Registrando…' : 'Aceptar y entrar a mi panel'}
          </Button>

          <p className="mt-3 text-center text-xs text-gray-400">
            Al aceptar confirmas que la información de tu inscripción es correcta.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
