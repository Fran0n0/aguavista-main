"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useTranslations } from "next-intl";
import { SplitText } from "@/components/motion/SplitText";
import { EASE_LUX } from "@/components/motion/Reveal";

/**
 * Cuánto del cuadro se recorta por abajo.
 *
 * El medio se dibuja más alto que el contenedor y anclado arriba, así el
 * tercio inferior queda fuera del recorte. 0.33 → la caja mide
 * 1/0.67 = 149.25% de la altura del hero.
 */
const BOTTOM_CROP = 0.33;
const MEDIA_HEIGHT = `${(100 / (1 - BOTTOM_CROP)).toFixed(2)}%`;

/** Debajo de este ancho se usa la variante vertical del banner. */
const MOBILE_QUERY = "(max-width: 768px)";

export function Hero({
  video = "/banner.mp4",
  poster = "/banner-poster.webp",
  videoMobile,
  posterMobile,
}: {
  video?: string;
  poster?: string;
  videoMobile?: string;
  posterMobile?: string;
} = {}) {
  const t = useTranslations("hero");
  const tc = useTranslations("common");
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = usePrefersReducedMotion();

  /* El <video> se elige en JS y no con <source media>: los navegadores
     evalúan `media` una sola vez al cargar y no reaccionan al rotar el
     teléfono ni al redimensionar. El poster, en cambio, se alterna con
     CSS para que el LCP salga ya pintado desde el servidor. */
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const activeVideo = isMobile && videoMobile ? videoMobile : video;
  const hasMobilePoster = Boolean(posterMobile && posterMobile !== poster);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);
  const contentY = useTransform(scrollYProgress, [0, 0.7], ["0%", "-18%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  return (
    <section
      ref={sectionRef}
      id="inicio"
      aria-label="AguaVista"
      className="relative isolate flex min-h-[100svh] w-full flex-col items-center justify-center overflow-hidden"
    >
      {/* ── Fondo ── */}
      <motion.div
        style={{
          ...(reduceMotion ? {} : { y: bgY, scale: bgScale }),
          willChange: "transform",
          backfaceVisibility: "hidden",
        }}
        className="absolute inset-0 z-0 overflow-hidden"
      >
        {/* Caja de recorte: más alta que el hero y anclada arriba, para
            que el 33% inferior del cuadro quede fuera. */}
        <div
          className="absolute inset-x-0 top-0"
          style={{ height: MEDIA_HEIGHT }}
        >
          {/* Poster de escritorio */}
          <Image
            src={poster}
            alt={t("videoAlt")}
            fill
            priority
            fetchPriority="high"
            sizes="100vw"
            quality={72}
            className={hasMobilePoster ? "hidden object-cover md:block" : "object-cover"}
          />

          {/* Poster vertical — solo si hay uno distinto cargado */}
          {hasMobilePoster && (
            <Image
              src={posterMobile as string}
              alt={t("videoAlt")}
              fill
              priority
              fetchPriority="high"
              sizes="100vw"
              quality={72}
              className="object-cover md:hidden"
            />
          )}

          {/* ── VIDEO NATIVO OPTIMIZADO PARA RENDIMIENTO EXTREMO ──
              `key` fuerza el remontaje al cambiar de fuente: sin él el
              navegador se queda con el <source> que ya había cargado. */}
          <video
            key={activeVideo}
            autoPlay
            loop
            muted
            playsInline
            preload="none"
            poster={poster}
            className="absolute inset-0 size-full object-cover"
          >
            <source src={activeVideo} type="video/mp4" />
          </video>
        </div>

        <div aria-hidden="true" className="absolute inset-0 bg-[#050D09]/25" />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 75% 60% at 50% 45%, rgba(5,13,9,.28) 0%, rgba(5,13,9,.05) 55%, transparent 100%)," +
              "linear-gradient(to bottom, rgba(5,13,9,.45) 0%, transparent 22%, transparent 72%, var(--av-base) 100%)",
          }}
        />
      </motion.div>

      {/* ── Contenido ── */}
      <motion.div
        style={reduceMotion ? undefined : { y: contentY, opacity: contentOpacity }}
        className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-6 text-center"
      >
        <motion.span
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25, ease: EASE_LUX }}
          className="av-kicker mb-6 block text-[#C8E88A] drop-shadow-[0_1px_8px_rgba(5,13,9,0.8)]"
        >
          {t("kicker")}
        </motion.span>

        {/* Título en tres líneas, todo Montserrat (font-display) y en caja
            normal — nada de `uppercase`:
              1ª  negrita
              2ª  regular, un punto más chica
              3ª  negrita itálica  */}
        {/* El tamaño se ata al ancho de pantalla (vw) sin un mínimo en rem
            que lo trabe: así cada línea entra entera y no se parte a la
            mitad en el teléfono. Quién corta la línea lo decide el texto
            de cada clave, no el navegador — de ahí el `text-nowrap`. */}
        <h1 className="font-display text-[clamp(1rem,5.8vw,2.5rem)] leading-[1.12] tracking-[-0.015em] text-white drop-shadow-[0_2px_20px_rgba(5,13,9,0.55)] md:text-[clamp(2.5rem,4.9vw,4.2rem)]">
          <SplitText
            text={t("titleLine1")}
            immediate
            delay={0.35}
            className="block whitespace-nowrap font-bold"
          />
          <SplitText
            text={t("titleLine2")}
            immediate
            delay={0.5}
            className="block whitespace-nowrap text-[0.9em] font-normal"
          />
          <SplitText
            text={t("titleLine3")}
            immediate
            delay={0.65}
            className="block whitespace-nowrap font-bold italic"
          />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.95, ease: EASE_LUX }}
          className="mt-7 max-w-xl text-balance font-sans text-sm font-light leading-relaxed text-white/85 drop-shadow-[0_1px_10px_rgba(5,13,9,0.7)] md:text-base"
        >
          {t("subtitle")}
        </motion.p>
      </motion.div>

      {/* ── Indicador de scroll ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.7 }}
        aria-hidden="true"
        className="absolute bottom-8 right-6 z-10 hidden flex-col items-center gap-3 md:right-10 md:flex"
      >
        <span
          className="font-sans text-[9px] font-light uppercase tracking-[0.3em] text-white/70"
          style={{ writingMode: "vertical-rl" }}
        >
          {tc("scroll")}
        </span>
        <motion.span
          animate={{ scaleY: [0.2, 1, 0.2], originY: 0 }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="block h-12 w-px bg-gradient-to-b from-[color:var(--av-vivo)] to-transparent"
        />
      </motion.div>
    </section>
  );
}