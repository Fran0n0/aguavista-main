"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { SplitText } from "@/components/motion/SplitText";
import { PredioMap, ZONES } from "@/components/masterplan/PredioMap";
import type { ZoneId } from "@/components/masterplan/predio";

/**
 * Masterplan ilustrado e interactivo.
 *
 * Ocupa el lugar del masterplan de ventas mientras SHOW_SALES_SECTION está
 * apagado (ver src/config/features.ts). El mapa ya no es una imagen: es
 * <PredioMap />, un SVG animado dibujado con la geometría real del plano
 * (src/components/masterplan/predio.ts). Esta sección solo pone el marco:
 * encabezado, panel del sector elegido y lista accesible.
 */

export function ComingSoon() {
  const t = useTranslations("comingSoon");

  /** `null` = mapa completo, sin zoom. Arranca así a propósito: lo
      primero que tiene que ver el visitante es el predio entero. */
  const [activeId, setActiveId] = useState<ZoneId | null>(null);

  const active = ZONES.find((z) => z.id === activeId) ?? null;

  const labels = Object.fromEntries(
    ZONES.map((z) => [z.id, t(`zones.${z.id}.title`)])
  ) as Record<ZoneId, string>;

  const toggle = (id: ZoneId) => setActiveId((prev) => (prev === id ? null : id));

  return (
    <section
      id="masterplan"
      aria-labelledby="coming-soon-title"
      className="av-glow relative bg-base py-24 md:py-32"
    >
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        <div className="av-noise relative isolate overflow-hidden rounded-3xl border border-[color:var(--av-glass-brd)]">
          {/* Velo + luces: textura de fondo, no una foto. */}
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

          <div className="px-6 py-16 md:px-14 md:py-20">
            {/* ── Encabezado ── */}
            <div className="flex flex-col items-center text-center">
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
                <p className="mx-auto mt-5 max-w-xl text-balance font-sans text-sm font-light leading-relaxed text-ink-muted md:text-base">
                  {t("body")}
                </p>
              </Reveal>
            </div>

            {/* ── Mapa + panel ── */}
            <div className="mt-12 grid gap-8 md:mt-16 md:grid-cols-[1.15fr_0.85fr] md:items-start md:gap-10">
              {/* Mapa */}
              <Reveal>
                {/* En celular el mapa se come el padding de la tarjeta: con
                    el margen del contenedor más el de la tarjeta quedaba en
                    300px y las etiquetas tapaban medio dibujo. */}
                <div className="-mx-6 md:mx-0">
                  <PredioMap
                    activeId={activeId}
                    onSelect={toggle}
                    onReset={() => setActiveId(null)}
                    labels={labels}
                    ariaLabel={t("mapAlt")}
                    resetLabel={t("reset")}
                  />
                </div>

                <p className="mt-3 text-center font-sans text-[11px] font-light leading-relaxed text-ink-faint md:text-left">
                  {t("disclaimer")}
                </p>
              </Reveal>

              {/* Panel */}
              <Reveal delay={0.15}>
                <div
                  id="masterplan-zone-panel"
                  aria-live="polite"
                  className="av-glass flex flex-col rounded-2xl p-6 md:p-7"
                >
                  <span className="font-sans text-[10px] font-medium uppercase tracking-[0.24em] text-lux">
                    {active ? t("sector") : t("hint")}
                  </span>

                  <h3 className="mt-3 font-display text-[clamp(1.35rem,3vw,1.9rem)] font-light leading-tight text-ink">
                    {active ? t(`zones.${active.id}.title`) : t("idleTitle")}
                  </h3>

                  <p className="mt-3 font-sans text-sm font-light leading-relaxed text-ink-muted">
                    {active ? t(`zones.${active.id}.body`) : t("idleBody")}
                  </p>

                  {/* Lista completa: el mapa se puede recorrer también desde
                      acá, que es lo único que funciona con teclado y con
                      lector de pantalla sin ir a cazar pines. */}
                  <ul className="mt-6 flex flex-col gap-1.5 border-t border-[color:var(--av-border-soft)] pt-5">
                    {ZONES.map((zone) => {
                      const isActive = zone.id === activeId;

                      return (
                        <li key={zone.id}>
                          <button
                            type="button"
                            onClick={() => toggle(zone.id)}
                            aria-pressed={isActive}
                            aria-controls="masterplan-zone-panel"
                            className={
                              "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-300 " +
                              (isActive
                                ? "bg-[color:var(--av-elevated)]"
                                : "hover:bg-[color:var(--av-elevated)]/60")
                            }
                          >
                            <span
                              aria-hidden="true"
                              className="size-2 shrink-0 rounded-full transition-transform duration-300 group-hover:scale-125"
                              style={{
                                backgroundColor: zone.accent,
                                opacity: isActive ? 1 : 0.55,
                              }}
                            />
                            <span
                              className={
                                "font-sans text-[12px] uppercase tracking-[0.14em] transition-colors duration-300 " +
                                (isActive
                                  ? "font-medium text-ink"
                                  : "font-light text-ink-mid group-hover:text-ink")
                              }
                            >
                              {t(`zones.${zone.id}.title`)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  <Reveal delay={0.1} className="mt-7">
                    <Button href="#contacto" variant="lux" size="lg" className="w-full">
                      {t("cta")}
                    </Button>
                  </Reveal>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
