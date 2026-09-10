"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Compass, Flag, Leaf, Maximize2, Plane, Sailboat, TreePine } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Reveal, EASE_LUX } from "@/components/motion/Reveal";
import { SplitText } from "@/components/motion/SplitText";

/**
 * Masterplan ilustrado e interactivo.
 *
 * Ocupa el lugar del masterplan real mientras SHOW_SALES_SECTION está
 * apagado (ver src/config/features.ts). El render 3D es una MAQUETA para
 * que el cliente vea la idea; cuando esté el plano definitivo se cambia la
 * imagen y se reajustan las coordenadas de HOTSPOTS, nada más.
 *
 * ─────────────────────────────────────────────────────────────────
 *  PARA CAMBIAR EL MAPA
 *  1. Guardá el render en /public con el nombre de MAP_IMAGE.
 *  2. Ajustá x/y de cada zona en ZONES (porcentaje desde la esquina
 *     superior izquierda de la imagen).
 *  3. Corré `npm run optimize:media`.
 *  La proporción no hay que tocarla: el contenedor la copia de la
 *  imagen apenas carga, así que los porcentajes de ZONES son siempre
 *  los de la imagen, se recorte como se recorte.
 * ─────────────────────────────────────────────────────────────────
 */
const MAP_IMAGE = "/masterplan-3d.webp";

/**
 * Proporción de arranque, solo para reservar el hueco antes de que la
 * imagen cargue y que no salte el layout. Apenas carga se reemplaza por
 * la proporción real del archivo.
 */
const MAP_ASPECT = "1209 / 1620";

/**
 * Cuánto acerca el mapa al elegir una zona. 1 = sin zoom.
 * Es suave a propósito: acerca lo justo para que se lea el sector sin
 * que el visitante pierda de vista el resto del predio.
 */
const ZOOM = 1.45;

type Zone = {
  id: string;
  Icon: LucideIcon;
  /** Centro del punto caliente, en % del ancho/alto de la imagen. */
  x: number;
  y: number;
  /** Color del sector en el render, para que el pin no se despegue. */
  accent: string;
};

/*
 * Los puntos van apoyados SOBRE el sector y un poco por encima del
 * cartel que ya viene dibujado en el render, para no taparlo.
 */
const ZONES: Zone[] = [
  { id: "botanico", Icon: Leaf, x: 46, y: 26, accent: "#34D399" },
  { id: "nautica", Icon: Sailboat, x: 32, y: 51, accent: "#38BDF8" },
  { id: "aeropuerto", Icon: Plane, x: 72, y: 51, accent: "#FACC15" },
  { id: "greenbar", Icon: Flag, x: 26, y: 72, accent: "#A3E635" },
  { id: "tekoha", Icon: TreePine, x: 76, y: 74, accent: "#FB923C" },
];

export function ComingSoon() {
  const t = useTranslations("comingSoon");
  const reduceMotion = useReducedMotion();

  /** `null` = mapa completo, sin zoom. Arranca así a propósito: lo
      primero que tiene que ver el visitante es el predio entero. */
  const [activeId, setActiveId] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  /** Proporción real del archivo, leída al cargar. Ver MAP_ASPECT. */
  const [mapAspect, setMapAspect] = useState(MAP_ASPECT);

  const active = ZONES.find((z) => z.id === activeId) ?? null;

  /* Encuadre del zoom.
     Con transform-origin en el centro, `translate(t) scale(s)` lleva un
     punto p a  centro + s·(p − centro) + t.  Igualando a cero sale
     t = −s·(p − centro), y como motion interpreta x/y en % del ancho
     del propio elemento, el porcentaje es directamente −s·(p − 50). */
  const scale = active && !reduceMotion ? ZOOM : 1;
  const frame = active
    ? { scale, x: `${-scale * (active.x - 50)}%`, y: `${-scale * (active.y - 50)}%` }
    : { scale: 1, x: "0%", y: "0%" };

  const toggle = (id: string) => setActiveId((prev) => (prev === id ? null : id));

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
                <div
                  className="relative w-full overflow-hidden rounded-2xl border border-[color:var(--av-glass-brd)] bg-[color:var(--av-surface)]"
                  style={{ aspectRatio: mapAspect }}
                >
                  <motion.div
                    className="absolute inset-0"
                    animate={frame}
                    transition={{ duration: 0.9, ease: EASE_LUX }}
                    style={{ willChange: "transform" }}
                  >
                    {imageFailed ? (
                      /* El archivo de MAP_IMAGE todavía no está en /public.
                         Antes esto dejaba la caja vacía con los pines
                         flotando en la nada; ahora se ve que falta la
                         imagen, y en desarrollo se dice cuál. */
                      <div className="absolute inset-0 grid place-items-center bg-[color:var(--av-elevated)] px-6 text-center">
                        <div>
                          <Compass
                            className="mx-auto size-8 text-lux"
                            strokeWidth={1}
                            aria-hidden="true"
                          />
                          <p className="mt-4 font-sans text-xs font-light uppercase tracking-[0.2em] text-ink-muted">
                            {t("mapPending")}
                          </p>
                          {process.env.NODE_ENV !== "production" && (
                            <code className="mt-3 block font-mono text-[11px] text-ink-faint">
                              public{MAP_IMAGE}
                            </code>
                          )}
                        </div>
                      </div>
                    ) : (
                      <Image
                        src={MAP_IMAGE}
                        alt={t("mapAlt")}
                        fill
                        loading="lazy"
                        sizes="(max-width: 768px) 100vw, 780px"
                        quality={82}
                        className="object-cover"
                        onError={() => setImageFailed(true)}
                        /* El contenedor adopta la proporción real del
                           archivo: así object-cover no recorta nada y los
                           % de ZONES son exactamente los de la imagen,
                           sin importar con qué medidas se guarde. */
                        onLoad={(e) => {
                          const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                          if (w && h) setMapAspect(`${w} / ${h}`);
                        }}
                      />
                    )}

                    {/* Puntos calientes. Van dentro del contenedor que se
                        transforma para que acompañen al zoom. */}
                    {ZONES.map((zone, i) => {
                      const isActive = zone.id === activeId;
                      const dimmed = activeId !== null && !isActive;

                      return (
                        <motion.button
                          key={zone.id}
                          type="button"
                          onClick={() => toggle(zone.id)}
                          aria-pressed={isActive}
                          aria-controls="masterplan-zone-panel"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true, amount: 0.3 }}
                          transition={{ duration: 0.5, delay: 0.15 + i * 0.08, ease: EASE_LUX }}
                          /* -translate-*-1/2 centra el botón en la
                             coordenada; las 44px de lado mantienen el área
                             táctil aunque el pin se vea más chico. */
                          className="absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full outline-none"
                          style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
                        >
                          <span className="sr-only">{t(`zones.${zone.id}.title`)}</span>

                          {/* El zoom agranda todo lo que hay dentro del
                              marco; este contra-escalado deja el pin del
                              mismo tamaño en pantalla, acercado o no. */}
                          <motion.span
                            aria-hidden="true"
                            className="grid place-items-center"
                            animate={{ scale: 1 / scale }}
                            transition={{ duration: 0.9, ease: EASE_LUX }}
                          >
                            {/* Halo que respira para invitar al clic. */}
                            {!dimmed && (
                              <span
                                className="absolute size-8 rounded-full opacity-70 motion-safe:animate-[av-pulse-ring_2.6s_ease-out_infinite]"
                                style={{ backgroundColor: zone.accent }}
                              />
                            )}

                            <span
                              className="relative grid size-7 place-items-center rounded-full border-2 shadow-[0_4px_14px_rgba(5,13,9,0.55)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                              style={{
                                backgroundColor: isActive ? zone.accent : "rgba(5,13,9,0.72)",
                                borderColor: zone.accent,
                                opacity: dimmed ? 0.4 : 1,
                              }}
                            >
                              <zone.Icon
                                className="size-3.5"
                                strokeWidth={2}
                                style={{ color: isActive ? "#08150F" : zone.accent }}
                              />
                            </span>
                          </motion.span>
                        </motion.button>
                      );
                    })}
                  </motion.div>

                  {/* Volver al plano completo. Solo aparece con zoom puesto. */}
                  {active && (
                    <motion.button
                      type="button"
                      onClick={() => setActiveId(null)}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: EASE_LUX }}
                      className="av-glass absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 font-sans text-[10px] font-medium uppercase tracking-[0.18em] text-ink transition-colors duration-300 hover:text-vivo"
                    >
                      <Maximize2 className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                      {t("reset")}
                    </motion.button>
                  )}
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
