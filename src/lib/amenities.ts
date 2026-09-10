import "server-only";

import { getTranslations } from "next-intl/server";
import { AMENITIES } from "@/data/amenities";
import { getServiceClient } from "./supabase-admin";
import { locales, type Locale } from "@/i18n/routing";

/** Amenity ya resuelta para un idioma concreto, lista para renderizar. */
export interface ResolvedAmenity {
  id: string;
  /** Portada. Siempre presente; es `images[0]`. */
  image: string;
  /**
   * Carrusel completo del detalle: la portada primero y después las fotos
   * adicionales. Nunca vacío —como mínimo trae la portada— así que el
   * componente puede recorrerlo sin comprobar nada.
   */
  images: string[];
  video: string | null;
  featured: boolean;
  title: string;
  description: string;
  descriptionLong: string;
}

/** Fila cruda de la tabla `amenities`. Ver supabase/schema.sql. */
export interface AmenityRow {
  id: string;
  sort_order: number;
  enabled: boolean;
  image: string;
  /**
   * Columna `text[]` con las fotos adicionales, sin la portada.
   *
   * Es opcional en el tipo a propósito: una base que todavía no corrió la
   * migración devuelve filas sin esta clave, y el sitio tiene que seguir
   * funcionando con una sola foto en vez de romper.
   */
  gallery?: string[] | null;
  video: string | null;
  featured: boolean;
  title_es: string | null;
  title_en: string | null;
  title_pt: string | null;
  description_es: string | null;
  description_en: string | null;
  description_pt: string | null;
  description_long_es: string | null;
  description_long_en: string | null;
  description_long_pt: string | null;
}

/** Columnas traducibles, para armar nombres tipo `title_es` sin castear. */
export const AMENITY_TEXT_FIELDS = ["title", "description", "description_long"] as const;

/**
 * Arma el carrusel: portada primero, después las adicionales.
 *
 * Filtra vacíos y duplicados. Lo de los duplicados no es teórico: en el
 * panel es fácil pegar la portada otra vez en la galería, y el carrusel
 * mostraría la misma foto dos veces seguidas.
 */
export function buildImageList(cover: string, gallery?: string[] | null): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [cover, ...(gallery ?? [])]) {
    const url = raw?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  // Si la portada viniera vacía, `out` podría quedar sin nada; el llamador
  // garantiza que `cover` existe, pero el fallback evita un carrusel de 0.
  return out.length ? out : [cover];
}

function pick(row: AmenityRow, field: string, locale: Locale): string {
  const value = (row as unknown as Record<string, string | null>)[`${field}_${locale}`];
  // Si falta la traducción se cae al español, que es el idioma base de
  // carga del panel. Mejor un texto en otro idioma que un hueco vacío.
  return value?.trim() || (row as unknown as Record<string, string | null>)[`${field}_es`] || "";
}

/**
 * Devuelve las amenities para un idioma.
 *
 * Prioridad:
 *   1. Tabla `amenities` de Supabase (lo que edita el panel /admin).
 *   2. Si no hay credenciales, la tabla no existe o está vacía:
 *      el catálogo estático de src/data/amenities.ts + los textos de
 *      messages/*.json.
 *
 * El fallback no es defensivo por gusto: permite levantar el proyecto y
 * verlo completo sin configurar Supabase, y evita que un error de red
 * deje la sección en blanco en producción.
 */
export async function getAmenities(locale: Locale): Promise<ResolvedAmenity[]> {
  const supabase = getServiceClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("amenities")
      .select("*")
      .eq("enabled", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.warn("[amenities] Supabase falló, se usa el catálogo estático:", error.message);
    } else if (data && data.length > 0) {
      return (data as AmenityRow[]).map((row) => ({
        id: row.id,
        image: row.image,
        images: buildImageList(row.image, row.gallery),
        video: row.video,
        featured: row.featured,
        title: pick(row, "title", locale),
        description: pick(row, "description", locale),
        descriptionLong: pick(row, "description_long", locale),
      }));
    }
  }

  const t = await getTranslations({ locale, namespace: "amenities.items" });
  return AMENITIES.map((a) => ({
    id: a.id,
    image: a.image,
    images: buildImageList(a.image, a.gallery ? [...a.gallery] : null),
    video: a.video ?? null,
    featured: Boolean(a.featured),
    title: t(`${a.id}.title`),
    description: t(`${a.id}.description`),
    descriptionLong: t(`${a.id}.descriptionLong`),
  }));
}

/**
 * Siembra la tabla `amenities` con el catálogo estático traducido.
 * La usa el panel la primera vez, para no tener que cargar ocho fichas
 * a mano en los tres idiomas.
 */
export async function buildSeedRows(): Promise<AmenityRow[]> {
  const byLocale = Object.fromEntries(
    await Promise.all(
      locales.map(async (l) => [
        l,
        await getTranslations({ locale: l, namespace: "amenities.items" }),
      ])
    )
  ) as Record<Locale, Awaited<ReturnType<typeof getTranslations>>>;

  return AMENITIES.map((a, index) => {
    const row: Record<string, unknown> = {
      id: a.id,
      sort_order: index,
      enabled: true,
      image: a.image,
      gallery: a.gallery ? [...a.gallery] : [],
      video: a.video ?? null,
      featured: Boolean(a.featured),
    };
    for (const l of locales) {
      row[`title_${l}`] = byLocale[l](`${a.id}.title`);
      row[`description_${l}`] = byLocale[l](`${a.id}.description`);
      row[`description_long_${l}`] = byLocale[l](`${a.id}.descriptionLong`);
    }
    return row as unknown as AmenityRow;
  });
}
