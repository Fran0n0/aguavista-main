import { defineRouting } from "next-intl/routing";

export const locales = ["es", "en", "pt"] as const;
export type Locale = (typeof locales)[number];

/** Etiquetas del selector de idioma. `label` es el nombre en su propio
 *  idioma (regla de UX: nunca traducir el nombre de un idioma). */
export const localeMeta: Record<Locale, { label: string; short: string; flag: string }> = {
  es: { label: "Español", short: "ES", flag: "🇵🇾" },
  en: { label: "English", short: "EN", flag: "🇺🇸" },
  pt: { label: "Português", short: "PT", flag: "🇧🇷" },
};

export const routing = defineRouting({
  locales,
  defaultLocale: "es",
  /* "as-needed" dejaría el español sin prefijo (/ en vez de /es).
     Usamos "always" para que las URLs sean simétricas y el hreflang
     apunte a rutas canónicas explícitas en los tres idiomas. */
  localePrefix: "always",
  localeDetection: true,
});
