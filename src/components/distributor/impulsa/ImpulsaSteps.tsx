// Los 6 puntos del logo de IMPULSA ("cada paso, una Victoria") como avance de la ruta: se encienden
// las Victorias que la persona ya recorrió y la de hoy, que lleva un aro azul. Es un adorno: el día
// y la Victoria se dicen con texto junto a él.

import { cn } from '@/lib/utils';

// Suben como en el logo: poco al principio y más al final. En rem, para que crezcan con el texto.
const RISE_REM = [0, 0.15, 0.4, 0.8, 1.3, 1.9];

interface ImpulsaStepsProps {
  /** Victoria en la que va hoy (1 … 6); null = ya recorrió sus 90 días: los 6 puntos encendidos, sin aro. */
  current: number | null;
  className?: string;
}

export function ImpulsaSteps({ current, className }: ImpulsaStepsProps) {
  return (
    <div className={cn('flex items-end gap-2', className)} aria-hidden>
      {RISE_REM.map((rise, index) => {
        const number = index + 1;
        const on = current === null || number <= current;
        return (
          <span
            key={number}
            style={{ marginBottom: `${rise}rem` }}
            className={cn(
              'size-3.5 shrink-0 rounded-full',
              // Amarillo, amarillo, naranja: el mismo ritmo de los puntos del logo.
              on ? (number % 3 === 0 ? 'bg-impulsa-orange' : 'bg-impulsa-yellow') : 'bg-impulsa-blue/15',
              number === current && 'ring-2 ring-impulsa-blue ring-offset-2 ring-offset-white',
            )}
          />
        );
      })}
    </div>
  );
}
