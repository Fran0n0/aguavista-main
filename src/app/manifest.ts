import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} — ${siteConfig.tagline}`,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/es",
    scope: "/",
    display: "standalone",
    background_color: "#0A1A14",
    theme_color: "#0A1A14",
    orientation: "portrait-primary",
    lang: "es",
    categories: ["lifestyle", "business", "travel"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // maskable: Android recorta el ícono a la forma del sistema y este
      // asset ya tiene el margen de seguridad para que no corte el trazo.
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
