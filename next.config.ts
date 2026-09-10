import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Hay un package-lock.json suelto en el Escritorio del usuario y Next
  // lo tomaba como raiz del workspace. Se fija explicitamente.
  turbopack: { root: import.meta.dirname },
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  images: {
    // AVIF primero: ~30% más chico que WebP con la misma calidad percibida.
    formats: ["image/avif", "image/webp"],
    // Breakpoints alineados con el grid real del sitio (evita generar
    // variantes que ningún `sizes` va a pedir nunca).
    deviceSizes: [400, 640, 828, 1080, 1200, 1600, 1920, 2560],
    imageSizes: [64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365,
    // Next 16 solo acepta los valores de `quality` declarados aca; cualquier
    // otro cae silenciosamente a 75. Estos son los que usan los componentes.
    qualities: [55, 62, 70, 72, 75],
    // Imagenes subidas desde el panel: viven en el Storage de Supabase.
    // Sin esta entrada, next/image rechaza la URL remota.
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },

  experimental: {
    // Tree-shake por icono en vez de importar el barrel entero de lucide.
    optimizePackageImports: ["lucide-react", "framer-motion"],
    serverActions: {
      // El panel sube micro-loops de hasta ~5 MB por server action; el
      // limite por defecto (1 MB) los rechazaba con un error opaco.
      bodySizeLimit: "25mb",
    },
  },

  async headers() {
    return [
      {
        // Los assets estáticos tienen hash o son inmutables: cache agresivo.
        source: "/:all*(webp|avif|jpg|jpeg|png|svg|mp4|webm|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
