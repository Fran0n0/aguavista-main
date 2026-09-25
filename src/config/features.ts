/**
 * Interruptores de secciones.
 *
 * Se prefieren flags a comentar bloques de JSX: el código sigue
 * compilando y tipando, así que no se pudre mientras está apagado.
 */

/**
 * Masterplan interactivo ("Nuestras áreas en venta").
 *
 * APAGADO a la espera de integrar la navegación 360 definitiva.
 * Mientras tanto se muestra <ComingSoon /> en su lugar.
 *
 * Para volver a prenderlo: poner `true`. No hace falta tocar nada más
 * — el componente, sus tipos y el panel /admin que lo alimenta siguen
 * intactos y compilando.
 */
export const SHOW_SALES_SECTION = false;

/**
 * Antesala del masterplan ("Conocé el predio desde el aire").
 *
 * PRENDIDA: estuvo oculta mientras el plano estaba en preparación y volvió
 * con el mapa animado dibujado sobre el plano real (PredioMap).
 *
 * Para ocultarla de nuevo: poner `false`. El componente sigue compilando
 * mientras está apagado.
 */
export const SHOW_COMING_SOON = true;

