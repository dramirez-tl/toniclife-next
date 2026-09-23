// Tour guiado de primera vez para el panel del distribuidor.
// Usa driver.js (spotlight + popover). Los pasos se anclan a la navegación via
// atributos data-tour: prefijo "d-" en el sidebar de escritorio y "m-" en la
// barra superior/menú móvil; los pasos "d-red-*" viven dentro de la página
// /distribuidor/red y solo aparecen cuando el tour arranca ahí. Es omitible (✕)
// y repetible desde el botón de ayuda.

import { driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';

const TOUR_KEY = 'tl_distributor_tour_v1';

export function hasSeenDistributorTour(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(TOUR_KEY) === '1';
  } catch {
    return true;
  }
}

export function markDistributorTourSeen(): void {
  try {
    localStorage.setItem(TOUR_KEY, '1');
  } catch {
    /* localStorage no disponible (modo privado): no bloquea el tour */
  }
}

// El sidebar (anclas "d-") se muestra desde 768px (md); por debajo va la barra
// superior/menú móvil (anclas "m-"). Este umbral debe coincidir con el del layout.
function isDesktop(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(min-width: 768px)').matches
  );
}

/**
 * Construye y arranca el recorrido. Filtra los pasos cuyo elemento ancla no
 * exista en el DOM actual (defensivo: p.ej. en breakpoints distintos).
 */
export function startDistributorTour(): void {
  if (typeof window === 'undefined') return;
  const d = isDesktop();

  const steps: DriveStep[] = [
    {
      popover: {
        title: '👋 ¡Bienvenido a tu panel!',
        description:
          'Te damos un recorrido rápido por todo lo que puedes ver y hacer aquí. ' +
          'Puedes omitirlo cuando quieras con la ✕ — y repetirlo después desde el botón de ayuda.',
      },
    },
    {
      element: d ? '[data-tour="d-profile"]' : '[data-tour="m-profile"]',
      popover: {
        title: 'Tu perfil y rango',
        description:
          'Aquí ves tu nombre, tu rango actual y un resumen rápido de tu red y tus comisiones del periodo.',
      },
    },
    {
      element: d ? '[data-tour="d-core-inicio"]' : '[data-tour="m-core-inicio"]',
      popover: {
        title: 'Inicio',
        description:
          'Tu tablero principal: resumen de tu actividad, accesos rápidos y lo más importante de un vistazo.',
      },
    },
    {
      element: d ? '[data-tour="d-core-red"]' : '[data-tour="m-core-red"]',
      popover: {
        title: 'Mi Red',
        description:
          'Tu organización: explora tu red línea por línea, busca y filtra a tus socios en una lista, descarga tu Excel y da de alta nuevos socios o clientes preferentes.',
      },
    },
    // Los tres pasos siguientes viven DENTRO de /distribuidor/red (anclas
    // d-red-*): fuera de esa página el filtro por existencia de abajo los omite.
    {
      element: '[data-tour="d-red-kpis"]',
      popover: {
        title: 'Tu red este periodo',
        description:
          'Tu red este periodo: cuántos compraron, quién califica y quién está en riesgo. Toca una cifra para ver a esos socios en la lista.',
      },
    },
    {
      element: '[data-tour="d-red-explorer"]',
      popover: {
        title: 'Explora por líneas',
        description:
          'Abre cada línea para ver a quién inscribió cada socio. Desde el menú de cada fila puedes ver su ficha, su lista o el volumen de su línea.',
      },
    },
    {
      element: '[data-tour="d-red-export"]',
      popover: {
        title: 'Descarga tu Excel',
        description:
          'Tu Excel se genera en segundo plano; te avisamos cuando esté listo, aunque cambies de página. Es el mismo archivo de siempre.',
      },
    },
    {
      element: d
        ? '[data-tour="d-core-comisiones"]'
        : '[data-tour="m-core-comisiones"]',
      popover: {
        title: 'Comisiones',
        description:
          'Lo que ganas por periodo. Recuerda que el periodo de negocio va del 26 al 25; el detalle se refleja al cierre del periodo.',
      },
    },
    {
      element: d ? '[data-tour="d-core-ventas"]' : '[data-tour="m-core-ventas"]',
      popover: {
        title: 'Ventas',
        description:
          'Tu historial de ventas y el volumen que acumulas para calificar tu rango.',
      },
    },
    {
      element: d ? '[data-tour="d-carrito"]' : '[data-tour="m-more"]',
      popover: {
        title: 'Compartir carrito',
        description: d
          ? 'Arma un carrito y compártelo con tu cliente por enlace para que pague en línea con tu precio de distribuidor.'
          : 'En el menú “Más” está “Compartir carrito”: arma un carrito y compártelo por enlace para que tu cliente pague en línea.',
      },
    },
    {
      element: d ? '[data-tour="d-herramientas"]' : '[data-tour="m-more"]',
      popover: {
        title: 'Herramientas',
        description: d
          ? 'Materiales de marketing y cursos de capacitación para crecer tu negocio.'
          : 'Dentro de “Más” encuentras Materiales de marketing y Capacitación.',
      },
    },
    {
      element: d ? '[data-tour="d-cuenta"]' : '[data-tour="m-more"]',
      popover: {
        title: 'Mi cuenta',
        description: d
          ? 'Tus pagos, notificaciones y la configuración de tu cuenta.'
          : 'Dentro de “Más”: Pagos, Notificaciones y Configuración de tu cuenta.',
      },
    },
    ...(d
      ? [
          {
            element: '[data-tour="d-tienda"]',
            popover: {
              title: 'Ir a la tienda',
              description:
                'Compra productos con tu precio de distribuidor cuando lo necesites.',
            },
          } as DriveStep,
        ]
      : []),
    {
      element: d ? '[data-tour="d-help"]' : '[data-tour="m-help"]',
      popover: {
        title: '¿Quieres verlo otra vez?',
        description:
          'Puedes repetir este recorrido cuando quieras desde este botón de ayuda. ¡Mucho éxito con tu negocio! 🚀',
      },
    },
  ];

  const filtered = steps.filter(
    (s) => !s.element || document.querySelector(s.element as string),
  );

  const drv = driver({
    showProgress: true,
    allowClose: true,
    disableActiveInteraction: true,
    overlayColor: 'rgba(0, 42, 92, 0.7)',
    popoverClass: 'tl-tour',
    nextBtnText: 'Siguiente',
    prevBtnText: 'Atrás',
    doneBtnText: 'Listo',
    progressText: '{{current}} de {{total}}',
    steps: filtered,
    onDestroyed: () => {
      markDistributorTourSeen();
    },
  });

  drv.drive();
}
