"use client";

import { Mail, MapPin, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { siteConfig } from "@/config/site";
import { ContactForm } from "@/components/forms/ContactForm";
import { Reveal } from "@/components/motion/Reveal";
import { SplitText } from "@/components/motion/SplitText";
import { SocialLinks } from "@/components/layout/SocialLinks";

const DIRECT = [
  {
    key: "phone" as const,
    Icon: Phone,
    value: siteConfig.contact.phone,
    href: `tel:${siteConfig.contact.phoneRaw}`,
  },
  {
    key: "email" as const,
    Icon: Mail,
    value: siteConfig.contact.email,
    href: `mailto:${siteConfig.contact.email}`,
  },
  {
    key: "address" as const,
    Icon: MapPin,
    value: siteConfig.contact.address,
    href: null,
  },
];

export function Contact() {
  const t = useTranslations("contact");
  const td = useTranslations("contact.direct");

  return (
    <section id="contacto" className="av-glow relative bg-base py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          {/* ── Encabezado y datos directos ── */}
          <div className="lg:col-span-5">
            <Reveal>
              <span className="av-kicker">{t("kicker")}</span>
            </Reveal>

            <SplitText
              as="h2"
              text={t("title")}
              className="mt-4 font-display text-[clamp(2rem,5vw,3.5rem)] font-light leading-[1.08] text-ink"
            />

            <Reveal delay={0.15}>
              <p className="mt-5 max-w-md text-balance font-sans text-sm font-light leading-relaxed text-ink-muted md:text-base">
                {t("subtitle")}
              </p>
            </Reveal>

            <Reveal delay={0.25} className="mt-12">
              <h3 className="av-kicker text-ink-faint">{td("title")}</h3>
              <ul className="mt-5 flex flex-col gap-5">
                {DIRECT.map(({ key, Icon, value, href }) => {
                  const body = (
                    <>
                      <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[color:var(--av-border)] text-ink-muted transition-colors duration-500 group-hover:border-[color:var(--av-vivo)] group-hover:text-vivo">
                        <Icon className="size-4" strokeWidth={1.5} aria-hidden="true" />
                      </span>
                      <span className="flex flex-col gap-0.5">
                        <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                          {td(key)}
                        </span>
                        <span className="font-sans text-sm font-light text-ink-mid transition-colors duration-300 group-hover:text-ink">
                          {value}
                        </span>
                      </span>
                    </>
                  );

                  return (
                    <li key={key}>
                      {href ? (
                        <a href={href} className="group flex items-center gap-4">
                          {body}
                        </a>
                      ) : (
                        <div className="group flex items-center gap-4">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>

              <SocialLinks className="mt-9" />
            </Reveal>
          </div>

          {/* ── Formulario ── */}
          <Reveal delay={0.2} direction="up" className="lg:col-span-7">
            <div className="av-glass rounded-3xl p-6 shadow-av-lg md:p-10">
              <ContactForm />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
