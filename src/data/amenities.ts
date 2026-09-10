/**
 * Catálogo de amenities.
 *
 * Solo los datos estructurales viven acá — títulos y descripciones salen
 * de messages/*.json bajo `amenities.items.<id>`. Todas las rutas de
 * imagen están verificadas contra /public: la versión anterior del sitio
 * referenciaba 11 archivos inexistentes (spa1, club1, nautica1…) que
 * salían rotos en producción.
 */

export interface Amenity {
  /**
   * Portada: es la que se ve en la tarjeta del riel y la primera del
   * carrusel del detalle. Se mantiene como campo propio (y no como
   * `images[0]`) porque la tabla de Supabase la tiene `not null` y es lo
   * que garantiza que una amenity siempre tenga algo que mostrar.
   */
  image: string;
  id: string;
  /**
   * Fotos adicionales de la misma zona, en orden. La portada NO se repite
   * acá: el carrusel del detalle la antepone. Vacío o ausente = una sola
   * foto y el carrusel no muestra controles.
   */
  gallery?: readonly string[];
  /** Reel opcional que se reproduce sobre la portada en el detalle. */
  video?: string;
  /**
   * Marca editorial. Desde que la sección es un riel de tarjetas
   * idénticas ya no cambia la geometría; se conserva porque la usa el
   * panel para ordenar y puede volver a tener efecto visual.
   */
  featured?: boolean;
}

export const AMENITIES: readonly Amenity[] = [
  {
    id: "golf",
    image: "/golf1.webp",
    gallery: ["/golf.webp", "/golf2.webp"],
    video: "/golfreel.mp4",
    featured: true,
  },
  { id: "nautica", image: "/nautica.webp", gallery: ["/foto-4.webp", "/foto-2.webp"] },
  { id: "playa", image: "/playa.webp", gallery: ["/foto-7.webp", "/foto-2.webp"] },
  {
    id: "tenis",
    image: "/tenis1.webp",
    gallery: ["/tenis.webp", "/tenis2.webp"],
    video: "/tenisreel.mp4",
  },
  { id: "spa", image: "/spa.webp", gallery: ["/foto-5.webp"] },
  {
    id: "aeropuerto",
    image: "/aero1.webp",
    gallery: ["/aero2.webp", "/aero3.webp", "/aeropuerto.webp"],
    video: "/aeropuertoreel.mp4",
    featured: true,
  },
  { id: "jardin", image: "/foto-5.webp", gallery: ["/foto-6.webp"] },
  { id: "agua", image: "/foto-7.webp", gallery: ["/foto-2.webp", "/playa.webp"] },
] as const;
