'use client';

// Admin > Comercial > Formularios: respuestas de los formularios públicos de
// marketing, una pestaña por formulario:
//   - "Oportunidad de Negocio" (formulario.<dominio>)
//   - "Taller de Inducción"    (induccion.<dominio>)
// La pestaña activa vive en la URL (?tab=oportunidad|induccion) para que
// sobreviva recargas y se pueda compartir. Contenido: <FormResponses slug />.

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';
import {
  isMarketingFormSlug,
  type MarketingFormSlug,
} from '@/services/marketing.service';
import FormResponses from './components/FormResponses';

const DEFAULT_TAB: MarketingFormSlug = 'oportunidad';

export default function FormulariosPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <FormulariosContent />
    </Suspense>
  );
}

function FormulariosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: MarketingFormSlug = isMarketingFormSlug(tabParam)
    ? tabParam
    : DEFAULT_TAB;

  // Un ?tab= inválido (foo, Induccion con mayúscula...) cae a la pestaña
  // default; se normaliza la URL una vez para que no se comparta "sucia".
  useEffect(() => {
    if (tabParam !== null && !isMarketingFormSlug(tabParam)) {
      router.replace(`/admin/comercial/formularios?tab=${DEFAULT_TAB}`, {
        scroll: false,
      });
    }
  }, [tabParam, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#3E667D] to-[#0A4B94] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-2 flex items-center gap-3">
            <ClipboardDocumentListIcon className="h-9 w-9" />
            <h1 className="text-3xl font-bold sm:text-4xl">Formularios</h1>
          </div>
          <p className="text-base text-white/80 sm:text-lg">
            Respuestas de los formularios públicos
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Tabs
          value={activeTab}
          onValueChange={(v) =>
            router.replace(`/admin/comercial/formularios?tab=${v}`, {
              scroll: false,
            })
          }
        >
          <TabsList>
            <TabsTrigger value="oportunidad">Oportunidad de Negocio</TabsTrigger>
            <TabsTrigger value="induccion">Taller de Inducción</TabsTrigger>
          </TabsList>

          {/* Radix solo monta el contenido de la pestaña activa: cada
              formulario conserva sus propios filtros/paginación mientras
              esté visible y arranca limpio al volver. */}
          <TabsContent value="oportunidad" className="mt-6">
            <FormResponses slug="oportunidad" />
          </TabsContent>
          <TabsContent value="induccion" className="mt-6">
            <FormResponses slug="induccion" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
