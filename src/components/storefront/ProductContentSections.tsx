'use client';

// Contenido rico de la ficha. SOLO se pintan las secciones que existen (sin
// "Próximamente" ni textos inventados). Pestañas en escritorio, acordeón en móvil.
// Las advertencias van SIEMPRE visibles; la leyenda legal, al pie si está
// configurada. Todo es TEXTO PLANO pintado como nodos de React (nunca HTML).

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { hasText, toBlocks, toBulletItems, type ContentBlock } from '@/lib/storefront/content-format';
import type { StorefrontProductDetail } from '@/types/storefront';

type SectionKey = 'description' | 'benefits' | 'ingredients' | 'usage';

interface Section {
  key: SectionKey;
  blocks: ContentBlock[];
}

function Blocks({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="flex flex-col gap-4 text-base leading-relaxed text-gray-800">
      {blocks.map((block, index) =>
        block.type === 'list' ? (
          <ul key={index} className="flex list-disc flex-col gap-2 pl-5 marker:text-[#3E667D]">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{item}</li>
            ))}
          </ul>
        ) : (
          <p key={index} className="whitespace-pre-line">
            {block.text}
          </p>
        ),
      )}
    </div>
  );
}

function buildSections(product: StorefrontProductDetail): Section[] {
  const { content } = product;
  const sections: Section[] = [];
  const description = hasText(product.longDescription) ? product.longDescription : product.description;
  const descriptionBlocks = toBlocks(description);
  if (descriptionBlocks.length > 0) sections.push({ key: 'description', blocks: descriptionBlocks });
  const benefits = toBulletItems(content.benefits);
  if (benefits.length > 0) sections.push({ key: 'benefits', blocks: [{ type: 'list', items: benefits }] });
  const ingredients = toBlocks(content.ingredients);
  if (ingredients.length > 0) sections.push({ key: 'ingredients', blocks: ingredients });
  const usage = toBlocks(content.usageInstructions);
  if (usage.length > 0) sections.push({ key: 'usage', blocks: usage });
  return sections;
}

export function ProductContentSections({ product }: { product: StorefrontProductDetail }) {
  const t = useTranslations('storefront.product.sections');
  const sections = buildSections(product);
  const warnings = toBlocks(product.content.warnings);
  const disclaimer = hasText(product.disclaimer) ? product.disclaimer.trim() : null;

  if (sections.length === 0 && warnings.length === 0 && !disclaimer) return null;

  let body: ReactNode = null;
  if (sections.length === 1) {
    body = (
      <section aria-labelledby="product-section-single">
        <h2 id="product-section-single" className="mb-4 text-xl font-bold text-gray-900">
          {t(sections[0].key)}
        </h2>
        <Blocks blocks={sections[0].blocks} />
      </section>
    );
  } else if (sections.length > 1) {
    body = (
      <>
        <div className="hidden lg:block">
          <Tabs defaultValue={sections[0].key}>
            <TabsList className="h-auto flex-wrap justify-start gap-1">
              {sections.map((section) => (
                <TabsTrigger key={section.key} value={section.key} className="min-h-11 cursor-pointer px-5 text-sm">
                  {t(section.key)}
                </TabsTrigger>
              ))}
            </TabsList>
            {sections.map((section) => (
              // forceMount: TODAS las secciones viajan en el HTML del servidor (SEO);
              // la inactiva se oculta por CSS (Radix no la oculta sola con forceMount).
              <TabsContent
                key={section.key}
                value={section.key}
                forceMount
                className="max-w-3xl pt-6 data-[state=inactive]:hidden"
              >
                <h2 className="sr-only">{t(section.key)}</h2>
                <Blocks blocks={section.blocks} />
              </TabsContent>
            ))}
          </Tabs>
        </div>
        <div className="lg:hidden">
          <Accordion type="multiple" defaultValue={[sections[0].key]}>
            {sections.map((section) => (
              <AccordionItem key={section.key} value={section.key}>
                <AccordionTrigger className="min-h-12 cursor-pointer text-base font-semibold text-gray-900">
                  {t(section.key)}
                </AccordionTrigger>
                <AccordionContent>
                  <Blocks blocks={section.blocks} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {body}
      {warnings.length > 0 && (
        <Alert className="max-w-3xl border-amber-300 bg-amber-50 text-amber-950">
          <ExclamationTriangleIcon aria-hidden="true" className="size-5 text-amber-800" />
          <AlertTitle className="text-base font-semibold">{t('warnings')}</AlertTitle>
          <AlertDescription className="text-amber-950">
            <Blocks blocks={warnings} />
          </AlertDescription>
        </Alert>
      )}
      {disclaimer && <p className="max-w-3xl whitespace-pre-line text-xs leading-relaxed text-gray-700">{disclaimer}</p>}
    </div>
  );
}
