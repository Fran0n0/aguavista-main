/**
 * Bloqueo de scroll para modales y drawers.
 *
 * Poner `overflow: hidden` en el body no alcanza en este sitio: el scroll
 * suave de Lenis (SmoothScrollProvider) mueve la ventana por su cuenta e
 * ignora ese overflow, así que con un modal abierto la página seguía
 * corriendo por detrás. Este bloqueo hace las dos cosas: corta el overflow
 * del documento Y avisa a Lenis por un evento para que se pause.
 *
 * Lleva un contador: si se abren dos cosas a la vez (menú + modal), el
 * scroll recién vuelve cuando se cierra la última.
 */

export const SCROLL_LOCK_EVENT = "av:scroll-lock";

let locks = 0;
let saved = { html: "", body: "", padding: "" };

export function lockScroll(): () => void {
  const html = document.documentElement;
  const { body } = document;

  if (locks === 0) {
    // Compensar la scrollbar evita el salto lateral del contenido.
    const scrollbar = window.innerWidth - html.clientWidth;
    saved = { html: html.style.overflow, body: body.style.overflow, padding: body.style.paddingRight };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    window.dispatchEvent(new CustomEvent(SCROLL_LOCK_EVENT, { detail: true }));
  }
  locks += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks -= 1;
    if (locks > 0) return;
    html.style.overflow = saved.html;
    body.style.overflow = saved.body;
    body.style.paddingRight = saved.padding;
    window.dispatchEvent(new CustomEvent(SCROLL_LOCK_EVENT, { detail: false }));
  };
}
