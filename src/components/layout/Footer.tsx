import { Mail, MapPin, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/config/site";
import { NAV_LINKS } from "@/config/navigation";
import { SocialLinks } from "./SocialLinks";
import { LanguageSwitcher } from "./LanguageSwitcher";

/**
 * Footer — server component. Solo el selector de idioma y los íconos de
 * RRSS son islas cliente, así que el resto no cuesta JS.
 */
export async function Footer() {
  const t = await getTranslations("footer");
  const tn = await getTranslations("nav");
  const year = new Date().getFullYear();

  return (
    <footer className="av-glow relative border-t border-[color:var(--av-border-soft)] bg-base">
      <div aria-hidden="true" className="av-hairline absolute inset-x-0 top-0" />

      <div className="mx-auto max-w-[1400px] px-5 py-16 md:px-10 md:py-20">
        <div className="grid gap-12 md:grid-cols-12 md:gap-8">
          {/* ── Marca ── */}
          <div className="md:col-span-4">
            <div className="flex items-center gap-2.5">
              <svg width="30" height="30" viewBox="0 0 100 100" fill="none" aria-hidden="true">
                <circle cx="50" cy="50" r="44" stroke="var(--av-lux)" strokeWidth="3" opacity="0.7" />
                <path
                  d="M26 58c8-9 16-9 24 0s16 9 24 0"
                  stroke="var(--av-vivo)"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                <path
                  d="M32 42l18-14 18 14"
                  stroke="var(--av-lux-light)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="font-display text-xl font-light uppercase tracking-[0.3em] text-ink">
                AguaVista
              </span>
            </div>

            <p className="mt-5 max-w-xs font-sans text-sm font-light leading-relaxed text-ink-muted">
              {t("tagline")}
            </p>

            <SocialLinks className="mt-7" />
          </div>

          {/* ── Navegación ── */}
          <nav className="md:col-span-3" aria-label={t("navTitle")}>
            <h2 className="av-kicker">{t("navTitle")}</h2>
            <ul className="mt-5 flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <li key={link.key}>
                  <a
                    href={link.href}
                    className="group inline-flex items-center gap-2 font-sans text-sm font-light text-ink-mid transition-colors duration-300 hover:text-vivo"
                  >
                    <span
                      aria-hidden="true"
                      className="h-px w-0 bg-[color:var(--av-vivo)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:w-4"
                    />
                    {tn(link.key)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* ── Contacto ── */}
          <div className="md:col-span-3">
            <h2 className="av-kicker">{t("contactTitle")}</h2>
            <ul className="mt-5 flex flex-col gap-4">
              <li>
                <a
                  href={`tel:${siteConfig.contact.phoneRaw}`}
                  className="group flex items-start gap-3 font-sans text-sm font-light text-ink-mid transition-colors duration-300 hover:text-vivo"
                >
                  <Phone
                    className="mt-0.5 size-4 shrink-0 text-ink-faint transition-colors duration-300 group-hover:text-vivo"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  {siteConfig.contact.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="group flex items-start gap-3 font-sans text-sm font-light text-ink-mid transition-colors duration-300 hover:text-vivo"
                >
                  <Mail
                    className="mt-0.5 size-4 shrink-0 text-ink-faint transition-colors duration-300 group-hover:text-vivo"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                  {siteConfig.contact.email}
                </a>
              </li>
              <li className="flex items-start gap-3 font-sans text-sm font-light text-ink-mid">
                <MapPin
                  className="mt-0.5 size-4 shrink-0 text-ink-faint"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <address className="not-italic">{siteConfig.contact.address}</address>
              </li>
            </ul>
          </div>

          {/* ── Legal ── */}
          <div className="md:col-span-2">
            <h2 className="av-kicker">{t("legalTitle")}</h2>
            <ul className="mt-5 flex flex-col gap-3">
              <li>
                <Link
                  href="/privacidad"
                  className="font-sans text-sm font-light text-ink-mid transition-colors duration-300 hover:text-vivo"
                >
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link
                  href="/terminos"
                  className="font-sans text-sm font-light text-ink-mid transition-colors duration-300 hover:text-vivo"
                >
                  {t("terms")}
                </Link>
              </li>
            </ul>
            <LanguageSwitcher variant="footer" className="-ml-3 mt-6" />
          </div>
        </div>

        {/* ── Barra inferior ── */}
        <div className="mt-14 flex flex-col gap-3 border-t border-[color:var(--av-border-soft)] pt-6 md:flex-row md:items-center md:justify-between">
          <p className="font-sans text-[11px] font-light tracking-[0.08em] text-ink-faint">
            © {year} {siteConfig.legalName}. {t("rights")}
          </p>
          <p className="font-sans text-[11px] font-light tracking-[0.08em] text-ink-faint">
            {siteConfig.contact.address}
          </p>
        </div>
      </div>
    </footer>
  );
}
