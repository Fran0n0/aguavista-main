"use client";

import Image from "next/image";
import { LandPlot, Layers, Percent, Ruler, Trees } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Reveal, StaggerGroup, staggerChild } from "@/components/motion/Reveal";
import { SplitText } from "@/components/motion/SplitText";
import { motion } from "framer-motion";

/* `wide` marca la cifra que ocupa las dos columnas: al ser cinco, la
   última quedaría sola y desalineada en la grilla de dos. */
const STATS = [
  { key: "surface", Icon: Ruler, wide: false },
  { key: "installments", Icon: Layers, wide: false },
  { key: "downpayment", Icon: Percent, wide: false },
  { key: "hectares", Icon: Trees, wide: false },
  { key: "lots", Icon: LandPlot, wide: true },
] as const;

/**
 * Bloque de inversión: foto aérea a sangre con las cifras clave encima.
 * Los valores son strings traducidos ("800 a 1.000 m²", "+1.600") y no
 * números, porque el separador de miles cambia entre es/pt (1.600) e en (1,600).
 */
export function Lotes() {
  const t = useTranslations("stats");

  return (
    <section
      id="lotes"
      className="relative bg-[color:var(--av-surface)] py-24 md:py-32"
    >
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        {/* La imagen va absoluta y el contenido en flujo normal: si fuera
            al revés, en mobile el texto (más alto que la foto) se saldría
            del contenedor. */}
        <div className="av-noise relative isolate overflow-hidden rounded-3xl">
          <Image
            src="/aereo-lotes.webp"
            alt="Vista aérea de los lotes de AguaVista sobre el Río Paraná"
            fill
            loading="lazy"
            sizes="(max-width: 1024px) 100vw, 1340px"
            quality={72}
            /* La foto es cuadrada y la banda es apaisada: anclando el
               encuadre abajo se conserva el barrio y el golf en vez de
               quedarse con la franja de agua y cielo. */
            className="-z-10 object-cover object-bottom"
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background:
                "linear-gradient(100deg, rgba(5,13,9,.92) 0%, rgba(5,13,9,.75) 42%, rgba(5,13,9,.35) 100%)",
            }}
          />

          <div className="flex min-h-[32rem] items-center md:min-h-[36rem]">
            <div className="grid w-full gap-10 p-7 md:grid-cols-2 md:p-14 lg:p-16">
              {/* ── Texto ── */}
              <div className="flex flex-col justify-center">
                <Reveal>
                  <span className="av-kicker flex items-center gap-3 text-[#C8E88A]">
                    <span aria-hidden="true" className="h-px w-8 bg-current" />
                    {t("kicker")}
                  </span>
                </Reveal>

                <h2 className="mt-5 font-display text-[clamp(1.9rem,4.6vw,3.4rem)] font-light leading-[1.05] text-white">
                  <SplitText text={t("title")} className="block" />
                  <SplitText
                    text={t("titleAccent")}
                    delay={0.2}
                    className="mt-1 block italic text-[#C8E88A]"
                  />
                </h2>

                <Reveal delay={0.3} className="mt-9">
                  <Button href="#contacto" variant="primary" size="lg">
                    {t("cta")}
                  </Button>
                </Reveal>
              </div>

              {/* ── Cifras ── */}
              <StaggerGroup className="flex items-center">
                <dl className="grid w-full grid-cols-2 gap-3 md:gap-4">
                  {STATS.map(({ key, Icon, wide }) => (
                    <motion.div
                      key={key}
                      variants={staggerChild}
                      className={`group rounded-2xl border border-white/12 bg-[#050D09]/55 p-5 backdrop-blur-md transition-colors duration-500 hover:border-[color:var(--av-vivo)]/50 md:p-6 ${
                        wide ? "col-span-2" : ""
                      }`}
                    >
                      <Icon
                        className="size-5 text-[#C8E88A] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-0.5"
                        strokeWidth={1.25}
                        aria-hidden="true"
                      />
                      <dd className="mt-4 font-display text-[clamp(1.75rem,4vw,2.5rem)] font-normal leading-none text-white">
                        {t(`${key}.value`)}
                      </dd>
                      <dt className="mt-2 font-sans text-[10px] font-light uppercase tracking-[0.16em] text-white/60">
                        {t(`${key}.label`)}
                      </dt>
                    </motion.div>
                  ))}
                </dl>
              </StaggerGroup>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
