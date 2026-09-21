'use client';

// SkipToSave — enlace de salto a la barra "Revisar y guardar" (contrato §7.4).
// La barra es fija en pantalla pero queda al FINAL del DOM: con teclado habría
// que recorrer toda la página para llegar. Este enlace solo se ve al recibir el
// foco y solo existe cuando hay cambios sin guardar.

export const SAVE_BAR_ID = 'barra-guardar';
export const SAVE_BUTTON_ID = 'revisar-y-guardar';

export function SkipToSave({ className = '' }: { className?: string }) {
  return (
    <a
      href={`#${SAVE_BAR_ID}`}
      onClick={(e) => {
        e.preventDefault();
        const button = document.getElementById(SAVE_BUTTON_ID) as HTMLButtonElement | null;
        // Si el guardado está bloqueado (botón deshabilitado), el foco va a la barra, que dice por qué.
        (button && !button.disabled ? button : document.getElementById(SAVE_BAR_ID))?.focus();
      }}
      className={`sr-only rounded-md bg-background px-3 py-2 text-sm font-medium text-foreground underline underline-offset-2 outline-none ring-2 ring-ring focus:not-sr-only focus:inline-block ${className}`}
    >
      Ir a Revisar y guardar
    </a>
  );
}
