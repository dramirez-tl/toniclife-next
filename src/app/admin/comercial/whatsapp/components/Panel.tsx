'use client';

// Panel - Tarjeta de sección del tablero (título + nota a la derecha).

import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function Panel({
  id,
  title,
  aside,
  children,
  className,
}: {
  id: string;
  title: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('min-w-0 gap-0 py-0', className)} aria-labelledby={id} role="region">
      <CardContent className="p-4 sm:p-5">
        <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1.5">
          <h2 id={id} className="text-lg font-semibold leading-tight text-balance">
            {title}
          </h2>
          {aside && <div className="text-xs text-muted-foreground">{aside}</div>}
        </header>
        {children}
      </CardContent>
    </Card>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="py-2 text-sm text-muted-foreground">{children}</p>;
}
