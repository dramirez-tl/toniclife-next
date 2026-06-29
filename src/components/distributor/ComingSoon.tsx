'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Hourglass } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Pantalla "próximamente" para secciones del panel de distribuidor que aún no
 * están conectadas al API. Evita mostrar datos de demostración como si fueran
 * reales (auditoría jun-2026); al conectar una sección, se quita su ruta de
 * COMING_SOON_ROUTES en el layout del panel.
 */
export function ComingSoon({ title }: { title: string }) {
  const t = useTranslations('distributor');
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-md text-center">
        <CardContent className="flex flex-col items-center gap-4 p-10">
          <div className="rounded-full bg-secondary p-4">
            <Hourglass className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-primary">{title}</h1>
          <p className="text-muted-foreground">{t('comingSoonPage.body')}</p>
          <Button asChild>
            <Link href="/distribuidor">{t('comingSoonPage.back')}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
