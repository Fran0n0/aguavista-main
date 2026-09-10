import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing, type Locale } from "@/i18n/routing";
import { siteConfig } from "@/config/site";
import { LegalDocument, type LegalSection } from "@/components/sections/LegalDocument";

/** Fecha real de la última revisión del texto legal.
 *  Se construye con componentes locales y no con la cadena ISO:
 *  `new Date("2026-08-24")` se interpreta como medianoche UTC y en
 *  Paraguay (UTC-3) se mostraba como el 23. */
const LAST_UPDATED = new Date(2026, 7, 24);

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("privacyTitle"),
    description: t("privacyDescription"),
    alternates: {
      canonical: `${siteConfig.url}/${locale}/privacidad`,
      languages: Object.fromEntries(
        routing.locales.map((l) => [l, `${siteConfig.url}/${l}/privacidad`])
      ),
    },
    // No aporta a la búsqueda, pero debe ser rastreable para que los
    // enlaces del footer no queden huérfanos.
    robots: { index: false, follow: true },
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const t = await getTranslations({ locale, namespace: "privacy" });
  const tc = await getTranslations({ locale, namespace: "footer" });

  const updated = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(LAST_UPDATED);

  return (
    <LegalDocument
      title={t("title")}
      updated={t("updated", { date: updated })}
      intro={t("intro")}
      sections={t.raw("sections") as LegalSection[]}
      tocLabel={tc("navTitle")}
    />
  );
}
