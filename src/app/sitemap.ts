import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/config/site";

/** Rutas públicas indexables, sin el prefijo de idioma. */
const ROUTES = [
  { path: "", priority: 1, changeFrequency: "weekly" as const },
  { path: "/privacidad", priority: 0.3, changeFrequency: "yearly" as const },
  { path: "/terminos", priority: 0.3, changeFrequency: "yearly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return ROUTES.flatMap((route) =>
    routing.locales.map((locale) => ({
      url: `${siteConfig.url}/${locale}${route.path}`,
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      // alternates hace que Google entienda las tres versiones como una
      // sola página traducida, en vez de tres URLs compitiendo entre sí.
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, `${siteConfig.url}/${l}${route.path}`])
        ),
      },
    }))
  );
}
