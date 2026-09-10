/**
 * Fuente única de verdad para datos de marca, contacto y RRSS.
 * Todo lo que aparezca en más de un lugar (footer, metadata, JSON-LD,
 * botón de WhatsApp) sale de acá para que no se desincronice.
 *
 * Ya no queda nada pendiente: dirección, coordenadas y código Plus salen
 * de la ficha de Google Maps del predio y alimentan el JSON-LD de negocio
 * local (ver el @graph en src/app/[locale]/page.tsx).
 */

export const siteConfig = {
  name: "AguaVista",
  legalName: "AguaVista S.A.",
  tagline: "Condominio privado a orillas del Río Paraná",
  description:
    "Condominio privado de 1.200 hectáreas sobre el Río Paraná. Golf profesional, náutica, aeropuerto ejecutivo y lotes desde 800 m² con financiación a 72 cuotas.",

  /* Sin barra final: se concatena con las rutas. Configurable por entorno
     para que los OG y el sitemap apunten bien en preview y en producción. */
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://aguavista.com.py",

  ogImage: "/og/aguavista-og.jpg",

  contact: {
    /** Formato visible en pantalla. */
    phone: "+595 984 488000",
    /** Para el enlace tel:. Solo + y dígitos. */
    phoneRaw: "+595984488000",
    /** Para wa.me/. Solo dígitos, sin + ni espacios. */
    whatsapp: "595984488000",
    email: "comercial@aguavista.com.py",
    /**
     * Dirección de una línea, tal como la devuelve Google Maps. Es la que
     * se imprime en el footer, en la sección de contacto y en el pie de
     * los documentos legales. Para el JSON-LD se usa `addressParts`, que
     * es la misma dirección desglosada.
     */
    address: "Antequera esquina 25 de mayo, local 1., Encarnación, Paraguay",
  },

  /**
   * La misma dirección, desglosada en los campos de schema.org/PostalAddress.
   * Google prefiere las partes separadas antes que una sola cadena: con
   * `addressLocality` y `addressRegion` explícitos puede ubicar la ficha en
   * el departamento correcto sin geocodificar el texto.
   */
  addressParts: {
    streetAddress: "Antequera esquina 25 de mayo, local 1.",
    addressLocality: "Encarnación",
    addressRegion: "Itapúa",
    postalCode: "6000",
    addressCountry: "PY",
  },

  /* Para quitar una red que no se use, borrá su objeto: los íconos del
     footer, de la sección de contacto y del drawer se recalculan solos. */
  social: [
    {
      name: "Instagram",
      href: "https://www.instagram.com/solariparaguay/",
      icon: "instagram",
    },
    {
      name: "Facebook",
      href: "https://www.facebook.com/aguavista/?locale=es_LA",
      icon: "facebook",
    },
  ] as const,

  /** Coordenadas de la entrada del predio (Google Maps). */
  geo: { lat: -27.295611, lng: -55.989439 },

  /**
   * Código Plus de Google (Open Location Code). Es la referencia que
   * funciona donde no hay numeración de calles, que es exactamente el caso
   * del predio: se pega en el buscador de Maps y cae en la entrada.
   */
  plusCode: "P236+J6 San Juan del Paraná, Paraguay",
} as const;

export type SiteConfig = typeof siteConfig;