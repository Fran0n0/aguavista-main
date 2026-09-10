"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { siteConfig } from "@/config/site";
import { Reveal } from "@/components/motion/Reveal";
import { SplitText } from "@/components/motion/SplitText";
import { cn } from "@/lib/utils";

export interface LegalSection {
  title: string;
  body: string;
}

interface LegalDocumentProps {
  title: string;
  /** Ya formateado: "Última actualización: 24 de agosto de 2026". */
  updated: string;
  intro: string;
  sections: LegalSection[];
  /** Etiqueta del índice lateral. */
  tocLabel: string;
}

/**
 * Documento legal a dos columnas: índice pegajoso a la izquierda, texto
 * a la derecha.
 *
 * Decisiones de lectura:
 *  - Ancho de medida ~68ch. Más largo y el ojo pierde el renglón al
 *    volver a empezar la línea siguiente.
 *  - Interlineado 1.8 y peso 300: texto legal largo se lee mejor con
 *    aire que con densidad.
 *  - El índice usa scroll-spy para marcar dónde estás; en un texto de
 *    once cláusulas eso evita tener que releer para ubicarse.
 */
export function LegalDocument({
  title,
  updated,
  intro,
  sections,
  tocLabel,
}: LegalDocumentProps) {
  const locale = useLocale();
  const [active, setActive] = useState(0);

  const slug = (i: number) => `clausula-${i + 1}`;

  useEffect(() => {
    const headings = sections
      .map((_, i) => document.getElementById(slug(i)))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!headings.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Se toma la entrada más alta de las visibles: al scrollear hacia
        // abajo el índice avanza recién cuando el título cruza el tercio
        // superior, que es donde el lector realmente está leyendo.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!visible) return;
        const index = headings.indexOf(visible.target as HTMLElement);
        if (index >= 0) setActive(index);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );

    headings.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <article className="av-glow av-noise relative overflow-hidden bg-base pb-24 pt-36 md:pb-32 md:pt-44">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        {/* ── Encabezado ── */}
        <header className="mx-auto max-w-[68ch]">
          <Reveal>
            <span className="av-kicker">{siteConfig.name}</span>
          </Reveal>

          <SplitText
            as="h1"
            text={title}
            className="mt-4 font-display text-[clamp(2.25rem,6vw,3.75rem)] font-light leading-[1.05] text-ink"
          />

          <Reveal delay={0.15}>
            <p className="mt-5 font-sans text-[11px] uppercase tracking-[0.2em] text-ink-faint">
              {updated}
            </p>
            <p className="mt-7 font-sans text-[15px] font-light leading-[1.8] text-ink-mid md:text-base">
              {intro}
            </p>
          </Reveal>

          <div aria-hidden="true" className="av-hairline mt-12" />
        </header>

        {/* ── Cuerpo ── */}
        <div className="mt-14 flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">
          {/* Índice */}
          <nav
            aria-label={tocLabel}
            className="lg:sticky lg:top-28 lg:w-64 lg:shrink-0"
          >
            <h2 className="av-kicker mb-4 text-ink-faint">{tocLabel}</h2>
            <ol className="flex flex-col gap-0.5">
              {sections.map((section, i) => (
                <li key={section.title}>
                  <a
                    href={`#${slug(i)}`}
                    aria-current={active === i ? "true" : undefined}
                    className={cn(
                      "group flex items-start gap-2.5 rounded-lg px-3 py-2",
                      "font-sans text-[12px] font-light leading-snug transition-colors duration-300",
                      active === i
                        ? "bg-[color:var(--av-elevated)] text-vivo"
                        : "text-ink-muted hover:text-ink"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-[0.45em] h-px shrink-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        active === i
                          ? "w-4 bg-[color:var(--av-vivo)]"
                          : "w-2 bg-[color:var(--av-border)] group-hover:w-4"
                      )}
                    />
                    {/* El número ya viene en el título ("1. Titularidad"),
                        así que no se repite acá. */}
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* Texto */}
          <div className="flex max-w-[68ch] flex-col gap-11">
            {sections.map((section, i) => (
              <Reveal key={section.title} delay={Math.min(i, 4) * 0.04} amount={0.1}>
                <section>
                  <h2
                    id={slug(i)}
                    className="font-display text-xl font-normal leading-snug text-ink md:text-2xl"
                  >
                    {section.title}
                  </h2>
                  <p className="mt-4 font-sans text-[15px] font-light leading-[1.8] text-ink-muted">
                    {section.body}
                  </p>
                </section>
              </Reveal>
            ))}

            {/* Pie de contacto */}
            <Reveal>
              <div className="rounded-2xl border border-[color:var(--av-border-soft)] bg-[color:var(--av-surface)] p-7">
                <p
                  lang={locale}
                  className="font-sans text-sm font-light leading-relaxed text-ink-muted"
                >
                  {siteConfig.legalName} · {siteConfig.contact.address}
                  <br />
                  <a
                    href={`mailto:${siteConfig.contact.email}`}
                    className="text-vivo underline underline-offset-4 transition-opacity hover:opacity-75"
                  >
                    {siteConfig.contact.email}
                  </a>
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </article>
  );
}
