import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Montserrat } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Toaster } from "sonner";

import "../globals.css";
import { routing, type Locale } from "@/i18n/routing";
import { siteConfig } from "@/config/site";
import SmoothScrollProvider from "@/components/providers/SmoothScrollProvider";
import { Preloader } from "@/components/layout/Preloader";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { WhatsAppButton } from "@/components/ui/WhatsAppButton";
import { themeInitScript } from "@/components/layout/ThemeToggle";

/* Fuentes self-hosted por next/font: cero requests a fonts.googleapis.com
   y cero CLS gracias al `size-adjust` que Next calcula solo.
   `display: swap` muestra el fallback de inmediato en vez de texto invisible.

   Toda la tipografía del sitio es Montserrat. Se expone en tres variables
   CSS (`--font-montserrat` y los alias `--font-cormorant` / `--font-josefin`
   que quedaron de las fuentes anteriores) para no tener que tocar cada
   componente que las referencia directamente. */
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  preload: true,
});

/** Prerenderiza los tres idiomas en build: nada se genera on-demand. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // El tema de la barra del navegador acompaña al fondo real de la página.
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0A1A14" },
    { media: "(prefers-color-scheme: light)", color: "#F7F4EC" },
  ],
  colorScheme: "dark light",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  /* hreflang: le dice a Google que las tres URLs son la misma página en
     distintos idiomas, en vez de contenido duplicado. */
  const languages = Object.fromEntries(
    routing.locales.map((l) => [l, `${siteConfig.url}/${l}`])
  );

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: t("title"),
      template: t("titleTemplate"),
    },
    description: t("description"),
    applicationName: siteConfig.name,
    authors: [{ name: siteConfig.legalName }],
    creator: siteConfig.legalName,
    publisher: siteConfig.legalName,
    keywords: [
      "AguaVista",
      "condominio privado Paraguay",
      "lotes Río Paraná",
      "barrio cerrado Paraguay",
      "golf Paraguay",
      "aeropuerto ejecutivo",
      "inversión inmobiliaria Paraguay",
    ],
    alternates: {
      canonical: `${siteConfig.url}/${locale}`,
      languages: { ...languages, "x-default": `${siteConfig.url}/es` },
    },
    /* Open Graph: esto es lo que se ve al compartir por WhatsApp,
       Instagram, Facebook y LinkedIn. 1200x630 es el tamaño que todas
       las plataformas recortan sin cortar el logo. */
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title: t("title"),
      description: t("description"),
      url: `${siteConfig.url}/${locale}`,
      locale: locale === "pt" ? "pt_BR" : locale === "en" ? "en_US" : "es_PY",
      alternateLocale: routing.locales
        .filter((l) => l !== locale)
        .map((l) => (l === "pt" ? "pt_BR" : l === "en" ? "en_US" : "es_PY")),
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: siteConfig.tagline,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: [siteConfig.ogImage],
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      // iOS ignora el manifest para el ícono de "Agregar a inicio".
      apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    },
    manifest: "/manifest.webmanifest",
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large" },
    },
    formatDetection: { telephone: true, address: false, email: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Habilita el render estático de este árbol para el locale pedido.
  setRequestLocale(locale as Locale);
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <html
      lang={locale}
      // El data-theme lo escribe themeInitScript antes del primer paint;
      // React no debe quejarse de que el HTML del servidor no lo tenga.
      suppressHydrationWarning
      className={`${montserrat.variable} h-full`}
    >
      <head>
        {/* Antes de cualquier CSS: evita el flash de tema equivocado. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col bg-base text-ink antialiased">
        {/* Primer elemento tabulable: salta el navbar completo. */}
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:rounded-full focus:bg-[color:var(--av-vivo)] focus:px-5 focus:py-3 focus:font-sans focus:text-xs focus:font-medium focus:uppercase focus:tracking-widest focus:text-[#08150F]"
        >
          {t("skipToContent")}
        </a>

        <NextIntlClientProvider>
          <Preloader />
          <SmoothScrollProvider>
            <Navbar />
            <main id="contenido" className="flex flex-1 flex-col">
              <PageTransition>{children}</PageTransition>
            </main>
            <Footer />
            <WhatsAppButton />
          </SmoothScrollProvider>

          <Toaster
            position="bottom-right"
            // Se estilan con los tokens del sitio en vez del tema propio de
            // sonner, para que el toast no rompa la estética en dark ni light.
            toastOptions={{
              unstyled: false,
              classNames: {
                toast:
                  "av-glass !rounded-2xl !shadow-av-lg !font-sans !text-ink !border",
                title: "!font-medium !text-[13px] !tracking-wide",
                description: "!text-ink-muted !text-[12px] !font-light",
                success: "![--normal-border:var(--av-vivo)]",
                error: "![--normal-border:#E2725B]",
              },
            }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
