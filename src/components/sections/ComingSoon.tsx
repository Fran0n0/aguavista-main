"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Compass, Move3d, ScanEye } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { SplitText } from "@/components/motion/SplitText";
import { EASE_LUX } from "@/components/motion/Reveal";

/**
 * Banner que ocupa el lugar del masterplan mientras SHOW_SALES_SECTION
 * está apagado (ver src/config/features.ts).
 *
 * ─────────────────────────────────────────────────────────────────
 *  PARA CAMBIAR LA IMAGEN DE FONDO
 *  1. Poné tu archivo en /public (ej: /public/masterplan-teaser.webp).
 *     Ideal: horizontal, mínimo 2000px de ancho, formato .webp.
 *  2. Cambiá BACKGROUND_IMAGE de abajo por la ruta nueva.
 *  3. Corré `npm run optimize:media` para que quede comprimida y
 *     respaldada como el resto de la media.
 *  4. Actualizá BACKGROUND_ALT con una descripción real de la foto
 *     (sale en los lectores de pantalla y cuenta para SEO).
 * ─────────────────────────────────────────────────────────────────
 */
const BACKGROUND_IMAGE = "/areo.webp";
const BACKGROUND_ALT =
  "Vista aérea del predio de AguaVista sobre el Río Paraná";

const HIGHLIGHTS = [
  { key: "tour", Icon: Move3d },
  { key: "lots", Icon: ScanEye },
  { key: "explore", Icon: Compass },
] as const;

export function ComingSoon() {
  const t = useTranslations("comingSoon");

  return (
    <section
      id="masterplan"
      aria-labelledby="coming-soon-title"
      className="av-glow relative bg-base py-24 md:py-32"
    >
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        <div className="av-noise relative isolate overflow-hidden rounded-3xl border border-[color:var(--av-glass-brd)]">
          <Image
            src={BACKGROUND_IMAGE}
            alt={BACKGROUND_ALT}
            fill
            loading="lazy"
            sizes="(max-width: 1024px) 100vw, 1340px"
            quality={70}
            className="-z-10 scale-105 object-cover opacity-45 blur-[2px]"
          />

          {/* Velo + luces: el fondo queda como textura, no como foto. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background:
                "linear-gradient(160deg, color-mix(in oklab, var(--av-base) 88%, transparent) 0%, color-mix(in oklab, var(--av-base) 96%, transparent) 100%)",
            }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(55% 50% at 20% 10%, var(--av-glow-vivo) 0%, transparent 65%), radial-gradient(45% 40% at 85% 95%, var(--av-glow-lux) 0%, transparent 70%)",
            }}
          />

          <div className="flex min-h-[26rem] flex-col items-center justify-center px-6 py-16 text-center md:min-h-[32rem] md:px-14 md:py-20">
            {/* Píldora de estado con punto que respira. */}
            <Reveal>
              <span className="av-glass inline-flex items-center gap-2.5 rounded-full px-4 py-2">
                <span aria-hidden="true" className="relative grid size-2 place-items-center">
                  <span className="absolute size-2 rounded-full bg-[color:var(--av-vivo)] motion-safe:animate-[av-pulse-ring_2.4s_ease-out_infinite]" />
                  <span className="size-2 rounded-full bg-[color:var(--av-vivo)]" />
                </span>
                <span className="font-sans text-[10px] font-medium uppercase tracking-[0.24em] text-vivo">
                  {t("badge")}
                </span>
              </span>
            </Reveal>

            <SplitText
              as="h2"
              text={t("title")}
              className="mt-7 max-w-3xl font-display text-[clamp(2rem,5.5vw,3.75rem)] font-light leading-[1.06] text-ink"
            />
            <span id="coming-soon-title" className="sr-only">
              {t("title")}
            </span>

            <Reveal delay={0.15}>
              <p className="mx-auto mt-5 max-w-lg text-balance font-sans text-sm font-light leading-relaxed text-ink-muted md:text-base">
                {t("body")}
              </p>
            </Reveal>

            {/* Anticipo de lo que traerá el recorrido 360. */}
            <ul className="mt-11 grid w-full max-w-3xl gap-3 sm:grid-cols-3">
              {HIGHLIGHTS.map(({ key, Icon }, i) => (
                <motion.li
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.7, delay: 0.2 + i * 0.1, ease: EASE_LUX }}
                  className="av-glass group flex flex-col items-center gap-3 rounded-2xl px-5 py-7 transition-colors duration-500 hover:border-[color:var(--av-vivo)]/45"
                >
                  <Icon
                    className="size-5 text-lux transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-0.5"
                    strokeWidth={1.25}
                    aria-hidden="true"
                  />
                  <span className="font-sans text-[11px] font-medium uppercase tracking-[0.18em] text-ink">
                    {t(`highlights.${key}.title`)}
                  </span>
                  <span className="font-sans text-[12px] font-light leading-relaxed text-ink-muted">
                    {t(`highlights.${key}.body`)}
                  </span>
                </motion.li>
              ))}
            </ul>

            <Reveal delay={0.3} className="mt-10">
              <Button href="#contacto" variant="lux" size="lg">
                {t("cta")}
              </Button>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
