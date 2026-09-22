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
 * APAGADA por pedido del cliente: con el plano todavía en preparación,
 * la sección se oculta entera en vez de mostrar el placeholder.
 *
 * Para volver a prenderla: poner `true`. Igual que arriba, el
 * componente sigue compilando mientras está apagado.
 */
export const SHOW_COMING_SOON = false;

