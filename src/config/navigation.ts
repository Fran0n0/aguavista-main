/**
 * Enlaces de navegación, compartidos por el navbar, el drawer mobile y
 * el footer.
 *
 * Vive en su propio módulo (sin "use client") a propósito: cuando estaba
 * exportado desde Navbar.tsx, el Footer —que es server component— recibía
 * una referencia de cliente en vez del array y el build reventaba con
 * "NAV_LINKS.map is not a function".
 *
 * `key` es la clave de traducción bajo el namespace `nav`.
 */
export const NAV_LINKS = [
  { key: "inicio", href: "#inicio" },
  { key: "amenities", href: "#amenities" },
  { key: "lotes", href: "#lotes" },
  { key: "faq", href: "#faq" },
] as const;

export type NavLink = (typeof NAV_LINKS)[number];
