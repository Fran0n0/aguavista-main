import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Hay un package-lock.json suelto en el Escritorio del usuario y Next
  // lo tomaba como raiz del workspace. Se fija explicitamente.
  turbopack: { root: import.meta.dirname },
  reactStrictMode: true,
  poweredByHeader: false,

  // HTML estatico puro: `npm run build` genera la carpeta /out lista para
  // subir a cualquier hosting sin Node. Requisitos que implica:
  //  - sin server actions, middleware (proxy) ni headers() => el formulario
  //    y el panel /admin estan deshabilitados (ver /_disabled).
  //  - trailingSlash: /es/ => out/es/index.html (funciona en hosting simple).
  output: "export",
  trailingSlash: true,

  images: {
    // El optimizador de next/image necesita servidor; en export se sirven
    // los archivos de /public tal cual.
    unoptimized: true,
  },

  experimental: {
    // Tree-shake por icono en vez de importar el barrel entero de lucide.
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
};

export default withNextIntl(nextConfig);
