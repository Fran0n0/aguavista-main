/**
 * Contrato de los medios reemplazables desde /admin/media.
 *
 * Vive en config/ y NO en lib/settings.ts a propósito: settings.ts es
 * `server-only` porque abre el cliente de Supabase con service role, y
 * el panel necesita estas etiquetas del lado del cliente. Cuando
 * MediaManager importaba desde settings.ts, el build fallaba con
 * "should only be used from a Server Component" — que es exactamente
 * para lo que está ese guard. Acá solo hay datos y una función pura.
 */

/**
 * Claves conocidas de `site_settings`, con su valor por defecto.
 *
 * Cada clave es un medio reemplazable desde el panel. El valor por
 * defecto es el archivo de /public que ya optimizó
 * scripts/optimize-media.mjs: si nadie tocó el panel, el sitio sirve
 * exactamente los mismos bytes que antes de existir el CMS.
 */
/** Banner alojado fuera del proyecto: no suma peso al repo ni al deploy. */
const HERO_VIDEO_URL =
  "https://video.dalmobile.com.ar/VIDEO%20BANNER%20WEB%20AGUA%20VISTA.mp4";

export const SETTING_DEFAULTS = {
  hero_video: HERO_VIDEO_URL,
  hero_poster: "/banner-poster.webp",
  /* Variante vertical del banner para celular. Hoy apunta al mismo video
     que la de escritorio; cuando exista el corte vertical se cambia acá
     (o desde /admin/media) sin tocar nada más. Acepta rutas de /public,
     URLs del Storage de Supabase o cualquier URL pública. */
  hero_video_mobile: HERO_VIDEO_URL,
  hero_poster_mobile: "/banner-poster.webp",
  reel_1: "/reel.mp4",
  reel_2: "/reel-1.mp4",
  reel_3: "/reel-2.mp4",
  reel_4: "/reel-3.mp4",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type Settings = Record<SettingKey, string>;

/** Etiquetas del panel. Separadas de las claves para no exponer nombres
 *  de columna en la UI y poder renombrarlas sin migrar la tabla. */
export const SETTING_LABELS: Record<SettingKey, string> = {
  hero_video: "Video del hero — PC",
  hero_poster: "Poster del hero — PC",
  hero_video_mobile: "Video del hero — Celular",
  hero_poster_mobile: "Poster del hero — Celular",
  reel_1: "Micro-video 1",
  reel_2: "Micro-video 2",
  reel_3: "Micro-video 3",
  reel_4: "Micro-video 4",
};

/**
 * Poster que acompaña a un micro-loop.
 *
 * Para los archivos de /public existe el .webp hermano que genera
 * scripts/optimize-media.mjs (`/reel.mp4` → `/reel-poster.webp`). Para
 * un video subido al Storage de Supabase ese hermano NO existe, y la
 * sustitución a ciegas producía un poster 404: el video quedaba en
 * negro hasta terminar de bufferear. En ese caso se devuelve
 * `undefined` y el <video> simplemente va sin poster.
 */
export function posterFor(src: string): string | undefined {
  if (!src.startsWith("/") || !src.endsWith(".mp4")) return undefined;
  return src.replace(/\.mp4$/, "-poster.webp");
}
