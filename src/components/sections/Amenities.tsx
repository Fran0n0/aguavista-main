import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { getAmenities } from "@/lib/amenities";
import { SplitText } from "@/components/motion/SplitText";
import { SlideUp } from "@/components/motion/SlideUp";
import { AmenitiesGrid } from "./AmenitiesGrid";

/**
 * Sección de amenities — server component.
 *
 * Resuelve los datos en el servidor (tabla de Supabase editable desde
 * /admin, con el catálogo estático como respaldo) y le pasa objetos
 * planos ya traducidos a la grilla cliente. Así el contenido llega en el
 * HTML inicial —indexable— y el JS del cliente solo carga la
 * interacción, no los textos.
 */
export async function Amenities({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "amenities" });
  const items = await getAmenities(locale);

  return (
    <section id="amenities" className="av-glow relative bg-base py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        <header className="mx-auto mb-14 max-w-2xl text-center md:mb-20">
          <SlideUp innerClassName="av-kicker">{t("kicker")}</SlideUp>

          <SplitText
            as="h2"
            text={t("title")}
            className="mt-4 font-display text-[clamp(2rem,5vw,3.5rem)] font-light leading-[1.08] text-ink"
          />

          <SlideUp
            delay={0.2}
            innerClassName="text-balance font-sans text-sm font-light leading-relaxed text-ink-muted md:text-base"
            className="mt-5"
          >
            {t("subtitle")}
          </SlideUp>
        </header>

        <AmenitiesGrid items={items} />
      </div>
    </section>
  );
}
