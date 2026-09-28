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
/*
 * Banner principal. Antes se servía el archivo de edición desde
 * video.dalmobile.com.ar: 69 MB a 42 Mbps, lo primero que bajaba cada
 * visitante. Estas son versiones para web hechas desde ese mismo original
 * (H.264 CRF 21, faststart, sin audio): 8 MB a 1920×1080 para escritorio y
 * 3,5 MB para celular, que es el recorte central vertical (608×1080) — lo
 * único que se ve con object-cover en un teléfono. SSIM 0,97 contra el
 * original.
 */
export const SETTING_DEFAULTS = {
  hero_video: "/hero-1080.mp4",
  hero_poster: "/hero-poster.webp",
  /* Acepta rutas de /public, URLs del Storage de Supabase o cualquier URL
     pública; se puede reemplazar desde /admin/media sin tocar código. */
  hero_video_mobile: "/hero-mobile.mp4",
  hero_poster_mobile: "/hero-poster-mobile.webp",
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
