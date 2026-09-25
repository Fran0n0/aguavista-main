"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const getSnapshot = () => window.matchMedia(QUERY).matches;

/* En el servidor no hay preferencia que leer: se asume movimiento normal. */
const getServerSnapshot = () => false;

/**
 * Igual que `useReducedMotion` de framer, pero sin romper la hidratación.
 *
 * El de framer ya devuelve la preferencia real en el primer render del
 * navegador, mientras que el servidor —que no la conoce— dibujó la versión
 * animada. Para quien tiene "Reducir movimiento" activado, los componentes
 * que dibujan distinto según ese valor no coinciden con el HTML del servidor
 * y React rearma el árbol entero con un error de hidratación.
 *
 * `useSyncExternalStore` usa `getServerSnapshot` durante la hidratación
 * (así coincide con el servidor) y recién después lee la preferencia real.
 * Mismo patrón que el tema en ThemeToggle.
 *
 * Usarlo en componentes que ELIGEN QUÉ DIBUJAR según la preferencia. Si solo
 * se lee dentro de un efecto (como en el Preloader) no hay nada que
 * desincronizar, y cambiar de hook alteraría cuándo corre ese efecto.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
