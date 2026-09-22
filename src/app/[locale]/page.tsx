import dynamic from "next/dynamic";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { siteConfig } from "@/config/site";

import { Hero } from "@/components/sections/Hero";
import { Amenities } from "@/components/sections/Amenities";
import { Lotes } from "@/components/sections/Lotes";
import { Contact } from "@/components/sections/Contact";
import { Faq } from "@/components/sections/Faq";
import { ZoomParallax } from "@/components/ui/zoom-parallax";
import VerticalReels from "@/components/lifestyle/VerticalReels";
import { ComingSoon } from "@/components/sections/ComingSoon";
import { MapSkeleton } from "@/components/ui/Skeleton";
import { SHOW_COMING_SOON, SHOW_SALES_SECTION } from "@/config/features";
import { posterFor } from "@/config/media";
import { getSettings } from "@/lib/settings";

/**
 * El masterplan arrastra el SDK de Supabase y un canvas pesado. Cargarlo
 * bajo demanda lo saca del bundle inicial: no se descarga hasta que el
 * visitante llega a esa altura de la página.
 *
 * Hoy está detrás de SHOW_SALES_SECTION (apagado): con el flag en false
 * este import ni siquiera se evalúa y el chunk no se genera.
 */
const InteractiveMap = dynamic(() => import("@/components/masterplan/InteractiveMap"), {
  loading: () => (
    <div className="mx-auto max-w-[1400px] px-5 py-24 md:px-10">
      <MapSkeleton />
    </div>
  ),
});

export function generateStaticParams() {
  return routing.locales.map((locale: string) => ({ locale }));
}

interface FaqItem {
  q: string;
  a: string;
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const t = await getTranslations({ locale, namespace: "faq" });
  const tm = await getTranslations({ locale, namespace: "metadata" });
  const faqItems = t.raw("items") as FaqItem[];

  /* Medios reemplazables desde /admin/media. Si no hay Supabase esto
     devuelve los archivos de /public, así que no agrega un punto de
     falla: el peor caso es exactamente el comportamiento anterior. */
  const media = await getSettings();
  const reels = [media.reel_1, media.reel_2, media.reel_3, media.reel_4];

  /* Datos estructurados. El bloque FAQPage habilita el acordeón
     desplegable en los resultados de Google; RealEstateAgent + geo
     alimentan la ficha del negocio local. */
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "RealEstateAgent",
        "@id": `${siteConfig.url}/#organization`,
        name: siteConfig.name,
        legalName: siteConfig.legalName,
        description: tm("description"),
        url: siteConfig.url,
        image: `${siteConfig.url}${siteConfig.ogImage}`,
        telephone: siteConfig.contact.phoneRaw,
        email: siteConfig.contact.email,
        address: {
          "@type": "PostalAddress",
          ...siteConfig.addressParts,
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: siteConfig.geo.lat,
          longitude: siteConfig.geo.lng,
        },
        /* El código Plus es la propiedad que Google usa para resolver
           direcciones sin numeración de calle, que es el caso del predio. */
        hasMap: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          siteConfig.plusCode
        )}`,
        areaServed: { "@type": "Country", name: "Paraguay" },
        sameAs: siteConfig.social.map((s) => s.href),
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        url: `${siteConfig.url}/${locale}`,
        name: siteConfig.name,
        inLanguage: locale,
        publisher: { "@id": `${siteConfig.url}/#organization` },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqItems.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // JSON.stringify de un objeto construido en el servidor: no hay
        // entrada de usuario en juego, así que no hay riesgo de inyección.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Hero
        video={media.hero_video}
        poster={media.hero_poster}
        videoMobile={media.hero_video_mobile}
        posterMobile={media.hero_poster_mobile}
      />

      <ZoomParallax
        images={[
          // Esta es la imagen central que se oscurece
          { src: "/collagemed.webp", alt: "Experiencia AguaVista", isCenter: true },
          // Estas son las 5 imágenes periféricas que salen volando
          { src: "/amenities-golf.webp", alt: "Cancha de Golf en AguaVista" },
          { src: "/amenities-nautica.webp", alt: "Marina Privada AguaVista" },
          { src: "/amenities-playa.webp", alt: "Playa Privada" },
          { src: "/amenities-spa.webp", alt: "Spa y Relax" },
          { src: "/amenities-eventos.webp", alt: "Eventos exclusivos" },
        ]}
      />

      <Amenities locale={locale as Locale} />
      <VerticalReels reels={reels} posters={reels.map(posterFor)} />
      <Lotes />

      {/* Masterplan interactivo: apagado hasta integrar la navegación
          360. El código sigue vivo y tipado detrás del flag; para volver
          a prenderlo alcanza con SHOW_SALES_SECTION = true.

          Su antesala (<ComingSoon />) también está oculta por pedido del
          cliente mientras el plano esté en preparación: SHOW_COMING_SOON
          = true la vuelve a mostrar. */}
      {SHOW_SALES_SECTION ? (
        <section id="masterplan" aria-label="Masterplan">
          <InteractiveMap />
        </section>
      ) : SHOW_COMING_SOON ? (
        <ComingSoon />
      ) : null}

      <Contact />
      <Faq />
    </>
  );
}
