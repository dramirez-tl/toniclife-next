// Migas de pan: <nav aria-label> + <ol>, enlaces con locale y la página vigente
// como texto con aria-current. Sin hooks: sirve en Server y Client Components.

import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

export interface BreadcrumbEntry {
  label: string;
  /** Ruta SIN locale ('/', '/productos?categoria=cremas'). Sin href = página vigente. */
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbEntry[];
  ariaLabel: string;
  className?: string;
}

export function Breadcrumbs({ items, ariaLabel, className }: BreadcrumbsProps) {
  return (
    <nav aria-label={ariaLabel} className={cn('text-sm', className)}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-gray-700">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-2">
              {index > 0 && (
                <span aria-hidden="true" className="text-gray-500">
                  /
                </span>
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="rounded-sm py-1 underline-offset-4 hover:text-[#2f5165] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3E667D]"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} className="line-clamp-1 font-medium text-gray-900">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
